import { useApp } from '../context/AppContext'

export default function Toast() {
  const { toast } = useApp()
  if (!toast) return null
  return (
    <div
      className="fixed bottom-[22px] right-[22px] z-[9999] bg-white border border-surface-border rounded-[10px] px-4 py-3 flex items-center gap-[10px] min-w-[260px] max-w-[340px]"
      style={{
        boxShadow: '0 10px 15px rgba(0,0,0,.08), 0 4px 6px rgba(0,0,0,.05)',
        borderLeft: `3px solid ${toast.type === 'success' ? '#059669' : '#dc2626'}`,
        animation: 'toastIn .3s cubic-bezier(.34,1.56,.64,1)',
      }}
    >
      <div className="text-[17px] shrink-0">{toast.type === 'success' ? '✅' : '❌'}</div>
      <div>
        <div className="font-semibold text-[13px] text-text-primary">{toast.title}</div>
        {toast.sub && <div className="text-[11.5px] text-text-secondary mt-[1px]">{toast.sub}</div>}
      </div>
    </div>
  )
}
