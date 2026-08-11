// Stellt die aufgezeichneten Messreihen dar. Es wird nichts gemessen, nur
// gelesen: die Seite laeuft statisch und ohne Server.

import { sweepChart, groupedBars, legend, ENGINES, ENGINE_LABEL } from "./chart.js";
import { labelDE, beschreibungDE, gruppeDE, gruppeIntroDE } from "./labels.js";

const $ = (id) => document.getElementById(id);
const de = (n, d = 0) => n.toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d });

async function load(name) {
  const res = await fetch(`./data/${name}`);
  if (!res.ok) throw new Error(name + " fehlt");
  return res.json();
}

function fail(el, msg) {
  el.innerHTML = `<div class="note warn">${msg}</div>`;
}

// --- ECS-Messreihe ----------------------------------------------------------

function renderHeadline(d) {
  $("headline").innerHTML =
    `<div class="stats">` +
    d.engines
      .map((e) => {
        const s = d.summary[e];
        return `<div class="stat">
          <div class="label"><span class="swatch ${e}"></span>${ENGINE_LABEL[e] ?? e}</div>
          <div class="value">${s.geomean_vs_best ? de(s.geomean_vs_best, 2) : "–"}<span class="unit">×</span></div>
          <div class="sub">schnellste Engine in ${s.wins} von ${s.categories} Kategorien</div>
        </div>`;
      })
      .join("") +
    `</div>
    <div class="note">
      Geometrisches Mittel der Kategorieverhältnisse gegenüber der jeweils schnellsten Engine.
      Geometrisch, nicht arithmetisch: Ein Mittel aus Verhältnissen wird von den Kategorien mit
      den größten Verhältnissen bestimmt, also genau von der Verzerrung, die diese Suite vermeiden
      soll.
      ${d.invalid_categories ? `<br><span class="tag warn">${d.invalid_categories} ungültig</span>
        Kategorien mit abweichenden Prüfsummen sind aus dem Mittel ausgenommen.` : ""}
    </div>` +
    (d.cfg.work_scale !== 1
      ? `<div class="note warn"><strong>Vorläufiger Lauf.</strong> Arbeitsumfang auf
         ${d.cfg.work_scale} verkürzt. Für berichtsfähige Werte ist ein vollständiger Lauf
         nötig.</div>`
      : "");
}

function seriesFor(rows, id) {
  return rows
    .filter((r) => r.id === id && r.valid)
    .sort((a, b) => a.sweep_value - b.sweep_value)
    .map((r) => ({
      x: r.sweep_value,
      values: Object.fromEntries(ENGINES.map((e) => [e, r.engines[e]?.median ?? 0])),
    }));
}

function renderSweepA(d) {
  const host = $("sweep-a");
  const charts = [
    ["A2", "Eine Komponente lesen, eine schreiben", "Die übliche Position-und-Velocity-Schleife"],
    ["A4", "Acht Komponenten", "Breiter Zugriff, viele Spalten je Entity"],
    ["A5", "Nur lesen, zwei Komponenten", "Zeigt, was Änderungsverfolgung beim Schreiben kostet"],
  ];
  for (const [id, title, dek] of charts) {
    const series = seriesFor(d.rows, id);
    if (!series.length) continue;
    const block = document.createElement("div");
    block.style.marginBottom = "40px";
    block.innerHTML = `<h3 style="margin-bottom:2px">${title}</h3><p class="dek" style="margin-top:0">${dek}</p>`;
    block.appendChild(sweepChart(series, { title, xLabel: "Entities", yLabel: "Median ms" }));
    block.appendChild(legend());
    host.appendChild(block);
  }
}

function renderSweepB(d) {
  const rows = d.rows.filter((r) => r.id === "B1" && r.valid).sort((a, b) => a.sweep_value - b.sweep_value);
  if (!rows.length) return;
  const groups = rows.map((r) => ({
    label: String(r.sweep_value),
    values: Object.fromEntries(ENGINES.map((e) => [e, r.engines[e]?.median ?? 0])),
  }));
  const host = $("sweep-b");
  host.appendChild(groupedBars(groups, { yLabel: "Median ms" }));
  const cap = document.createElement("p");
  cap.className = "dek";
  cap.style.textAlign = "center";
  cap.textContent = "Zahl der Archetypes, auf die dieselben 100.000 Entities verteilt sind";
  host.appendChild(cap);
  host.appendChild(legend());
}

function renderTable(d) {
  const present = d.engines;
  const spalten = present.length + 2;
  let html = `<table>
    <caption>Median aus ${d.cfg.reps} Wiederholungen, Angaben in Millisekunden. Weniger ist besser.</caption>
    <thead><tr><th>Kategorie</th>
      ${present.map((e) => `<th><span class="swatch ${e}"></span>${ENGINE_LABEL[e] ?? e}</th>`).join("")}
      <th style="width:150px">im Verhältnis</th></tr></thead><tbody>`;

  let group = "";
  for (const r of d.rows) {
    if (r.group !== group) {
      group = r.group;
      const intro = gruppeIntroDE(group);
      html += `<tr class="group-head"><td colspan="${spalten}">${gruppeDE(group)}</td></tr>`;
      if (intro) html += `<tr class="group-intro"><td colspan="${spalten}">${intro}</td></tr>`;
    }
    const cells = present
      .map((e) => {
        const v = r.engines[e];
        if (!v || v.missing) return `<td class="num muted">–</td>`;
        if (v.unsupported)
          return `<td class="num muted" title="${v.reason ?? ""}"><span class="tag">nicht unterstützt</span></td>`;
        const best = r.valid && r.fastest === e;
        // Statt eines Schlagworts die tatsächliche Streuung: ± zeigt, wie weit
        // die Einzelmessungen um den Median lagen.
        const streuung =
          v.rsd > 0.1
            ? ` <span class="tag warn" title="Die Einzelmessungen schwankten um ${de(v.rsd * 100, 0)} Prozent um den Median. Für einen belastbaren Vergleich ist das viel.">±${de(v.rsd * 100, 0)} %</span>`
            : "";
        return `<td class="num${best ? " best" : ""}" title="Median ${de(v.median, 3)} ms, 95-Prozent-Konfidenzintervall von ${de(v.ci95[0], 2)} bis ${de(v.ci95[1], 2)} ms">${de(v.median, 3)}${streuung}</td>`;
      })
      .join("");

    // Laengerer Balken heisst immer schneller, daher der Kehrwert.
    const bars = r.valid
      ? present
          .map((e) => {
            const v = r.engines[e];
            if (!v?.relative) return "";
            return `<span class="bar-track" title="${ENGINE_LABEL[e]} braucht das ${de(v.relative, 2)}-fache der schnellsten Engine"><span class="bar ${e}" style="width:${((1 / v.relative) * 100).toFixed(1)}%"></span></span>`;
          })
          .join("")
      : `<span class="tag bad">Prüfsumme weicht ab</span>`;

    html += `<tr><td title="${beschreibungDE(r)}">${labelDE(r)}</td>${cells}
      <td style="display:flex;flex-direction:column;gap:2px;padding-top:11px">${bars}</td></tr>`;
  }
  $("table").innerHTML = html + `</tbody></table>`;
}

function renderLosses(d) {
  if (!d.artisan_losses.length) {
    $("losses").innerHTML = `<p class="dek">In diesem Lauf war Artisan in jeder gültigen Kategorie
      am schnellsten. Das gilt für diese Arbeitslast auf dieser Maschine, nicht allgemein.</p>`;
    return;
  }
  $("losses").innerHTML =
    `<div class="scroll-x"><table><thead><tr>
      <th>Kategorie</th><th>Gruppe</th><th>Artisan ist</th><th>schnellste</th>
    </tr></thead><tbody>` +
    d.artisan_losses
      .map(
        (l) => `<tr>
          <td>${labelDE(l)}</td>
          <td class="muted" style="text-align:right">${gruppeDE(l.group)}</td>
          <td class="num">${de(l.behind, 2)}× langsamer</td>
          <td style="text-align:right"><span class="swatch ${l.fastest}"></span>${ENGINE_LABEL[l.fastest] ?? l.fastest}</td>
        </tr>`,
      )
      .join("") +
    `</tbody></table></div>`;
}

function renderEnv(d) {
  const a = d.env.artisan ?? {};
  const rows = [
    ["Prozessor", a.cpu_brand],
    ["Betriebssystem", a.os_description],
    ["Arbeitsspeicher", a.total_memory_mb ? `${Math.round(a.total_memory_mb / 1024)} GB` : null],
    ["Rust", a.rustc_version],
    ["Profil", a.profile ? `${a.profile}, opt-level ${a.opt_level}` : null],
    ["Bevy", d.env.bevy?.bevy_version],
    ["flecs", d.env.flecs?.flecs_version ? `${d.env.flecs.flecs_version} (${d.env.flecs.compiler})` : null],
    ["Artisan-Commit", a.git_commit ? a.git_commit + (a.git_dirty ? " (nicht eingecheckte Änderungen)" : "") : null],
    ["Protokoll", `${d.cfg.warmup} Aufwärmläufe, ${d.cfg.reps} Messläufe`],
  ].filter(([, v]) => v);

  $("env").innerHTML =
    `<table><tbody>` +
    rows.map(([k, v]) => `<tr><td>${k}</td><td class="num" style="text-align:right">${v}</td></tr>`).join("") +
    `</tbody></table>`;
  $("stamp").textContent = "Messung vom " + new Date(d.generated).toLocaleDateString("de-DE");
}

// --- WASM-JavaScript-Grenze -------------------------------------------------

const BRIDGE_DE = {
  "S1 call-per-entity (by name)": ["Aufruf je Entity, über den Namen", "Der öffentliche Weg: Komponente per Namen auflösen, dann lesen oder schreiben"],
  "S1b call-per-entity (by id)": ["Aufruf je Entity, ID bekannt", "Wie oben, ohne Namensauflösung. Die Differenz ist der Preis der Namenssuche"],
  "S2 marshalled per entity": ["Umgewandelt je Entity", "Ein neues Float32Array pro Entity, also Grenzübertritt plus Allokation"],
  "S3 column view (zero-copy)": ["Spaltensicht (Zero-Copy)", "Ein Zeiger für die ganze Spalte, danach direkter Zugriff"],
  "S4 column view + mark_changed": ["Spaltensicht plus mark_changed", "Wie S3, zusätzlich mit dem tatsächlichen Vertrag der Schnittstelle"],
  "S5 bulk copy out/in": ["Blockkopie", "Ein Aufruf für die gesamte Spalte, dafür n mal 3 kopierte Werte"],
};

function renderBridge(b) {
  const zero = b.rows.find((r) => r.name.startsWith("S3"));
  const max = Math.max(...b.rows.map((r) => r.ns_per_entity));

  $("bridge-table").innerHTML =
    `<table>
      <caption>${de(b.n)} Entities, Median aus ${b.reps} Wiederholungen</caption>
      <thead><tr>
        <th>Strategie</th><th>ns je Entity</th><th>gegen Zero-Copy</th><th></th><th>Änderungserkennung</th>
      </tr></thead><tbody>` +
    b.rows
      .map((r) => {
        const [name, desc] = BRIDGE_DE[r.name] ?? [r.name, ""];
        const rel = zero ? r.ns_per_entity / zero.ns_per_entity : 1;
        const isZero = r.name.startsWith("S3");
        return `<tr>
          <td><strong>${name}</strong><br><span class="dek">${desc}</span></td>
          <td class="num${isZero ? " best" : ""}">${de(r.ns_per_entity, 1)}</td>
          <td class="num">${isZero ? "–" : de(rel, 2) + "×"}</td>
          <td style="width:26%"><span class="bar-track"><span class="bar ${isZero ? "artisan" : "bevy"}" style="width:${Math.max(2, (r.ns_per_entity / max) * 100).toFixed(1)}%"></span></span></td>
          <td>${r.changed_rows > 0
            ? `<span class="tag ok">${de(r.changed_rows)} Zeilen</span>`
            : `<span class="tag warn">blind</span>`}</td>
        </tr>`;
      })
      .join("") +
    `</tbody></table>`;

  const s3 = b.rows.find((r) => r.name.startsWith("S3"));
  const s4 = b.rows.find((r) => r.name.startsWith("S4"));
  const s1 = b.rows.find((r) => r.name.startsWith("S1 "));
  if (s3 && s4 && s1) {
    $("bridge-note").innerHTML = `<div class="note">
      <strong>Der Vertrag hat einen Preis.</strong> S3 schreibt direkt in den WebAssembly-Speicher
      und ist der schnellste Weg, aber die Änderungserkennung meldet
      ${de(s3.changed_rows)} geänderte Zeilen: Rust sieht diese Schreibzugriffe nicht. S4 führt
      dieselben Schreibzugriffe aus und meldet jeden einzelnen an. Das kostet
      ${de(s4.ns_per_entity - s3.ns_per_entity, 1)} ns je Entity und liefert
      ${de(s4.changed_rows)} erkannte Zeilen. Gegenüber dem öffentlichen Weg über den Namen
      (${de(s1.ns_per_entity, 1)} ns) bleibt S4 damit um den Faktor
      ${de(s1.ns_per_entity / s4.ns_per_entity, 1)} schneller.
    </div>`;
  }
}

// --- Renderer ---------------------------------------------------------------

function renderRenderer(d) {
  $("renderer-table").innerHTML =
    `<table>
      <caption>Median der Frame-Zeit, ${d.runs[0]?.cfg?.animate ? "Animation je Instanz" : "statisch"}</caption>
      <thead><tr>
        <th>Instanzen</th>
        <th><span class="swatch artisan"></span>Artisan</th>
        <th><span class="swatch three"></span>Three.js</th>
        <th>Faktor</th><th>Artisan p95</th><th>Three.js p95</th>
      </tr></thead><tbody>` +
    d.runs
      .map((r) => {
        const a = r.artisan, b = r.three;
        const faster = a.median <= b.median;
        return `<tr>
          <td class="num">${de(r.cfg.n)}</td>
          <td class="num${faster ? " best" : ""}">${de(a.median, 2)} ms</td>
          <td class="num${!faster ? " best" : ""}">${de(b.median, 2)} ms</td>
          <td class="num">${de(b.median / a.median, 2)}×</td>
          <td class="num muted">${de(a.p95, 2)} ms</td>
          <td class="num muted">${de(b.p95, 2)} ms</td>
        </tr>`;
      })
      .join("") +
    `</tbody></table>`;
}

// --- Laden ------------------------------------------------------------------

load("fair_summary.json")
  .then((d) => {
    renderHeadline(d);
    renderSweepA(d);
    renderSweepB(d);
    renderTable(d);
    renderLosses(d);
    renderEnv(d);
  })
  .catch((e) => {
    fail($("headline"), `Für die ECS-Messreihe liegen noch keine Daten vor (${e.message}).`);
  });

load("bridge_results.json")
  .then(renderBridge)
  .catch(() => fail($("bridge-table"), "Für die Brückenmessung liegen noch keine Daten vor."));

load("renderer_results.json")
  .then(renderRenderer)
  .catch(() => fail($("renderer-table"), "Für den Renderervergleich liegen noch keine Daten vor."));
