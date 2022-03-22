const transitionSpeed = 400
let db = firebase.firestore()


const sign = `
          _   _
|\\/|    _|_ _|_ o ._  |/ o ._   _
|  | |_| |   |  | | | |\\ | | | (_|
                                _|
`

function build_console() {
    if (debug.detectDev() == true) {
        console.warn("%cLOADED IN DEV MODE", "color:red; font-family:sans-serif; font-size: 30px;")
        console.log(`%cAPI url is: \n ${url}`, "color:red; font-family:sans-serif; font-size: 30px; font-size: 20px");
        console.log(`%c\nThis service is build by:`, 'color:#fff; font-size:15px;');
        console.warn(`%c${sign}`, "font-size:14px;color:crimson;",)
    }
    else {
        console.log("%cLOADED IN PROD MODE", "color:green; font-family:sans-serif; font-size: 30px;")

        console.log(`%c\nThis service is build by:`, 'color:#fff; font-size:15px;');
        console.warn(`%c${sign}`, "font-size:14px;color:crimson;",)
    }

}

function makeid(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() *
            charactersLength));
    }
    return result;
}



let sheet = document.createElement('style')
sheet.innerHTML = `:root {--transition-speed: ${transitionSpeed}ms;}`;
document.body.appendChild(sheet);
let docsList


async function loginSuccess(user) {
    console.log(user);
    document.getElementById("login-msg").innerHTML = `Success. Welcome, ${user.displayName}!`;
    await db.collection("news").get().then(async (doc) => {
        docsList = doc.docs;
        console.log(docsList);
        for (let i = 0; i < doc.docs.length; i++) {
          let data = doc.docs[i].data()
          let navItem = document.createElement("li")
          navItem.classList.add("navItem")
          navItem.innerHTML = data.menuName
          navList.appendChild(navItem)
        }
    });
    setTimeout(() => {
        document.getElementById("login-form-container").style.opacity = 0
        setTimeout(() => {
            document.getElementsByClassName("wrapper")[0].style.opacity = 1
            document.getElementById("login-form-container").style.zIndex = -1
        }, transitionSpeed)
    }, transitionSpeed * 3)
}

function logOut() {
    firebase.auth().signOut()
    document.getElementById("login-msg").innerHTML = ``;
    setTimeout(() => {
        document.getElementById("login-form-container").style.opacity = 1
        document.getElementsByClassName("wrapper")[0].style.opacity = 0
        document.getElementById("login-form-container").style.zIndex = 1
    }, transitionSpeed)
}

firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .then(() => {
        if (firebase.auth().currentUser != null) {
            loginSuccess(firebase.auth().currentUser)
        }
    }).catch((error) => {
        document.getElementById("login-msg").innerHTML = error.message
    })

document.getElementById("submit-btn").addEventListener("click", function (event) {
    event.preventDefault()
    let email = document.getElementById("email-field").value
    let password = document.getElementById("pass-field").value
    firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
        .then(() => {
            firebase.auth().signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    // Signed in

                    loginSuccess(userCredential.user)
                })
                .catch((error) => {
                    document.getElementById("login-msg").innerHTML = error.message
                });
        })
});

build_console();