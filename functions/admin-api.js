const {
  httpError, editableServer, validateConfiguration, revisionOf,
} = require('./monitoring-config');

const trustedOrigin = (origin) => !origin || [
  'https://status.logixy.net', 'https://lw-status.web.app',
  'https://lw-status.firebaseapp.com',
].includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1):(4200|5000)$/.test(origin) ||
  /^https:\/\/lw-status--[a-z\d-]+\.web\.app$/.test(origin);

const createAdminHandler = ({db, auth, serverTimestamp, logger}) => {
  const configRef = db.doc('config/config');
  const serversRef = db.doc('config/servers');

  const snapshots = (transaction) => Promise.all([
    transaction.get(configRef), transaction.get(serversRef),
  ]);

  return async (request, response) => {
    response.set('Cache-Control', 'no-store');
    response.set('X-Content-Type-Options', 'nosniff');
    response.set('Vary', 'Origin');
    const origin = request.get('Origin');
    if (!trustedOrigin(origin)) {
      response.status(403).json({error: 'Origin not allowed'});
      return;
    }
    if (origin) response.set('Access-Control-Allow-Origin', origin);
    response.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    response.set('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
    if (request.method === 'OPTIONS') {
      response.status(204).send('');
      return;
    }
    if (!['GET', 'PUT'].includes(request.method)) {
      response.set('Allow', 'GET, PUT, OPTIONS');
      response.status(405).json({error: 'Method not allowed'});
      return;
    }
    try {
      const bearer = /^Bearer (\S+)$/.exec(request.get('Authorization') || '');
      if (!bearer) throw httpError(401, 'Sign in required');
      let user;
      try {
        // Includes disabled accounts and revoked sessions, not just JWT signature.
        user = await auth.verifyIdToken(bearer[1], true);
      } catch (error) {
        if ([
          'auth/argument-error', 'auth/invalid-argument', 'auth/invalid-id-token',
          'auth/id-token-expired', 'auth/id-token-revoked',
          'auth/user-disabled', 'auth/user-not-found',
        ].includes(error.code)) {
          throw httpError(401, 'Session expired or revoked. Sign in again');
        }
        // IAM/network failures are service errors, not incorrect user passwords.
        throw error;
      }
      const membership = await db.doc(`admins/${user.uid}`).get();
      if (!membership.exists || membership.data().enabled !== true) {
        throw httpError(403, 'This account is not a monitoring administrator');
      }

      if (request.method === 'GET') {
        const [config, servers] = await db.runTransaction(snapshots);
        const events = await db.collection('adminAudit')
            .orderBy('timestamp', 'desc').limit(20).get();
        response.json({
          user: {uid: user.uid, email: user.email || ''},
          settings: {timeout: 1000, ...(config.data() || {})},
          servers: ((servers.data() || {}).servers || []).map(editableServer),
          revision: revisionOf(config, servers),
          audit: events.docs.map((doc) => {
            const event = doc.data();
            return {id: doc.id, email: event.email || event.uid,
              timestamp: event.timestamp ? event.timestamp.toMillis() : null,
              deviceCount: event.deviceCount, changedDevices: event.changedDevices || [],
              settingsKeys: event.settingsKeys || []};
          }),
        });
        return;
      }

      if (!request.is('application/json')) throw httpError(415, 'JSON body required');
      if (Buffer.byteLength(JSON.stringify(request.body || {})) > 128 * 1024) {
        throw httpError(413, 'Configuration is too large');
      }
      const next = validateConfiguration(request.body);
      await db.runTransaction(async (transaction) => {
        const [config, servers] = await snapshots(transaction);
        if (next.revision !== revisionOf(config, servers)) {
          throw httpError(409, 'Configuration changed. Reload before saving');
        }
        const oldSettings = config.data() || {};
        const previous = (servers.data() || {}).servers || [];
        const previousById = new Map(previous.map((server) => [editableServer(server).id, server]));
        // Preserve legacy per-device fields not managed by this editor.
        const merged = next.servers.map((server) => ({...previousById.get(server.id), ...server}));
        const nextById = new Map(next.servers.map((server) => [server.id, server]));
        const changedDevices = Array.from(new Set([...previousById.keys(), ...nextById.keys()]))
            .filter((id) => JSON.stringify(previousById.has(id) ? editableServer(previousById.get(id)) : null) !==
              JSON.stringify(nextById.get(id) || null));
        const settingsKeys = Array.from(new Set([...Object.keys(oldSettings), ...Object.keys(next.settings)]))
            .filter((key) => JSON.stringify(oldSettings[key]) !== JSON.stringify(next.settings[key]));
        transaction.set(configRef, next.settings);
        transaction.set(serversRef, {...(servers.data() || {}), servers: merged});
        transaction.set(db.collection('adminAudit').doc(), {
          uid: user.uid, email: user.email || '', timestamp: serverTimestamp(),
          deviceCount: next.servers.length, changedDevices, settingsKeys,
        });
      });
      response.json({ok: true});
    } catch (error) {
      const status = error.status || 500;
      if (status === 500) logger.error('Admin API failed', {code: error.code || 'unknown'});
      response.status(status).json({error: status === 500 ? 'Administration is temporarily unavailable' : error.message});
    }
  };
};

module.exports = {createAdminHandler, trustedOrigin};
