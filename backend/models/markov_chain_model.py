import numpy as np
import pandas as pd

class MarkovChainForecaster:
    def __init__(self, lr_model, n_states=3):
        self.lr_model = lr_model
        self.n_states = n_states
        self.data = None
        self.states = None
        self.transition_matrix = None
        self.state_means = None
        self.cached_forecasts = {}

    def prepare_data(self):
        log_returns = np.log(self.lr_model.df['Predicted_Close']).diff().dropna().values
        self.data = log_returns
        quantiles = np.percentile(log_returns, [100 * i / self.n_states for i in range(1, self.n_states)])
        self.states = np.digitize(log_returns, bins=quantiles)
        self.compute_transition_matrix()
        self.compute_state_means()

    def compute_transition_matrix(self):
        matrix = np.zeros((self.n_states, self.n_states))
        for i in range(len(self.states) - 1):
            current_state = self.states[i]
            next_state = self.states[i + 1]
            matrix[current_state, next_state] += 1
        for i in range(self.n_states):
            row_sum = np.sum(matrix[i])
            if row_sum > 0:
                normalized_row = np.round(matrix[i] / row_sum, decimals=4)
                diff = 1 - np.sum(normalized_row)
                normalized_row[-1] += diff
                matrix[i] = normalized_row
            else:
                matrix[i] = np.ones(self.n_states) / self.n_states
        self.transition_matrix = matrix

    def compute_state_means(self):
        means = np.zeros(self.n_states)
        for s in range(self.n_states):
            means[s] = np.mean(self.data[self.states == s])
        self.state_means = means

    def forecast(self, years):
        if years in self.cached_forecasts:
            forecast_df = self.cached_forecasts.get(years)
            if forecast_df is not None:
                return forecast_df

        forecast_df = self._generate_forecast(years)
        self.cached_forecasts[years] = forecast_df
        return forecast_df

    def _generate_forecast(self, years):
        last_price = self.lr_model.df['Predicted_Close'].iloc[-1]
        current_state = self.states[-1]
        predicted_log_returns = []
        for _ in range(years):
            next_state = np.random.choice(range(self.n_states), p=self.transition_matrix[current_state])
            predicted_log_returns.append(self.state_means[next_state])
            current_state = next_state

        future_prices = []
        cumulative_return = 0.0
        for r in predicted_log_returns:
            cumulative_return += r
            future_prices.append(last_price * np.exp(cumulative_return))

        future_dates = pd.date_range(start='2026', periods=years, freq='Y')
        forecast_df = pd.DataFrame({"Price": future_prices}, index=future_dates)
        return forecast_df

    def calculate_volatility(self, forecast_df):
        forecast_df = forecast_df.copy()
        forecast_df['returns'] = np.log(forecast_df['Price']).diff()
        forecast_df['volatility'] = (
            forecast_df['returns'].rolling(window=2, min_periods=1).std(ddof=1) * np.sqrt(252)
        )
        forecast_df['volatility'].fillna(0, inplace=True)  # Fill early NaN
        forecast_df = forecast_df[(forecast_df.index.year >= 2026) & (forecast_df.index.year <= 2035)]
        return forecast_df

    def calculate_moving_average(self, forecast_df, window=5):
        forecast_df = forecast_df.copy()
        forecast_df[f'SMA_{window}'] = forecast_df['Price'].rolling(window=window, min_periods=1).mean()
        forecast_df[f'EMA_{window}'] = forecast_df['Price'].ewm(span=window, adjust=False).mean()
        forecast_df.fillna(method='bfill', inplace=True)  # Optional for completeness
        return forecast_df

    def calculate_bollinger_bands(self, forecast_df, window=5, sd=2):
        forecast_df = forecast_df.copy()
        forecast_df[f'SMA_{window}'] = forecast_df['Price'].rolling(window=window, min_periods=1).mean()
        forecast_df['std'] = forecast_df['Price'].rolling(window=window, min_periods=1).std(ddof=1)
        forecast_df['std'].fillna(0, inplace=True)

        forecast_df['upper_band'] = forecast_df[f'SMA_{window}'] + sd * forecast_df['std']
        forecast_df['lower_band'] = forecast_df[f'SMA_{window}'] - sd * forecast_df['std']
        forecast_df['upper_band'].fillna(method='bfill', inplace=True)
        forecast_df['lower_band'].fillna(method='bfill', inplace=True)

        forecast_df = forecast_df[(forecast_df.index.year >= 2026) & (forecast_df.index.year <= 2035)]
        return forecast_df

    def calculate_macd(self, forecast_df, fast_period=12, slow_period=26):
        forecast_df = forecast_df.copy()
        forecast_df[f'EMA{fast_period}'] = forecast_df['Price'].ewm(span=fast_period, adjust=False).mean()
        forecast_df[f'EMA{slow_period}'] = forecast_df['Price'].ewm(span=slow_period, adjust=False).mean()
        forecast_df['MACD'] = forecast_df[f'EMA{fast_period}'] - forecast_df[f'EMA{slow_period}']
        forecast_df['Signal'] = forecast_df['MACD'].ewm(span=9, adjust=False).mean()
        forecast_df.fillna(method='bfill', inplace=True)  # Optional: handle early rows
        return forecast_df
