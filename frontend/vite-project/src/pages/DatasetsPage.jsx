// src/pages/DatasetsPage.jsx
import React from 'react';
import CompanyDataset from '../components/CompanyDataset';
import './DatasetsPage.css';

const companies = [
  { ticker: 'AAPL', name: 'Apple', fileName: 'AAPL.xlsx' },
  { ticker: 'GOOGL', name: 'Google', fileName: 'GOOGL.xlsx' },
  { ticker: 'AMZN', name: 'Amazon', fileName: 'AMZN.xlsx' },
  { ticker: 'META', name: 'Meta', fileName: 'META.xlsx' },
  { ticker: 'MSFT', name: 'Microsoft', fileName: 'MSFT.xlsx' },
];

export default function DatasetsPage() {
  return (
    <div className="page">
      <h1>Datasets</h1>
      {companies.map(company => (
        <CompanyDataset 
          key={company.ticker} 
          ticker={company.ticker} 
          companyName={company.name} 
          fileName={company.fileName}
        />
      ))}
    </div>
  );
}
