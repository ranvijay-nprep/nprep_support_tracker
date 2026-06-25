import { Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import Topbar from './components/Topbar'
import Toast from './components/Toast'
import Spinner from './components/Spinner'
import NewQuery from './pages/NewQuery'
import QueryLog from './pages/QueryLog'
import Settings from './pages/Settings'

function Layout() {
  return (
    <>
      <Topbar />
      <div className="max-w-[1080px] mx-auto px-4 pt-5 pb-10">
        <Routes>
          <Route path="/"         element={<NewQuery />} />
          <Route path="/log"      element={<QueryLog />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
      <Toast />
      <Spinner />
    </>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Layout />
    </AppProvider>
  )
}
