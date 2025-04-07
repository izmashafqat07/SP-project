// AppRoutes.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import DatasetsPage from './pages/DatasetsPage';
import './styles.css'; // this includes the navbar styles

function AppRoutes() {
  return (
    <Router>
      <nav className="navbar">
        <div className="navbar-brand">MarketMinds</div>
        <div className="navbar-links">
          <Link to="/">Home</Link>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/datasets">Datasets</Link>
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/datasets" element={<DatasetsPage />} />
      </Routes>
    </Router>
  );
}

export default AppRoutes;
