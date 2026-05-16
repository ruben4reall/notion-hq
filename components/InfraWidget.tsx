'use client'

import { useState, useEffect } from 'react'

interface OnlineUser { display_name: string; username: string; last_seen: string; connected_at: string }
interface PageStat   { page: string; visits: number; avg_sec: number; total_sec: number }
interface HourStat   { hour: number; visits: number }
interface UserStat   { username: string; visits: number; total_sec: number }
interface SbMetrics  {
  db_bytes: number; auth_users: number; active_sessions: number
  pg_version: string; storage_bytes: number; storage_objects: number
  table_sizes: { tablename: string; bytes: number }[]
  db_history: number[]
}
interface InfraData {
  ping: number
  tableCounts: Record<string, number>
  totalRows: number
  rowHistory: { date: string; value: number }[]
  onlineUsers: OnlineUser[]
  pageStats: PageStat[]
  hourlyActivity: HourStat[]
  topUsers: UserStat[]
  totalVisits: number
  avgSessionSec: number
  sbMetrics: SbMetrics | null
  sbLimits: Record<string, number>
  vercelDeployments: { uid: string; state: string; created: number; url: string; meta?: { githubCommitMessage?: string } }[]
  vercelLimits: Record<string, number>
  hasSupabaseToken: boolean
  hasVercelToken: boolean
}

// ── Utils ──────────────────────────────────────────────────────
function fmt(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  if (bytes >= 1024)      return `${(bytes / 1024).toFixed(0)} KB`
  return `${bytes} B`
}
function fmtDuration(sec: number) {
  if (sec >= 3600) return `${(sec / 3600).toFixed(1)}h`
  if (sec >= 60)   return `${Math.round(sec / 60)}min`
  return `${sec}s`
}
function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n/1_000).toFixed(0)}K`
  return String(n)
}
function relTime(ts: string | number) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return "à l'instant"
  if (m < 60) return `il y a ${m}m`
  return `il y a ${Math.floor(m/60)}h`
}
function pageName(path: string) {
  const map: Record<string, string> = {
    '/': 'Dashboard', '/kanban': 'Kanban', '/crm': 'CRM',
    '/calendar': 'Calendrier', '/roadmap': 'Roadmap', '/ideas': 'Idées',
    '/time': 'Time', '/notes': 'Notes', '/settings': 'Paramètres',
  }
  return map[path] ?? path
}

// ── Sparkline ─────────────────────────────────────────────────
function Sparkline({ data, color, height = 44 }: { data: number[]; color: string; height?: number }) {
  if (data.length < 2) return <div style={{ height, display:'flex', alignItems:'center', justifyContent:'center' }}><span style={{ fontSize:11, color:'var(--t2)' }}>—</span></div>
  const max = Math.max(...data, 1); const min = Math.min(...data, 0); const range = max - min || 1
  const W = 200; const H = height
  const pts = data.map((v, i) => ({ x: (i/(data.length-1))*W, y: H - ((v-min)/range)*(H-4)-2 }))
  const line = pts.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`
    const prev = pts[i-1]; const cx = (p.x - prev.x)/3
    return `${acc} C ${prev.x+cx} ${prev.y}, ${p.x-cx} ${p.y}, ${p.x} ${p.y}`
  }, '')
  const area = `${line} L ${pts[pts.length-1].x} ${H} L 0 ${H} Z`
  const gid = `g${color.replace(/[^a-z0-9]/gi,'')}`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.02"/>
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`}/>
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx={pts[pts.length-1].x} cy={pts[pts.length-1].y} r="2.5" fill={color}/>
    </svg>
  )
}

// ── Bar ───────────────────────────────────────────────────────
function UsageBar({ label, used, limit, fmtFn = fmt, sub }: { label: string; used: number; limit: number; fmtFn?: (n:number)=>string; sub?: string }) {
  const pct = limit > 0 ? Math.min((used/limit)*100, 100) : 0
  const color = pct > 80 ? '#f43f5e' : pct > 60 ? '#f59e0b' : '#0ec98c'
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, alignItems:'baseline' }}>
        <span style={{ fontSize:11, color:'var(--t2)', fontWeight:500 }}>{label}</span>
        <span style={{ fontSize:11, color:'var(--t0)', fontWeight:700 }}>
          {fmtFn(used)} <span style={{ color:'var(--t2)', fontWeight:400 }}>/ {fmtFn(limit)}</span>
        </span>
      </div>
      <div style={{ height:5, background:'var(--bg-3)', borderRadius:100, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:100, transition:'width 0.8s var(--ease-spring)' }}/>
      </div>
      {sub && <span style={{ fontSize:10, color:'var(--t2)', marginTop:2, display:'block' }}>{sub}</span>}
    </div>
  )
}

// ── Hourly heatmap ────────────────────────────────────────────
function HourlyHeatmap({ data }: { data: HourStat[] }) {
  const max = Math.max(...data.map(d=>d.visits), 1)
  return (
    <div>
      <div style={{ display:'flex', gap:2 }}>
        {data.map(d => (
          <div key={d.hour} title={`${d.hour}h — ${d.visits} visite${d.visits>1?'s':''}`}
            style={{ flex:1, height:28, borderRadius:3, background: d.visits === 0 ? 'var(--bg-3)' : `rgba(var(--accent-rgb),${0.1 + (d.visits/max)*0.85})`, cursor:'default', transition:'background 0.2s' }}/>
        ))}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
        <span style={{ fontSize:9, color:'var(--t2)' }}>0h</span>
        <span style={{ fontSize:9, color:'var(--t2)' }}>12h</span>
        <span style={{ fontSize:9, color:'var(--t2)' }}>23h</span>
      </div>
    </div>
  )
}

// ── Status pill ───────────────────────────────────────────────
function Pill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:600,
      color: ok?'#0ec98c':'#f43f5e', background: ok?'rgba(14,201,140,0.1)':'rgba(244,63,94,0.1)',
      border:`1px solid ${ok?'rgba(14,201,140,0.2)':'rgba(244,63,94,0.2)'}`, padding:'3px 8px', borderRadius:100 }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:ok?'#0ec98c':'#f43f5e', boxShadow:ok?'0 0 6px #0ec98c':'none' }}/>
      {label}
    </span>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize:11, color:'var(--t2)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>{children}</p>
}

// ── Main ──────────────────────────────────────────────────────
export default function InfraWidget() {
  const [data, setData] = useState<InfraData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/infra').then(r=>r.ok?r.json():null).then(d=>{if(d)setData(d)}).finally(()=>setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {[1,2,3].map(i=><div key={i} className="skeleton" style={{ height:200, borderRadius:14 }}/>)}
    </div>
  )
  if (!data) return null

  const lastDeploy  = data.vercelDeployments[0]
  const maxPageVisits = Math.max(...data.pageStats.map(p=>p.visits), 1)
  const maxTableBytes = Math.max(...(data.sbMetrics?.table_sizes.map(t=>t.bytes)??[]), 1)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* ── ROW 1: Live + Stats globaux ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3" style={{ gap:16 }}>

        {/* Users en ligne */}
        <div className="card" style={{ padding:20 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <span style={{ fontSize:13, fontWeight:700, color:'var(--t0)' }}>Utilisateurs en ligne</span>
            <span style={{ fontSize:20, fontWeight:800, color: data.onlineUsers.length>0?'#0ec98c':'var(--t2)' }}>
              {data.onlineUsers.length}
            </span>
          </div>
          {data.onlineUsers.length === 0
            ? <p style={{ fontSize:12, color:'var(--t2)', textAlign:'center', padding:'12px 0' }}>Aucun utilisateur actif</p>
            : data.onlineUsers.map(u => (
              <div key={u.username} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 0', borderBottom:'1px solid var(--border-s)' }}>
                <span style={{ width:8, height:8, borderRadius:'50%', background:'#0ec98c', boxShadow:'0 0 6px #0ec98c', flexShrink:0 }}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:12, fontWeight:600, color:'var(--t0)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.display_name || u.username}</p>
                  <p style={{ fontSize:10, color:'var(--t2)' }}>{relTime(u.last_seen)}</p>
                </div>
              </div>
            ))
          }
        </div>

        {/* Stats globaux analytics */}
        <div className="card" style={{ padding:20 }}>
          <p style={{ fontSize:13, fontWeight:700, color:'var(--t0)', marginBottom:14 }}>Analytics 30 jours</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {[
              { label:'Visites totales', value: fmtNum(data.totalVisits), color:'var(--accent)' },
              { label:'Durée moy.', value: data.avgSessionSec > 0 ? fmtDuration(data.avgSessionSec) : '—', color:'#4f8ef7' },
              { label:'Lignes en DB', value: fmtNum(data.totalRows), color:'#0ec98c' },
              { label:'Ping DB', value: `${data.ping}ms`, color: data.ping < 100 ? '#0ec98c' : data.ping < 300 ? '#f59e0b' : '#f43f5e' },
            ].map(s => (
              <div key={s.label} style={{ background:'var(--bg-2)', borderRadius:8, padding:'10px 12px' }}>
                <p style={{ fontSize:10, color:'var(--t2)', fontWeight:500 }}>{s.label}</p>
                <p style={{ fontSize:22, fontWeight:800, color:s.color, marginTop:2, letterSpacing:'-0.02em' }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Supabase status */}
        <div className="card" style={{ padding:20 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <span style={{ fontSize:13, fontWeight:700, color:'var(--t0)' }}>🗄 Supabase</span>
            <Pill ok={data.ping < 500} label={`${data.ping}ms`}/>
          </div>
          {data.sbMetrics ? (
            <>
              <UsageBar label="Base de données" used={data.sbMetrics.db_bytes} limit={data.sbLimits.db_size}/>
              <UsageBar label="Storage" used={data.sbMetrics.storage_bytes} limit={data.sbLimits.storage}/>
              <UsageBar label="Comptes plateforme (tous orgs)" used={data.sbMetrics.auth_users} limit={data.sbLimits.auth_users} fmtFn={fmtNum}/>
              <div style={{ display:'flex', gap:16, marginTop:8 }}>
                <span style={{ fontSize:10, color:'var(--t2)' }}>Sessions actives <b style={{ color:'var(--t0)' }}>{data.sbMetrics.active_sessions}</b></span>
                <span style={{ fontSize:10, color:'var(--t2)' }}>PG <b style={{ color:'var(--t0)' }}>{data.sbMetrics.pg_version}</b></span>
              </div>
            </>
          ) : (
            <p style={{ fontSize:11, color:'var(--t2)', lineHeight:1.6 }}>
              💡 Ajoute <code style={{ background:'var(--bg-3)', padding:'1px 5px', borderRadius:4, fontSize:10 }}>SUPABASE_ACCESS_TOKEN</code> pour les métriques réelles
            </p>
          )}
        </div>
      </div>

      {/* ── ROW 2: Pages + Heatmap + Top users ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3" style={{ gap:16 }}>

        {/* Top pages */}
        <div className="card lg:col-span-1" style={{ padding:20 }}>
          <SectionTitle>Pages les plus visitées (30j)</SectionTitle>
          {data.pageStats.length === 0
            ? <p style={{ fontSize:12, color:'var(--t2)', textAlign:'center', padding:'16px 0' }}>Pas encore de données — les visites s'enregistrent en temps réel</p>
            : data.pageStats.map(p => (
              <div key={p.page} style={{ marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:12, color:'var(--t0)', fontWeight:500 }}>{pageName(p.page)}</span>
                  <span style={{ fontSize:11, color:'var(--t2)' }}>{p.visits}v · {fmtDuration(p.avg_sec)} moy</span>
                </div>
                <div style={{ height:4, background:'var(--bg-3)', borderRadius:100, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${(p.visits/maxPageVisits)*100}%`, background:'var(--accent)', borderRadius:100 }}/>
                </div>
              </div>
            ))
          }
        </div>

        {/* Heatmap horaire + sparkline */}
        <div className="card" style={{ padding:20 }}>
          <SectionTitle>Activité horaire (7 derniers jours)</SectionTitle>
          <HourlyHeatmap data={data.hourlyActivity}/>
          <div style={{ marginTop:20 }}>
            <SectionTitle>Croissance lignes DB (14j)</SectionTitle>
            <Sparkline data={data.sbMetrics?.db_history.length ? data.sbMetrics.db_history : data.rowHistory.map(r=>r.value)} color="var(--accent)" height={48}/>
          </div>
        </div>

        {/* Top utilisateurs */}
        <div className="card" style={{ padding:20 }}>
          <SectionTitle>Utilisateurs les plus actifs (30j)</SectionTitle>
          {data.topUsers.length === 0
            ? <p style={{ fontSize:12, color:'var(--t2)', textAlign:'center', padding:'16px 0' }}>Pas encore de données</p>
            : data.topUsers.map((u, i) => (
              <div key={u.username} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 0', borderBottom:'1px solid var(--border-s)' }}>
                <span style={{ fontSize:11, fontWeight:700, color:'var(--t2)', width:16, textAlign:'center', flexShrink:0 }}>#{i+1}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:12, fontWeight:600, color:'var(--t0)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.username}</p>
                  <p style={{ fontSize:10, color:'var(--t2)' }}>{u.visits} visites · {fmtDuration(u.total_sec)} total</p>
                </div>
              </div>
            ))
          }
        </div>
      </div>

      {/* ── ROW 3: Vercel + Table sizes ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap:16 }}>

        {/* Vercel */}
        <div className="card" style={{ padding:20 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <span style={{ fontSize:13, fontWeight:700, color:'var(--t0)' }}>▲ Vercel</span>
            {lastDeploy
              ? <Pill ok={lastDeploy.state==='READY'} label={lastDeploy.state==='READY'?`Déployé · ${relTime(lastDeploy.created)}`:'Erreur'}/>
              : <Pill ok label="Production"/>
            }
          </div>

          {/* Deploy sparkline */}
          {data.vercelDeployments.length > 0 && (() => {
            const buckets: Record<string, number> = {}
            for (let i=0;i<14;i++) buckets[new Date(Date.now()-i*86400000).toISOString().slice(0,10)] = 0
            data.vercelDeployments.forEach(d => { const k=new Date(d.created).toISOString().slice(0,10); if(k in buckets) buckets[k]++ })
            const vals = Object.entries(buckets).sort(([a],[b])=>a.localeCompare(b)).map(([,v])=>v)
            return (
              <div style={{ marginBottom:14 }}>
                <SectionTitle>Déploiements (14j)</SectionTitle>
                <Sparkline data={vals} color="#7c6af5" height={36}/>
              </div>
            )
          })()}

          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            {data.vercelDeployments.slice(0,6).map(dep => (
              <div key={dep.uid} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', background:'var(--bg-2)', borderRadius:8 }}>
                <div style={{ width:7, height:7, borderRadius:'50%', flexShrink:0,
                  background: dep.state==='READY'?'#0ec98c':dep.state==='BUILDING'?'#f59e0b':'#f43f5e',
                  boxShadow: dep.state==='READY'?'0 0 5px rgba(14,201,140,0.6)':'none' }}/>
                <span style={{ fontSize:11, flex:1, color:'var(--t1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {dep.meta?.githubCommitMessage?.split('\n')[0] ?? dep.url}
                </span>
                <span style={{ fontSize:10, color:'var(--t2)', flexShrink:0 }}>{relTime(dep.created)}</span>
              </div>
            ))}
          </div>

          {!data.hasVercelToken && (
            <p style={{ fontSize:11, color:'var(--t2)', marginTop:10, lineHeight:1.6 }}>
              💡 Ajoute <code style={{ background:'var(--bg-3)', padding:'1px 5px', borderRadius:4, fontSize:10 }}>VERCEL_TOKEN</code> pour les déploiements
            </p>
          )}

          {/* Limits reminder */}
          <div style={{ marginTop:14, padding:'10px 12px', background:'var(--bg-2)', borderRadius:8 }}>
            <span style={{ fontSize:10, color:'var(--t2)', fontWeight:600, display:'block', marginBottom:6 }}>PLAN HOBBY — LIMITES</span>
            <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
              {[['Bandwidth','100 GB/mois'],['Build','6 000 min/mois'],['Deploys','100/jour'],['Fonctions','100 GB-h']].map(([l,v])=>(
                <span key={l} style={{ fontSize:10, color:'var(--t2)' }}>{l} <b style={{ color:'var(--t1)' }}>{v}</b></span>
              ))}
            </div>
          </div>
        </div>

        {/* Table disk sizes */}
        <div className="card" style={{ padding:20 }}>
          <SectionTitle>Taille des tables ({data.sbMetrics ? fmt(data.sbMetrics.db_bytes) : '—'} total)</SectionTitle>
          {data.sbMetrics?.table_sizes.length
            ? data.sbMetrics.table_sizes.map(t => (
              <div key={t.tablename} style={{ marginBottom:8 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                  <span style={{ fontSize:11, color:'var(--t1)' }}>{t.tablename}</span>
                  <span style={{ fontSize:11, color:'var(--t0)', fontWeight:600 }}>{fmt(t.bytes)}</span>
                </div>
                <div style={{ height:4, background:'var(--bg-3)', borderRadius:100, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${(t.bytes/maxTableBytes)*100}%`, background:'rgba(var(--accent-rgb),0.6)', borderRadius:100 }}/>
                </div>
              </div>
            ))
            : (
              <>
                <SectionTitle>Lignes par table</SectionTitle>
                {(() => {
                  const maxR = Math.max(...Object.values(data.tableCounts), 1)
                  const LABELS: Record<string,string> = { tasks:'Tâches', crm:'CRM', ideas:'Idées', events:'Events', notes:'Notes', time_sessions:'Sessions', notifications:'Notifs', presence:'Présence', chat_messages:'Chat', organizations:'Orgs', org_members:'Membres' }
                  return Object.entries(data.tableCounts).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a).map(([t,c])=>(
                    <div key={t} style={{ marginBottom:8 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                        <span style={{ fontSize:11, color:'var(--t1)' }}>{LABELS[t]??t}</span>
                        <span style={{ fontSize:11, color:'var(--t0)', fontWeight:600 }}>{c}</span>
                      </div>
                      <div style={{ height:4, background:'var(--bg-3)', borderRadius:100 }}>
                        <div style={{ height:'100%', width:`${(c/maxR)*100}%`, background:'rgba(var(--accent-rgb),0.6)', borderRadius:100 }}/>
                      </div>
                    </div>
                  ))
                })()}
              </>
            )
          }
        </div>
      </div>
    </div>
  )
}
