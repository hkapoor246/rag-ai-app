 // src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import ChatPage from './pages/ChatPage';
import DocumentsPage from './pages/DocumentsPage';

function App() {
  return (
    <Router>
      <div className="App">
        <nav className="main-nav">
          <Link to="/">Chat</Link>
          <Link to="/documents">Documents</Link>
        </nav>
        <main className="content">
          <Routes>
            <Route path="/" element={<ChatPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
