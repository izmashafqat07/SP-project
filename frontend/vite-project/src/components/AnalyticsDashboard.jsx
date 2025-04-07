import React, { useState, useEffect } from 'react';
import './AnalyticsDashboard.css';
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

  // Render a details section with more explanation for new users
  const renderAnalyticsDetails = () => {
    if (selectedGraph === 'transition' && transitionData) {
      return (
        <div className="details-card">
          <h3 className="details-title">Transition Matrix Details</h3>
          <ul className="details-list">
            <li>
              <strong>What is it?</strong> This table and chart show the probability of transitioning between various states. Each row represents the current state and each column represents the next state.
            </li>
            <li>
              <strong>How to read it:</strong> The percentages indicate the likelihood (converted from a fraction) that if the process is in a given state, it will move to another state.
            </li>
            <li>
              <strong>State Metrics:</strong> Below the table, you can also see the average log returns per state which help in understanding the performance or risk associated with each state.
              <ul className="sub-list">
                {transitionData.state_means.map((mean, idx) => (
                  <li key={idx}>
                    {transitionData.state_labels ? transitionData.state_labels[idx] : `State ${idx}`}: {mean.toFixed(4)}
                  </li>
                ))}
              </ul>
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
                <li>
                  <strong>Model:</strong> Uses linear regression adjusted with a Markov chain model to forecast future stock prices over a 10-year period.
                </li>
                <li>
                  <strong>Interpretation:</strong> The forecast graph shows the predicted price trend. The filled area below the line indicates the model's confidence range.
                </li>
                <li>
                  <strong>Metrics:</strong> The details include evaluation metrics such as Mean Squared Error (MSE) and R² which indicate model accuracy.
                </li>
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
                <li>
                  <strong>What is Volatility?</strong> Volatility measures how much the price of an asset fluctuates over time.
                </li>
                <li>
                  <strong>Calculation:</strong> It is derived from the log returns and annualized using a rolling window and the √252 multiplier.
                </li>
                <li>
                  <strong>Usage:</strong> This graph helps identify periods of high fluctuation, indicating potential risk.
                </li>
              </ul>
            </div>
          );
        case 'movingavg':
          return (
            <div className="details-card">
              <h3 className="details-title">Moving Averages Details</h3>
              <ul className="details-list">
                <li>
                  <strong>SMA vs EMA:</strong> The Simple Moving Average (SMA) calculates the average price over a period, while the Exponential Moving Average (EMA) gives more weight to recent data.
                </li>
                <li>
                  <strong>Interpretation:</strong> These lines help smooth out price data to identify trends and potential reversal points.
                </li>
                <li>
                  <strong>Usage:</strong> A crossover between SMA and EMA might signal changes in market trends.
                </li>
              </ul>
            </div>
          );
        case 'bollinger':
          return (
            <div className="details-card">
              <h3 className="details-title">Bollinger Bands Details</h3>
              <ul className="details-list">
                <li>
                  <strong>Concept:</strong> Bollinger Bands consist of a moving average (usually 20-day SMA) and two bands set at a specified number of standard deviations above and below the moving average.
                </li>
                <li>
                  <strong>Interpretation:</strong> They indicate potential overbought or oversold conditions. When prices touch the upper band, the asset might be overbought; when they touch the lower band, it might be oversold.
                </li>
                <li>
                  <strong>Usage:</strong> Traders use these bands to identify volatility and potential price reversals.
                </li>
              </ul>
            </div>
          );
        case 'macd':
          return (
            <div className="details-card">
              <h3 className="details-title">MACD Details</h3>
              <ul className="details-list">
                <li>
                  <strong>What is MACD?</strong> MACD (Moving Average Convergence Divergence) is a momentum indicator calculated as the difference between two exponential moving averages.
                </li>
                <li>
                  <strong>Signal Line:</strong> An additional EMA (signal line) of the MACD helps in identifying momentum shifts.
                </li>
                <li>
                  <strong>Interpretation:</strong> Crossovers between the MACD and its signal line can indicate potential trend reversals.
                </li>
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
