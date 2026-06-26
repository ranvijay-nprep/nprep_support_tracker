import { useApp } from '../context/AppContext'

export default function Toast() {
  const { toast } = useApp()
  if (!toast) return null
  const isSuccess = toast.type === 'success'
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: '#fff',
      border: '1px solid #e8edf2',
      borderLeft: `3px solid ${isSuccess ? '#16a34a' : '#e11d48'}`,
      borderRadius: 12,
      padding: '12px 16px',
      display: 'flex', alignItems: 'center', gap: 10,
      minWidth: 260, maxWidth: 340,
      boxShadow: '0 8px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
      animation: 'toastIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
    }}>
      <div style={{ fontSize: 16, flexShrink: 0 }}>{isSuccess ? '✅' : '❌'}</div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>{toast.title}</div>
        {toast.sub && <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 1 }}>{toast.sub}</div>}
      </div>
    </div>
  )
}
