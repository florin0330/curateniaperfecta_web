# curateniaperfecta.ro — site nou + sistem de rezervări

Ce conține acest proiect:

- `public/` — site-ul static (HTML/CSS/JS), în română. Se publică pe **GitHub Pages**.
- `functions/` — Cloud Functions (Node.js) care trimit emailuri prin **Resend** când vine o cerere nouă și când o aprobi/refuzi. Se publică pe **Firebase**.
- `firestore.rules` / `firestore.indexes.json` — regulile bazei de date. Publicul poate doar să *creeze* o cerere; doar contul tău de admin poate să le citească/modifice.

Cum funcționează, pe scurt:

1. Clientul completează formularul de pe `/contact.html` → cererea se salvează direct în Firestore (status `pending`).
2. O funcție automată trimite clientului un email "am primit cererea ta" cu un link privat către `/gestioneaza-rezervarea.html` (fără cont, fără parolă), și îți trimite ție (`office@curateniaperfecta.ro`) un email cu detaliile.
3. Tu intri pe `/admin.html`, te loghezi cu Google (**doar** `florin390@gmail.com` are voie), și apeși Confirmă / Refuză.
4. O altă funcție automată trimite clientului emailul final, de confirmare sau de refuz.

---

## 0. Ce trebuie să pregătești înainte

- Cont [GitHub](https://github.com) (pentru site)
- Proiect Firebase creat (ai spus că îl ai deja — bun, verifică la pasul 2 că are planul **Blaze**, e obligatoriu pentru Cloud Functions; ai totuși un nivel gratuit generos inclus)
- Cont Resend cu domeniul `curateniaperfecta.ro` verificat (ai spus că e gata) și un API key
- Node.js instalat pe calculator (versiunea 20) — [nodejs.org](https://nodejs.org)
- Logo-ul actual (fișier imagine), o poză pentru share pe social media (og-image) și un favicon

## 1. Pune fișierele tale în proiect

Înainte de orice, adaugă în `public/assets/img/`:

- `logo.png` — logo-ul actual, pe fundal transparent dacă se poate
- `favicon.png` — o iconiță pătrată (min. 64×64px)
- `og-cover.jpg` — imaginea care apare când cineva distribuie linkul site-ului (1200×630px recomandat)

## 2. Instalează Firebase CLI și conectează proiectul

```bash
npm install -g firebase-tools
firebase login
```

În folderul acestui proiect:

```bash
firebase use --add
```

Alege proiectul tău Firebase din listă și dă-i alias-ul `default`.

## 3. Activează serviciile necesare în consola Firebase

Mergi pe [console.firebase.google.com](https://console.firebase.google.com) → proiectul tău:

- **Build → Firestore Database** → Create database → pornește în modul implicit (regulile le publicăm noi mai jos)
- **Build → Authentication → Sign-in method** → activează **Google** ca furnizor
- **Project settings → Your apps** → dacă nu ai deja o "Web app", apasă `</>` Add app, dă-i un nume (ex: "curateniaperfecta-web") — **nu** e nevoie de Firebase Hosting, doar de config
- Copiază obiectul `firebaseConfig` care apare și pune-l în `public/assets/js/firebase-config.js` (înlocuiește valorile `REPLACE_ME`)

## 4. Configurează cheia Resend ca secret

Cheia Resend nu trebuie pusă niciodată în cod. O salvăm ca secret în Firebase:

```bash
firebase functions:secrets:set RESEND_API_KEY
```

Îți va cere să lipești cheia (cea din contul tău Resend, cea pe care ai testat-o deja).

Deschide `functions/index.js` și verifică/ajustează dacă e nevoie:

- `FROM_EMAIL` — trebuie să fie o adresă pe domeniul verificat în Resend (ex: `rezervari@curateniaperfecta.ro`)
- `OFFICE_EMAIL` — unde primești tu notificările de cerere nouă (implicit `office@curateniaperfecta.ro`)
- `ADMIN_EMAIL` — contul Google care are voie pe `/admin.html` (implicit `florin390@gmail.com`)

Aceleași valori pentru `ADMIN_EMAIL` trebuie să se potrivească și în `public/assets/js/firebase-config.js` și în `firestore.rules` (sunt deja setate la `florin390@gmail.com` peste tot).

## 5. Publică regulile Firestore și funcțiile

```bash
firebase deploy --only firestore:rules,firestore:indexes
firebase deploy --only functions
```

Primul deploy de funcții durează câteva minute. La final, în consolă vei vedea confirmarea pentru:
`onReservationCreated`, `onReservationStatusChanged`, `getReservation`, `cancelReservation`.

## 6. Publică site-ul pe GitHub Pages

Creează un repo nou pe GitHub (ex: `curateniaperfecta-site`), apoi din folderul proiectului:

```bash
git init
git add .
git commit -m "Site nou + sistem de rezervari"
git branch -M main
git remote add origin https://github.com/NUMELE-TAU/curateniaperfecta-site.git
git push -u origin main
```

Pe GitHub: **Settings → Pages** → Source: `Deploy from a branch` → Branch: `main`, folder: `/public` → Save.

Pentru domeniul propriu (`www.curateniaperfecta.ro`):

- Fișierul `public/CNAME` e deja pregătit cu `www.curateniaperfecta.ro`
- La registrarul tău de domeniu, adaugă un record `CNAME` pentru `www` către `NUMELE-TAU.github.io`
- În GitHub → Settings → Pages, sub "Custom domain", scrie `www.curateniaperfecta.ro` și bifează "Enforce HTTPS" (poate dura până la 24h să se activeze)

## 7. Testează tot fluxul

1. Deschide site-ul, mergi la Contact, trimite o cerere de test cu emailul tău
2. Ar trebui să primești imediat emailul "am primit cererea ta"
3. Tot tu (`office@curateniaperfecta.ro`) ar trebui să primești și emailul de notificare
4. Intră pe `/admin.html`, loghează-te cu `florin390@gmail.com`, apasă Confirmă
5. Ar trebui să primești emailul de confirmare pe adresa de test
6. Din emailul inițial, dă click pe linkul de gestionare și verifică că se vede statusul corect

Dacă un email nu ajunge, verifică în consola Firebase → Functions → Logs, și în Resend → Logs.

## Ce poți schimba ușor mai târziu

- **Prețuri afișate**: momentan site-ul rămâne pe "cere ofertă", fără prețuri fixe — spui tu când vrei să adăugăm un tabel de prețuri pe `/servicii.html`.
- **Poze reale**: hero-ul de pe homepage are un vizual generic momentan; când ai poze cu echipa/rezultate, le putem integra.
- **A doua persoană admin**: dacă mai vrei un cont care să aprobe cereri, spune-mi și adăugăm emailul lui în `firestore.rules` și `firebase-config.js`.
