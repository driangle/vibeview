import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SessionList } from "./pages/SessionList";
import { SessionView } from "./pages/SessionView";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SessionList />} />
        <Route path="/session/:id" element={<SessionView />} />
      </Routes>
    </BrowserRouter>
  );
}
