const functions = require('firebase-functions/v1');
const isPortReachable = require('is-port-reachable');
const admin = require('firebase-admin');
const https = require('https');
const {createAdminHandler} = require('./admin-api');
const {publicDevice} = require('./monitoring-config');
const {historyForInventory} = require('./history-data');

admin.initializeApp();
const db = admin.firestore();
const INTERVAL = 5 * 60 * 1000;
const RETENTION = 30 * 24 * 60 * 60 * 1000;

exports.adminApi = functions.https.onRequest(createAdminHandler({
  db, auth: admin.auth(), logger: functions.logger,
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
}));

// Read configuration on every run, not once per warm function instance.
const checkServers = async () => {
  const [configDoc, serversDoc] = await Promise.all([
    db.doc('config/config').get(), db.doc('config/servers').get(),
  ]);
  const config = configDoc.data() || {};
  const servers = (serversDoc.data() || {}).servers;
  if (!Array.isArray(servers)) {
    throw new Error('No equipment configured');
  }
  return Promise.all(servers.filter((server) => server.enabled !== false).map(async (server) => {
    const started = Date.now();
    const available = await isPortReachable(server.port, {
      host: server.host, timeout: config.timeout || 1000,
    });
    return {
      ...publicDevice(server),
      available: available ? 'Online' : 'Offline',
      latency: available ? Date.now() - started : null,
    };
  }));
};

const checkPlayers = () => new Promise((resolve, reject) => {
  const request = https.get(
      'https://logixy.net/monAJAX/cache/cache.json?nocache=' + Date.now(),
      (response) => {
        let body = '';
        response.on('data', (chunk) => {
          body += chunk;
          if (body.length > 1024 * 1024) {
            request.destroy(new Error('Game response too large'));
          }
        });
        response.on('error', reject);
        response.on('end', () => {
          try {
            if (response.statusCode !== 200) throw new Error('Game API error');
            const data = JSON.parse(body);
            if (typeof data.online !== 'number' || data.online < 0 ||
                !Number.isFinite(data.online)) {
              throw new Error('Invalid player count');
            }
            resolve(data.online);
          } catch (error) {
            reject(error);
          }
        });
      });
  request.setTimeout(10000, () => request.destroy(new Error('Game timeout')));
  request.on('error', reject);
});

exports.status = functions.https.onRequest(async (request, response) => {
  response.set('Access-Control-Allow-Origin', '*');
  try {
    response.send(await checkServers());
  } catch (error) {
    functions.logger.error('Status check failed', error);
    response.status(503).json({error: 'Status unavailable'});
  }
});

exports.collectHistory = functions.pubsub.schedule('every 5 minutes')
    .onRun(async (context) => {
      const timestamp = Math.floor(
          (context.timestamp ? Date.parse(context.timestamp) : Date.now()) /
          INTERVAL) * INTERVAL;
      const [equipment, players] = await Promise.all([
        checkServers().catch((error) => {
          functions.logger.error('Equipment collection failed', error);
          return null;
        }),
        checkPlayers().catch((error) => {
          functions.logger.error('Player collection failed', error);
          return null;
        }),
      ]);
      // A deterministic ID prevents duplicate samples on scheduler retries.
      await db.collection('history').doc(String(timestamp)).set({
        timestamp, equipment, players,
      });
    });

exports.history = functions.https.onRequest(async (request, response) => {
  response.set('Access-Control-Allow-Origin', '*');
  const days = Number(request.query.days || 1);
  if (![1, 7, 30].includes(days)) {
    response.status(400).json({error: 'Use days=1, 7 or 30'});
    return;
  }
  const to = Date.now();
  const from = to - days * 24 * 60 * 60 * 1000;
  try {
    const [snapshot, inventory] = await Promise.all([
      db.collection('history')
          .where('timestamp', '>=', from).where('timestamp', '<=', to)
          .orderBy('timestamp').limit(9000).get(),
      db.doc('config/servers').get(),
    ]);
    const visible = historyForInventory(snapshot.docs.map((doc) => doc.data()),
        (inventory.data() || {}).servers);
    // A manual refresh must reflect inventory edits, not a cached pre-deletion list.
    response.set('Cache-Control', 'no-store');
    response.json({from, to, interval: INTERVAL,
      ...visible});
  } catch (error) {
    functions.logger.error('History read failed', error);
    response.status(503).json({error: 'History unavailable'});
  }
});

exports.cleanupHistory = functions.pubsub.schedule('every 24 hours')
    .onRun(async () => {
      const cutoff = Date.now() - RETENTION;
      // Bounded batches stay below Firestore's 500-write limit.
      for (let page = 0; page < 20; page++) {
        const expired = await db.collection('history')
            .where('timestamp', '<', cutoff).limit(500).get();
        if (expired.empty) break;
        const batch = db.batch();
        expired.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        if (expired.size < 500) break;
      }
    });
