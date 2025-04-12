import numpy as np
import pandas as pd

class MarkovChainForecaster:
    def __init__(self, lr_model, n_states=3):
        self.lr_model = lr_model
        self.n_states = n_states
        self.data = None          # Array of log returns
        self.states = None         # Discrete states assigned to each log return
        self.transition_matrix = None # The transition probability matrix
        self.state_means = None     # Mean log return per state
        self.cached_forecasts = {}    # Cache forecasts by 'years'

    def prepare_data(self):
        # Note: Do NOT reset self.cached_forecasts here.
        # This allows the forecast cache to persist across multiple requests.
        log_returns = np.log(self.lr_model.df['Predicted_Close']).diff().dropna().values
        self.data = log_returns
        quantiles = np.percentile(
            log_returns, [100 * i / self.n_states for i in range(1, self.n_states)]
        )
        self.states = np.digitize(log_returns, bins=quantiles)
        self.compute_transition_matrix()
        self.compute_state_means()
        
        # Debug prints (optional)
        print("State Means:", self.state_means)
        print("Transition Matrix:", self.transition_matrix)

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
        # Return cached forecast if available
        if years in self.cached_forecasts:
            forecast_df = self.cached_forecasts.get(years)
            if forecast_df is not None:
                return forecast_df

        forecast_df = self._generate_forecast(years)
        self.cached_forecasts[years] = forecast_df
        return forecast_df

    def _generate_forecast(self, years):
        """Generates the base price forecast."""
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

        last_known_date = pd.to_datetime(self.lr_model.df.index[-1])
        future_start = pd.Timestamp(year=last_known_date.year + 1, month=1, day=1)
        future_dates = pd.date_range(start=future_start, periods=years, freq='Y')
        forecast_df = pd.DataFrame({"Price": future_prices}, index=future_dates)
        return forecast_df

    def calculate_volatility(self, forecast_df, period='short'):
        """Calculates volatility."""
        forecast_df['returns'] = np.log(forecast_df['Price']).diff()
        window = 252 if period == 'long' else 5
        forecast_df['volatility'] = forecast_df['returns'].rolling(window=window).std() * np.sqrt(252)
        return forecast_df.dropna(subset=['volatility'])

    def calculate_moving_average(self, forecast_df, window=2):
        """Calculates Simple Moving Average (SMA) and Exponential Moving Average (EMA)."""
        forecast_df[f'SMA_{window}'] = forecast_df['Price'].rolling(window=window).mean()
        forecast_df[f'EMA_{window}'] = forecast_df['Price'].ewm(span=window, adjust=False).mean()
        return forecast_df.dropna(subset=[f'SMA_{window}', f'EMA_{window}'])

    def calculate_bollinger_bands(self, forecast_df, window=2, sd=2):
        """Calculates Bollinger Bands."""
        forecast_df[f'SMA_{window}'] = forecast_df['Price'].rolling(window=window).mean()
        forecast_df['std'] = forecast_df['Price'].rolling(window=window).std()
        forecast_df['upper_band'] = forecast_df[f'SMA_{window}'] + sd * forecast_df['std']
        forecast_df['lower_band'] = forecast_df[f'SMA_{window}'] - sd * forecast_df['std']
        return forecast_df.dropna(subset=[f'SMA_{window}', 'upper_band', 'lower_band'])

    def calculate_macd(self, forecast_df, fast_period=2, slow_period=4):
        """Calculates MACD (Moving Average Convergence Divergence)."""
        forecast_df[f'EMA{fast_period}'] = forecast_df['Price'].ewm(span=fast_period, adjust=False).mean()
        forecast_df[f'EMA{slow_period}'] = forecast_df['Price'].ewm(span=slow_period, adjust=False).mean()
        forecast_df['MACD'] = forecast_df[f'EMA{fast_period}'] - forecast_df[f'EMA{slow_period}']
        forecast_df['Signal'] = forecast_df['MACD'].ewm(span=2, adjust=False).mean()
        return forecast_df.dropna(subset=['MACD', 'Signal'])