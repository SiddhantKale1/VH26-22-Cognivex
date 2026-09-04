import { BrowserRouter, Routes, Route } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Documents from "./pages/Documents";
import Search from "./pages/Search";
import ErrorAnalysis from "./pages/ErrorAnalysis";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/search" element={<Search />} />
        <Route path="/errors" element={<ErrorAnalysis />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;