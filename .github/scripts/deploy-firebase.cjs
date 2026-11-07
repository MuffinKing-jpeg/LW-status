const {spawnSync} = require('node:child_process');

function redact(message) {
  return message
    .replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/g, '[REDACTED KEY]')
    .replace(/\bBearer\s+[^\s"']+/gi, 'Bearer [REDACTED]')
    .replace(/\bya29\.[\w.-]+/g, '[REDACTED TOKEN]')
    .replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[REDACTED JWT]')
    .replace(/\b(?:gh[pousr]_|github_pat_)[\w]+/g, '[REDACTED GITHUB TOKEN]')
    .replace(/((?:access_token|refresh_token|id_token|private_key|api_key|client_secret)["']?\s*[:=]\s*["']?)[^\s"'&,}]+/gi, '$1[REDACTED]');
}

function diagnostics(output) {
  const errors = new Set();
  for (const raw of output.split('\n')) {
    const line = raw.replace(/\u001b\[[\d;]*m/g, '');
    // Select only Google API error messages, never response bodies/headers,
    // credential objects or raw --debug output (which may contain secrets).
    const marker = line.indexOf('[apiv2][body]');
    if (marker !== -1) {
      const start = line.indexOf('{', marker);
      if (start !== -1) {
        try {
          const body = JSON.parse(line.slice(start));
          if (typeof body.error?.message === 'string') errors.add(redact(body.error.message).slice(0, 2000));
        } catch { /* Not a structured API response. */ }
      }
    }
    const plain = line.match(/^Error:\s+(.+)/);
    if (plain) errors.add(redact(plain[1]).slice(0, 2000));
  }
  return [...errors].slice(0, 20);
}

function deploy(targets, {spawn = spawnSync, log = console.log, env = process.env} = {}) {
  const allowed = ['hosting', 'functions', 'firestore:rules'];
  if (!targets || targets.split(',').some(target => !allowed.includes(target))) throw new Error('Invalid Firebase deploy targets');
  if (targets.includes('hosting') && targets !== 'hosting') throw new Error('Hosting must be deployed independently');
  if (!/^[a-z][a-z\d-]+$/.test(env.FIREBASE_PROJECT_ID || '')) throw new Error('Invalid Firebase project ID');
  log(`Publishing ${targets} to ${env.FIREBASE_PROJECT_ID}…`);
  // Capture debug output privately. Never echo/upload the raw log as an artifact.
  const result = spawn('npx', ['--yes', 'firebase-tools@15.34.2', 'deploy', '--only', targets,
    '--project', env.FIREBASE_PROJECT_ID, '--non-interactive', '--debug'], {
    encoding: 'utf8', env, maxBuffer: 32 * 1024 * 1024,
  });
  if (result.status === 0) {
    log(`Firebase ${targets} deployment succeeded.`);
    return 0;
  }
  const messages = diagnostics(`${result.stdout || ''}\n${result.stderr || ''}`);
  log(`Firebase ${targets} deployment FAILED (exit ${result.status ?? 'unavailable'}).`);
  messages.forEach(message => log(`Firebase error: ${message}`));
  if (!messages.length) log('No structured API error received. Check Google Cloud Audit / Cloud Build logs for this deployment.');
  if (result.error) log(`CLI execution error: ${result.error.code || 'unknown'}`);
  return result.status || 1;
}

module.exports = {redact, diagnostics, deploy};
if (require.main === module) {
  try { process.exitCode = deploy(process.argv[2]); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
