import { useEffect, useReducer, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'

const INIT = {
  name: '', phone: '', utype: '', batch: '',
  date: new Date().toISOString().slice(0, 10),
  source: '', resp: '', sameSource: true,
  qtype: '', cat: '', desc: '',
  priority: '', dept: '', owner: '', assignee: '', status: 'Pending',
  fcr: '', remark: '',
}

function reducer(state, action) {
  if (action.type === 'set') return { ...state, [action.key]: action.val }
  if (action.type === 'reset') return { ...INIT, date: new Date().toISOString().slice(0, 10) }
  return state
}

function Sel({ id, value, onChange, opts = [], placeholder = '— Select —', disabled }) {
  return (
    <select id={id} className="field-input" value={value} onChange={e => onChange(e.target.value)} disabled={disabled}>
      <option value="">{placeholder}</option>
      {opts.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function Label({ children, req }) {
  return (
    <label className="text-[11.5px] font-semibold text-text-secondary">
      {children}{req && <span className="text-status-danger ml-[2px]">*</span>}
    </label>
  )
}

function Field({ label, req, children }) {
  return (
    <div className="flex flex-col gap-[5px]">
      <Label req={req}>{label}</Label>
      {children}
    </div>
  )
}

export default function NewQuery() {
  const { master, agent, showToast, showSpinner, generateTicketId } = useApp()
  const [form, dispatch] = useReducer(reducer, { ...INIT, assignee: agent })
  const [nextTicket, setNextTicket] = useState('generating…')
  const [submitting, setSubmitting] = useState(false)

  const set = (key) => (val) => dispatch({ type: 'set', key, val })

  useEffect(() => {
    if (agent) dispatch({ type: 'set', key: 'assignee', val: agent })
  }, [agent])

  useEffect(() => {
    generateTicketId().then(id => setNextTicket(id))
  }, [])

  const cats  = master?.CATEGORY?.[form.qtype]  || []
  const owners = master?.OWNER?.[form.dept]      || []

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
  function toggleSame(checked) {
    dispatch({ type: 'set', key: 'sameSource', val: checked })
    if (checked) dispatch({ type: 'set', key: 'resp', val: form.source })
  }
  function setPri(val) { dispatch({ type: 'set', key: 'priority', val }) }
  function setFCR(val) { dispatch({ type: 'set', key: 'fcr', val: form.fcr === val ? '' : val }) }

  function priClass(v) {
    if (form.priority !== v) return ''
    return v === 'High' ? 'sel-high' : v === 'Medium' ? 'sel-medium' : 'sel-low'
  }

  async function handleSubmit() {
    const errs = []
    if (!form.name)     errs.push('Student Name')
    if (!form.phone)    errs.push('Phone')
    if (!form.utype)    errs.push('User Type')
    if (!form.date)     errs.push('Date')
    if (!form.source)   errs.push('Source')
    if (!form.qtype)    errs.push('Query Type')
    if (!form.cat)      errs.push('Category')
    if (!form.desc)     errs.push('Description')
    if (!form.priority) errs.push('Priority')
    if (!form.dept)     errs.push('Department')
    if (errs.length) return showToast('error', 'Required fields missing', errs.join(', '))

    setSubmitting(true)
    showSpinner(true, 'Logging query…')

    const ticket_id = await generateTicketId()
    const payload = {
      ticket_id,
      date:                 form.date,
      student_name:         form.name.trim(),
      phone:                form.phone.trim(),
      user_type:            form.utype,
      batch:                form.batch,
      source:               form.source,
      response_medium:      form.sameSource ? form.source : form.resp,
      query_type:           form.qtype,
      category:             form.cat,
      query_description:    form.desc.trim(),
      priority:             form.priority,
      department:           form.dept,
      owner:                form.owner,
      assignee:             form.assignee,
      status:               form.status || 'Pending',
      date_received:        form.date,
      first_contact_resolved: form.fcr,
      remark:               form.remark.trim(),
    }

    const { error } = await supabase.from('support_tickets').insert(payload)
    showSpinner(false)
    setSubmitting(false)

    if (error) {
      showToast('error', 'Save failed', error.message)
    } else {
      showToast('success', 'Query logged! ✓', `Ticket: ${ticket_id}`)
      dispatch({ type: 'reset' })
      if (agent) dispatch({ type: 'set', key: 'assignee', val: agent })
      generateTicketId().then(id => setNextTicket(id))
    }
  }

  function handleReset() {
    dispatch({ type: 'reset' })
    if (agent) dispatch({ type: 'set', key: 'assignee', val: agent })
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-[18px]">
        <div className="text-[20px] font-extrabold tracking-[-0.4px] text-text-primary">
          Log a <span className="text-primary">Support Query</span>
        </div>
        <div className="text-[11.5px] font-semibold text-primary bg-primary-bg border border-primary-border px-3 py-[5px] rounded-[20px] tracking-[.3px]">
          Next: {nextTicket}
        </div>
      </div>

      {/* Student Info */}
      <div className="card">
        <div className="card-header">
          <span className="text-[15px]">👤</span>
          <span className="card-title">Student Info</span>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-4 gap-[13px]">
            <Field label="Student Name" req>
              <input className="field-input" type="text" placeholder="e.g. Priya Sharma" value={form.name} onChange={e => set('name')(e.target.value)} autoComplete="off" />
            </Field>
            <Field label="Phone Number" req>
              <input className="field-input" type="tel" placeholder="10-digit number" maxLength={15} value={form.phone} onChange={e => set('phone')(e.target.value)} />
            </Field>
            <Field label="User Type" req>
              <Sel value={form.utype} onChange={set('utype')} opts={master?.USER_TYPE || []} />
            </Field>
            <Field label="Batch / Plan">
              <Sel value={form.batch} onChange={set('batch')} opts={master?.BATCH || []} />
            </Field>
          </div>
        </div>
      </div>

      {/* Query Details */}
      <div className="card">
        <div className="card-header">
          <span className="text-[15px]">📋</span>
          <span className="card-title">Query Details</span>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-4 gap-[13px]">
            <Field label="Date" req>
              <input className="field-input" type="date" value={form.date} onChange={e => set('date')(e.target.value)} />
            </Field>
            <Field label="Source" req>
              <Sel value={form.source} onChange={handleSourceChange} opts={master?.SOURCE || []} />
            </Field>
            <Field label="Response Medium">
              <Sel value={form.resp} onChange={set('resp')} opts={master?.SOURCE || []} disabled={form.sameSource} placeholder="— Same as source —" />
              <label className="flex items-center gap-[6px] mt-[6px] cursor-pointer">
                <input type="checkbox" checked={form.sameSource} onChange={e => toggleSame(e.target.checked)} style={{ width: 'auto' }} />
                <span className="text-[11.5px] font-semibold text-status-success">✓ Same as source</span>
              </label>
            </Field>
            <div /> {/* spacer */}
            <Field label="Query Type" req>
              <Sel value={form.qtype} onChange={handleQTypeChange} opts={master?.QUERY_TYPE || []} />
            </Field>
            <Field label="Category" req>
              <Sel value={form.cat} onChange={set('cat')} opts={cats} placeholder={cats.length ? '— Select Category —' : '— Select type first —'} />
            </Field>
            <div className="col-span-2">
              <Field label="Query Description" req>
                <textarea className="field-input" placeholder="Brief description of the issue or request…" rows={2} value={form.desc} onChange={e => set('desc')(e.target.value)} />
              </Field>
            </div>
          </div>
        </div>
      </div>

      {/* Routing & Priority */}
      <div className="card">
        <div className="card-header">
          <span className="text-[15px]">🔀</span>
          <span className="card-title">Routing &amp; Priority</span>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-4 gap-[13px]">
            <div className="col-span-4">
              <Field label="Priority" req>
                <div className="flex gap-2">
                  {['High','Medium','Low'].map(v => (
                    <button key={v} onClick={() => setPri(v)} className={`p-pill ${priClass(v)}`}>
                      {v === 'High' ? '🔴' : v === 'Medium' ? '🟡' : '🟢'} {v}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
            <Field label="Department" req>
              <Sel value={form.dept} onChange={handleDeptChange} opts={master?.DEPARTMENT || []} />
            </Field>
            <Field label="Owner">
              <Sel value={form.owner} onChange={set('owner')} opts={owners} placeholder={owners.length ? '— Select Owner —' : '— Select dept first —'} />
            </Field>
            <Field label="Assignee">
              <Sel value={form.assignee} onChange={set('assignee')} opts={master?.ASSIGNEE || []} />
            </Field>
            <Field label="Status">
              <Sel value={form.status} onChange={set('status')} opts={master?.STATUS || ['Pending','In Process','Resolved','Closed','No Solution Yet']} />
            </Field>
          </div>
        </div>
      </div>

      {/* Resolution */}
      <div className="card">
        <div className="card-header">
          <span className="text-[15px]">✅</span>
          <span className="card-title">Resolution (if resolved on call)</span>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-4 gap-[13px]">
            <div className="col-span-2">
              <Field label="First Contact Resolved?">
                <div className="flex gap-2">
                  {[{ v:'Yes', label:'✓ Yes — Resolved on call' }, { v:'No', label:'✗ No — Needs follow-up' }].map(({ v, label }) => (
                    <button key={v} onClick={() => setFCR(v)}
                      className={`fcr-btn ${form.fcr === 'Yes' && v === 'Yes' ? 'sel-yes' : form.fcr === 'No' && v === 'No' ? 'sel-no' : ''}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Remark / Notes">
                <textarea className="field-input" placeholder="Follow-up needed, additional context…" rows={2} value={form.remark} onChange={e => set('remark')(e.target.value)} />
              </Field>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Row */}
      <div className="flex justify-end gap-[10px] mt-[18px]">
        <button className="btn-ghost" onClick={handleReset}>Clear</button>
        <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
          <span>Log Query</span><span>→</span>
        </button>
      </div>
    </div>
  )
}
