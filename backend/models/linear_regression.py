import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score

class LinearRegressionModel:
    def __init__(self, config):
        self.config = config
        file_path = config['dataset_path']
        df = pd.read_excel(file_path)
        # Check for date column
        if 'Date' in df.columns:
            date_col = 'Date'
        elif 'date' in df.columns:
            df.rename(columns={'date': 'Date'}, inplace=True)
            date_col = 'Date'
        else:
            raise ValueError("No date column found in Excel file. Please ensure there is a 'Date' or 'date' column.")
        df['Date'] = pd.to_datetime(df['Date'], errors='coerce')
        df.sort_values('Date', inplace=True)
        self.df = df.set_index('Date')
        self.run_linear_regression()

    def run_linear_regression(self):
        X = self.df[['Open', 'High', 'Low', 'Adj Close', 'Volume']]
        y = self.df['close']
        self.model = LinearRegression()
        self.model.fit(X, y)
        self.df['Predicted_Close'] = self.model.predict(X)

    def train(self):
        pass

    def evaluate(self):
        X = self.df[['Open', 'High', 'Low', 'Adj Close', 'Volume']]
        y_true = self.df['close']
        y_pred = self.df['Predicted_Close']
        mse = mean_squared_error(y_true, y_pred)
        r2 = r2_score(y_true, y_pred)
        return {"mse": mse, "r2": r2}

    @property
    def equation(self):
        coef = self.model.coef_
        intercept = self.model.intercept_
        return (
            f"Predicted_Close = {intercept:.4f} + {coef[0]:.4f}*Open + "
            f"{coef[1]:.4f}*High + {coef[2]:.4f}*Low + "
            f"{coef[3]:.4f}*Adj Close + {coef[4]:.4f}*Volume"
        )
