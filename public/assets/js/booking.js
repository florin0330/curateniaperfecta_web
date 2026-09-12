import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function randomToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

const form = document.getElementById("booking-form");
const msg = document.getElementById("booking-msg");
const submitBtn = document.getElementById("booking-submit");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.className = "form-msg";
    submitBtn.disabled = true;
    submitBtn.textContent = "Se trimite...";

    const data = new FormData(form);
    const reservation = {
      name: (data.get("name") || "").toString().trim(),
      phone: (data.get("phone") || "").toString().trim(),
      email: (data.get("email") || "").toString().trim(),
      service: (data.get("service") || "").toString(),
      zone: (data.get("zone") || "").toString().trim(),
      preferredDate: (data.get("preferredDate") || "").toString().trim(),
      details: (data.get("details") || "").toString().trim(),
      status: "pending",
      token: randomToken(),
      createdAt: serverTimestamp(),
    };

    if (!reservation.name || !reservation.phone || !reservation.email || !reservation.service) {
      msg.textContent = "Te rugăm să completezi toate câmpurile obligatorii.";
      msg.classList.add("show", "err");
      submitBtn.disabled = false;
      submitBtn.textContent = "Trimite cererea";
      return;
    }

    try {
      await addDoc(collection(db, "reservations"), reservation);
      form.reset();
      form.style.display = "none";
      msg.innerHTML =
        "Cererea ta a fost trimisă. Îți vom scrie în câteva minute pe email, cu un link prin care poți vedea sau anula rezervarea oricând.";
      msg.classList.add("show", "ok");
    } catch (err) {
      console.error(err);
      msg.textContent =
        "A apărut o eroare la trimitere. Te rugăm să încerci din nou sau să ne suni direct.";
      msg.classList.add("show", "err");
      submitBtn.disabled = false;
      submitBtn.textContent = "Trimite cererea";
    }
  });
}
