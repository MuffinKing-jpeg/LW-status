const functions = require("firebase-functions");
const ping = require('ping');



exports.ping = functions.https.onRequest((request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    state().then((out) => {
      functions.logger.info(out, { structuredData: true });
      response.send(out);
    })
  })