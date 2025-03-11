import React from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  TimeScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";
import "chartjs-adapter-date-fns";

// Register Chart.js components
ChartJS.register(TimeScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function ForecastChart({ data, company }) {
  const chartData = {
    labels: data.dates,
    datasets: [
      {
        label: `${company} 10-Year Forecast`,
        data: data.prices,
        borderColor: data.color,
        backgroundColor: data.color + "33",
        fill: true,
        tension: 0.1,
        pointRadius: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      title: { display: true, text: "Price Forecast" },
    },
    scales: {
      x: { type: "time", time: { unit: "year", tooltipFormat: "yyyy" } },
      y: { title: { display: true, text: "Price (USD)" } },
    },
  };

  return (
    <div style={{ maxWidth: "800px", margin: "20px auto" }}>
      <Line data={chartData} options={options} />
    </div>
  );
}
