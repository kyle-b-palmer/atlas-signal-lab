"use client";

import { useEffect, useMemo, useState } from "react";

type Trade = { strategy:string; date:string; status:string; symbol:string; sector:string; entryTime:string; entryPrice:number|null; exitTime:string; exitPrice:number|null; net:number; spy:number; breadth?:number|null };
type DashboardData = { generatedAt:string; headline:string; strategies:Array<{id:string;label:string;color:string;sessions:number;trades:number;mean:number|null;median:number|null;winRate:number|null;compounded:number|null;drawdown:number|null;status:string}>; trades:Trade[]; equity:Array<{date:string;v1:number;v2:number}> };

const fallback:DashboardData={generatedAt:"Awaiting first forward session",headline:"Paper validation begins August 13, 2026",strategies:[
 {id:"SIRS_20260812_v1",label:"V1 · Relative Strength",color:"#49d9a0",sessions:0,trades:0,mean:null,median:null,winRate:null,compounded:null,drawdown:null,status:"Frozen · waiting"},
 {id:"SIRS_20260812_v2_BREADTH",label:"V2 · Breadth Gated",color:"#a98bff",sessions:0,trades:0,mean:null,median:null,winRate:null,compounded:null,drawdown:null,status:"Frozen · waiting"}
],trades:[],equity:[]};

const pct=(v:number|null,d=2)=>v==null?"—":`${v>=0?"+":""}${(v*100).toFixed(d)}%`;
const money=(v:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(v);

export default function Home(){
 const [data,setData]=useState(fallback); const [capital,setCapital]=useState(10000); const [filter,setFilter]=useState("ALL");
 useEffect(()=>{fetch("./data/dashboard.json",{cache:"no-store"}).then(r=>r.ok?r.json():fallback).then(setData).catch(()=>setData(fallback))},[]);
 const visible=useMemo(()=>data.trades.filter(t=>filter==="ALL"||t.strategy===filter),[data,filter]);
 const last=visible[0]; const deployed=last?.entryPrice?capital:0; const shares=last?.entryPrice?deployed/last.entryPrice:0; const current=last?.entryPrice?deployed*(1+last.net):0;
 return <main>
  <header className="topbar"><div className="brand"><span className="brandmark">A</span><div><b>Atlas Signal Lab</b><small>Forward paper validation</small></div></div><div className="status"><span></span> Models frozen · Python tracked</div></header>
  <section className="hero">
   <div><p className="eyebrow">SIRS / SYSTEM STATUS</p><h1>One signal.<br/><em>Only when it earns the trade.</em></h1><p className="lede">A transparent view of two frozen intraday strategies. No live orders. No hidden changes. Every trade—and every decision to stay in cash—is recorded.</p></div>
   <div className="next-card"><div className="next-head"><span>NEXT DECISION</span><b>11:00 ET</b></div><div className="clock">Weekdays</div><p>Signal calculated at 11:00. Modeled entry at the next five-minute open. Exit near 15:55 ET.</p><div className="line"><span>Latest refresh</span><b>{data.generatedAt}</b></div></div>
  </section>
  <section className="models">
   {data.strategies.map(s=><article className="model" key={s.id} style={{"--accent":s.color} as React.CSSProperties}>
    <div className="model-title"><span></span><div><small>{s.id}</small><h2>{s.label}</h2></div><b>{s.status}</b></div>
    <div className="metrics"><div><small>TRADES</small><strong>{s.trades}</strong></div><div><small>AVG / TRADE</small><strong>{pct(s.mean,3)}</strong></div><div><small>COMPOUNDED</small><strong>{pct(s.compounded)}</strong></div><div><small>MAX DRAWDOWN</small><strong>{pct(s.drawdown)}</strong></div></div>
    <div className="progress"><span style={{width:`${Math.min(100,s.trades/60*100)}%`}}></span></div><p>{s.trades<30?`${30-s.trades} trades until first review`:`${Math.max(0,60-s.trades)} trades until preferred review`}</p>
   </article>)}
  </section>
  <section className="workspace">
   <article className="ticket"><div className="section-head"><div><p className="eyebrow">LATEST PAPER DECISION</p><h2>{last?`${last.status}: ${last.symbol||"Cash"}`:"Awaiting first unseen session"}</h2></div><select value={filter} onChange={e=>setFilter(e.target.value)} aria-label="Filter strategy"><option value="ALL">Both strategies</option>{data.strategies.map(s=><option key={s.id}>{s.id}</option>)}</select></div>
    {last?<><div className="trade-grid"><div><small>DATE</small><b>{last.date}</b></div><div><small>ENTRY</small><b>{last.entryTime||"—"} · {last.entryPrice?money(last.entryPrice):"—"}</b></div><div><small>EXIT</small><b>{last.exitTime||"—"} · {last.exitPrice?money(last.exitPrice):"—"}</b></div><div><small>NET RETURN</small><b className={last.net>=0?"up":"down"}>{pct(last.net,3)}</b></div></div></>:<div className="empty">The dashboard will populate automatically after Python records the first market session.</div>}
    <div className="allocation"><label>Virtual allocation <b>{money(capital)}</b><input type="range" min="1000" max="100000" step="1000" value={capital} onChange={e=>setCapital(Number(e.target.value))}/></label><div><small>MODELED SHARES</small><b>{shares?shares.toFixed(2):"—"}</b></div><div><small>MODELED VALUE</small><b>{current?money(current):"—"}</b></div><div><small>P&L</small><b className={last?.net&&last.net>=0?"up":"down"}>{last?money(current-deployed):"—"}</b></div></div>
   </article>
   <article className="rules"><p className="eyebrow">WHAT MUST BE TRUE</p><h2>V2 trade gate</h2>{["SPY and sector ETF positive","Stock ≥ 1% relative strength","Above VWAP; 15m & 30m momentum positive","Morning volume at least normal","Prior-day breadth ≥ 50%"].map((r,i)=><div className="rule" key={r}><span>{i+1}</span>{r}</div>)}<p className="cash">If any condition fails, the model stays in cash.</p></article>
  </section>
  <section className="history"><div className="section-head"><div><p className="eyebrow">AUDIT TRAIL</p><h2>Trade history</h2></div><span>{visible.length} recorded decisions</span></div><div className="table"><div className="tr th"><span>Date</span><span>Model</span><span>Decision</span><span>Entry</span><span>Return</span><span>vs SPY</span></div>{visible.slice(0,25).map((t,i)=><div className="tr" key={`${t.strategy}-${t.date}-${i}`}><span>{t.date}</span><span>{t.strategy.includes("v2")?"V2":"V1"}</span><span><b>{t.status}</b> {t.symbol}</span><span>{t.entryPrice?money(t.entryPrice):"—"}</span><span className={t.net>=0?"up":"down"}>{pct(t.net,3)}</span><span>{pct(t.net-t.spy,3)}</span></div>)}{!visible.length&&<div className="empty">No forward decisions recorded yet.</div>}</div></section>
  <footer><b>Paper validation only.</b> The interface is read-only and cannot place orders. Modeled allocation is a browser-only calculator, not investment advice.</footer>
 </main>
}
