# Shot on Stats — Demo Website PRD (for Replit AI)

**Purpose of this document:** This is a build spec for Replit's AI to generate a working demo website. The demo's primary job is to **visually demonstrate to a classroom audience how the core prediction simulation actually works** — not to be the full production product. Every other feature exists to support that demonstration and to answer the presentation requirements below.

---

## 1. Problem Statement

**Problem:** Casual and moderately engaged soccer fans want a data-driven read on upcoming matches, but the options available today are a bad fit for them. Pundit "expert picks" (TV, YouTube, blogs) give a confident-sounding opinion with no visible methodology — there's no way to check *why* the pick was made. On the other end, raw statistical tools (Opta feeds, advanced analytics sites) require stats literacy most casual fans don't have and don't want to build.

**Target user:** A Premier League fan who follows a team casually — watches most weeks, has opinions, but doesn't have the time or background to build their own statistical model or interpret raw Expected Goals (xG) tables.

**Evidence the problem exists:**
- Fantasy Premier League has over 11 million active users worldwide, showing large-scale appetite for stats-informed engagement with matches — but FPL itself gives raw stats, not predictions or explanations.
- Outlets like the BBC's "Opta Supercomputer" predictions and pre-match "expert predicts" segments are recurring, popular content formats — demonstrating demand for match predictions specifically — but they publish a conclusion without showing the underlying calculation.
- Sports betting odds function as an implicit prediction market, but odds reflect a bookmaker's margin and incentives, not a transparent, bettor-independent statistical model.

---

## 2. Solution Description (in terms of user actions)

1. **User visits the site** and sees a list of the week's upcoming Premier League fixtures.
2. **User selects a match** and sees: each team's Elo rating, a win/draw/loss probability bar, and a predicted scoreline.
3. **User watches the simulation happen** — a live view showing the Monte Carlo trials running (not just the final number), so the process, not just the output, is visible.
4. **User reads a plain-language AI explanation** of why the model favors one side, generated from the computed stats (not from the AI's own opinion).
5. **User views player-level projections** for both squads (goals, shots, cards, etc.), each with the same "here's how many simulated trials produced this number" transparency.
6. **User opens the sandbox** and types in their own hypothetical team ratings to run a custom "what-if" simulation instantly, with an optional AI explanation on demand.
7. **Free users** get 3 matches/week of full detail (ads shown); this cap is not required for the classroom demo but should exist in the code as a toggleable flag.

---

## 3. Data Plan

**What's collected:**
- Public sports data only: team names, Elo ratings, fixture schedules, season stats, and player statistics, pulled from API-Football and ClubElo.
- Minimal account data if login is implemented: email and premium status. No personal data beyond that is collected.

**What's stored (MySQL):**
- `teams`, `players`, `player_season_stats`, `fixtures`, `predictions`, `player_predictions` — all public sports data plus the model's own computed outputs.
- `calibration_log` — a record of any changes made to the model's internal constants, for auditability.
- `users` — email, premium flag only (for the demo, this table can be stubbed or skipped entirely).

**How it's used:**
- Solely to compute and display predictions. Not sold, not shared with third parties, not used to target ads to individuals (any ads shown would be standard contextual placements, not personalized based on user data).
- Past predictions are retained permanently to build a visible, honest accuracy track record over time.

---

## 4. AI Feature

**Specific role:** The AI **never generates the prediction**. A statistical model (Elo ratings converted to expected goals, then simulated via a Poisson-based Monte Carlo process — 10,000 trials) produces every number shown. The AI's only job is to **read that finished output and write a plain-language explanation of it** — e.g., "Team A is favored because of a higher Elo rating and stronger recent form."

**Implementation:**
- AI calls are made via the **OpenRouter API** (one key, model-agnostic — e.g., request `anthropic/claude-3.5-haiku` or a similarly small/cheap model for cost efficiency).
- A **second, independent AI call** reviews each generated explanation against the underlying stats before it's shown, checking for factual consistency. Using a different model for review than for generation reduces the chance of a shared blind spot.
- The same explanation pipeline is reused for the sandbox's custom "what-if" matches, but gated behind an explicit user click (not automatic) to control API usage.

---

## 5. Monetization

**Primary model: Freemium subscription**
| Tier | Price | Access |
|---|---|---|
| Free | $0 | 3 matches/week, full detail, ad-supported |
| Premium | **$4.99/month** | Every match, every covered league, ad-free |

**Secondary model:** Contextual display advertising on the free tier (e.g., Google AdSense), excluding gambling/betting ad categories to stay consistent with the product's positioning as a stats tool, not a betting facilitator.

*(Pricing is a placeholder for the pitch — final pricing would be validated with real users before launch.)*

---

## 6. Public Usability

The product is a **public website**, reachable at a normal URL with no login required to browse free-tier predictions — account creation is only needed to unlock the Premium tier. It works on desktop and mobile browsers (responsive layout). Suggested low-cost hosting: static frontend on Vercel/Netlify, backend API on Railway/Render, MySQL on a free-tier host (Railway, Clever Cloud, or PlanetScale) — all viable within a $0 school-project budget.

---

## 7. Competition

1. **"Supercomputer" predictions from sports media outlets** (e.g., BBC's Opta-powered season predictor) — publish a confident conclusion but don't show the underlying calculation or let a user probe "what if" scenarios.
2. **Sports betting odds** (implied probability from bookmakers) — function as a prediction, but reflect bookmaker margin and risk management, not a transparent, betting-independent statistical model, and are entangled with gambling rather than being a pure information product.

---

## 8. The Ask

- Feedback on whether the $4.99/month price point and the 3-match free cap feel right to an outside audience.
- Anyone on the team (or in the class) interested in contributing frontend, backend, or data/stats work — this is currently unassigned.
- Guidance on which single league/dataset to focus the live demo on for the clearest classroom presentation.
- Any school-provided resources (cloud credits, hosting accounts) that could extend the project past the free tiers already assumed here.

---

## 9. What Replit Should Actually Build (Demo Scope)

This is the concrete build target — **prioritize this section above all else**. The goal is a **single-page interactive demo** a presenter can drive live in front of a class.

### Core requirement: show the simulation running, not just its result
Build a page with:
1. **Two adjustable inputs**: Team A Elo, Team B Elo (sliders or number inputs), plus a fixed home-advantage constant.
2. **A "Run simulation" button** that, on click:
   - Converts the Elo difference into expected goals (λ) for each team using: `expected_goal_diff = (eloA - eloB + homeAdv) / C`, with `C ≈ 200` and a league-average baseline of ~1.3 goals/team.
   - Runs a **visible, animated Monte Carlo loop** of 10,000 trials, sampling from a Poisson distribution for each team's goal count per trial (use Knuth's algorithm: multiply uniform random draws until the running product falls below `e^-λ`).
   - Updates a **live bar chart** of the goal-count distribution (0, 1, 2, 3, 4, 5+) for each team as trials accumulate, so the audience watches the distribution "settle" in real time rather than just seeing a final static number.
   - Displays a **live-updating win/draw/loss bar** and each team's running average goals as the trial count climbs.
3. **A final summary** once all 10,000 trials complete: predicted scoreline, win/draw/loss percentages, and each team's average simulated goals.

### Secondary features (build if time allows, in this priority order)
1. A static match page showing one real example match (team names, Elo, the same simulation output, and one written AI explanation of the result).
2. A simple player projection table (2–3 example players with projected goals/shots) to show the same method extends beyond team-level goals.
3. The custom sandbox described in Section 2, item 6 — this can literally reuse the same core simulation component built for the main demo.
4. A one-sentence AI explanation call (via OpenRouter) wired to a button, to demonstrate the AI layer without needing to build the full generation+review pipeline for the demo.

### Explicitly out of scope for this demo
- User accounts, login, or the Premium paywall (mention them in the pitch narration instead of building them).
- The daily data sync job / real API-Football or ClubElo integration — hardcode a couple of realistic example teams and Elo ratings instead.
- Ads, monetization logic, or the calibration/backtesting system.

**Tech stack:** React (Vite) frontend, all simulation logic in a plain JS module so it's easy to read and explain live; a small Node/Express backend only if the AI explanation button is included (to keep the API key server-side). No database required for the demo — everything can run in memory.
