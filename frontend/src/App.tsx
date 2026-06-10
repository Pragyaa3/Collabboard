import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import HomePage from "./pages/HomePage";
import WhiteboardPage from "./pages/WhiteboardPage";

const App: React.FC = () => {
  const { ready } = useAuth();

  if (!ready) {
    return (
      <div className="loading-screen">
        <div className="spinner-border" role="status" />
        <span className="text-muted">Connecting...</span>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/board/:sessionId" element={<WhiteboardPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;