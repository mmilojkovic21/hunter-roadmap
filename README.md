# Hunter Roadmap

**English** · [Srpski](README.sr.md)

A self-hosted learning app that turns studying into an RPG-style progression system: ranks E→S, levels and XP, daily streaks, a skill map, daily and penalty quests, and boss tests per region. Its game-window look takes inspiration from the "system window" style of progression-fantasy anime. All UI and design assets are original.

The app is **content-agnostic**. Everything you learn comes from a **content pack** (an open JSON format, `hunter-pack/1`), so the same app works for full stack development, cybersecurity, German, or philosophy. The bundled pack is a full stack .NET interview-preparation course: 80 chapters, 395 test questions and 310 interview flashcards, written in Serbian and checked against official documentation (Microsoft Learn, MDN, react.dev, PostgreSQL docs, OWASP).

> The UI and the bundled course are in Serbian (Latin script), because the app is built for my own interview preparation. The code, API and data format are in English.

**Stack:** ASP.NET Core 10 (minimal API, EF Core, PostgreSQL) · React 19 + TypeScript 7 + Vite 8 (TanStack Query, React Router) · Docker Compose · xUnit, Testcontainers, Vitest, Playwright

## What it does

- **Status:** level, XP bar, rank, streak, stats (one per area of the pack) with free points to assign.
- **Skill map:** regions as gates with their own rank and completion percentage; chapters marked as cleared, in progress or new.
- **Chapter:** lesson, a "deeper" section, a hands-on exercise as a checklist, interview flashcards and sources. Each step gives XP once.
- **Tests:** options are shuffled on every attempt, and the server grades them. Correct answers never reach the browser before you submit. Wrong answers go to "weak spots".
- **Daily quest:** 3–4 tasks picked from your next steps and sized to your daily goal in minutes. Finishing it gives a free stat point.
- **Penalty quest:** if yesterday's daily quest was not finished, you first review your weak spots. Skipping it breaks the streak. It can be turned off.
- **Boss test:** once every chapter of a region is cleared, you get 20–25 random questions from the whole region. The pass mark is 80% and the reward is +500 XP.
- **Library:** upload a pack as a `.zip`. It is validated before import, and errors are shown per field. You can switch between packs.
- **Settings:** 4 themes, glow, scan lines, reduced motion, daily goal.
- **Accessibility:** real buttons and links, ARIA for tabs, switches and dialogs, visible focus, 44 px touch targets, text contrast ≥ 4.5:1. Every animation falls back to a short fade under `prefers-reduced-motion`.

## Engineering highlights

These are the decisions I would walk through in an interview:

- **Game rules are pure functions.** `Hunter.Core` has no NuGet dependencies, no database and no HTTP. It holds levels, ranks, streaks, grading, and the daily quest, penalty, free point and boss rules, and it is covered by 53 xUnit tests. Endpoints and services only call these rules.
- **XP is an event, not a number.** Total XP, level and streak are computed from `XpEvent` rows, never stored as counters. A unique index on step completion stops the same step from paying twice, even under concurrent requests.
- **Rank comes from completion, not XP.** Rank is based on the percentage of chapters cleared, so it cannot be "farmed" by repeating easy steps.
- **The server is the only source of truth for grading.** `PublicQuestion` has no `Correct` or `Why` fields. Correct answers and explanations come back only in the result of a submission.
- **Packs are untrusted input.** Every pack goes through `PackValidator`, which catches unknown stats, chapters outside the structure, out-of-range answers and sources without links. Markdown is rendered without raw HTML.
- **A plain architecture on purpose.** Requests go endpoint → service → `DbContext`, with no MediatR or AutoMapper. There are two projects (rules + API), a modular monolith that can grow into more layers when needed.
- **DI lifetimes are handled correctly.** The singleton pack catalog creates its own scope instead of capturing a scoped `DbContext` (the captive dependency problem).
- **Typed contract.** `Contracts.cs` and `web/src/api.ts` change together. Minimal API endpoints return `TypedResults` (`Results<Ok<T>, NotFound>`), so the OpenAPI description is accurate.
- **The frontend stays small.** Routes are lazy-loaded (initial JS ~354 kB), and the Markdown renderer is only in the chapter chunk. Server state lives in TanStack Query, and the boot screen is plain HTML/CSS, so it shows before the JS bundle loads.
- **Schema changes go through EF Core migrations,** applied automatically at startup.

## Testing

| Level | Tools | What is covered |
|---|---|---|
| Unit | xUnit (53 tests) | all game rules in `Hunter.Core` |
| Integration | `WebApplicationFactory<Program>` + Testcontainers PostgreSQL (32 tests) | pack import and activation, rejected invalid zip, XP paid once, answers hidden before submit, test pass/fail, daily and penalty quests, free points, boss |
| Frontend unit | Vitest (13 tests) | answer shuffling, count-up animation, boot timing |
| End-to-end | Playwright in real Chrome (15 tests) | full flows: steps and +XP, level up, test gate, daily quest, penalty dialog, boss and region clear, reduced motion |

E2E tests run against a separate Compose project (`hunter-e2e`, port 8099, its own database), so they never touch your local progress.

## Getting started

You only need Docker.

```bash
cp .env.example .env          # optional: a different database password
docker compose up --build
```

Open **http://localhost:8088**. On first start the API creates the database (migrations) and imports every pack in `packs/`.

Development with hot reload (database in Docker, API with `dotnet watch`, frontend with Vite):

```bash
tools/dev.sh                  # API :8080, web http://localhost:5173, database :5433
```

Tests:

```bash
cd api && dotnet test         # unit + integration (needs Docker running)
cd web && npm run build && npm test
tools/e2e.sh                  # Playwright E2E against a fresh instance
```

## Project structure

```
api/
  src/Hunter.Core/          game rules and the pack format (reader, validator); no dependencies
  src/Hunter.Api/           minimal API: Endpoints.cs, Contracts.cs, Services/, Data/ (EF Core, migrations)
  tests/Hunter.Core.Tests/  xUnit tests for the rules
  tests/Hunter.Api.Tests/   integration tests (WebApplicationFactory + Testcontainers)
web/
  src/pages/                Status, Map, Chapter, Test, Boss, Library, Settings
  src/components/           window, system notice, penalty dialog, effects
  src/api.ts                typed client (mirrors Contracts.cs)
  e2e/                      Playwright tests
packs/                      packs imported at startup (one folder = one pack)
content/fullstack-dotnet/   Markdown source of the bundled course
tools/                      content → pack build, dev and E2E scripts
examples/                   a small non-IT example pack (folder and .zip)
```

## Content pack format (`hunter-pack/1`)

A pack is a folder (or a `.zip` of it) with two files:

- **pack.json:** `id`, `title`, `description`, `version`, `passPct`, XP per step, `stats` (e.g. `INT` = basics), and `regions` → `levels` → chapter ids.
- **chapters.json:** each chapter has `id`, `title`, `minutes` and a lesson (`lessonMarkdown`) or an external reference. Optional fields: `deeperMarkdown`, `exercise`, interview `cards`, a `test` (question, options, correct index, explanation) and `sources`.

A new version of a pack replaces its content and keeps your progress, because progress is tied to pack and chapter ids. Start from `examples/primer-filozofija`.

## Roadmap

- ✅ Phase 1: core app (status, map, chapters, tests, library, settings)
- ✅ Phase 2: migrations, integration and E2E tests, daily and penalty quests, free points, boss tests, animations, boot screen
- 🔄 Phase 3: new "system window" UI (done), then user accounts (ASP.NET Core Identity, cookie auth, per-user data via global query filters), spaced-repetition interview arena (Leitner boxes 1/3/7/14 days), timed interview simulation
- ⬜ Phase 4: GitHub Actions CI/CD and deployment to a VPS behind HTTPS

**Current limitation:** the app is single-user and has no login, which is why pack upload has no antiforgery yet. Accounts in phase 3 will add both.
