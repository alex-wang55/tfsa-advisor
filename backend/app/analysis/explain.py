"""Rule-based, deterministic 'teacher' explanations. Each rule inspects the
computed metrics and, if it applies, contributes one plain-English bullet
that names the metric, says what it means, and (where relevant) flags the
limitation of relying on it alone."""

from app.schemas import ExplanationBullet, StockMetrics

Bullet = ExplanationBullet


def _bullets_trend(m: StockMetrics) -> list[Bullet]:
    out = []
    if m.price is not None and m.sma200 is not None:
        if m.price > m.sma200:
            out.append(Bullet(
                text=(
                    f"The price (${m.price:.2f}) is above its 200-day average "
                    f"(${m.sma200:.2f}), which usually signals a longer-term uptrend."
                ),
                tone="positive",
            ))
        else:
            out.append(Bullet(
                text=(
                    f"The price (${m.price:.2f}) is below its 200-day average "
                    f"(${m.sma200:.2f}) — the longer-term trend is weak or down."
                ),
                tone="caution",
            ))
    if m.sma50 is not None and m.sma200 is not None:
        if m.sma50 > m.sma200:
            out.append(Bullet(
                text=(
                    "The 50-day average is above the 200-day average (a 'golden cross' "
                    "pattern) — short-term momentum is currently outpacing the long-term trend."
                ),
                tone="positive",
            ))
        else:
            out.append(Bullet(
                text=(
                    "The 50-day average is below the 200-day average (a 'death cross' "
                    "pattern) — short-term momentum is currently lagging the long-term trend."
                ),
                tone="caution",
            ))
    if m.rsi14 is not None:
        if m.rsi14 > 70:
            out.append(Bullet(
                text=(
                    f"RSI is {m.rsi14:.0f}, in 'overbought' territory. This can mean the "
                    "stock has run up quickly — but in a strong trend RSI can stay high for "
                    "a long time, so this alone isn't a sell signal."
                ),
                tone="caution",
            ))
        elif m.rsi14 < 30:
            out.append(Bullet(
                text=(
                    f"RSI is {m.rsi14:.0f}, in 'oversold' territory, which can mean the "
                    "stock has dropped sharply. This can precede a bounce, but it can also "
                    "mean the market has priced in real bad news — check why before assuming a discount."
                ),
                tone="caution",
            ))
    if m.momentum_12m is not None:
        direction = "gained" if m.momentum_12m >= 0 else "lost"
        out.append(Bullet(
            text=f"Over the past 12 months the price has {direction} {abs(m.momentum_12m):.1f}%.",
            tone="positive" if m.momentum_12m > 0 else "caution",
        ))
    return out


def _bullets_value(m: StockMetrics) -> list[Bullet]:
    out = []
    if m.pe_trailing is not None and m.pe_trailing > 0:
        if m.pe_trailing < 15:
            tone = "positive"
            note = "relatively low — the market is paying less per dollar of past earnings"
        elif m.pe_trailing > 30:
            tone = "caution"
            note = "relatively high — the market is pricing in significant future growth, which raises the risk if growth disappoints"
        else:
            tone = "neutral"
            note = "in a moderate range"
        out.append(Bullet(
            text=f"Trailing P/E is {m.pe_trailing:.1f}, which is {note}.",
            tone=tone,
        ))
    elif m.pe_trailing is not None and m.pe_trailing <= 0:
        out.append(Bullet(
            text="Trailing P/E is negative, meaning the company reported a net loss over the last 12 months.",
            tone="caution",
        ))
    return out


def _bullets_quality(m: StockMetrics) -> list[Bullet]:
    out = []
    if m.debt_to_equity is not None:
        if m.debt_to_equity > 150:
            out.append(Bullet(
                text=(
                    f"Debt-to-equity is {m.debt_to_equity:.0f}%, which is on the higher side — "
                    "the company relies more heavily on debt financing, which can amplify losses in a downturn."
                ),
                tone="caution",
            ))
        else:
            out.append(Bullet(
                text=f"Debt-to-equity is {m.debt_to_equity:.0f}%, a manageable level of leverage.",
                tone="positive",
            ))
    if m.beta is not None:
        comparison = "more than" if m.beta > 1.1 else "less than" if m.beta < 0.9 else "about as much as"
        out.append(Bullet(
            text=(
                f"Beta is {m.beta:.2f} — the stock tends to move {comparison} "
                "the broader market. Higher beta means bigger swings in both directions."
            ),
            tone="neutral",
        ))
    if m.volatility_annualized is not None and m.volatility_annualized > 45:
        out.append(Bullet(
            text=(
                f"Annualized volatility is {m.volatility_annualized:.0f}%, which is high — "
                "expect large price swings, which matters a lot if you might need this money soon."
            ),
            tone="caution",
        ))
    return out


def _bullets_income(m: StockMetrics) -> list[Bullet]:
    out = []
    if m.dividend_yield is not None and m.dividend_yield > 0:
        out.append(Bullet(
            text=f"Dividend yield is {m.dividend_yield:.2f}%.",
            tone="positive" if m.dividend_yield >= 2 else "neutral",
        ))
        if m.payout_ratio is not None and m.payout_ratio > 0.9:
            out.append(Bullet(
                text=(
                    f"Payout ratio is {m.payout_ratio * 100:.0f}% of earnings, which is quite "
                    "high and could mean the dividend is at risk if earnings dip."
                ),
                tone="caution",
            ))
    else:
        out.append(Bullet(
            text="This stock does not currently pay a dividend — any return depends entirely on price appreciation.",
            tone="neutral",
        ))
    return out


def build_explanations(m: StockMetrics) -> list[Bullet]:
    return _bullets_trend(m) + _bullets_value(m) + _bullets_quality(m) + _bullets_income(m)


def build_tfsa_notes(m: StockMetrics) -> list[Bullet]:
    notes = []
    if m.exchange == "US" and m.dividend_yield is not None and m.dividend_yield > 0:
        notes.append(Bullet(
            text=(
                "This is a US-listed stock: dividends paid into a TFSA are subject to a "
                "15% US withholding tax that, unlike in an RRSP, cannot be recovered or "
                "credited back. That effectively shaves a bit off the dividend yield shown above."
            ),
            tone="caution",
        ))
    if m.volatility_annualized is not None and m.volatility_annualized > 45:
        notes.append(Bullet(
            text=(
                "Capital losses inside a TFSA cannot be claimed against other gains at tax "
                "time (unlike in a taxable account). That makes a high-volatility individual "
                "stock like this a bigger risk to hold as a large share of a TFSA."
            ),
            tone="caution",
        ))
    notes.append(Bullet(
        text=(
            "All TFSA growth and withdrawals are tax-free — the main risk with individual "
            "stocks isn't tax, it's concentration: a single stock can swing far more than a "
            "diversified fund."
        ),
        tone="neutral",
    ))
    return notes
