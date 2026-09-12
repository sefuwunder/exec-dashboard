/* Meridian executive dashboard — zero-dep rendering. */

"use strict";

const $ = (id) => document.getElementById(id);

/* ---------- formatting ---------- */

function fmtKpi(k, raw) {
  const v = raw === undefined ? k.value : raw;
  const num = (k.prefix || "") + v + (k.suffix || "");
  return num;
}

function countUp(el, k) {
  const target = k.value;
  const decimals = String(target).split(".")[1]?.length || 0;
  const dur = 900, t0 = performance.now();
  function frame(t) {
    const p = Math.min(1, (t - t0) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    const cur = target * eased;
    el.textContent = (k.prefix || "") + cur.toFixed(decimals) + (k.suffix || "");
    if (p < 1) requestAnimationFrame(frame);
  }
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    el.textContent = fmtKpi(k);
  } else {
    requestAnimationFrame(frame);
  }
}

/* ---------- svg chart builders (pure, testable) ---------- */

function sparkline(points, w, h, color) {
  w = w || 120; h = h || 34; color = color || "#7dd3fc";
  const min = Math.min.apply(null, points), max = Math.max.apply(null, points);
  const span = max - min || 1;
  const step = w / (points.length - 1);
  const d = points.map((p, i) =>
    (i ? "L" : "M") + (i * step).toFixed(1) + "," + (h - 4 - ((p - min) / span) * (h - 10)).toFixed(1)
  ).join(" ");
  return '<svg class="chart" viewBox="0 0 ' + w + " " + h + '" width="' + w + '" height="' + h + '">' +
    '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round"/>' +
    "</svg>";
}

function areaChart(rows) {
  const W = 640, H = 260, P = { l: 44, r: 12, t: 14, b: 28 };
  const vals = rows.flatMap((r) => [r.actual, r.target]);
  const min = Math.min.apply(null, vals) * 0.96, max = Math.max.apply(null, vals) * 1.03;
  const X = (i) => P.l + (i / (rows.length - 1)) * (W - P.l - P.r);
  const Y = (v) => P.t + (1 - (v - min) / (max - min)) * (H - P.t - P.b);
  const line = (key, stroke, dash) =>
    '<path d="' + rows.map((r, i) => (i ? "L" : "M") + X(i).toFixed(1) + "," + Y(r[key]).toFixed(1)).join(" ") +
    '" fill="none" stroke="' + stroke + '" stroke-width="2.5" stroke-linecap="round"' +
    (dash ? ' stroke-dasharray="6 5"' : "") + "/>";
  const area =
    '<path d="' + rows.map((r, i) => (i ? "L" : "M") + X(i).toFixed(1) + "," + Y(r.actual).toFixed(1)).join(" ") +
    " L" + X(rows.length - 1).toFixed(1) + "," + (H - P.b) + " L" + X(0).toFixed(1) + "," + (H - P.b) + ' Z"' +
    ' fill="url(#revfill)"/>';
  const labels = rows.map((r, i) =>
    '<text x="' + X(i).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="11" fill="#9aa3b8">' + r.month + "</text>"
  ).join("");
  const grid = [0.25, 0.5, 0.75].map((f) => {
    const y = P.t + f * (H - P.t - P.b);
    return '<line x1="' + P.l + '" y1="' + y + '" x2="' + (W - P.r) + '" y2="' + y + '" stroke="rgba(255,255,255,.07)"/>';
  }).join("");
  return '<svg class="chart" viewBox="0 0 ' + W + " " + H + '" role="img">' +
    '<defs><linearGradient id="revfill" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#7dd3fc" stop-opacity=".35"/>' +
    '<stop offset="1" stop-color="#7dd3fc" stop-opacity="0"/></linearGradient></defs>' +
    grid + area + line("target", "#5b6478", true) + line("actual", "#7dd3fc", false) + labels + "</svg>";
}

function burndownChart(s, days) {
  const W = 640, H = 220, P = { l: 36, r: 12, t: 14, b: 26 };
  const max = s.total;
  const X = (i) => P.l + (i / (days.length - 1)) * (W - P.l - P.r);
  const Y = (v) => P.t + (1 - v / max) * (H - P.t - P.b);
  const path = (arr) => arr.map((v, i) => (i ? "L" : "M") + X(i).toFixed(1) + "," + Y(v).toFixed(1)).join(" ");
  const labels = days.map((d, i) =>
    '<text x="' + X(i).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="11" fill="#9aa3b8">' + d + "</text>"
  ).join("");
  return '<svg class="chart" viewBox="0 0 ' + W + " " + H + '" role="img">' +
    '<path d="' + path(s.ideal) + '" fill="none" stroke="#5b6478" stroke-width="2" stroke-dasharray="6 5"/>' +
    '<path d="' + path(s.actual) + '" fill="none" stroke="#34d399" stroke-width="2.5" stroke-linecap="round"/>' +
    labels + "</svg>";
}

/* ---------- html builders (pure, testable) ---------- */

function kpiCard(k, i) {
  return '<div class="glass kpi" style="animation-delay:' + (0.02 + i * 0.04).toFixed(2) + 's">' +
    '<div class="label">' + k.label + "</div>" +
    '<div class="value" data-kpi="' + k.id + '">' + fmtKpi(k) + "</div>" +
    '<div class="delta ' + (k.up ? "up" : "") + '">' + k.delta + "</div>" +
    '<div class="spark">' + sparkline(k.spark) + "</div></div>";
}

function funnelHTML(rows) {
  const max = Math.max.apply(null, rows.map((r) => r.value));
  return rows.map((r) => {
    const w = Math.round((r.value / max) * 100);
    return '<div class="frow"><div class="meta"><span class="st">' + r.stage +
      (r.conv ? '<span class="conv">' + r.conv + '% ↓</span>' : "") + "</span>" +
      '<span class="v">$' + r.value + "M · " + r.count + "</span></div>" +
      '<div class="bar"><i data-w="' + w + '"></i></div></div>';
  }).join("");
}

function okrHTML(okrs) {
  return okrs.map((o) =>
    '<div class="okr"><div class="ot">' + o.title + "</div>" +
    o.krs.map((k) =>
      '<div class="kr"><span>' + k.label + '</span><span class="pct">' + k.pct + '%</span>' +
      '<div class="bar"><i data-w="' + k.pct + '"></i></div></div>'
    ).join("") + "</div>"
  ).join("");
}

function alertsHTML(alerts) {
  return alerts.map((a) =>
    '<div class="alert"><span class="dot ' + a.sev + '"></span><span>' + a.text +
    '</span><span class="time">' + a.time + "</span></div>"
  ).join("");
}

function doraHTML(stats) {
  return stats.map((s) =>
    '<div class="stat"><div class="n">' + s.value + '</div><div class="l">' + s.label + "</div></div>"
  ).join("");
}

/* ---------- boot ---------- */

function animateBars() {
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.querySelectorAll(".bar i[data-w]").forEach((el) => {
    const w = el.getAttribute("data-w") + "%";
    if (reduce) { el.style.width = w; return; }
    requestAnimationFrame(() => requestAnimationFrame(() => { el.style.width = w; }));
  });
}

async function boot() {
  tickClock();
  setInterval(tickClock, 1000);
  const [kpis, revenue, funnel, sprint, okrs, alerts] = await Promise.all([
    fetch("/api/kpis").then((r) => r.json()),
    fetch("/api/revenue").then((r) => r.json()),
    fetch("/api/funnel").then((r) => r.json()),
    fetch("/api/sprint").then((r) => r.json()),
    fetch("/api/okrs").then((r) => r.json()),
    fetch("/api/alerts").then((r) => r.json()),
  ]);

  $("kpis").innerHTML = kpis.map(kpiCard).join("");
  kpis.forEach((k) => {
    const el = document.querySelector('[data-kpi="' + k.id + '"]');
    if (el) countUp(el, k);
  });

  $("revenue-chart").innerHTML = areaChart(revenue);
  $("funnel").innerHTML = funnelHTML(funnel);
  $("sprint-name").textContent = sprint.name;
  $("burndown").innerHTML = burndownChart(sprint, ["M", "T", "W", "T", "F", "M", "T", "W", "T", "F"]);
  $("dora").innerHTML = doraHTML(sprint.stats);
  $("okrs").innerHTML = okrHTML(okrs);
  $("alerts").innerHTML = alertsHTML(alerts);
  animateBars();
}

function tickClock() {
  const now = new Date();
  const t = $("clock-time"), d = $("clock-date");
  if (t) t.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (d) d.textContent = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

/* export for tests */
if (typeof module !== "undefined") {
  module.exports = { sparkline, areaChart, burndownChart, kpiCard, funnelHTML, okrHTML, alertsHTML, doraHTML, fmtKpi };
}

document.addEventListener("DOMContentLoaded", boot);
