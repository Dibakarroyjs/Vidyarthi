import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

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

const params = new URLSearchParams(window.location.search);
const studentName = params.get("name") || "";
const studentRoll = params.get("roll") || "";
const studentReg = params.get("reg") || "";
const studentPhone = params.get("phone") || "";

document.getElementById("studentName").textContent = studentName;
document.getElementById("studentRoll").textContent = studentRoll;
document.getElementById("studentReg").textContent = studentReg;
document.getElementById("studentPhone").textContent = studentPhone;

// Same ID logic jo script.js me hai — sirf Name + Roll No
const studentDocId = studentRoll.trim().toLowerCase() + "_" + studentName.trim().toLowerCase();

const addSubject = document.getElementById("addSubject");
const subjectTableBody = document.getElementById("subjectTableBody");
const saveButton = document.getElementById("saveButton");

// Data load hone tak "Loading..." dikhao — isse default placeholder
// subjects ka flash nahi dikhega jo pehle "refresh" jaisa lagta tha.
subjectTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Loading...</td></tr>`;

onAuthStateChanged(auth, function (user) {
    if (!user) return (window.location.href = "Login.html");
    loadAttendance();
});

// Naye/first-time student ke liye default 5 subjects
function renderDefaultSubjects() {
    const defaults = ["Financial Management(DSC301)", "Financial Institutions and Services(DSC302)", "Indirect Tax Law(DSC303)", "Business Mathematics(DSM301)", "Economy of North-East India(DSM302)"];
    subjectTableBody.innerHTML = "";
    defaults.forEach(function (name) {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${name}</td>
            <td><input type="number" class="total-classes"></td>
            <td><input type="number" class="present-classes"></td>
            <td class="attendance">0%</td>
            <td class="subject-result">—</td>
            <td><button class="delete-subject">×</button></td>`;
        subjectTableBody.appendChild(row);
    });
    calculateOverall();
}

addSubject.addEventListener("click", function () {
    const row = document.createElement("tr");
    row.innerHTML = `
        <td><input type="text" class="subject-name" placeholder="Subject Name"></td>
        <td><input type="number" class="total-classes" placeholder="Total" min="0"></td>
        <td><input type="number" class="present-classes" placeholder="Present" min="0"></td>
        <td class="attendance">0%</td>
        <td class="subject-result">—</td>
        <td><button class="delete-subject">×</button></td>`;
    subjectTableBody.appendChild(row);
});

// ============================
// AUTO-SAVE (koi bhi field change ke ~800ms baad poori list save ho jaati hai)
// ============================

let autoSaveTimer = null;
function scheduleAutoSave() {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(saveAttendance, 800);
}

subjectTableBody.addEventListener("input", function (event) {
    if (event.target.classList.contains("total-classes") || event.target.classList.contains("present-classes")) {
        calculateRow(event.target.closest("tr"));
        calculateOverall();
    }
    scheduleAutoSave();
});

function calculateRow(row) {
    const totalInput = row.querySelector(".total-classes");
    const presentInput = row.querySelector(".present-classes");
    const attendance = row.querySelector(".attendance");
    const result = row.querySelector(".subject-result");
    if (!totalInput || !presentInput || !attendance || !result) return;

    const total = Number(totalInput.value);
    const present = Number(presentInput.value);

    if (!total || total <= 0) {
        attendance.textContent = "0%";
        result.textContent = "—";
        return;
    }

    const percentage = (present / total) * 100;
    attendance.textContent = percentage.toFixed(1) + "%";
    result.textContent = percentage >= 75 ? "✓ Pass" : "× Fail";
}

const getSubjectName = (row) => {
    const subjectInput = row.querySelector(".subject-name");
    return subjectInput ? subjectInput.value.trim() : row.querySelector("td").textContent.trim();
};

function calculateOverall() {
    let totalClassesAll = 0, presentClassesAll = 0, validSubjects = 0;
    let failedSubjects = [];

    subjectTableBody.querySelectorAll("tr").forEach(function (row) {
        const totalInput = row.querySelector(".total-classes");
        const presentInput = row.querySelector(".present-classes");
        if (!totalInput || !presentInput) return;

        const total = Number(totalInput.value);
        const present = Number(presentInput.value);
        if (total <= 0) return;

        validSubjects++;
        totalClassesAll += total;
        presentClassesAll += present;

        const percentage = (present / total) * 100;
        if (percentage < 75) failedSubjects.push(getSubjectName(row) + " — " + percentage.toFixed(1) + "%");
    });

    const average = totalClassesAll > 0 ? (presentClassesAll / totalClassesAll) * 100 : 0;
    document.getElementById("overallAverage").textContent = average.toFixed(1) + "%";

    const finalResult = document.getElementById("finalResult");
    if (validSubjects === 0) finalResult.innerHTML = "—";
    else if (failedSubjects.length === 0) finalResult.innerHTML = "✓ PASS<br>✓ ELIGIBLE";
    else finalResult.innerHTML = "× NOT ELIGIBLE<br><br>Below 75%:<br>" + failedSubjects.join("<br>");
}

subjectTableBody.addEventListener("click", function (event) {
    if (event.target.classList.contains("delete-subject")) {
        event.target.closest("tr").remove();
        calculateOverall();
        scheduleAutoSave();
    }
});

// ============================
// SAVE TO FIRESTORE (manual button aur auto-save dono isi ko use karte hain)
// ============================

async function saveAttendance() {
    const user = auth.currentUser;
    if (!user || !studentName || !studentRoll) return false;

    const subjectsData = [];
    let failedSubjects = [], totalClassesAll = 0, presentClassesAll = 0, validSubjects = 0;

    subjectTableBody.querySelectorAll("tr").forEach(function (row) {
        const totalInput = row.querySelector(".total-classes");
        const presentInput = row.querySelector(".present-classes");
        if (!totalInput || !presentInput) return;

        const subjectName = getSubjectName(row);
        const total = Number(totalInput.value);
        const present = Number(presentInput.value);

        if (total > 0) {
            validSubjects++;
            totalClassesAll += total;
            presentClassesAll += present;
            const percentage = (present / total) * 100;
            if (percentage < 75) failedSubjects.push(subjectName + " — " + percentage.toFixed(1) + "%");
        }

        subjectsData.push({ subject: subjectName, totalClasses: total, presentClasses: present });
    });

    const average = totalClassesAll > 0 ? (presentClassesAll / totalClassesAll) * 100 : 0;

    const studentResult = {
        roll: studentRoll,
        average,
        eligible: failedSubjects.length === 0 && validSubjects > 0,
        failedSubjects,
        subjects: subjectsData
    };

    const data = { name: studentName, roll: studentRoll, attendance: studentResult };
    if (studentReg) data.regNo = studentReg;
    if (studentPhone) data.phone = studentPhone;

    try {
        await setDoc(doc(db, "users", user.uid, "students", studentDocId), data, { merge: true });
        return true;
    } catch (error) {
        console.error("Firestore save error:", error);
        return false;
    }
}

saveButton.addEventListener("click", async function () {
    if (!studentName || !studentRoll) return alert("Student Name/Roll No. not found.");

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    const ok = await saveAttendance();
    alert(ok ? "Details saved successfully!" : "Details save nahi ho paya.");

    saveButton.disabled = false;
    saveButton.textContent = "Save";
});

// ============================
// LOAD ATTENDANCE FROM FIRESTORE
// ============================

async function loadAttendance() {
    const user = auth.currentUser;
    if (!user || !studentName || !studentRoll) return renderDefaultSubjects();

    try {
        const snapshot = await getDoc(doc(db, "users", user.uid, "students", studentDocId));
        const data = snapshot.exists() ? snapshot.data() : null;
        const subjects = data && data.attendance && Array.isArray(data.attendance.subjects) ? data.attendance.subjects : null;

        if (!subjects || subjects.length === 0) {
            renderDefaultSubjects();
            return;
        }

        subjectTableBody.innerHTML = "";

        subjects.forEach(function (subject) {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td><input type="text" class="subject-name"></td>
                <td><input type="number" class="total-classes" value="${subject.totalClasses ?? ""}" min="0"></td>
                <td><input type="number" class="present-classes" value="${subject.presentClasses ?? ""}" min="0"></td>
                <td class="attendance">0%</td>
                <td class="subject-result">—</td>
                <td><button class="delete-subject">×</button></td>`;
            subjectTableBody.appendChild(row);
            row.querySelector(".subject-name").value = subject.subject || "";
            calculateRow(row);
        });

        calculateOverall();
    } catch (error) {
        console.error("Firestore load error:", error);
        renderDefaultSubjects();
        alert("Attendance load nahi ho paya.");
    }
}