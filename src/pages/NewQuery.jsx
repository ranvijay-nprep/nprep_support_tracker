import { useCallback, useEffect, useReducer, useState } from 'react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'

const MEM = {
  get: k  => localStorage.getItem(`nprep_mem_${k}`) || '',
  set: (k, v) => v && localStorage.setItem(`nprep_mem_${k}`, v),
}

function freshForm(agent) {
  return {
    name: '', phone: '', utype: '', batch: '',
    date: new Date().toISOString().slice(0, 10),
    source:     MEM.get('source'),
    resp: '', sameSource: true,
    qtype: '', cat: '', desc: '',
    priority: '',
    dept:     MEM.get('dept'),
    owner: '',
    assignee: agent || '',
    status: 'Pending',
    fcr: '', remark: '',
  }
}

function reducer(state, { type, key, val, agent }) {
  if (type === 'set')   return { ...state, [key]: val }
  if (type === 'reset') return freshForm(agent)
  return state
}

// ── Compact field components ─────────────────────────────────────────────────

function CLabel({ children, req }) {
  return (
    <label className="c-label">
      {children}{req && <span className="c-req">*</span>}
    </label>
  )
}

function CField({ label, req, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <CLabel req={req}>{label}</CLabel>
      {children}
    </div>
  )
}

function CSel({ value, onChange, opts = [], placeholder = '— Select —', disabled }) {
  return (
    <select className="c-input" value={value} onChange={e => onChange(e.target.value)} disabled={disabled}>
      <option value="">{placeholder}</option>
      {opts.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

// ── Minimal section divider ──────────────────────────────────────────────────
function Divider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '1px 0' }}>
      <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#94a3b8', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: '#f1f5f9' }} />
    </div>
  )
}

// ── Main ────────────────────────────────────────────────────────────────────

export default function NewQuery() {
  const { master, agent, showToast, showSpinner } = useApp()
  const [form, dispatch] = useReducer(reducer, freshForm(agent))
  const [submitting, setSubmitting] = useState(false)
  const [nextTicket, setNextTicket] = useState('…')
  const [ticketLoading, setTicketLoading] = useState(false)

  const set = k => v => dispatch({ type: 'set', key: k, val: v })

  const fetchTicketId = useCallback(async () => {
    setTicketLoading(true)
    const { data, error } = await supabase.rpc('generate_ticket_id')
    setTicketLoading(false)
    if (error) {
      console.error('generate_ticket_id RPC error:', error)
      // fallback to timestamp-based ID
      const now = new Date()
      const ym = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}`
      setNextTicket(`NP${ym}${Date.now().toString(36).toUpperCase().slice(-5)}`)
    } else {
      setNextTicket(data)
    }
  }, [])

  useEffect(() => { fetchTicketId() }, [fetchTicketId])

  useEffect(() => {
    if (agent) dispatch({ type: 'set', key: 'assignee', val: agent })
  }, [agent])

  const cats   = master?.CATEGORY?.[form.qtype] || []
  const owners = master?.OWNER?.[form.dept]     || []

  function handleQTypeChange(val)   { set('qtype')(val); dispatch({ type: 'set', key: 'cat',   val: '' }) }
  function handleDeptChange(val)    { set('dept')(val);  dispatch({ type: 'set', key: 'owner', val: '' }) }
  function handleSourceChange(val)  { set('source')(val); if (form.sameSource) dispatch({ type: 'set', key: 'resp', val }) }
  function toggleSameSource(checked){ dispatch({ type: 'set', key: 'sameSource', val: checked }); if (checked) dispatch({ type: 'set', key: 'resp', val: form.source }) }
  function setPri(val) { dispatch({ type: 'set', key: 'priority', val: form.priority === val ? '' : val }) }
  function setFCR(val) { dispatch({ type: 'set', key: 'fcr',      val: form.fcr      === val ? '' : val }) }

  function priClass(v) {
    if (form.priority !== v) return ''
    return v === 'High' ? 'sel-high' : v === 'Medium' ? 'sel-medium' : 'sel-low'
  }

  async function handleSubmit() {
    const errs = []
    if (!form.name.trim())  errs.push('Student Name')
    if (!form.phone.trim()) errs.push('Phone')
    if (!form.utype)        errs.push('User Type')
    if (!form.date)         errs.push('Date')
    if (!form.source)       errs.push('Source')
    if (!form.qtype)        errs.push('Query Type')
    if (!form.cat)          errs.push('Category')
    if (!form.desc.trim())  errs.push('Description')
    if (!form.priority)     errs.push('Priority')
    if (!form.dept)         errs.push('Department')
    if (errs.length) return showToast('error', 'Required fields missing', errs.join(', '))

    setSubmitting(true)
    showSpinner(true, 'Logging query…')
    MEM.set('source', form.source)
    MEM.set('dept', form.dept)

    const ticket_id = nextTicket
    const payload = {
      ticket_id,
      date:                   form.date,
      student_name:           form.name.trim(),
      phone:                  form.phone.trim(),
      user_type:              form.utype,
      batch:                  form.batch,
      source:                 form.source,
      response_medium:        form.sameSource ? form.source : form.resp,
      query_type:             form.qtype,
      category:               form.cat,
      query_description:      form.desc.trim(),
      priority:               form.priority,
      department:             form.dept,
      owner:                  form.owner,
      assignee:               form.assignee,
      status:                 form.status || 'Pending',
      date_received:          form.date,
      first_contact_resolved: form.fcr,
      remark:                 form.remark.trim(),
    }

    const { error } = await supabase.from('support_tickets').insert(payload)
    showSpinner(false); setSubmitting(false)

    if (error) {
      showToast('error', 'Save failed', error.message)
    } else {
      showToast('success', 'Query logged! ✓', `Ticket: ${ticket_id}`)
      fetchTicketId()
      dispatch({ type: 'reset', agent })
    }
  }

  function handleReset() {
    dispatch({ type: 'reset', agent })
    fetchTicketId()
  }

  const statuses = master?.STATUS || ['Pending','In Process','Resolved','Closed','No Solution Yet']

  // Field gap used throughout
  const GAP = 8

  return (
    // Height = full available space (100vh - 56px topbar managed by parent flex)
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingTop: 12, paddingBottom: 8 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexShrink: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: -0.4, color: '#1e293b' }}>
          Log a <span style={{ color: '#2563eb' }}>Support Query</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>
            <kbd style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 4, padding: '1px 5px', fontSize: 10, fontFamily: 'monospace' }}>Ctrl+↵</kbd> submit
          </span>
          <span style={{
            fontSize: 11.5, fontWeight: 600, color: ticketLoading ? '#94a3b8' : '#2563eb',
            border: '1px solid #e2e8f0', borderRadius: 20,
            padding: '3px 12px', fontFamily: 'JetBrains Mono, monospace',
            letterSpacing: 0.3, transition: 'color 0.2s',
          }}>{ticketLoading ? 'Loading…' : nextTicket}</span>
        </div>
      </div>

      {/* ── Two-column layout — no overflow ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 0 }}>

        {/* ── LEFT COLUMN ── */}
        <div style={{
          overflowY: 'auto', paddingRight: 20, paddingBottom: 8,
          display: 'flex', flexDirection: 'column', gap: GAP,
          borderRight: '1px solid #f1f5f9',
        }}>
          <Divider label="Student" />

          <CField label="Student Name" req>
            <input className="c-input" type="text" placeholder="e.g. Priya Sharma"
              value={form.name} onChange={e => set('name')(e.target.value)} autoComplete="off" />
          </CField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <CField label="Phone" req>
              <input className="c-input" type="tel" placeholder="10-digit" maxLength={15}
                value={form.phone} onChange={e => set('phone')(e.target.value)} />
            </CField>
            <CField label="User Type" req>
              <CSel value={form.utype} onChange={set('utype')} opts={master?.USER_TYPE || []} />
            </CField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <CField label="Batch / Plan">
              <CSel value={form.batch} onChange={set('batch')} opts={master?.BATCH || []} />
            </CField>
            <CField label="Date" req>
              <input className="c-input" type="date" value={form.date} onChange={e => set('date')(e.target.value)} />
            </CField>
          </div>

          <Divider label="Query" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <CField label="Source" req>
              <CSel value={form.source} onChange={handleSourceChange} opts={master?.SOURCE || []} />
            </CField>
            <CField label="Response Medium">
              <CSel value={form.resp} onChange={set('resp')} opts={master?.SOURCE || []}
                disabled={form.sameSource} placeholder="— Same as source —" />
            </CField>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', marginTop: -2 }}>
            <input type="checkbox" checked={form.sameSource}
              onChange={e => toggleSameSource(e.target.checked)} style={{ width: 'auto', accentColor: '#2563eb' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#16a34a' }}>✓ Same as source</span>
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <CField label="Query Type" req>
              <CSel value={form.qtype} onChange={handleQTypeChange} opts={master?.QUERY_TYPE || []} />
            </CField>
            <CField label="Category" req>
              <CSel value={form.cat} onChange={set('cat')} opts={cats}
                placeholder={cats.length ? '— Select Category —' : '— Select type first —'} />
            </CField>
          </div>

          <CField label="Description" req>
            <textarea className="c-input" rows={3} placeholder="Brief description of the issue or request…"
              value={form.desc} onChange={e => set('desc')(e.target.value)}
              style={{ minHeight: 'unset' }} />
          </CField>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div style={{
          overflowY: 'auto', paddingLeft: 20, paddingBottom: 8,
          display: 'flex', flexDirection: 'column', gap: GAP,
        }}>
          <Divider label="Priority" />

          <CField label="Priority" req>
            <div style={{ display: 'flex', gap: 6 }}>
              {['High','Medium','Low'].map(v => (
                <button key={v} onClick={() => setPri(v)} className={`p-pill ${priClass(v)}`}>
                  {v === 'High' ? '🔴' : v === 'Medium' ? '🟡' : '🟢'} {v}
                </button>
              ))}
            </div>
          </CField>

          <Divider label="Routing" />

          <CField label="Department" req>
            <CSel value={form.dept} onChange={handleDeptChange} opts={master?.DEPARTMENT || []} />
          </CField>

          <CField label="Owner">
            <CSel value={form.owner} onChange={set('owner')} opts={owners}
              placeholder={owners.length ? '— Select Owner —' : '— Select dept first —'} />
          </CField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <CField label="Assignee">
              <CSel value={form.assignee} onChange={set('assignee')} opts={master?.ASSIGNEE || []} />
            </CField>
            <CField label="Status">
              <CSel value={form.status} onChange={set('status')} opts={statuses} />
            </CField>
          </div>

          <Divider label="Resolution" />

          <CField label="First Contact Resolved?">
            <div style={{ display: 'flex', gap: 6 }}>
              {[{ v:'Yes', label:'✓ Yes' }, { v:'No', label:'✗ No' }].map(({ v, label }) => (
                <button key={v} onClick={() => setFCR(v)}
                  className={`fcr-btn ${form.fcr === 'Yes' && v === 'Yes' ? 'sel-yes' : form.fcr === 'No' && v === 'No' ? 'sel-no' : ''}`}>
                  {label}
                </button>
              ))}
            </div>
          </CField>

          <CField label="Remark / Notes">
            <textarea className="c-input" rows={2} placeholder="Follow-up needed, extra context…"
              value={form.remark} onChange={e => set('remark')(e.target.value)}
              style={{ minHeight: 'unset' }} />
          </CField>

          {/* Submit — always at bottom */}
          <div style={{
            marginTop: 'auto', paddingTop: 12,
            borderTop: '1px solid #f1f5f9',
            display: 'flex', justifyContent: 'flex-end', gap: 8,
          }}>
            <button className="btn-ghost btn-sm" onClick={handleReset}>Clear</button>
            <button id="submit-btn" className="btn-primary btn-sm" onClick={handleSubmit} disabled={submitting}
              style={{ paddingLeft: 20, paddingRight: 20 }}>
              Log Query →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
