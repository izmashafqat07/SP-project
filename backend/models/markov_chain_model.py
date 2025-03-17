import numpy as np
import pandas as pd

class MarkovChainForecaster:
    def __init__(self, lr_model, n_states=3):
        self.lr_model = lr_model
        self.n_states = n_states
        self.data = None              # Array of log returns
        self.states = None            # Discrete states assigned to each log return
        self.transition_matrix = None # The transition probability matrix
        self.state_means = None       # Mean log return per state
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
            return self.cached_forecasts[years]

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
        
        self.cached_forecasts[years] = forecast_df
        return forecast_df
