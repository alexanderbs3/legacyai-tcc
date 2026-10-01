import { Route, Routes } from 'react-router-dom'
import { GlobalLoader } from './components/GlobalLoader'
import { DashboardPage } from './pages/DashboardPage'
import { AnalysisResultPage } from './pages/AnalysisResultPage'
import { HistoryPage } from './pages/HistoryPage'
import { LoginPage } from './pages/LoginPage'
import { NewAnalysisPage } from './pages/NewAnalysisPage'
import { NewProjectPage } from './pages/NewProjectPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ProjectDetailPage } from './pages/ProjectDetailPage'
import { ProcessingPage } from './pages/ProcessingPage'
import { RegisterPage } from './pages/RegisterPage'
import { ProtectedRoute } from './routes/ProtectedRoute'

function App() {
  return <><GlobalLoader /><Routes><Route path="/login" element={<LoginPage />} /><Route path="/register" element={<RegisterPage />} /><Route element={<ProtectedRoute />}><Route path="/dashboard" element={<DashboardPage />} /><Route path="/history" element={<HistoryPage />} /><Route path="/projects/new" element={<NewProjectPage />} /><Route path="/projects/:id" element={<ProjectDetailPage />} /><Route path="/projects/:id/analyses/new" element={<NewAnalysisPage />} /><Route path="/analyses/:id/processing" element={<ProcessingPage />} /><Route path="/analyses/:id" element={<AnalysisResultPage />} /></Route><Route path="*" element={<NotFoundPage />} /></Routes></>
}

export default App
