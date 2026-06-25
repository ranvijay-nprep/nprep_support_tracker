import { useCallback, useEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'

// ── Shared primitives ────────────────────────────────────────────────────────

function SectionCard({ icon, title, children }) {
  return (
    <div className="card">
      <div className="card-header">
        <span className="text-[15px]">{icon}</span>
        <span className="card-title">{title}</span>
      </div>
      <div className="card-body">{children}</div>
    </div>
  )
}

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
      <input
        className="field-input flex-1"
        placeholder={placeholder}
        value={v1}
        onChange={e => setV1(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
      />
      {twoFields && (
        <input
          className="field-input flex-1"
          placeholder={placeholder2}
          value={v2}
          onChange={e => setV2(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
        />
      )}
      <button className="btn-primary btn-sm px-4" onClick={submit}>Add</button>
    </div>
  )
}

function DelBtn({ onDelete }) {
  return (
    <button
      onClick={onDelete}
      className="ml-auto shrink-0 w-6 h-6 rounded flex items-center justify-center text-text-muted hover:bg-status-dangerBg hover:text-status-danger transition-all text-[14px]"
      title="Delete"
    >×</button>
  )
}

function InlineText({ value, onSave, className = '' }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal]         = useState(value)
  const inputRef = useRef(null)

  useEffect(() => { setVal(value) }, [value])
  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  function save() {
    setEditing(false)
    if (val.trim() && val.trim() !== value) onSave(val.trim())
    else setVal(value)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        className={`field-input py-[4px] ${className}`}
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={save}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setEditing(false); setVal(value) } }}
      />
    )
  }
  return (
    <span
      className={`cursor-pointer hover:text-primary transition-colors ${className}`}
      onClick={() => setEditing(true)}
      title="Click to edit"
    >{value}</span>
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
    const opt = [...agents, { ...row, id: 'tmp' }]
    setAgents(opt)
    const { data, error } = await supabase.from('agents').insert(row).select().single()
    if (error) { showToast('error', 'Failed to add agent', error.message); load(); return }
    setAgents(prev => prev.map(a => a.id === 'tmp' ? data : a))
    showToast('success', 'Agent added', name)
    loadMaster()
  }

  async function updateAgent(id, patch) {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a))
    const { error } = await supabase.from('agents').update(patch).eq('id', id)
    if (error) { showToast('error', 'Failed to update', error.message); load(); return }
    showToast('success', 'Saved')
    loadMaster()
  }

  async function deleteAgent(id, name) {
    if (!window.confirm(`Delete agent "${name}"?`)) return
    setAgents(prev => prev.filter(a => a.id !== id))
    const { error } = await supabase.from('agents').delete().eq('id', id)
    if (error) { showToast('error', 'Failed to delete', error.message); load(); return }
    showToast('success', 'Agent removed', name)
    loadMaster()
  }

  return (
    <SectionCard icon="👥" title="Agents">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr>
              {['Name','Department','Active',''].map(h => (
                <th key={h} className="tbl-th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {agents.length === 0 && (
              <tr><td colSpan={4} className="tbl-td text-text-muted text-center py-6">No agents yet — add one below</td></tr>
            )}
            {agents.map(a => (
              <tr key={a.id} className="hover:bg-[#fafbff]">
                <td className="tbl-td font-medium">
                  <InlineText value={a.name} onSave={v => updateAgent(a.id, { name: v })} />
                </td>
                <td className="tbl-td">
                  {depts.length ? (
                    <select
                      className="field-input py-[4px] text-[12.5px]"
                      value={a.department || ''}
                      onChange={e => updateAgent(a.id, { department: e.target.value })}
                    >
                      <option value="">— None —</option>
                      {depts.map(d => <option key={d}>{d}</option>)}
                    </select>
                  ) : (
                    <InlineText value={a.department || '—'} onSave={v => updateAgent(a.id, { department: v })} />
                  )}
                </td>
                <td className="tbl-td">
                  <button
                    onClick={() => updateAgent(a.id, { active: !a.active })}
                    className={`px-3 py-[3px] rounded-full text-[11px] font-semibold border transition-all cursor-pointer
                      ${a.active
                        ? 'bg-status-successBg border-[#6ee7b7] text-status-success'
                        : 'bg-surface-bg2 border-surface-border2 text-text-muted'}`}
                  >{a.active ? 'Active' : 'Inactive'}</button>
                </td>
                <td className="tbl-td">
                  <button
                    onClick={() => deleteAgent(a.id, a.name)}
                    className="w-6 h-6 rounded flex items-center justify-center text-text-muted hover:bg-status-dangerBg hover:text-status-danger transition-all text-[14px] cursor-pointer"
                  >×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AddRow placeholder="Agent name" placeholder2="Department (optional)" twoFields onAdd={addAgent} />
    </SectionCard>
  )
}

// ── 2. SIMPLE LIST (Batches) ─────────────────────────────────────────────────

function SimpleListSection({ section, icon, title, fieldLabel, showToast }) {
  const [items, setItems] = useState([])

  const load = useCallback(async () => {
    const { data } = await supabase.from('settings').select('id,key').eq('section', section).order('key')
    setItems(data || [])
  }, [section])

  useEffect(() => { load() }, [load])

  async function addItem(name) {
    const tmp = { id: 'tmp', key: name }
    setItems(prev => [...prev, tmp])
    const { data, error } = await supabase.from('settings').insert({ section, key: name, value: '' }).select().single()
    if (error) { showToast('error', 'Failed to add', error.message); load(); return }
    setItems(prev => prev.map(i => i.id === 'tmp' ? data : i))
    showToast('success', 'Added', name)
  }

  async function updateItem(id, newKey) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, key: newKey } : i))
    const { error } = await supabase.from('settings').update({ key: newKey }).eq('id', id)
    if (error) { showToast('error', 'Failed to update', error.message); load(); return }
    showToast('success', 'Saved')
  }

  async function deleteItem(id, name) {
    if (!window.confirm(`Delete "${name}"?`)) return
    setItems(prev => prev.filter(i => i.id !== id))
    const { error } = await supabase.from('settings').delete().eq('id', id)
    if (error) { showToast('error', 'Failed to delete', error.message); load(); return }
    showToast('success', 'Deleted', name)
  }

  return (
    <SectionCard icon={icon} title={title}>
      <div className="flex flex-col gap-[2px]">
        {items.length === 0 && <div className="text-text-muted text-[13px] py-3">No {fieldLabel.toLowerCase()}s yet</div>}
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-2 px-2 py-[7px] rounded-lg hover:bg-surface-bg group">
            <InlineText
              value={item.key}
              onSave={v => updateItem(item.id, v)}
              className="flex-1 text-[13.5px] text-text-primary"
            />
            <DelBtn onDelete={() => deleteItem(item.id, item.key)} />
          </div>
        ))}
      </div>
      <AddRow placeholder={`Add ${fieldLabel}…`} onAdd={addItem} />
    </SectionCard>
  )
}

// ── 3 & 4. TWO-PANEL (Query Types ↔ Categories / Departments ↔ Owners) ──────

function TwoPanelSection({ icon, title, leftSection, rightSection, leftLabel, rightLabel, rightPlaceholder, showToast }) {
  const [leftItems,  setLeftItems]  = useState([]) // [{ id, key }]
  const [rightRows,  setRightRows]  = useState([]) // [{ id, key, value }] raw settings rows for right section
  const [selected,   setSelected]   = useState(null) // key string

  const loadLeft = useCallback(async () => {
    const { data } = await supabase.from('settings').select('id,key').eq('section', leftSection).order('key')
    setLeftItems(data || [])
    setSelected(prev => prev || data?.[0]?.key || null)
  }, [leftSection])

  const loadRight = useCallback(async () => {
    const { data } = await supabase.from('settings').select('id,key,value').eq('section', rightSection).order('key')
    setRightRows(data || [])
  }, [rightSection])

  useEffect(() => { loadLeft(); loadRight() }, [loadLeft, loadRight])

  // Right items for selected left item (value is comma-separated)
  const rightRow   = rightRows.find(r => r.key === selected)
  const rightItems = rightRow
    ? (rightRow.value || '').split(',').map(v => v.trim()).filter(Boolean)
    : []

  async function saveRightItems(newItems) {
    const val = newItems.join(',')
    if (rightRow) {
      await supabase.from('settings').update({ value: val }).eq('id', rightRow.id)
    } else if (selected) {
      await supabase.from('settings').insert({ section: rightSection, key: selected, value: val })
      loadRight()
    }
  }

  // Left CRUD
  async function addLeft(name) {
    if (leftItems.find(i => i.key === name)) return showToast('error', 'Already exists', name)
    const tmp = { id: 'tmp', key: name }
    setLeftItems(prev => [...prev, tmp])
    const { data, error } = await supabase.from('settings').insert({ section: leftSection, key: name, value: '' }).select().single()
    if (error) { showToast('error', 'Failed to add', error.message); loadLeft(); return }
    setLeftItems(prev => prev.map(i => i.id === 'tmp' ? data : i))
    setSelected(name)
    showToast('success', 'Added', name)
  }

  async function deleteLeft(id, name) {
    if (!window.confirm(`Delete "${name}" and all its ${rightLabel.toLowerCase()}?`)) return
    setLeftItems(prev => prev.filter(i => i.id !== id))
    await supabase.from('settings').delete().eq('id', id)
    const rr = rightRows.find(r => r.key === name)
    if (rr) await supabase.from('settings').delete().eq('id', rr.id)
    loadRight()
    if (selected === name) setSelected(leftItems.filter(i => i.id !== id)[0]?.key || null)
    showToast('success', 'Deleted', name)
  }

  async function updateLeft(id, newKey) {
    const oldKey = leftItems.find(i => i.id === id)?.key
    setLeftItems(prev => prev.map(i => i.id === id ? { ...i, key: newKey } : i))
    await supabase.from('settings').update({ key: newKey }).eq('id', id)
    const rr = rightRows.find(r => r.key === oldKey)
    if (rr) {
      await supabase.from('settings').update({ key: newKey }).eq('id', rr.id)
      loadRight()
    }
    if (selected === oldKey) setSelected(newKey)
    showToast('success', 'Renamed', newKey)
  }

  // Right CRUD
  async function addRight(name) {
    if (rightItems.includes(name)) return showToast('error', 'Already exists', name)
    const newItems = [...rightItems, name]
    setRightRows(prev => {
      const rr = prev.find(r => r.key === selected)
      if (rr) return prev.map(r => r.key === selected ? { ...r, value: newItems.join(',') } : r)
      return [...prev, { id: 'tmp', key: selected, value: newItems.join(',') }]
    })
    await saveRightItems(newItems)
    loadRight()
    showToast('success', 'Added', name)
  }

  async function deleteRight(name) {
    if (!window.confirm(`Delete "${name}"?`)) return
    const newItems = rightItems.filter(i => i !== name)
    setRightRows(prev => prev.map(r => r.key === selected ? { ...r, value: newItems.join(',') } : r))
    await saveRightItems(newItems)
    loadRight()
    showToast('success', 'Deleted', name)
  }

  async function updateRight(oldVal, newVal) {
    const newItems = rightItems.map(i => i === oldVal ? newVal : i)
    setRightRows(prev => prev.map(r => r.key === selected ? { ...r, value: newItems.join(',') } : r))
    await saveRightItems(newItems)
    showToast('success', 'Saved')
  }

  return (
    <SectionCard icon={icon} title={title}>
      <div className="grid grid-cols-2 gap-4">
        {/* Left panel */}
        <div className="border border-surface-border rounded-lg overflow-hidden">
          <div className="px-3 py-[8px] bg-surface-bg border-b border-surface-border text-[11px] font-bold uppercase tracking-[.6px] text-text-muted">
            {leftLabel}
          </div>
          <div className="p-2 flex flex-col gap-[2px] min-h-[120px]">
            {leftItems.length === 0 && <div className="text-text-muted text-[12.5px] py-3 px-1">None yet</div>}
            {leftItems.map(item => (
              <div
                key={item.id}
                onClick={() => setSelected(item.key)}
                className={`flex items-center gap-2 px-2 py-[6px] rounded-lg cursor-pointer transition-all group
                  ${selected === item.key ? 'bg-primary-bg border border-primary-border' : 'hover:bg-surface-bg'}`}
              >
                <InlineText
                  value={item.key}
                  onSave={v => updateLeft(item.id, v)}
                  className={`flex-1 text-[13px] ${selected === item.key ? 'text-primary font-semibold' : 'text-text-primary'}`}
                />
                <DelBtn onDelete={e => { e?.stopPropagation?.(); deleteLeft(item.id, item.key) }} />
              </div>
            ))}
          </div>
          <div className="px-2 pb-2">
            <AddRow placeholder={`Add ${leftLabel}…`} onAdd={addLeft} />
          </div>
        </div>

        {/* Right panel */}
        <div className="border border-surface-border rounded-lg overflow-hidden">
          <div className="px-3 py-[8px] bg-surface-bg border-b border-surface-border text-[11px] font-bold uppercase tracking-[.6px] text-text-muted">
            {selected ? `${rightLabel}: ${selected}` : rightLabel}
          </div>
          <div className="p-2 flex flex-col gap-[2px] min-h-[120px]">
            {!selected && <div className="text-text-muted text-[12.5px] py-3 px-1">← Select a {leftLabel.toLowerCase()}</div>}
            {selected && rightItems.length === 0 && <div className="text-text-muted text-[12.5px] py-3 px-1">No {rightLabel.toLowerCase()} yet</div>}
            {selected && rightItems.map(item => (
              <div key={item} className="flex items-center gap-2 px-2 py-[6px] rounded-lg hover:bg-surface-bg group">
                <InlineText
                  value={item}
                  onSave={v => updateRight(item, v)}
                  className="flex-1 text-[13px] text-text-primary"
                />
                <DelBtn onDelete={() => deleteRight(item)} />
              </div>
            ))}
          </div>
          {selected && (
            <div className="px-2 pb-2">
              <AddRow placeholder={rightPlaceholder} onAdd={addRight} />
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  )
}

// ── 5. EMAIL CONFIG ──────────────────────────────────────────────────────────

function EmailSection({ showToast }) {
  const [rows, setRows] = useState([]) // [{ id, key(dept), value(email) }]
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
    if (rows.find(r => r.key === dept)) return showToast('error', 'Dept already has email', 'Edit it inline')
    const tmp = { id: 'tmp', key: dept, value: email }
    setRows(prev => [...prev, tmp])
    const { data, error } = await supabase.from('settings').insert({ section: 'DEPT_EMAIL', key: dept, value: email }).select().single()
    if (error) { showToast('error', 'Failed to add', error.message); load(); return }
    setRows(prev => prev.map(r => r.id === 'tmp' ? data : r))
    showToast('success', 'Email saved', `${dept} → ${email}`)
  }

  async function updateEmail(id, newEmail) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, value: newEmail } : r))
    const { error } = await supabase.from('settings').update({ value: newEmail }).eq('id', id)
    if (error) { showToast('error', 'Failed to save', error.message); load(); return }
    showToast('success', 'Email updated')
  }

  async function deleteRow(id, dept) {
    if (!window.confirm(`Remove email config for "${dept}"?`)) return
    setRows(prev => prev.filter(r => r.id !== id))
    await supabase.from('settings').delete().eq('id', id)
    showToast('success', 'Removed', dept)
  }

  const availDepts = depts.filter(d => !rows.find(r => r.key === d))

  return (
    <SectionCard icon="📧" title="Email Config (Department Notifications)">
      <div className="overflow-x-auto">
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
              <tr><td colSpan={3} className="tbl-td text-center text-text-muted py-6">No emails configured</td></tr>
            )}
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-[#fafbff]">
                <td className="tbl-td font-medium text-text-primary">{r.key}</td>
                <td className="tbl-td">
                  <InlineText
                    value={r.value || '—'}
                    onSave={v => updateEmail(r.id, v)}
                    className="text-primary"
                  />
                </td>
                <td className="tbl-td">
                  <button
                    onClick={() => deleteRow(r.id, r.key)}
                    className="w-6 h-6 rounded flex items-center justify-center text-text-muted hover:bg-status-dangerBg hover:text-status-danger transition-all text-[14px] cursor-pointer"
                  >×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {availDepts.length > 0 ? (
        <div className="flex gap-2 mt-3 pt-3 border-t border-surface-border">
          <select className="field-input flex-1" id="email-dept-sel">
            <option value="">— Select Department —</option>
            {availDepts.map(d => <option key={d}>{d}</option>)}
          </select>
          <input className="field-input flex-1" id="email-val-inp" placeholder="email@nprep.in" />
          <button
            className="btn-primary btn-sm px-4"
            onClick={() => {
              const d = document.getElementById('email-dept-sel').value
              const e = document.getElementById('email-val-inp').value
              if (d && e) { addRow(d, e); document.getElementById('email-dept-sel').value=''; document.getElementById('email-val-inp').value='' }
            }}
          >Add</button>
        </div>
      ) : (
        <p className="text-[12px] text-text-muted mt-3 pt-3 border-t border-surface-border">
          All departments have emails configured. Add more departments in the Departments section.
        </p>
      )}
    </SectionCard>
  )
}

// ── TABS ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'agents',    icon: '👥', label: 'Agents'          },
  { id: 'batches',   icon: '📚', label: 'Batches'         },
  { id: 'queries',   icon: '❓', label: 'Query Types'     },
  { id: 'depts',     icon: '🏢', label: 'Departments'     },
  { id: 'emails',    icon: '📧', label: 'Email Config'    },
]

// ── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function Settings() {
  const { showToast, loadMaster } = useApp()
  const [tab, setTab] = useState('agents')

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="text-[20px] font-extrabold tracking-[-0.4px] text-text-primary">
          ⚙ <span className="text-primary">Admin Panel</span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-[2px] bg-surface-bg border border-surface-border rounded-[9px] p-[3px] mb-5 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-[6px] px-4 py-[5px] rounded-[7px] border-0 text-[12.5px] cursor-pointer transition-all whitespace-nowrap
              ${tab === t.id
                ? 'bg-white text-primary font-semibold'
                : 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-bg2'
              }`}
            style={tab === t.id ? { boxShadow: '0 1px 3px rgba(0,0,0,.08)' } : {}}
          >
            <span>{t.icon}</span><span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Sections */}
      {tab === 'agents'  && <AgentsSection showToast={showToast} loadMaster={loadMaster} />}
      {tab === 'batches' && (
        <SimpleListSection
          section="BATCH" icon="📚" title="Batches / Plans"
          fieldLabel="Batch" showToast={showToast}
        />
      )}
      {tab === 'queries' && (
        <TwoPanelSection
          icon="❓" title="Query Types & Categories"
          leftSection="QUERY_TYPE" rightSection="CATEGORY"
          leftLabel="Query Types" rightLabel="Categories"
          rightPlaceholder="Add category…"
          showToast={showToast}
        />
      )}
      {tab === 'depts' && (
        <TwoPanelSection
          icon="🏢" title="Departments & Owners"
          leftSection="DEPARTMENT" rightSection="OWNER"
          leftLabel="Departments" rightLabel="Owners"
          rightPlaceholder="Add owner name…"
          showToast={showToast}
        />
      )}
      {tab === 'emails' && <EmailSection showToast={showToast} />}
    </div>
  )
}
