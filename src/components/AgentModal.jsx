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
    <div className="fixed inset-0 z-[500] flex items-center justify-center" style={{ background: 'rgba(15,23,42,.4)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-[14px] p-6 w-[360px] max-w-[95vw]" style={{ boxShadow: '0 10px 15px rgba(0,0,0,.08)' }}>
        <h3 className="text-[16px] font-bold text-text-primary mb-1">👋 Who are you?</h3>
        <p className="text-[12.5px] text-text-secondary mb-4">Select your name to personalize your queue</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {agents.map(a => (
            <button
              key={a}
              onClick={() => setSelected(a)}
              className={`px-[10px] py-[10px] border-[1.5px] rounded-lg text-[13px] font-medium text-center transition-all cursor-pointer
                ${selected === a
                  ? 'border-primary bg-primary-bg text-primary font-semibold'
                  : 'border-surface-border2 text-text-secondary hover:border-primary hover:bg-primary-bg hover:text-primary'
                }`}
            >
              {a}
            </button>
          ))}
        </div>
        <button className="btn-primary w-full justify-center" onClick={confirm}>Continue →</button>
      </div>
    </div>
  )
}
