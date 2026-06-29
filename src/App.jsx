import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import Topbar from './components/Topbar'
import Toast from './components/Toast'
import Spinner from './components/Spinner'
import NewQuery from './pages/NewQuery'
import QueryLog from './pages/QueryLog'
import Settings from './pages/Settings'
import Dashboard from './pages/Dashboard'

function Layout() {
  const location = useLocation()

  // Global keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      const tag = document.activeElement?.tagName
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'

      // Ctrl/Cmd + Enter → submit form
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        document.getElementById('submit-btn')?.click()
      }
      // R → refresh log (not in input, on log page)
      if (e.key === 'r' && !inInput && !e.ctrlKey && !e.metaKey) {
        document.getElementById('refresh-log-btn')?.click()
      }
      // Escape → close any modal (handled by modals via their own listeners)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    // Full-height, no page scroll — each view manages internal scroll
    <div className="h-full flex flex-col overflow-hidden bg-surface-bg">
      <Topbar />
      <div className="flex-1 overflow-hidden">
        <Routes>
          {/* Dashboard: full-width, no max-width container */}
          <Route path="/dashboard" element={<Dashboard />} />
          {/* All other pages: constrained width */}
          <Route path="*" element={
            <div className="h-full max-w-[1080px] mx-auto px-4">
              <Routes>
                <Route path="/"         element={<NewQuery />} />
                <Route path="/log"      element={<QueryLog />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </div>
          } />
        </Routes>
      </div>
      <Toast />
      <Spinner />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Layout />
    </AppProvider>
  )
}
