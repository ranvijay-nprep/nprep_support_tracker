import { useEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'

function pClass(p) { return { High:'badge-high', Medium:'badge-medium', Low:'badge-low' }[p] || 'badge-low' }
function sClass(s) {
  return { Pending:'badge-pending', 'In Process':'badge-inprocess', Resolved:'badge-resolved', Closed:'badge-closed', 'No Solution Yet':'badge-nosolution' }[s] || 'badge-pending'
}

export default function QueryLog() {
  const { master, agent, showToast, showSpinner } = useApp()
  const [allRows, setAllRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fPri, setFPri] = useState('')
  const [fQueue, setFQueue] = useState('')
  const [modal, setModal] = useState(null) // { ticket_id, status }
  const [mStatus, setMStatus] = useState('')
  const [mRemark, setMRemark] = useState('')

  useEffect(() => { loadLog() }, [])

  async function loadLog() {
    setLoading(true)
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    setLoading(false)
    if (error) { showToast('error', 'Failed to load', error.message); return }
    setAllRows(data || [])
  }

  const filtered = allRows.filter(r => {
    const q = search.toLowerCase()
    const ms = !q || [r.student_name, r.phone, r.ticket_id, r.query_description].some(v => String(v||'').toLowerCase().includes(q))
    const mst = !fStatus || r.status === fStatus
    const mp  = !fPri    || r.priority === fPri
    const mq  = !fQueue  || (fQueue === '__mine__' ? r.assignee === agent : r.assignee === fQueue)
    return ms && mst && mp && mq
  })

  const stats = {
    total:   allRows.length,
    pending: allRows.filter(r => r.status === 'Pending').length,
    inproc:  allRows.filter(r => r.status === 'In Process').length,
    resolved: allRows.filter(r => r.status === 'Resolved' || r.status === 'Closed').length,
    noSol:   allRows.filter(r => r.status === 'No Solution Yet').length,
  }

  function openModal(row) {
    setModal(row)
    setMStatus(row.status)
    setMRemark('')
  }

  async function saveUpdate() {
    if (!modal) return
    showSpinner(true, 'Updating…')
    const { error } = await supabase.from('support_tickets')
      .update({ status: mStatus, remark: mRemark, updated_at: new Date().toISOString() })
      .eq('ticket_id', modal.ticket_id)
    showSpinner(false)
    if (error) { showToast('error', 'Failed', error.message); return }
    showToast('success', 'Updated!', `${modal.ticket_id} → ${mStatus}`)
    setModal(null)
    loadLog()
  }

  const statuses = master?.STATUS || ['Pending','In Process','Resolved','Closed','No Solution Yet']
  const assignees = master?.ASSIGNEE || []

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-5 gap-[10px] mb-4">
        {[
          { label:'Total',      val: stats.total,    color:'text-primary'         },
          { label:'Pending',    val: stats.pending,  color:'text-status-warning'  },
          { label:'In Process', val: stats.inproc,   color:'text-status-purple'   },
          { label:'Resolved',   val: stats.resolved, color:'text-status-success'  },
          { label:'No Solution',val: stats.noSol,    color:'text-status-danger'   },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className={`stat-num ${s.color}`}>{s.val}</div>
            <div className="stat-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-2 mb-[14px] items-center">
        <div className="flex-1 relative">
          <span className="absolute left-[10px] top-1/2 -translate-y-1/2 text-text-muted text-[14px] pointer-events-none">🔍</span>
          <input
            className="search-inp"
            placeholder="Search name, phone, ticket ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
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
          className="bg-white border-[1.5px] border-surface-border2 rounded-lg text-text-secondary font-medium text-[13px] px-[14px] py-2 cursor-pointer flex items-center gap-[5px] transition-all hover:border-primary hover:text-primary"
          onClick={loadLog}
        >↻ Refresh</button>
      </div>

      {/* Table */}
      <div className="bg-white border border-surface-border rounded-[10px] overflow-hidden" style={{ boxShadow:'0 1px 3px rgba(0,0,0,.08)' }}>
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr>
              {['Ticket','Date','Student','Batch','Source','Type → Category','Priority','Assignee','Status','Description','Action'].map(h => (
                <th key={h} className="tbl-th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} className="text-center py-14 text-text-muted">
                <div className="text-[32px] mb-[10px]">⏳</div>
                <div className="text-[15px] font-semibold text-text-secondary">Loading…</div>
              </td></tr>
            ) : !filtered.length ? (
              <tr><td colSpan={11} className="text-center py-14 text-text-muted">
                <div className="text-[32px] mb-[10px]">{allRows.length ? '🔍' : '📂'}</div>
                <div className="text-[15px] font-semibold text-text-secondary">{allRows.length ? 'No results' : 'No data loaded'}</div>
                <div className="text-[12.5px] mt-1">{allRows.length ? 'Try different filters' : 'Click Refresh to load recent queries'}</div>
              </td></tr>
            ) : filtered.map(r => (
              <tr key={r.ticket_id} className={`hover:bg-[#fafbff] ${r.assignee === agent ? 'border-l-[3px] border-primary' : ''}`}>
                <td className="tbl-td">
                  <div className="font-mono text-[11px] font-bold text-primary tracking-[.3px] whitespace-nowrap">{r.ticket_id || '—'}</div>
                </td>
                <td className="tbl-td whitespace-nowrap text-text-secondary">{r.date || '—'}</td>
                <td className="tbl-td">
                  <div className="font-semibold text-text-primary">{r.student_name || '—'}</div>
                  <div className="text-[11px] text-text-muted mt-[1px]">{r.phone || ''}</div>
                </td>
                <td className="tbl-td text-text-secondary">{r.batch || '—'}</td>
                <td className="tbl-td text-text-secondary">{r.source || '—'}</td>
                <td className="tbl-td">
                  <div className="font-semibold text-[12px]">{r.query_type || '—'}</div>
                  <div className="text-[11px] text-text-muted mt-[1px]">{r.category || ''}</div>
                </td>
                <td className="tbl-td">
                  <span className={`badge ${pClass(r.priority)}`}>{r.priority || '—'}</span>
                </td>
                <td className="tbl-td text-text-secondary">{r.assignee || '—'}</td>
                <td className="tbl-td">
                  <span className={`badge ${sClass(r.status)}`}>{r.status || '—'}</span>
                </td>
                <td className="tbl-td">
                  <div className="max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap text-text-secondary" title={r.query_description || ''}>
                    {r.query_description || '—'}
                  </div>
                </td>
                <td className="tbl-td">
                  <button className="upd-btn" onClick={() => openModal(r)}>Update</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Update Modal */}
      {modal && (
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center"
          style={{ background:'rgba(15,23,42,.4)', backdropFilter:'blur(4px)' }}
          onClick={e => e.target === e.currentTarget && setModal(null)}
        >
          <div className="bg-white border border-surface-border rounded-[14px] p-6 w-[420px] max-w-[95vw]" style={{ boxShadow:'0 10px 15px rgba(0,0,0,.08)' }}>
            <h3 className="text-[16px] font-bold text-text-primary mb-4">Update Ticket Status</h3>
            <div className="flex flex-col gap-[5px] mb-3">
              <label className="text-[11.5px] font-semibold text-text-secondary">Ticket ID</label>
              <input className="field-input font-bold text-primary" value={modal.ticket_id} readOnly />
            </div>
            <div className="flex flex-col gap-[5px] mb-3">
              <label className="text-[11.5px] font-semibold text-text-secondary">New Status</label>
              <select className="field-input" value={mStatus} onChange={e => setMStatus(e.target.value)}>
                {statuses.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-[5px] mb-4">
              <label className="text-[11.5px] font-semibold text-text-secondary">Resolution Note</label>
              <textarea className="field-input" rows={3} placeholder="What was done / what answer was given to student?" value={mRemark} onChange={e => setMRemark(e.target.value)} />
            </div>
            <div className="flex justify-end gap-[10px]">
              <button className="btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={saveUpdate}>Save Update</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
