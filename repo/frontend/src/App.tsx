import { Routes, Route } from 'react-router-dom'
import CaseListPage from './pages/CaseListPage'
import CaseDetailPage from './pages/CaseDetailPage'
import Viewer3DPage from './pages/Viewer3DPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<CaseListPage />} />
      <Route path="/cases/:id" element={<CaseDetailPage />} />
      <Route path="/cases/:id/3d" element={<Viewer3DPage />} />
    </Routes>
  )
}

export default App
