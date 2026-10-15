# TFSA Investment Teacher

[![tests](https://github.com/alex-wang55/tfsa-advisor/actions/workflows/tests.yml/badge.svg)](https://github.com/alex-wang55/tfsa-advisor/actions/workflows/tests.yml)

An educational stock screener and TFSA planner. It pulls live market data for
TSX + US stocks, scores them on trend/value/quality/income relative to your
own risk profile, and explains its reasoning in plain English — plus TFSA-
specific notes (contribution room, US dividend withholding tax, etc.).

It also has a **practice portfolio**: fund a pretend TFSA with fake money, buy
and sell real TSX/US stocks at live prices (fractional shares, USD converted
at the live USD/CAD rate), and track how your picks perform over time.

**This is an educational tool, not licensed financial or investment advice.**
Scores are a heuristic screening aid based on public market data and simple
rules — always do your own research before investing.

## Running it locally

You need two terminals — one for the API, one for the UI.

**Backend** (FastAPI, Python 3.11+):

```bash
cd backend
python -m venv .venv
./.venv/Scripts/activate   # Windows; use `source .venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Run the test suite with `pytest` from the `backend/` directory.

**Frontend** (React + Vite):

```bash
cd frontend
npm install
npm run dev
```

Then open http://localhost:5173. The frontend expects the API at
`http://127.0.0.1:8000` (see `frontend/src/api/client.ts`).

## Deploying

It's deployed on Vercel as two projects from this repo:

- **API** (root directory `backend`, FastAPI preset): set `ALLOWED_ORIGINS` to the frontend's URL
  (comma-separate several). Vercel's filesystem is read-only except `/tmp`, so also set
  `TFSA_DB_PATH=/tmp/tfsa.db` and `YF_CACHE_DIR=/tmp/yfinance`.
- **Frontend** (root directory `frontend`, Vite preset): set `VITE_API_URL` to the API's URL.
  `frontend/vercel.json` sends every path to `index.html` so client-side routes work on refresh.

Any other host works too: run the API with `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.

The SQLite database lives on the API host's disk, so on hosts with ephemeral storage (Vercel
included) saved data (watchlist, risk profile, TFSA account) resets when the instance recycles.
The practice portfolio isn't affected: its ledger is stored in each visitor's browser
(`localStorage`) and sent to the stateless `/api/paper/*` endpoints for pricing and valuation, so it
survives restarts and every visitor gets their own account.

## What's in here

- `backend/app/analysis/` — data fetching (yfinance), technical indicators,
  fundamentals extraction, the scoring model, and the rule-based explanation
  engine ("the teacher").
- `backend/app/tfsa_rules.py` — TFSA contribution room table and core/
  satellite allocation heuristics.
- `backend/app/paper.py` — practice trading: replays the transaction ledger
  into cash, positions and average-cost basis (in CAD, split-adjusted),
  validates orders, and builds the daily performance history.
- `backend/app/routers/` — the API: stock analysis, screener, TFSA planner,
  risk profile, watchlist, practice trading.
- `frontend/src/pages/` — Dashboard (screener + summaries), Stock Detail,
  Practice Portfolio, TFSA Planner, Risk Profile, Watchlist.
- `frontend/src/practice/` — the browser-side practice ledger.

Data is a single-user SQLite database at `backend/tfsa.db`, created
automatically on first run.

## Notes on the analysis

- The stock universe used by the screener (`backend/app/analysis/universe.py`)
  is a curated starter list, not the whole market — you can still look up any
  individual ticker directly via the search box.
- Scores are heuristic and deterministic (no LLM calls) — the same inputs
  always produce the same score and explanation, so you can reason about why
  a stock scored the way it did.
- The annual TFSA contribution limit table in `tfsa_rules.py` needs a manual
  update whenever the CRA announces a new year's limit.
- Practice orders fill instantly at the latest (possibly slightly delayed)
  Yahoo price, at any time of day. Dividends aren't credited to practice
  accounts yet, so dividend payers' returns are a little understated.
