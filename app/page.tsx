/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, no-loss-of-precision */
"use client";

import {useEffect, useMemo, useState} from "react";

type Trade = {
  strategy: string; date: string; status: string; reason: string; symbol: string; sector: string;
  entryTime: string; entryPrice: number | null; exitTime: string; exitPrice: number | null;
  net: number | null; spy: number | null; breadth?: number | null;
};
type Strategy = {
  id: string; label: string; short: string; color: string; phase: "frozen" | "challenger";
  signal: string; entry: string; exit: string; explanation: string[];
  sessions: number; trades: number; noOps: number; mean: number | null; median: number | null;
  winRate: number | null; compounded: number | null; drawdown: number | null; status: string;
};
type ChartModel = Pick<Strategy, "id" | "short" | "color">;
type EquityPoint = {date: string; values: Record<string, number>};
type DashboardData = {generatedAt: string; headline: string; strategies: Strategy[]; trades: Trade[]; equity: EquityPoint[]};
type ProspectiveStatus = {
  strategy: string; classification: string; state: string; last_session: string | null;
  pending_entries: number; open_positions: number; completed_trades: number; trades_remaining: number;
  calendar_gate_date: string; days_remaining: number; aggregate_results_locked: boolean; errors: string[];
};
type EodDecision = {
  strategy: string; decisionDate: string; date: string; status: "TRADE" | "NO_TRADE";
  positionStatus: "NO_TRADE" | "PENDING_ENTRY" | "HELD" | "SOLD"; reason: string; symbol: string;
  family?: string; targetEntryDate?: string | null; entryDate?: string | null; entryTime?: string | null;
  entryPrice: number | null; currentDate?: string | null; currentPrice: number | null;
  exitDate?: string | null; exitTime?: string | null; exitPrice: number | null; net: number | null;
  sessionsHeld?: number; horizonSessions: number;
};
type EodModel = {
  id: string; label: string; short: string; color: string; family: string; horizon_sessions: number;
  phase: string; signal: string; entry: string; exit: string; explanation: string[];
  sessions: number; trades: number; openPositions: number; noOps: number; mean: number | null;
  median: number | null; winRate: number | null; compounded: number | null; drawdown: number | null;
  status: string; discoveryStatus: string; historicalTrades: number; historicalMeanNetReturn: number;
  historicalProfitFactor: number; historicalCiLower: number; historicalCiUpper: number; holmPvalue: number;
};
type EodData = {generatedAt: string; asOf: string; monitorId: string; paperOnly: boolean; holdoutStatus: string; preregSha256: string; models: EodModel[]; decisions: EodDecision[]; equity: EquityPoint[]};
type ResearchModel = {model: string; label: string; historical_screen: string; deployment_verdict: string; annualized_return: number; max_drawdown: number; ending_10000: number; note: string};
type FailedFamily = {name: string; status: string; tested: string; result: string; why: string};
type ResearchResult = {title: string; conclusion: string; period: string; months: number; price_source: string; universe: string; models: ResearchModel[]; gates: {gate: string; passed: boolean}[]; failed_families: FailedFamily[]; whole_share: {ending_10000: number; trades: number; gross_turnover_dollars: number; sleeves: number}};
type LabModel = Strategy & {group: string; openPositions: number; kind: "intraday" | "eod" | "locked"};

const fallback: DashboardData = {generatedAt: "Awaiting first forward session", headline: "Forward paper validation", strategies: [], trades: [], equity: []};
const pct = (v: number | null, d = 2) => v == null ? "—" : `${v >= 0 ? "+" : ""}${(v * 100).toFixed(d)}%`;
const money = (v: number, d = 0) => new Intl.NumberFormat("en-US", {style: "currency", currency: "USD", maximumFractionDigits: d}).format(v);
const familyLabel = (family?: string) => family?.split("_").map(x => x[0]?.toUpperCase() + x.slice(1)).join(" ") ?? "";

function sirsGroup(s: Strategy) {
  if (s.short === "DMAA") return "Macro";
  if (s.exit.toLowerCase().includes("open")) return "Overnight SIRS";
  return "Same-day SIRS";
}

function FailedFamilyArchive({families}: {families: FailedFamily[]}) {
  return <section className="failed-archive">
    <div className="section-head"><div><p className="eyebrow">RETIRED RESEARCH</p><h2>Models that did not advance</h2></div><span>{families.length} families</span></div>
    <div className="failed-grid">{families.map(f => <article key={f.name}><div className="failed-title"><h3>{f.name}</h3><i>{f.status}</i></div><dl><div><dt>TESTED</dt><dd>{f.tested}</dd></div><div><dt>RESULT</dt><dd>{f.result}</dd></div><div><dt>WHY IT STOPPED</dt><dd>{f.why}</dd></div></dl></article>)}</div>
    <p className="archive-note">These studies are finished. They are not active paper models.</p>
  </section>;
}

function ModelHelp({strategy, onClose}: {strategy: LabModel; onClose: () => void}) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="help-title" onMouseDown={e => e.stopPropagation()}>
      <button className="modal-close" onClick={onClose} aria-label="Close explanation">×</button>
      <p className="eyebrow">{strategy.group.toUpperCase()} · {strategy.phase.toUpperCase()}</p>
      <h2 id="help-title">{strategy.label}</h2>
      <div className="schedule-strip"><span>Signal <b>{strategy.signal}</b></span><span>Entry <b>{strategy.entry}</b></span><span>Exit <b>{strategy.exit}</b></span></div>
      <ul>{strategy.explanation.map(x => <li key={x}>{x}</li>)}</ul>
      <p className="help-note">Paper validation only. Frozen rules. This page cannot place orders.</p>
    </section>
  </div>;
}

function EodHelp({model, onClose}: {model: EodModel; onClose: () => void}) {
  const version = model.id.startsWith("V5_") ? "V5" : "V3";
  const familyRules = model.family === "fundamental_acceleration"
    ? ["Revenue growth is at least 15% versus the same quarter last year.", "Gross margin improves by at least 2 percentage points year over year.", "Quarterly operating cash flow is positive."]
    : model.family === "cash_flow_quality"
      ? ["Quarterly net income is positive.", "Operating cash flow is at least 1.25 times net income.", "Operating cash flow exceeds the same quarter last year and revenue does not decline."]
      : model.family === "operating_leverage"
        ? ["Operating income is positive.", "Revenue does not decline year over year.", "Operating-income growth exceeds revenue growth, or operating income turns positive from a prior loss."]
        : model.family === "deleveraging_repair"
          ? ["Long-term debt falls at least 10% year over year.", "Parent equity is positive.", "The current ratio is at least 1.0."]
          : ["Free cash flow (operating plus investing cash flow) is positive.", "Free cash flow exceeds the same quarter last year.", "Revenue does not decline year over year."];
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="modal eod-help-modal" role="dialog" aria-modal="true" aria-labelledby="eod-help-title" onMouseDown={e => e.stopPropagation()}>
      <button className="modal-close" onClick={onClose} aria-label="Close explanation">×</button>
      <p className="eyebrow">{version} FILING MODEL · {model.discoveryStatus}</p>
      <h2 id="eod-help-title">{model.label}</h2>
      <div className="schedule-strip"><span>Decision <b>Prior close</b></span><span>Entry <b>Next open</b></span><span>Exit <b>Session {model.horizon_sessions} close</b></span></div>
      <h3>What this test looks for</h3>
      <ul>{familyRules.map(rule => <li key={rule}>{rule}</li>)}<li>Prior close must be at least $5 and median 20-session dollar volume at least $5 million.</li></ul>
      <div className="eod-proof">
        <div><small>DISCOVERY TRADES</small><b>{model.historicalTrades.toLocaleString()}</b></div>
        <div><small>MEAN NET</small><b>{pct(model.historicalMeanNetReturn, 3)}</b></div>
        <div><small>PROFIT FACTOR</small><b>{model.historicalProfitFactor.toFixed(3)}</b></div>
        <div><small>95% BLOCK CI</small><b>{pct(model.historicalCiLower, 2)} to {pct(model.historicalCiUpper, 2)}</b></div>
        <div><small>HOLM P</small><b>{model.holmPvalue.toFixed(6)}</b></div>
      </div>
      <div className="banner-note"><b>Status:</b> Passed historical discovery. Sealed holdout is pending until October 27, 2026.</div>
      <a className="pdf-link" href="./docs/V3_EOD_STRATEGY_GUIDE.pdf" target="_blank" rel="noreferrer">Open strategy guide (PDF) ↗</a>
    </section>
  </div>;
}

function EquityChart({equity, strategies, capital}: {equity: EquityPoint[]; strategies: ChartModel[]; capital: number}) {
  const baseline: EquityPoint = {date: "Start", values: Object.fromEntries(strategies.map(s => [s.id, 1]))};
  const points = [baseline, ...equity];
  const values = points.flatMap(p => strategies.map(s => p.values[s.id] ?? 1));
  const min = Math.min(1, ...values), max = Math.max(1, ...values), span = Math.max(.006, max - min);
  const coords = (s: ChartModel) => points.map((p, i) => ({x: i / Math.max(points.length - 1, 1) * 100, y: 94 - ((p.values[s.id] ?? 1) - min) / span * 82}));
  return <article className="equity-card">
    <div className="section-head"><div><p className="eyebrow">PAPER EQUITY</p><h2>Growth from day zero</h2></div><span>Start <b>{money(capital)}</b></span></div>
    <div className="chart-legend">{strategies.map(s => <span key={s.id}><i style={{background: s.color}} />{s.short} {money(capital * (points.at(-1)?.values[s.id] ?? 1))}</span>)}</div>
    <div className="chart-wrap"><svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Paper equity from day zero">
      <line x1="0" y1="12" x2="100" y2="12" /><line x1="0" y1="53" x2="100" y2="53" /><line x1="0" y1="94" x2="100" y2="94" />
      {strategies.map(s => { const c = coords(s); return <g key={s.id}><polyline points={c.map(p => `${p.x},${p.y}`).join(" ")} style={{stroke: s.color}} />{c.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="1.5" style={{fill: s.color}} />)}</g>; })}
    </svg></div>
    <div className="chart-labels"><span>Start · {money(capital)}</span><span>{equity.length ? equity.at(-1)?.date : "Waiting for session 1"}</span></div>
  </article>;
}

function History({strategy, trades}: {strategy: Pick<LabModel, "id" | "label" | "short" | "color">; trades: Trade[]}) {
  return <article className="history-card">
    <div className="section-head"><div><p className="eyebrow" style={{color: strategy.color}}>DECISIONS · {strategy.short}</p><h2>{strategy.label}</h2></div><span>{trades.length} rows</span></div>
    <div className="table">
      <div className="tr th"><span>Date</span><span>Position</span><span>Entry</span><span>Exit</span><span>Status</span><span>Return</span><span>vs SPY</span></div>
      {trades.slice(0, 40).map((t, i) => {
        const position = t.status === "NO_TRADE" ? "NO OP" : t.exitPrice != null ? "SOLD" : "OPEN";
        const relative = t.net != null && t.spy != null ? t.net - t.spy : null;
        return <div className="tr" key={`${t.date}-${i}`}>
          <span data-label="Date">{t.date}</span>
          <span data-label="Position"><b>{t.symbol || "Cash"}</b>{t.sector && <small>{t.sector}</small>}</span>
          <span data-label="Entry">{t.entryPrice != null ? <>{money(t.entryPrice, 2)}<small>{t.entryTime} ET</small></> : "—"}</span>
          <span data-label="Exit">{t.exitPrice != null ? <>{money(t.exitPrice, 2)}<small>{t.exitTime} ET</small></> : "—"}</span>
          <span data-label="Status"><b className={`position-badge ${position.toLowerCase().replace(" ", "-")}`}>{position}</b>{t.reason && <small className="decision-reason">{t.reason}</small>}</span>
          <span data-label="Return" className={t.net == null ? "" : t.net >= 0 ? "up" : "down"}>{pct(t.net, 3)}</span>
          <span data-label="vs SPY">{pct(relative, 3)}</span>
        </div>;
      })}
      {!trades.length && <div className="empty"><b>No forward decisions yet.</b><span>This model will list each paper decision here.</span></div>}
    </div>
  </article>;
}

function ResearchScoreboard({result, capital}: {result: ResearchResult; capital: number}) {
  return <section className="research-section">
    <div className="research-verdict"><div><p className="eyebrow">COMPLETED REPLICATION · {result.period}</p><span className="reject-badge">REJECTED FOR DEPLOYMENT</span><h2>{result.title}</h2><p>{result.conclusion}</p></div><div className="verdict-word">FAIL<small>DO NOT IMPLEMENT</small></div></div>
    <div className="research-summary">
      <div><small>MONTHLY COHORTS</small><strong>{result.months}</strong></div>
      <div><small>PRIMARY</small><strong>{money(capital * 2.6875893203809064)}</strong><span>fractional research curve</span></div>
      <div><small>WHOLE-SHARE</small><strong>{money(capital * (result.whole_share.ending_10000 / 10000))}</strong><span>capital-constrained</span></div>
      <div><small>SPY</small><strong>{money(capital * 2.361617705339653)}</strong><span>same 90 months</span></div>
    </div>
    <div className="gate-list">{result.gates.map(g => <div key={g.gate} className={g.passed ? "gate-pass" : "gate-fail"}><b>{g.passed ? "PASS" : "FAIL"}</b><span>{g.gate}</span></div>)}</div>
    <article className="scoreboard-card">
      <div className="section-head"><div><p className="eyebrow">EVERY TESTED SCENARIO</p><h2>What {money(capital)} would become</h2></div><span>Costs and dividends included</span></div>
      <div className="research-table">
        <div className="rr rr-head"><span>Model</span><span>History</span><span>Deploy</span><span>Annual</span><span>Drawdown</span><span>Ending value</span></div>
        {result.models.map(m => <div className="rr" key={m.model}><span data-label="Model"><b>{m.label}</b><small>{m.note}</small></span><span data-label="History"><i className={`result-pill ${m.historical_screen.toLowerCase()}`}>{m.historical_screen}</i></span><span data-label="Deploy"><i className={`result-pill ${m.deployment_verdict.toLowerCase()}`}>{m.deployment_verdict}</i></span><span data-label="Annual">{pct(m.annualized_return)}</span><span data-label="Drawdown" className="down">{pct(m.max_drawdown)}</span><span data-label="Ending value"><b>{money(capital * (m.ending_10000 / 10000))}</b></span></div>)}
      </div>
    </article>
    <p className="method-note"><b>Method:</b> {result.price_source}. {result.universe} No model was activated.</p>
  </section>;
}

export default function Home() {
  const [data, setData] = useState(fallback);
  const [capital, setCapital] = useState(10000);
  const [help, setHelp] = useState<LabModel | null>(null);
  const [eodHelp, setEodHelp] = useState<EodModel | null>(null);
  const [prospective, setProspective] = useState<ProspectiveStatus | null>(null);
  const [eod, setEod] = useState<EodData | null>(null);
  const [v5Eod, setV5Eod] = useState<EodData | null>(null);
  const [research, setResearch] = useState<ResearchResult | null>(null);
  const [tab, setTab] = useState<"lab" | "failed">("lab");
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  useEffect(() => { fetch("./data/dashboard.json", {cache: "no-store"}).then(r => r.ok ? r.json() : fallback).then(setData).catch(() => setData(fallback)); }, []);
  useEffect(() => { fetch("./data/k_prospective_status.json", {cache: "no-store"}).then(r => r.ok ? r.json() : null).then(setProspective).catch(() => setProspective(null)); }, []);
  useEffect(() => { fetch("./data/v3-eod.json", {cache: "no-store"}).then(r => r.ok ? r.json() : null).then(setEod).catch(() => setEod(null)); }, []);
  useEffect(() => { fetch("./data/v5-eod.json", {cache: "no-store"}).then(r => r.ok ? r.json() : null).then(setV5Eod).catch(() => setV5Eod(null)); }, []);
  useEffect(() => { fetch("./data/momentum-validation.json", {cache: "no-store"}).then(r => r.ok ? r.json() : null).then(setResearch).catch(() => setResearch(null)); }, []);

  const eodModels = useMemo(() => [...(eod?.models ?? []), ...(v5Eod?.models ?? [])], [eod, v5Eod]);
  const eodDecisions = useMemo(() => [...(eod?.decisions ?? []), ...(v5Eod?.decisions ?? [])], [eod, v5Eod]);

  const lockedK: LabModel | null = prospective ? {
    id: "K_CONFIRMED_ABNORMAL_VOLUME_RECLAIM",
    label: "K · Confirmed reclaim",
    short: "K",
    color: "#a98bff",
    phase: "frozen",
    signal: "Intraday reclaim",
    entry: "Paper only",
    exit: "Locked until gates",
    explanation: ["Forward-only paper monitor.", "Aggregate returns stay hidden until 100 completed trades and the calendar gate."],
    sessions: 0,
    trades: prospective.completed_trades,
    noOps: 0,
    mean: null,
    median: null,
    winRate: null,
    compounded: null,
    drawdown: null,
    status: prospective.aggregate_results_locked ? "Results locked" : prospective.state,
    group: "Locked monitor",
    openPositions: prospective.open_positions,
    kind: "locked",
  } : null;

  const labModels = useMemo<LabModel[]>(() => {
    const intraday = data.strategies.map(s => ({...s, group: sirsGroup(s), openPositions: 0, kind: "intraday" as const}));
    const filings = eodModels.map(m => ({
      id: m.id, label: m.label, short: m.short, color: m.color,
      phase: "frozen" as const,
      signal: "Prior close", entry: "Next open", exit: `${m.horizon_sessions}-session close`,
      explanation: m.explanation, sessions: m.sessions, trades: m.trades, noOps: m.noOps,
      mean: m.mean, median: m.median, winRate: m.winRate, compounded: m.compounded, drawdown: m.drawdown,
      status: m.status, group: m.id.startsWith("V5_") ? "V5 filings" : "V3 filings",
      openPositions: m.openPositions, kind: "eod" as const,
    }));
    return [...intraday, ...(lockedK ? [lockedK] : []), ...filings];
  }, [data.strategies, eodModels, lockedK]);

  const visible = useMemo(() => selectedModel ? labModels.filter(m => m.id === selectedModel) : labModels, [labModels, selectedModel]);
  const focused = labModels.find(m => m.id === selectedModel) ?? null;
  const eodById = useMemo(() => Object.fromEntries(eodModels.map(m => [m.id, m])), [eodModels]);

  const histories = useMemo(() => {
    const byId: Record<string, Trade[]> = Object.fromEntries(data.strategies.map(s => [s.id, data.trades.filter(t => t.strategy === s.id)]));
    for (const m of eodModels) {
      byId[m.id] = eodDecisions.filter(d => d.strategy === m.id).map(d => ({
        strategy: d.strategy, date: d.decisionDate, status: d.status, reason: d.reason, symbol: d.symbol,
        sector: familyLabel(d.family), entryTime: d.entryTime ?? "", entryPrice: d.entryPrice,
        exitTime: d.exitTime ?? "", exitPrice: d.exitPrice, net: d.net, spy: null,
      }));
    }
    return byId;
  }, [data, eodDecisions, eodModels]);

  const chartModels = useMemo<ChartModel[]>(() => visible.filter(m => m.kind !== "locked"), [visible]);
  const mergedEquity = useMemo<EquityPoint[]>(() => {
    const series = [data.equity, eod?.equity ?? [], v5Eod?.equity ?? []];
    const dates = [...new Set(series.flatMap(x => x.map(p => p.date)))].sort();
    const latest = (points: EquityPoint[], date: string) => { let values: Record<string, number> = {}; for (const point of points) if (point.date <= date) values = point.values; return values; };
    return dates.map(date => ({date, values: Object.assign({}, ...series.map(points => latest(points, date)))}));
  }, [data, eod, v5Eod]);

  const ranked = visible.filter(s => s.trades > 0 && s.compounded != null).sort((a, b) => (b.compounded ?? -Infinity) - (a.compounded ?? -Infinity));
  const winner = ranked[0];
  const groups = [...new Set(labModels.map(m => m.group))];

  return <main className={tab === "failed" ? "failed-view" : "lab-view"}>
    <header className="topbar">
      <div className="brand"><span className="brandmark">A</span><div><b>Atlas Signal Lab</b><small>One paper-model board</small></div></div>
      <nav className="view-tabs" aria-label="Dashboard sections">
        <button className={tab === "lab" ? "active" : ""} onClick={() => setTab("lab")}>Paper lab</button>
        <button className={tab === "failed" ? "active" : ""} onClick={() => setTab("failed")}>Retired research <b>{research?.failed_families?.length ?? 0}</b></button>
      </nav>
      <div className="status"><span />Paper only · no live orders</div>
    </header>

    {research && tab === "failed" && <><ResearchScoreboard result={research} capital={capital} /><FailedFamilyArchive families={research.failed_families ?? []} /></>}

    <section className="hero">
      <div>
        <p className="eyebrow">ALL ACTIVE MODELS</p>
        <h1>One table.<br /><em>One selected model.</em></h1>
        <p className="lede">Every live paper model is listed below: V1–V2, C1–C6, DMAA, K, and the filing tests FA / CFQ / OL / DR / FCF. Click a row to see only that model’s card, chart, and decisions.</p>
      </div>
      <div className="next-card">
        <div className="next-head"><span>{focused ? "SELECTED" : "HOW TO READ THIS"}</span><b>ET</b></div>
        {focused ? <div className="decision-times"><b>{focused.short}</b><span>{focused.signal} → {focused.entry} → {focused.exit}</span></div> : <ul className="read-guide"><li><b>Return</b> is completed paper P&amp;L, not a live account.</li><li><b>Frozen</b> means rules cannot change during collection.</li><li><b>K</b> hides performance until its gates are met.</li><li>Filing models enter next open and hold 20 or 60 sessions.</li></ul>}
        <p>{focused ? focused.label : "Same-day SIRS exit near 15:55. Overnight SIRS exit at the next open."}</p>
        <div className="line"><span>Latest refresh</span><b>{data.generatedAt}</b></div>
      </div>
    </section>

    <section className="catalog-card">
      <div className="section-head">
        <div><p className="eyebrow">MODEL CATALOG</p><h2>{focused ? focused.short : `${labModels.length} paper models`}</h2></div>
        <div className="catalog-tools">
          <label>Starting capital<div className="money-input"><span>$</span><input aria-label="Starting capital" type="number" min="100" step="100" value={capital} onChange={e => { const v = Number(e.target.value); if (Number.isFinite(v)) setCapital(Math.max(0, v)); }} onBlur={() => setCapital(Math.max(100, capital || 10000))} /></div></label>
          <button className={!selectedModel ? "active" : ""} onClick={() => setSelectedModel(null)}>Show all</button>
        </div>
      </div>
      <div className="catalog-table">
        <div className="cat th"><span>Model</span><span>Family</span><span>Hold</span><span>Role</span><span>Trades</span><span>Open</span><span>Return</span><span>Status</span></div>
        {labModels.map(m => <button type="button" key={m.id} className={`cat${selectedModel === m.id ? " active" : ""}`} style={{"--accent": m.color} as React.CSSProperties} onClick={() => setSelectedModel(selectedModel === m.id ? null : m.id)}>
          <span data-label="Model"><b>{m.short}</b><small>{m.label}</small></span>
          <span data-label="Family">{m.group}</span>
          <span data-label="Hold">{m.exit}</span>
          <span data-label="Role">{m.phase}</span>
          <span data-label="Trades">{m.trades}</span>
          <span data-label="Open">{m.openPositions}</span>
          <span data-label="Return" className={m.compounded == null ? "" : m.compounded >= 0 ? "up" : "down"}>{m.kind === "locked" ? "Locked" : pct(m.compounded)}</span>
          <span data-label="Status">{m.status}</span>
        </button>)}
      </div>
      <p className="catalog-note">{winner ? `Current completed-trade leader: ${winner.short} at ${pct(winner.compounded)} (${money(capital * (1 + (winner.compounded ?? 0)))} from ${money(capital)}). Leadership can change.` : "No completed paper trade yet, so there is no leader."}</p>
    </section>

    {focused?.kind === "locked" && prospective && <section className="prospective-card">
      <div className="prospective-head"><div><p className="eyebrow">LOCKED MONITOR</p><h2>K · Confirmed reclaim</h2><span className="mixed-badge">{prospective.classification.replaceAll("_", " ")}</span></div><div className="lock-badge">Aggregate results locked</div></div>
      <p className="prospective-copy">Returns stay hidden until 100 completed trades and the calendar gate. This monitor cannot backfill earlier sessions.</p>
      <div className="ops-grid">
        <div><small>STATE</small><strong>{prospective.state.replaceAll("_", " ")}</strong></div>
        <div><small>COMPLETED</small><strong>{prospective.completed_trades} / 100</strong></div>
        <div><small>OPEN</small><strong>{prospective.open_positions}</strong></div>
        <div><small>PENDING</small><strong>{prospective.pending_entries}</strong></div>
        <div><small>TRADES LEFT</small><strong>{prospective.trades_remaining}</strong></div>
        <div><small>TIME LEFT</small><strong>{prospective.days_remaining} days</strong></div>
      </div>
      <div className="gate-track"><span style={{width: `${Math.min(100, prospective.completed_trades)}%`}} /></div>
      <div className="prospective-foot"><span>Calendar gate: <b>{prospective.calendar_gate_date}</b></span><span>Last session: <b>{prospective.last_session ?? "Waiting"}</b></span></div>
    </section>}

    {!!visible.filter(m => m.kind !== "locked").length && <section className="model-group">
      <div className="group-head"><p className="eyebrow">{focused ? "SELECTED MODEL" : "MODEL CARDS"}</p><span>{focused ? "Click the row again to return to the full list" : `${groups.length} families · cards match the table`}</span></div>
      <div className={`models ${visible.length > 4 && !focused ? "challengers" : ""}`}>
        {visible.filter(m => m.kind !== "locked").map(s => <article key={s.id} className="model" style={{"--accent": s.color} as React.CSSProperties}>
          <div className="model-title"><span /><div><small>{s.short} · {s.group}</small><h3>{s.label}</h3></div><button className="help-button" onClick={() => { const eodModel = eodById[s.id]; if (eodModel) setEodHelp(eodModel); else setHelp(s); }} aria-label={`Explain ${s.label}`}>?</button></div>
          <div className="model-status"><b>{s.status}</b><span>{s.sessions} sessions</span></div>
          <div className="schedule"><span>{s.signal}<small>signal</small></span><span>{s.entry}<small>entry</small></span><span>{s.exit}<small>exit</small></span></div>
          <div className="metrics">
            <div><small>TRADES</small><strong>{s.trades}</strong></div>
            <div className="no-op-metric"><small>NO OPS</small><strong>{s.noOps}</strong></div>
            <div><small>OPEN</small><strong>{s.openPositions}</strong></div>
            <div><small>AVG</small><strong>{pct(s.mean, 3)}</strong></div>
            <div><small>RETURN</small><strong>{pct(s.compounded)}</strong></div>
          </div>
        </article>)}
      </div>
    </section>}

    {!!chartModels.length && <section className="allocation-section"><EquityChart equity={mergedEquity} strategies={chartModels} capital={capital} /></section>}

    <section className="histories">
      {(focused ? visible : []).filter(m => m.kind !== "locked").map(s => <History key={s.id} strategy={s} trades={histories[s.id] || []} />)}
      {!focused && <p className="catalog-note">Select a model in the table to open its full decision log. The table is the overview; the log is the audit trail.</p>}
    </section>
    <footer><b>Paper validation only.</b> Historical research is not prospective proof. This interface is read-only and cannot place orders.</footer>
    {help && <ModelHelp strategy={help} onClose={() => setHelp(null)} />}
    {eodHelp && <EodHelp model={eodHelp} onClose={() => setEodHelp(null)} />}
  </main>;
}
