import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDocs, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

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
const addButton = document.getElementById("addButton");
const saveStudents = document.getElementById("saveStudents");
const searchInput = document.getElementById("searchInput");
const logoutButton = document.getElementById("logoutButton");

let studentNumber = 0;

// ID sirf Name + Roll No se banti hai. Reg No/Phone sirf search ke liye hain, ID me shamil nahi.
const buildStudentId = (name, roll) => roll.trim().toLowerCase() + "_" + name.trim().toLowerCase();

const getRowValues = (row) => {
    const inputs = row.querySelectorAll("input");
    return {
        name: inputs[0]?.value.trim() || "",
        roll: inputs[1]?.value.trim() || "",
        regNo: inputs[2]?.value.trim() || "",
        phone: inputs[3]?.value.trim() || ""
    };
};

function findConflictingRow(row, newId) {
    for (const r of tableBody.querySelectorAll("tr")) {
        if (r === row) continue;
        const { name, roll } = getRowValues(r);
        if (name && roll && buildStudentId(name, roll) === newId) return { name, roll };
    }
    return null;
}

function addStudentRow() {
    studentNumber++;
    const row = document.createElement("tr");
    row.dataset.docId = "";
    row.innerHTML = `
        <td>${studentNumber}</td>
        <td><input type="text" class="student-name" placeholder="Name"></td>
        <td><input type="text" class="roll-no" placeholder="Roll No."></td>
        <td><input type="text" placeholder="Reg No."></td>
        <td><input type="text" placeholder="Ph No."></td>
        <td><button class="details-btn">View</button></td>
        <td><span class="student-result">—</span></td>`;
    tableBody.appendChild(row);
}
addButton.addEventListener("click", addStudentRow);

tableBody.addEventListener("click", function (event) {
    if (event.target.classList.contains("details-btn")) {
        const row = event.target.closest("tr");
        const { name, roll, regNo, phone } = getRowValues(row);
        if (!name || !roll) return alert("Please enter Name and Roll No.");
        window.location.href = `details.html?name=${encodeURIComponent(name)}&roll=${encodeURIComponent(roll)}&reg=${encodeURIComponent(regNo)}&phone=${encodeURIComponent(phone)}`;
    }
});

// Auto-save: typing rukne ke ~800ms baad row apne aap save hoti hai
const autoSaveTimers = new WeakMap();
function scheduleAutoSave(row) {
    if (autoSaveTimers.has(row)) clearTimeout(autoSaveTimers.get(row));
    autoSaveTimers.set(row, setTimeout(() => saveRow(row), 800));
}

tableBody.addEventListener("input", function (event) {
    const row = event.target.closest("tr");
    if (!row) return;
    if (event.target.classList.contains("student-name") || event.target.classList.contains("roll-no")) {
        updateStudentResult(row);
    }
    scheduleAutoSave(row);
});

// List load hone par isi function se result dikhate hain — koi extra
// Firestore read nahi lagti, kyunki data already loadStudents() se mil chuka hai.
function renderResultFromData(row, student) {
    const result = row.querySelector(".student-result");
    if (!student.attendance) return (result.textContent = "—");
    const average = Number(student.attendance.average || 0);
    result.textContent = (student.attendance.eligible ? "✓ Eligible " : "× Not Eligible ") + average.toFixed(1) + "%";
}

// Sirf tab use hota hai jab tum khud Name/Roll type/edit karte ho —
// tab live check karne ke liye ek Firestore read lagta hai.
async function updateStudentResult(row) {
    const { name, roll } = getRowValues(row);
    const result = row.querySelector(".student-result");
    const user = auth.currentUser;
    if (!name || !roll || !user) return (result.textContent = "—");

    try {
        const snapshot = await getDoc(doc(db, "users", user.uid, "students", buildStudentId(name, roll)));
        if (!snapshot.exists()) return (result.textContent = "—");
        renderResultFromData(row, snapshot.data());
    } catch (error) {
        console.error("Result load error:", error);
        result.textContent = "—";
    }
}

// Save ek row ka data (auto-save aur bulk Save dono isi ko use karte hain)
async function saveRow(row) {
    const user = auth.currentUser;
    if (!user) return false;

    const { name, roll, regNo, phone } = getRowValues(row);
    if (!name || !roll) return false;

    const newId = buildStudentId(name, roll);
    const oldId = row.dataset.docId || "";

    const conflict = findConflictingRow(row, newId);
    if (conflict) {
        alert(
            `Ye Name + Roll No ("${name}" / "${roll}") pehle se list me maujood hai.\n` +
            `In dono students ko alag pehchanne ke liye Reg No ya Phone Number check/update karo.`
        );
        return false;
    }

    const data = { name, roll };
    if (regNo) data.regNo = regNo;
    if (phone) data.phone = phone;

    try {
        await setDoc(doc(db, "users", user.uid, "students", newId), data, { merge: true });
        if (oldId && oldId !== newId) await deleteDoc(doc(db, "users", user.uid, "students", oldId));
        row.dataset.docId = newId;
        return true;
    } catch (error) {
        console.error("Save error:", error);
        return false;
    }
}

async function saveCurrentStudents() {
    const user = auth.currentUser;
    if (!user) return alert("Please login first.");
    for (const row of tableBody.querySelectorAll("tr")) await saveRow(row);
}

saveStudents.addEventListener("click", async function () {
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
// Ismein 2 kaam hote hain:
// 1) Sirf 1 hi network call se poori list la ke dikhana (extra reads nahi)
// 2) Purane ID-scheme wale students (jinka doc ID abhi ke Name+Roll se
//    match nahi karta) ko naye scheme pe migrate karna — isse "duplicate
//    person" ban jaane wala bug khatam ho jaata hai.

async function loadStudents() {
    const user = auth.currentUser;
    if (!user) return;

    const snapshot = await getDocs(collection(db, "users", user.uid, "students"));
    tableBody.innerHTML = "";
    studentNumber = 0;

    for (const docSnapshot of snapshot.docs) {
        const student = docSnapshot.data();
        studentNumber++;

        const row = document.createElement("tr");
        row.dataset.docId = docSnapshot.id;
        row.innerHTML = `
            <td>${studentNumber}</td>
            <td><input type="text" class="student-name" value="${student.name || ""}"></td>
            <td><input type="text" class="roll-no" value="${student.roll || ""}"></td>
            <td><input type="text" value="${student.regNo || ""}"></td>
            <td><input type="text" value="${student.phone || ""}"></td>
            <td><button class="details-btn">View</button></td>
            <td><span class="student-result">—</span></td>
            <td><button class="delete-student">×</button></td>`;
        tableBody.appendChild(row);

        renderResultFromData(row, student);

        // Migration: agar document ID Name+Roll se match nahi karti, sahi ID pe shift karo
        if (student.name && student.roll) {
            const correctId = buildStudentId(student.name, student.roll);
            if (correctId !== docSnapshot.id) {
                try {
                    await setDoc(doc(db, "users", user.uid, "students", correctId), student, { merge: true });
                    await deleteDoc(doc(db, "users", user.uid, "students", docSnapshot.id));
                    row.dataset.docId = correctId;
                } catch (error) {
                    console.error("Migration error:", error);
                }
            }
        }
    }
    //Hamesha kam se kam 20 student rows dikhao
    while (studentNumber < 20) {
        addStudentRow();
    }
}

onAuthStateChanged(auth, function (user) {
    if (!user) return (window.location.href = "Login.html");
    loadStudents();
});

searchInput.addEventListener("input", function () {
    const searchValue = searchInput.value.toLowerCase().trim();
    tableBody.querySelectorAll("tr").forEach(function (row) {
        const { name, roll, regNo, phone } = getRowValues(row);
        const match = [name, roll, regNo, phone].some(v => v.toLowerCase().includes(searchValue));
        row.style.display = match ? "" : "none";
    });
});

tableBody.addEventListener("click", async function (event) {
    if (!event.target.classList.contains("delete-student")) return;

    const row = event.target.closest("tr");
    const { name, roll } = getRowValues(row);
    const id = row.dataset.docId || (name && roll ? buildStudentId(name, roll) : "");

    if (!id) return row.remove();
    if (!confirm("Kya aap is student ka pura data delete karna chahte hain?")) return;

    const user = auth.currentUser;
    if (!user) return alert("Please login first.");

    try {
        await deleteDoc(doc(db, "users", user.uid, "students", id));
        row.remove();
        alert("Student deleted successfully!");
    } catch (error) {
        console.error("Delete error:", error);
        alert("Student delete nahi ho paya.");
    }
});

logoutButton.addEventListener("click", function () {
    signOut(auth)
        .then(() => (window.location.href = "Login.html"))
        .catch((error) => {
            console.error("Logout error:", error);
            alert("Logout failed. Please try again.");
        });
});