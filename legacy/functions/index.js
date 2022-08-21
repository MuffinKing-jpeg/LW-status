const functions = require('firebase-functions');
const isPortReachable = require('is-port-reachable');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore()

let config;

async function getConfig() {
  await db.collection('config').doc('properties').get().then((doc) => {
    if (doc.exists) {
      config = doc.data();
      console.log(config);
    } else {
      config = {
        timeout: 1000
      }
    }
  })
}

getConfig();

async function ping(data) {
  if (await isPortReachable(data.port,
    {
      host: data.host,
      timeout: config.timeout
    }
  ) === true) {
    return 'Online'
  } else {
    return 'Offline'
  }
}

async function state() {
  let status
  await db.collection('config').doc('servers').get()
    .then(async(doc) => {
      if (doc.exists) {
        console.log(doc.data())
        let host2check = doc.data()
        host2check = host2check.servers;
        status = new Array(host2check.length);
        for (let i = 0; i < status.length; i++) {
          status[i] = {
            name: host2check[i].name,
            icon: host2check[i].icon,
            available: await ping({port: host2check[i].port, host: host2check[i].host})
          }
        }
      } else {
        // doc.data() will be undefined in this case
        status = {
          name: 'Database',
          icon: 'fa-solid fa-database',
          available: 'Offline'
        }
      }
    })
    .catch((error) => {
      status = {
        name: error,
        icon: 'fa-solid fa-bug',
        available: 'Offline'
      }
    });

  console.log(status);
  return status
}

exports.status = functions.https.onRequest((request, response) => {
  response.set('Access-Control-Allow-Origin', '*');
  state().then((stats) => {
    return stats;
  }).then((out) => {
    functions.logger.info(out, {structuredData: true});
    response.send(out);
  })
})
