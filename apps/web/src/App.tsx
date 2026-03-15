import { BrowserRouter, Routes, Route } from "react-router-dom";
import { NavBar } from "./components/NavBar";
import { Footer } from "./components/Footer";
import { DirectoryList } from "./pages/DirectoryList";
import { SessionList } from "./pages/SessionList";
import { SessionView } from "./pages/SessionView";

export function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen flex-col">
        <NavBar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<SessionList />} />
            <Route path="/directories" element={<DirectoryList />} />
            <Route path="/session/:id" element={<SessionView />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
