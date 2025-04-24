import React from 'react';
import './LoadingScreen.css';

const LoadingScreen = () => {
  return (
    <div className="loading-container">
      <div className="loading-content">
        <div className="loading-logo">
          <div className="logo-circle"></div>
          <div className="logo-circle"></div>
          <div className="logo-circle"></div>
        </div>
        <div className="loading-text">
          <span>Cargando el reino celestial</span>
          <div className="loading-dots">
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </div>
        </div>
      </div>
      <div className="loading-particles">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="particle" style={{
            '--delay': `${Math.random() * 2}s`,
            '--duration': `${2 + Math.random() * 3}s`,
            '--size': `${2 + Math.random() * 4}px`,
            '--x': `${Math.random() * 100}%`,
            '--y': `${Math.random() * 100}%`
          }}></div>
        ))}
      </div>
    </div>
  );
};

export default LoadingScreen; 