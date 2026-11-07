// Run only from a trusted project-administrator shell with Application Default Credentials.
const admin = require('firebase-admin');

const run = async () => {
  const [action, email] = process.argv.slice(2);
  if (!['grant', 'revoke'].includes(action) || !email || !email.includes('@')) {
    throw new Error('Usage: node functions/scripts/admin-access.js grant|revoke admin@example.com');
  }
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
  if (!projectId) throw new Error('Set GOOGLE_CLOUD_PROJECT explicitly (for example lw-status)');
  admin.initializeApp({projectId});
  const user = await admin.auth().getUserByEmail(email);
  if (action === 'grant' && user.disabled) throw new Error('Cannot grant a disabled user access');
  const db = admin.firestore();
  const batch = db.batch();
  batch.set(db.doc(`admins/${user.uid}`), {
    enabled: action === 'grant', email: user.email,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, {merge: true});
  batch.set(db.collection('adminAccessAudit').doc(), {
    action, uid: user.uid, email: user.email,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
  await batch.commit();
  if (action === 'revoke') await admin.auth().revokeRefreshTokens(user.uid);
  console.log(`${projectId}: ${action === 'grant' ? 'enabled' : 'revoked'} administrator ${user.email} (${user.uid})`);
};

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
