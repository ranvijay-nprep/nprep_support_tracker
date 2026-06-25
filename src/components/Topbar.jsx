import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import AgentModal from './AgentModal'

const NAV = [
  { path: '/',         icon: '＋', label: 'New Query'  },
  { path: '/log',      icon: '☰', label: 'Query Log'  },
  { path: '/settings', icon: '⚙', label: 'Settings'   },
]

export default function Topbar() {
  const { agent, master } = useApp()
  const navigate   = useNavigate()
  const { pathname } = useLocation()
  const [time, setTime]   = useState('')
  const [showAgent, setShowAgent] = useState(false)

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // Show agent modal on first load if not set
  useEffect(() => {
    if (master && (!agent || !master.ASSIGNEE?.includes(agent))) {
      setShowAgent(true)
    }
  }, [master])

  return (
    <>
      <div
        className="sticky top-0 z-[200] flex items-center justify-between px-6 h-[56px] gap-4 border-b border-surface-border"
        style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', boxShadow: '0 1px 3px rgba(0,0,0,.08)' }}
      >
        {/* Logo */}
        <a className="flex items-center gap-[10px] no-underline" href="/">
          <div
            className="w-8 h-8 rounded-[9px] flex items-center justify-center text-white font-extrabold text-[14px]"
            style={{ background: 'linear-gradient(135deg,#2563eb,#3b82f6)', boxShadow: '0 2px 8px rgba(37,99,235,.35)' }}
          >N</div>
          <div className="font-bold text-[15px] text-text-primary tracking-[-0.3px]">
            NPrep <span className="text-primary font-extrabold">Support</span>
          </div>
        </a>

        {/* Nav */}
        <div className="flex gap-[2px] bg-surface-bg border border-surface-border rounded-[9px] p-[3px]">
          {NAV.map(n => (
            <button
              key={n.path}
              onClick={() => navigate(n.path)}
              className={`flex items-center gap-[6px] px-4 py-[5px] rounded-[7px] border-0 text-[12.5px] cursor-pointer transition-all duration-150
                ${pathname === n.path
                  ? 'bg-white text-primary font-semibold'
                  : 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-bg2'
                }`}
              style={pathname === n.path ? { boxShadow: '0 1px 3px rgba(0,0,0,.08)' } : {}}
            >
              <span className="text-[14px]">{n.icon}</span>
              <span className="hidden sm:inline">{n.label}</span>
            </button>
          ))}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <div className="text-[12px] text-text-muted tabular-nums tracking-[.3px]">{time}</div>
          <div
            className="flex items-center gap-[6px] bg-primary-bg border border-primary-border rounded-[20px] px-3 py-1 cursor-pointer"
            onClick={() => setShowAgent(true)}
            title="Click to change"
          >
            <div className="w-[7px] h-[7px] rounded-full bg-status-success" />
            <div className="text-[12px] font-semibold text-primary">{agent || 'Select Agent'}</div>
          </div>
        </div>
      </div>

      {showAgent && <AgentModal onClose={() => setShowAgent(false)} />}
    </>
  )
}
