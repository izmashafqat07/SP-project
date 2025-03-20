import React from 'react';
import './HomePage.css'; // Import the dedicated CSS file

export default function HomePage() {
  return (
    <div className="homepage-container">
      {/* Hero Section with Animated Stock Lines Background */}
      <header className="hero-section">
        <div className="hero-lines"></div>
        <div className="hero-overlay">
          <h1 className="hero-title">MarketMinds</h1>
          <p className="hero-tagline">
            Unlock Market Intelligence with Advanced Markov Chain & Regression Analysis
          </p>
          <div className="hero-buttons">
            <button className="cta-button">Explore Analytics</button>
            <button className="cta-button secondary">Get Started</button>
          </div>
        </div>
      </header>

      {/* Analytics Section */}
      <section className="analytics-section section">
        <div className="content">
          <h2>Featured Analytics</h2>
          <p>
            Discover our powerful models integrating linear regression and Markov chain analysis.
          </p>
          <div className="cards-container">
            <div className="card">
              <h3>Linear Regression</h3>
              <p>Predict market trends with data-driven regression analysis.</p>
            </div>
            <div className="card">
              <h3>Markov Chain Analysis</h3>
              <p>
                Visualize state transitions and probabilities with interactive animations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Market Trends Section */}
      <section className="trends-section section">
        <div className="content">
          <h2>Market Trends</h2>
          <p>Stay ahead with our in-depth analysis of evolving market trends.</p>
          <div className="animated-graph">
            {/* Animated graph placeholder */}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials-section section">
        <div className="content">
          <h2>Customer Testimonials</h2>
          <div className="testimonials">
            <div className="testimonial">
              <p>"MarketMinds transformed our investment strategy!"</p>
              <span>- Alex, Financial Analyst</span>
            </div>
            <div className="testimonial">
              <p>"Unparalleled insights and interactive visualizations."</p>
              <span>- Jamie, Portfolio Manager</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="homepage-footer">
        <p>&copy; 2025 MarketMinds. All Rights Reserved.</p>
      </footer>
    </div>
  );
}
