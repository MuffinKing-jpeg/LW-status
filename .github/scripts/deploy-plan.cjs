const fs = require('node:fs');
const {execFileSync} = require('node:child_process');

function deploymentPlan(files, target = 'auto') {
  if (target === 'all') return {hosting: true, backend: true, rules: true};
  if (target === 'hosting') return {hosting: true, backend: false, rules: false};
  if (target === 'backend') return {hosting: false, backend: true, rules: true};
  if (target !== 'auto') throw new Error('Unknown deployment target');
  if (files === null) return {hosting: true, backend: true, rules: true};
  const shared = files.some(file => ['firebase.json', '.firebaserc', '.github/workflows/deploy-prod.yml'].includes(file) ||
    file.startsWith('.github/scripts/'));
  return {
    hosting: shared || files.some(file => file.startsWith('src/') ||
      ['package.json', 'package-lock.json', 'angular.json', '.browserslistrc', 'karma.conf.js'].includes(file) ||
      /^tsconfig(?:\.[\w-]+)?\.json$/.test(file)),
    backend: shared || files.some(file => file.startsWith('functions/')),
    rules: shared || files.includes('firestore.rules'),
  };
}

async function filesSinceSuccessfulRelease(env, {fetchRun = fetch, git = execFileSync} = {}) {
  try {
    // Compare against a successful release, not the previous push. Failed or
    // superseded deployments must not make pending backend changes disappear.
    const url = `${env.GITHUB_API_URL}/repos/${env.GITHUB_REPOSITORY}/actions/workflows/deploy-prod.yml/runs?branch=main&event=push&status=success&per_page=1`;
    const response = await fetchRun(url, {signal: AbortSignal.timeout(10000), headers: {
      Authorization: `Bearer ${env.GH_TOKEN}`, Accept: 'application/vnd.github+json',
    }});
    if (!response.ok) throw new Error(`History lookup HTTP ${response.status}`);
    const data = await response.json();
    const base = data.workflow_runs?.[0]?.head_sha;
    const head = env.GITHUB_SHA;
    if (!/^[a-f\d]{40}$/.test(base || '') || !/^[a-f\d]{40}$/.test(head || '')) throw new Error('No baseline');
    git('git', ['merge-base', '--is-ancestor', base, head], {stdio: 'pipe'});
    return git('git', ['diff', '--name-only', base, head], {encoding: 'utf8'}).trim().split('\n').filter(Boolean);
  } catch {
    return null;
  }
}

async function main() {
  const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const target = process.env.GITHUB_EVENT_NAME === 'workflow_dispatch' ? event.inputs?.target || 'all' : 'auto';
  const files = target === 'auto' ? await filesSinceSuccessfulRelease(process.env) : null;
  if (target === 'auto' && files === null) console.log('No reliable successful baseline; safely scheduling all targets.');
  const plan = deploymentPlan(files, target);
  console.log(`Deployment plan: ${JSON.stringify(plan)}`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(plan).map(([key, value]) => `${key}=${value}\n`).join(''));
}

module.exports = {deploymentPlan, filesSinceSuccessfulRelease};
if (require.main === module) main().catch(() => {
  console.error('Deployment planning failed');
  process.exitCode = 1;
});
