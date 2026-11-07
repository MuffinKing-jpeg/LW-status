const fs = require('node:fs');

const file = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!file) throw new Error('Application Default Credentials were not configured');
let credentials;
try { credentials = JSON.parse(fs.readFileSync(file, 'utf8')); }
catch { throw new Error('Cannot read service-account JSON. Check the Firebase repository secret'); }
if (!credentials || credentials.type !== 'service_account' ||
    !/^[a-z\d._-]+@[a-z\d.-]+\.gserviceaccount\.com$/i.test(credentials.client_email || '') ||
    !/^[a-z][a-z\d-]+$/.test(credentials.project_id || '')) {
  throw new Error('Expected service-account credentials in FIREBASE_SERVICE_ACCOUNT_LW_STATUS');
}
// Only public identity fields. Never log this object or its private key.
console.log(`Deployment service account: ${credentials.client_email}`);
console.log(`Credentials project: ${credentials.project_id}`);
console.log(`Deployment target project: ${process.env.FIREBASE_PROJECT_ID}`);
if (process.env.FIREBASE_TOKEN) throw new Error('Remove legacy FIREBASE_TOKEN; deployment must use the configured service account');
