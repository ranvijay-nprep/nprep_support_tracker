import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import AgentModal from './AgentModal'

const NAV = [
  { path: '/',           icon: '＋', label: 'New Query'  },
  { path: '/log',        icon: '☰',  label: 'Query Log'  },
  { path: '/dashboard',  icon: '📊', label: 'Dashboard'  },
  { path: '/settings',   icon: '⚙',  label: 'Settings'   },
]

export default function Topbar() {
  const { agent, master } = useApp()
  const navigate    = useNavigate()
  const { pathname } = useLocation()
  const [time, setTime]       = useState('')
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

  useEffect(() => {
    if (master && (!agent || !master.ASSIGNEE?.includes(agent))) {
      setShowAgent(true)
    }
  }, [master])

  return (
    <>
      <div
        className="flex items-center justify-between px-6 gap-4 shrink-0"
        style={{
          height: 56,
          background: 'rgba(255,255,255,0.90)',
          backdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: '1px solid rgba(226,232,240,0.8)',
          boxShadow: '0 1px 0 rgba(0,0,0,0.04)',
          position: 'relative',
          zIndex: 200,
        }}
      >
        {/* Logo */}
        <a href="/" className="flex items-center gap-[10px] no-underline shrink-0">
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: 13,
            boxShadow: '0 2px 6px rgba(37,99,235,0.3)',
          }}>N</div>
          <span style={{ fontWeight: 700, fontSize: 14.5, color: '#1e293b', letterSpacing: -0.3 }}>
            NPrep <span style={{ color: '#2563eb', fontWeight: 800 }}>Support</span>
          </span>
        </a>

        {/* Nav tabs */}
        <div style={{
          display: 'flex', gap: 2, padding: 3,
          background: '#f1f5f9', borderRadius: 9,
        }}>
          {NAV.map(n => {
            const active = pathname === n.path
            return (
              <button
                key={n.path}
                onClick={() => navigate(n.path)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 16px', borderRadius: 7, border: 'none',
                  fontSize: 12.5, fontFamily: 'Inter, sans-serif', cursor: 'pointer',
                  fontWeight: active ? 600 : 500,
                  color: active ? '#2563eb' : '#64748b',
                  background: active ? '#ffffff' : 'transparent',
                  boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ fontSize: 13 }}>{n.icon}</span>
                <span className="hidden sm:inline">{n.label}</span>
              </button>
            )
          })}
        </div>

        {/* Right section */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Clock */}
          <span style={{ fontSize: 12, color: '#94a3b8', fontVariantNumeric: 'tabular-nums', letterSpacing: 0.3 }}>
            {time}
          </span>

          {/* Agent pill — green */}
          <div
            onClick={() => setShowAgent(true)}
            title="Click to change agent"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#f0fdf4', border: '1px solid #dcfce7',
              borderRadius: 20, padding: '4px 12px',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#16a34a' }}>
              {agent || 'Select Agent'}
            </span>
          </div>
        </div>
      </div>

      {showAgent && <AgentModal onClose={() => setShowAgent(false)} />}
    </>
  )
}
