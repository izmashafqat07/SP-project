// src/components/CompanyDataset.jsx
import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';

export default function CompanyDataset({ ticker, companyName, fileName }) {
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch the Excel file from the public folder
        const response = await fetch(`/datasets/${fileName}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${fileName}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        // Enable cellDates to try parsing date cells
        const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        // Convert sheet to JSON array of arrays (each inner array is a row)
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        setData(jsonData);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchData();
  }, [fileName]);

  // Helper function to round numeric values that are not dates
  const displayCell = (cell) => {
    if (typeof cell === 'number') {
      return cell.toFixed(2);
    }
    const num = parseFloat(cell);
    if (!isNaN(num)) {
      return num.toFixed(2);
    }
    return cell;
  };

  // Helper function to format date cells using XLSX.SSF.parse_date_code
  const formatDate = (cell) => {
    // If cell is already a Date object, use locale format.
    if (cell instanceof Date) {
      return cell.toLocaleDateString();
    }
    // If cell is a number, try parsing it as an Excel date code.
    if (typeof cell === 'number') {
      const dateObj = XLSX.SSF.parse_date_code(cell);
      if (dateObj) {
        const { y, m, d } = dateObj;
        // Format with leading zeros if needed (MM/DD/YYYY)
        const month = m < 10 ? `0${m}` : m;
        const day = d < 10 ? `0${d}` : d;
        return `${month}/${day}/${y}`;
      }
    }
    // Fallback if cell is not a recognized date
    return cell;
  };

  // Render table only if data is available
  const renderTable = () => {
    if (!data || data.length === 0) return <p>No data available.</p>;
    const headers = data[0];
    const rows = data.slice(1, 11); // first 10 rows of data (excluding header)
    return (
      <table className="dataset-table">
        <thead>
          <tr>
            {headers.map((header, i) => (
              <th key={i}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => {
                // Check if the header for this column is "date" (case-insensitive)
                const headerText = headers[j] ? headers[j].toString().toLowerCase() : '';
                return (
                  <td key={j}>
                    {headerText === 'date' ? formatDate(cell) : displayCell(cell)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  // Enhanced column descriptions including the Volume column
  const columnDescriptions = [
    { 
      title: 'Date', 
      description: 'The date when the record was logged. Format: MM/DD/YYYY. Essential for tracking daily trends.' 
    },
    { 
      title: 'Open', 
      description: 'The opening price at the beginning of the trading session. Indicates initial market sentiment.' 
    },
    { 
      title: 'High', 
      description: 'The highest price reached during the day. Useful for identifying intraday peaks and volatility.' 
    },
    { 
      title: 'Low', 
      description: 'The lowest price reached during the day. Helps in assessing market dips and risk levels.' 
    },
    { 
      title: 'Close', 
      description: 'The closing price at the end of the trading session. Important for evaluating overall daily performance.' 
    },
    { 
      title: 'Volume', 
      description: 'The total number of shares traded during the session. Provides insights into market liquidity and trading activity.' 
    },
  ];

  return (
    <div className="company-dataset">
      <h2>{companyName} ({ticker})</h2>
      {error && <p className="error">{error}</p>}
      <div className="company-dataset-content">
        <div className="dataset-table-container">
          {renderTable()}
        </div>
        <div className="dataset-details">
          <h3>Column Descriptions</h3>
          <ul>
            {columnDescriptions.map((col, i) => (
              <li key={i}>
                <strong>{col.title}:</strong> {col.description}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
