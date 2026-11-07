const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {deploymentPlan, filesSinceSuccessfulRelease} = require('./deploy-plan.cjs');
const {diagnostics, deploy} = require('./deploy-firebase.cjs');

test('frontend-only changes do not redeploy Functions', () => {
  assert.deepEqual(deploymentPlan(['src/app/admin/admin.component.scss']), {hosting: true, backend: false, rules: false});
});
test('backend and rules can deploy without rebuilding Hosting', () => {
  assert.deepEqual(deploymentPlan(['functions/history-data.js']), {hosting: false, backend: true, rules: false});
  assert.deepEqual(deploymentPlan(['firestore.rules']), {hosting: false, backend: false, rules: true});
});
test('shared deployment configuration schedules all targets', () => {
  assert.deepEqual(deploymentPlan(['firebase.json']), {hosting: true, backend: true, rules: true});
  assert.deepEqual(deploymentPlan(['.github/scripts/deploy-firebase.cjs']), {hosting: true, backend: true, rules: true});
});
test('missing baselines fail safe, and documentation does not redeploy production', () => {
  assert.deepEqual(deploymentPlan(null), {hosting: true, backend: true, rules: true});
  assert.deepEqual(deploymentPlan(['docs/admin.md']), {hosting: false, backend: false, rules: false});
});
test('manual recovery can deploy Hosting independently', () => {
  assert.deepEqual(deploymentPlan([], 'hosting'), {hosting: true, backend: false, rules: false});
  assert.deepEqual(deploymentPlan(null, 'hosting'), {hosting: true, backend: false, rules: false});
  assert.deepEqual(deploymentPlan([], 'backend'), {hosting: false, backend: true, rules: true});
  assert.throws(() => deploymentPlan([], 'unexpected'));
});
test('a frontend follow-up does not forget backend changes from a failed release', async () => {
  const base = 'a'.repeat(40);
  const head = 'c'.repeat(40);
  const files = await filesSinceSuccessfulRelease({GITHUB_SHA: head}, {
    fetchRun: async () => ({ok: true, json: async () => ({workflow_runs: [{head_sha: base}]})}),
    git: (command, args) => {
      assert.equal(command, 'git');
      assert.deepEqual(args.slice(-2), [base, head]);
      return args[0] === 'diff' ? 'functions/history-data.js\nsrc/app/admin/admin.component.scss\n' : '';
    },
  });
  assert.deepEqual(deploymentPlan(files), {hosting: true, backend: true, rules: false});
});
test('unavailable Actions history never silently skips deployment', async () => {
  const files = await filesSinceSuccessfulRelease({}, {fetchRun: async () => ({ok: false, status: 403})});
  assert.equal(files, null);
  assert.deepEqual(deploymentPlan(files), {hosting: true, backend: true, rules: true});
});
test('diagnostics expose the real API error, but not credential response bodies', () => {
  const log = [
    '[debug] <<< [apiv2][body] POST https://oauth2.googleapis.com/token {"access_token":"DO_NOT_PRINT"}',
    '[debug] <<< [apiv2][body] PATCH https://cloudfunctions.googleapis.com/v1/test {"error":{"code":403,"message":"Missing iam.serviceAccounts.actAs"}}',
  ].join('\n');
  assert.deepEqual(diagnostics(log), ['Missing iam.serviceAccounts.actAs']);
});
test('tokens are redacted even inside an error message', () => {
  const result = diagnostics('Error: Authorization Bearer secret-token access_token=secret-access refresh_token=secret-refresh ya29.secret-token');
  assert.equal(result.length, 1);
  assert.ok(!result[0].includes('secret-'));
});
test('a failed backend deploy stays failed and never deploys Hosting', () => {
  const messages = [];
  const status = deploy('functions', {env: {FIREBASE_PROJECT_ID: 'lw-status'}, log: text => messages.push(text),
    spawn: (command, args) => {
      assert.equal(command, 'npx');
      assert.equal(args[args.indexOf('--only') + 1], 'functions');
      assert.ok(!args.includes('--force'));
      return {status: 2, stdout: 'Error: Missing permission', stderr: ''};
    }});
  assert.equal(status, 2);
  assert.ok(messages.some(message => message.includes('Missing permission')));
});
test('successful CLI exit is required; spawn failures are not reported as success', () => {
  assert.equal(deploy('hosting', {env: {FIREBASE_PROJECT_ID: 'lw-status'}, log: () => {}, spawn: () => ({status: 0})}), 0);
  assert.equal(deploy('hosting', {env: {FIREBASE_PROJECT_ID: 'lw-status'}, log: () => {},
    spawn: () => ({status: null, error: {code: 'ENOENT'}})}), 1);
});
test('the deploy wrapper rejects accidentally coupling Hosting to Functions', () => {
  assert.throws(() => deploy('functions,hosting'), /independently/);
  assert.throws(() => deploy('hosting,firestore:rules'), /independently/);
});
test('identity diagnostics never print private keys or malformed credential contents', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lw-deploy-identity-'));
  const file = path.join(directory, 'credentials.json');
  const env = {...process.env, GOOGLE_APPLICATION_CREDENTIALS: file,
    FIREBASE_PROJECT_ID: 'lw-status', FIREBASE_TOKEN: ''};
  try {
    fs.writeFileSync(file, JSON.stringify({type: 'service_account',
      client_email: 'test@project-123.iam.gserviceaccount.com', project_id: 'project-123',
      private_key: 'PRIVATE_SENTINEL'}));
    const success = spawnSync(process.execPath, [path.join(__dirname, 'deploy-identity.cjs')], {env, encoding: 'utf8'});
    assert.equal(success.status, 0);
    assert.ok(success.stdout.includes('test@project-123.iam.gserviceaccount.com'));
    assert.ok(!(success.stdout + success.stderr).includes('PRIVATE_SENTINEL'));
    fs.writeFileSync(file, '{"private_key":"PRIVATE_SENTINEL"');
    const failure = spawnSync(process.execPath, [path.join(__dirname, 'deploy-identity.cjs')], {env, encoding: 'utf8'});
    assert.notEqual(failure.status, 0);
    assert.ok(!(failure.stdout + failure.stderr).includes('PRIVATE_SENTINEL'));
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
});
