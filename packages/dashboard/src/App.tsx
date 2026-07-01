import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Overview from './pages/Overview'
import Visitors from './pages/Visitors'
import VisitorDetail from './pages/VisitorDetail'
import Events from './pages/Events'
import Settings from './pages/Settings'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Overview />} />
        <Route path="/visitors" element={<Visitors />} />
        <Route path="/visitors/:id" element={<VisitorDetail />} />
        <Route path="/events" element={<Events />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
