import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
    getAuth,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";


const firebaseConfig = {
    apiKey: "AIzaSyCgmw9tm4EVdFFDB6Lx2PdwiTl8axLzpRc",
    authDomain: "attendance-calculator-ebaca.firebaseapp.com",
    projectId: "attendance-calculator-ebaca",
    storageBucket: "attendance-calculator-ebaca.firebasestorage.app",
    messagingSenderId: "995203712134",
    appId: "1:995203712134:web:cc768185bb274bfd5dbd07",
    measurementId: "G-YE7S5M88CZ"
};


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();


const loginButton =
    document.getElementById("loginButton");

const googleLoginButton =
    document.getElementById("googleLoginButton");

const message =
    document.getElementById("loginMessage");


/* EMAIL + PASSWORD LOGIN */

loginButton.addEventListener("click", function () {

    const email =
        document.getElementById("email").value.trim();

    const password =
        document.getElementById("password").value;


    if (email === "" || password === "") {

        message.textContent =
            "Please enter email and password.";

        return;
    }


    message.textContent = "Logging in...";


    signInWithEmailAndPassword(auth, email, password)

        .then((userCredential) => {

            message.textContent =
                "Login successful!";

            // Yahan apne main attendance page ka naam likhna
            window.location.href = "index.html";

        })

        .catch((error) => {

            message.textContent =
                "Login failed: " + error.message;

        });

});


/* GOOGLE LOGIN */

googleLoginButton.addEventListener("click", function () {

    message.textContent =
        "Opening Google login...";


    signInWithPopup(auth, googleProvider)

        .then((result) => {

            message.textContent =
                "Google login successful!";

            // Yahan apne main attendance page ka naam likhna
            window.location.href = "index.html";

        })

        .catch((error) => {

            message.textContent =
                "Google login failed: " + error.message;

        });

});