/**
 * Cloud Functions for curateniaperfecta.ro
 *
 * Flow:
 *  1. Client submits the booking form on the public site -> writes directly
 *     to Firestore (allowed by firestore.rules, status forced to "pending").
 *  2. onReservationCreated fires -> emails the client ("am primit cererea ta")
 *     with a private "manage your reservation" link, and emails the office.
 *  3. Admin signs in on /admin.html with Google (florin390@gmail.com only,
 *     enforced by firestore.rules) and sets status to "confirmed" or
 *     "declined" directly in Firestore.
 *  4. onReservationStatusChanged fires -> emails the client the final answer.
 *
 * The client's magic-link page (/gestioneaza-rezervarea.html) never talks to
 * Firestore directly. It calls the getReservation / cancelReservation
 * callable functions below, which check the secret token server-side.
 */

const { setGlobalOptions } = require("firebase-functions/v2");
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const { Resend } = require("resend");

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({ region: "europe-west1", maxInstances: 10 });

const RESEND_API_KEY = defineSecret("RESEND_API_KEY");

// ---- Fixed business config -------------------------------------------------
const ADMIN_EMAIL = "florin390@gmail.com"; // Google account for the admin dashboard
// TEMP FOR TESTING: swap back to "office@curateniaperfecta.ro" once testing is done.
const OFFICE_EMAIL = "dav123_f@yahoo.com";
const OFFICE_PHONE = "0726 712 535";
const SITE_URL = "https://www.curateniaperfecta.ro";
// Must be an address on a domain you've verified in Resend.
const FROM_EMAIL = "Curățenia Perfectă <rezervari@curateniaperfecta.ro>";

const SERVICE_LABELS = {
  intretinere: "Curățenie de întreținere",
  generala: "Curățenie generală",
  constructor: "Curățenie după constructor",
  birouri: "Curățenie birouri",
  tapiterie: "Curățare mochetă / canapele",
  geamuri: "Curățare geamuri",
  altele: "Alt serviciu",
};

function serviceLabel(key) {
  return SERVICE_LABELS[key] || key || "Serviciu de curățenie";
}

function formatDate(ts) {
  if (!ts) return "-";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("ro-RO", {
    timeZone: "Europe/Bucharest",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

function emailShell(bodyHtml) {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#f2f5f3;padding:24px 0;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e3e8e5;">
      <div style="background:#0f6b4c;padding:20px 28px;">
        <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.2px;">Curățenia Perfectă</span>
      </div>
      <div style="padding:28px;color:#1c2321;font-size:15px;line-height:1.6;">
        ${bodyHtml}
      </div>
      <div style="padding:18px 28px;background:#f2f5f3;color:#5b6660;font-size:12.5px;">
        Curățenia Perfectă &middot; București &amp; Ilfov &middot; ${OFFICE_PHONE} &middot; ${OFFICE_EMAIL}
      </div>
    </div>
  </div>`;
}

function getResend() {
  return new Resend(RESEND_API_KEY.value());
}

// ---- 1. New booking -> notify client + office ------------------------------
exports.onReservationCreated = onDocumentCreated(
  { document: "reservations/{id}", secrets: [RESEND_API_KEY] },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const r = snap.data();
    const id = event.params.id;
    const manageUrl = `${SITE_URL}/gestioneaza-rezervarea.html?id=${id}&token=${r.token}`;
    const resend = getResend();

    const clientHtml = emailShell(`
      <p>Bună, ${escapeHtml(r.name)},</p>
      <p>Am primit cererea ta de <strong>${escapeHtml(serviceLabel(r.service))}</strong> și îți mulțumim că ai ales Curățenia Perfectă.</p>
      <p>O verificăm și revenim cu un răspuns în cel mai scurt timp, de obicei în câteva ore.</p>
      <p style="margin:24px 0;">
        <a href="${manageUrl}" style="background:#0f6b4c;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;display:inline-block;">Vezi și gestionează cererea ta</a>
      </p>
      <p style="color:#5b6660;font-size:13px;">Poți folosi acest link oricând pentru a verifica stadiul cererii sau pentru a o anula. Nu este nevoie de cont sau parolă.</p>
    `);

    const officeHtml = emailShell(`
      <p><strong>Cerere nouă de rezervare</strong></p>
      <table style="border-collapse:collapse;width:100%;font-size:14px;">
        <tr><td style="padding:4px 0;color:#5b6660;">Nume</td><td style="padding:4px 0;">${escapeHtml(r.name)}</td></tr>
        <tr><td style="padding:4px 0;color:#5b6660;">Telefon</td><td style="padding:4px 0;">${escapeHtml(r.phone)}</td></tr>
        <tr><td style="padding:4px 0;color:#5b6660;">Email</td><td style="padding:4px 0;">${escapeHtml(r.email)}</td></tr>
        <tr><td style="padding:4px 0;color:#5b6660;">Serviciu</td><td style="padding:4px 0;">${escapeHtml(serviceLabel(r.service))}</td></tr>
        <tr><td style="padding:4px 0;color:#5b6660;">Zonă</td><td style="padding:4px 0;">${escapeHtml(r.zone)}</td></tr>
        <tr><td style="padding:4px 0;color:#5b6660;">Data dorită</td><td style="padding:4px 0;">${escapeHtml(r.preferredDate)}</td></tr>
        <tr><td style="padding:4px 0;color:#5b6660;vertical-align:top;">Detalii</td><td style="padding:4px 0;">${escapeHtml(r.details) || "-"}</td></tr>
      </table>
      <p style="margin:24px 0;">
        <a href="${SITE_URL}/admin.html" style="background:#0f6b4c;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;display:inline-block;">Deschide panoul de admin</a>
      </p>
    `);

    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: r.email,
        subject: "Am primit cererea ta - Curățenia Perfectă",
        html: clientHtml,
      });
      await resend.emails.send({
        from: FROM_EMAIL,
        to: OFFICE_EMAIL,
        subject: `Cerere nouă: ${r.name} - ${serviceLabel(r.service)}`,
        html: officeHtml,
      });
    } catch (err) {
      logger.error("Failed sending creation emails", err);
    }
  }
);

// ---- 2. Status change (admin approves/declines) -> final email to client ---
exports.onReservationStatusChanged = onDocumentUpdated(
  { document: "reservations/{id}", secrets: [RESEND_API_KEY] },
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    if (before.status === after.status) return;
    if (!["confirmed", "declined"].includes(after.status)) return;

    const resend = getResend();
    const id = event.params.id;
    const manageUrl = `${SITE_URL}/gestioneaza-rezervarea.html?id=${id}&token=${after.token}`;

    let subject, bodyHtml;
    if (after.status === "confirmed") {
      subject = "Rezervarea ta a fost confirmată - Curățenia Perfectă";
      bodyHtml = emailShell(`
        <p>Bună, ${escapeHtml(after.name)},</p>
        <p>Cererea ta pentru <strong>${escapeHtml(serviceLabel(after.service))}</strong> a fost <strong style="color:#0f6b4c;">confirmată</strong>.</p>
        <p>Te vom contacta la ${escapeHtml(after.phone)} pentru a stabili exact data și ora intervenției.</p>
        <p style="margin:24px 0;">
          <a href="${manageUrl}" style="background:#0f6b4c;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;display:inline-block;">Vezi detaliile rezervării</a>
        </p>
      `);
    } else {
      subject = "Despre cererea ta - Curățenia Perfectă";
      bodyHtml = emailShell(`
        <p>Bună, ${escapeHtml(after.name)},</p>
        <p>Din păcate nu putem prelua în acest moment cererea ta pentru <strong>${escapeHtml(serviceLabel(after.service))}</strong>${after.adminNote ? ` (${escapeHtml(after.adminNote)})` : ""}.</p>
        <p>Ne poți contacta direct la ${OFFICE_PHONE} sau ${OFFICE_EMAIL} ca să găsim împreună o altă variantă.</p>
      `);
    }

    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: after.email,
        subject,
        html: bodyHtml,
      });
    } catch (err) {
      logger.error("Failed sending status-change email", err);
    }
  }
);

// ---- 3. Client magic-link page: fetch a single reservation by token --------
exports.getReservation = onCall({ secrets: [] }, async (request) => {
  const { id, token } = request.data || {};
  if (!id || !token) {
    throw new HttpsError("invalid-argument", "Lipsesc datele cererii.");
  }
  const doc = await db.collection("reservations").doc(id).get();
  if (!doc.exists || doc.data().token !== token) {
    throw new HttpsError("permission-denied", "Cererea nu a fost găsită.");
  }
  const r = doc.data();
  return {
    id: doc.id,
    name: r.name,
    service: r.service,
    serviceLabel: serviceLabel(r.service),
    zone: r.zone,
    preferredDate: r.preferredDate,
    details: r.details,
    status: r.status,
    adminNote: r.adminNote || null,
    createdAt: formatDate(r.createdAt),
  };
});

// ---- 4. Client magic-link page: cancel a pending reservation ---------------
exports.cancelReservation = onCall({ secrets: [] }, async (request) => {
  const { id, token } = request.data || {};
  if (!id || !token) {
    throw new HttpsError("invalid-argument", "Lipsesc datele cererii.");
  }
  const ref = db.collection("reservations").doc(id);
  const doc = await ref.get();
  if (!doc.exists || doc.data().token !== token) {
    throw new HttpsError("permission-denied", "Cererea nu a fost găsită.");
  }
  if (doc.data().status !== "pending") {
    throw new HttpsError("failed-precondition", "Doar cererile în așteptare pot fi anulate.");
  }
  await ref.update({
    status: "cancelled",
    cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { ok: true };
});
