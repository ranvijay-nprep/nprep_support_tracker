import { useCallback, useEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'

const PAGE_SIZE = 50

function pClass(p) { return { High:'badge-high', Medium:'badge-medium', Low:'badge-low' }[p] || 'badge-low' }
function sClass(s) {
  return {
    Pending:'badge-pending', 'In Process':'badge-inprocess',
    Resolved:'badge-resolved', 'No Solution Yet':'badge-nosolution',
  }[s] || 'badge-pending'
}

const COLS = ['Ticket','Date','Student','Batch','Source','Type → Category','Priority','Assignee','Status','Description','Action']

export default function QueryLog() {
  const { master, agent, showToast } = useApp()
  const [rows,       setRows]       = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [stats,      setStats]      = useState({ total:0, pending:0, inproc:0, resolved:0, noSol:0 })
  const [loading,    setLoading]    = useState(false)
  const [search,     setSearch]     = useState('')
  const [dSearch,    setDSearch]    = useState('')
  const [fStatus,    setFStatus]    = useState('')
  const [fPri,       setFPri]       = useState('')
  const [fQueue,     setFQueue]     = useState('')
  const [fType,      setFType]      = useState('')
  const [fDate,      setFDate]      = useState('')
  const [page,       setPage]       = useState(1)
  const [modal,      setModal]      = useState(null)
  const [mStatus,    setMStatus]    = useState('')
  const [mRemark,    setMRemark]    = useState('')
  const debounceRef   = useRef(null)
  const filtersRef    = useRef({ page:1, dSearch:'', fStatus:'', fPri:'', fQueue:'' })

  // Debounce search 300ms
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDSearch(search), 300)
    return () => clearTimeout(debounceRef.current)
  }, [search])

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1) }, [dSearch, fStatus, fPri, fQueue, fType, fDate])

  // Keep filtersRef in sync for realtime handlers
  useEffect(() => {
    filtersRef.current = { page, dSearch, fStatus, fPri, fQueue, fType, fDate }
  }, [page, dSearch, fStatus, fPri, fQueue, fType, fDate])

  // ── Stats: lightweight separate query (global, no filters) ──
  const loadStats = useCallback(async () => {
    const { data } = await supabase.from('support_tickets').select('status')
    if (!data) return
    setStats({
      total:    data.length,
      pending:  data.filter(r => r.status === 'Pending').length,
      inproc:   data.filter(r => r.status === 'In Process').length,
      resolved: data.filter(r => r.status === 'Resolved').length,
      noSol:    data.filter(r => r.status === 'No Solution Yet').length,
    })
  }, [])

  // ── Page data: server-side pagination + filters ──
  const loadPage = useCallback(async (pg, ds, fs, fp, fq, ft, fd) => {
    setLoading(true)
    const from = (pg - 1) * PAGE_SIZE
    const to   = from + PAGE_SIZE - 1

    let q = supabase
      .from('support_tickets')
      .select(
        'id,ticket_id,date,student_name,phone,batch,source,query_type,category,' +
        'query_description,priority,assignee,status,remark,date_received,date_resolved,resolution_hrs,created_at',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(from, to)

    if (fs) q = q.eq('status', fs)
    if (fp) q = q.eq('priority', fp)
    if (fq === '__mine__') q = q.eq('assignee', agent)
    else if (fq) q = q.eq('assignee', fq)
    if (ft) q = q.eq('query_type', ft)
    if (fd) q = q.eq('date', fd)
    if (ds) q = q.or(`student_name.ilike.%${ds}%,ticket_id.ilike.%${ds}%,phone.ilike.%${ds}%`)

    const { data, count, error } = await q
    setLoading(false)
    if (error) { showToast('error', 'Failed to load', error.message); return }
    setRows(data || [])
    setTotalCount(count || 0)
  }, [agent, showToast])

  // Load page when filters/page change
  useEffect(() => {
    loadPage(page, dSearch, fStatus, fPri, fQueue, fType, fDate)
  }, [page, dSearch, fStatus, fPri, fQueue, fType, fDate, loadPage])

  // Load stats on mount
  useEffect(() => { loadStats() }, [loadStats])

  // ── Realtime: reload page + stats on change ──
  useEffect(() => {
    const channel = supabase.channel('tickets-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_tickets' }, () => {
        const f = filtersRef.current
        loadPage(f.page, f.dSearch, f.fStatus, f.fPri, f.fQueue, f.fType, f.fDate)
        loadStats()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'support_tickets' }, payload => {
        setRows(prev => prev.map(r => r.id === payload.new.id ? { ...r, ...payload.new } : r))
        loadStats()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [loadPage, loadStats])

  function toggleStatFilter(status) {
    setFStatus(prev => prev === status ? '' : status)
  }

  // ── Quick resolve ──
  async function quickResolve(row) {
    const resolvedAt     = new Date()
    const receivedAt     = new Date(row.created_at) // created_at has exact time; date_received is date-only
    const resolution_hrs = Math.round(((resolvedAt - receivedAt) / (1000 * 60 * 60)) * 10) / 10
    const patch = {
      status: 'Resolved',
      date_resolved: resolvedAt.toISOString(),
      resolution_hrs,
      updated_at: resolvedAt.toISOString(),
    }
    console.log('[quickResolve] patch:', patch)
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, ...patch } : r))
    const { error } = await supabase.from('support_tickets').update(patch).eq('id', row.id)
    if (error) { showToast('error', 'Failed', error.message); loadPage(page, dSearch, fStatus, fPri, fQueue, fType, fDate) }
    else { showToast('success', 'Resolved!', row.ticket_id); loadStats() }
  }

  function openModal(row) {
    setModal(row); setMStatus(row.status); setMRemark(row.remark || '')
  }

  async function saveUpdate() {
    if (!modal) return
    const patch = { status: mStatus, remark: mRemark, updated_at: new Date().toISOString() }
    if (mStatus === 'Resolved') {
      const resolvedAt     = new Date()
      const receivedAt     = new Date(modal.created_at)
      patch.date_resolved  = resolvedAt.toISOString()
      patch.resolution_hrs = Math.round(((resolvedAt - receivedAt) / (1000 * 60 * 60)) * 10) / 10
    }
    console.log('[saveUpdate] patch:', patch)
    setRows(prev => prev.map(r => r.id === modal.id ? { ...r, ...patch } : r))
    setModal(null)
    const { error } = await supabase.from('support_tickets').update(patch).eq('id', modal.id)
    if (error) { showToast('error', 'Failed', error.message); loadPage(page, dSearch, fStatus, fPri, fQueue) }
    else { showToast('success', 'Updated!', `${modal.ticket_id} → ${mStatus}`); loadStats() }
  }

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') setModal(null) }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [])

  const statuses  = (master?.STATUS || ['Pending','In Process','Resolved','No Solution Yet']).filter(s => s !== 'Closed')
  const assignees = master?.ASSIGNEE  || []
  const queryTypes = master?.QUERY_TYPE || []

  const startNum  = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const endNum    = Math.min(page * PAGE_SIZE, totalCount)
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="h-full flex flex-col overflow-hidden py-4 gap-3">

      {/* ── Stats bar — click to filter ── */}
      <div className="shrink-0 grid grid-cols-5 gap-[8px]">
        {[
          { label:'Total',       val: stats.total,    color:'text-primary',        filter: ''               },
          { label:'Pending',     val: stats.pending,  color:'text-status-warning', filter: 'Pending'        },
          { label:'In Process',  val: stats.inproc,   color:'text-status-purple',  filter: 'In Process'     },
          { label:'Resolved',    val: stats.resolved, color:'text-status-success', filter: 'Resolved'       },
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

      {/* ── Controls: row 1 — search + dropdowns ── */}
      <div className="shrink-0 flex gap-2 items-center">
        <div className="flex-1 relative min-w-0">
          <span className="absolute left-[9px] top-1/2 -translate-y-1/2 text-text-muted text-[13px] pointer-events-none">🔍</span>
          <input className="search-inp" placeholder="Search name, phone, ticket…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="filter-sel" value={fType} onChange={e => setFType(e.target.value)}>
          <option value="">All Types</option>
          {queryTypes.map(t => <option key={t}>{t}</option>)}
        </select>
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
        <input
          type="date"
          className="filter-sel"
          style={{ cursor: 'pointer', color: fDate ? '#1e293b' : '#94a3b8' }}
          value={fDate}
          onChange={e => setFDate(e.target.value)}
          title="Filter by date"
        />
        <button
          id="refresh-log-btn"
          className="bg-white border-[1.5px] border-surface-border2 rounded-lg text-text-secondary font-medium text-[12.5px] px-3 py-[7px] cursor-pointer flex items-center gap-[5px] transition-all hover:border-primary hover:text-primary shrink-0"
          onClick={() => { loadPage(page, dSearch, fStatus, fPri, fQueue, fType, fDate); loadStats() }}
          title="Refresh (R)"
        >↻</button>
        {(fStatus || fPri || fQueue || fType || fDate || search) && (
          <button
            className="text-[11.5px] text-text-muted hover:text-primary transition-colors shrink-0 underline"
            onClick={() => { setSearch(''); setFStatus(''); setFPri(''); setFQueue(''); setFType(''); setFDate('') }}
          >Clear</button>
        )}
      </div>

      {/* ── Table — fills remaining height, sticky header ── */}
      <div className="flex-1 overflow-hidden bg-white border border-surface-border rounded-[10px]" style={{ boxShadow:'0 1px 3px rgba(0,0,0,.08)', minHeight: 0 }}>
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
              {!loading && !rows.length && (
                <tr><td colSpan={11} className="text-center py-12 text-text-muted">
                  <div className="text-[28px] mb-2">{totalCount ? '🔍' : '📂'}</div>
                  <div className="font-semibold text-text-secondary text-[14px]">
                    {totalCount ? `No ${fPri || ''} ${fStatus || ''} tickets`.trim() : 'No tickets yet'}
                  </div>
                  <div className="text-[12px] mt-1 text-text-muted">
                    {totalCount ? 'Try different filters' : 'Log a query to get started'}
                  </div>
                </td></tr>
              )}
              {!loading && rows.map(r => (
                <tr
                  key={r.id}
                  className="group hover:bg-[#fafbff] transition-colors"
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
                  <td className="tbl-td cursor-pointer" onClick={() => setFPri(fPri === r.priority ? '' : r.priority)} title="Filter by priority">
                    <span className={`badge ${pClass(r.priority)}`}>{r.priority || '—'}</span>
                  </td>
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
                      {r.status !== 'Resolved' && (
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

      {/* ── Pagination bar ── */}
      {totalCount > 0 && (
        <div className="shrink-0 flex items-center justify-between px-1">
          <span style={{ fontSize: 12, color: '#64748b' }}>
            Showing <strong>{startNum}–{endNum}</strong> of <strong>{totalCount}</strong> tickets
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              style={{
                padding: '5px 14px', borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: page === 1 ? 'not-allowed' : 'pointer',
                border: '1px solid #e2e8f0', background: page === 1 ? '#f8fafc' : '#fff',
                color: page === 1 ? '#cbd5e1' : '#475569', transition: 'all 0.15s',
              }}
            >← Prev</button>
            <span style={{ fontSize: 12, color: '#94a3b8', minWidth: 60, textAlign: 'center' }}>
              Page {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              style={{
                padding: '5px 14px', borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                border: '1px solid #e2e8f0', background: page >= totalPages ? '#f8fafc' : '#fff',
                color: page >= totalPages ? '#cbd5e1' : '#475569', transition: 'all 0.15s',
              }}
            >Next →</button>
          </div>
        </div>
      )}

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
