import { useApp } from '../context/AppContext'

export default function Spinner() {
  const { spinner, spinnerLabel } = useApp()
  if (!spinner) return null
  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-content-center gap-[14px]"
      style={{ background: 'rgba(248,250,252,.8)', backdropFilter: 'blur(3px)', display: 'flex', justifyContent: 'center' }}>
      <div
        className="spinner w-[34px] h-[34px] rounded-full border-[3px] border-surface-border"
        style={{ borderTopColor: '#2563eb' }}
      />
      <div className="text-[13px] text-text-secondary font-medium">{spinnerLabel}</div>
    </div>
  )
}
