import { useState } from 'react'
import { useApp } from '../context/AppContext'

export default function AgentModal({ onClose }) {
  const { master, agent: currentAgent, saveAgent, showToast } = useApp()
  const [selected, setSelected] = useState(currentAgent)
  const agents = master?.ASSIGNEE || []

  function confirm() {
    if (!selected) return showToast('error', 'Select your name', 'Please select before continuing')
    saveAgent(selected)
    onClose()
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(8px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: '#fff', borderRadius: 16, padding: 28,
        width: 360, maxWidth: '95vw',
        boxShadow: '0 20px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)',
        border: '1px solid #e8edf2',
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>👋 Who are you?</div>
        <div style={{ fontSize: 12.5, color: '#64748b', marginBottom: 20 }}>Select your name to personalize your queue</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
          {agents.map(a => (
            <button
              key={a}
              onClick={() => setSelected(a)}
              style={{
                padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                fontSize: 13, fontFamily: 'Inter, sans-serif', textAlign: 'center',
                transition: 'all 0.15s ease',
                fontWeight: selected === a ? 600 : 500,
                background: selected === a ? '#eff6ff' : '#f8fafc',
                border: selected === a ? '1.5px solid #2563eb' : '1px solid #e8edf2',
                color: selected === a ? '#2563eb' : '#64748b',
                boxShadow: selected === a ? '0 0 0 3px rgba(37,99,235,0.08)' : 'none',
              }}
            >{a}</button>
          ))}
        </div>

        <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={confirm}>
          Continue →
        </button>
      </div>
    </div>
  )
}
