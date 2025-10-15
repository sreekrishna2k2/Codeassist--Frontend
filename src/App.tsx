import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import LandingPage from './pages/LandingPage';
import UploadPage from './pages/UploadPage';
import ExplorerPage from './pages/ExplorerPage';
import ChatQueryPage from './pages/ChatQueryPage';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/explorer/:runId" element={<ExplorerPage />} />
          <Route path="/chat-query/:runId" element={<ChatQueryPage />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
