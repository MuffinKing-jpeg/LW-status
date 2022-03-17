var user = firebase.auth().currentUser
console.log(user);


document.getElementById("submit-btn").addEventListener("click", function (event) {
    event.preventDefault()

    let email = document.getElementById("email-field").value
    let password = document.getElementById("pass-field").value
    firebase.auth().signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Signed in
            user = userCredential.user;
            console.log(user);
            // ...
        })
        .catch((error) => {
            console.log(error);
        });
});