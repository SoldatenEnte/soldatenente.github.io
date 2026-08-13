// Gemeinsame Navigation aller Dokumentseiten.
//
// Die Struktur steht an einer Stelle, damit Seitenleiste, Kopfzeile und die
// Vor-/Zurueck-Navigation nicht auseinanderlaufen koennen. Alle Pfade sind
// relativ, damit die Seite auch unterhalb eines Unterverzeichnisses laeuft
// (GitHub Pages legt Projektseiten unter /reponame/ ab).

import { initTheme } from "./theme.js";

export const PAGES = [
  {
    file: "index.html",
    title: "Überblick",
    sections: [
      ["idee", "Kurzfassung"],
      ["einstieg", "Motivation und Ziel"],
      ["engine", "Die entwickelte Engine"],
      ["thema", "Gegenstand und Abgrenzung"],
      ["vergleich", "Vergleich und Messungen"],
      ["ergebnis", "Ergebnis vorweg"],
      ["aufbau", "Inhalt"],
    ],
  },
  {
    file: "grundlagen.html",
    title: "Grundlagen",
    sections: [
      ["ecs", "Entity-Component-System"],
      ["speichermodelle", "Sparse Set und Archetype"],
      ["caches", "CPU-Caches"],
      ["wasm", "WebAssembly: Problem und Format"],
      ["wasm-speicher", "Linearer Speicher"],
      ["nebenlaeufigkeit", "Nebenläufigkeit"],
      ["webgpu", "GPU-Rendering-Pipeline"],
      ["webgl", "WebGPU vs. WebGL"],
      ["instancing", "Instancing und Batching"],
    ],
  },
  {
    file: "architektur.html",
    title: "Architektur",
    sections: [
      ["schichten", "Drei Schichten"],
      ["game-engine", "Bausteine der Game Engine"],
      ["archetype", "Archetype-Speicher"],
      ["bruecke", "Zero-Copy-Brücke"],
      ["rendering", "Rendering-Pipeline"],
      ["fragmentierung", "Batch-Fragmentierung"],
    ],
  },
  {
    file: "planet.html",
    title: "Planet",
    sections: [
      ["modell", "Vom Mesh zur Welt"], ["klima", "Klima und Ressourcen"],
      ["graph", "Oberfläche als Graph"], ["siedler", "Siedler und Stämme"],
      ["ablauf", "Simulationsschritt"], ["artisan", "Artisans Aufgabe"],
      ["aussage", "Aussage der Demo"],
    ],
  },
  {
    file: "evaluation.html",
    title: "Evaluation",
    sections: [
      ["methodik", "Methodik"],
      ["ergebnisse", "ECS-Messreihe"],
      ["schwaechen", "Wo Artisan verliert"],
      ["bruecke", "WASM-JavaScript-Grenze"],
      ["renderer", "Renderer gegen Three.js"],
      ["umgebung", "Testumgebung"],
    ],
  },
  {
    file: "demos.html",
    title: "Demos",
    sections: [
      ["vivarium", "Vivarium Civ"],
      ["weitere", "Weitere Demos"],
    ],
  },
  {
    file: "grenzen.html",
    title: "Grenzen",
    sections: [
      ["handles", "Handles und Sichten"],
      ["scheduler", "Scheduler"],
      ["messung", "Grenzen der Messung"],
      ["einordnung", "Einordnung"],
    ],
  },
  {
    file: "quellen.html",
    title: "Quellen",
    sections: [["literatur", "Literatur und Standards"]],
  },
  {
    file: "ki-nutzung.html",
    title: "KI-Nutzung",
    sections: [
      ["werkzeuge", "Verwendete Werkzeuge"],
      ["unterstuetzung", "Art der Unterstützung"],
      ["verantwortung", "Eigenanteil und Verantwortung"],
    ],
  },
];

function currentFile() {
  const name = location.pathname.split("/").pop();
  return !name || name === "" ? "index.html" : name;
}

/** Seitenleiste, Kopfzeile und Pager erzeugen. */
export function renderNav() {
  const here = currentFile();
  const idx = PAGES.findIndex((p) => p.file === here);

  const head = document.querySelector(".masthead nav");
  if (head) {
    head.innerHTML = PAGES.map(
      (p) => `<a href="./${p.file}"${p.file === here ? ' aria-current="page"' : ""}>${p.title}</a>`,
    ).join("");
  }

  const right = document.querySelector(".masthead .right");
  if (right) initTheme(right);

  const side = document.querySelector(".doc-nav");
  if (side) {
    side.innerHTML = PAGES.map((p) => {
      const active = p.file === here;
      const subs = active
        ? `<ul>${p.sections
            .map(([id, label]) => `<li><a href="#${id}" data-sec="${id}">${label}</a></li>`)
            .join("")}</ul>`
        : "";
      return `<div class="group"${active ? " data-active" : ""}>
        <a href="./${p.file}">${p.title}</a>${subs}</div>`;
    }).join("");
  }

  const pager = document.querySelector(".pager");
  if (pager && idx >= 0) {
    const prev = PAGES[idx - 1];
    const next = PAGES[idx + 1];
    pager.innerHTML =
      (prev ? `<a class="prev" href="./${prev.file}"><span class="dir">Zurück</span><span class="name">${prev.title}</span></a>` : "<span></span>") +
      (next ? `<a class="next" href="./${next.file}"><span class="dir">Weiter</span><span class="name">${next.title}</span></a>` : "<span></span>");
  }

  setupScrollSpy();
}

/** Markiert den Abschnitt, der gerade gelesen wird. */
function setupScrollSpy() {
  const links = [...document.querySelectorAll(".doc-nav a[data-sec]")];
  if (!links.length) return;
  const sections = links
    .map((a) => document.getElementById(a.dataset.sec))
    .filter(Boolean);
  if (!sections.length) return;

  const mark = (id) => {
    for (const a of links) {
      if (a.dataset.sec === id) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    }
  };

  // rootMargin schneidet oben die Kopfzeile und unten den groessten Teil des
  // Viewports weg. Dadurch gilt der Abschnitt als aktiv, sobald seine
  // Ueberschrift den oberen Rand erreicht, und nicht erst wenn er den ganzen
  // Bildschirm fuellt.
  const obs = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((e) => e.isIntersecting);
      if (visible.length) mark(visible[0].target.id);
    },
    { rootMargin: "-90px 0px -70% 0px", threshold: 0 },
  );
  for (const s of sections) obs.observe(s);
}

renderNav();
