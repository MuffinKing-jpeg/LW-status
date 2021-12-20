const functions = require("firebase-functions");
const isPortReachable = require('is-port-reachable');

const host2check = require("./host2check");

async function state() {
  var status = new Array(host2check.length);
  for (let i = 0; i < status.length; i++) {
    status[i] = {
      name: host2check[i].name,
      icon: host2check[i].icon,
      host: host2check[i].host,
      port: host2check[i].port
    }
    if (await isPortReachable(host2check[i].port,
      {
        host: host2check[i].host,
        timeout: 2500
      }
    ) === true) {
      status[i].avalible = 'Online'
    } else {
      status[i].avalible = 'Offline'
    }
  }
  console.log(status);
  return status
}

exports.status = functions.https.onRequest((request, response) => {
  response.set('Access-Control-Allow-Origin', '*');
  state().then((stats) => {
    return stats;
  }).then((out) => {
    functions.logger.info(out, { structuredData: true });
    response.send(out);
  })
})
