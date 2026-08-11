// Umschalter zwischen hellem und dunklem Modus.
//
// Hell ist der Standard. Die Systemeinstellung wird bewusst nicht ausgewertet:
// die Seite soll für jeden Besucher gleich aussehen, solange er nicht selbst
// umschaltet.
//
// Damit beim Laden nichts aufblitzt, setzt ein kurzes Inline-Skript im <head>
// jeder Seite das Attribut bereits vor dem ersten Zeichnen. Dieses Modul
// ergänzt nur die Schaltfläche.

const KEY = "artisan-theme";

const SONNE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`;
const MOND = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>`;

function aktuell() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function setzen(modus) {
  if (modus === "dark") document.documentElement.dataset.theme = "dark";
  else delete document.documentElement.dataset.theme;
  try {
    localStorage.setItem(KEY, modus);
  } catch {
    // Privater Modus ohne Speicher: die Wahl gilt dann nur für diese Seite.
  }
  aktualisiereSchalter();
}

function aktualisiereSchalter() {
  const btn = document.querySelector(".theme-toggle");
  if (!btn) return;
  const dunkel = aktuell() === "dark";
  btn.innerHTML = (dunkel ? SONNE : MOND) + `<span>${dunkel ? "Hell" : "Dunkel"}</span>`;
  btn.setAttribute("aria-label", dunkel ? "Zu hellem Modus wechseln" : "Zu dunklem Modus wechseln");
}

export function initTheme(container) {
  const btn = document.createElement("button");
  btn.className = "theme-toggle";
  btn.type = "button";
  btn.addEventListener("click", () => setzen(aktuell() === "dark" ? "light" : "dark"));
  container.appendChild(btn);
  aktualisiereSchalter();
}
