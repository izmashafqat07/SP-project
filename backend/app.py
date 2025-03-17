# app.py
from flask import Flask, jsonify
from flask_cors import CORS
import traceback
import numpy as np
import pandas as pd

from models.linear_regression import LinearRegressionModel
from models.markov_chain_model import MarkovChainForecaster
from config.companies import COMPANIES

app = Flask(__name__)
CORS(app)

models = {}

@app.route('/api/init/<ticker>', methods=['GET'])
def init_model(ticker):
    ticker = ticker.upper()
    if ticker not in COMPANIES:
        return jsonify({"error": "Company not found"}), 404
    try:
        # Use existing model if already initialized
        if ticker in models:
            lr_model = models[ticker]['lr']
            return jsonify({
                "status": "success",
                "metrics": lr_model.evaluate(),
                "equation": lr_model.equation
            })
        config = COMPANIES[ticker]
        lr_model = LinearRegressionModel(config)
        markov_model = MarkovChainForecaster(lr_model, n_states=3)
        markov_model.prepare_data()
        models[ticker] = {
            'lr': lr_model,
            'markov': markov_model,
            'config': config
        }
        return jsonify({
            "status": "success",
            "metrics": lr_model.evaluate(),
            "equation": lr_model.equation
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/api/forecast/<ticker>/<int:years>', methods=['GET'])
def get_forecast(ticker, years):
    ticker = ticker.upper()
    if ticker not in models:
        return jsonify({"error": "First initialize model"}), 400
    try:
        forecast = models[ticker]['markov'].forecast(years)
        return jsonify({
            "dates": forecast.index.strftime('%Y').tolist(),
            "prices": forecast['Price'].round(2).tolist(),
            "color": models[ticker]['config']['color']
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/graph/combined/<ticker>/<int:years>', methods=['GET'])
def combined_forecast(ticker, years):
    ticker = ticker.upper()
    if ticker not in models:
        return jsonify({"error": "Model not initialized"}), 400
    try:
        df_actual = models[ticker]['lr'].df.copy()
        df_actual.index = pd.to_datetime(df_actual.index, errors='coerce')
        df_actual_yearly = df_actual.resample('Y').last()
        actual_dates = df_actual_yearly.index.strftime('%Y').tolist()
        actual_prices = df_actual_yearly['Predicted_Close'].round(2).tolist()
        
        forecast_df = models[ticker]['markov'].forecast(years)
        forecast_dates = forecast_df.index.strftime('%Y').tolist()
        forecast_prices = forecast_df['Price'].round(2).tolist()
        
        return jsonify({
            "actual_dates": actual_dates,
            "actual_prices": actual_prices,
            "forecast_dates": forecast_dates,
            "forecast_prices": forecast_prices,
            "color": models[ticker]['config']['color']
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/graph/volatility/<ticker>/<int:years>', methods=['GET'])
def forecast_volatility(ticker, years):
    ticker = ticker.upper()
    if ticker not in models:
        return jsonify({"error": "Model not initialized"}), 400
    try:
        forecast_df = models[ticker]['markov'].forecast(years)
        forecast_df['returns'] = np.log(forecast_df['Price']).diff()
        forecast_df['volatility'] = forecast_df['returns'].rolling(window=2).std() * np.sqrt(252)
        forecast_df = forecast_df.dropna(subset=['volatility'])
        dates = forecast_df.index.strftime('%Y').tolist()
        volatility = forecast_df['volatility'].round(4).tolist()
        return jsonify({"dates": dates, "volatility": volatility, "color": models[ticker]['config']['color']})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/graph/movingavg/<ticker>/<int:years>', methods=['GET'])
def forecast_movingavg(ticker, years):
    ticker = ticker.upper()
    if ticker not in models:
        return jsonify({"error": "Model not initialized"}), 400
    try:
        forecast_df = models[ticker]['markov'].forecast(years)
        forecast_df['SMA_30'] = forecast_df['Price'].rolling(window=2).mean()
        forecast_df['EMA_30'] = forecast_df['Price'].ewm(span=2, adjust=False).mean()
        forecast_df = forecast_df.dropna(subset=['SMA_30', 'EMA_30'])
        dates = forecast_df.index.strftime('%Y').tolist()
        sma = forecast_df['SMA_30'].round(2).tolist()
        ema = forecast_df['EMA_30'].round(2).tolist()
        return jsonify({"dates": dates, "sma": sma, "ema": ema, "color": models[ticker]['config']['color']})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/graph/bollinger/<ticker>/<int:years>', methods=['GET'])
def forecast_bollinger(ticker, years):
    ticker = ticker.upper()
    if ticker not in models:
        return jsonify({"error": "Model not initialized"}), 400
    try:
        forecast_df = models[ticker]['markov'].forecast(years)
        forecast_df['SMA_20'] = forecast_df['Price'].rolling(window=2).mean()
        forecast_df['std'] = forecast_df['Price'].rolling(window=2).std()
        forecast_df['upper_band'] = forecast_df['SMA_20'] + 2 * forecast_df['std']
        forecast_df['lower_band'] = forecast_df['SMA_20'] - 2 * forecast_df['std']
        forecast_df = forecast_df.dropna(subset=['SMA_20', 'upper_band', 'lower_band'])
        dates = forecast_df.index.strftime('%Y').tolist()
        sma = forecast_df['SMA_20'].round(2).tolist()
        upper = forecast_df['upper_band'].round(2).tolist()
        lower = forecast_df['lower_band'].round(2).tolist()
        return jsonify({"dates": dates, "sma": sma, "upper": upper, "lower": lower, "color": models[ticker]['config']['color']})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/graph/macd/<ticker>/<int:years>', methods=['GET'])
def forecast_macd(ticker, years):
    ticker = ticker.upper()
    if ticker not in models:
        return jsonify({"error": "Model not initialized"}), 400
    try:
        forecast_df = models[ticker]['markov'].forecast(years)
        forecast_df['EMA12'] = forecast_df['Price'].ewm(span=2, adjust=False).mean()
        forecast_df['EMA26'] = forecast_df['Price'].ewm(span=4, adjust=False).mean()
        forecast_df['MACD'] = forecast_df['EMA12'] - forecast_df['EMA26']
        forecast_df['Signal'] = forecast_df['MACD'].ewm(span=2, adjust=False).mean()
        forecast_df = forecast_df.dropna(subset=['MACD', 'Signal'])
        dates = forecast_df.index.strftime('%Y').tolist()
        macd = forecast_df['MACD'].round(4).tolist()
        signal = forecast_df['Signal'].round(4).tolist()
        return jsonify({"dates": dates, "macd": macd, "signal": signal, "color": models[ticker]['config']['color']})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/graph/rsi/<ticker>/<int:years>', methods=['GET'])
def forecast_rsi(ticker, years):
    ticker = ticker.upper()
    if ticker not in models:
        return jsonify({"error": "Model not initialized"}), 400
    try:
        forecast_df = models[ticker]['markov'].forecast(years)
        forecast_df['delta'] = forecast_df['Price'].diff()
        forecast_df['gain'] = forecast_df['delta'].apply(lambda x: x if x > 0 else 0)
        forecast_df['loss'] = forecast_df['delta'].apply(lambda x: -x if x < 0 else 0)
        period = 2
        forecast_df['avg_gain'] = forecast_df['gain'].rolling(window=period).mean()
        forecast_df['avg_loss'] = forecast_df['loss'].rolling(window=period).mean()
        forecast_df['rs'] = forecast_df['avg_gain'] / forecast_df['avg_loss']
        forecast_df['rsi'] = 100 - (100 / (1 + forecast_df['rs']))
        forecast_df = forecast_df.dropna(subset=['rsi'])
        dates = forecast_df.index.strftime('%Y').tolist()
        rsi = forecast_df['rsi'].round(2).tolist()
        return jsonify({"dates": dates, "rsi": rsi, "color": models[ticker]['config']['color']})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/transition_matrix/<ticker>', methods=['GET'])
def get_transition_matrix(ticker):
    ticker = ticker.upper()
    if ticker not in models:
        return jsonify({"error": "Model not initialized"}), 400
    try:
        markov_model = models[ticker]['markov']
        matrix = markov_model.transition_matrix.tolist()
        state_means = markov_model.state_means.tolist()
        state_labels = {0: "Low", 1: "Medium", 2: "High"} if markov_model.n_states == 3 else {}
        return jsonify({
            "transition_matrix": matrix,
            "state_means": state_means,
            "state_labels": state_labels
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
