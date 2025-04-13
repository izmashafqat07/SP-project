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

const forecastDurations = [5, 10];
const smoothingWindows = [2,5]; // Changed smoothing windows

const simulationNumbers = [100, 500, 1000];
const bollingerStandardDeviations = [1, 2, 3];
const macdFastPeriods = [12, 24, 36];    // Changed fast EMA periods
const macdSlowPeriods = [26, 52, 78];    // Changed slow EMA periods

const defaultForecastDuration = forecastDurations[0];
const defaultSmoothingWindow = smoothingWindows[0];
// const defaultVolatilityPeriod = volatilityPeriods[0];
const defaultNumSimulations = simulationNumbers[0];
const defaultBollingerSD = bollingerStandardDeviations[1];
const defaultFastEMA = macdFastPeriods[0];
const defaultSlowEMA = macdSlowPeriods[0];

export default function AnalyticsDashboard({ ticker }) {
    const [selectedGraph, setSelectedGraph] = useState('forecast');
    const [chartData, setChartData] = useState(null);
    const [transitionData, setTransitionData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [initialized, setInitialized] = useState(false);
    const [modelDetails, setModelDetails] = useState(null);

    // Customizable parameters state
    const [forecastDuration, setForecastDuration] = useState(defaultForecastDuration);
    const [smoothingWindow, setSmoothingWindow] = useState(defaultSmoothingWindow);
    // const [volatilityPeriod, setVolatilityPeriod] = useState(defaultVolatilityPeriod);
    const [numSimulations, setNumSimulations] = useState(defaultNumSimulations);
    const [bollingerSD, setBollingerSD] = useState(defaultBollingerSD);
    const [fastEMA, setFastEMA] = useState(defaultFastEMA);
    const [slowEMA, setSlowEMA] = useState(defaultSlowEMA);

    // Effect to initialize model on ticker change
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

    // Effect to fetch graph data when parameters or selected graph changes
    useEffect(() => {
        if (!initialized) return;

        const controller = new AbortController();
        const signal = controller.signal;
        setLoading(true);
        setError(null);

        const fetchData = async () => {
            try {
                let response;
                let url = '';
                let data;

                switch (selectedGraph) {
                    case 'forecast':
                        url = `http://localhost:5000/api/forecast/${ticker}/${forecastDuration}`;
                        response = await fetch(url, { signal });
                        if (!response.ok) throw new Error('Error fetching forecast data');
                        data = await response.json();
                        setChartData(data);
                        break;
                    case 'volatility':
                        url = `http://localhost:5000/api/graph/volatility/${ticker}/${forecastDuration}`;

                        response = await fetch(url, { signal });
                        if (!response.ok) throw new Error('Error fetching volatility data');
                        data = await response.json();
                        setChartData(data);
                        break;
                    case 'movingavg':
                        url = `http://localhost:5000/api/graph/movingavg/${ticker}/${forecastDuration}?window=${smoothingWindow}`;
                        response = await fetch(url, { signal });
                        if (!response.ok) throw new Error('Error fetching moving average data');
                        data = await response.json();
                        setChartData(data);
                        break;
                    case 'bollinger':
                        url = `http://localhost:5000/api/graph/bollinger/${ticker}/${forecastDuration}?window=${smoothingWindow}&sd=${bollingerSD}`;
                        response = await fetch(url, { signal });
                        if (!response.ok) throw new Error('Error fetching Bollinger Bands data');
                        data = await response.json();
                        setChartData(data);
                        break;
                    case 'macd':
                        url = `http://localhost:5000/api/graph/macd/${ticker}/${forecastDuration}?fast_period=${fastEMA}&slow_period=${slowEMA}`;
                        response = await fetch(url, { signal });
                        if (!response.ok) throw new Error('Error fetching MACD data');
                        data = await response.json();
                        setChartData(data);
                        break;
                    case 'transition':
                        url = `http://localhost:5000/api/transition_matrix/${ticker}`;
                        response = await fetch(url, { signal });
                        if (!response.ok) throw new Error('Error fetching transition matrix data');
                        data = await response.json();
                        setTransitionData(data);
                        setChartData(null); // Ensure chart data is cleared when transition data is set
                        break;
                    default:
                        break;
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
    }, [selectedGraph, ticker, initialized, forecastDuration, smoothingWindow,bollingerSD, fastEMA, slowEMA]);

    const renderGraph = () => {
        if (selectedGraph === 'transition') {
            return renderTransitionMatrixView();
        }
        if (!chartData) return null;
        switch (selectedGraph) {
            case 'forecast':
                return (
                    <Line
                        data={{
                            labels: chartData?.dates,
                            datasets: [{
                                label: `${forecastDuration}-Year Forecast`,
                                data: chartData?.prices,
                                borderColor: chartData?.color,
                                backgroundColor: chartData?.color + "33",
                                fill: true,
                                tension: 0.3,
                            }],
                        }}
                        options={{
                            plugins: { title: { display: true, text: `Forecast (${forecastDuration} Years)` } },
                            scales: {
                                x: { type: 'time', time: { unit: 'year' }, title: { display: true, text: 'Year' } },
                                y: { title: { display: true, text: 'Price (USD)' } }
                            },
                        }}
                    />
                );
                case 'volatility':
                    return (
                        <Line
                            data={{
                                labels: chartData?.dates,
                                datasets: [{
                                    label: 'Annualized Volatility',
                                    data: chartData?.volatility,
                                    borderColor: '#FF9900',
                                    backgroundColor: '#FF990033',
                                    borderDash: [5, 5],
                                    fill: false,
                                }],
                            }}
                            options={{
                                plugins: {
                                    title: {
                                        display: true,
                                        text: `Volatility Forecast (${forecastDuration} Years)`
                                    }
                                },
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
                            labels: chartData?.dates,
                            datasets: [
                                {
                                    label: `SMA (${smoothingWindow})`,
                                    data: chartData?.sma,
                                    borderColor: '#007bff',
                                    backgroundColor: '#007bff33',
                                    fill: false,
                                    pointStyle: 'rectRot',
                                    pointRadius: 4,
                                },
                                {
                                    label: `EMA (${smoothingWindow})`,
                                    data: chartData.ema,
                                    borderColor: '#FF5733',
                                    backgroundColor: '#FF573333',
                                    fill: false,
                                    pointStyle: 'triangle',
                                    pointRadius: 4,
                                }
                            ],
                        }}
                        options={{
                            plugins: { title: { display: true, text: `Moving Averages (Window: ${smoothingWindow})` } },
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
                            labels: chartData?.dates,
                            datasets: [
                                {
                                    label: `SMA (${smoothingWindow})`,
                                    data: chartData.sma,
                                    borderColor: '#6a0dad',
                                    backgroundColor: '#6a0dad33',
                                    fill: false,
                                },
                                {
                                    label: `Upper Band (${bollingerSD} SD)`,
                                    data: chartData.upper,
                                    borderColor: '#FF5733',
                                    backgroundColor: '#FF573333',
                                    fill: false,
                                    borderDash: [8, 4],
                                },
                                {
                                    label: `Lower Band (${bollingerSD} SD)`,
                                    data: chartData.lower,
                                    borderColor: '#28a745',
                                    backgroundColor: '#28a74533',
                                    fill: false,
                                    borderDash: [8, 4],
                                }
                            ],
                        }}
                        options={{
                            plugins: {
                                title: {
                                    display: true,
                                    text: `Bollinger Bands (Window: ${smoothingWindow}, SD: ${bollingerSD})`
                                }
                            },
                            scales: {
                                x: {
                                    type: 'time',
                                    time: { unit: 'year' },
                                    title: { display: true, text: 'Year' }
                                },
                                y: {
                                    title: { display: true, text: 'Price (USD)' }
                                }
                            }
                        }}
                    />
                );
            case 'macd':
                return (
                    <Line
                        data={{
                            labels: chartData?.dates,
                            datasets: [
                                {
                                    label: `MACD (${fastEMA}, ${slowEMA})`,
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
                            ],
                        }}
                        options={{
                            plugins: { title: { display: true, text: `MACD (Fast: ${fastEMA}, Slow: ${slowEMA})` } },
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
        if (!transitionData || !transitionData.transition_matrix) return null;
        const matrix = transitionData.transition_matrix;
        return (
            <table className="transition-matrix-table">
                <thead>
                    <tr>
                        <th>From \ To</th>
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
                                <td key={j}>{val.toFixed(4)}</td> // Display probability
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    };

    const renderTransitionBarChart = () => {
        if (!transitionData || !transitionData.transition_matrix) return null;
        const matrix = transitionData.transition_matrix;
        const labels = matrix.map((_, index) =>
            transitionData.state_labels ? transitionData.state_labels[index] : `State ${index}`
        );
        const datasets = matrix.map((row, i) => ({
            label: `From ${transitionData.state_labels ? transitionData.state_labels[i] : `State ${i}`}`,
            data: row,
            backgroundColor: `rgba(${(i + 1) * 50}, ${(i + 1) * 50}, 200, 0.5)`
        }));
        const chartDataForBar = { labels, datasets }; // Renamed for clarity
        return (
            <div style={{ maxWidth: '800px', margin: '20px auto' }}>
                <Bar data={chartDataForBar} options={{ // Use the renamed variable
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

    const renderGraphDetails = () => {
        if (selectedGraph === 'transition' && transitionData) {
            return (
                <div className="details-card">
                    <h3 className="details-title">Transition Matrix Details</h3>
                    <ul className="details-list">
                        <li>
                            <strong>What is it?</strong> This table and chart show the probability of transitioning between various states. Each row represents the current state and each column represents the next state.
                        </li>
                        <li>
                            <strong>How to read it:</strong> The values indicate the likelihood that if the process is in a given state, it will move to another state.
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
            let details = "";
            let title = "";
            switch (selectedGraph) {
                case 'forecast':
                    title= "Forecast Details";
                    details = `
                        The forecast graph shows the predicted price trend over ${forecastDuration} years.
                        The model uses linear regression adjusted with a Markov chain.
                    `;
                    break;
                case 'volatility':
                    title = "Volatility Details";
                    details = `
                        Volatility measures how much the price of an asset fluctuates over time.
This graph shows the annualized volatility over the forecasted ${forecastDuration} years.

                    `;
                    break;
                case 'movingavg':
                    title = "Moving Averages Details";
                    details = `
                        The Simple Moving Average (SMA) calculates the average price over a period, while the Exponential Moving Average (EMA) gives more weight to recent data.
                        This graph shows SMA and EMA with a smoothing window of ${smoothingWindow}.
                    `;
                    break;
                case 'bollinger':
                    title = "Bollinger Bands Details";
                    details = `
                        Bollinger Bands consist of a moving average (SMA) and two bands set at a specified number of standard deviations above and below the moving average.
                        This graph shows Bollinger Bands with a smoothing window of ${smoothingWindow} and ${bollingerSD} standard deviations.
                    `;
                    break;
                case 'macd':
                    title = "MACD Details";
                    details = `
                        MACD (Moving Average Convergence Divergence) is a momentum indicator calculated as the difference between two exponential moving averages.
                        This graph shows MACD with a fast EMA period of ${fastEMA} and a slow EMA period of ${slowEMA}.
                    `;
                    break;
                default:
                    return null;
            }
            return (
                <div className="details-card">
                    <h3 className="details-title">{title}</h3>
                    <ul className="details-list">
                        <li>{details}</li>
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
        }
        return null;
    };

    return (
        <div className="analytics-dashboard">
            <div className="controls-panel">
                {selectedGraph === 'forecast' && (
                    <div className="parameter-control">
                        <label htmlFor="forecastDuration">Forecast Duration:</label>
                        <select id="forecastDuration" value={forecastDuration} onChange={(e) => setForecastDuration(parseInt(e.target.value))}>
                            {forecastDurations.map(duration => (
                                <option key={duration} value={duration}>{duration} Years</option>
                            ))}
                        </select>
                    </div>
                )}
                {(selectedGraph === 'movingavg' || selectedGraph === 'bollinger') && (
                    <div className="parameter-control">
                        <label htmlFor="smoothingWindow">Smoothing Window:</label>
                        <select
                            id="smoothingWindow"
                            value={smoothingWindow}
                            onChange={(e) => {
                                const value = parseInt(e.target.value);
                                if (!isNaN(value)) {
                                    setSmoothingWindow(value);
                                }
                            }}
                        >
                            {smoothingWindows.map(window => (
                                <option key={window} value={window}>{window}</option>
                            ))}
                        </select>
                    </div>
                )}
              
                {selectedGraph === 'bollinger' && (
                    <div className="parameter-control">
                        <label htmlFor="bollingerSD">Bollinger SD:</label>
                        <select
                            id="bollingerSD"
                            value={bollingerSD}
                            onChange={(e) => {
                                const value = parseFloat(e.target.value);
                                if (!isNaN(value)) {
                                    setBollingerSD(value);
                                }
                            }}
                        >
                            {bollingerStandardDeviations.map(sd => (
                                <option key={sd} value={sd}>{sd}</option>
                            ))}
                        </select>
                    </div>
                )}
                {selectedGraph === 'macd' && (
                    <>
                        <div className="parameter-control">
                            <label htmlFor="fastEMA">Fast EMA Period:</label>
                            <select
                                id="fastEMA"
                                value={fastEMA}
                                onChange={(e) => {
                                    const value = parseInt(e.target.value);
                                    if (!isNaN(value)) {
                                        setFastEMA(value);
                                    }
                                }}
                            >
                                {macdFastPeriods.map(period => (
                                    <option key={period} value={period}>{period}</option>
                                ))}
                            </select>
                        </div>
                        <div className="parameter-control">
                            <label htmlFor="slowEMA">Slow EMA Period:</label>
                            <select
                                id="slowEMA"
                                value={slowEMA}
                                onChange={(e) => {
                                    const value = parseInt(e.target.value);
                                    if (!isNaN(value)) {
                                        setSlowEMA(value);
                                    }
                                }}
                            >
                                {macdSlowPeriods.map(period => (
                                    <option key={period} value={period}>{period}</option>
                                ))}
                            </select>
                        </div>
                    </>
                )}
            </div>

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
                    {renderGraph()}
                </div>
                <div className="details-panel">
                    {renderGraphDetails()}
                </div>
            </div>
        </div>
    );
}
