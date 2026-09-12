import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { firebaseConfig, ADMIN_EMAIL } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

const gate = document.getElementById("admin-gate");
const panel = document.getElementById("admin-panel");
const whoEl = document.getElementById("admin-who");
const loginBtn = document.getElementById("admin-login");
const logoutBtn = document.getElementById("admin-logout");
const deniedMsg = document.getElementById("admin-denied");
const tbody = document.getElementById("admin-rows");
const emptyEl = document.getElementById("admin-empty");
const tabs = document.querySelectorAll(".admin-tab");

let currentFilter = "pending";
let unsub = null;

loginBtn.addEventListener("click", () => {
  deniedMsg.style.display = "none";
  signInWithPopup(auth, provider).catch((err) => {
    console.error(err);
    alert("Autentificarea a eșuat. Încearcă din nou.");
  });
});

logoutBtn.addEventListener("click", () => signOut(auth));

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    currentFilter = tab.dataset.filter;
    subscribe();
  });
});

onAuthStateChanged(auth, (user) => {
  if (unsub) { unsub(); unsub = null; }
  if (!user) {
    gate.style.display = "flex";
    panel.style.display = "none";
    return;
  }
  if (user.email !== ADMIN_EMAIL) {
    deniedMsg.style.display = "block";
    deniedMsg.textContent = `Contul ${user.email} nu are acces la acest panou.`;
    signOut(auth);
    return;
  }
  gate.style.display = "none";
  panel.style.display = "block";
  whoEl.textContent = user.email;
  subscribe();
});

function subscribe() {
  if (unsub) unsub();
  tbody.innerHTML = "";
  const base = collection(db, "reservations");
  const q =
    currentFilter === "all"
      ? query(base, orderBy("createdAt", "desc"))
      : query(base, orderBy("createdAt", "desc"));

  unsub = onSnapshot(
    q,
    (snap) => {
      const rows = [];
      snap.forEach((d) => {
        const r = d.data();
        if (currentFilter !== "all" && r.status !== currentFilter) return;
        rows.push({ id: d.id, ...r });
      });
      renderRows(rows);
    },
    (err) => {
      console.error(err);
      tbody.innerHTML = `<tr><td colspan="7">Eroare la încărcare: ${err.message}</td></tr>`;
    }
  );
}

function fmt(ts) {
  if (!ts || !ts.toDate) return "-";
  return ts.toDate().toLocaleString("ro-RO", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const BADGE = {
  pending: ["În așteptare", "badge-pending"],
  confirmed: ["Confirmată", "badge-confirmed"],
  declined: ["Refuzată", "badge-declined"],
  cancelled: ["Anulată", "badge-cancelled"],
};

function renderRows(rows) {
  emptyEl.style.display = rows.length ? "none" : "block";
  tbody.innerHTML = rows
    .map((r) => {
      const [label, cls] = BADGE[r.status] || ["-", ""];
      const actions =
        r.status === "pending"
          ? `<div class="row-actions">
               <button class="confirm" data-id="${r.id}" data-action="confirmed">Confirmă</button>
               <button class="decline" data-id="${r.id}" data-action="declined">Refuză</button>
             </div>`
          : "";
      return `<tr>
        <td>${fmt(r.createdAt)}</td>
        <td><strong>${escapeHtml(r.name)}</strong><br><span class="muted">${escapeHtml(r.phone)}</span><br><span class="muted">${escapeHtml(r.email)}</span></td>
        <td>${escapeHtml(r.service)}</td>
        <td>${escapeHtml(r.zone || "-")}</td>
        <td>${escapeHtml(r.preferredDate || "-")}</td>
        <td><span class="badge ${cls}">${label}</span></td>
        <td>${actions}</td>
      </tr>`;
    })
    .join("");

  tbody.querySelectorAll("button[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => handleAction(btn.dataset.id, btn.dataset.action));
  });
}

async function handleAction(id, action) {
  let adminNote = "";
  if (action === "declined") {
    adminNote = prompt("Motiv (opțional, va fi inclus în emailul către client):") || "";
  }
  try {
    await updateDoc(doc(db, "reservations", id), {
      status: action,
      adminNote: adminNote || null,
      decidedAt: new Date(),
    });
  } catch (err) {
    console.error(err);
    alert("Nu am putut actualiza cererea: " + err.message);
  }
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
