import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { NavBar } from './components/NavBar';
import { Footer } from './components/Footer';
import { SettingsProvider } from './contexts/SettingsContext';
import { DirectoryList } from './pages/DirectoryList';
import { SessionList } from './pages/SessionList';
import { SessionView } from './pages/SessionView';
import { Settings } from './pages/Settings';
import { UsagePatterns } from './pages/UsagePatterns';

export function App() {
  return (
    <BrowserRouter>
      <SettingsProvider>
        <div className="flex h-dvh flex-col bg-bg">
          <NavBar />
          <main className="min-h-0 flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<SessionList />} />
              <Route path="/directories" element={<DirectoryList />} />
              <Route path="/session/:id" element={<SessionView />} />
              <Route path="/activity" element={<UsagePatterns />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </SettingsProvider>
    </BrowserRouter>
  );
}
