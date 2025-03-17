// src/App.jsx
import React, { useState } from 'react';
import CompanySelector from './components/CompanySelector';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import './styles.css';

function App() {
  const [selectedCompany, setSelectedCompany] = useState('GOOGL');
  const [modelInitialized, setModelInitialized] = useState(false);
  const [initError, setInitError] = useState(null);
  const [loading, setLoading] = useState(false);

  const runModel = async () => {
    setLoading(true);
    setInitError(null);
    try {
      const res = await fetch(`http://localhost:5000/api/init/${selectedCompany}`);
      if (!res.ok) throw new Error('Model initialization failed');
      const data = await res.json();
      console.log("Model initialized:", data);
      setModelInitialized(true);
    } catch (err) {
      setInitError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <h1>Stock Price Forecaster</h1>
      <CompanySelector 
        selected={selectedCompany} 
        onChange={(val) => {
          setSelectedCompany(val);
          setModelInitialized(false);
        }} 
      />
      <button onClick={runModel} disabled={loading}>
        {loading ? 'Running Model...' : 'Run Model'}
      </button>
      {initError && <div className="error">{initError}</div>}
      {modelInitialized && <AnalyticsDashboard ticker={selectedCompany} />}
    </div>
  );
}

export default App;
