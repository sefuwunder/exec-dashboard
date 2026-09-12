// Meridian — executive dashboard. Bun + zero dependencies.
// Serves the glass UI and a small JSON API of company metrics.

import { join, extname } from "node:path";

const PORT = Number(process.env.PORT || 3003);
const PUB = join(import.meta.dir, "public");

// Deterministic PRNG so the demo data is stable between restarts.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260912);
const r2 = (n: number) => Math.round(n * 100) / 100;

// ---------- data ----------

const kpis = [
  { id: "arr",     label: "ARR",            value: 24.8,  prefix: "$", suffix: "M", delta: "+18.2% YoY", up: true,
    spark: [18.2, 18.9, 19.1, 19.8, 20.4, 20.9, 21.6, 22.1, 22.9, 23.4, 24.1, 24.8] },
  { id: "nrr",     label: "Net revenue retention", value: 118, suffix: "%", delta: "+2.1 pts", up: true,
    spark: [112, 113, 114, 113, 115, 116, 115, 117, 116, 118, 117, 118] },
  { id: "pipe",    label: "Sales pipeline", value: 31.2,  prefix: "$", suffix: "M", delta: "+9.4% QoQ", up: true,
    spark: [22.4, 23.1, 24.0, 23.6, 25.2, 26.1, 27.0, 26.4, 28.2, 29.5, 30.1, 31.2] },
  { id: "win",     label: "Win rate",       value: 27,    suffix: "%", delta: "+3.0 pts", up: true,
    spark: [21, 22, 23, 22, 24, 25, 24, 26, 25, 27, 26, 27] },
  { id: "burn",    label: "Burn multiple",  value: 1.4,   delta: "−0.3 QoQ", up: true,
    spark: [2.4, 2.2, 2.3, 2.1, 2.0, 1.9, 1.8, 1.7, 1.6, 1.5, 1.5, 1.4] },
  { id: "runway",  label: "Runway",         value: 22,    suffix: " mo", delta: "cash $41M", up: true,
    spark: [14, 15, 15, 16, 17, 17, 18, 19, 19, 20, 21, 22] },
];

const months = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];
const revenue = months.map((m, i) => ({
  month: m,
  actual: r2(1.68 + i * 0.038 + rnd() * 0.07),
  target: r2(1.7 + i * 0.04),
}));

const funnel = [
  { stage: "Discovery",   value: 48.5, count: 312, conv: null },
  { stage: "Demo",        value: 31.2, count: 148, conv: 47 },
  { stage: "Proposal",    value: 18.9, count: 76,  conv: 51 },
  { stage: "Negotiation", value: 11.4, count: 38,  conv: 50 },
  { stage: "Closed won · Q3", value: 6.8, count: 24, conv: 63 },
];

const sprintDays = ["M", "T", "W", "T", "F", "M", "T", "W", "T", "F"];
const sprint = {
  name: "Sprint 38 · Platform 2.0",
  total: 42,
  ideal: sprintDays.map((_, i) => r2(42 * (1 - (i + 1) / 10))),
  actual: [42, 40, 38, 36, 33, 30, 26, 21, 15, 8].map((v) => v + r2(rnd() * 1.2 - 0.6)),
  stats: [
    { label: "Deploys / week", value: "14" },
    { label: "Lead time", value: "3.2h" },
    { label: "Change fail", value: "4.1%" },
    { label: "Uptime 90d", value: "99.98%" },
  ],
};

const okrs = [
  {
    title: "Reach a $28M ARR run-rate",
    krs: [
      { label: "Close $6.8M new ARR", pct: 72 },
      { label: "NRR ≥ 120%", pct: 82 },
      { label: "Launch usage-based billing", pct: 100 },
    ],
  },
  {
    title: "Ship Platform 2.0",
    krs: [
      { label: "API v2 general availability", pct: 100 },
      { label: "99.99% uptime", pct: 64 },
      { label: "Migrate 80% of tenants", pct: 45 },
    ],
  },
  {
    title: "Build the enterprise engine",
    krs: [
      { label: "12 enterprise AEs hired", pct: 75 },
      { label: "Avg. deal cycle < 90 days", pct: 58 },
      { label: "SOC 2 + ISO 27001 certified", pct: 100 },
    ],
  },
];

const alerts = [
  { sev: "high", text: "Churn risk — Acme Corp ($480k ARR) opened 14 support tickets in 7 days.", time: "12m" },
  { sev: "high", text: "Deploy pipeline failing on payments-api — 3 consecutive failures.", time: "38m" },
  { sev: "med",  text: "Enterprise deal $1.2M stalled in Legal for 21 days.", time: "2h" },
  { sev: "med",  text: "Engineering hiring 6 behind Q3 plan.", time: "5h" },
  { sev: "low",  text: "NPS dipped 4 pts in the SMB segment this month.", time: "1d" },
];

// ---------- server ----------

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};

const API: Record<string, unknown> = {
  "/api/kpis": kpis,
  "/api/revenue": revenue,
  "/api/funnel": funnel,
  "/api/sprint": sprint,
  "/api/okrs": okrs,
  "/api/alerts": alerts,
};

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname in API) {
      return Response.json(API[url.pathname]);
    }
    let p = url.pathname === "/" ? "/index.html" : url.pathname;
    if (p.includes("..")) return new Response("bad path", { status: 400 });
    try {
      const file = Bun.file(join(PUB, p));
      if (!(await file.exists())) return new Response("not found", { status: 404 });
      return new Response(file, {
        headers: { "content-type": MIME[extname(p)] || "application/octet-stream" },
      });
    } catch {
      return new Response("not found", { status: 404 });
    }
  },
});

console.log(`exec-dashboard → http://localhost:${PORT}`);
