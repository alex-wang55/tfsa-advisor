# TFSA Investment Teacher

An educational stock screener and TFSA planner. It pulls live market data for
TSX + US stocks, scores them on trend/value/quality/income relative to your
own risk profile, and explains its reasoning in plain English — plus TFSA-
specific notes (contribution room, US dividend withholding tax, etc.).

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

## What's in here

- `backend/app/analysis/` — data fetching (yfinance), technical indicators,
  fundamentals extraction, the scoring model, and the rule-based explanation
  engine ("the teacher").
- `backend/app/tfsa_rules.py` — TFSA contribution room table and core/
  satellite allocation heuristics.
- `backend/app/routers/` — the API: stock analysis, screener, TFSA planner,
  risk profile, watchlist.
- `frontend/src/pages/` — Dashboard (screener + search), Stock Detail,
  TFSA Planner, Risk Profile, Watchlist.

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
