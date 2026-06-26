import { useCallback, useEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'

function pClass(p) { return { High:'badge-high', Medium:'badge-medium', Low:'badge-low' }[p] || 'badge-low' }
function sClass(s) {
  return {
    Pending:'badge-pending', 'In Process':'badge-inprocess',
    Resolved:'badge-resolved', Closed:'badge-closed', 'No Solution Yet':'badge-nosolution',
  }[s] || 'badge-pending'
}

const COLS = ['Ticket','Date','Student','Batch','Source','Type → Category','Priority','Assignee','Status','Description','Action']

export default function QueryLog() {
  const { master, agent, showToast } = useApp()
  const [allRows,  setAllRows]  = useState([])
  const [loading,  setLoading]  = useState(false)
  const [search,   setSearch]   = useState('')
  const [fStatus,  setFStatus]  = useState('')
  const [fPri,     setFPri]     = useState('')
  const [fQueue,   setFQueue]   = useState('')
  const [modal,    setModal]    = useState(null)
  const [mStatus,  setMStatus]  = useState('')
  const [mRemark,  setMRemark]  = useState('')
  const realtimeRef = useRef(null)

  const loadLog = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('support_tickets')
      .select('id,ticket_id,date,student_name,phone,batch,source,query_type,category,query_description,priority,assignee,status,remark,date_resolved,resolution_hrs,created_at')
      .order('created_at', { ascending: false })
      .limit(100)
    setLoading(false)
    if (error) { showToast('error', 'Failed to load', error.message); return }
    setAllRows(data || [])
  }, [])

  // Initial load
  useEffect(() => { loadLog() }, [loadLog])

  // Supabase realtime subscription — other agents' changes appear instantly
  useEffect(() => {
    const channel = supabase.channel('tickets-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_tickets' },
        payload => setAllRows(prev => [payload.new, ...prev].slice(0, 100))
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'support_tickets' },
        payload => setAllRows(prev => prev.map(r => r.id === payload.new.id ? { ...r, ...payload.new } : r))
      )
      .subscribe()
    realtimeRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [])

  // Client-side filter — instant, no network
  const filtered = allRows.filter(r => {
    const q = search.toLowerCase()
    const ms  = !q  || [r.student_name, r.phone, r.ticket_id, r.query_description].some(v => String(v||'').toLowerCase().includes(q))
    const mst = !fStatus || r.status    === fStatus
    const mp  = !fPri    || r.priority  === fPri
    const mq  = !fQueue  || (fQueue === '__mine__' ? r.assignee === agent : r.assignee === fQueue)
    return ms && mst && mp && mq
  })

  // Stats (from full dataset, not filtered)
  const stats = {
    total:    allRows.length,
    pending:  allRows.filter(r => r.status === 'Pending').length,
    inproc:   allRows.filter(r => r.status === 'In Process').length,
    resolved: allRows.filter(r => r.status === 'Resolved' || r.status === 'Closed').length,
    noSol:    allRows.filter(r => r.status === 'No Solution Yet').length,
  }

  // Toggle stat filter on card click
  function toggleStatFilter(status) {
    setFStatus(prev => prev === status ? '' : status)
  }

  // Quick resolve — optimistic, no modal
  async function quickResolve(row) {
    const patch = { status: 'Resolved', date_resolved: new Date().toISOString().slice(0,10), updated_at: new Date().toISOString() }
    setAllRows(prev => prev.map(r => r.id === row.id ? { ...r, ...patch } : r))
    const { error } = await supabase.from('support_tickets').update(patch).eq('id', row.id)
    if (error) { showToast('error', 'Failed', error.message); loadLog() }
    else showToast('success', 'Resolved!', row.ticket_id)
  }

  function openModal(row) {
    setModal(row)
    setMStatus(row.status)
    setMRemark(row.remark || '')
  }

  async function saveUpdate() {
    if (!modal) return
    const patch = { status: mStatus, remark: mRemark, updated_at: new Date().toISOString() }
    setAllRows(prev => prev.map(r => r.id === modal.id ? { ...r, ...patch } : r))
    setModal(null)
    const { error } = await supabase.from('support_tickets').update(patch).eq('id', modal.id)
    if (error) { showToast('error', 'Failed', error.message); loadLog() }
    else showToast('success', 'Updated!', `${modal.ticket_id} → ${mStatus}`)
  }

  // Escape to close modal
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') setModal(null) }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [])

  const statuses  = master?.STATUS    || ['Pending','In Process','Resolved','Closed','No Solution Yet']
  const assignees = master?.ASSIGNEE  || []

  return (
    <div className="h-full flex flex-col overflow-hidden py-4 gap-3">

      {/* ── Stats bar — click to filter ── */}
      <div className="shrink-0 grid grid-cols-5 gap-[8px]">
        {[
          { label:'Total',       val: stats.total,    color:'text-primary',        filter: ''              },
          { label:'Pending',     val: stats.pending,  color:'text-status-warning', filter: 'Pending'       },
          { label:'In Process',  val: stats.inproc,   color:'text-status-purple',  filter: 'In Process'    },
          { label:'Resolved',    val: stats.resolved, color:'text-status-success', filter: 'Resolved'      },
          { label:'No Solution', val: stats.noSol,    color:'text-status-danger',  filter: 'No Solution Yet'},
        ].map(s => (
          <div
            key={s.label}
            className={`stat-card ${fStatus === s.filter && s.filter ? 'active-filter' : ''}`}
            onClick={() => s.filter && toggleStatFilter(s.filter)}
            title={s.filter ? `Click to filter by ${s.label}` : ''}
          >
            <div className={`stat-num ${s.color}`}>{s.val}</div>
            <div className="stat-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Controls row ── */}
      <div className="shrink-0 flex gap-2 items-center">
        <div className="flex-1 relative min-w-0">
          <span className="absolute left-[9px] top-1/2 -translate-y-1/2 text-text-muted text-[13px] pointer-events-none">🔍</span>
          <input className="search-inp" placeholder="Search name, phone, ticket…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="filter-sel" value={fStatus} onChange={e => setFStatus(e.target.value)}>
          <option value="">All Status</option>
          {statuses.map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="filter-sel" value={fPri} onChange={e => setFPri(e.target.value)}>
          <option value="">All Priority</option>
          <option>High</option><option>Medium</option><option>Low</option>
        </select>
        <select className="filter-sel" value={fQueue} onChange={e => setFQueue(e.target.value)}>
          <option value="">All Agents</option>
          <option value="__mine__">My Queue</option>
          {assignees.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <button
          id="refresh-log-btn"
          className="bg-white border-[1.5px] border-surface-border2 rounded-lg text-text-secondary font-medium text-[12.5px] px-3 py-[7px] cursor-pointer flex items-center gap-[5px] transition-all hover:border-primary hover:text-primary shrink-0"
          onClick={loadLog}
          title="Refresh (R)"
        >↻</button>
        {(fStatus || fPri || fQueue || search) && (
          <button
            className="text-[11.5px] text-text-muted hover:text-primary transition-colors shrink-0 underline"
            onClick={() => { setSearch(''); setFStatus(''); setFPri(''); setFQueue('') }}
          >Clear filters</button>
        )}
      </div>

      {/* ── Table — fills remaining height, sticky header ── */}
      <div className="flex-1 overflow-hidden bg-white border border-surface-border rounded-[10px]" style={{ boxShadow:'0 1px 3px rgba(0,0,0,.08)' }}>
        <div className="h-full overflow-y-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead className="sticky top-0 z-10">
              <tr>{COLS.map(h => <th key={h} className="tbl-th">{h}</th>)}</tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={11} className="text-center py-12 text-text-muted">
                  <div className="text-[28px] mb-2">⏳</div>
                  <div className="font-semibold text-text-secondary">Loading…</div>
                </td></tr>
              )}
              {!loading && !filtered.length && (
                <tr><td colSpan={11} className="text-center py-12 text-text-muted">
                  <div className="text-[28px] mb-2">
                    {fStatus === 'High' ? '🎉' : allRows.length ? '🔍' : '📂'}
                  </div>
                  <div className="font-semibold text-text-secondary text-[14px]">
                    {allRows.length
                      ? `No ${fPri || ''} ${fStatus || ''} tickets`
                      : 'No data loaded'}
                  </div>
                  <div className="text-[12px] mt-1 text-text-muted">
                    {allRows.length ? 'Try different filters' : 'Click Refresh to load'}
                  </div>
                </td></tr>
              )}
              {!loading && filtered.map(r => (
                <tr
                  key={r.id}
                  className={`group hover:bg-[#fafbff] transition-colors ${r.assignee === agent ? '' : ''}`}
                  style={r.assignee === agent ? { borderLeft: '3px solid #2563eb' } : {}}
                >
                  <td className="tbl-td">
                    <div className="font-mono text-[10.5px] font-bold text-primary tracking-[.3px] whitespace-nowrap">{r.ticket_id || '—'}</div>
                  </td>
                  <td className="tbl-td whitespace-nowrap text-text-secondary text-[12px]">{r.date || '—'}</td>
                  <td className="tbl-td">
                    <div className="font-semibold text-text-primary leading-tight">{r.student_name || '—'}</div>
                    <div className="text-[10.5px] text-text-muted">{r.phone || ''}</div>
                  </td>
                  <td className="tbl-td text-text-secondary text-[12px]">{r.batch || '—'}</td>
                  <td className="tbl-td text-text-secondary text-[12px]">{r.source || '—'}</td>
                  <td className="tbl-td">
                    <div className="font-semibold text-[12px] leading-tight">{r.query_type || '—'}</div>
                    <div className="text-[10.5px] text-text-muted">{r.category || ''}</div>
                  </td>
                  {/* Click badge to filter by priority */}
                  <td className="tbl-td cursor-pointer" onClick={() => setFPri(fPri === r.priority ? '' : r.priority)} title="Filter by priority">
                    <span className={`badge ${pClass(r.priority)}`}>{r.priority || '—'}</span>
                  </td>
                  {/* Click name to filter by agent */}
                  <td className="tbl-td text-text-secondary text-[12px] cursor-pointer hover:text-primary transition-colors"
                    onClick={() => setFQueue(fQueue === r.assignee ? '' : r.assignee)}
                    title="Filter by agent">
                    {r.assignee || '—'}
                  </td>
                  <td className="tbl-td">
                    <span className={`badge ${sClass(r.status)}`}>{r.status || '—'}</span>
                  </td>
                  <td className="tbl-td">
                    <div className="max-w-[160px] overflow-hidden text-ellipsis whitespace-nowrap text-text-secondary" title={r.query_description || ''}>
                      {r.query_description || '—'}
                    </div>
                  </td>
                  <td className="tbl-td">
                    <div className="flex items-center gap-1">
                      <button className="upd-btn" onClick={() => openModal(r)}>Update</button>
                      {/* One-click resolve — appears on hover, hidden for already-resolved */}
                      {r.status !== 'Resolved' && r.status !== 'Closed' && (
                        <button
                          className="opacity-0 group-hover:opacity-100 transition-opacity bg-status-successBg border border-[#6ee7b7] text-status-success text-[10.5px] font-semibold px-[7px] py-[3px] rounded cursor-pointer hover:bg-status-success hover:text-white whitespace-nowrap"
                          onClick={() => quickResolve(r)}
                          title="Quick resolve"
                        >✓ Resolve</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Update Modal ── */}
      {modal && (
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center"
          style={{ background:'rgba(15,23,42,.4)', backdropFilter:'blur(4px)' }}
          onClick={e => e.target === e.currentTarget && setModal(null)}
        >
          <div className="bg-white border border-surface-border rounded-[14px] p-6 w-[420px] max-w-[95vw]" style={{ boxShadow:'0 10px 15px rgba(0,0,0,.1)' }}>
            <h3 className="text-[15px] font-bold text-text-primary mb-4">Update Ticket</h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className="c-label">Ticket ID</label>
                <input className="field-input font-mono font-bold text-primary" value={modal.ticket_id} readOnly />
              </div>
              <div>
                <label className="c-label">New Status</label>
                <select className="field-input" value={mStatus} onChange={e => setMStatus(e.target.value)}>
                  {statuses.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="c-label">Resolution Note</label>
                <textarea className="field-input" rows={3} placeholder="What was done / answer given?" value={mRemark} onChange={e => setMRemark(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-[10px] mt-4">
              <button className="btn-ghost btn-sm" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn-primary btn-sm px-5" onClick={saveUpdate}>Save Update</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
