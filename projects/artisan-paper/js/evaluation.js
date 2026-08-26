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
          <div class="value">${s.geomean_vs_best ? de(s.geomean_vs_best, 2) : "-"}<span class="unit">x</span></div>
          <div class="sub">schnellste Engine in ${s.wins} von ${s.categories} Kategorien</div>
        </div>`;
      })
      .join("") +
    `</div>
    <div class="note">
      Der Wert fasst zusammen, wie weit eine Engine im Mittel vom jeweils schnellsten Ergebnis
      einer Kategorie entfernt liegt. 1,00 bedeutet, dass sie in allen Kategorien am schnellsten
      war; höhere Werte bedeuten einen größeren durchschnittlichen Abstand. Für diese Verhältnisse
      wird das geometrische Mittel verwendet.
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
    ["A2", "Eine Komponente lesen, eine schreiben", "Beispiel: Geschwindigkeit lesen und daraus die Position einer Figur aktualisieren."],
    ["A4", "Acht Komponenten", "Beispiel: ein komplexeres System verarbeitet pro Entity gleichzeitig mehrere Zustände. Nahezu deckungsgleiche Kurven zeigen hier vergleichbare Laufzeiten."],
    ["A5", "Nur lesen, zwei Komponenten", "Beispiel: ein System wertet Daten aus, ohne den Zustand der Entities zu verändern."],
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
    <caption>Median aus ${d.cfg.reps} Wiederholungen, Angaben in Millisekunden. Weniger ist besser. In der letzten Spalte gilt ebenfalls: kürzerer Balken = geringerer Zeitbedarf.</caption>
    <thead><tr><th>Kategorie</th>
      ${present.map((e) => `<th><span class="swatch ${e}"></span>${ENGINE_LABEL[e] ?? e}</th>`).join("")}
      <th style="width:150px">relativer Zeitbedarf</th></tr></thead><tbody>`;

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
        if (!v || v.missing) return `<td class="num muted">-</td>`;
        if (v.unsupported)
          return `<td class="num muted" title="${v.reason ?? ""}"><span class="tag">nicht unterstützt</span></td>`;
        const best = r.valid && r.fastest === e;
        // Statt eines Schlagworts die tatsächliche Streuung: ± zeigt, wie weit
        // die Einzelmessungen um den Median lagen.
        const streuung =
          v.rsd > 0.1
            ? ` <span class="tag warn" title="Die Einzelmessungen schwankten um ${de(v.rsd * 100, 0)} Prozent um den Median. Für einen belastbaren Vergleich ist das viel.">±${de(v.rsd * 100, 0)} %</span>`
            : "";
        return `<td class="num${best ? ` best ${e}` : ""}" title="Median ${de(v.median, 3)} ms, 95-Prozent-Konfidenzintervall von ${de(v.ci95[0], 2)} bis ${de(v.ci95[1], 2)} ms">${de(v.median, 3)}${streuung}</td>`;
      })
      .join("");

    // Intuitive Leserichtung: ein kurzer Balken steht für eine kurze Laufzeit.
    const relatives = present
      .map((e) => r.engines[e]?.relative)
      .filter((v) => Number.isFinite(v));
    const maxRelative = relatives.length ? Math.max(...relatives) : 1;
    const bars = r.valid
      ? present
          .map((e) => {
            const v = r.engines[e];
            if (!v?.relative) return "";
            return `<span class="bar-track" title="${ENGINE_LABEL[e]} braucht das ${de(v.relative, 2)}-fache der schnellsten Engine"><span class="bar ${e}" style="width:${((v.relative / maxRelative) * 100).toFixed(1)}%"></span></span>`;
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
      .map((l) => {
        // Loss summaries contain the original label but not the sweep value
        // needed by the localized category label. Resolve the complete row.
        const row = d.rows.find((r) => r.id === l.id && r.label === l.label) ?? l;
        return `<tr>
          <td>${labelDE(row)}</td>
          <td class="muted" style="text-align:right">${gruppeDE(l.group)}</td>
          <td class="num">${de(l.behind, 2)}x langsamer</td>
          <td style="text-align:right"><span class="swatch ${l.fastest}"></span>${ENGINE_LABEL[l.fastest] ?? l.fastest}</td>
        </tr>`;
      })
      .join("") +
    `</tbody></table></div>`;
}

function renderEnv(d) {
  const a = d.env.artisan ?? {};
  const rows = [
    ["Prozessor", "Intel Core i5-13600KF"],
    ["Grafikkarte", "NVIDIA GeForce RTX 4070"],
    ["Betriebssystem", "Windows 11 Pro"],
    ["Arbeitsspeicher", "32 GB DDR5-6000"],
    ["Rust", a.rustc_version],
    ["Profil", a.profile ? `${a.profile}, opt-level ${a.opt_level}` : null],
    ["Bevy", d.env.bevy?.bevy_version],
    ["flecs", d.env.flecs?.flecs_version ? `${d.env.flecs.flecs_version} (${d.env.flecs.compiler})` : null],
  ].filter(([, v]) => v);

  $("env").innerHTML =
    `<table><tbody>` +
    rows.map(([k, v]) => `<tr><td>${k}</td><td class="num" style="text-align:right">${v}</td></tr>`).join("") +
    `</tbody></table>`;
  $("stamp").textContent = "Messung vom " + new Date(d.generated).toLocaleDateString("de-DE");
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
