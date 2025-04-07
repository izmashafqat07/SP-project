// CompanySelector.js
import React from 'react';
import './CompanySelector.css';

export default function CompanySelector({ selected, onChange }) {
  const companies = [
    { value: 'GOOGL', label: 'Google' },
    { value: 'AAPL', label: 'Apple' },
    { value: 'META', label: 'Meta' },
    { value: 'MSFT', label: 'Microsoft' },
    { value: 'AMZN', label: 'Amazon' }
  ];

  return (
    <div className="company-selector-container">
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        className="company-selector"
      >
        {companies.map((company) => (
          <option key={company.value} value={company.value}>
            {company.label}
          </option>
        ))}
      </select>
    </div>
  );
}
