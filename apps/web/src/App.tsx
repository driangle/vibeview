import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NavBar } from './components/NavBar';
import { Footer } from './components/Footer';
import { ProjectsProvider } from './contexts/ProjectsContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { SessionList } from './pages/SessionList';

const DirectoryList = lazy(() =>
  import('./pages/DirectoryList').then((m) => ({ default: m.DirectoryList })),
);
const SessionView = lazy(() =>
  import('./pages/SessionView').then((m) => ({ default: m.SessionView })),
);
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })));
const ProjectList = lazy(() =>
  import('./pages/ProjectList').then((m) => ({ default: m.ProjectList })),
);
const UsagePatterns = lazy(() =>
  import('./pages/UsagePatterns').then((m) => ({ default: m.UsagePatterns })),
);

export function App() {
  return (
    <BrowserRouter>
      <SettingsProvider>
        <ProjectsProvider>
          <div className="flex h-dvh flex-col bg-bg">
            <NavBar />
            <main className="min-h-0 flex-1 overflow-auto">
              <ErrorBoundary>
                <Suspense>
                  <Routes>
                    <Route path="/" element={<SessionList />} />
                    <Route path="/directories" element={<DirectoryList />} />
                    <Route path="/projects" element={<ProjectList />} />
                    <Route path="/session/:id" element={<SessionView />} />
                    <Route path="/activity" element={<UsagePatterns />} />
                    <Route path="/settings" element={<Settings />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            </main>
            <Footer />
          </div>
        </ProjectsProvider>
      </SettingsProvider>
    </BrowserRouter>
  );
}
