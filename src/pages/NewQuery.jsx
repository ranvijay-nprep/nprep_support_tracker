import { useEffect, useReducer, useState } from 'react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'

// Form memory — remember last source/dept between sessions (not student data)
const MEM = {
  get: key => localStorage.getItem(`nprep_mem_${key}`) || '',
  set: (key, val) => val && localStorage.setItem(`nprep_mem_${key}`, val),
}

function freshForm(agent) {
  return {
    name: '', phone: '', utype: '', batch: '',
    date: new Date().toISOString().slice(0, 10),
    source:     MEM.get('source'),
    resp: '', sameSource: true,
    qtype: '', cat: '', desc: '',
    priority: '',
    dept:       MEM.get('dept'),
    owner: '',
    assignee:   agent || '',
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

function CField({ label, req, children, className = '' }) {
  return (
    <div className={`flex flex-col ${className}`}>
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

// ── Divider between groups ───────────────────────────────────────────────────
function Divider({ label }) {
  return (
    <div className="flex items-center gap-2 py-[2px]">
      <div className="text-[9.5px] font-bold uppercase tracking-[.8px] text-text-muted whitespace-nowrap">{label}</div>
      <div className="flex-1 h-px bg-surface-border" />
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function NewQuery() {
  const { master, agent, showToast, showSpinner, generateTicketId } = useApp()
  const [form, dispatch] = useReducer(reducer, freshForm(agent))
  const [submitting, setSubmitting] = useState(false)
  const [nextTicket, setNextTicket] = useState(generateTicketId())

  const set = key => val => dispatch({ type: 'set', key, val })

  // Sync agent into assignee when agent is chosen
  useEffect(() => {
    if (agent) dispatch({ type: 'set', key: 'assignee', val: agent })
  }, [agent])

  // Sync dept owners when dept changes
  const cats   = master?.CATEGORY?.[form.qtype] || []
  const owners = master?.OWNER?.[form.dept]     || []

  function handleQTypeChange(val) {
    set('qtype')(val)
    dispatch({ type: 'set', key: 'cat', val: '' })
  }
  function handleDeptChange(val) {
    set('dept')(val)
    dispatch({ type: 'set', key: 'owner', val: '' })
  }
  function handleSourceChange(val) {
    set('source')(val)
    if (form.sameSource) dispatch({ type: 'set', key: 'resp', val })
  }
  function toggleSameSource(checked) {
    dispatch({ type: 'set', key: 'sameSource', val: checked })
    if (checked) dispatch({ type: 'set', key: 'resp', val: form.source })
  }
  function setPri(val) {
    dispatch({ type: 'set', key: 'priority', val: form.priority === val ? '' : val })
  }
  function setFCR(val) {
    dispatch({ type: 'set', key: 'fcr', val: form.fcr === val ? '' : val })
  }

  function priClass(v) {
    if (form.priority !== v) return ''
    return v === 'High' ? 'sel-high' : v === 'Medium' ? 'sel-medium' : 'sel-low'
  }

  async function handleSubmit() {
    const errs = []
    if (!form.name.trim()) errs.push('Student Name')
    if (!form.phone.trim()) errs.push('Phone')
    if (!form.utype)       errs.push('User Type')
    if (!form.date)        errs.push('Date')
    if (!form.source)      errs.push('Source')
    if (!form.qtype)       errs.push('Query Type')
    if (!form.cat)         errs.push('Category')
    if (!form.desc.trim()) errs.push('Description')
    if (!form.priority)    errs.push('Priority')
    if (!form.dept)        errs.push('Department')
    if (errs.length) return showToast('error', 'Required fields missing', errs.join(', '))

    setSubmitting(true)
    showSpinner(true, 'Logging query…')

    // Save form memory
    MEM.set('source', form.source)
    MEM.set('dept', form.dept)

    const ticket_id = generateTicketId()
    const payload = {
      ticket_id,
      date:                  form.date,
      student_name:          form.name.trim(),
      phone:                 form.phone.trim(),
      user_type:             form.utype,
      batch:                 form.batch,
      source:                form.source,
      response_medium:       form.sameSource ? form.source : form.resp,
      query_type:            form.qtype,
      category:              form.cat,
      query_description:     form.desc.trim(),
      priority:              form.priority,
      department:            form.dept,
      owner:                 form.owner,
      assignee:              form.assignee,
      status:                form.status || 'Pending',
      date_received:         form.date,
      first_contact_resolved: form.fcr,
      remark:                form.remark.trim(),
    }

    const { error } = await supabase.from('support_tickets').insert(payload)
    showSpinner(false)
    setSubmitting(false)

    if (error) {
      showToast('error', 'Save failed', error.message)
    } else {
      showToast('success', 'Query logged! ✓', `Ticket: ${ticket_id}`)
      const nextId = generateTicketId()
      setNextTicket(nextId)
      dispatch({ type: 'reset', agent })
    }
  }

  function handleReset() {
    dispatch({ type: 'reset', agent })
    setNextTicket(generateTicketId())
  }

  const statuses = master?.STATUS || ['Pending','In Process','Resolved','Closed','No Solution Yet']

  return (
    // Full-height container — no page scroll
    <div className="h-full flex flex-col overflow-hidden py-4">

      {/* Header row */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="text-[18px] font-extrabold tracking-[-0.4px] text-text-primary">
          Log a <span className="text-primary">Support Query</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-[11px] text-text-muted">
            <kbd className="bg-surface-bg border border-surface-border rounded px-1 text-[10px]">Ctrl+↵</kbd> to submit
          </div>
          <div className="text-[11.5px] font-semibold text-primary bg-primary-bg border border-primary-border px-3 py-[4px] rounded-[20px] tracking-[.3px] font-mono">
            {nextTicket}
          </div>
        </div>
      </div>

      {/* Two-column form — scrollable columns */}
      <div className="flex-1 overflow-hidden grid gap-0" style={{ gridTemplateColumns: '3fr 2fr' }}>

        {/* ── LEFT COLUMN ─────────────────────────────────────────────── */}
        <div className="overflow-y-auto pr-5 flex flex-col gap-[10px] pb-4">

          <Divider label="Student" />
          <CField label="Student Name" req>
            <input className="c-input" type="text" placeholder="e.g. Priya Sharma"
              value={form.name} onChange={e => set('name')(e.target.value)} autoComplete="off" />
          </CField>

          <div className="grid grid-cols-2 gap-2">
            <CField label="Phone" req>
              <input className="c-input" type="tel" placeholder="10-digit" maxLength={15}
                value={form.phone} onChange={e => set('phone')(e.target.value)} />
            </CField>
            <CField label="User Type" req>
              <CSel value={form.utype} onChange={set('utype')} opts={master?.USER_TYPE || []} />
            </CField>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <CField label="Batch / Plan">
              <CSel value={form.batch} onChange={set('batch')} opts={master?.BATCH || []} />
            </CField>
            <CField label="Date" req>
              <input className="c-input" type="date" value={form.date} onChange={e => set('date')(e.target.value)} />
            </CField>
          </div>

          <Divider label="Query" />
          <div className="grid grid-cols-2 gap-2">
            <CField label="Source" req>
              <CSel value={form.source} onChange={handleSourceChange} opts={master?.SOURCE || []} />
            </CField>
            <CField label="Response Medium">
              <CSel value={form.resp} onChange={set('resp')} opts={master?.SOURCE || []}
                disabled={form.sameSource} placeholder="— Same as source —" />
            </CField>
          </div>

          <label className="flex items-center gap-2 cursor-pointer -mt-1">
            <input type="checkbox" checked={form.sameSource}
              onChange={e => toggleSameSource(e.target.checked)}
              style={{ width: 'auto' }} />
            <span className="text-[11px] font-semibold text-status-success">✓ Same as source</span>
          </label>

          <div className="grid grid-cols-2 gap-2">
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
              value={form.desc} onChange={e => set('desc')(e.target.value)} />
          </CField>
        </div>

        {/* ── RIGHT COLUMN ────────────────────────────────────────────── */}
        <div className="overflow-y-auto pl-5 flex flex-col gap-[10px] pb-4 border-l border-surface-border">

          <Divider label="Priority" />
          <CField label="Priority" req>
            <div className="flex gap-2">
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

          <div className="grid grid-cols-2 gap-2">
            <CField label="Assignee">
              <CSel value={form.assignee} onChange={set('assignee')} opts={master?.ASSIGNEE || []} />
            </CField>
            <CField label="Status">
              <CSel value={form.status} onChange={set('status')} opts={statuses} />
            </CField>
          </div>

          <Divider label="Resolution" />
          <CField label="First Contact Resolved?">
            <div className="flex gap-2">
              {[
                { v:'Yes', label:'✓ Yes' },
                { v:'No',  label:'✗ No'  },
              ].map(({ v, label }) => (
                <button key={v} onClick={() => setFCR(v)}
                  className={`fcr-btn ${form.fcr === 'Yes' && v === 'Yes' ? 'sel-yes' : form.fcr === 'No' && v === 'No' ? 'sel-no' : ''}`}>
                  {label}
                </button>
              ))}
            </div>
          </CField>

          <CField label="Remark / Notes">
            <textarea className="c-input" rows={3} placeholder="Follow-up needed, context…"
              value={form.remark} onChange={e => set('remark')(e.target.value)} />
          </CField>

          {/* Submit buttons — pinned at bottom of right col */}
          <div className="flex gap-2 justify-end mt-auto pt-2">
            <button className="btn-ghost btn-sm" onClick={handleReset}>Clear</button>
            <button id="submit-btn" className="btn-primary btn-sm px-5" onClick={handleSubmit} disabled={submitting}>
              Log Query →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
