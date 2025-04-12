from flask import Flask, jsonify, request
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
    if years not in [5, 10]:
        return jsonify({"error": "Invalid forecast duration. Choose 5 or 10 years."}), 400
    try:
        forecast = models[ticker]['markov'].forecast(years)
        return jsonify({
            "dates": forecast.index.strftime('%Y').tolist(),
            "prices": forecast['Price'].round(2).tolist(),
            "color": models[ticker]['config']['color']
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/graph/volatility/<ticker>/<int:years>', methods=['GET'])
def forecast_volatility(ticker, years):
    ticker = ticker.upper()
    if ticker not in models:
        return jsonify({"error": "Model not initialized"}), 400
    if years not in [5, 10]:
        return jsonify({"error": "Invalid forecast duration. Choose 5 or 10 years."}), 400
    try:
        period = request.args.get('period', 'short')
        # Ensure correct forecast duration based on period
        forecast_years = 5 if period == 'short' else 10
        forecast_df = models[ticker]['markov'].forecast(forecast_years)
        volatility_df = models[ticker]['markov'].calculate_volatility(forecast_df, period)
        dates = volatility_df.index.strftime('%Y').tolist()
        volatility = volatility_df['volatility'].tolist()
        return jsonify({
            "dates": dates,
            "volatility": volatility,
            "color": models[ticker]['config']['color']
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/graph/movingavg/<ticker>/<int:years>', methods=['GET'])
def forecast_movingavg(ticker, years):
    ticker = ticker.upper()
    if ticker not in models:
        return jsonify({"error": "Model not initialized"}), 400
    if years not in [5, 10]:
        return jsonify({"error": "Invalid forecast duration. Choose 5 or 10 years."}), 400
    try:
        window = int(request.args.get('window', 2))
        forecast_df = models[ticker]['markov'].forecast(years)
        moving_avg_df = models[ticker]['markov'].calculate_moving_average(forecast_df, window)
        dates = moving_avg_df.index.strftime('%Y').tolist()
        sma = moving_avg_df[f'SMA_{window}'].tolist()
        ema = moving_avg_df[f'EMA_{window}'].tolist()
        return jsonify({
            "dates": dates,
            "sma": sma,
            "ema": ema,
            "color": models[ticker]['config']['color']
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/graph/bollinger/<ticker>/<int:years>', methods=['GET'])
def forecast_bollinger(ticker, years):
    ticker = ticker.upper()
    if ticker not in models:
        return jsonify({"error": "Model not initialized"}), 400
    if years not in [5, 10]:
        return jsonify({"error": "Invalid forecast duration. Choose 5 or 10 years."}), 400
    try:
        window = int(request.args.get('window', 2))
        sd = float(request.args.get('sd', 2))
        # Ensure forecast duration is used for bollinger bands calculations
        forecast_years = 5 if years <= 5 else 10
        forecast_df = models[ticker]['markov'].forecast(forecast_years)
        bollinger_df = models[ticker]['markov'].calculate_bollinger_bands(forecast_df, window, sd)
        dates = bollinger_df.index.strftime('%Y').tolist()
        sma = bollinger_df[f'SMA_{window}'].tolist()
        upper = bollinger_df['upper_band'].tolist()
        lower = bollinger_df['lower_band'].tolist()
        return jsonify({
            "dates": dates,
            "sma": sma,
            "upper": upper,
            "lower": lower,
            "color": models[ticker]['config']['color']
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/graph/macd/<ticker>/<int:years>', methods=['GET'])
def forecast_macd(ticker, years):
    ticker = ticker.upper()
    if ticker not in models:
        return jsonify({"error": "Model not initialized"}), 400
    if years not in [5, 10]:
        return jsonify({"error": "Invalid forecast duration. Choose 5 or 10 years."}), 400
    try:
        fast_period = int(request.args.get('fast_period', 2))
        slow_period = int(request.args.get('slow_period', 4))
        forecast_df = models[ticker]['markov'].forecast(years)
        macd_df = models[ticker]['markov'].calculate_macd(forecast_df, fast_period, slow_period)
        dates = macd_df.index.strftime('%Y').tolist()
        macd = macd_df['MACD'].tolist()
        signal = macd_df['Signal'].tolist()
        return jsonify({
            "dates": dates,
            "macd": macd,
            "signal": signal,
            "color": models[ticker]['config']['color']
        })
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