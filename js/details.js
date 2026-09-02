import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
    getAuth,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    setDoc,
    getDoc
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


// ============================
// STUDENT INFORMATION
// ============================

const params =
    new URLSearchParams(window.location.search);

const studentName =
    params.get("name");

const studentRoll =
    params.get("roll");

const studentReg =
    params.get("reg");

const studentPhone =
    params.get("phone");


document.getElementById("studentName").textContent =
    studentName || "";

document.getElementById("studentRoll").textContent =
    studentRoll || "";

document.getElementById("studentReg").textContent =
    studentReg || "";

document.getElementById("studentPhone").textContent =
    studentPhone || "";


// ============================
// AUTHENTICATION
// ============================

onAuthStateChanged(auth, function(user) {

    if (!user) {

        window.location.href = "Login.html";

        return;
    }

    loadAttendance();

});


// ============================
// ELEMENTS
// ============================

const addSubject =
    document.getElementById("addSubject");

const subjectTableBody =
    document.getElementById("subjectTableBody");

const saveButton =
    document.getElementById("saveButton");


// ============================
// ADD SUBJECT
// ============================

addSubject.addEventListener("click", function() {

    const row =
        document.createElement("tr");

    row.innerHTML = `
        <td>
            <input
                type="text"
                class="subject-name"
                placeholder="Subject Name">
        </td>

        <td>
            <input
                type="number"
                class="total-classes"
                placeholder="Total"
                min="0">
        </td>

        <td>
            <input
                type="number"
                class="present-classes"
                placeholder="Present"
                min="0">
        </td>

        <td class="attendance">
            0%
        </td>

        <td class="subject-result">
            —
        </td>

        <td>
            <button class="delete-subject">
                ×
            </button>
        </td>
    `;

    subjectTableBody.appendChild(row);

});


// ============================
// INPUT CALCULATION
// ============================

subjectTableBody.addEventListener(
    "input",
    function(event) {

        if (
            event.target.classList.contains(
                "total-classes"
            ) ||
            event.target.classList.contains(
                "present-classes"
            )
        ) {

            const row =
                event.target.closest("tr");

            calculateRow(row);

            calculateOverall();
        }

    }
);


// ============================
// SUBJECT CALCULATION
// ============================

function calculateRow(row) {

    const totalInput =
        row.querySelector(".total-classes");

    const presentInput =
        row.querySelector(".present-classes");

    const attendance =
        row.querySelector(".attendance");

    const result =
        row.querySelector(".subject-result");


    if (
        !totalInput ||
        !presentInput ||
        !attendance ||
        !result
    ) {
        return;
    }


    const total =
        Number(totalInput.value);

    const present =
        Number(presentInput.value);


    if (!total || total <= 0) {

        attendance.textContent = "0%";

        result.textContent = "—";

        return;
    }


    const percentage =
        (present / total) * 100;


    attendance.textContent =
        percentage.toFixed(1) + "%";


    if (percentage >= 75) {

        result.textContent =
            "✓ Pass";

    } else {

        result.textContent =
            "× Fail";
    }

}


// ============================
// OVERALL CALCULATION
// ============================

function calculateOverall() {

    const rows =
        subjectTableBody.querySelectorAll("tr");


    let totalClassesAll = 0;

    let presentClassesAll = 0;

    let validSubjects = 0;

    let failedSubjects = [];


    rows.forEach(function(row) {

        const totalInput =
            row.querySelector(".total-classes");

        const presentInput =
            row.querySelector(".present-classes");


        if (
            !totalInput ||
            !presentInput
        ) {
            return;
        }


        const total =
            Number(totalInput.value);

        const present =
            Number(presentInput.value);


        if (total > 0) {

            validSubjects++;

            totalClassesAll += total;

            presentClassesAll += present;


            const percentage =
                (present / total) * 100;


            if (percentage < 75) {

                const subjectInput =
                    row.querySelector(
                        ".subject-name"
                    );


                let subjectName = "";


                if (subjectInput) {

                    subjectName =
                        subjectInput.value.trim();

                } else {

                    subjectName =
                        row.querySelector(
                            "td"
                        ).textContent.trim();
                }


                failedSubjects.push(
                    subjectName +
                    " — " +
                    percentage.toFixed(1) +
                    "%"
                );

            }

        }

    });


    let average = 0;


    if (totalClassesAll > 0) {

        average =
            (presentClassesAll /
            totalClassesAll) * 100;

    }


    document.getElementById(
        "overallAverage"
    ).textContent =
        average.toFixed(1) + "%";


    const finalResult =
        document.getElementById(
            "finalResult"
        );


    if (validSubjects === 0) {

        finalResult.innerHTML =
            "—";

        return;
    }


    if (failedSubjects.length === 0) {

        finalResult.innerHTML = `
            ✓ PASS
            <br>
            ✓ ELIGIBLE
        `;

    } else {

        finalResult.innerHTML = `
            × NOT ELIGIBLE
            <br><br>
            Below 75%:
            <br>
            ${failedSubjects.join("<br>")}
        `;

    }

}


// ============================
// DELETE SUBJECT
// ============================

subjectTableBody.addEventListener(
    "click",
    function(event) {

        if (
            event.target.classList.contains(
                "delete-subject"
            )
        ) {

            event.target
                .closest("tr")
                .remove();

            calculateOverall();

        }

    }
);


// ============================
// SAVE TO FIRESTORE
// ============================

saveButton.addEventListener(
    "click",
    async function() {

        const user =
            auth.currentUser;


        if (!user) {

            alert(
                "Please login first."
            );

            return;
        }


        if (!studentRoll) {

            alert(
                "Student Roll No. not found."
            );

            return;
        }


        const subjectsData = [];

        const rows =
            subjectTableBody.querySelectorAll(
                "tr"
            );


        let failedSubjects = [];

        let totalClassesAll = 0;

        let presentClassesAll = 0;

        let validSubjects = 0;


        rows.forEach(function(row) {

            const subjectInput =
                row.querySelector(
                    ".subject-name"
                );


            let subjectName = "";


            if (subjectInput) {

                subjectName =
                    subjectInput.value.trim();

            } else {

                subjectName =
                    row.querySelector(
                        "td"
                    ).textContent.trim();

            }


            const total =
                Number(
                    row.querySelector(
                        ".total-classes"
                    ).value
                );


            const present =
                Number(
                    row.querySelector(
                        ".present-classes"
                    ).value
                );


            if (total > 0) {

                validSubjects++;

                totalClassesAll += total;

                presentClassesAll += present;


                const percentage =
                    (present / total) * 100;


                if (percentage < 75) {

                    failedSubjects.push(
                        subjectName +
                        " — " +
                        percentage.toFixed(1) +
                        "%"
                    );

                }

            }


            subjectsData.push({

                subject:
                    subjectName,

                totalClasses:
                    total,

                presentClasses:
                    present

            });

        });


        // IMPORTANT:
        // Same calculation as screen

        let average = 0;


        if (totalClassesAll > 0) {

            average =
                (presentClassesAll /
                totalClassesAll) * 100;

        }


        const studentResult = {

            roll:
                studentRoll,

            average:
                average,

            eligible:
                failedSubjects.length === 0 &&
                validSubjects > 0,

            failedSubjects:
                failedSubjects,

            subjects:
                subjectsData

        };


        try {

            saveButton.disabled = true;

            saveButton.textContent =
                "Saving...";


            await setDoc(

                doc(
                    db,
                    "users",
                    user.uid,
                    "students",
                    studentRoll
                ),

                {
                    attendance:
                        studentResult
                },

                {
                    merge: true
                }

            );


            alert(
                "Details saved successfully!"
            );


        } catch (error) {

            console.error(
                "Firestore save error:",
                error
            );

            alert(
                "Details save nahi ho paya."
            );


        } finally {

            saveButton.disabled = false;

            saveButton.textContent =
                "Save";

        }

    }
);


// ============================
// LOAD ATTENDANCE FROM FIRESTORE
// ============================

async function loadAttendance() {

    const user =
        auth.currentUser;


    if (
        !user ||
        !studentRoll
    ) {
        return;
    }


    try {

        const studentRef =
            doc(
                db,
                "users",
                user.uid,
                "students",
                studentRoll
            );


        const snapshot =
            await getDoc(
                studentRef
            );


        if (!snapshot.exists()) {

            return;
        }


        const data =
            snapshot.data();


        if (!data.attendance) {

            return;
        }


        const subjects =
            data.attendance.subjects;


        if (
            !Array.isArray(subjects)
        ) {

            return;
        }


        subjectTableBody.innerHTML =
            "";


        subjects.forEach(
            function(subject) {

                const row =
                    document.createElement(
                        "tr"
                    );


                row.innerHTML = `
                    <td>
                        <input
                            type="text"
                            class="subject-name">
                    </td>

                    <td>
                        <input
                            type="number"
                            class="total-classes"
                            value="${subject.totalClasses ?? ""}"
                            min="0">
                    </td>

                    <td>
                        <input
                            type="number"
                            class="present-classes"
                            value="${subject.presentClasses ?? ""}"
                            min="0">
                    </td>

                    <td class="attendance">
                        0%
                    </td>

                    <td class="subject-result">
                        —
                    </td>

                    <td>
                        <button class="delete-subject">
                            ×
                        </button>
                    </td>
                `;


                subjectTableBody.appendChild(
                    row
                );


                row.querySelector(
                    ".subject-name"
                ).value =
                    subject.subject || "";


                calculateRow(row);

            }
        );


        calculateOverall();


    } catch (error) {

        console.error(
            "Firestore load error:",
            error
        );

        alert(
            "Attendance load nahi ho paya."
        );

    }

}