import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const AppCtx = createContext(null)
export const useApp = () => useContext(AppCtx)

export function AppProvider({ children }) {
  const [master, setMaster]   = useState(null)   // loaded settings
  const [agent,  setAgent]    = useState(() => localStorage.getItem('nprep_agent') || '')
  const [toast,  setToast]    = useState(null)   // { type, title, sub }
  const [spinner, setSpinner] = useState(false)
  const [spinnerLabel, setSpinnerLabel] = useState('Loading…')
  const toastTimer = useRef(null)

  useEffect(() => { loadMaster() }, [])

  async function loadMaster() {
    setSpinner(true); setSpinnerLabel('Loading settings…')
    const [{ data, error }, { data: agentsData }] = await Promise.all([
      supabase.from('settings').select('*'),
      supabase.from('agents').select('name').eq('active', true).order('name'),
    ])
    if (error) {
      showToast('error', 'Failed to load settings', error.message)
      setSpinner(false)
      return
    }
    const m = parseMaster(data)
    m.ASSIGNEE = agentsData?.map(a => a.name) || []
    setMaster(m)
    setSpinner(false)
  }

  function parseMaster(rows) {
    const m = {
      USER_TYPE: [], BATCH: [], SOURCE: [], QUERY_TYPE: [],
      DEPARTMENT: [], ASSIGNEE: [], STATUS: [],
      CATEGORY: {}, OWNER: {}, DEPT_EMAIL: {},
    }
    for (const r of rows) {
      const s = r.section?.trim()
      const k = r.key?.trim()
      const v = r.value?.trim() || ''
      if (!s || !k) continue
      if (s === 'CATEGORY') {
        m.CATEGORY[k] = v ? v.split(',').map(x => x.trim()).filter(Boolean) : []
      } else if (s === 'OWNER') {
        m.OWNER[k] = v ? v.split(',').map(x => x.trim()).filter(Boolean) : []
      } else if (s === 'DEPT_EMAIL') {
        m.DEPT_EMAIL[k] = v
      } else if (Array.isArray(m[s])) {
        m[s].push(k)
      }
    }
    if (!m.STATUS.length) {
      m.STATUS = ['Pending', 'In Process', 'Resolved', 'Closed', 'No Solution Yet']
    }
    return m
  }

  async function generateTicketId() {
    const now  = new Date()
    const ym   = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}`
    const prefix = `NP${ym}`
    const { data } = await supabase
      .from('support_tickets')
      .select('ticket_id')
      .like('ticket_id', `${prefix}%`)
      .order('ticket_id', { ascending: false })
      .limit(1)
    const last = data?.[0]?.ticket_id
    const serial = last ? parseInt(last.slice(-3)) + 1 : 1
    return `${prefix}${String(serial).padStart(3, '0')}`
  }

  function saveAgent(name) {
    setAgent(name)
    localStorage.setItem('nprep_agent', name)
  }

  function showToast(type, title, sub = '') {
    clearTimeout(toastTimer.current)
    setToast({ type, title, sub })
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }

  function showSpinner(show, label = 'Loading…') {
    setSpinner(show)
    setSpinnerLabel(label)
  }

  return (
    <AppCtx.Provider value={{ master, loadMaster, agent, saveAgent, toast, showToast, spinner, spinnerLabel, showSpinner, generateTicketId }}>
      {children}
    </AppCtx.Provider>
  )
}
