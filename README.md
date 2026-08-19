# Atlas Signal Lab

Read-only GitHub Pages dashboard for forward paper validation.

The page is one catalog of every active paper model:

- Same-day SIRS: V1, V2, C1, C4
- Overnight SIRS: C2, C3, C5, C6
- Macro: DMAA
- Locked monitor: K
- V3 filings: FA20, FA60, CFQ20, CFQ60
- V5 filings: OL20, OL60, DR20, DR60, FCF20, FCF60

Click a row to inspect one model. Retired historical studies live on the second tab.

The public repository contains only sanitized dashboard data. It contains no market-data credentials, broker credentials, raw market-data cache, or live order controls.

The dashboard is paper validation only and is not investment advice.

Paper jobs are scheduled from the research repo with:

```
python -m intraday_long_only.research.paper_monitors --publish --push
```
