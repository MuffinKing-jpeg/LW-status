const functions = require('firebase-functions');
const isPortReachable = require('is-port-reachable');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();
const DEFAULT_CONFIG = {
  timeout: 1000,
};
const FALLBACK_SERVER = {
  status: 'no-db',
  name: 'Database',
  icon: 'fa-solid fa-database',
  available: 'Offline',
};

const getConf = new Promise((resolve) => {
  db.collection('config').doc('config')
      .get()
      .then((doc) => {
        resolve(
          doc.exists ? doc.data() : DEFAULT_CONFIG
        );
      });
}
);

const getServers = new Promise((resolve) => {
  db.collection('config').doc('servers')
      .get()
      .then((doc) => {
        const data = doc.data();
        if (doc.exists && Object.keys(data.length === 0)) resolve(data);
      });
});

const combineDB = new Promise((resolve) => {
  Promise.all([getConf, getServers])
      .then((res) => {
        resolve(res);
      })
      .catch((err) => {
        console.error('Error during config loading');
        resolve({
          status: 'error',
          msg: `Something went wrong: ${err}`,
        });
      });
});

const ping = (o, s) => {
  return new Promise((resolve) => {
    isPortReachable(o.port, {
      timeout: s.timeout ? s.timeout : DEFAULT_CONFIG.timeout,
      host: o.host,
    }).then((res) => resolve({
      available: res ? 'Online' : 'Offline',
      icon: o.icon,
      name: o.name,
    }));
  });
};

const pingAll = new Promise((resolve) => {
  combineDB.then((res) => {
    const conf = Object.keys(res[0]).length !== 0 ?
        res[0] : DEFAULT_CONFIG;
    const servers = Object.keys(res[1]).length !== 0 ?
        res[1]['servers'] : resolve([FALLBACK_SERVER]);
    const bulk = [];
    for (let i = 0; i < servers.length; i++) {
      bulk.push(ping(servers[i], conf));
    }
    resolve(Promise.all(bulk));
  }).catch((err) => {
    resolve([{
      name: err,
      icon: 'fa-solid fa-bug',
      available: 'Offline',
    }]);
  }
  );
}
);

exports.status = functions
    .https
    .onRequest((request, response) => {
      response.set('Access-Control-Allow-Origin', '*');
      pingAll.then((data) => {
        response.send(data);
      });
    });
