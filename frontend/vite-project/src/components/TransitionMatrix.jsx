// src/components/TransitionMatrix.jsx
import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function TransitionMatrix({ ticker }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchTransitionMatrix = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/transition_matrix/${ticker}`);
      if (!response.ok) {
        throw new Error('Error fetching transition matrix');
      }
      const json = await response.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransitionMatrix();
  }, [ticker]);

  const renderTable = () => {
    if (!data) return null;
    const matrix = data.transition_matrix;
    return (
      <table className="transition-matrix-table">
        <thead>
          <tr>
            <th>From \ To</th>
            {matrix.map((_, index) => (
              <th key={index}>State {data.state_labels ? data.state_labels[index] : index}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={i}>
              <td>State {data.state_labels ? data.state_labels[i] : i}</td>
              {row.map((val, j) => (
                <td key={j}>{(val * 100).toFixed(2)}%</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderChart = () => {
    if (!data) return null;
    const matrix = data.transition_matrix;
    const labels = matrix.map((_, index) => data.state_labels ? data.state_labels[index] : `State ${index}`);
    // Create datasets for each "From" state.
    const datasets = matrix.map((row, i) => ({
      label: `From ${data.state_labels ? data.state_labels[i] : `State ${i}`}`,
      data: row,
      backgroundColor: `rgba(${(i+1)*50}, ${(i+1)*50}, 200, 0.5)`,
    }));

    const chartData = {
      labels,
      datasets,
    };

    return (
      <div style={{ maxWidth: '800px', margin: '20px auto' }}>
        <Bar 
          data={chartData} 
          options={{
            responsive: true,
            plugins: {
              title: {
                display: true,
                text: 'Transition Probabilities by From State'
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                max: 1,
                title: { display: true, text: 'Probability' }
              }
            }
          }}
        />
      </div>
    );
  };

  return (
    <div className="transition-matrix">
      <h2>Transition Matrix and State Information</h2>
      {loading && <p>Loading...</p>}
      {error && <p className="error">{error}</p>}
      {data && (
        <>
          <div className="matrix-table-container">
            {renderTable()}
          </div>
          <div className="matrix-chart-container">
            {renderChart()}
          </div>
        </>
      )}
    </div>
  );
}
