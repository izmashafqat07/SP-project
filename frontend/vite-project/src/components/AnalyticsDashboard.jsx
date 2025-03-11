import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
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
  Filler
} from "chart.js";

ChartJS.register(TimeScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function AnalyticsDashboard({ ticker }) {
  const [selectedGraph, setSelectedGraph] = useState('combined');
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchGraphData = async (graphType) => {
    setLoading(true);
    setError(null);
    try {
      let response;
      switch(graphType) {
        case 'combined':
          response = await fetch(`http://localhost:5000/api/graph/combined/${ticker}/10`);
          break;
        case 'forecast':
          response = await fetch(`http://localhost:5000/api/forecast/${ticker}/10`);
          break;
        case 'volatility':
          response = await fetch(`http://localhost:5000/api/graph/volatility/${ticker}/10`);
          break;
        case 'movingavg':
          response = await fetch(`http://localhost:5000/api/graph/movingavg/${ticker}/10`);
          break;
        case 'bollinger':
          response = await fetch(`http://localhost:5000/api/graph/bollinger/${ticker}/10`);
          break;
        case 'macd':
          response = await fetch(`http://localhost:5000/api/graph/macd/${ticker}/10`);
          break;
        case 'rsi':
          response = await fetch(`http://localhost:5000/api/graph/rsi/${ticker}/10`);
          break;
        default:
          break;
      }
      if (!response.ok) throw new Error('Error fetching data');
      const data = await response.json();
      setChartData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraphData(selectedGraph);
  }, [selectedGraph, ticker]);

  const renderChart = () => {
    if (!chartData) return null;
    switch(selectedGraph) {
      case 'combined':
        return (
          <Line
            data={{
              labels: [...chartData.actual_dates, ...chartData.forecast_dates],
              datasets: [
                {
                  label: 'Actual Prices',
                  data: chartData.actual_prices,
                  borderColor: '#2E86AB',
                  backgroundColor: '#2E86AB33',
                  fill: false,
                },
                {
                  label: 'Forecasted Prices',
                  data: chartData.forecast_prices,
                  borderColor: chartData.color,
                  backgroundColor: chartData.color + "33",
                  fill: false,
                }
              ]
            }}
            options={{
              plugins: { title: { display: true, text: 'Actual & Forecasted Prices' } },
              scales: {
                x: { 
                  type: 'time', 
                  time: { unit: 'year', tooltipFormat: 'yyyy' },
                  title: { display: true, text: 'Year' }
                },
                y: { title: { display: true, text: 'Price (USD)' } }
              }
            }}
          />
        );
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
      case 'rsi':
        return (
          <Line
            data={{
              labels: chartData.dates,
              datasets: [{
                label: 'RSI',
                data: chartData.rsi,
                borderColor: chartData.color,
                backgroundColor: chartData.color + "33",
                fill: false,
              }]
            }}
            options={{
              plugins: { title: { display: true, text: 'RSI' } },
              scales: {
                x: { type: 'time', time: { unit: 'year' }, title: { display: true, text: 'Year' } },
                y: { title: { display: true, text: 'RSI' }, min: 0, max: 100 }
              }
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="analytics-dashboard">
      <div className="graph-buttons">
        <button onClick={() => setSelectedGraph('combined')}>Actual & Forecast</button>
        <button onClick={() => setSelectedGraph('forecast')}>Forecast Only</button>
        <button onClick={() => setSelectedGraph('volatility')}>Volatility</button>
        <button onClick={() => setSelectedGraph('movingavg')}>Moving Avg</button>
        <button onClick={() => setSelectedGraph('bollinger')}>Bollinger</button>
        <button onClick={() => setSelectedGraph('macd')}>MACD</button>
        <button onClick={() => setSelectedGraph('rsi')}>RSI</button>
      </div>
      <div className="graph-container">
        {loading && <div>Loading...</div>}
        {error && <div className="error">Error: {error}</div>}
        {chartData && renderChart()}
      </div>
    </div>
  );
}
