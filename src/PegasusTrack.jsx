/*
╔══════════════════════════════════════════════════════════════════════════════╗
║  PEGASUS TRACK — UNIFIED CLUB MANAGEMENT APP  v0.5.0                       ║
║  React Artifact · window.storage persistence                               ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  STORAGE KEYS (all personal)                                                ║
║  pt_athletes  { id fn ln g age dob num notes ec1_name ec1_rel ec1_ph       ║
║                 ec1_ph2 ec2_name ec2_rel ec2_ph medical created_at }       ║
║  pt_meets     { id name date loc type status sid }                         ║
║  pt_seasons   { id name year type active }                                  ║
║  pt_me        { id mid name ab cat g ag round order status scheduled_time }║
║  pt_entries   { id evid aid gname gteam heat lane seed scratched attempts}  ║
║  pt_results   { id eid place mark wind dns dnf dq dqr is_pr }              ║
║                                                                             ║
║  FEATURES                                                                   ║
║  Meet detail tabs: Events & Entries | Seeding | Results | Reports           ║
║  Auto-seeding: center-out lane seeding, flight grouping for field           ║
║  Auto-ranking: sort by mark, place assignment, tie detection                ║
║  PR detection: gold star badge on personal bests in results entry           ║
║  Guest athletes: non-roster entries with name + team                        ║
║  Team scoring: 8-6-5-4-3-2-1 point accumulation                           ║
║  Records page: PRs auto-computed from all results                           ║
║  Field attempts: 6 attempt slots, best auto-selected                        ║
║                                                                             ║
║  NEXT: FinishLynx import · relay legs · multi-round · PDF export           ║
╚══════════════════════════════════════════════════════════════════════════════╝
*/

import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard, Users, Calendar, TrendingUp, Settings, Zap,
  Search, UserPlus, Edit2, Trash2, X, Plus, ArrowLeft,
  CheckCircle, Download, RotateCcw, MapPin, Clock,
  Phone, User, AlertTriangle, ChevronDown, ChevronUp, Heart, Star,
  Play, Square, Shuffle, List, FileText, Award, BarChart2,
  RefreshCw, Trophy
} from "lucide-react";

/* ─── CSS ──────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700&family=DM+Sans:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#08091a;--bg2:#0d1127;--bg3:#131830;--bgc:#0f1428;--bgh:#161c38;
  --b1:#1c2847;--b2:#243260;--t1:#e8eaf2;--t2:#7a8ab0;--t3:#404e6e;
  --acc:#38bdf8;--accg:rgba(56,189,248,.12);--accs:rgba(56,189,248,.28);
  --gld:#f59e0b;--gldg:rgba(245,158,11,.12);
  --grn:#10b981;--grng:rgba(16,185,129,.12);
  --red:#ef4444;--redg:rgba(239,68,68,.12);
  --pur:#a855f7;--purg:rgba(168,85,247,.12);
  --amb:#fb923c;--ambg:rgba(251,146,60,.1);
  --teal:#14b8a6;--tealg:rgba(20,184,166,.12);
  --fd:'Barlow Condensed',sans-serif;--fb:'DM Sans',sans-serif;
  --ease:cubic-bezier(.16,1,.3,1)
}
html,body,#root{height:100%;overflow:hidden}
body{font-family:var(--fb);font-size:14px;color:var(--t1);background:var(--bg);-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--b2);border-radius:3px}
.app{display:flex;flex-direction:column;height:100vh;overflow:hidden}
.dbar{display:flex;align-items:center;padding:0 0 0 16px;background:#050610;border-bottom:1px solid var(--b1);flex-shrink:0;height:42px}
.dbar-logo{font-family:var(--fd);font-size:12px;font-weight:700;letter-spacing:.12em;color:var(--t3);margin-right:18px}
.dbar-logo span{color:var(--acc)}
.dtab{display:flex;align-items:center;gap:6px;padding:0 16px;height:42px;font-size:12px;font-weight:500;cursor:pointer;border:none;background:none;color:var(--t2);border-bottom:2px solid transparent;transition:all .15s}
.dtab:hover{color:var(--t1)}.dtab.on{color:var(--acc);border-bottom-color:var(--acc)}
.appbody{flex:1;overflow:hidden}
.shell{display:flex;height:100%;overflow:hidden}
.sb{width:220px;flex-shrink:0;background:var(--bg2);border-right:1px solid var(--b1);display:flex;flex-direction:column;padding:0 10px 12px}
.sblogo{display:flex;align-items:center;gap:10px;padding:16px 8px 14px}
.sblogo-ic{width:32px;height:32px;border-radius:9px;background:var(--accg);border:1px solid var(--accs);display:flex;align-items:center;justify-content:center;color:var(--acc)}
.sbname{font-family:var(--fd);font-size:16px;font-weight:700;letter-spacing:.12em;line-height:1}
.sbsub{font-family:var(--fd);font-size:10px;letter-spacing:.2em;color:var(--acc);line-height:1.5}
.sdiv{height:1px;background:var(--b1);margin:3px 0}
.sbnav{flex:1;padding:6px 0;display:flex;flex-direction:column;gap:2px}
.sblbl{font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:var(--t3);padding:7px 10px 5px;font-weight:500}
.sbl{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:8px;color:var(--t2);font-size:12px;font-weight:500;cursor:pointer;transition:all .15s;border:1px solid transparent}
.sbl:hover{background:var(--bgh);color:var(--t1)}.sbl.on{background:var(--accg);color:var(--acc);border-color:rgba(56,189,248,.15)}
.sbver{font-size:9px;color:var(--t3);padding:6px 10px 0}
.main{flex:1;overflow-y:auto;overflow-x:hidden}
.page{padding-bottom:40px}
.ph{display:flex;align-items:flex-start;justify-content:space-between;padding:24px 28px 0;margin-bottom:20px}
.pt{font-family:var(--fd);font-size:30px;font-weight:700;letter-spacing:.06em}
.ps{font-size:12px;color:var(--t2);margin-top:3px}
.btn{display:inline-flex;align-items:center;gap:5px;padding:7px 13px;border-radius:8px;font-family:var(--fb);font-size:12px;font-weight:500;cursor:pointer;transition:all .15s;border:1px solid transparent;outline:none;white-space:nowrap}
.btn:disabled{opacity:.4;cursor:not-allowed}
.bp{background:var(--acc);color:#08091a;border-color:var(--acc)}.bp:hover:not(:disabled){filter:brightness(1.1)}
.bg{background:transparent;color:var(--t2);border-color:var(--b1)}.bg:hover{background:var(--bgh);color:var(--t1);border-color:var(--b2)}
.bd{background:transparent;color:var(--red);border-color:rgba(239,68,68,.3)}.bd:hover{background:var(--redg)}
.bgrn{background:var(--grng);color:var(--grn);border-color:rgba(16,185,129,.3)}
.bgld{background:var(--gldg);color:var(--gld);border-color:rgba(245,158,11,.3)}
.bi{padding:7px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;padding:0 28px;margin-bottom:20px}
.stat{background:var(--bgc);border:1px solid var(--b1);border-radius:12px;padding:16px;position:relative;overflow:hidden;transition:transform .2s}
.stat:hover{transform:translateY(-1px)}
.stat::before{content:'';position:absolute;top:0;left:0;right:0;height:2px}
.stat.bl::before{background:linear-gradient(90deg,var(--acc),transparent)}
.stat.gd::before{background:linear-gradient(90deg,var(--gld),transparent)}
.stat.gn::before{background:linear-gradient(90deg,var(--grn),transparent)}
.stat.pu::before{background:linear-gradient(90deg,var(--pur),transparent)}
.stat.tl::before{background:linear-gradient(90deg,var(--teal),transparent)}
.sv{font-family:var(--fd);font-size:38px;font-weight:700;line-height:1;margin-bottom:3px}
.stat.bl .sv{color:var(--acc)}.stat.gd .sv{color:var(--gld)}.stat.gn .sv{color:var(--grn)}
.stat.pu .sv{color:var(--pur)}.stat.tl .sv{color:var(--teal)}
.sl{font-size:10px;color:var(--t2);text-transform:uppercase;letter-spacing:.07em;font-weight:500}
.card{background:var(--bgc);border:1px solid var(--b1);border-radius:12px;padding:18px}
.ch{display:flex;align-items:center;gap:7px;font-family:var(--fd);font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--t2);margin-bottom:14px}
.g3c{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;padding:0 28px}
.abr{display:flex;align-items:center;gap:9px;margin-bottom:8px}
.abl{font-size:11px;color:var(--t2);width:66px;flex-shrink:0}
.abt{flex:1;height:5px;background:var(--bg3);border-radius:3px;overflow:hidden}
.abf{height:100%;background:linear-gradient(90deg,var(--acc),#60dafb);border-radius:3px;transition:width .6s var(--ease)}
.abc{font-size:11px;color:var(--t3);width:20px;text-align:right}
.rl{display:flex;flex-direction:column;gap:9px}
.ri{display:flex;align-items:center;gap:10px}
.rn{font-size:12px;font-weight:500}.rm{font-size:10px;color:var(--t2);margin-top:1px}
.mdb{width:36px;height:36px;background:var(--gldg);border:1px solid rgba(245,158,11,.2);border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0}
.mdbm{font-size:7px;color:var(--gld);letter-spacing:.08em;font-weight:600;line-height:1}
.mbdd{font-size:13px;font-weight:700;color:var(--gld);line-height:1.3}
.bdg{display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:100px;font-size:10px;font-weight:500}
.bl{background:var(--accg);color:var(--acc);border:1px solid rgba(56,189,248,.2)}
.gd{background:var(--gldg);color:var(--gld);border:1px solid rgba(245,158,11,.2)}
.gn{background:var(--grng);color:var(--grn);border:1px solid rgba(16,185,129,.2)}
.rd{background:var(--redg);color:var(--red);border:1px solid rgba(239,68,68,.2)}
.nt{background:rgba(122,138,176,.1);color:var(--t2);border:1px solid var(--b1)}
.tl{background:var(--tealg);color:var(--teal);border:1px solid rgba(20,184,166,.2)}
.pr-badge{display:inline-flex;align-items:center;gap:3px;padding:1px 6px;border-radius:100px;font-size:10px;font-weight:600;background:var(--gldg);color:var(--gld);border:1px solid rgba(245,158,11,.3)}
.tb{display:flex;align-items:center;gap:9px;padding:0 28px;margin-bottom:14px;flex-wrap:wrap}
.sbw{position:relative;flex:1;max-width:280px}
.sbw svg{position:absolute;left:9px;top:50%;transform:translateY(-50%);color:var(--t3);pointer-events:none}
.sbw .inp{padding-left:30px}
.inp{width:100%;padding:8px 11px;background:var(--bg3);border:1px solid var(--b1);border-radius:8px;color:var(--t1);font-family:var(--fb);font-size:12px;outline:none;transition:border-color .15s,box-shadow .15s}
.inp:focus{border-color:var(--acc);box-shadow:0 0 0 3px var(--accg)}.inp::placeholder{color:var(--t3)}
select.inp{appearance:none;cursor:pointer;width:auto;min-width:100px;padding-right:22px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%237a8ab0'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 8px center}
textarea.inp{resize:vertical;min-height:56px}
.tbl{width:100%;border-collapse:collapse}
.tbl th{text-align:left;font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.07em;color:var(--t3);padding:9px 10px;border-bottom:1px solid var(--b1)}
.tbl td{padding:9px 10px;border-bottom:1px solid rgba(28,40,71,.4);font-size:12px}
.tbl tr:last-child td{border-bottom:none}.tbl tr:hover td{background:var(--bgh)}
.av{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--fd);font-size:12px;font-weight:600;flex-shrink:0}
.avm{background:var(--accg);color:var(--acc);border:1px solid rgba(56,189,248,.2)}
.avf{background:var(--gldg);color:var(--gld);border:1px solid rgba(245,158,11,.2)}
.avg{background:rgba(122,138,176,.1);color:var(--t2);border:1px solid var(--b1)}
.ov{position:fixed;inset:0;background:rgba(0,0,0,.75);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:1000;animation:fi .15s ease}
.mod{background:var(--bg2);border:1px solid var(--b2);border-radius:16px;padding:24px;width:100%;max-width:520px;max-height:90vh;overflow-y:auto;animation:su .2s var(--ease);box-shadow:0 8px 32px rgba(0,0,0,.65)}
.mh{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
.mt{font-family:var(--fd);font-size:20px;font-weight:700}
.mf{display:flex;justify-content:flex-end;gap:8px;margin-top:20px;padding-top:16px;border-top:1px solid var(--b1)}
.fg{display:flex;flex-direction:column;gap:4px}
.fl{font-size:10px;font-weight:500;color:var(--t2);letter-spacing:.04em;text-transform:uppercase}
.fe{font-size:11px;color:var(--red)}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:11px}
.g3f{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
.empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 20px;gap:10px;color:var(--t3);text-align:center}
.empty svg{opacity:.2}
.spin{width:24px;height:24px;border-radius:50%;border:2px solid var(--b1);border-top-color:var(--acc);animation:sp .6s linear infinite}
.loading{display:flex;align-items:center;justify-content:center;height:200px}
.fsec{border-top:1px solid var(--b1);margin-top:16px;padding-top:14px}
.fsec-lbl{font-family:var(--fd);font-size:12px;font-weight:600;letter-spacing:.06em;color:var(--t2);text-transform:uppercase;margin-bottom:9px;display:flex;align-items:center;gap:6px}
.back-btn{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:8px;font-size:12px;color:var(--t2);cursor:pointer;border:1px solid var(--b1);background:transparent;transition:all .15s;margin-bottom:14px}
.back-btn:hover{background:var(--bgh);color:var(--t1)}
.meet-tabs{display:flex;border-bottom:1px solid var(--b1);margin-bottom:20px}
.mtab{display:flex;align-items:center;gap:6px;padding:10px 16px;font-size:12px;font-weight:500;cursor:pointer;color:var(--t2);border-bottom:2px solid transparent;margin-bottom:-1px;transition:all .15s;background:none;border-top:none;border-left:none;border-right:none;outline:none}
.mtab:hover{color:var(--t1)}.mtab.on{color:var(--acc);border-bottom-color:var(--acc)}
.evc{background:var(--bgc);border:1px solid var(--b1);border-radius:10px;overflow:hidden;margin-bottom:10px}
.evh{display:flex;align-items:center;gap:10px;padding:11px 14px;cursor:pointer;transition:background .12s;user-select:none}
.evh:hover{background:var(--bgh)}
.evtitle{font-family:var(--fd);font-size:14px;font-weight:600;letter-spacing:.04em;flex:1}
.evdot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.evdot.pending{background:var(--t3)}.evdot.running{background:var(--grn);box-shadow:0 0 6px var(--grn)}.evdot.complete{background:var(--acc)}
.rinp{padding:4px 7px;background:var(--bg3);border:1px solid var(--b1);border-radius:6px;color:var(--t1);font-family:var(--fb);font-size:12px;outline:none;transition:border-color .15s}
.rinp:focus{border-color:var(--acc);box-shadow:0 0 0 2px var(--accg)}
.rinp::placeholder{color:var(--t3)}.rinp:disabled{opacity:.4;cursor:not-allowed}
.fb{padding:3px 7px;border-radius:5px;font-size:10px;font-weight:500;cursor:pointer;border:1px solid;transition:all .12s}
.fb-on{background:var(--redg);color:var(--red);border-color:rgba(239,68,68,.35)}
.fb-off{background:transparent;color:var(--t3);border-color:var(--b1)}.fb-off:hover{color:var(--t2)}
.heat-label{font-family:var(--fd);font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--t2);padding:8px 14px;background:var(--bg3);border-bottom:1px solid var(--b1);display:flex;align-items:center;justify-content:space-between}
.pb{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--fd);font-size:12px;font-weight:700;flex-shrink:0}
.p1{background:var(--gld);color:#08091a}.p2{background:var(--t2);color:var(--bg)}.p3{background:var(--amb);color:#08091a}.pn{background:var(--bg3);color:var(--t2);border:1px solid var(--b1)}
.att-inp{width:68px;padding:3px 6px;background:var(--bg3);border:1px solid var(--b1);border-radius:5px;color:var(--t1);font-size:11px;font-family:var(--fb);outline:none;text-align:center}
.att-inp:focus{border-color:var(--acc)}.att-inp.best{border-color:var(--gld);color:var(--gld)}
.mrow{display:flex;align-items:center;gap:12px;padding:12px 14px;border-bottom:1px solid var(--b1);transition:background .12s}
.mrow:hover{background:var(--bgh)}.mrow:last-child{border-bottom:none}
@keyframes fi{from{opacity:0}to{opacity:1}}
@keyframes su{from{transform:translateY(12px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes sp{to{transform:rotate(360deg)}}
.pv-wrap{position:fixed;inset:0;z-index:3000;display:flex;flex-direction:column;background:#1a1a2e}
.pv-bar{display:flex;align-items:center;gap:12px;padding:12px 20px;background:rgba(0,0,0,.5);border-bottom:1px solid rgba(255,255,255,.1);flex-shrink:0}
.pv-scroll{flex:1;overflow-y:auto;padding:28px;background:#2a2a3e;display:flex;justify-content:center}
.ps-page{background:white;color:#111;font-family:'Times New Roman',Times,serif;width:8.5in;min-height:11in;padding:.5in;box-shadow:0 4px 24px rgba(0,0,0,.4)}
.ps-page.landscape{width:11in;min-height:8.5in;padding:.4in}
.ps-hdr{border-bottom:3px double #333;padding-bottom:8px;margin-bottom:12px}
.ps-club{font-family:Arial,sans-serif;font-size:19pt;font-weight:900;letter-spacing:3px;text-transform:uppercase}
.ps-meetinfo{font-size:9pt;color:#444;margin-top:3px;display:flex;gap:24px;flex-wrap:wrap}
.ps-evtitle{font-size:15pt;font-weight:700;margin:10px 0 2px;font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:1px}
.ps-evmeta{font-size:9.5pt;color:#444;margin-bottom:12px;display:flex;gap:16px;flex-wrap:wrap}
.ps-ht-hdr{font-family:Arial,sans-serif;font-size:12pt;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;border-bottom:1.5px solid #555;padding-bottom:4px;margin:14px 0 6px;display:flex;justify-content:space-between;align-items:baseline}
.ps-ht-hdr span{font-size:9pt;font-weight:400;font-family:Times New Roman,serif;letter-spacing:0}
.ps-tbl{width:100%;border-collapse:collapse;font-size:10pt}
.ps-tbl th{background:#e8e8e8;border:1px solid #888;padding:4px 6px;text-align:center;font-family:Arial,sans-serif;font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
.ps-tbl th.left{text-align:left}
.ps-tbl td{border:1px solid #aaa;padding:5px 6px;height:26px;font-size:10pt;vertical-align:middle}
.ps-tbl td.wi{background:#fffde7}
.ps-tbl td.num{text-align:center;font-family:Arial,sans-serif;font-weight:700;font-size:13pt}
.ps-tbl td.seed{text-align:center;font-family:'Courier New',monospace;font-size:10pt;color:#444}
.ps-footer{margin-top:20px;border-top:1.5px solid #333;padding-top:10px;font-size:9pt;font-family:Arial,sans-serif}
.ps-sig-row{display:flex;gap:32px;margin-bottom:10px;flex-wrap:wrap}
.ps-sig{flex:1;min-width:200px}
.ps-sig-lbl{font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#333}
.ps-sig-line{border-bottom:1px solid #333;margin-top:14px;width:100%}
.ps-note{font-size:8pt;color:#666;margin-top:8px;font-style:italic}
`;

/* ─── STORAGE ──────────────────────────────────────────────────────────────── */
var K = {A:'pt_athletes',M:'pt_meets',S:'pt_seasons',ME:'pt_me',EN:'pt_entries',RE:'pt_results'};

function loadStore(key, def) {
  if (def === undefined) def = [];
  return window.storage.get(key).then(function(r) {
    return r ? JSON.parse(r.value) : def;
  }).catch(function() { return def; });
}

function saveStore(key, val) {
  return window.storage.set(key, JSON.stringify(val)).catch(function(e) { console.error(e); });
}

/* ─── HELPERS ──────────────────────────────────────────────────────────────── */
function ageGroup(a) {
  if (a <= 8) return '8 & Under';
  if (a <= 10) return '9-10';
  if (a <= 12) return '11-12';
  if (a <= 14) return '13-14';
  if (a <= 16) return '15-16';
  return '17-18';
}
function calcAge(d) {
  return Math.floor((Date.now() - new Date(d + 'T00:00:00')) / (365.25 * 24 * 3600 * 1000));
}
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
function fmtDate(d) {
  var dt = new Date(d + 'T00:00:00');
  return {
    mon: dt.toLocaleDateString('en-US', {month:'short'}).toUpperCase(),
    day: dt.getDate(),
    full: dt.toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})
  };
}
function sbadge(s) {
  var map = {
    upcoming: {c:'gd', l:'Upcoming'},
    active:   {c:'gn', l:'Active'},
    completed:{c:'nt', l:'Completed'},
    cancelled:{c:'rd', l:'Cancelled'}
  };
  return map[s] || {c:'nt', l:s};
}
function gLabel(g) {
  if (g === 'M') return 'Boys';
  if (g === 'F') return 'Girls';
  return 'Mixed';
}

function entryName(en, athletes) {
  if (en.aid) {
    var a = athletes.find(function(x) { return x.id === en.aid; });
    return a ? (a.ln + ', ' + a.fn) : (en.gname || '?');
  }
  return en.gname || 'Guest';
}
function entryTeam(en, athletes) {
  if (en.aid) return 'Home';
  return en.gteam || '';
}
function entryAvatar(en, athletes) {
  if (en.aid) {
    var a = athletes.find(function(x) { return x.id === en.aid; });
    if (a) return {cls: a.g === 'M' ? 'avm' : 'avf', init: a.fn[0] + a.ln[0]};
  }
  var parts = (en.gname || 'G ?').split(' ');
  return {cls:'avg', init: ((parts[0][0]) + (parts[1] ? parts[1][0] : '?')).toUpperCase()};
}

/* ─── T&F EVENT CATALOGUE ──────────────────────────────────────────────────── */
var TF_EVENTS = [
  {n:'50 Meters',a:'50m',c:'track'},{n:'55 Meters',a:'55m',c:'track'},{n:'60 Meters',a:'60m',c:'track'},
  {n:'75 Meters',a:'75m',c:'track'},{n:'100 Meters',a:'100m',c:'track'},{n:'200 Meters',a:'200m',c:'track'},
  {n:'400 Meters',a:'400m',c:'track'},{n:'800 Meters',a:'800m',c:'track'},{n:'1500 Meters',a:'1500m',c:'track'},
  {n:'1600 Meters',a:'1600m',c:'track'},{n:'Mile',a:'Mile',c:'track'},{n:'3000 Meters',a:'3000m',c:'track'},
  {n:'3200 Meters',a:'3200m',c:'track'},{n:'5000 Meters',a:'5000m',c:'track'},
  {n:'60m Hurdles',a:'60mH',c:'track'},{n:'80m Hurdles',a:'80mH',c:'track'},
  {n:'100m Hurdles',a:'100mH',c:'track'},{n:'110m Hurdles',a:'110mH',c:'track'},
  {n:'300m Hurdles',a:'300mH',c:'track'},{n:'400m Hurdles',a:'400mH',c:'track'},
  {n:'3000m Steeplechase',a:'3000mSC',c:'track'},
  {n:'4x100 Relay',a:'4x100',c:'relay'},{n:'4x200 Relay',a:'4x200',c:'relay'},
  {n:'4x400 Relay',a:'4x400',c:'relay'},{n:'4x800 Relay',a:'4x800',c:'relay'},
  {n:'Sprint Medley Relay',a:'SMR',c:'relay'},{n:'Distance Medley Relay',a:'DMR',c:'relay'},
  {n:'Long Jump',a:'LJ',c:'field'},{n:'Triple Jump',a:'TJ',c:'field'},
  {n:'High Jump',a:'HJ',c:'field'},{n:'Pole Vault',a:'PV',c:'field'},
  {n:'Shot Put',a:'SP',c:'field'},{n:'Discus',a:'DT',c:'field'},
  {n:'Hammer',a:'HT',c:'field'},{n:'Javelin',a:'JT',c:'field'},{n:'Turbo Javelin',a:'TurboJT',c:'field'},
  {n:'Pentathlon',a:'Pent',c:'combined'},{n:'Heptathlon',a:'Hept',c:'combined'},{n:'Decathlon',a:'Dec',c:'combined'}
];

/* ─── ALGORITHMS ───────────────────────────────────────────────────────────── */
function parseMark(str, cat) {
  if (!str || str.trim() === '') return cat === 'field' ? -1 : Infinity;
  var s = str.trim();
  if (cat === 'field') {
    if (s.indexOf('-') > -1) {
      var parts = s.split('-');
      return parseFloat(parts[0]) * 12 + parseFloat(parts[1] || 0);
    }
    return parseFloat(s) || 0;
  }
  if (s.indexOf(':') > -1) {
    var tp = s.split(':');
    if (tp.length === 2) return parseFloat(tp[0]) * 60 + parseFloat(tp[1]);
    if (tp.length === 3) return parseFloat(tp[0]) * 3600 + parseFloat(tp[1]) * 60 + parseFloat(tp[2]);
  }
  return parseFloat(s) || Infinity;
}

function isFieldEvent(cat) {
  return cat === 'field' || cat === 'combined';
}

function seedEvent(ev, entries) {
  var isF = isFieldEvent(ev.cat);
  var scratched = entries.filter(function(e) { return e.scratched; });
  var active = entries.filter(function(e) { return !e.scratched; });
  if (active.length === 0) return entries;

  var seeded = active.filter(function(e) {
    var v = parseMark(e.seed, ev.cat);
    return e.seed && v !== Infinity && v > 0;
  });
  var unseeded = active.filter(function(e) {
    var v = parseMark(e.seed, ev.cat);
    return !e.seed || v === Infinity || v === 0;
  });

  if (isF) {
    var sortedF = seeded.slice().sort(function(a, b) {
      return parseMark(b.seed, 'field') - parseMark(a.seed, 'field');
    });
    var allF = sortedF.concat(unseeded);
    var FLIGHT_SIZE = 8;
    var assignedF = allF.map(function(e, i) {
      return Object.assign({}, e, {heat: Math.floor(i / FLIGHT_SIZE) + 1, lane: (i % FLIGHT_SIZE) + 1});
    });
    return scratched.concat(assignedF);
  }

  var LANES = 8;
  var LANE_ORDER = [4, 5, 3, 6, 2, 7, 1, 8];
  var sortedT = seeded.slice().sort(function(a, b) {
    return parseMark(b.seed, 'track') - parseMark(a.seed, 'track');
  });
  var allT = sortedT.concat(unseeded);
  var withHeat = allT.map(function(e, i) {
    return Object.assign({}, e, {heat: Math.floor(i / LANES) + 1});
  });
  var heatMap = {};
  withHeat.forEach(function(e) {
    if (!heatMap[e.heat]) heatMap[e.heat] = [];
    heatMap[e.heat].push(e);
  });
  var result = [];
  Object.keys(heatMap).sort(function(a, b) { return a - b; }).forEach(function(h) {
    var hEntries = heatMap[h].slice().sort(function(a, b) {
      return parseMark(a.seed, 'track') - parseMark(b.seed, 'track');
    });
    hEntries.forEach(function(e, i) {
      result.push(Object.assign({}, e, {lane: LANE_ORDER[i] || i + 1}));
    });
  });
  return scratched.concat(result);
}

function autoRank(ev, entries, results) {
  var isF = isFieldEvent(ev.cat);
  var active = entries.filter(function(e) { return !e.scratched; });
  var items = active.map(function(e) {
    var r = results.find(function(x) { return x.eid === e.id; }) || {};
    return {entry: e, result: r};
  });
  var dnx = items.filter(function(x) { return x.result.dns || x.result.dnf || x.result.dq; });
  var valid = items.filter(function(x) { return x.result.mark && !x.result.dns && !x.result.dnf && !x.result.dq; });
  var noMark = items.filter(function(x) { return !x.result.mark && !x.result.dns && !x.result.dnf && !x.result.dq; });

  valid.sort(function(a, b) {
    var ma = parseMark(a.result.mark, ev.cat);
    var mb = parseMark(b.result.mark, ev.cat);
    return isF ? (mb - ma) : (ma - mb);
  });

  var ranked = [];
  var place = 1;
  for (var i = 0; i < valid.length; i++) {
    if (i > 0) {
      var prev = parseMark(valid[i-1].result.mark, ev.cat);
      var curr = parseMark(valid[i].result.mark, ev.cat);
      if (Math.abs(curr - prev) > 0.001) place = i + 1;
    }
    ranked.push({entry: valid[i].entry, result: valid[i].result, place: String(place)});
  }

  var updated = results.slice();
  function upsert(eid, patch) {
    var idx = updated.findIndex(function(r) { return r.eid === eid; });
    if (idx >= 0) updated[idx] = Object.assign({}, updated[idx], patch);
    else updated.push(Object.assign({id: uid(), eid: eid}, patch));
  }
  ranked.forEach(function(x) { upsert(x.entry.id, Object.assign({}, x.result, {place: x.place})); });
  dnx.forEach(function(x) { upsert(x.entry.id, Object.assign({}, x.result, {place: ''})); });
  noMark.forEach(function(x) { upsert(x.entry.id, Object.assign({}, x.result, {place: ''})); });
  return updated;
}

function computePRs(athletes, entries, results, meetEvents, meets) {
  var prs = {};
  results.forEach(function(r) {
    if (!r.mark || r.dns || r.dnf || r.dq) return;
    var en = entries.find(function(e) { return e.id === r.eid; });
    if (!en || !en.aid) return;
    var ev = meetEvents.find(function(e) { return e.id === en.evid; });
    if (!ev) return;
    var meet = meets.find(function(m) { return m.id === ev.mid; });
    if (!meet) return;
    var key = en.aid + '_' + ev.name;
    var isF = isFieldEvent(ev.cat);
    var nv = parseMark(r.mark, ev.cat);
    var existing = prs[key];
    if (!existing) {
      prs[key] = {aid: en.aid, event: ev.name, cat: ev.cat, mark: r.mark, mid: meet.id, mname: meet.name, date: meet.date, eid: r.id};
    } else {
      var ov = parseMark(existing.mark, ev.cat);
      var better = isF ? (nv > ov) : (nv < ov);
      if (better) prs[key] = {aid: en.aid, event: ev.name, cat: ev.cat, mark: r.mark, mid: meet.id, mname: meet.name, date: meet.date, eid: r.id};
    }
  });
  return prs;
}

var SCORE_TABLE = {1:8, 2:6, 3:5, 4:4, 5:3, 6:2, 7:1};
function computeTeamScores(entries, results) {
  var scores = {};
  results.forEach(function(r) {
    if (!r.place || r.dns || r.dnf || r.dq) return;
    var place = parseInt(r.place);
    if (isNaN(place)) return;
    var pts = SCORE_TABLE[place] || 0;
    if (!pts) return;
    var en = entries.find(function(e) { return e.id === r.eid; });
    if (!en) return;
    var team = en.aid ? 'Home' : (en.gteam || 'Unknown');
    scores[team] = (scores[team] || 0) + pts;
  });
  return Object.keys(scores).map(function(t) { return {team: t, pts: scores[t]}; }).sort(function(a, b) { return b.pts - a.pts; });
}

/* ─── SHARED UI ────────────────────────────────────────────────────────────── */
function Confirm(props) {
  var title = props.title, body = props.body, label = props.label || 'Confirm';
  var danger = props.danger !== false;
  var onConfirm = props.onConfirm, onClose = props.onClose;
  return (
    <div className="ov" onClick={function(e) { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mod" style={{maxWidth:380}}>
        <div className="mh">
          <div className="mt">{title}</div>
          <button className="btn bg bi" onClick={onClose}><X size={13}/></button>
        </div>
        <p style={{color:'var(--t2)',fontSize:13,lineHeight:1.6}}>{body}</p>
        <div className="mf">
          <button className="btn bg" onClick={onClose}>Cancel</button>
          <button className={danger ? 'btn bd' : 'btn bp'} onClick={onConfirm}>{label}</button>
        </div>
      </div>
    </div>
  );
}

/* ─── ATHLETE FORM ─────────────────────────────────────────────────────────── */
var BLANK_A = {fn:'',ln:'',dob:'',g:'',num:'',notes:'',ec1_name:'',ec1_rel:'',ec1_ph:'',ec1_ph2:'',ec2_name:'',ec2_rel:'',ec2_ph:'',medical:''};
var RELS = ['Parent','Guardian','Grandparent','Sibling','Aunt/Uncle','Coach','Other'];

function AthleteForm(props) {
  var athlete = props.athlete, onSave = props.onSave, onClose = props.onClose;
  var init = athlete ? Object.assign({}, BLANK_A, athlete) : Object.assign({}, BLANK_A);
  var [f, setF] = useState(init);
  var [er, setEr] = useState({});
  function set(k, v) { setF(function(p) { return Object.assign({}, p, {[k]: v}); }); setEr(function(e) { return Object.assign({}, e, {[k]: ''}); }); }
  var age = f.dob ? calcAge(f.dob) : null;
  function ok() {
    var e = {};
    if (!f.fn.trim()) e.fn = 'Required';
    if (!f.ln.trim()) e.ln = 'Required';
    if (!f.dob) e.dob = 'Required';
    if (!f.g) e.g = 'Required';
    if (age !== null && (age < 3 || age > 22)) e.dob = 'Age 3–22';
    setEr(e);
    return Object.keys(e).length === 0;
  }
  return (
    <div className="ov" onClick={function(e) { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mod">
        <div className="mh">
          <div className="mt">{athlete && athlete.id ? 'Edit Athlete' : 'Add Athlete'}</div>
          <button className="btn bg bi" onClick={onClose}><X size={13}/></button>
        </div>
        <div className="g2">
          <div className="fg">
            <label className="fl">First Name *</label>
            <input className="inp" value={f.fn} onChange={function(e) { set('fn', e.target.value); }} placeholder="Jane" autoFocus />
            {er.fn && <span className="fe">{er.fn}</span>}
          </div>
          <div className="fg">
            <label className="fl">Last Name *</label>
            <input className="inp" value={f.ln} onChange={function(e) { set('ln', e.target.value); }} placeholder="Smith" />
            {er.ln && <span className="fe">{er.ln}</span>}
          </div>
          <div className="fg">
            <label className="fl">
              DOB *{age !== null && <span style={{color:'var(--acc)',textTransform:'none',letterSpacing:0}}> — Age {age}</span>}
            </label>
            <input className="inp" type="date" value={f.dob} onChange={function(e) { set('dob', e.target.value); }} />
            {er.dob && <span className="fe">{er.dob}</span>}
          </div>
          <div className="fg">
            <label className="fl">Gender *</label>
            <select className="inp" value={f.g} onChange={function(e) { set('g', e.target.value); }}>
              <option value="">Select…</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
            {er.g && <span className="fe">{er.g}</span>}
          </div>
          <div className="fg" style={{gridColumn:'span 2'}}>
            <label className="fl">Athlete #</label>
            <input className="inp" value={f.num} onChange={function(e) { set('num', e.target.value); }} placeholder="Club ID or bib" />
          </div>
        </div>

        <div className="fsec">
          <div className="fsec-lbl"><Heart size={12} color="var(--red)" />Emergency Contact 1</div>
          <div className="g3f" style={{marginBottom:10}}>
            <div className="fg" style={{gridColumn:'span 2'}}>
              <label className="fl">Name</label>
              <input className="inp" value={f.ec1_name} onChange={function(e) { set('ec1_name', e.target.value); }} placeholder="Full name" />
            </div>
            <div className="fg">
              <label className="fl">Relationship</label>
              <select className="inp" value={f.ec1_rel} onChange={function(e) { set('ec1_rel', e.target.value); }}>
                <option value="">—</option>
                {RELS.map(function(r) { return <option key={r}>{r}</option>; })}
              </select>
            </div>
          </div>
          <div className="g2">
            <div className="fg">
              <label className="fl">Primary Phone</label>
              <input className="inp" value={f.ec1_ph} onChange={function(e) { set('ec1_ph', e.target.value); }} placeholder="(555) 000-0000" type="tel" />
            </div>
            <div className="fg">
              <label className="fl">Alt Phone</label>
              <input className="inp" value={f.ec1_ph2} onChange={function(e) { set('ec1_ph2', e.target.value); }} placeholder="(555) 000-0000" type="tel" />
            </div>
          </div>
        </div>

        <div className="fsec">
          <div className="fsec-lbl">
            <Heart size={12} color="var(--t3)" />
            Emergency Contact 2
            <span style={{fontSize:10,fontWeight:400,textTransform:'none',letterSpacing:0,color:'var(--t3)'}}>Optional</span>
          </div>
          <div className="g3f" style={{marginBottom:10}}>
            <div className="fg" style={{gridColumn:'span 2'}}>
              <label className="fl">Name</label>
              <input className="inp" value={f.ec2_name} onChange={function(e) { set('ec2_name', e.target.value); }} placeholder="Full name" />
            </div>
            <div className="fg">
              <label className="fl">Relationship</label>
              <select className="inp" value={f.ec2_rel} onChange={function(e) { set('ec2_rel', e.target.value); }}>
                <option value="">—</option>
                {RELS.map(function(r) { return <option key={r}>{r}</option>; })}
              </select>
            </div>
          </div>
          <div className="fg">
            <label className="fl">Phone</label>
            <input className="inp" value={f.ec2_ph} onChange={function(e) { set('ec2_ph', e.target.value); }} placeholder="(555) 000-0000" type="tel" />
          </div>
        </div>

        <div className="fsec">
          <div className="fsec-lbl">
            <AlertTriangle size={12} color="var(--amb)" />
            Medical Notes
            <span style={{fontSize:10,fontWeight:400,textTransform:'none',letterSpacing:0,color:'var(--t3)'}}>Allergies · Conditions · Medications</span>
          </div>
          <textarea className="inp" value={f.medical} onChange={function(e) { set('medical', e.target.value); }} placeholder="e.g. Allergic to penicillin. Carries EpiPen." />
        </div>

        <div className="fsec">
          <div className="fg">
            <label className="fl">Notes</label>
            <textarea className="inp" value={f.notes} onChange={function(e) { set('notes', e.target.value); }} placeholder="Any other notes…" />
          </div>
        </div>

        <div className="mf">
          <button className="btn bg" onClick={onClose}>Cancel</button>
          <button className="btn bp" onClick={function() { if (ok()) onSave(f); }}>
            {athlete && athlete.id ? 'Save Changes' : 'Add Athlete'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AthleteView(props) {
  var a = props.a, onEdit = props.onEdit, onClose = props.onClose;
  var h1 = a.ec1_name || a.ec1_ph;
  var h2 = a.ec2_name || a.ec2_ph;
  return (
    <div className="ov" onClick={function(e) { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mod">
        <div className="mh">
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div className={'av ' + (a.g === 'M' ? 'avm' : 'avf')} style={{width:42,height:42,fontSize:16}}>{a.fn[0]}{a.ln[0]}</div>
            <div>
              <div className="mt">{a.fn} {a.ln}</div>
              <div style={{display:'flex',gap:6,marginTop:5,flexWrap:'wrap'}}>
                <span className={'bdg ' + (a.g === 'M' ? 'bl' : 'gd')}>{a.g === 'M' ? 'Male' : 'Female'}</span>
                <span className="bdg nt">Age {a.age} · {ageGroup(a.age)}</span>
                {a.num && <span className="bdg nt">#{a.num}</span>}
              </div>
            </div>
          </div>
          <button className="btn bg bi" onClick={onClose}><X size={13}/></button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div style={{fontSize:12,color:'var(--t2)'}}>DOB: {fmtDate(a.dob).full}</div>
          {a.medical && (
            <div style={{background:'var(--ambg)',border:'1px solid rgba(251,146,60,.25)',borderRadius:8,padding:12}}>
              <div style={{display:'flex',alignItems:'center',gap:6,fontFamily:'var(--fd)',fontSize:12,fontWeight:600,letterSpacing:'.04em',color:'var(--amb)',marginBottom:5}}>
                <AlertTriangle size={12} />MEDICAL
              </div>
              <div style={{fontSize:12,color:'var(--t2)',lineHeight:1.6}}>{a.medical}</div>
            </div>
          )}
          {h1 && (
            <div>
              <div style={{fontSize:9,textTransform:'uppercase',letterSpacing:'.08em',color:'var(--t3)',fontWeight:500,marginBottom:5,display:'flex',alignItems:'center',gap:4}}>
                <Heart size={9} color="var(--red)" />Emergency Contact 1
              </div>
              <div style={{background:'var(--bg3)',border:'1px solid var(--b1)',borderRadius:8,padding:12,display:'flex',flexDirection:'column',gap:4}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div style={{fontWeight:500,fontSize:13}}>{a.ec1_name || '—'}</div>
                  {a.ec1_rel && <span className="bdg nt">{a.ec1_rel}</span>}
                </div>
                {a.ec1_ph && <div style={{fontSize:11,color:'var(--t2)',display:'flex',alignItems:'center',gap:5}}><Phone size={10}/>{a.ec1_ph}</div>}
                {a.ec1_ph2 && <div style={{fontSize:11,color:'var(--t2)',display:'flex',alignItems:'center',gap:5}}><Phone size={10}/>{a.ec1_ph2} <span style={{color:'var(--t3)'}}>alt</span></div>}
              </div>
            </div>
          )}
          {h2 && (
            <div>
              <div style={{fontSize:9,textTransform:'uppercase',letterSpacing:'.08em',color:'var(--t3)',fontWeight:500,marginBottom:5,display:'flex',alignItems:'center',gap:4}}>
                <Heart size={9} />Emergency Contact 2
              </div>
              <div style={{background:'var(--bg3)',border:'1px solid var(--b1)',borderRadius:8,padding:12,display:'flex',flexDirection:'column',gap:4}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div style={{fontWeight:500,fontSize:13}}>{a.ec2_name || '—'}</div>
                  {a.ec2_rel && <span className="bdg nt">{a.ec2_rel}</span>}
                </div>
                {a.ec2_ph && <div style={{fontSize:11,color:'var(--t2)',display:'flex',alignItems:'center',gap:5}}><Phone size={10}/>{a.ec2_ph}</div>}
              </div>
            </div>
          )}
          {!h1 && !h2 && (
            <div style={{padding:'10px 14px',background:'var(--redg)',border:'1px solid rgba(239,68,68,.2)',borderRadius:8,fontSize:12,color:'var(--red)',display:'flex',alignItems:'center',gap:7}}>
              <AlertTriangle size={13}/>No emergency contact on file.
            </div>
          )}
          {a.notes && (
            <div>
              <div style={{fontSize:9,textTransform:'uppercase',letterSpacing:'.08em',color:'var(--t3)',marginBottom:4,fontWeight:500}}>Notes</div>
              <div style={{fontSize:12,color:'var(--t2)',lineHeight:1.6}}>{a.notes}</div>
            </div>
          )}
        </div>
        <div className="mf">
          <button className="btn bg" onClick={onClose}>Close</button>
          <button className="btn bp" onClick={onEdit}><Edit2 size={12}/>Edit</button>
        </div>
      </div>
    </div>
  );
}

/* ─── ROSTER ───────────────────────────────────────────────────────────────── */
function Roster(props) {
  var athletes = props.athletes, setAthletes = props.setAthletes;
  var [q, setQ] = useState('');
  var [gf, setGf] = useState('all');
  var [af, setAf] = useState('all');
  var [add, setAdd] = useState(false);
  var [ed, setEd] = useState(null);
  var [vw, setVw] = useState(null);
  var [del, setDel] = useState(null);

  var fil = athletes.filter(function(a) {
    var s = q.toLowerCase();
    var nameMatch = !s || (a.fn + ' ' + a.ln).toLowerCase().indexOf(s) > -1 || (a.num && a.num.indexOf(s) > -1);
    var gMatch = gf === 'all' || a.g === gf;
    var aMatch = af === 'all' || ageGroup(a.age) === af;
    return nameMatch && gMatch && aMatch;
  });

  function doAdd(f) {
    var age = calcAge(f.dob);
    setAthletes(function(p) { return p.concat([Object.assign({}, f, {id: uid(), age: age, created_at: new Date().toISOString()})]); });
    setAdd(false);
  }
  function doEd(f) {
    var age = calcAge(f.dob);
    setAthletes(function(p) { return p.map(function(a) { return a.id === ed.id ? Object.assign({}, a, f, {age: age}) : a; }); });
    setEd(null);
  }
  function doDel() {
    setAthletes(function(p) { return p.filter(function(a) { return a.id !== del.id; }); });
    setDel(null);
  }

  return (
    <div className="page">
      <div className="ph">
        <div>
          <div className="pt">ROSTER</div>
          <div className="ps">{athletes.length} athletes · {athletes.filter(function(a) { return a.g === 'M'; }).length} male · {athletes.filter(function(a) { return a.g === 'F'; }).length} female</div>
        </div>
        <button className="btn bp" onClick={function() { setAdd(true); }}><UserPlus size={13}/>Add Athlete</button>
      </div>
      <div className="tb">
        <div className="sbw">
          <Search size={12}/>
          <input className="inp" placeholder="Search by name or #…" value={q} onChange={function(e) { setQ(e.target.value); }}/>
        </div>
        <select className="inp" value={gf} onChange={function(e) { setGf(e.target.value); }}>
          <option value="all">All Genders</option><option value="M">Male</option><option value="F">Female</option>
        </select>
        <select className="inp" value={af} onChange={function(e) { setAf(e.target.value); }}>
          <option value="all">All Age Groups</option>
          {['8 & Under','9-10','11-12','13-14','15-16','17-18'].map(function(g) { return <option key={g}>{g}</option>; })}
        </select>
        {(q || gf !== 'all' || af !== 'all') && (
          <button className="btn bg" onClick={function() { setQ(''); setGf('all'); setAf('all'); }}><X size={12}/>Clear</button>
        )}
        <span style={{marginLeft:'auto',fontSize:11,color:'var(--t3)'}}>{fil.length} result{fil.length !== 1 ? 's' : ''}</span>
      </div>
      <div style={{padding:'0 28px'}}>
        {fil.length === 0 ? (
          <div className="empty">
            <UserPlus size={40}/>
            <p>{q ? 'No matches' : 'Roster is empty'}</p>
            {!q && <button className="btn bp" style={{marginTop:8}} onClick={function() { setAdd(true); }}>Add First Athlete</button>}
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr><th>Athlete</th><th>G</th><th>Age Grp</th><th>DOB</th><th>#</th><th>EC</th><th style={{width:88,textAlign:'right'}}>Actions</th></tr>
            </thead>
            <tbody>
              {fil.map(function(a) {
                var has = a.ec1_name || a.ec1_ph;
                return (
                  <tr key={a.id}>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:9}}>
                        <div className={'av ' + (a.g === 'M' ? 'avm' : 'avf')}>{a.fn[0]}{a.ln[0]}</div>
                        <button style={{background:'none',border:'none',cursor:'pointer',color:'var(--t1)',fontWeight:500,fontSize:12,padding:0}} onClick={function() { setVw(a); }}>{a.ln}, {a.fn}</button>
                      </div>
                    </td>
                    <td><span className={'bdg ' + (a.g === 'M' ? 'bl' : 'gd')}>{a.g}</span></td>
                    <td><span className="bdg nt">{ageGroup(a.age)} <span style={{opacity:.7,fontFamily:'var(--fd)',fontSize:12}}>({a.age})</span></span></td>
                    <td style={{color:'var(--t2)',fontSize:11}}>{fmtDate(a.dob).full}</td>
                    <td style={{color:'var(--t3)',fontSize:11,fontFamily:'monospace'}}>{a.num || '—'}</td>
                    <td>{has ? <CheckCircle size={13} color="var(--grn)"/> : <AlertTriangle size={13} color="var(--red)"/>}</td>
                    <td>
                      <div style={{display:'flex',justifyContent:'flex-end',gap:2}}>
                        <button className="btn bg bi" style={{padding:5}} onClick={function() { setVw(a); }}><User size={11}/></button>
                        <button className="btn bg bi" style={{padding:5}} onClick={function() { setEd(a); }}><Edit2 size={11}/></button>
                        <button className="btn bd bi" style={{padding:5}} onClick={function() { setDel(a); }}><Trash2 size={11}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {add && <AthleteForm onSave={doAdd} onClose={function() { setAdd(false); }}/>}
      {ed && <AthleteForm athlete={ed} onSave={doEd} onClose={function() { setEd(null); }}/>}
      {vw && <AthleteView a={vw} onEdit={function() { setEd(vw); setVw(null); }} onClose={function() { setVw(null); }}/>}
      {del && <Confirm title="Remove Athlete" body={<span>Remove <strong style={{color:'var(--t1)'}}>{del.fn} {del.ln}</strong>?</span>} label="Remove" onConfirm={doDel} onClose={function() { setDel(null); }}/>}
    </div>
  );
}

/* ─── EVENT & ENTRY MODALS ─────────────────────────────────────────────────── */
function EventModal(props) {
  var ev = props.ev, onSave = props.onSave, onClose = props.onClose;
  var [f, setF] = useState({
    name: ev ? ev.name : '', ab: ev ? ev.ab : '', cat: ev ? ev.cat : 'track',
    g: ev ? ev.g : '', ag: ev ? ev.ag : '', round: ev ? ev.round : 'final',
    scheduled_time: ev ? (ev.scheduled_time || '') : ''
  });
  var [er, setEr] = useState('');
  function pick(n) {
    var e = TF_EVENTS.find(function(x) { return x.n === n; });
    if (e) setF(function(p) { return Object.assign({}, p, {name: e.n, ab: e.a, cat: e.c}); });
  }
  return (
    <div className="ov" onClick={function(e) { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mod" style={{maxWidth:440}}>
        <div className="mh">
          <div className="mt">{ev && ev.id ? 'Edit Event' : 'Add Event'}</div>
          <button className="btn bg bi" onClick={onClose}><X size={13}/></button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:11}}>
          <div className="fg">
            <label className="fl">Event *</label>
            <select className="inp" value={f.name} onChange={function(e) { pick(e.target.value); }}>
              <option value="">Select event…</option>
              {['track','relay','field','combined'].map(function(cat) {
                return (
                  <optgroup key={cat} label={cat.charAt(0).toUpperCase() + cat.slice(1)}>
                    {TF_EVENTS.filter(function(e) { return e.c === cat; }).map(function(e) { return <option key={e.n}>{e.n}</option>; })}
                  </optgroup>
                );
              })}
            </select>
            {er && <span className="fe">{er}</span>}
          </div>
          <div className="g2">
            <div className="fg">
              <label className="fl">Gender *</label>
              <select className="inp" value={f.g} onChange={function(e) { setF(function(p) { return Object.assign({}, p, {g: e.target.value}); }); }}>
                <option value="">Select…</option>
                <option value="M">Boys/Men</option>
                <option value="F">Girls/Women</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
            <div className="fg">
              <label className="fl">Age Group</label>
              <select className="inp" value={f.ag} onChange={function(e) { setF(function(p) { return Object.assign({}, p, {ag: e.target.value}); }); }}>
                <option value="">All</option>
                {['8 & Under','9-10','11-12','13-14','15-16','17-18','Open'].map(function(g) { return <option key={g}>{g}</option>; })}
              </select>
            </div>
          </div>
          <div className="g2">
            <div className="fg">
              <label className="fl">Round</label>
              <select className="inp" value={f.round} onChange={function(e) { setF(function(p) { return Object.assign({}, p, {round: e.target.value}); }); }}>
                {['prelim','semi','final'].map(function(r) { return <option key={r}>{r}</option>; })}
              </select>
            </div>
            <div className="fg">
              <label className="fl">Scheduled Time</label>
              <input className="inp" value={f.scheduled_time} onChange={function(e) { setF(function(p) { return Object.assign({}, p, {scheduled_time: e.target.value}); }); }} placeholder="e.g. 9:00 AM" />
            </div>
          </div>
        </div>
        <div className="mf">
          <button className="btn bg" onClick={onClose}>Cancel</button>
          <button className="btn bp" onClick={function() {
            if (!f.name || !f.g) { setEr('Select event and gender'); return; }
            onSave(f);
          }}>{ev && ev.id ? 'Save' : 'Add Event'}</button>
        </div>
      </div>
    </div>
  );
}

function EntryModal(props) {
  var ev = props.ev, athletes = props.athletes, takenAids = props.takenAids;
  var onSave = props.onSave, onClose = props.onClose;
  var [mode, setMode] = useState('roster');
  var [f, setF] = useState({aid:'', gname:'', gteam:'', heat:1, lane:'', seed:''});
  var [er, setEr] = useState('');
  var avail = athletes.filter(function(a) { return (ev.g === 'mixed' || a.g === ev.g) && !takenAids.has(a.id); });
  return (
    <div className="ov" onClick={function(e) { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mod" style={{maxWidth:400}}>
        <div className="mh">
          <div className="mt">Add Entry</div>
          <button className="btn bg bi" onClick={onClose}><X size={13}/></button>
        </div>
        <div style={{marginBottom:10,fontSize:11,color:'var(--t2)'}}>
          {ev.name} · {gLabel(ev.g)}{ev.ag ? ' · ' + ev.ag : ''} · {ev.round}
        </div>
        <div style={{display:'flex',gap:6,marginBottom:14}}>
          <button className={mode === 'roster' ? 'btn bp' : 'btn bg'} style={{fontSize:11}} onClick={function() { setMode('roster'); }}>
            <Users size={12}/>From Roster
          </button>
          <button className={mode === 'guest' ? 'btn bp' : 'btn bg'} style={{fontSize:11}} onClick={function() { setMode('guest'); }}>
            <Plus size={12}/>Guest Athlete
          </button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:11}}>
          {mode === 'roster' ? (
            <div className="fg">
              <label className="fl">Athlete *</label>
              <select className="inp" value={f.aid} onChange={function(e) { setF(function(p) { return Object.assign({}, p, {aid: e.target.value}); }); }}>
                <option value="">Select…</option>
                {avail.map(function(a) { return <option key={a.id} value={a.id}>{a.ln}, {a.fn} (Age {a.age})</option>; })}
              </select>
              {avail.length === 0 && <span style={{fontSize:11,color:'var(--t2)'}}>All eligible athletes already entered.</span>}
            </div>
          ) : (
            <div className="g2">
              <div className="fg">
                <label className="fl">Name *</label>
                <input className="inp" value={f.gname} onChange={function(e) { setF(function(p) { return Object.assign({}, p, {gname: e.target.value}); }); }} placeholder="Smith, Jane" autoFocus />
              </div>
              <div className="fg">
                <label className="fl">Team</label>
                <input className="inp" value={f.gteam} onChange={function(e) { setF(function(p) { return Object.assign({}, p, {gteam: e.target.value}); }); }} placeholder="Club name" />
              </div>
            </div>
          )}
          {er && <span className="fe">{er}</span>}
          <div className="g3f">
            <div className="fg">
              <label className="fl">Heat/Flt</label>
              <input className="inp" type="number" min="1" value={f.heat} onChange={function(e) { setF(function(p) { return Object.assign({}, p, {heat: parseInt(e.target.value) || 1}); }); }}/>
            </div>
            <div className="fg">
              <label className="fl">Lane/Pos</label>
              <input className="inp" type="number" min="1" max="10" value={f.lane} placeholder="—" onChange={function(e) { setF(function(p) { return Object.assign({}, p, {lane: e.target.value}); }); }}/>
            </div>
            <div className="fg">
              <label className="fl">Seed</label>
              <input className="inp" value={f.seed} placeholder="12.34" onChange={function(e) { setF(function(p) { return Object.assign({}, p, {seed: e.target.value}); }); }}/>
            </div>
          </div>
        </div>
        <div className="mf">
          <button className="btn bg" onClick={onClose}>Cancel</button>
          <button className="btn bp" onClick={function() {
            if (mode === 'roster' && !f.aid) { setEr('Select an athlete'); return; }
            if (mode === 'guest' && !f.gname.trim()) { setEr('Enter athlete name'); return; }
            onSave(Object.assign({}, f, {aid: mode === 'roster' ? f.aid : null}));
          }}>Add Entry</button>
        </div>
      </div>
    </div>
  );
}

/* ─── EVENTS & ENTRIES TAB ─────────────────────────────────────────────────── */
function EventsTab(props) {
  var evs = props.evs, entries = props.entries, athletes = props.athletes;
  var setEvs = props.setEvs, setEntries = props.setEntries, mid = props.mid;
  var [showEv, setShowEv] = useState(false);
  var [edEv, setEdEv] = useState(null);
  var [delEv, setDelEv] = useState(null);
  var [addEntryEv, setAddEntryEv] = useState(null);
  var [delEntry, setDelEntry] = useState(null);
  var [openEvIds, setOpenEvIds] = useState({});

  function toggleEv(id) { setOpenEvIds(function(p) { var n = Object.assign({}, p); n[id] = !n[id]; return n; }); }
  function addEv(f) {
    var newEv = Object.assign({id: uid(), mid: mid, status: 'pending', order: evs.length}, f);
    setEvs(function(p) { return p.concat([newEv]); });
    setShowEv(false);
  }
  function editEv(f) { setEvs(function(p) { return p.map(function(e) { return e.id === edEv.id ? Object.assign({}, e, f) : e; }); }); setEdEv(null); }
  function removeEv() {
    var id = delEv.id;
    setEntries(function(p) { return p.filter(function(e) { return e.evid !== id; }); });
    setEvs(function(p) { return p.filter(function(e) { return e.id !== id; }); });
    setDelEv(null);
  }
  function addEntry(evid, f) { setEntries(function(p) { return p.concat([Object.assign({id: uid(), evid: evid, attempts: []}, f)]); }); }
  function doDelEntry() { setEntries(function(p) { return p.filter(function(e) { return e.id !== delEntry.id; }); }); setDelEntry(null); }
  function toggleScratch(eid) { setEntries(function(p) { return p.map(function(e) { return e.id === eid ? Object.assign({}, e, {scratched: !e.scratched}) : e; }); }); }

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
        <div style={{fontSize:12,color:'var(--t2)'}}>{evs.length} event{evs.length !== 1 ? 's' : ''} · {entries.length} total entries</div>
        <button className="btn bp" onClick={function() { setShowEv(true); }}><Plus size={13}/>Add Event</button>
      </div>
      {evs.length === 0 ? (
        <div className="empty"><Calendar size={38}/><p>No events yet</p><button className="btn bp" style={{marginTop:8}} onClick={function() { setShowEv(true); }}>Add First Event</button></div>
      ) : (
        evs.map(function(ev) {
          var evEntries = entries.filter(function(e) { return e.evid === ev.id; });
          var taken = new Set(evEntries.map(function(e) { return e.aid; }).filter(Boolean));
          var isOpen = openEvIds[ev.id] !== false && openEvIds[ev.id] !== undefined ? openEvIds[ev.id] : true;
          return (
            <div key={ev.id} className="evc">
              <div className="evh" style={{borderBottom: evEntries.length ? '1px solid var(--b1)' : 'none'}}>
                <div className={'evdot ' + (ev.status || 'pending')}/>
                <div className="evtitle">{ev.name}</div>
                <div style={{display:'flex',gap:5,alignItems:'center'}}>
                  <span className="bdg nt">{gLabel(ev.g)}{ev.ag ? ' · ' + ev.ag : ''}</span>
                  {ev.round !== 'final' && <span className="bdg bl" style={{textTransform:'capitalize'}}>{ev.round}</span>}
                  {ev.scheduled_time && <span className="bdg nt">{ev.scheduled_time}</span>}
                  <span className="bdg nt">{evEntries.length} entr{evEntries.length === 1 ? 'y' : 'ies'}</span>
                </div>
                <div style={{display:'flex',gap:2,marginLeft:8}} onClick={function(e) { e.stopPropagation(); }}>
                  <button className="btn bg bi" style={{padding:5}} onClick={function() { setAddEntryEv(ev); }} title="Add entry"><Plus size={11}/></button>
                  <button className="btn bg bi" style={{padding:5}} onClick={function() { setEdEv(ev); }}><Edit2 size={11}/></button>
                  <button className="btn bd bi" style={{padding:5}} onClick={function() { setDelEv(ev); }}><Trash2 size={11}/></button>
                </div>
                <div onClick={function() { toggleEv(ev.id); }}>
                  {isOpen ? <ChevronUp size={12} style={{color:'var(--t3)',flexShrink:0}}/> : <ChevronDown size={12} style={{color:'var(--t3)',flexShrink:0}}/>}
                </div>
              </div>
              {isOpen && evEntries.length > 0 && (
                <table className="tbl">
                  <thead><tr><th>Athlete</th><th>Team</th><th>Ht</th><th>Ln</th><th>Seed</th><th>Status</th><th style={{width:64,textAlign:'right'}}></th></tr></thead>
                  <tbody>
                    {evEntries.slice().sort(function(a, b) { return (a.heat || 0) - (b.heat || 0) || (a.lane || 0) - (b.lane || 0); }).map(function(en) {
                      var av = entryAvatar(en, athletes);
                      return (
                        <tr key={en.id} style={{opacity: en.scratched ? .5 : 1}}>
                          <td><div style={{display:'flex',alignItems:'center',gap:8}}><div className={'av ' + av.cls} style={{width:24,height:24,fontSize:9}}>{av.init}</div><span style={{fontWeight:500}}>{entryName(en, athletes)}</span></div></td>
                          <td style={{color:'var(--t2)',fontSize:11}}>{entryTeam(en, athletes) || '—'}</td>
                          <td style={{fontFamily:'var(--fd)',fontSize:14,color:'var(--acc)'}}>{en.heat || '—'}</td>
                          <td style={{fontFamily:'var(--fd)',fontSize:14}}>{en.lane || '—'}</td>
                          <td style={{fontFamily:'var(--fd)',fontSize:13,color:'var(--t2)'}}>{en.seed || '—'}</td>
                          <td>{en.scratched ? <span className="bdg rd">Scratched</span> : <span className="bdg nt">Active</span>}</td>
                          <td>
                            <div style={{display:'flex',justifyContent:'flex-end',gap:2}}>
                              <button className={en.scratched ? 'btn bg bi' : 'btn bgld bi'} style={{padding:4,fontSize:10}} onClick={function() { toggleScratch(en.id); }} title={en.scratched ? 'Un-scratch' : 'Scratch'}>{en.scratched ? '↩' : '✕'}</button>
                              <button className="btn bd bi" style={{padding:4}} onClick={function() { setDelEntry(en); }}><Trash2 size={10}/></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          );
        })
      )}
      {showEv && <EventModal onSave={addEv} onClose={function() { setShowEv(false); }}/>}
      {edEv && <EventModal ev={edEv} onSave={editEv} onClose={function() { setEdEv(null); }}/>}
      {delEv && <Confirm title="Delete Event" body={<span>Delete <strong style={{color:'var(--t1)'}}>{delEv.name}</strong> and all entries?</span>} label="Delete" onConfirm={removeEv} onClose={function() { setDelEv(null); }}/>}
      {addEntryEv && <EntryModal ev={addEntryEv} athletes={athletes} takenAids={new Set(entries.filter(function(e) { return e.evid === addEntryEv.id; }).map(function(e) { return e.aid; }).filter(Boolean))} onSave={function(f) { addEntry(addEntryEv.id, f); setAddEntryEv(null); }} onClose={function() { setAddEntryEv(null); }}/>}
      {delEntry && <Confirm title="Remove Entry" body={<span>Remove <strong style={{color:'var(--t1)'}}>{entryName(delEntry, athletes)}</strong>?</span>} label="Remove" onConfirm={doDelEntry} onClose={function() { setDelEntry(null); }}/>}
    </div>
  );
}

/* ─── SEEDING TAB ──────────────────────────────────────────────────────────── */
function SeedingTab(props) {
  var evs = props.evs, allEntries = props.allEntries, setEntries = props.setEntries, athletes = props.athletes;
  var [seededIds, setSeededIds] = useState({});

  function doSeedAll() {
    var updated = allEntries.slice();
    evs.forEach(function(ev) {
      var evEntries = updated.filter(function(e) { return e.evid === ev.id; });
      var seeded = seedEvent(ev, evEntries);
      updated = updated.map(function(e) {
        var s = seeded.find(function(x) { return x.id === e.id; });
        return s || e;
      });
    });
    setEntries(updated);
    var newIds = {};
    evs.forEach(function(ev) { newIds[ev.id] = true; });
    setSeededIds(newIds);
  }

  function doSeedOne(ev) {
    var evEntries = allEntries.filter(function(e) { return e.evid === ev.id; });
    var seeded = seedEvent(ev, evEntries);
    setEntries(allEntries.map(function(e) {
      var s = seeded.find(function(x) { return x.id === e.id; });
      return s || e;
    }));
    setSeededIds(function(p) { return Object.assign({}, p, {[ev.id]: true}); });
  }

  if (evs.length === 0) return <div className="empty"><Shuffle size={38}/><p>Add events in the Events tab first</p></div>;

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,gap:12}}>
        <div>
          <div style={{fontSize:13,fontWeight:500,marginBottom:3}}>Auto-Seed All Events</div>
          <div style={{fontSize:11,color:'var(--t2)'}}>Assigns heats and lanes based on seed marks. Center-out lane seeding for track; flight grouping for field.</div>
        </div>
        <button className="btn bp" onClick={doSeedAll} style={{flexShrink:0}}><Shuffle size={13}/>Seed All</button>
      </div>
      {evs.map(function(ev) {
        var evEntries = allEntries.filter(function(e) { return e.evid === ev.id && !e.scratched; });
        var isF = isFieldEvent(ev.cat);
        var heats = Array.from(new Set(evEntries.map(function(e) { return e.heat; }).filter(Boolean))).sort(function(a, b) { return a - b; });
        var LABEL = isF ? 'Flt' : 'Heat';
        return (
          <div key={ev.id} className="evc" style={{marginBottom:10}}>
            <div style={{display:'flex',alignItems:'center',gap:10,padding:'11px 14px',borderBottom:'1px solid var(--b1)'}}>
              <div className={'evdot ' + (ev.status || 'pending')}/>
              <div className="evtitle">{ev.name}</div>
              <span className="bdg nt">{gLabel(ev.g)}{ev.ag ? ' · ' + ev.ag : ''}</span>
              <span className="bdg nt">{evEntries.length} athletes</span>
              {seededIds[ev.id] && <span className="bdg gn">Seeded</span>}
              <button className="btn bg" style={{fontSize:11,marginLeft:'auto'}} onClick={function() { doSeedOne(ev); }}>
                <Shuffle size={11}/>{isF ? 'Flights' : 'Heats'}
              </button>
            </div>
            {evEntries.length === 0 ? (
              <div style={{padding:'12px 14px',fontSize:12,color:'var(--t3)'}}>No entries yet</div>
            ) : heats.length === 0 ? (
              <table className="tbl">
                <thead><tr><th>Athlete</th><th>Team</th><th>Seed</th><th style={{color:'var(--t3)'}}>Heat</th><th style={{color:'var(--t3)'}}>Lane</th></tr></thead>
                <tbody>{evEntries.map(function(en) {
                  var av = entryAvatar(en, athletes);
                  return (
                    <tr key={en.id}>
                      <td><div style={{display:'flex',alignItems:'center',gap:7}}><div className={'av ' + av.cls} style={{width:22,height:22,fontSize:9}}>{av.init}</div>{entryName(en, athletes)}</div></td>
                      <td style={{color:'var(--t2)',fontSize:11}}>{entryTeam(en, athletes) || '—'}</td>
                      <td style={{fontFamily:'var(--fd)',fontSize:13,color:'var(--t2)'}}>{en.seed || '—'}</td>
                      <td style={{color:'var(--t3)'}}>—</td>
                      <td style={{color:'var(--t3)'}}>—</td>
                    </tr>
                  );
                })}</tbody>
              </table>
            ) : (
              heats.map(function(h) {
                var hEntries = evEntries.filter(function(e) { return e.heat === h; }).sort(function(a, b) { return (a.lane || 0) - (b.lane || 0); });
                return (
                  <div key={h}>
                    <div className="heat-label"><span>{LABEL} {h}</span><span style={{fontWeight:400,fontSize:11}}>{hEntries.length} athletes</span></div>
                    <table className="tbl">
                      <thead><tr><th style={{width:44}}>{isF ? 'Pos' : 'Lane'}</th><th>Athlete</th><th>Team</th><th>Seed</th></tr></thead>
                      <tbody>{hEntries.map(function(en) {
                        var av = entryAvatar(en, athletes);
                        return (
                          <tr key={en.id}>
                            <td style={{fontFamily:'var(--fd)',fontSize:16,fontWeight:700,color:'var(--acc)'}}>{en.lane || '—'}</td>
                            <td><div style={{display:'flex',alignItems:'center',gap:7}}><div className={'av ' + av.cls} style={{width:22,height:22,fontSize:9}}>{av.init}</div>{entryName(en, athletes)}</div></td>
                            <td style={{color:'var(--t2)',fontSize:11}}>{entryTeam(en, athletes) || '—'}</td>
                            <td style={{fontFamily:'var(--fd)',fontSize:13,color:'var(--t2)'}}>{en.seed || '—'}</td>
                          </tr>
                        );
                      })}</tbody>
                    </table>
                  </div>
                );
              })
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── RESULTS TAB ──────────────────────────────────────────────────────────── */
function ResultsTab(props) {
  var evs = props.evs, allEntries = props.allEntries, results = props.results;
  var setResults = props.setResults, setEvs = props.setEvs, setEntries = props.setEntries;
  var athletes = props.athletes, prMap = props.prMap;
  var [openEvIds, setOpenEvIds] = useState({});

  function toggleEv(id) { setOpenEvIds(function(p) { var n = Object.assign({}, p); n[id] = !n[id]; return n; }); }
  function isOpen(id) { return openEvIds[id] !== false; }

  function setStatus(evId, status) {
    setEvs(function(p) { return p.map(function(e) { return e.id === evId ? Object.assign({}, e, {status: status}) : e; }); });
  }
  function updResult(eid, patch) {
    setResults(function(p) {
      var x = p.find(function(r) { return r.eid === eid; });
      if (x) return p.map(function(r) { return r.eid === eid ? Object.assign({}, r, patch) : r; });
      return p.concat([Object.assign({id: uid(), eid: eid}, patch)]);
    });
  }
  function togFlag(eid, flag) {
    setResults(function(p) {
      var x = p.find(function(r) { return r.eid === eid; }) || {};
      var flags = {dns: false, dnf: false, dq: false};
      var upd = Object.assign({}, x, flags, {[flag]: !x[flag], place: !x[flag] ? '' : x.place});
      var exists = p.find(function(r) { return r.eid === eid; });
      return exists ? p.map(function(r) { return r.eid === eid ? upd : r; }) : p.concat([Object.assign({id: uid(), eid: eid}, upd)]);
    });
  }
  function doAutoRank(ev) {
    var evEntries = allEntries.filter(function(e) { return e.evid === ev.id; });
    setResults(autoRank(ev, evEntries, results));
  }
  function updAttempt(eid, i, val) {
    setEntries(function(p) {
      return p.map(function(e) {
        if (e.id !== eid) return e;
        var atts = (e.attempts || []).slice();
        atts[i] = Object.assign({}, atts[i] || {}, {mark: val});
        var best = atts.filter(function(a) { return a.mark && !a.foul; }).reduce(function(b, a) {
          return parseMark(a.mark, 'field') > parseMark((b && b.mark) || '0', 'field') ? a : b;
        }, null);
        if (best) updResult(eid, {mark: best.mark});
        return Object.assign({}, e, {attempts: atts});
      });
    });
  }

  if (evs.length === 0) return <div className="empty"><Trophy size={38}/><p>Add events in the Events tab first</p></div>;

  var STATUS_COLORS = {pending: 'var(--t3)', running: 'var(--grn)', complete: 'var(--acc)'};

  return (
    <div>
      <div style={{fontSize:11,color:'var(--t2)',marginBottom:14}}>
        Enter marks in the table. Click <strong>Auto-Rank</strong> to sort by mark and assign places. <span style={{color:'var(--gld)'}}>★ PR</span> = personal best.
      </div>
      {evs.map(function(ev) {
        var evEntries = allEntries.filter(function(e) { return e.evid === ev.id; });
        var active = evEntries.filter(function(e) { return !e.scratched; });
        var withResult = active.filter(function(e) { return results.some(function(r) { return r.eid === e.id && r.mark; }); }).length;
        var isF = isFieldEvent(ev.cat);
        var open = isOpen(ev.id);
        var evStatus = ev.status || 'pending';

        return (
          <div key={ev.id} className="evc">
            <div className="evh">
              <div className={'evdot ' + evStatus}/>
              <div className="evtitle" onClick={function() { toggleEv(ev.id); }}>{ev.name}</div>
              <span className="bdg nt">{gLabel(ev.g)}{ev.ag ? ' · ' + ev.ag : ''}</span>
              <span style={{fontSize:11,color:'var(--t2)'}}>{withResult}/{active.length} results</span>
              <div style={{display:'flex',gap:3,marginLeft:8}} onClick={function(e) { e.stopPropagation(); }}>
                {['pending','running','complete'].map(function(s) {
                  return (
                    <button key={s} className="btn bg" style={{fontSize:10,padding:'3px 8px',color: evStatus === s ? STATUS_COLORS[s] : 'var(--t3)',borderColor: evStatus === s ? STATUS_COLORS[s] : 'var(--b1)'}} onClick={function() { setStatus(ev.id, s); }}>
                      {s === 'pending' ? 'Pending' : s === 'running' ? '▶ Running' : '✓ Done'}
                    </button>
                  );
                })}
                <button className="btn bgrn" style={{fontSize:11,padding:'4px 10px'}} onClick={function() { doAutoRank(ev); }}><RefreshCw size={11}/>Auto-Rank</button>
              </div>
              <div onClick={function() { toggleEv(ev.id); }}>
                {open ? <ChevronUp size={12} style={{color:'var(--t3)'}}/> : <ChevronDown size={12} style={{color:'var(--t3)'}}/>}
              </div>
            </div>
            {open && (
              active.length === 0 ? <div style={{padding:'14px',fontSize:12,color:'var(--t3)'}}>No entries</div> : (
                <div style={{overflowX:'auto'}}>
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th style={{width:32}}>Pl.</th>
                        <th style={{width:36}}>Ht</th>
                        <th style={{width:36}}>Ln</th>
                        <th>Athlete</th>
                        <th>Team</th>
                        {isF ? <th style={{minWidth:240}}>Attempts (best auto-selects)</th> : <th style={{width:72}}>Mark</th>}
                        {!isF && <th style={{width:52}}>Wind</th>}
                        <th>Flags</th>
                      </tr>
                    </thead>
                    <tbody>
                      {active.slice().sort(function(a, b) {
                        var ra = results.find(function(r) { return r.eid === a.id; });
                        var rb = results.find(function(r) { return r.eid === b.id; });
                        var pa = parseInt((ra && ra.place) || '999');
                        var pb = parseInt((rb && rb.place) || '999');
                        if (pa !== pb) return pa - pb;
                        return (a.heat || 0) - (b.heat || 0) || (a.lane || 0) - (b.lane || 0);
                      }).map(function(en) {
                        var r = results.find(function(x) { return x.eid === en.id; }) || {};
                        var av = entryAvatar(en, athletes);
                        var isDnx = r.dns || r.dnf || r.dq;
                        var prKey = en.aid + '_' + ev.name;
                        var isPR = en.aid && prMap[prKey] && prMap[prKey].eid === r.id;
                        var placeN = parseInt(r.place);
                        var placeCls = placeN === 1 ? 'p1' : placeN === 2 ? 'p2' : placeN === 3 ? 'p3' : 'pn';
                        var attempts = en.attempts || [];
                        return (
                          <tr key={en.id} style={{opacity: isDnx ? .5 : 1, background: isPR ? 'rgba(245,158,11,.05)' : ''}}>
                            <td>
                              {r.place ? <div className={'pb ' + placeCls}>{r.place}</div> : <span style={{color:'var(--t3)',fontSize:11}}>—</span>}
                            </td>
                            <td style={{color:'var(--t2)',fontFamily:'var(--fd)',fontSize:13}}>{en.heat || '—'}</td>
                            <td style={{color:'var(--t2)',fontFamily:'var(--fd)',fontSize:14,fontWeight:600}}>{en.lane || '—'}</td>
                            <td>
                              <div style={{display:'flex',alignItems:'center',gap:7}}>
                                <div className={'av ' + av.cls} style={{width:24,height:24,fontSize:9}}>{av.init}</div>
                                <div>
                                  <div style={{fontWeight:500,fontSize:12}}>{entryName(en, athletes)}</div>
                                  {isPR && <span className="pr-badge"><Star size={8}/>PR</span>}
                                </div>
                              </div>
                            </td>
                            <td style={{fontSize:11,color:'var(--t2)'}}>{entryTeam(en, athletes) || '—'}</td>
                            {isF ? (
                              <td>
                                <div style={{display:'flex',gap:4,alignItems:'center',flexWrap:'wrap'}}>
                                  {[0,1,2,3,4,5].map(function(i) {
                                    var att = attempts[i] || {};
                                    var isBest = r.mark && att.mark === r.mark;
                                    return (
                                      <input key={i} className={'att-inp' + (isBest ? ' best' : '')} value={att.mark || ''} placeholder={'#' + (i+1)} disabled={isDnx}
                                        onChange={function(e) { updAttempt(en.id, i, e.target.value); }}/>
                                    );
                                  })}
                                </div>
                              </td>
                            ) : (
                              <td><input className="rinp" style={{width:64}} value={r.mark || ''} onChange={function(e) { updResult(en.id, {mark: e.target.value}); }} placeholder="12.34" disabled={isDnx}/></td>
                            )}
                            {!isF && <td><input className="rinp" style={{width:44}} value={r.wind || ''} onChange={function(e) { updResult(en.id, {wind: e.target.value}); }} placeholder="+0.0" disabled={isDnx}/></td>}
                            <td>
                              <div style={{display:'flex',gap:3}}>
                                {['dns','dnf','dq'].map(function(flag) {
                                  return <button key={flag} className={'fb ' + (r[flag] ? 'fb-on' : 'fb-off')} onClick={function() { togFlag(en.id, flag); }}>{flag.toUpperCase()}</button>;
                                })}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── HEAT SHEET VIEW (subcomponent, replaces IIFE) ───────────────────────── */
function HeatSheetView(props) {
  var ev = props.ev, entries = props.entries, athletes = props.athletes;
  var evEntries = entries.filter(function(e) { return e.evid === ev.id && !e.scratched; });
  var heats = Array.from(new Set(evEntries.map(function(e) { return e.heat; }).filter(Boolean))).sort(function(a, b) { return a - b; });
  var unseated = evEntries.filter(function(e) { return !e.heat; });
  var isF = isFieldEvent(ev.cat);
  var LABEL = isF ? 'FLIGHT' : 'HEAT';
  return (
    <div style={{background:'var(--bgc)',border:'1px solid var(--b1)',borderRadius:10,overflow:'hidden'}}>
      <div style={{padding:'16px 18px',borderBottom:'1px solid var(--b1)',background:'var(--bg3)'}}>
        <div style={{fontFamily:'var(--fd)',fontSize:22,fontWeight:700,letterSpacing:'.06em'}}>{ev.name}</div>
        <div style={{fontSize:12,color:'var(--t2)',marginTop:4,display:'flex',gap:10,flexWrap:'wrap'}}>
          <span>{gLabel(ev.g)}{ev.ag ? ' · ' + ev.ag : ''}</span>
          <span>{ev.round.charAt(0).toUpperCase() + ev.round.slice(1)}</span>
          {ev.scheduled_time && <span>🕐 {ev.scheduled_time}</span>}
          <span>{evEntries.length} athlete{evEntries.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
      {heats.length === 0 && unseated.length === 0 && (
        <div style={{padding:'16px',fontSize:12,color:'var(--t3)'}}>No entries yet. Add entries and run seeding first.</div>
      )}
      {unseated.length > 0 && (
        <div>
          <div className="heat-label"><span>Unseeded</span></div>
          <table className="tbl">
            <thead><tr><th>Athlete</th><th>Team</th><th>Seed</th></tr></thead>
            <tbody>{unseated.map(function(en) {
              var av = entryAvatar(en, athletes);
              return (
                <tr key={en.id}>
                  <td><div style={{display:'flex',alignItems:'center',gap:7}}><div className={'av ' + av.cls} style={{width:22,height:22,fontSize:9}}>{av.init}</div>{entryName(en, athletes)}</div></td>
                  <td style={{color:'var(--t2)',fontSize:11}}>{entryTeam(en, athletes) || '—'}</td>
                  <td style={{fontFamily:'var(--fd)',fontSize:13,color:'var(--t2)'}}>{en.seed || '—'}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}
      {heats.map(function(h) {
        var hEntries = evEntries.filter(function(e) { return e.heat === h; }).sort(function(a, b) { return (a.lane || 0) - (b.lane || 0); });
        return (
          <div key={h}>
            <div className="heat-label"><span>{LABEL} {h}</span><span style={{fontWeight:400,fontSize:11}}>{hEntries.length} athlete{hEntries.length !== 1 ? 's' : ''}</span></div>
            <table className="tbl">
              <thead><tr><th style={{width:48}}>{isF ? 'Pos' : 'Lane'}</th><th>Athlete</th><th>Team</th><th>Seed</th>{!isF && <th>Wind</th>}</tr></thead>
              <tbody>{hEntries.map(function(en) {
                var av = entryAvatar(en, athletes);
                return (
                  <tr key={en.id}>
                    <td style={{fontFamily:'var(--fd)',fontSize:18,fontWeight:700,color:'var(--acc)'}}>{en.lane || '—'}</td>
                    <td><div style={{display:'flex',alignItems:'center',gap:7}}><div className={'av ' + av.cls} style={{width:22,height:22,fontSize:9}}>{av.init}</div><span style={{fontWeight:500}}>{entryName(en, athletes)}</span></div></td>
                    <td style={{color:'var(--t2)',fontSize:11}}>{entryTeam(en, athletes) || 'Home'}</td>
                    <td style={{fontFamily:'var(--fd)',fontSize:14,color:'var(--t2)'}}>{en.seed || '—'}</td>
                    {!isF && <td/>}
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

/* ─── RESULTS VIEW (subcomponent) ─────────────────────────────────────────── */
function ResultsView(props) {
  var ev = props.ev, entries = props.entries, results = props.results, athletes = props.athletes;
  var evEntries = entries.filter(function(e) { return e.evid === ev.id && !e.scratched; });
  var withResults = evEntries.map(function(en) { return {en: en, r: results.find(function(x) { return x.eid === en.id; }) || {}}; });
  var ranked = withResults.filter(function(x) { return x.r.place; }).sort(function(a, b) { return parseInt(a.r.place) - parseInt(b.r.place); });
  var dnx = withResults.filter(function(x) { return x.r.dns || x.r.dnf || x.r.dq; });
  var noResult = withResults.filter(function(x) { return !x.r.place && !x.r.dns && !x.r.dnf && !x.r.dq; });
  return (
    <div style={{background:'var(--bgc)',border:'1px solid var(--b1)',borderRadius:10,overflow:'hidden'}}>
      <div style={{padding:'14px 18px',borderBottom:'1px solid var(--b1)',background:'var(--bg3)'}}>
        <div style={{fontFamily:'var(--fd)',fontSize:20,fontWeight:700,letterSpacing:'.06em'}}>{ev.name} — Results</div>
        <div style={{fontSize:12,color:'var(--t2)',marginTop:3}}>{gLabel(ev.g)}{ev.ag ? ' · ' + ev.ag : ''} · {ev.round}</div>
      </div>
      {ranked.length === 0 && noResult.length === 0 && dnx.length === 0 && (
        <div style={{padding:'14px',fontSize:12,color:'var(--t3)'}}>No results entered yet.</div>
      )}
      {ranked.map(function(x) {
        var en = x.en, r = x.r;
        var av = entryAvatar(en, athletes);
        var pn = parseInt(r.place);
        var pcls = pn === 1 ? 'p1' : pn === 2 ? 'p2' : pn === 3 ? 'p3' : 'pn';
        return (
          <div key={en.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 16px',borderBottom:'1px solid var(--b1)'}}>
            <div className={'pb ' + pcls} style={{width:28,height:28}}>{r.place}</div>
            <div className={'av ' + av.cls} style={{width:26,height:26,fontSize:9}}>{av.init}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:500,fontSize:13}}>{entryName(en, athletes)}</div>
              <div style={{fontSize:10,color:'var(--t2)'}}>{entryTeam(en, athletes) || 'Home'}</div>
            </div>
            <div style={{fontFamily:'var(--fd)',fontSize:18,fontWeight:700,color:'var(--acc)'}}>{r.mark}</div>
            {r.wind && <div style={{fontSize:11,color:'var(--t2)'}}>{r.wind}</div>}
          </div>
        );
      })}
      {dnx.map(function(x) {
        var en = x.en, r = x.r;
        var flag = r.dns ? 'DNS' : r.dnf ? 'DNF' : 'DQ';
        return (
          <div key={en.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 16px',borderBottom:'1px solid var(--b1)',opacity:.5}}>
            <div className="pb pn" style={{width:28,height:28,fontSize:9}}>{flag}</div>
            <div className="av avg" style={{width:26,height:26,fontSize:9}}>{entryAvatar(en, athletes).init}</div>
            <div style={{flex:1,fontSize:13}}>{entryName(en, athletes)}</div>
          </div>
        );
      })}
      {noResult.length > 0 && (
        <div style={{padding:'10px 14px',fontSize:11,color:'var(--t3)'}}>+ {noResult.length} athlete{noResult.length > 1 ? 's' : ''} without result</div>
      )}
    </div>
  );
}

/* ─── PRINT SHEET CONTENT ──────────────────────────────────────────────────── */
function PrintSheetContent(props) {
  var ev = props.ev, entries = props.entries, results = props.results;
  var athletes = props.athletes, meet = props.meet;
  var isF = isFieldEvent(ev.cat);
  var evEntries = entries.filter(function(e) { return e.evid === ev.id && !e.scratched; });
  var heats = Array.from(new Set(evEntries.map(function(e) { return e.heat; }).filter(Boolean))).sort(function(a, b) { return a - b; });
  var unseated = evEntries.filter(function(e) { return !e.heat; });
  var LABEL = isF ? 'Flight' : 'Heat';
  var d = meet ? fmtDate(meet.date) : null;
  var totalH = heats.length || (unseated.length > 0 ? 1 : 0);

  function HeatTable(hProps) {
    var hEntries = hProps.hEntries, hNum = hProps.hNum;
    var sorted = hEntries.slice().sort(function(a, b) { return (a.lane || 0) - (b.lane || 0); });
    if (isF) {
      return (
        <div className={hNum > 1 ? 'pbreak' : ''}>
          <div className="ps-ht-hdr">
            <span>{LABEL} {hNum} <span style={{fontSize:'9pt',fontWeight:400}}>of {totalH}</span></span>
            <span>{hEntries.length} athlete{hEntries.length !== 1 ? 's' : ''}</span>
          </div>
          <table className="ps-tbl">
            <thead>
              <tr>
                <th style={{width:34}}>Pos.</th>
                <th className="left" style={{width:'22%'}}>Athlete</th>
                <th className="left" style={{width:'14%'}}>Team</th>
                <th style={{width:52}}>Seed</th>
                <th style={{width:52}}>Att 1</th>
                <th style={{width:52}}>Att 2</th>
                <th style={{width:52}}>Att 3</th>
                <th style={{width:52}}>Att 4</th>
                <th style={{width:52}}>Att 5</th>
                <th style={{width:52}}>Att 6</th>
                <th style={{width:56}}>Best</th>
                <th style={{width:36}}>Pl.</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(function(en) {
                var a = athletes.find(function(x) { return x.id === en.aid; });
                var name = a ? (a.ln + ', ' + a.fn) : (en.gname || 'Guest');
                var team = a ? 'Home' : (en.gteam || '');
                return (
                  <tr key={en.id}>
                    <td className="num">{en.lane || '—'}</td>
                    <td><strong>{name}</strong></td>
                    <td style={{fontSize:'9pt',color:'#555'}}>{team}</td>
                    <td className="seed">{en.seed || '—'}</td>
                    <td className="wi"></td>
                    <td className="wi"></td>
                    <td className="wi"></td>
                    <td className="wi"></td>
                    <td className="wi"></td>
                    <td className="wi"></td>
                    <td className="wi"></td>
                    <td className="wi"></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }
    return (
      <div className={hNum > 1 ? 'pbreak' : ''}>
        <div className="ps-ht-hdr">
          <span>{LABEL} {hNum} <span style={{fontSize:'9pt',fontWeight:400}}>of {totalH}</span></span>
          <span>{hEntries.length} athlete{hEntries.length !== 1 ? 's' : ''}{'  '}Wind Reading: ___________</span>
        </div>
        <table className="ps-tbl">
          <thead>
            <tr>
              <th style={{width:42}}>Lane</th>
              <th style={{width:36}}>Bib</th>
              <th className="left">Athlete</th>
              <th className="left" style={{width:'16%'}}>Team</th>
              <th style={{width:58}}>Seed</th>
              <th style={{width:110}}>Final Time</th>
              <th style={{width:50}}>Wind</th>
              <th style={{width:38}}>Pl.</th>
              <th className="left" style={{width:'14%'}}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(function(en) {
              var a = athletes.find(function(x) { return x.id === en.aid; });
              var name = a ? (a.ln + ', ' + a.fn) : (en.gname || 'Guest');
              var team = a ? 'Home' : (en.gteam || '');
              var bib = a ? (a.num || '') : '';
              return (
                <tr key={en.id}>
                  <td className="num">{en.lane || '—'}</td>
                  <td className="seed">{bib}</td>
                  <td><strong>{name}</strong></td>
                  <td style={{fontSize:'9pt',color:'#555'}}>{team}</td>
                  <td className="seed">{en.seed || '—'}</td>
                  <td className="wi"></td>
                  <td className="wi"></td>
                  <td className="wi"></td>
                  <td></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div>
      <div className="ps-hdr">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div className="ps-club">Pegasus Track</div>
          <div style={{textAlign:'right',fontFamily:'Arial,sans-serif',fontSize:'9pt',color:'#555'}}>
            <div style={{fontWeight:700}}>FINISH LINE RECORDING FORM</div>
            {d && <div>{d.full}</div>}
          </div>
        </div>
        <div className="ps-meetinfo">
          {meet && <span><strong>Meet:</strong> {meet.name}</span>}
          {meet && meet.loc && <span><strong>Location:</strong> {meet.loc}</span>}
          {d && <span><strong>Date:</strong> {d.full}</span>}
        </div>
      </div>
      <div className="ps-evtitle">{ev.name}</div>
      <div className="ps-evmeta">
        <span><strong>Gender:</strong> {gLabel(ev.g)}{ev.ag ? ' — ' + ev.ag : ''}</span>
        <span><strong>Round:</strong> {ev.round.charAt(0).toUpperCase() + ev.round.slice(1)}</span>
        <span><strong>Type:</strong> {isF ? 'Field' : ev.cat === 'relay' ? 'Relay' : 'Track'}</span>
        {ev.scheduled_time && <span><strong>Scheduled:</strong> {ev.scheduled_time}</span>}
        <span><strong>Total {LABEL}s:</strong> {totalH}</span>
      </div>
      {heats.length === 0 && unseated.length === 0 && (
        <div style={{padding:'20px',border:'1px solid #ccc',borderRadius:4,color:'#888',textAlign:'center',fontSize:'10pt'}}>
          No entries found for this event. Add entries and run seeding first.
        </div>
      )}
      {unseated.length > 0 && <HeatTable hEntries={unseated} hNum={0}/>}
      {heats.map(function(h, i) {
        var hEntries = evEntries.filter(function(e) { return e.heat === h; });
        return <HeatTable key={h} hEntries={hEntries} hNum={h}/>;
      })}
      <div className="ps-footer">
        <div className="ps-sig-row">
          <div className="ps-sig">
            <div className="ps-sig-lbl">{isF ? 'Chief Field Judge' : 'Finish Judge / Head Timer'}</div>
            <div className="ps-sig-line"/>
          </div>
          <div className="ps-sig">
            <div className="ps-sig-lbl">{isF ? 'Assistant Judge' : 'Starter'}</div>
            <div className="ps-sig-line"/>
          </div>
          <div className="ps-sig">
            <div className="ps-sig-lbl">Signature / Date</div>
            <div className="ps-sig-line"/>
          </div>
        </div>
        <div className="ps-note">
          {isF
            ? 'Record each attempt. Mark X for foul/pass. Circle the best legal mark. Confirm places before submitting.'
            : 'Record times to nearest .01s or .001s per timing system. Circle final place. DNS = Did Not Start, DNF = Did Not Finish, DQ = Disqualified.'}
        </div>
      </div>
    </div>
  );
}

/* ─── PRINT REPORT MODAL ───────────────────────────────────────────────────── */
var PRINT_CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Times New Roman',Times,serif;color:#111;background:white}
  .ps-hdr{border-bottom:3px double #333;padding-bottom:8px;margin-bottom:12px}
  .ps-club{font-family:Arial,sans-serif;font-size:19pt;font-weight:900;letter-spacing:3px;text-transform:uppercase}
  .ps-meetinfo{font-size:9pt;color:#444;margin-top:3px;display:flex;gap:24px;flex-wrap:wrap}
  .ps-evtitle{font-size:15pt;font-weight:700;margin:10px 0 2px;font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:1px}
  .ps-evmeta{font-size:9.5pt;color:#444;margin-bottom:12px;display:flex;gap:16px;flex-wrap:wrap}
  .ps-ht-hdr{font-family:Arial,sans-serif;font-size:12pt;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;border-bottom:1.5px solid #555;padding-bottom:4px;margin:14px 0 6px;display:flex;justify-content:space-between;align-items:baseline}
  .ps-ht-hdr span{font-size:9pt;font-weight:400;font-family:'Times New Roman',serif;letter-spacing:0}
  .ps-tbl{width:100%;border-collapse:collapse;font-size:10pt}
  .ps-tbl th{background:#e8e8e8;border:1px solid #888;padding:4px 6px;text-align:center;font-family:Arial,sans-serif;font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
  .ps-tbl th.left{text-align:left}
  .ps-tbl td{border:1px solid #aaa;padding:5px 6px;height:26px;font-size:10pt;vertical-align:middle}
  .ps-tbl td.wi{background:#fffde7}
  .ps-tbl td.num{text-align:center;font-family:Arial,sans-serif;font-weight:700;font-size:13pt}
  .ps-tbl td.seed{text-align:center;font-family:'Courier New',monospace;font-size:10pt;color:#444}
  .ps-footer{margin-top:20px;border-top:1.5px solid #333;padding-top:10px;font-size:9pt;font-family:Arial,sans-serif}
  .ps-sig-row{display:flex;gap:32px;margin-bottom:10px;flex-wrap:wrap}
  .ps-sig{flex:1;min-width:200px}
  .ps-sig-lbl{font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#333}
  .ps-sig-line{border-bottom:1px solid #333;margin-top:14px;width:100%}
  .ps-note{font-size:8pt;color:#666;margin-top:8px;font-style:italic}
  .pbreak{page-break-before:always}
  @page{size:letter portrait;margin:.5in}
`;

async function handlePrint(contentEl, isLandscape) {
  if (!contentEl) return;
  var pad = isLandscape ? '.4in' : '.5in';
  var html = '<div style="padding:' + pad + ';box-sizing:border-box">' + contentEl.innerHTML + '</div>';
  if (window.electronAPI && window.electronAPI.printSheet) {
    await window.electronAPI.printSheet({ html: html, css: PRINT_CSS, landscape: isLandscape });
  } else {
    var pageRule = isLandscape ? '@page{size:letter landscape;margin:.4in}' : '@page{size:letter portrait;margin:.5in}';
    var win = window.open('', '_blank');
    if (!win) return;
    win.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><style>' + PRINT_CSS + pageRule + '</style></head><body>' + html + '</body></html>');
    win.document.close();
    win.focus();
    win.print();
    win.close();
  }
}

function PrintReportModal(props) {
  var ev = props.ev, entries = props.entries, results = props.results;
  var athletes = props.athletes, meet = props.meet, onClose = props.onClose;
  var isF = isFieldEvent(ev.cat);
  var printRef = useRef(null);
  return (
    <>
      <div className="pv-wrap">
        <div className="pv-bar">
          <button className="btn bg" onClick={onClose}><ArrowLeft size={13}/>Close Preview</button>
          <div style={{flex:1,fontFamily:'var(--fd)',fontSize:14,fontWeight:600,letterSpacing:'.06em',textAlign:'center'}}>
            PRINT PREVIEW — {ev.name} {isF ? '(Landscape)' : '(Portrait)'}
          </div>
          <button className="btn bp" onClick={function() { handlePrint(printRef.current, isF); }}><Download size={13}/>Print / Save PDF</button>
        </div>
        <div className="pv-scroll">
          <div className={'ps-page' + (isF ? ' landscape' : '')}>
            <PrintSheetContent ev={ev} entries={entries} results={results} athletes={athletes} meet={meet}/>
          </div>
        </div>
      </div>
      <div ref={printRef} style={{display:'none'}}>
        <PrintSheetContent ev={ev} entries={entries} results={results} athletes={athletes} meet={meet}/>
      </div>
    </>
  );
}

/* ─── REPORTS TAB ──────────────────────────────────────────────────────────── */
function ReportsTab(props) {
  var evs = props.evs, entries = props.entries, results = props.results, athletes = props.athletes;
  var meet = props.meet;
  var [view, setView] = useState('heatsheet');
  var [selEvId, setSelEvId] = useState(evs.length > 0 ? evs[0].id : null);
  var [printing, setPrinting] = useState(false);
  var ev = evs.find(function(e) { return e.id === selEvId; });
  var scores = computeTeamScores(entries, results);

  if (printing && ev) {
    return <PrintReportModal ev={ev} entries={entries} results={results} athletes={athletes} meet={meet} onClose={function() { setPrinting(false); }}/>;
  }

  return (
    <div>
      <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
        {[{id:'heatsheet',label:'Heat Sheet',Icon:List},{id:'results',label:'Results',Icon:Trophy},{id:'scores',label:'Team Scores',Icon:Award}].map(function(v) {
          return (
            <button key={v.id} className={view === v.id ? 'btn bp' : 'btn bg'} style={{fontSize:11}} onClick={function() { setView(v.id); }}>
              <v.Icon size={12}/>{v.label}
            </button>
          );
        })}
        <div style={{marginLeft:'auto'}}>
          <button className="btn bgld" style={{fontSize:11}} disabled={!ev} onClick={function() { setPrinting(true); }}>
            <Download size={12}/>Print Sheet
          </button>
        </div>
      </div>

      {(view === 'heatsheet' || view === 'results') && evs.length > 0 && (
        <div style={{marginBottom:14}}>
          <select className="inp" value={selEvId || ''} onChange={function(e) { setSelEvId(e.target.value); }} style={{width:'100%',maxWidth:380}}>
            {evs.map(function(e) {
              return <option key={e.id} value={e.id}>{e.name} · {gLabel(e.g)}{e.ag ? ' · ' + e.ag : ''}</option>;
            })}
          </select>
        </div>
      )}

      {view === 'heatsheet' && ev && <HeatSheetView ev={ev} entries={entries} athletes={athletes}/>}
      {view === 'results' && ev && <ResultsView ev={ev} entries={entries} results={results} athletes={athletes}/>}
      {view === 'scores' && (
        <div>
          <div style={{fontSize:11,color:'var(--t2)',marginBottom:12}}>Points: 1st=8, 2nd=6, 3rd=5, 4th=4, 5th=3, 6th=2, 7th=1</div>
          {scores.length === 0 ? (
            <div className="empty" style={{padding:'32px'}}><Award size={36}/><p>No results with places yet</p></div>
          ) : (
            <div style={{background:'var(--bgc)',border:'1px solid var(--b1)',borderRadius:10,overflow:'hidden'}}>
              {scores.map(function(item, i) {
                var pcls = i === 0 ? 'p1' : i === 1 ? 'p2' : i === 2 ? 'p3' : 'pn';
                return (
                  <div key={item.team} style={{display:'flex',alignItems:'center',gap:14,padding:'12px 16px',borderBottom:'1px solid var(--b1)'}}>
                    <div className={'pb ' + pcls} style={{width:26,height:26}}>{i+1}</div>
                    <div style={{flex:1,fontWeight:500,fontSize:14}}>{item.team}</div>
                    <div style={{fontFamily:'var(--fd)',fontSize:24,fontWeight:700,color: i === 0 ? 'var(--gld)' : i === 1 ? 'var(--t2)' : 'var(--t1)'}}>{item.pts}</div>
                    <div style={{fontSize:11,color:'var(--t2)'}}>pts</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── MEET DETAIL ──────────────────────────────────────────────────────────── */
function MeetDetail(props) {
  var meet = props.meet, athletes = props.athletes;
  var me = props.me, en = props.en, re = props.re;
  var setMe = props.setMe, setEn = props.setEn, setRe = props.setRe;
  var onBack = props.onBack;
  var [tab, setTab] = useState('events');
  var evs = me.filter(function(e) { return e.mid === meet.id; }).sort(function(a, b) { return (a.order || 0) - (b.order || 0); });
  var d = fmtDate(meet.date);
  var sb = sbadge(meet.status);
  var prMap = computePRs(athletes, en, re, me, props.allMeets || [meet]);

  function setEvs(updater) {
    setMe(function(p) {
      var other = p.filter(function(e) { return e.mid !== meet.id; });
      var cur = p.filter(function(e) { return e.mid === meet.id; });
      var next = typeof updater === 'function' ? updater(cur) : updater;
      return other.concat(next);
    });
  }

  var pending = evs.filter(function(e) { return !e.status || e.status === 'pending'; }).length;
  var running = evs.filter(function(e) { return e.status === 'running'; }).length;
  var complete = evs.filter(function(e) { return e.status === 'complete'; }).length;
  var pct = evs.length > 0 ? Math.round((complete / evs.length) * 100) : 0;

  var TABS = [
    {id:'events', label:'Events & Entries', Icon:List},
    {id:'seeding', label:'Seeding', Icon:Shuffle},
    {id:'results', label:'Results', Icon:Trophy},
    {id:'reports', label:'Reports', Icon:FileText}
  ];

  return (
    <div className="page">
      <div style={{padding:'22px 28px 0'}}>
        <button className="back-btn" onClick={onBack}><ArrowLeft size={13}/>All Meets</button>
        <div style={{background:'var(--bgc)',border:'1px solid var(--b1)',borderRadius:12,padding:'18px 20px',marginBottom:20}}>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}>
            <div>
              <div style={{fontFamily:'var(--fd)',fontSize:26,fontWeight:700,letterSpacing:'.06em',marginBottom:7}}>{meet.name}</div>
              <div style={{display:'flex',gap:7,flexWrap:'wrap',alignItems:'center'}}>
                <span className={'bdg ' + sb.c}>{sb.l}</span>
                <span className="bdg nt" style={{textTransform:'capitalize'}}>{meet.type}</span>
                {meet.loc && <span style={{fontSize:11,color:'var(--t2)',display:'flex',alignItems:'center',gap:3}}><MapPin size={10}/>{meet.loc}</span>}
                <span style={{fontSize:11,color:'var(--t2)',display:'flex',alignItems:'center',gap:3}}><Clock size={10}/>{d.full}</span>
              </div>
            </div>
            {evs.length > 0 && (
              <div style={{background:'var(--bg3)',border:'1px solid var(--b1)',borderRadius:10,padding:'10px 14px',minWidth:200,flexShrink:0}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:7}}>
                  <span style={{fontSize:11,color:'var(--t2)'}}>Meet Progress</span>
                  <span style={{fontFamily:'var(--fd)',fontSize:14,fontWeight:600,color:'var(--acc)'}}>{pct}%</span>
                </div>
                <div style={{height:5,background:'var(--bg)',borderRadius:3,overflow:'hidden',marginBottom:8}}>
                  <div style={{height:'100%',background:'linear-gradient(90deg,var(--acc),var(--grn))',borderRadius:3,width: pct + '%',transition:'width .4s'}}/>
                </div>
                <div style={{display:'flex',gap:12,fontSize:10,color:'var(--t2)'}}>
                  {running > 0 && <span style={{color:'var(--grn)'}}>▶ {running} running</span>}
                  <span>⏳ {pending} pending</span>
                  <span style={{color:'var(--acc)'}}>✓ {complete} done</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="meet-tabs">
          {TABS.map(function(t) {
            return (
              <button key={t.id} className={'mtab' + (tab === t.id ? ' on' : '')} onClick={function() { setTab(t.id); }}>
                <t.Icon size={13}/>{t.label}
              </button>
            );
          })}
        </div>

        {tab === 'events' && (
          <EventsTab evs={evs} entries={en.filter(function(e) { return evs.some(function(ev) { return ev.id === e.evid; }); })} athletes={athletes} setEvs={setEvs} setEntries={setEn} mid={meet.id}/>
        )}
        {tab === 'seeding' && (
          <SeedingTab evs={evs} allEntries={en} setEntries={setEn} athletes={athletes}/>
        )}
        {tab === 'results' && (
          <ResultsTab evs={evs} allEntries={en} results={re} setResults={setRe} setEvs={setEvs} setEntries={setEn} athletes={athletes} prMap={prMap}/>
        )}
        {tab === 'reports' && (
          <ReportsTab evs={evs} entries={en} results={re} athletes={athletes} meet={meet}/>
        )}
      </div>
    </div>
  );
}

/* ─── MEETS LIST ───────────────────────────────────────────────────────────── */
function MeetForm(props) {
  var meet = props.meet, seasons = props.seasons, onSave = props.onSave, onClose = props.onClose;
  var [f, setF] = useState({
    name: meet ? meet.name : '', date: meet ? meet.date : '',
    loc: meet ? (meet.loc || '') : '', type: meet ? meet.type : 'invitational',
    status: meet ? meet.status : 'upcoming', sid: meet ? (meet.sid || '') : ''
  });
  var [er, setEr] = useState({});
  function set(k, v) { setF(function(p) { return Object.assign({}, p, {[k]: v}); }); setEr(function(e) { return Object.assign({}, e, {[k]: ''}); }); }
  function ok() {
    var e = {};
    if (!f.name.trim()) e.name = 'Required';
    if (!f.date) e.date = 'Required';
    setEr(e);
    return Object.keys(e).length === 0;
  }
  return (
    <div className="ov" onClick={function(e) { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mod" style={{maxWidth:440}}>
        <div className="mh">
          <div className="mt">{meet && meet.id ? 'Edit Meet' : 'Add Meet'}</div>
          <button className="btn bg bi" onClick={onClose}><X size={13}/></button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:11}}>
          <div className="fg">
            <label className="fl">Meet Name *</label>
            <input className="inp" value={f.name} onChange={function(e) { set('name', e.target.value); }} placeholder="Spring Invitational" autoFocus/>
            {er.name && <span className="fe">{er.name}</span>}
          </div>
          <div className="g2">
            <div className="fg">
              <label className="fl">Date *</label>
              <input className="inp" type="date" value={f.date} onChange={function(e) { set('date', e.target.value); }}/>
              {er.date && <span className="fe">{er.date}</span>}
            </div>
            <div className="fg">
              <label className="fl">Type</label>
              <select className="inp" value={f.type} onChange={function(e) { set('type', e.target.value); }}>
                {['invitational','dual','championship','home','away','time trial'].map(function(t) { return <option key={t}>{t}</option>; })}
              </select>
            </div>
          </div>
          <div className="fg">
            <label className="fl">Location</label>
            <input className="inp" value={f.loc} onChange={function(e) { set('loc', e.target.value); }} placeholder="Stadium, City"/>
          </div>
          <div className="g2">
            <div className="fg">
              <label className="fl">Status</label>
              <select className="inp" value={f.status} onChange={function(e) { set('status', e.target.value); }}>
                {['upcoming','active','completed','cancelled'].map(function(s) { return <option key={s}>{s}</option>; })}
              </select>
            </div>
            <div className="fg">
              <label className="fl">Season</label>
              <select className="inp" value={f.sid} onChange={function(e) { set('sid', e.target.value); }}>
                <option value="">None</option>
                {seasons.map(function(s) { return <option key={s.id} value={s.id}>{s.name}</option>; })}
              </select>
            </div>
          </div>
        </div>
        <div className="mf">
          <button className="btn bg" onClick={onClose}>Cancel</button>
          <button className="btn bp" onClick={function() { if (ok()) onSave(f); }}>{meet && meet.id ? 'Save' : 'Add Meet'}</button>
        </div>
      </div>
    </div>
  );
}

function Meets(props) {
  var meets = props.meets, setMeets = props.setMeets, seasons = props.seasons;
  var me = props.me, en = props.en, re = props.re;
  var setMe = props.setMe, setEn = props.setEn, setRe = props.setRe;
  var athletes = props.athletes;
  var [add, setAdd] = useState(false);
  var [ed, setEd] = useState(null);
  var [del, setDel] = useState(null);
  var [active, setActive] = useState(null);

  function doAdd(f) { setMeets(function(p) { return p.concat([Object.assign({id: uid()}, f)]); }); setAdd(false); }
  function doEd(f) { setMeets(function(p) { return p.map(function(m) { return m.id === ed.id ? Object.assign({}, m, f) : m; }); }); setEd(null); }
  function doDel() { setMeets(function(p) { return p.filter(function(m) { return m.id !== del.id; }); }); setDel(null); }
  function adv(m) {
    var next = {upcoming: 'active', active: 'completed'}[m.status];
    if (next) setMeets(function(p) { return p.map(function(x) { return x.id === m.id ? Object.assign({}, x, {status: next}) : x; }); });
  }

  if (active) {
    var cur = meets.find(function(m) { return m.id === active.id; }) || active;
    return <MeetDetail meet={cur} athletes={athletes} me={me} en={en} re={re} setMe={setMe} setEn={setEn} setRe={setRe} allMeets={meets} onBack={function() { setActive(null); }}/>;
  }

  var sorted = meets.slice().sort(function(a, b) { return a.date.localeCompare(b.date); });
  var up = sorted.filter(function(m) { return m.status === 'upcoming'; });
  var ac = sorted.filter(function(m) { return m.status === 'active'; });
  var pa = sorted.filter(function(m) { return m.status === 'completed' || m.status === 'cancelled'; }).reverse();

  function MeetRow(rProps) {
    var m = rProps.m;
    var d = fmtDate(m.date);
    var sb = sbadge(m.status);
    var ec = me.filter(function(e) { return e.mid === m.id; }).length;
    var evDone = me.filter(function(e) { return e.mid === m.id && e.status === 'complete'; }).length;
    var sn = seasons.find(function(x) { return x.id === m.sid; });
    return (
      <div className="mrow">
        <div className="mdb"><div className="mdbm">{d.mon}</div><div className="mbdd">{d.day}</div></div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:500,fontSize:13,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{m.name}</div>
          <div style={{fontSize:10,color:'var(--t2)',marginTop:2}}>
            {m.loc && m.loc + ' · '}{d.full}
            {sn && <span> · <span style={{color:'var(--acc)'}}>{sn.name}</span></span>}
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:5,flexShrink:0}}>
          <span className={'bdg ' + sb.c}>{sb.l}</span>
          {ec > 0 && <span className="bdg nt">{evDone > 0 ? evDone + '/' + ec + ' ev' : ec + ' ev'}</span>}
        </div>
        <div style={{display:'flex',gap:3,marginLeft:8,alignItems:'center'}}>
          <button className="btn bp" style={{fontSize:11,padding:'5px 10px'}} onClick={function() { setActive(m); }}>
            {m.status === 'completed' ? 'View Results →' : 'Manage Meet →'}
          </button>
          {m.status === 'upcoming' && <button className="btn bg" style={{padding:'5px 7px'}} onClick={function() { adv(m); }} title="Start meet"><Play size={11}/></button>}
          {m.status === 'active' && <button className="btn bgrn" style={{padding:'5px 7px'}} onClick={function() { adv(m); }} title="Complete meet"><Square size={11}/></button>}
          <button className="btn bg bi" style={{padding:5}} onClick={function() { setEd(m); }}><Edit2 size={11}/></button>
          <button className="btn bd bi" style={{padding:5}} onClick={function() { setDel(m); }}><Trash2 size={11}/></button>
        </div>
      </div>
    );
  }

  function Section(sProps) {
    var title = sProps.title, items = sProps.items;
    if (items.length === 0) return null;
    return (
      <div>
        <div style={{fontFamily:'var(--fd)',fontSize:12,fontWeight:600,letterSpacing:'.06em',textTransform:'uppercase',color:'var(--t2)',padding:'0 28px',margin:'20px 0 8px'}}>{title}</div>
        <div style={{padding:'0 28px',marginBottom:4}}>
          <div style={{background:'var(--bgc)',border:'1px solid var(--b1)',borderRadius:12,overflow:'hidden'}}>
            {items.map(function(m) { return <MeetRow key={m.id} m={m}/>; })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="ph">
        <div>
          <div className="pt">MEETS</div>
          <div className="ps">{meets.length} meets · {up.length} upcoming · {ac.length} active</div>
        </div>
        <button className="btn bp" onClick={function() { setAdd(true); }}><Plus size={13}/>Add Meet</button>
      </div>
      {meets.length === 0 ? (
        <div style={{padding:'0 28px'}}><div className="empty"><Calendar size={40}/><p>No meets yet</p><button className="btn bp" style={{marginTop:8}} onClick={function() { setAdd(true); }}>Add First Meet</button></div></div>
      ) : (
        <div>
          <Section title="Active" items={ac}/>
          <Section title="Upcoming" items={up}/>
          <Section title="Past Meets" items={pa}/>
        </div>
      )}
      {add && <MeetForm seasons={seasons} onSave={doAdd} onClose={function() { setAdd(false); }}/>}
      {ed && <MeetForm meet={ed} seasons={seasons} onSave={doEd} onClose={function() { setEd(null); }}/>}
      {del && <Confirm title="Delete Meet" body={<span>Delete <strong style={{color:'var(--t1)'}}>{del.name}</strong>?</span>} label="Delete" onConfirm={doDel} onClose={function() { setDel(null); }}/>}
    </div>
  );
}

/* ─── RECORDS ──────────────────────────────────────────────────────────────── */
function Records(props) {
  var athletes = props.athletes, entries = props.entries, results = props.results;
  var meetEvents = props.meetEvents, meets = props.meets;
  var [filter, setFilter] = useState('all');
  var [gFilter, setGFilter] = useState('all');
  var [q, setQ] = useState('');
  var prs = computePRs(athletes, entries, results, meetEvents, meets);
  var prArr = Object.values(prs);
  var filtered = prArr.filter(function(pr) {
    var a = athletes.find(function(x) { return x.id === pr.aid; });
    if (!a) return false;
    var catOk = filter === 'all' || pr.cat === filter;
    var gOk = gFilter === 'all' || a.g === gFilter;
    var qOk = !q || (a.fn + ' ' + a.ln).toLowerCase().indexOf(q.toLowerCase()) > -1 || pr.event.toLowerCase().indexOf(q.toLowerCase()) > -1;
    return catOk && gOk && qOk;
  });

  var byEvent = {};
  filtered.forEach(function(pr) {
    if (!byEvent[pr.event]) byEvent[pr.event] = [];
    byEvent[pr.event].push(pr);
  });
  var evNames = Object.keys(byEvent).sort();

  return (
    <div className="page">
      <div className="ph">
        <div><div className="pt">RECORDS</div><div className="ps">Personal bests auto-computed from all meet results</div></div>
        <span className="bdg tl" style={{fontSize:11,padding:'5px 11px'}}>{prArr.length} PR{prArr.length !== 1 ? 's' : ''} on file</span>
      </div>
      <div className="tb">
        <div className="sbw"><Search size={12}/><input className="inp" placeholder="Search athlete or event…" value={q} onChange={function(e) { setQ(e.target.value); }}/></div>
        <select className="inp" value={filter} onChange={function(e) { setFilter(e.target.value); }}>
          <option value="all">All Categories</option>
          {['track','relay','field','combined'].map(function(c) { return <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>; })}
        </select>
        <select className="inp" value={gFilter} onChange={function(e) { setGFilter(e.target.value); }}>
          <option value="all">All Genders</option><option value="M">Male</option><option value="F">Female</option>
        </select>
      </div>
      <div style={{padding:'0 28px'}}>
        {prArr.length === 0 ? (
          <div className="empty"><TrendingUp size={40}/><p>No results on file yet</p><p style={{fontSize:12,maxWidth:280}}>Add meet results in the Meets section and personal bests appear here automatically.</p></div>
        ) : filtered.length === 0 ? <div className="empty"><p>No PRs match your filters</p></div> : (
          evNames.map(function(evName) {
            var items = byEvent[evName].slice().sort(function(a, b) {
              var isF = isFieldEvent(a.cat);
              var va = parseMark(a.mark, a.cat);
              var vb = parseMark(b.mark, b.cat);
              return isF ? (vb - va) : (va - vb);
            });
            return (
              <div key={evName} style={{marginBottom:14}}>
                <div style={{fontFamily:'var(--fd)',fontSize:13,fontWeight:600,letterSpacing:'.06em',textTransform:'uppercase',color:'var(--t2)',marginBottom:7,display:'flex',alignItems:'center',gap:8}}>
                  {evName}<span className="bdg nt">{items.length}</span>
                </div>
                <div style={{background:'var(--bgc)',border:'1px solid var(--b1)',borderRadius:10,overflow:'hidden'}}>
                  {items.map(function(pr, i) {
                    var a = athletes.find(function(x) { return x.id === pr.aid; });
                    if (!a) return null;
                    return (
                      <div key={pr.aid} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 14px',borderBottom:'1px solid var(--b1)'}}>
                        <div style={{width:22,fontFamily:'var(--fd)',fontSize:14,fontWeight:700,color:'var(--t3)',textAlign:'right'}}>{i+1}</div>
                        <div className={'av ' + (a.g === 'M' ? 'avm' : 'avf')} style={{width:26,height:26,fontSize:10}}>{a.fn[0]}{a.ln[0]}</div>
                        <div style={{flex:1}}><div style={{fontWeight:500,fontSize:12}}>{a.fn} {a.ln}</div><div style={{fontSize:10,color:'var(--t2)'}}>{ageGroup(a.age)} · Age {a.age}</div></div>
                        <div style={{fontFamily:'var(--fd)',fontSize:20,fontWeight:700,color:'var(--acc)'}}>{pr.mark}</div>
                        <div style={{fontSize:10,color:'var(--t3)',minWidth:80,textAlign:'right'}}>{pr.mname}<br/>{fmtDate(pr.date).full}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ─── DASHBOARD ────────────────────────────────────────────────────────────── */
function Dashboard(props) {
  var athletes = props.athletes, meets = props.meets, seasons = props.seasons;
  var me = props.me, re = props.re;
  var maleCount = athletes.filter(function(a) { return a.g === 'M'; }).length;
  var femaleCount = athletes.filter(function(a) { return a.g === 'F'; }).length;
  var upcomingCount = meets.filter(function(x) { return x.status === 'upcoming'; }).length;
  var activeMeets = meets.filter(function(x) { return x.status === 'active'; });
  var activeSeason = seasons.find(function(s) { return s.active; });
  var grps = ['8 & Under','9-10','11-12','13-14','15-16','17-18'].map(function(g) {
    return {g: g, count: athletes.filter(function(a) { return ageGroup(a.age) === g; }).length};
  }).filter(function(x) { return x.count > 0; });
  var maxG = Math.max.apply(null, grps.map(function(x) { return x.count; }).concat([1]));
  var recent = athletes.slice().sort(function(a, b) { return (b.created_at || '').localeCompare(a.created_at || ''); }).slice(0, 4);
  var nextMeets = meets.filter(function(x) { return x.status === 'upcoming'; }).slice().sort(function(a, b) { return a.date.localeCompare(b.date); }).slice(0, 3);
  var noEC = athletes.filter(function(a) { return !a.ec1_name && !a.ec1_ph; }).length;
  var totalResults = re.filter(function(r) { return r.mark; }).length;

  return (
    <div className="page">
      <div className="ph">
        <div>
          <div className="pt">DASHBOARD</div>
          <div className="ps">{activeSeason ? 'Season: ' + activeSeason.name : 'No active season set'}</div>
        </div>
        <span className="bdg bl" style={{fontSize:11,padding:'5px 11px'}}>{new Date().toLocaleDateString('en-US',{weekday:'short',month:'long',day:'numeric',year:'numeric'})}</span>
      </div>
      {noEC > 0 && (
        <div style={{padding:'0 28px',marginBottom:14}}>
          <div style={{background:'var(--redg)',border:'1px solid rgba(239,68,68,.2)',borderRadius:10,padding:'10px 14px',fontSize:12,color:'var(--red)',display:'flex',alignItems:'center',gap:8}}>
            <AlertTriangle size={13}/><strong>{noEC} athlete{noEC !== 1 ? 's' : ''}</strong>&nbsp;missing emergency contact info
          </div>
        </div>
      )}
      {activeMeets.length > 0 && (
        <div style={{padding:'0 28px',marginBottom:14}}>
          <div style={{background:'var(--grng)',border:'1px solid rgba(16,185,129,.2)',borderRadius:10,padding:'10px 14px',fontSize:12,color:'var(--grn)',display:'flex',alignItems:'center',gap:8}}>
            <Play size={13}/><strong>{activeMeets.length} meet{activeMeets.length !== 1 ? 's' : ''} in progress:</strong>&nbsp;{activeMeets.map(function(m) { return m.name; }).join(', ')}
          </div>
        </div>
      )}
      <div className="stats">
        {[
          {v: athletes.length, l:'Total Athletes', c:'bl'},
          {v: maleCount, l:'Male', c:'gd'},
          {v: femaleCount, l:'Female', c:'pu'},
          {v: upcomingCount, l:'Upcoming Meets', c:'gn'},
          {v: totalResults, l:'Results on File', c:'tl'}
        ].map(function(s) {
          return <div key={s.l} className={'stat ' + s.c}><div className="sv">{s.v}</div><div className="sl">{s.l}</div></div>;
        })}
      </div>
      <div className="g3c">
        <div className="card">
          <div className="ch"><BarChart2 size={12}/>Age Groups</div>
          {grps.length === 0 ? <div style={{color:'var(--t3)',fontSize:12}}>No athletes yet</div> : (
            grps.map(function(g) {
              return (
                <div key={g.g} className="abr">
                  <span className="abl">{g.g}</span>
                  <div className="abt"><div className="abf" style={{width: Math.round((g.count / maxG) * 100) + '%'}}/></div>
                  <span className="abc">{g.count}</span>
                </div>
              );
            })
          )}
        </div>
        <div className="card">
          <div className="ch"><UserPlus size={12}/>Recently Added</div>
          {recent.length === 0 ? <div style={{color:'var(--t3)',fontSize:12}}>No athletes yet</div> : (
            <div className="rl">
              {recent.map(function(a) {
                return (
                  <div key={a.id} className="ri">
                    <div className={'av ' + (a.g === 'M' ? 'avm' : 'avf')}>{a.fn[0]}{a.ln[0]}</div>
                    <div><div className="rn">{a.fn} {a.ln}</div><div className="rm">Age {a.age} · {ageGroup(a.age)}</div></div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="card">
          <div className="ch"><Calendar size={12}/>Upcoming Meets</div>
          {nextMeets.length === 0 ? <div style={{color:'var(--t3)',fontSize:12}}>None scheduled</div> : (
            <div className="rl">
              {nextMeets.map(function(m) {
                var d = fmtDate(m.date);
                return (
                  <div key={m.id} className="ri">
                    <div className="mdb"><div className="mdbm">{d.mon}</div><div className="mbdd">{d.day}</div></div>
                    <div><div className="rn">{m.name}</div><div className="rm">{m.loc || 'TBD'}</div></div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── SETTINGS ─────────────────────────────────────────────────────────────── */
function SeasonForm(props) {
  var s = props.s, onSave = props.onSave, onClose = props.onClose;
  var [f, setF] = useState({name: s ? s.name : '', year: s ? s.year : new Date().getFullYear(), type: s ? s.type : 'outdoor', active: s ? !!s.active : false});
  var [er, setEr] = useState('');
  return (
    <div className="ov" onClick={function(e) { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mod" style={{maxWidth:360}}>
        <div className="mh">
          <div className="mt">{s && s.id ? 'Edit Season' : 'Add Season'}</div>
          <button className="btn bg bi" onClick={onClose}><X size={13}/></button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:11}}>
          <div className="fg">
            <label className="fl">Name *</label>
            <input className="inp" value={f.name} onChange={function(e) { setF(function(p) { return Object.assign({}, p, {name: e.target.value}); }); }} placeholder="2025 Outdoor" autoFocus/>
            {er && <span className="fe">{er}</span>}
          </div>
          <div className="g2">
            <div className="fg">
              <label className="fl">Year</label>
              <input className="inp" type="number" value={f.year} onChange={function(e) { setF(function(p) { return Object.assign({}, p, {year: parseInt(e.target.value) || 2025}); }); }}/>
            </div>
            <div className="fg">
              <label className="fl">Type</label>
              <select className="inp" value={f.type} onChange={function(e) { setF(function(p) { return Object.assign({}, p, {type: e.target.value}); }); }}>
                <option value="outdoor">Outdoor</option>
                <option value="indoor">Indoor</option>
                <option value="xc">Cross Country</option>
              </select>
            </div>
          </div>
          <label style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'var(--t2)',cursor:'pointer'}}>
            <input type="checkbox" checked={f.active} onChange={function(e) { setF(function(p) { return Object.assign({}, p, {active: e.target.checked}); }); }}/>
            Set as active season
          </label>
        </div>
        <div className="mf">
          <button className="btn bg" onClick={onClose}>Cancel</button>
          <button className="btn bp" onClick={function() {
            if (!f.name.trim()) { setEr('Required'); return; }
            onSave(f);
          }}>{s && s.id ? 'Save' : 'Add Season'}</button>
        </div>
      </div>
    </div>
  );
}

function SettingsPage(props) {
  var seasons = props.seasons, setSeasons = props.setSeasons, athletes = props.athletes, meets = props.meets;
  var [add, setAdd] = useState(false);
  var [ed, setEd] = useState(null);
  var [del, setDel] = useState(null);
  var [rst, setRst] = useState(false);
  function doAdd(f) {
    var n = f.active ? seasons.map(function(s) { return Object.assign({}, s, {active: false}); }) : seasons.slice();
    setSeasons(n.concat([Object.assign({id: uid()}, f)]));
    setAdd(false);
  }
  function doEd(f) {
    var n = seasons.map(function(s) { return s.id === ed.id ? Object.assign({}, s, f) : s; });
    if (f.active) n = n.map(function(s) { return s.id === ed.id ? s : Object.assign({}, s, {active: false}); });
    setSeasons(n);
    setEd(null);
  }
  function doDel() { setSeasons(seasons.filter(function(s) { return s.id !== del.id; })); setDel(null); }
  function setAct(id) { setSeasons(seasons.map(function(s) { return Object.assign({}, s, {active: s.id === id}); })); }
  function exp() {
    var blob = new Blob([JSON.stringify({exported_at: new Date().toISOString(), athletes: athletes, meets: meets, seasons: seasons}, null, 2)], {type:'application/json'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'pegasus-track-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  return (
    <div className="page">
      <div className="ph"><div><div className="pt">SETTINGS</div></div></div>
      <div style={{padding:'0 28px',maxWidth:660,display:'flex',flexDirection:'column',gap:16}}>
        <div style={{background:'var(--bgc)',border:'1px solid var(--b1)',borderRadius:12,overflow:'hidden'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'13px 16px',borderBottom:'1px solid var(--b1)'}}>
            <div style={{fontFamily:'var(--fd)',fontSize:14,fontWeight:600,letterSpacing:'.03em'}}>Seasons</div>
            <button className="btn bp" onClick={function() { setAdd(true); }}><Plus size={12}/>Add</button>
          </div>
          {seasons.length === 0 ? (
            <div style={{padding:'18px',fontSize:12,color:'var(--t3)',textAlign:'center'}}>No seasons yet</div>
          ) : (
            seasons.map(function(s) {
              return (
                <div key={s.id} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 16px',borderBottom:'1px solid var(--b1)'}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:500,display:'flex',alignItems:'center',gap:7}}>
                      {s.name}
                      {s.active && <span className="bdg gn"><CheckCircle size={9}/>Active</span>}
                    </div>
                    <div style={{fontSize:10,color:'var(--t2)',marginTop:2}}>{s.year} · {s.type}</div>
                  </div>
                  <div style={{display:'flex',gap:3}}>
                    {!s.active && <button className="btn bg" style={{fontSize:11,padding:'4px 9px'}} onClick={function() { setAct(s.id); }}>Set Active</button>}
                    <button className="btn bg bi" onClick={function() { setEd(s); }}><Edit2 size={11}/></button>
                    <button className="btn bd bi" onClick={function() { setDel(s); }}><Trash2 size={11}/></button>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div style={{background:'var(--bgc)',border:'1px solid var(--b1)',borderRadius:12,padding:'16px'}}>
          <div style={{fontFamily:'var(--fd)',fontSize:14,fontWeight:600,marginBottom:4}}>Data</div>
          <div style={{fontSize:11,color:'var(--t2)',marginBottom:12}}>{athletes.length} athletes · {meets.length} meets · {seasons.length} seasons</div>
          <div style={{display:'flex',gap:8}}>
            <button className="btn bg" onClick={exp}><Download size={12}/>Export JSON</button>
            <button className="btn bd" onClick={function() { setRst(true); }}><RotateCcw size={12}/>Reset All</button>
          </div>
        </div>
        <div style={{background:'var(--accg)',border:'1px solid rgba(56,189,248,.2)',borderRadius:10,padding:'14px 16px',fontSize:12,color:'var(--t2)',lineHeight:1.7}}>
          <strong style={{fontFamily:'var(--fd)',fontSize:12,letterSpacing:'.04em',color:'var(--acc)',display:'block',marginBottom:6}}>SYNC &amp; PARENT PORTAL</strong>
          Configure Supabase in the desktop app (pegasus-track/ → Settings). Publish meets to push results. Deploy pegasus-track-web/ to Vercel.
        </div>
      </div>
      {add && <SeasonForm onSave={doAdd} onClose={function() { setAdd(false); }}/>}
      {ed && <SeasonForm s={ed} onSave={doEd} onClose={function() { setEd(null); }}/>}
      {del && <Confirm title="Delete Season" body={<span>Delete <strong style={{color:'var(--t1)'}}>{del.name}</strong>?</span>} label="Delete" onConfirm={doDel} onClose={function() { setDel(null); }}/>}
      {rst && <Confirm title="Reset All Data" body="Permanently delete all athletes, meets, seasons, events, entries, and results. Cannot be undone." label="Reset Everything" onConfirm={function() {
        Promise.all(Object.keys(K).map(function(k) { return saveStore(K[k], []); })).then(function() { window.location.reload(); });
      }} onClose={function() { setRst(false); }}/>}
    </div>
  );
}

/* ─── DESKTOP SHELL ────────────────────────────────────────────────────────── */
var NAV = [
  {id:'dashboard', Icon:LayoutDashboard, label:'Dashboard'},
  {id:'roster',    Icon:Users,           label:'Roster'},
  {id:'meets',     Icon:Calendar,        label:'Meets'},
  {id:'records',   Icon:TrendingUp,      label:'Records'}
];

function DesktopApp() {
  var [loading, setLoading] = useState(true);
  var [page, setPage] = useState('dashboard');
  var [athletes, setAthletesRaw] = useState([]);
  var [meets, setMeetsRaw] = useState([]);
  var [seasons, setSeasonsRaw] = useState([]);
  var [me, setMeRaw] = useState([]);
  var [en, setEnRaw] = useState([]);
  var [re, setReRaw] = useState([]);

  useEffect(function() {
    Promise.all([
      loadStore(K.A), loadStore(K.M), loadStore(K.S),
      loadStore(K.ME), loadStore(K.EN), loadStore(K.RE)
    ]).then(function(vals) {
      setAthletesRaw(vals[0]); setMeetsRaw(vals[1]); setSeasonsRaw(vals[2]);
      setMeRaw(vals[3]); setEnRaw(vals[4]); setReRaw(vals[5]);
      setLoading(false);
    });
  }, []);

  function mkSetter(setter, key) {
    return function(updater) {
      setter(function(prev) {
        var next = typeof updater === 'function' ? updater(prev) : updater;
        saveStore(key, next);
        return next;
      });
    };
  }

  var setAthletes = mkSetter(setAthletesRaw, K.A);
  var setMeets = mkSetter(setMeetsRaw, K.M);
  var setSeasons = mkSetter(setSeasonsRaw, K.S);
  var setMe = mkSetter(setMeRaw, K.ME);
  var setEn = mkSetter(setEnRaw, K.EN);
  var setRe = mkSetter(setReRaw, K.RE);

  if (loading) return <div className="loading"><div className="spin"/></div>;

  return (
    <div className="shell">
      <aside className="sb">
        <div className="sblogo">
          <div className="sblogo-ic"><Zap size={16} strokeWidth={2.5}/></div>
          <div><div className="sbname">PEGASUS</div><div className="sbsub">TRACK</div></div>
        </div>
        <div className="sdiv"/>
        <nav className="sbnav">
          <div className="sblbl">Navigation</div>
          {NAV.map(function(p) {
            return (
              <div key={p.id} className={'sbl' + (page === p.id ? ' on' : '')} onClick={function() { setPage(p.id); }}>
                <p.Icon size={14} strokeWidth={1.75}/><span>{p.label}</span>
              </div>
            );
          })}
        </nav>
        <div style={{flex:1}}/>
        <div className="sdiv"/>
        <div className={'sbl' + (page === 'settings' ? ' on' : '')} onClick={function() { setPage('settings'); }}>
          <Settings size={14} strokeWidth={1.75}/><span>Settings</span>
        </div>
        <div className="sbver">Pegasus Track v0.5.0</div>
      </aside>
      <main className="main">
        {page === 'dashboard' && <Dashboard athletes={athletes} meets={meets} seasons={seasons} me={me} re={re}/>}
        {page === 'roster' && <Roster athletes={athletes} setAthletes={setAthletes}/>}
        {page === 'meets' && <Meets meets={meets} setMeets={setMeets} seasons={seasons} me={me} en={en} re={re} setMe={setMe} setEn={setEn} setRe={setRe} athletes={athletes}/>}
        {page === 'records' && <Records athletes={athletes} entries={en} results={re} meetEvents={me} meets={meets}/>}
        {page === 'settings' && <SettingsPage seasons={seasons} setSeasons={setSeasons} athletes={athletes} meets={meets}/>}
      </main>
    </div>
  );
}

/* ─── PORTAL PREVIEW ───────────────────────────────────────────────────────── */
var DEMO_MEETS = [
  {id:'d1', n:'Fall Classic', date:'2024-09-28', loc:'Riverside Park', res:true, hs:true, status:'completed'},
  {id:'d2', n:'Winter Indoor', date:'2025-01-18', loc:'Metro Fieldhouse', res:true, hs:true, status:'completed'},
  {id:'d3', n:'Spring Championship', date:'2025-05-10', loc:'City Athletic Complex', res:false, hs:true, status:'upcoming'}
];
var DEMO_ATHLETES = [
  {id:1, fn:'Marcus', ln:'Williams', g:'M'}, {id:2, fn:'Sofia', ln:'Martinez', g:'F'},
  {id:4, fn:'Aaliyah', ln:'Johnson', g:'F'}, {id:9, fn:'Noah', ln:'Garcia', g:'M'}
];
var DEMO_PRS = [
  {aid:1, ev:'100 Meters', mark:'12.34', date:'2024-09-28'}, {aid:1, ev:'200 Meters', mark:'25.80', date:'2024-08-10'},
  {aid:2, ev:'200 Meters', mark:'28.45', date:'2024-09-28'}, {aid:4, ev:'400 Meters', mark:'58.72', date:'2024-09-28'},
  {aid:9, ev:'100 Meters', mark:'11.42', date:'2024-05-20'}
];

function Portal() {
  var [loggedIn, setLoggedIn] = useState(false);
  var [pg, setPg] = useState('home');
  var [selA, setSelA] = useState(null);
  var [em, setEm] = useState('');
  var [pw, setPw] = useState('');
  var [loginErr, setLoginErr] = useState('');
  var [loading, setLoading] = useState(false);

  function doLogin(e) {
    e.preventDefault();
    setLoginErr('');
    setLoading(true);
    setTimeout(function() {
      if (em && pw) { setLoggedIn(true); }
      else { setLoginErr('Enter the club email and password.'); }
      setLoading(false);
    }, 600);
  }

  if (!loggedIn) {
    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',padding:20}}>
        <div style={{background:'var(--bgc)',border:'1px solid var(--b2)',borderRadius:16,padding:'32px 28px',width:'100%',maxWidth:360,boxShadow:'0 8px 32px rgba(0,0,0,.6)'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:28}}>
            <div style={{width:36,height:36,borderRadius:11,background:'var(--accg)',border:'1px solid var(--accs)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--acc)'}}><Zap size={18} strokeWidth={2.5}/></div>
            <div><div style={{fontFamily:'var(--fd)',fontSize:20,fontWeight:700,letterSpacing:'.08em'}}>PEGASUS TRACK</div><div style={{fontSize:10,color:'var(--acc)',letterSpacing:'.15em'}}>PARENT PORTAL</div></div>
          </div>
          <form style={{display:'flex',flexDirection:'column',gap:12}} onSubmit={doLogin}>
            <input style={{width:'100%',padding:'10px 13px',background:'var(--bg2)',border:'1px solid var(--b1)',borderRadius:8,color:'var(--t1)',fontFamily:'var(--fb)',fontSize:13,outline:'none'}} type="email" placeholder="Club email" value={em} onChange={function(e) { setEm(e.target.value); }} autoFocus/>
            <input style={{width:'100%',padding:'10px 13px',background:'var(--bg2)',border:'1px solid var(--b1)',borderRadius:8,color:'var(--t1)',fontFamily:'var(--fb)',fontSize:13,outline:'none'}} type="password" placeholder="Club password" value={pw} onChange={function(e) { setPw(e.target.value); }}/>
            {loginErr && <div style={{padding:'9px 12px',borderRadius:7,background:'var(--redg)',border:'1px solid rgba(239,68,68,.25)',color:'var(--red)',fontSize:12}}>{loginErr}</div>}
            <button style={{padding:11,borderRadius:8,border:'none',cursor:'pointer',background:'var(--acc)',color:'#08091a',fontFamily:'var(--fb)',fontSize:13,fontWeight:600}} type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</button>
          </form>
          <p style={{marginTop:14,fontSize:11,color:'var(--t3)',textAlign:'center',lineHeight:1.6}}>Use the club credentials from your coach.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{height:50,background:'var(--bg2)',borderBottom:'1px solid var(--b1)',display:'flex',alignItems:'center',padding:'0 16px',gap:6,flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:8,fontFamily:'var(--fd)',fontSize:14,fontWeight:700,letterSpacing:'.1em',marginRight:10}}>
          <div style={{width:26,height:26,borderRadius:7,background:'var(--accg)',border:'1px solid var(--accs)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--acc)'}}><Zap size={13} strokeWidth={2.5}/></div>
          PEGASUS <span style={{color:'var(--acc)',marginLeft:4}}>TRACK</span>
        </div>
        {[{id:'home',l:'Meets'},{id:'athletes',l:'Athletes'}].map(function(t) {
          var isOn = pg === t.id || (pg === 'athlete' && t.id === 'athletes');
          return (
            <button key={t.id} style={{display:'flex',alignItems:'center',gap:5,padding:'5px 10px',borderRadius:7,fontSize:12,fontWeight:500,cursor:'pointer',border:'none',background: isOn ? 'var(--accg)' : 'none',color: isOn ? 'var(--acc)' : 'var(--t2)'}} onClick={function() { setPg(t.id); }}>{t.l}</button>
          );
        })}
        <button style={{marginLeft:'auto',fontSize:11,color:'var(--t3)',background:'none',border:'none',cursor:'pointer'}} onClick={function() { setLoggedIn(false); }}>Sign out</button>
      </div>
      <div style={{flex:1,overflowY:'auto',maxWidth:860,margin:'0 auto',width:'100%',padding:'20px 18px 40px'}}>
        {pg === 'home' && (
          <div>
            <div style={{fontFamily:'var(--fd)',fontSize:26,fontWeight:700,letterSpacing:'.06em',marginBottom:14}}>MEETS</div>
            <div style={{background:'var(--bgc)',border:'1px solid var(--b1)',borderRadius:10,overflow:'hidden'}}>
              {DEMO_MEETS.map(function(m) {
                var d = fmtDate(m.date);
                return (
                  <div key={m.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderBottom:'1px solid var(--b1)'}}>
                    <div className="mdb"><div className="mdbm">{d.mon}</div><div className="mbdd">{d.day}</div></div>
                    <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:500}}>{m.n}</div><div style={{fontSize:10,color:'var(--t2)',marginTop:2}}>{m.loc} · {d.full}</div></div>
                    <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:3}}>
                      {m.res && <span className="bdg gn">Results</span>}
                      {m.hs && <span className="bdg bl">Heat Sheets</span>}
                      {m.status === 'upcoming' && <span className="bdg gd">Upcoming</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {pg === 'athletes' && (
          <div>
            <div style={{fontFamily:'var(--fd)',fontSize:26,fontWeight:700,letterSpacing:'.06em',marginBottom:14}}>ATHLETES</div>
            <div style={{background:'var(--bgc)',border:'1px solid var(--b1)',borderRadius:10,overflow:'hidden'}}>
              {DEMO_ATHLETES.map(function(a) {
                return (
                  <div key={a.id} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 14px',borderBottom:'1px solid var(--b1)',cursor:'pointer'}} onClick={function() { setSelA(a); setPg('athlete'); }} onMouseEnter={function(e) { e.currentTarget.style.background = 'var(--bgh)'; }} onMouseLeave={function(e) { e.currentTarget.style.background = ''; }}>
                    <div className={'av ' + (a.g === 'M' ? 'avm' : 'avf')}>{a.fn[0]}{a.ln[0]}</div>
                    <div style={{flex:1}}><div style={{fontSize:13,fontWeight:500}}>{a.ln}, {a.fn}</div><div style={{fontSize:10,color:'var(--t2)',marginTop:2}}>{a.g === 'M' ? 'Male' : 'Female'}</div></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {pg === 'athlete' && selA && (
          <div>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:14,fontSize:12,color:'var(--t2)',cursor:'pointer'}} onClick={function() { setPg('athletes'); }}><ArrowLeft size={13}/>All Athletes</div>
            <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:18}}>
              <div className={'av ' + (selA.g === 'M' ? 'avm' : 'avf')} style={{width:46,height:46,fontSize:18}}>{selA.fn[0]}{selA.ln[0]}</div>
              <div><div style={{fontFamily:'var(--fd)',fontSize:24,fontWeight:700,letterSpacing:'.06em'}}>{selA.fn} {selA.ln}</div></div>
            </div>
            <div style={{fontFamily:'var(--fd)',fontSize:15,fontWeight:600,letterSpacing:'.04em',marginBottom:9}}>Personal Records</div>
            <div style={{background:'var(--bgc)',border:'1px solid var(--b1)',borderRadius:10,overflow:'hidden'}}>
              {DEMO_PRS.filter(function(p) { return p.aid === selA.id; }).map(function(pr, i) {
                return (
                  <div key={i} style={{display:'flex',alignItems:'center',padding:'11px 14px',borderBottom:'1px solid var(--b1)'}}>
                    <div style={{flex:1,fontSize:12,fontWeight:500}}>{pr.ev}</div>
                    <div style={{fontFamily:'var(--fd)',fontSize:19,fontWeight:700,color:'var(--acc)'}}>{pr.mark}</div>
                    <div style={{fontSize:10,color:'var(--t3)',minWidth:90,textAlign:'right'}}>{fmtDate(pr.date).full}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── ROOT ─────────────────────────────────────────────────────────────────── */
export default function App() {
  var [view, setView] = useState('desktop');
  return (
    <div>
      <style>{CSS}</style>
      <div className="app">
        <div className="dbar">
          <div className="dbar-logo">⚡ PEGASUS <span>TRACK</span></div>
          {[{id:'desktop',l:'🖥  Desktop App'},{id:'portal',l:'📱  Parent Portal'}].map(function(t) {
            return <button key={t.id} className={'dtab' + (view === t.id ? ' on' : '')} onClick={function() { setView(t.id); }}>{t.l}</button>;
          })}
        </div>
        <div className="appbody">
          {view === 'desktop' ? <DesktopApp/> : <Portal/>}
        </div>
      </div>
    </div>
  );
}
