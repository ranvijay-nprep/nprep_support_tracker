import { useCallback, useEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'

// ── Shared primitives ────────────────────────────────────────────────────────

function AddRow({ placeholder, placeholder2, onAdd, twoFields }) {
  const [v1, setV1] = useState('')
  const [v2, setV2] = useState('')
  function submit() {
    if (!v1.trim()) return
    onAdd(v1.trim(), v2.trim())
    setV1(''); setV2('')
  }
  return (
    <div className="flex gap-2 mt-3 pt-3 border-t border-surface-border">
      <input className="field-input flex-1 text-[13px]" placeholder={placeholder}
        value={v1} onChange={e => setV1(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()} />
      {twoFields && (
        <input className="field-input flex-1 text-[13px]" placeholder={placeholder2}
          value={v2} onChange={e => setV2(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()} />
      )}
      <button className="btn-primary btn-sm px-4 shrink-0" onClick={submit}>Add</button>
    </div>
  )
}

function DelBtn({ onDelete }) {
  return (
    <button onClick={onDelete}
      className="shrink-0 w-6 h-6 rounded flex items-center justify-center text-[14px] text-text-muted hover:bg-status-dangerBg hover:text-status-danger transition-all cursor-pointer border-0 bg-transparent">
      ×
    </button>
  )
}

function InlineText({ value, onSave, className = '' }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  const ref = useRef(null)

  useEffect(() => { setVal(value) }, [value])
  useEffect(() => { if (editing) ref.current?.focus() }, [editing])

  function save() {
    setEditing(false)
    if (val.trim() && val.trim() !== value) onSave(val.trim())
    else setVal(value)
  }

  if (editing) {
    return (
      <input ref={ref} className={`field-input py-[4px] text-[13px] ${className}`}
        value={val} onChange={e => setVal(e.target.value)}
        onBlur={save}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setEditing(false); setVal(value) } }} />
    )
  }
  return (
    <span className={`cursor-pointer hover:text-primary transition-colors ${className}`}
      onClick={() => setEditing(true)} title="Click to edit">
      {value}
    </span>
  )
}

// ── 1. AGENTS ────────────────────────────────────────────────────────────────

function AgentsSection({ showToast, loadMaster }) {
  const [agents, setAgents] = useState([])
  const [depts, setDepts]   = useState([])

  const load = useCallback(async () => {
    const [{ data: a }, { data: s }] = await Promise.all([
      supabase.from('agents').select('*').order('name'),
      supabase.from('settings').select('key').eq('section', 'DEPARTMENT'),
    ])
    setAgents(a || [])
    setDepts((s || []).map(r => r.key))
  }, [])

  useEffect(() => { load() }, [load])

  async function addAgent(name, department) {
    const row = { name, department: department || '', active: true }
    setAgents(prev => [...prev, { ...row, id: 'tmp' }])
    const { data, error } = await supabase.from('agents').insert(row).select().single()
    if (error) { showToast('error', 'Failed to add', error.message); load(); return }
    setAgents(prev => prev.map(a => a.id === 'tmp' ? data : a))
    showToast('success', 'Agent added', name)
    loadMaster()
  }

  async function updateAgent(id, patch) {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a))
    const { error } = await supabase.from('agents').update(patch).eq('id', id)
    if (error) { showToast('error', 'Failed', error.message); load(); return }
    showToast('success', 'Saved')
    loadMaster()
  }

  async function deleteAgent(id, name) {
    if (!window.confirm(`Delete agent "${name}"?`)) return
    setAgents(prev => prev.filter(a => a.id !== id))
    await supabase.from('agents').delete().eq('id', id)
    showToast('success', 'Agent removed', name)
    loadMaster()
  }

  return (
    <div>
      <p className="text-[12.5px] text-text-secondary mb-4">
        Agents listed here appear in the Assignee dropdown. Toggle <strong>Active</strong> to remove someone from the dropdown without deleting them.
      </p>
      <div className="overflow-x-auto border border-surface-border rounded-[10px] overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr>
              {['Name','Department','Status',''].map(h => <th key={h} className="tbl-th">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {agents.length === 0 && (
              <tr><td colSpan={4} className="tbl-td text-center text-text-muted py-8">No agents yet</td></tr>
            )}
            {agents.map(a => (
              <tr key={a.id} className="hover:bg-[#fafbff]">
                <td className="tbl-td font-medium">
                  <InlineText value={a.name} onSave={v => updateAgent(a.id, { name: v })} />
                </td>
                <td className="tbl-td">
                  {depts.length ? (
                    <select className="field-input py-[4px] text-[12.5px]"
                      value={a.department || ''}
                      onChange={e => updateAgent(a.id, { department: e.target.value })}>
                      <option value="">— None —</option>
                      {depts.map(d => <option key={d}>{d}</option>)}
                    </select>
                  ) : (
                    <InlineText value={a.department || '—'} onSave={v => updateAgent(a.id, { department: v })} />
                  )}
                </td>
                <td className="tbl-td">
                  <button onClick={() => updateAgent(a.id, { active: !a.active })}
                    className={`px-3 py-[3px] rounded-full text-[11px] font-semibold border transition-all cursor-pointer
                      ${a.active
                        ? 'bg-status-successBg border-[#6ee7b7] text-status-success'
                        : 'bg-surface-bg2 border-surface-border2 text-text-muted'}`}>
                    {a.active ? '● Active' : '○ Inactive'}
                  </button>
                </td>
                <td className="tbl-td w-8">
                  <DelBtn onDelete={() => deleteAgent(a.id, a.name)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AddRow placeholder="Agent name" placeholder2="Department (optional)" twoFields onAdd={addAgent} />
    </div>
  )
}

// ── 2. SIMPLE LIST ───────────────────────────────────────────────────────────

function SimpleListSection({ section, description, showToast, loadMaster }) {
  const [items, setItems] = useState([])

  const load = useCallback(async () => {
    const { data } = await supabase.from('settings').select('id,key').eq('section', section).order('key')
    setItems(data || [])
  }, [section])

  useEffect(() => { load() }, [load])

  async function addItem(name) {
    if (items.find(i => i.key === name)) return showToast('error', 'Already exists', name)
    setItems(prev => [...prev, { id: 'tmp', key: name }])
    const { data, error } = await supabase.from('settings').insert({ section, key: name, value: '' }).select().single()
    if (error) { showToast('error', 'Failed', error.message); load(); return }
    setItems(prev => prev.map(i => i.id === 'tmp' ? data : i))
    showToast('success', 'Added', name)
    loadMaster()
  }

  async function updateItem(id, newKey) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, key: newKey } : i))
    const { error } = await supabase.from('settings').update({ key: newKey }).eq('id', id)
    if (error) { showToast('error', 'Failed', error.message); load(); return }
    showToast('success', 'Saved')
    loadMaster()
  }

  async function deleteItem(id, name) {
    if (!window.confirm(`Delete "${name}"?`)) return
    setItems(prev => prev.filter(i => i.id !== id))
    await supabase.from('settings').delete().eq('id', id)
    showToast('success', 'Deleted', name)
    loadMaster()
  }

  return (
    <div>
      {description && <p className="text-[12.5px] text-text-secondary mb-4">{description}</p>}
      <div className="border border-surface-border rounded-[10px] overflow-hidden">
        {items.length === 0 && (
          <div className="px-4 py-8 text-center text-text-muted text-[13px]">Nothing here yet</div>
        )}
        {items.map((item, idx) => (
          <div key={item.id}
            className={`flex items-center gap-2 px-4 py-[9px] group ${idx < items.length - 1 ? 'border-b border-[#f1f5f9]' : ''} hover:bg-[#fafbff]`}>
            <InlineText value={item.key} onSave={v => updateItem(item.id, v)}
              className="flex-1 text-[13.5px] text-text-primary" />
            <DelBtn onDelete={() => deleteItem(item.id, item.key)} />
          </div>
        ))}
      </div>
      <AddRow placeholder="Add new…" onAdd={addItem} />
    </div>
  )
}

// ── 3 & 4. TWO-PANEL ─────────────────────────────────────────────────────────

function TwoPanelSection({ leftSection, rightSection, leftLabel, rightLabel, rightPlaceholder, description, showToast, loadMaster }) {
  const [leftItems,  setLeftItems]  = useState([])
  const [rightRows,  setRightRows]  = useState([])
  const [selected,   setSelected]   = useState(null)

  const loadLeft = useCallback(async () => {
    const { data } = await supabase.from('settings').select('id,key').eq('section', leftSection).order('key')
    setLeftItems(data || [])
    setSelected(prev => prev || data?.[0]?.key || null)
  }, [leftSection])

  const loadRight = useCallback(async () => {
    const { data } = await supabase.from('settings').select('id,key,value').eq('section', rightSection)
    setRightRows(data || [])
  }, [rightSection])

  useEffect(() => { loadLeft(); loadRight() }, [loadLeft, loadRight])

  const rightRow   = rightRows.find(r => r.key === selected)
  const rightItems = rightRow ? (rightRow.value || '').split(',').map(v => v.trim()).filter(Boolean) : []

  async function persistRight(newItems) {
    const val = newItems.join(',')
    if (rightRow) {
      await supabase.from('settings').update({ value: val }).eq('id', rightRow.id)
    } else if (selected) {
      const { data } = await supabase.from('settings')
        .insert({ section: rightSection, key: selected, value: val }).select().single()
      if (data) setRightRows(prev => [...prev, data])
    }
  }

  // Left CRUD
  async function addLeft(name) {
    if (leftItems.find(i => i.key === name)) return showToast('error', 'Already exists', name)
    setLeftItems(prev => [...prev, { id: 'tmp', key: name }])
    const { data, error } = await supabase.from('settings').insert({ section: leftSection, key: name, value: '' }).select().single()
    if (error) { showToast('error', 'Failed', error.message); loadLeft(); return }
    setLeftItems(prev => prev.map(i => i.id === 'tmp' ? data : i))
    setSelected(name)
    showToast('success', 'Added', name)
    loadMaster()
  }

  async function deleteLeft(id, name) {
    if (!window.confirm(`Delete "${name}" and all its ${rightLabel.toLowerCase()}?`)) return
    setLeftItems(prev => prev.filter(i => i.id !== id))
    await supabase.from('settings').delete().eq('id', id)
    const rr = rightRows.find(r => r.key === name)
    if (rr) { await supabase.from('settings').delete().eq('id', rr.id); loadRight() }
    if (selected === name) setSelected(leftItems.filter(i => i.id !== id)[0]?.key || null)
    showToast('success', 'Deleted', name)
    loadMaster()
  }

  async function updateLeft(id, newKey) {
    const oldKey = leftItems.find(i => i.id === id)?.key
    setLeftItems(prev => prev.map(i => i.id === id ? { ...i, key: newKey } : i))
    await supabase.from('settings').update({ key: newKey }).eq('id', id)
    const rr = rightRows.find(r => r.key === oldKey)
    if (rr) { await supabase.from('settings').update({ key: newKey }).eq('id', rr.id); loadRight() }
    if (selected === oldKey) setSelected(newKey)
    showToast('success', 'Renamed')
    loadMaster()
  }

  // Right CRUD
  async function addRight(name) {
    if (rightItems.includes(name)) return showToast('error', 'Already exists', name)
    const newItems = [...rightItems, name]
    setRightRows(prev => {
      const rr = prev.find(r => r.key === selected)
      return rr
        ? prev.map(r => r.key === selected ? { ...r, value: newItems.join(',') } : r)
        : [...prev, { id: 'tmp2', key: selected, value: newItems.join(',') }]
    })
    await persistRight(newItems)
    loadRight()
    showToast('success', 'Added', name)
    loadMaster()
  }

  async function deleteRight(name) {
    if (!window.confirm(`Delete "${name}"?`)) return
    const newItems = rightItems.filter(i => i !== name)
    setRightRows(prev => prev.map(r => r.key === selected ? { ...r, value: newItems.join(',') } : r))
    await persistRight(newItems)
    showToast('success', 'Deleted', name)
    loadMaster()
  }

  async function updateRight(oldVal, newVal) {
    const newItems = rightItems.map(i => i === oldVal ? newVal : i)
    setRightRows(prev => prev.map(r => r.key === selected ? { ...r, value: newItems.join(',') } : r))
    await persistRight(newItems)
    showToast('success', 'Saved')
    loadMaster()
  }

  return (
    <div>
      {description && <p className="text-[12.5px] text-text-secondary mb-4">{description}</p>}
      <div className="grid grid-cols-2 gap-4 h-full">
        {/* Left */}
        <div className="border border-surface-border rounded-[10px] overflow-hidden flex flex-col">
          <div className="px-3 py-[8px] bg-surface-bg border-b border-surface-border text-[10.5px] font-bold uppercase tracking-[.6px] text-text-muted shrink-0">
            {leftLabel}
          </div>
          <div className="flex-1 overflow-y-auto">
            {leftItems.length === 0 && <div className="px-4 py-6 text-text-muted text-[13px] text-center">None yet</div>}
            {leftItems.map(item => (
              <div key={item.id} onClick={() => setSelected(item.key)}
                className={`flex items-center gap-2 px-3 py-[8px] cursor-pointer transition-all border-b border-[#f1f5f9] group
                  ${selected === item.key ? 'bg-primary-bg' : 'hover:bg-surface-bg'}`}>
                <InlineText value={item.key} onSave={v => updateLeft(item.id, v)}
                  className={`flex-1 text-[13px] ${selected === item.key ? 'text-primary font-semibold' : 'text-text-primary'}`} />
                <DelBtn onDelete={e => { e?.stopPropagation?.(); deleteLeft(item.id, item.key) }} />
              </div>
            ))}
          </div>
          <div className="px-3 pb-3 pt-2 border-t border-surface-border shrink-0">
            <div className="flex gap-2">
              <input className="field-input flex-1 text-[12.5px] py-[5px]"
                placeholder={`Add ${leftLabel}…`}
                onKeyDown={e => { if (e.key === 'Enter' && e.target.value.trim()) { addLeft(e.target.value.trim()); e.target.value = '' } }} />
              <button className="btn-primary btn-sm px-3"
                onClick={e => { const inp = e.target.previousSibling; if (inp?.value.trim()) { addLeft(inp.value.trim()); inp.value='' } }}>
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="border border-surface-border rounded-[10px] overflow-hidden flex flex-col">
          <div className="px-3 py-[8px] bg-surface-bg border-b border-surface-border text-[10.5px] font-bold uppercase tracking-[.6px] text-text-muted shrink-0">
            {selected ? `${rightLabel} for: ${selected}` : rightLabel}
          </div>
          <div className="flex-1 overflow-y-auto">
            {!selected && <div className="px-4 py-6 text-text-muted text-[13px] text-center">← Select a {leftLabel.toLowerCase()}</div>}
            {selected && rightItems.length === 0 && <div className="px-4 py-6 text-text-muted text-[13px] text-center">No {rightLabel.toLowerCase()} yet</div>}
            {selected && rightItems.map(item => (
              <div key={item} className="flex items-center gap-2 px-3 py-[8px] border-b border-[#f1f5f9] hover:bg-surface-bg group">
                <InlineText value={item} onSave={v => updateRight(item, v)}
                  className="flex-1 text-[13px] text-text-primary" />
                <DelBtn onDelete={() => deleteRight(item)} />
              </div>
            ))}
          </div>
          {selected && (
            <div className="px-3 pb-3 pt-2 border-t border-surface-border shrink-0">
              <div className="flex gap-2">
                <input className="field-input flex-1 text-[12.5px] py-[5px]"
                  placeholder={rightPlaceholder}
                  onKeyDown={e => { if (e.key === 'Enter' && e.target.value.trim()) { addRight(e.target.value.trim()); e.target.value = '' } }} />
                <button className="btn-primary btn-sm px-3"
                  onClick={e => { const inp = e.target.previousSibling; if (inp?.value.trim()) { addRight(inp.value.trim()); inp.value='' } }}>
                  Add
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 5. EMAIL CONFIG ──────────────────────────────────────────────────────────

function EmailSection({ showToast }) {
  const [rows,  setRows]  = useState([])
  const [depts, setDepts] = useState([])

  const load = useCallback(async () => {
    const [{ data: emails }, { data: deps }] = await Promise.all([
      supabase.from('settings').select('id,key,value').eq('section', 'DEPT_EMAIL').order('key'),
      supabase.from('settings').select('key').eq('section', 'DEPARTMENT').order('key'),
    ])
    setRows(emails || [])
    setDepts((deps || []).map(d => d.key))
  }, [])

  useEffect(() => { load() }, [load])

  async function addRow(dept, email) {
    if (!dept || !email) return showToast('error', 'Both fields required')
    if (rows.find(r => r.key === dept)) return showToast('error', 'Already configured', 'Edit it inline')
    setRows(prev => [...prev, { id: 'tmp', key: dept, value: email }])
    const { data, error } = await supabase.from('settings').insert({ section: 'DEPT_EMAIL', key: dept, value: email }).select().single()
    if (error) { showToast('error', 'Failed', error.message); load(); return }
    setRows(prev => prev.map(r => r.id === 'tmp' ? data : r))
    showToast('success', 'Email saved', `${dept} → ${email}`)
  }

  async function updateEmail(id, newEmail) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, value: newEmail } : r))
    const { error } = await supabase.from('settings').update({ value: newEmail }).eq('id', id)
    if (error) { showToast('error', 'Failed', error.message); load(); return }
    showToast('success', 'Email updated')
  }

  async function deleteRow(id, dept) {
    if (!window.confirm(`Remove email for "${dept}"?`)) return
    setRows(prev => prev.filter(r => r.id !== id))
    await supabase.from('settings').delete().eq('id', id)
    showToast('success', 'Removed', dept)
  }

  const availDepts = depts.filter(d => !rows.find(r => r.key === d))

  return (
    <div>
      <p className="text-[12.5px] text-text-secondary mb-4">
        These emails receive notifications when tickets are routed to their department. Click any email to edit it inline.
      </p>
      <div className="border border-surface-border rounded-[10px] overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr>
              <th className="tbl-th">Department</th>
              <th className="tbl-th">Notification Email</th>
              <th className="tbl-th w-8"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={3} className="tbl-td text-center text-text-muted py-8">No emails configured</td></tr>
            )}
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-[#fafbff]">
                <td className="tbl-td font-medium text-text-primary">{r.key}</td>
                <td className="tbl-td">
                  <InlineText value={r.value || 'Click to add email'} onSave={v => updateEmail(r.id, v)}
                    className="text-primary" />
                </td>
                <td className="tbl-td">
                  <DelBtn onDelete={() => deleteRow(r.id, r.key)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {availDepts.length > 0 ? (
        (() => {
          let deptRef = ''
          let emailRef = ''
          return (
            <div className="flex gap-2 mt-3 pt-3 border-t border-surface-border">
              <select className="field-input flex-1 text-[13px]"
                onChange={e => { deptRef = e.target.value }}>
                <option value="">— Select Department —</option>
                {availDepts.map(d => <option key={d}>{d}</option>)}
              </select>
              <input className="field-input flex-1 text-[13px]" placeholder="email@nprep.in"
                onChange={e => { emailRef = e.target.value }} />
              <button className="btn-primary btn-sm px-4"
                onClick={e => {
                  const row = e.target.closest('div')
                  const sel = row.querySelector('select')
                  const inp = row.querySelector('input')
                  if (sel.value && inp.value) {
                    addRow(sel.value, inp.value)
                    sel.value = ''; inp.value = ''
                  }
                }}>Add</button>
            </div>
          )
        })()
      ) : (
        <p className="text-[12px] text-text-muted mt-3 pt-3 border-t border-surface-border">
          All departments have emails. Add departments in the Departments section first.
        </p>
      )}
    </div>
  )
}

// ── SIDEBAR ITEMS ─────────────────────────────────────────────────────────────

const SIDEBAR = [
  { id: 'agents',  icon: '👥', label: 'Agents'        },
  { id: 'batches', icon: '📚', label: 'Batches'       },
  { id: 'queries', icon: '❓', label: 'Query Types'   },
  { id: 'depts',   icon: '🏢', label: 'Departments'   },
  { id: 'emails',  icon: '📧', label: 'Email Config'  },
]

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────

export default function Settings() {
  const { showToast, loadMaster } = useApp()
  const [tab, setTab] = useState('agents')

  const sections = {
    agents: {
      title: 'Agents',
      content: <AgentsSection showToast={showToast} loadMaster={loadMaster} />,
    },
    batches: {
      title: 'Batches / Plans',
      content: <SimpleListSection section="BATCH" description="Batch and plan names shown in the Batch/Plan dropdown." showToast={showToast} loadMaster={loadMaster} />,
    },
    queries: {
      title: 'Query Types & Categories',
      content: <TwoPanelSection
        leftSection="QUERY_TYPE" rightSection="CATEGORY"
        leftLabel="Query Types" rightLabel="Categories"
        rightPlaceholder="Add category…"
        description="Select a query type on the left, then manage its categories on the right. Click any name to rename inline."
        showToast={showToast} loadMaster={loadMaster} />,
    },
    depts: {
      title: 'Departments & Owners',
      content: <TwoPanelSection
        leftSection="DEPARTMENT" rightSection="OWNER"
        leftLabel="Departments" rightLabel="Owners"
        rightPlaceholder="Add owner name…"
        description="Select a department on the left, then manage its owners on the right."
        showToast={showToast} loadMaster={loadMaster} />,
    },
    emails: {
      title: 'Email Config',
      content: <EmailSection showToast={showToast} />,
    },
  }

  const active = sections[tab]

  return (
    <div className="h-full flex overflow-hidden py-4 gap-0">

      {/* ── Sidebar ── */}
      <div className="w-44 shrink-0 flex flex-col gap-[2px] pr-3 border-r border-surface-border overflow-y-auto">
        <div className="text-[10px] font-bold uppercase tracking-[.8px] text-text-muted px-2 mb-2">Admin Panel</div>
        {SIDEBAR.map(item => (
          <button key={item.id} onClick={() => setTab(item.id)}
            className={`w-full flex items-center gap-[8px] px-3 py-[8px] rounded-lg text-left text-[13px] transition-all border-0 cursor-pointer
              ${tab === item.id
                ? 'bg-primary-bg text-primary font-semibold'
                : 'bg-transparent text-text-secondary hover:bg-surface-bg hover:text-text-primary'}`}>
            <span className="text-[15px]">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* ── Content panel ── */}
      <div className="flex-1 overflow-y-auto pl-5">
        <div className="mb-4 pb-3 border-b border-surface-border">
          <div className="text-[16px] font-bold text-text-primary">{active.title}</div>
        </div>
        {active.content}
      </div>
    </div>
  )
}
