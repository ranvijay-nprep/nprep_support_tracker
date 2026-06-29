import { useApp } from '../context/AppContext'

export default function Spinner() {
  const { spinner, spinnerLabel } = useApp()
  if (!spinner) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(248,250,252,0.85)',
      backdropFilter: 'blur(4px)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 14,
    }}>
      <div className="spinner" style={{
        width: 32, height: 32, borderRadius: '50%',
        border: '2.5px solid #e8edf2',
        borderTopColor: '#2563eb',
      }} />
      <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>{spinnerLabel}</div>
    </div>
  )
}
