// Trusted operator tool. Default mode is preview, with no database writes.
const {publicDevice} = require('../monitoring-config');
const {planCorrections, applyCorrection, restoreCorrection} = require('../history-corrections');

const parseOptions = (args) => {
  const [mode = 'preview', ...flags] = args;
  if (!['preview', 'apply', 'restore'].includes(mode) || flags.length % 2) throw new Error('Use preview|apply|restore with --days, --confirm or --run-id');
  const values = {};
  for (let index = 0; index < flags.length; index += 2) {
    if (!['--days', '--confirm', '--run-id'].includes(flags[index]) || values[flags[index]] !== undefined) throw new Error('Invalid or duplicate argument');
    values[flags[index]] = flags[index + 1];
  }
  const days = Number(values['--days'] || 30);
  if (mode !== 'restore' && values['--run-id'] !== undefined) throw new Error('--run-id is only supported for restore');
  if (!Number.isInteger(days) || days < 1 || days > 30) throw new Error('Days must be between 1 and 30');
  if (mode === 'apply' && values['--confirm'] !== 'EXCLUDE_SINGLE_FAILURES') throw new Error('Apply requires --confirm EXCLUDE_SINGLE_FAILURES after reviewing a preview');
  if (mode === 'restore' && (values['--confirm'] !== 'RESTORE_SINGLE_FAILURES' || !/^[a-z\d_-]{10,80}$/i.test(values['--run-id'] || ''))) {
    throw new Error('Restore requires --run-id and --confirm RESTORE_SINGLE_FAILURES');
  }
  return {mode, days, runId: values['--run-id']};
};

const concurrent = async (items, callback) => {
  let cursor = 0;
  let failure;
  await Promise.all(Array.from({length: Math.min(5, items.length)}, async () => {
    while (!failure && cursor < items.length) {
      const item = items[cursor++];
      try { await callback(item); } catch (error) { failure = error; }
    }
  }));
  if (failure) throw failure;
};

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
  if (!projectId || !/^[a-z][a-z\d-]+$/.test(projectId)) throw new Error('Set GOOGLE_CLOUD_PROJECT explicitly');
  const admin = require('firebase-admin');
  admin.initializeApp({projectId});
  const db = admin.firestore();
  const report = {project: projectId, mode: options.mode, days: options.days, runId: null,
    scannedDocuments: 0, candidateDocuments: 0, candidateChecks: 0, changedChecks: 0, skippedChecks: 0};
  const publish = () => {
    const fs = require('fs');
    console.log(JSON.stringify(report, null, 2));
    if (process.env.HISTORY_REPORT_PATH) fs.writeFileSync(process.env.HISTORY_REPORT_PATH, JSON.stringify(report));
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
        `## History maintenance\n\nMode: ${report.mode}\n\nCandidates: ${report.candidateChecks} checks in ${report.candidateDocuments} samples\n\nChanged: ${report.changedChecks}; skipped: ${report.skippedChecks}\n\nBackup run: ${report.runId || 'none (read-only preview)'}\n`);
  };
  let run;
  try {
    if (options.mode === 'restore') {
      run = db.doc(`historyCorrections/${options.runId}`);
      const parent = await run.get();
      if (!parent.exists) throw new Error('Correction run not found');
      report.runId = options.runId;
      const backups = await run.collection('samples').get();
      report.candidateDocuments = backups.size;
      await concurrent(backups.docs, async (backup) => {
        const count = backup.data().deviceIds.length;
        report.candidateChecks += count;
        const changed = await restoreCorrection(db, options.runId, backup.id);
        report.changedChecks += changed;
        report.skippedChecks += count - changed;
      });
      await run.update({lastRestoreAt: new Date(), lastRestoreCount: report.changedChecks,
        lastRestoreActor: process.env.GITHUB_ACTOR || 'trusted-project-operator'});
      publish();
      return;
    }
    const to = Date.now();
    const from = to - options.days * 86400000;
    const [history, inventory] = await Promise.all([
      db.collection('history').where('timestamp', '>=', from).where('timestamp', '<=', to).orderBy('timestamp').limit(10000).get(),
      db.doc('config/servers').get(),
    ]);
    if (history.size === 10000) throw new Error('History scan limit reached; use a smaller days range');
    const servers = (inventory.data() || {}).servers;
    if (!Array.isArray(servers)) throw new Error('Current inventory is unavailable; refusing cleanup');
    const ids = new Set(servers.map((server) => publicDevice(server).id));
    const plan = planCorrections(history.docs.map((doc) => ({id: doc.id, data: doc.data()})), ids);
    report.scannedDocuments = history.size;
    report.candidateDocuments = plan.length;
    report.candidateChecks = plan.reduce((count, entry) => count + entry.deviceIds.length, 0);
    if (options.mode === 'preview' || !plan.length) { publish(); return; }
    run = db.collection('historyCorrections').doc();
    await run.create({createdAt: new Date(), from, to, actor: process.env.GITHUB_ACTOR || 'trusted-project-operator',
      sourceRun: process.env.GITHUB_RUN_ID || null, status: 'running', candidateChecks: report.candidateChecks});
    report.runId = run.id;
    console.log(`Backup run: ${run.id}`);
    await concurrent(plan, async (entry) => {
      const changed = await applyCorrection(db, run.id, entry);
      report.changedChecks += changed;
      report.skippedChecks += entry.deviceIds.length - changed;
    });
    await run.update({status: 'completed', completedAt: new Date(), changedChecks: report.changedChecks, skippedChecks: report.skippedChecks});
    publish();
  } catch (error) {
    if (run && options.mode === 'apply') await run.update({status: 'failed', changedChecks: report.changedChecks}).catch(() => {});
    publish();
    throw error;
  }
}

module.exports = {parseOptions, concurrent};
if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
