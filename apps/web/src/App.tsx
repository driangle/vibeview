import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { NavBar } from './components/NavBar';
import { Footer } from './components/Footer';
import { SettingsProvider } from './contexts/SettingsContext';
import { DirectoryList } from './pages/DirectoryList';
import { SessionList } from './pages/SessionList';
import { SessionView } from './pages/SessionView';
import { Settings } from './pages/Settings';

export function App() {
  return (
    <BrowserRouter>
      <SettingsProvider>
        <div className="flex min-h-screen flex-col bg-bg">
          <NavBar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<SessionList />} />
              <Route path="/directories" element={<DirectoryList />} />
              <Route path="/session/:id" element={<SessionView />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </SettingsProvider>
    </BrowserRouter>
  );
}
