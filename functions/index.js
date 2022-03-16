const functions = require("firebase-functions");
const isPortReachable = require('is-port-reachable');
const admin = require('firebase-admin');


admin.initializeApp();
const db = admin.firestore()

// const host2check = require("./host2check");

async function state() {
  var status
  await db.collection("config").doc("servers").get()
    .then((doc) => {
      if (doc.exists) {
        host2check == doc.data()
        status = new Array(host2check.length);
        // for (let i = 0; i < status.length; i++) {
        //   status[i] = {
        //     name: host2check[i].name,
        //     icon: host2check[i].icon
        //   }
        //   if (await isPortReachable(host2check[i].port,
        //     {
        //       host: host2check[i].host,
        //       timeout: 250
        //     }
        //   ) === true) {
        //     status[i].avalible = 'Online'
        //   } else {
        //     status[i].avalible = 'Offline'
        //   }
        // }
        console.log(doc.data());
      } else {
        // doc.data() will be undefined in this case


      }
    })
    .catch((error) => {
      console.log("Error getting documents: ", error);

    });


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
