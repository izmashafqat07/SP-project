import React from 'react';
import './HomePage.css';

export default function HomePage() {
  const companies = [
    {
      name: 'Google',
      color: '#4285F4',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg',
    },
    {
      name: 'Apple',
      color: '#333',
      logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/apple/apple-original.svg',
    },
    {
      name: 'Meta',
      color: '#1877f2',
      logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQRgmz9xbRzsdcuvvjKhluVbMUFnhB9-rQ1Wg&s',
    },
    {
      name: 'Microsoft',
      color: '#F25022',
      logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQysXrr20h241ONjtWY3oYFJy1Tdh8hYlTbqg&s',
    },
    {
      name: 'Amazon',
      color: '#FF9900',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Amazon_icon.svg',
    },
  ];

  return (
    <div className="homepage-container">
      <h1 className="homepage-title">Welcome to MarketMinds</h1>
      <p className="homepage-subtitle">Emphasizes intelligence in understanding market behaviors</p>

      <div className="card-grid">
        {companies.map((company, index) => (
          <div className="company-card" key={index}>
            <div className="border-animation"></div>
            <img src={company.logo} alt={`${company.name} logo`} className="company-logo" />
            <h3 style={{ color: company.color }}>{company.name}</h3>
           
          </div>
        ))}
      </div>
    </div>
  );
}
