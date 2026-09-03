import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
    getAuth,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    doc,
    setDoc,
    getDocs,
    getDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

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
const db = getFirestore(app);


const tableBody = document.getElementById("studentTableBody");

// Plus button
const addButton = document.getElementById("addButton");

let studentNumber = 0;


// New student row create karne ka function
function addStudentRow() {

    studentNumber++;

    const row = document.createElement("tr");

    row.innerHTML = `
    <td>${studentNumber}</td>

    <td>
        <input type="text" class="student-name" placeholder="Name">
    </td>

    <td>
        <input type="text" class="roll-no" placeholder="Roll No.">
    </td>

    <td>
        <input type="text" placeholder="Reg No.">
    </td>

    <td>
        <input type="text" placeholder="Ph No.">
    </td>

    <td>
        <button class="details-btn">View</button>
    </td>

    <td>
        <span class="student-result">—</span>
    </td>
`;

    tableBody.appendChild(row);
}


// + button click
addButton.addEventListener("click", addStudentRow);

tableBody.addEventListener("click", function(event) {

    if (event.target.classList.contains("details-btn")) {

        const row = event.target.closest("tr");

        const inputs = row.querySelectorAll("input");

        const name = inputs[0].value;
        const roll = inputs[1].value;
        const reg = inputs[2].value;
        const phone = inputs[3].value;

        if (name === "" || roll === "") {
            alert("Please enter Name and Roll No.");
            return;
        }

        window.location.href =
            `details.html?name=${encodeURIComponent(name)}&roll=${encodeURIComponent(roll)}&reg=${encodeURIComponent(reg)}&phone=${encodeURIComponent(phone)}`;
    }

});


tableBody.addEventListener("input", function(event) {

    if (
        event.target.classList.contains("student-name") ||
        event.target.classList.contains("roll-no")
    ) {
        updateStudentResult(event.target.closest("tr"));
    }

});


async function updateStudentResult(row) {

    const roll =
        row.querySelector(".roll-no").value.trim();

    const result =
        row.querySelector(".student-result");

    if (roll === "") {
        result.textContent = "—";
        return;
    }

    const user = auth.currentUser;

    if (!user) {
        result.textContent = "—";
        return;
    }

    try {

        const studentRef =
            doc(
                db,
                "users",
                user.uid,
                "students",
                roll
            );

        const snapshot =
            await getDoc(studentRef);

        if (!snapshot.exists()) {

            result.textContent = "—";
            return;
        }

        const student =
            snapshot.data();

        if (!student.attendance) {

            result.textContent = "—";
            return;
        }

        const attendance =
            student.attendance;

        const average =
            Number(attendance.average || 0);

        if (attendance.eligible) {

            result.textContent =
                "✓ Eligible " +
                average.toFixed(1) +
                "%";

        } else {

            result.textContent =
                "× Not Eligible " +
                average.toFixed(1) +
                "%";
        }

    } catch (error) {

        console.error(
            "Result load error:",
            error
        );

        result.textContent = "—";
    }
}


const saveStudents = document.getElementById("saveStudents");


// ============================
// SAVE ALL STUDENTS
// ============================

async function saveCurrentStudents() {

    const user = auth.currentUser;

    if (!user) {
        alert("Please login first.");
        return;
    }

    const rows = tableBody.querySelectorAll("tr");

    for (const row of rows) {

        const inputs =
            row.querySelectorAll("input");

        if (inputs.length < 4) {
            continue;
        }

        const name = inputs[0].value.trim();
        const roll = inputs[1].value.trim();
        const regNo = inputs[2].value.trim();
        const phone = inputs[3].value.trim();

        if (roll === "") {
            continue;
        }

        await setDoc(

            doc(
                db,
                "users",
                user.uid,
                "students",
                roll
            ),

            {
                name: name,
                roll: roll,
                regNo: regNo,
                phone: phone
            },

            {
                merge: true
            }

        );

    }

}


saveStudents.addEventListener("click", async function() {

    saveStudents.disabled = true;
    saveStudents.textContent = "Saving...";

    try {

        await saveCurrentStudents();

        alert("Students saved successfully!");

    } catch (error) {

        console.error("Save error:", error);

        alert("Students could not be saved.");

    }

    saveStudents.disabled = false;
    saveStudents.textContent = "Save";

});



// ============================
// LOAD STUDENTS FROM FIRESTORE
// ============================

async function loadStudents() {

    const user = auth.currentUser;

    if (!user) {
        return;
    }

    const studentsRef =
        collection(db, "users", user.uid, "students");

    const snapshot =
        await getDocs(studentsRef);

    tableBody.innerHTML = "";
    studentNumber = 0;

    snapshot.forEach(function(docSnapshot) {

        const student = docSnapshot.data();

        studentNumber++;

        const row =
            document.createElement("tr");

        row.innerHTML = `
            <td>${studentNumber}</td>

            <td>
                <input
                    type="text"
                    class="student-name"
                    value="${student.name || ""}">
            </td>

            <td>
                <input
                    type="text"
                    class="roll-no"
                    value="${student.roll || ""}">
            </td>

            <td>
                <input
                    type="text"
                    value="${student.regNo || ""}">
            </td>

            <td>
                <input
                    type="text"
                    value="${student.phone || ""}">
            </td>

            <td>
                <button class="details-btn">
                    View
                </button>
            </td>

            <td>
                <span class="student-result">—</span>
            </td>

            <td>
                <button class="delete-student">
                    Delete
                </button>
            </td>
        `;

        tableBody.appendChild(row);

        updateStudentResult(row);

    });

}


// Wait until Firebase knows which user is logged in
onAuthStateChanged(auth, function(user) {

    if (!user) {

        window.location.href = "Login.html";

        return;
    }

    loadStudents();

});


const searchInput = document.getElementById("searchInput");

searchInput.addEventListener("input", function () {

    const searchValue = searchInput.value.toLowerCase().trim();

    const rows = tableBody.querySelectorAll("tr");

    rows.forEach(function (row) {

        const inputs = row.querySelectorAll("input");

        const name = inputs[0].value.toLowerCase();
        const roll = inputs[1].value.toLowerCase();
        const reg = inputs[2].value.toLowerCase();
        const phone = inputs[3].value.toLowerCase();

        if (
            name.includes(searchValue) ||
            roll.includes(searchValue) ||
            reg.includes(searchValue) ||
            phone.includes(searchValue)
        ) {

            row.style.display = "";

        } else {

            row.style.display = "none";

        }

    });

});



// DELETE STUDENT
// ============================

tableBody.addEventListener("click", async function(event) {

    if (!event.target.classList.contains("delete-student")) {
        return;
    }

    const row = event.target.closest("tr");

    const roll =
        row.querySelector(".roll-no").value.trim();

    if (roll === "") {
        row.remove();
        return;
    }

    const confirmDelete =
        confirm("Kya aap is student ka pura data delete karna chahte hain?");

    if (!confirmDelete) {
        return;
    }

    const user = auth.currentUser;

    if (!user) {
        alert("Please login first.");
        return;
    }

    try {

        await deleteDoc(
            doc(
                db,
                "users",
                user.uid,
                "students",
                roll
            )
        );

        row.remove();

        alert("Student deleted successfully!");

    } catch (error) {

        console.error("Delete error:", error);

        alert("Student delete nahi ho paya.");

    }

});

// ============================
// LOGOUT
// ============================

import { signOut } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

const logoutButton =
    document.getElementById("logoutButton");

logoutButton.addEventListener("click", function () {

    signOut(auth)
        .then(function () {

            window.location.href = "Login.html";

        })
        .catch(function (error) {

            console.error("Logout error:", error);

            alert("Logout failed. Please try again.");

        });

});