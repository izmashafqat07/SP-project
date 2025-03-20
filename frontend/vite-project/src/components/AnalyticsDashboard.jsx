import React, { useState, useEffect } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import "chartjs-adapter-date-fns";
import {
  Chart as ChartJS,
  TimeScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  CategoryScale,
  BarElement,
} from 'chart.js';

ChartJS.register(
  TimeScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  CategoryScale,
  BarElement
);

export default function AnalyticsDashboard({ ticker }) {
  const [selectedGraph, setSelectedGraph] = useState('forecast');
  const [chartData, setChartData] = useState(null);
  const [transitionData, setTransitionData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const [modelDetails, setModelDetails] = useState(null);

  // When ticker changes, reinitialize the model and clear previous data
  useEffect(() => {
    setInitialized(false);
    setChartData(null);
    setTransitionData(null);
    setError(null);

    const initModel = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/init/${ticker}`);
        if (!response.ok) {
          throw new Error("Error initializing model");
        }
        const data = await response.json();
        console.log("Model initialized for", ticker, data);
        setModelDetails({ metrics: data.metrics, equation: data.equation });
        setInitialized(true);
      } catch (err) {
        console.error("Initialization error:", err);
        setError(err.message);
      }
    };

    initModel();
  }, [ticker]);

  // Fetch graph data after initialization or when selectedGraph changes
  useEffect(() => {
    if (!initialized) return;

    const controller = new AbortController();
    const signal = controller.signal;
    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        let response;
        if (selectedGraph === 'transition') {
          response = await fetch(`http://localhost:5000/api/transition_matrix/${ticker}`, { signal });
          if (!response.ok) throw new Error('Error fetching transition matrix data');
          const data = await response.json();
          setTransitionData(data);
        } else {
          let url = '';
          switch(selectedGraph) {
            case 'forecast':
              url = `http://localhost:5000/api/forecast/${ticker}/10`;
              break;
            case 'volatility':
              url = `http://localhost:5000/api/graph/volatility/${ticker}/10`;
              break;
            case 'movingavg':
              url = `http://localhost:5000/api/graph/movingavg/${ticker}/10`;
              break;
            case 'bollinger':
              url = `http://localhost:5000/api/graph/bollinger/${ticker}/10`;
              break;
            case 'macd':
              url = `http://localhost:5000/api/graph/macd/${ticker}/10`;
              break;
            default:
              break;
          }
          response = await fetch(url, { signal });
          if (!response.ok) throw new Error('Error fetching data');
          const data = await response.json();
          setChartData(data);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    return () => controller.abort();
  }, [selectedGraph, ticker, initialized]);

  // Render functions for transition matrix
  const renderTransitionMatrixView = () => {
    if (!transitionData) return null;
    return (
      <div>
        <h2>Transition Matrix &amp; State Information</h2>
        {renderTransitionTable()}
        {renderTransitionBarChart()}
      </div>
    );
  };

  const renderTransitionTable = () => {
    const matrix = transitionData.transition_matrix;
    return (
      <table className="transition-matrix-table">
        <thead>
          <tr>
            <th>From &#92; To</th>
            {matrix.map((_, index) => (
              <th key={index}>
                {transitionData.state_labels ? transitionData.state_labels[index] : `State ${index}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={i}>
              <td>{transitionData.state_labels ? transitionData.state_labels[i] : `State ${i}`}</td>
              {row.map((val, j) => (
                <td key={j}>{(val * 100).toFixed(2)}%</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderTransitionBarChart = () => {
    const matrix = transitionData.transition_matrix;
    const labels = matrix.map((_, index) =>
      transitionData.state_labels ? transitionData.state_labels[index] : `State ${index}`
    );
    const datasets = matrix.map((row, i) => ({
      label: `From ${transitionData.state_labels ? transitionData.state_labels[i] : `State ${i}`}`,
      data: row,
      backgroundColor: `rgba(${(i+1)*50}, ${(i+1)*50}, 200, 0.5)`
    }));
    const dataForChart = { labels, datasets };
    return (
      <div style={{ maxWidth: '800px', margin: '20px auto' }}>
        <Bar data={dataForChart} options={{
          responsive: true,
          plugins: {
            title: { display: true, text: 'Transition Probabilities by From State' }
          },
          scales: {
            y: { beginAtZero: true, max: 1, title: { display: true, text: 'Probability' } }
          }
        }} />
      </div>
    );
  };

  // Render functions for other graphs
  const renderGraphChart = () => {
    if (!chartData) return null;
    switch (selectedGraph) {
      case 'forecast':
        return (
          <Line
            data={{
              labels: chartData.dates,
              datasets: [{
                label: '10-Year Forecast',
                data: chartData.prices,
                borderColor: chartData.color,
                backgroundColor: chartData.color + "33",
                fill: true,
                tension: 0.3,
              }]
            }}
            options={{
              plugins: { title: { display: true, text: 'Forecast' } },
              scales: {
                x: { type: 'time', time: { unit: 'year' }, title: { display: true, text: 'Year' } },
                y: { title: { display: true, text: 'Price (USD)' } }
              }
            }}
          />
        );
      case 'volatility':
        return (
          <Line
            data={{
              labels: chartData.dates,
              datasets: [{
                label: 'Annualized Volatility',
                data: chartData.volatility,
                borderColor: '#FF9900',
                backgroundColor: '#FF990033',
                borderDash: [5, 5],
                fill: false,
              }]
            }}
            options={{
              plugins: { title: { display: true, text: 'Volatility (Dashed)' } },
              scales: {
                x: { type: 'time', time: { unit: 'year' }, title: { display: true, text: 'Year' } },
                y: { title: { display: true, text: 'Volatility' } }
              }
            }}
          />
        );
      case 'movingavg':
        return (
          <Line
            data={{
              labels: chartData.dates,
              datasets: [
                {
                  label: 'SMA 30',
                  data: chartData.sma,
                  borderColor: '#007bff',
                  backgroundColor: '#007bff33',
                  fill: false,
                  pointStyle: 'rectRot',
                  pointRadius: 4,
                },
                {
                  label: 'EMA 30',
                  data: chartData.ema,
                  borderColor: '#FF5733',
                  backgroundColor: '#FF573333',
                  fill: false,
                  pointStyle: 'triangle',
                  pointRadius: 4,
                }
              ]
            }}
            options={{
              plugins: { title: { display: true, text: 'Moving Averages' } },
              scales: {
                x: { type: 'time', time: { unit: 'year' }, title: { display: true, text: 'Year' } },
                y: { title: { display: true, text: 'Price (USD)' } }
              }
            }}
          />
        );
      case 'bollinger':
        return (
          <Line
            data={{
              labels: chartData.dates,
              datasets: [
                {
                  label: '20-Day SMA',
                  data: chartData.sma,
                  borderColor: '#6a0dad',
                  backgroundColor: '#6a0dad33',
                  fill: false,
                },
                {
                  label: 'Upper Band',
                  data: chartData.upper,
                  borderColor: '#FF5733',
                  backgroundColor: '#FF573333',
                  fill: false,
                  borderDash: [8, 4],
                },
                {
                  label: 'Lower Band',
                  data: chartData.lower,
                  borderColor: '#28a745',
                  backgroundColor: '#28a74533',
                  fill: false,
                  borderDash: [8, 4],
                }
              ]
            }}
            options={{
              plugins: { title: { display: true, text: 'Bollinger Bands' } },
              scales: {
                x: { type: 'time', time: { unit: 'year' }, title: { display: true, text: 'Year' } },
                y: { title: { display: true, text: 'Price (USD)' } }
              }
            }}
          />
        );
      case 'macd':
        return (
          <Line
            data={{
              labels: chartData.dates,
              datasets: [
                {
                  label: 'MACD',
                  data: chartData.macd,
                  borderColor: '#0000FF',
                  backgroundColor: '#0000FF33',
                  fill: false,
                },
                {
                  label: 'Signal',
                  data: chartData.signal,
                  borderColor: '#FF0000',
                  backgroundColor: '#FF000033',
                  fill: false,
                  borderDash: [4, 4],
                }
              ]
            }}
            options={{
              plugins: { title: { display: true, text: 'MACD' } },
              scales: {
                x: { type: 'time', time: { unit: 'year' }, title: { display: true, text: 'Year' } },
                y: { title: { display: true, text: 'Value' } }
              }
            }}
          />
        );
      default:
        return null;
    }
  };

  // Render a details section with an improved card UI for better presentation
  const renderAnalyticsDetails = () => {
    if (selectedGraph === 'transition' && transitionData) {
      return (
        <div className="details-card">
          <h3 className="details-title">Transition Matrix Details</h3>
          <ul className="details-list">
            <li>➤ Shows probability of transitioning between states.</li>
            <li>➤ Rows represent current state; columns represent next state.</li>
            <li>
              ➤ Average log returns per state:
              {transitionData.state_means.map((mean, idx) => (
                <ul key={idx} className="sub-list">
                  <li>{transitionData.state_labels ? transitionData.state_labels[idx] : `State ${idx}`}: {mean.toFixed(4)}</li>
                </ul>
              ))}
            </li>
          </ul>
        </div>
      );
    } else if (chartData) {
      switch(selectedGraph) {
        case 'forecast':
          return (
            <div className="details-card">
              <h3 className="details-title">Forecast Details</h3>
              <ul className="details-list">
                <li>➤ Uses linear regression with Markov chain adjustments.</li>
                <li>➤ Projects future prices for a 10-year period.</li>
                <li>➤ Provides model evaluation metrics.</li>
                {modelDetails && (
                  <>
                    <li>➤ Regression Equation: <strong>{modelDetails.equation}</strong></li>
                    <li>➤ MSE: <strong>{modelDetails.metrics.mse.toFixed(4)}</strong></li>
                    <li>➤ R²: <strong>{modelDetails.metrics.r2.toFixed(4)}</strong></li>
                  </>
                )}
              </ul>
            </div>
          );
        case 'volatility':
          return (
            <div className="details-card">
              <h3 className="details-title">Volatility Details</h3>
              <ul className="details-list">
                <li>➤ Annualized volatility from log returns.</li>
                <li>➤ Calculated using a rolling window &amp; √252 multiplier.</li>
                <li>➤ Helps identify periods of high fluctuation.</li>
              </ul>
            </div>
          );
        case 'movingavg':
          return (
            <div className="details-card">
              <h3 className="details-title">Moving Averages Details</h3>
              <ul className="details-list">
                <li>➤ Compares Simple (SMA) and Exponential (EMA) Moving Averages.</li>
                <li>➤ SMA gives equal weight; EMA emphasizes recent data.</li>
                <li>➤ Useful for trend detection and smoothing fluctuations.</li>
              </ul>
            </div>
          );
        case 'bollinger':
          return (
            <div className="details-card">
              <h3 className="details-title">Bollinger Bands Details</h3>
              <ul className="details-list">
                <li>➤ Calculated as a moving average ± (std. deviation × factor).</li>
                <li>➤ Indicates potential overbought/oversold conditions.</li>
                <li>➤ Useful to gauge market volatility.</li>
              </ul>
            </div>
          );
        case 'macd':
          return (
            <div className="details-card">
              <h3 className="details-title">MACD Details</h3>
              <ul className="details-list">
                <li>➤ Difference between two EMAs.</li>
                <li>➤ Signal line (EMA of MACD) indicates momentum shifts.</li>
                <li>➤ Helps identify trend reversals.</li>
              </ul>
            </div>
          );
        default:
          return null;
      }
    }
    return null;
  };

  return (
    <div className="analytics-dashboard">
      <div className="graph-buttons">
        <button onClick={() => setSelectedGraph('forecast')}>Forecast Only</button>
        <button onClick={() => setSelectedGraph('volatility')}>Volatility</button>
        <button onClick={() => setSelectedGraph('movingavg')}>Moving Avg</button>
        <button onClick={() => setSelectedGraph('bollinger')}>Bollinger</button>
        <button onClick={() => setSelectedGraph('macd')}>MACD</button>
        <button onClick={() => setSelectedGraph('transition')}>Transition Matrix</button>
      </div>
      {loading && <div>Loading...</div>}
      {error && <div className="error">Error: {error}</div>}
      <div className="dashboard-content">
        <div className="graph-panel">
          {selectedGraph === 'transition' ? renderTransitionMatrixView() : renderGraphChart()}
        </div>
        <div className="details-panel">
          {renderAnalyticsDetails()}
        </div>
      </div>
    </div>
  );
}
