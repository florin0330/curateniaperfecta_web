document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    links.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => links.classList.remove("open"))
    );
  }

  // Animated number counters (stats section)
  const counters = document.querySelectorAll(".stat-num");
  if (counters.length && "IntersectionObserver" in window) {
    const animateCounter = (el) => {
      const target = parseFloat(el.dataset.count || "0");
      const suffix = el.dataset.suffix || "";
      const duration = 1200;
      const start = performance.now();
      const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const counterIo = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            counterIo.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach((el) => counterIo.observe(el));
  } else {
    counters.forEach((el) => { el.textContent = (el.dataset.count || "0") + (el.dataset.suffix || ""); });
  }

  // Floating WhatsApp button
  const waNumber = "40726712535"; // 0726 712 535 in international format, no + or spaces
  const waMessage = "Bună! Aș vrea o ofertă de curățenie.";
  const waLink = document.createElement("a");
  waLink.href = `https://wa.me/${waNumber}?text=${encodeURIComponent(waMessage)}`;
  waLink.className = "whatsapp-float";
  waLink.target = "_blank";
  waLink.rel = "noopener";
  waLink.setAttribute("aria-label", "Scrie-ne pe WhatsApp");
  waLink.innerHTML = `
    <span class="wa-ping"></span>
    <svg viewBox="0 0 32 32" fill="#fff" aria-hidden="true">
      <path d="M16.01 3C9.38 3 4 8.38 4 15.01c0 2.49.73 4.8 1.98 6.74L4 29l7.43-1.95a11.94 11.94 0 0 0 4.58.91h.01c6.63 0 12.01-5.38 12.01-12.01C28.03 8.38 22.65 3 16.01 3zm0 21.79h-.01a9.7 9.7 0 0 1-4.95-1.36l-.35-.21-4.41 1.16 1.18-4.3-.23-.36a9.72 9.72 0 0 1-1.49-5.21C5.75 9.5 10.35 4.9 16.01 4.9c2.6 0 5.04 1.01 6.88 2.85a9.65 9.65 0 0 1 2.85 6.87c0 5.66-4.6 10.27-10.73 10.27zm5.64-7.7c-.31-.15-1.82-.9-2.1-1-.28-.1-.49-.15-.69.15-.2.31-.79 1-.97 1.2-.18.21-.36.23-.66.08-.31-.15-1.3-.48-2.47-1.53-.91-.81-1.53-1.82-1.71-2.12-.18-.31-.02-.47.13-.63.14-.14.31-.36.46-.54.15-.18.2-.31.31-.51.1-.21.05-.39-.03-.54-.08-.15-.69-1.67-.95-2.28-.25-.6-.5-.52-.69-.53h-.59c-.2 0-.53.08-.81.39s-1.06 1.03-1.06 2.53 1.08 2.94 1.23 3.14c.15.2 2.13 3.26 5.17 4.57.72.31 1.28.5 1.72.64.72.23 1.38.2 1.9.12.58-.09 1.82-.74 2.08-1.46.26-.72.26-1.33.18-1.46-.08-.13-.28-.21-.59-.36z"/>
    </svg>`;
  document.body.appendChild(waLink);

  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a[data-page]").forEach((a) => {
    if (a.dataset.page === path) a.classList.add("active");
  });

  // Header gains a shadow once the page is scrolled.
  const header = document.querySelector(".site-header");
  if (header) {
    const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  // Fade-and-rise reveal animation for cards, section intros and steps.
  const revealTargets = document.querySelectorAll(
    ".card, .section-head, .step, .hero-copy, .quote-strip, .band .container > *, .stats-grid, .zone-grid, .faq-item, .trust-grid"
  );
  revealTargets.forEach((el) => el.classList.add("reveal"));
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            setTimeout(() => entry.target.classList.add("in-view"), (i % 6) * 70);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealTargets.forEach((el) => io.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add("in-view"));
  }
});
