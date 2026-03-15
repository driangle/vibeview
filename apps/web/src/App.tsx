import { BrowserRouter, Routes, Route } from "react-router-dom";
import { NavBar } from "./components/NavBar";
import { SessionList } from "./pages/SessionList";
import { SessionView } from "./pages/SessionView";

export function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <Routes>
        <Route path="/" element={<SessionList />} />
        <Route path="/session/:id" element={<SessionView />} />
      </Routes>
    </BrowserRouter>
  );
}
