const METABASE_URL = 'https://analytics.nprep.in/public/dashboard/8ca9b7f0-db43-45bb-9241-fad164e3a1cd'

export default function Dashboard() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <iframe
        src={METABASE_URL}
        style={{ flex: 1, border: 'none', width: '100%' }}
        allowTransparency
        title="NPrep Analytics Dashboard"
      />
    </div>
  )
}
