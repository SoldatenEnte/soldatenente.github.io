// Minimal SVG charting for the Artisan dashboard.
//
// Hand-rolled rather than pulled from a library: the pages must render offline
// with no external requests, and the whole requirement here is two chart types.
//
// Each engine gets a distinct hue (--s-artisan/--s-bevy/--s-flecs, defined in
// style.css). Marker shape and dash/hatch pattern are kept as a *second*,
// redundant cue, so the charts still separate engines in grayscale or print.

export const ENGINES = ["artisan", "bevy", "flecs"];

export const ENGINE_LABEL = {
  artisan: "Artisan",
  bevy: "Bevy 0.18.1",
  flecs: "flecs 4.1",
  three: "Three.js",
};

/// Stroke and marker conventions per engine. `dash` and `marker` carry the
/// identity in line charts, the same way fill texture does in bar charts.
const STYLE = {
  artisan: { dash: "5 3", marker: "circle", width: 2 },
  bevy: { dash: "none", marker: "square", width: 1.4 },
  flecs: { dash: "none", marker: "triangle", width: 1.4 },
  three: { dash: "5 3", marker: "square", width: 1.4 },
};

const SVG_NS = "http://www.w3.org/2000/svg";

function el(name, attrs = {}, text) {
  const n = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  return n;
}

function marker(kind, x, y, size = 3.4) {
  switch (kind) {
    case "square":
      return el("rect", { x: x - size, y: y - size, width: size * 2, height: size * 2 });
    case "triangle":
      return el("polygon", {
        points: `${x},${y - size * 1.2} ${x + size * 1.1},${y + size} ${x - size * 1.1},${y + size}`,
      });
    default:
      return el("circle", { cx: x, cy: y, r: size });
  }
}

function niceTicks(min, max, count = 4) {
  if (!(max > 0)) return [0];
  const span = max - min || max;
  const raw = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag;
  const out = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 0.001; v += step) out.push(v);
  return out;
}

function fmtMs(v) {
  if (v >= 100) return v.toFixed(0);
  if (v >= 10) return v.toFixed(1);
  if (v >= 1) return v.toFixed(2);
  return v.toFixed(3);
}

function fmtCount(n) {
  if (n >= 1_000_000) return `${n / 1_000_000}M`;
  if (n >= 1_000) return `${n / 1_000}k`;
  return String(n);
}

/**
 * Log-log line chart of median time against a swept parameter.
 *
 * Both axes are logarithmic: entity counts span three orders of magnitude, and
 * on a linear axis the small counts would collapse into the origin and hide
 * exactly the region where per-call overhead is visible.
 *
 * @param {{x:number, values:Object<string,number>}[]} series
 */
export function sweepChart(series, { title, xLabel, yLabel = "median ms", height = 260 } = {}) {
  const W = 720;
  const H = height;
  // `top` leaves a band above the plot for the y-axis caption, which would
  // otherwise sit at the same height as the topmost tick label and overlap it.
  const pad = { top: 30, right: 16, bottom: 42, left: 58 };

  const svg = el("svg", {
    class: "chart",
    viewBox: `0 0 ${W} ${H}`,
    role: "img",
    "aria-label": title ?? "sweep chart",
  });

  const xs = series.map((s) => s.x);
  const allY = series.flatMap((s) => Object.values(s.values)).filter((v) => v > 0);
  if (!xs.length || !allY.length) return svg;

  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(...allY), yMax = Math.max(...allY);

  const lx = (v) => Math.log10(Math.max(v, 1e-9));
  const px = (v) =>
    pad.left + ((lx(v) - lx(xMin)) / (lx(xMax) - lx(xMin) || 1)) * (W - pad.left - pad.right);
  const py = (v) =>
    H - pad.bottom -
    ((lx(v) - lx(yMin)) / (lx(yMax) - lx(yMin) || 1)) * (H - pad.top - pad.bottom);

  // Horizontal grid at each power of ten inside the range.
  const g = el("g", { class: "grid" });
  for (let e = Math.floor(Math.log10(yMin)); e <= Math.ceil(Math.log10(yMax)); e++) {
    for (const m of [1, 2, 5]) {
      const v = m * Math.pow(10, e);
      if (v < yMin || v > yMax) continue;
      g.appendChild(el("line", { x1: pad.left, x2: W - pad.right, y1: py(v), y2: py(v) }));
      g.appendChild(
        el("text", { x: pad.left - 8, y: py(v) + 3.5, "text-anchor": "end", "font-size": 10 }, fmtMs(v)),
      );
    }
  }
  svg.appendChild(g);

  // Axes.
  const ax = el("g", { class: "axis" });
  ax.appendChild(el("line", { x1: pad.left, x2: W - pad.right, y1: H - pad.bottom, y2: H - pad.bottom }));
  for (const x of xs) {
    ax.appendChild(el("line", { x1: px(x), x2: px(x), y1: H - pad.bottom, y2: H - pad.bottom + 4 }));
    ax.appendChild(
      el("text", { x: px(x), y: H - pad.bottom + 17, "text-anchor": "middle", "font-size": 10.5 }, fmtCount(x)),
    );
  }
  if (xLabel) {
    ax.appendChild(
      el("text", { x: (pad.left + W - pad.right) / 2, y: H - 5, "text-anchor": "middle", "font-size": 10, "letter-spacing": "0.1em" }, xLabel.toUpperCase()),
    );
  }
  ax.appendChild(
    el("text", { x: 0, y: 10, "font-size": 10, "letter-spacing": "0.08em" }, yLabel.toUpperCase()),
  );
  svg.appendChild(ax);

  // One polyline plus markers per engine.
  for (const engine of ENGINES) {
    const pts = series
      .filter((s) => s.values[engine] > 0)
      .map((s) => [px(s.x), py(s.values[engine])]);
    if (pts.length < 1) continue;
    const st = STYLE[engine];
    const stroke = `var(--s-${engine})`;

    if (pts.length > 1) {
      svg.appendChild(
        el("polyline", {
          points: pts.map((p) => p.join(",")).join(" "),
          fill: "none",
          stroke,
          "stroke-width": st.width,
          "stroke-dasharray": st.dash,
        }),
      );
    }
    for (const [x, y] of pts) {
      const m = marker(st.marker, x, y);
      m.setAttribute("fill", stroke);
      m.setAttribute("stroke", "var(--paper)");
      m.setAttribute("stroke-width", 1.3);
      svg.appendChild(m);
    }
  }

  return svg;
}

/**
 * Grouped bar chart: one group per swept value, one bar per engine.
 * Linear y-axis, because bar length must stay proportional to the value.
 */
export function groupedBars(groups, { height = 240, yLabel = "median ms" } = {}) {
  const W = 720;
  const H = height;
  const pad = { top: 28, right: 14, bottom: 40, left: 58 };

  const svg = el("svg", { class: "chart", viewBox: `0 0 ${W} ${H}`, role: "img" });
  const allY = groups.flatMap((g) => Object.values(g.values)).filter((v) => v > 0);
  if (!allY.length) return svg;
  const yMax = Math.max(...allY);

  const py = (v) => H - pad.bottom - (v / yMax) * (H - pad.top - pad.bottom);
  const plotW = W - pad.left - pad.right;
  const groupW = plotW / groups.length;
  const barW = Math.min(26, (groupW * 0.72) / ENGINES.length);

  const grid = el("g", { class: "grid" });
  for (const t of niceTicks(0, yMax, 4)) {
    grid.appendChild(el("line", { x1: pad.left, x2: W - pad.right, y1: py(t), y2: py(t) }));
    grid.appendChild(
      el("text", { x: pad.left - 8, y: py(t) + 3.5, "text-anchor": "end", "font-size": 10 }, fmtMs(t)),
    );
  }
  svg.appendChild(grid);

  // Artisan additionally gets a hatched fill. It is the implementation under
  // investigation and therefore receives the recurring secondary visual cue.
  const defs = el("defs");
  const pat = el("pattern", { id: "artisan-hatch", width: 5, height: 5, patternTransform: "rotate(45)", patternUnits: "userSpaceOnUse" });
  pat.appendChild(el("rect", { width: 5, height: 5, fill: "var(--paper)" }));
  pat.appendChild(el("line", { x1: 0, y1: 0, x2: 0, y2: 5, stroke: "var(--s-artisan)", "stroke-width": 2.2 }));
  defs.appendChild(pat);
  svg.appendChild(defs);

  groups.forEach((grp, gi) => {
    const cx = pad.left + groupW * (gi + 0.5);
    ENGINES.forEach((engine, ei) => {
      const v = grp.values[engine];
      if (!(v > 0)) return;
      const x = cx - (ENGINES.length * barW) / 2 + ei * barW;
      const rect = el("rect", {
        x,
        y: py(v),
        width: barW - 2,
        height: Math.max(1, H - pad.bottom - py(v)),
      });
      if (engine === "artisan") {
        rect.setAttribute("fill", "url(#artisan-hatch)");
        rect.setAttribute("stroke", "var(--s-artisan)");
        rect.setAttribute("stroke-width", 1);
      } else {
        rect.setAttribute("fill", `var(--s-${engine})`);
      }
      svg.appendChild(rect);
    });
    svg.appendChild(
      el("text", { x: cx, y: H - pad.bottom + 16, "text-anchor": "middle", "font-size": 10.5 }, grp.label),
    );
  });

  const ax = el("g", { class: "axis" });
  ax.appendChild(el("line", { x1: pad.left, x2: W - pad.right, y1: H - pad.bottom, y2: H - pad.bottom }));
  ax.appendChild(el("text", { x: 0, y: 10, "font-size": 10, "letter-spacing": "0.08em" }, yLabel.toUpperCase()));
  svg.appendChild(ax);

  return svg;
}

/** Legend markup matching the chart conventions. */
export function legend(engines = ENGINES) {
  const div = document.createElement("div");
  div.className = "legend";
  div.innerHTML = engines
    .map((e) => `<span><span class="swatch ${e}"></span>${ENGINE_LABEL[e] ?? e}</span>`)
    .join("");
  return div;
}
