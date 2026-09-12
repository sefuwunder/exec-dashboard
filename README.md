# Exec Dashboard ✨

A C-suite command center for a software development + sales company.
Dark aurora backdrop, frosted-glass cards, subtle motion throughout.

Built with [Bun](https://bun.sh). Zero npm dependencies.

## What's on the board

- **KPI strip** — ARR, net revenue retention, sales pipeline, win rate,
  burn multiple, runway. Each card has a sparkline and an animated
  count-up on load.
- **Revenue vs target** — trailing-12-month area chart with target line.
- **Sales pipeline** — funnel by stage with stage-to-stage conversion.
- **Engineering** — sprint burndown (ideal vs actual) plus DORA-style
  stats: deploys/week, lead time, change-fail rate, uptime.
- **Needs attention** — risks and blockers ranked by severity.
- **Quarterly OKRs** — objectives with key-result progress bars.

Motion (card entrances, bar fills, count-ups) disables automatically
under `prefers-reduced-motion`.

## Run it

```sh
bun start   # → http://localhost:3003
```

## API

- `GET /api/kpis` · `/api/revenue` · `/api/funnel` · `/api/sprint` · `/api/okrs` · `/api/alerts`

The data is deterministic demo data (seeded PRNG in `server.ts`) —
swap the data section for your warehouse / CRM / CI feeds to go live.
