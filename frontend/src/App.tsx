import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { GlobalLoader } from './components/layout/GlobalLoader';
import { ProtectedRoute } from './routes/ProtectedRoute';

const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })),
);
const AnalysisResultPage = lazy(() =>
  import('./pages/AnalysisResultPage').then((module) => ({ default: module.AnalysisResultPage })),
);
const HistoryPage = lazy(() =>
  import('./pages/HistoryPage').then((module) => ({ default: module.HistoryPage })),
);
const LoginPage = lazy(() =>
  import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })),
);
const NewAnalysisPage = lazy(() =>
  import('./pages/NewAnalysisPage').then((module) => ({ default: module.NewAnalysisPage })),
);
const NewProjectPage = lazy(() =>
  import('./pages/NewProjectPage').then((module) => ({ default: module.NewProjectPage })),
);
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })),
);
const ProjectDetailPage = lazy(() =>
  import('./pages/ProjectDetailPage').then((module) => ({ default: module.ProjectDetailPage })),
);
const ProcessingPage = lazy(() =>
  import('./pages/ProcessingPage').then((module) => ({ default: module.ProcessingPage })),
);
const RegisterPage = lazy(() =>
  import('./pages/RegisterPage').then((module) => ({ default: module.RegisterPage })),
);

function App() {
  return (
    <>
      <GlobalLoader />
      <Suspense
        fallback={
          <div
            className="grid min-h-screen place-items-center text-sm text-muted-foreground"
            role="status"
          >
            Carregando página…
          </div>
        }
      >
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/projects/new" element={<NewProjectPage />} />
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
            <Route path="/projects/:id/analyses/new" element={<NewAnalysisPage />} />
            <Route path="/analyses/:id/processing" element={<ProcessingPage />} />
            <Route path="/analyses/:id" element={<AnalysisResultPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
