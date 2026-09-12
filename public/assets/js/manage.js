import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFunctions,
  httpsCallable,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-functions.js";
import { firebaseConfig, functionsRegion } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const functions = getFunctions(app, functionsRegion);
const getReservation = httpsCallable(functions, "getReservation");
const cancelReservation = httpsCallable(functions, "cancelReservation");

const params = new URLSearchParams(location.search);
const id = params.get("id");
const token = params.get("token");

const loadingEl = document.getElementById("manage-loading");
const errorEl = document.getElementById("manage-error");
const cardEl = document.getElementById("manage-card");

const BADGE = {
  pending: ["În așteptare", "badge-pending"],
  confirmed: ["Confirmată", "badge-confirmed"],
  declined: ["Refuzată", "badge-declined"],
  cancelled: ["Anulată", "badge-cancelled"],
};

function show(el) {
  [loadingEl, errorEl, cardEl].forEach((x) => x && (x.style.display = "none"));
  if (el) el.style.display = "block";
}

async function load() {
  if (!id || !token) {
    show(errorEl);
    errorEl.textContent = "Linkul folosit nu este valid. Verifică emailul primit de la noi.";
    return;
  }
  try {
    const res = await getReservation({ id, token });
    render(res.data);
  } catch (err) {
    console.error(err);
    show(errorEl);
    errorEl.textContent =
      "Nu am găsit această rezervare. Linkul poate fi expirat sau incorect - verifică emailul primit de la noi.";
  }
}

function render(r) {
  const [label, cls] = BADGE[r.status] || ["-", ""];
  document.getElementById("m-name").textContent = r.name;
  document.getElementById("m-service").textContent = r.serviceLabel;
  document.getElementById("m-zone").textContent = r.zone || "-";
  document.getElementById("m-date").textContent = r.preferredDate || "-";
  document.getElementById("m-details").textContent = r.details || "-";
  document.getElementById("m-created").textContent = r.createdAt;
  const badge = document.getElementById("m-status");
  badge.textContent = label;
  badge.className = "badge " + cls;

  const noteWrap = document.getElementById("m-note-wrap");
  if (r.status === "declined" && r.adminNote) {
    noteWrap.style.display = "block";
    document.getElementById("m-note").textContent = r.adminNote;
  } else {
    noteWrap.style.display = "none";
  }

  const cancelBtn = document.getElementById("m-cancel");
  if (r.status === "pending") {
    cancelBtn.style.display = "inline-flex";
    cancelBtn.onclick = async () => {
      if (!confirm("Sigur vrei să anulezi această cerere?")) return;
      cancelBtn.disabled = true;
      cancelBtn.textContent = "Se anulează...";
      try {
        await cancelReservation({ id, token });
        await load();
      } catch (err) {
        alert("Nu am putut anula cererea. Încearcă din nou sau sună-ne.");
        cancelBtn.disabled = false;
        cancelBtn.textContent = "Anulează cererea";
      }
    };
  } else {
    cancelBtn.style.display = "none";
  }

  show(cardEl);
}

load();
