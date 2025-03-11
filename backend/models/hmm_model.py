import numpy as np
import pandas as pd
from hmmlearn import hmm
from sklearn.preprocessing import StandardScaler

class HMMForecaster:
    def __init__(self, lr_model):
        self.lr_model = lr_model
        self.scaler = StandardScaler()
        self.model = None
        self.data = None  

    def prepare_data(self):
        self.data = np.log(self.lr_model.df['Predicted_Close']).diff().dropna()
        self.scaled_returns = self.scaler.fit_transform(self.data.values.reshape(-1, 1))

    def train_hmm(self, n_components=3):
        self.model = hmm.GaussianHMM(n_components=n_components, covariance_type="diag", n_iter=1000, random_state=42)
        self.model.fit(self.scaled_returns)

    def forecast(self, years):
        if self.data is None or self.model is None:
            raise ValueError("Model not trained or data not prepared.")
        self.lr_model.df.index = pd.to_datetime(self.lr_model.df.index, errors='coerce')
        last_known_date = self.lr_model.df.index[-1]
        if last_known_date.year < 2000:
            last_known_date = pd.Timestamp("2024-01-01")
        # Use yearly frequency
        future_start = pd.Timestamp(year=last_known_date.year + 1, month=1, day=1)
        future_dates = pd.date_range(start=future_start, periods=years, freq='Y')
        predicted_log_returns, _ = self.model.sample(len(future_dates))
        predicted_log_returns = self.scaler.inverse_transform(predicted_log_returns).flatten()
        last_price = self.lr_model.df['Predicted_Close'].iloc[-1]
        future_prices = [last_price * np.exp(np.sum(predicted_log_returns[:i])) for i in range(1, len(predicted_log_returns) + 1)]
        forecast_df = pd.DataFrame({"Price": future_prices}, index=future_dates)
        return forecast_df
