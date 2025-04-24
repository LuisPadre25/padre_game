import React from 'react';

const SimpleLogin = () => {
  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      color: 'white'
    }}>
      <div style={{ 
        padding: '2rem', 
        background: 'rgba(255,255,255,0.1)', 
        borderRadius: '10px',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
      }}>
        <h1 style={{ marginBottom: '1rem' }}>Bienvenido al Reino Celestial</h1>
        <form>
          <div style={{ marginBottom: '1rem' }}>
            <input 
              type="text" 
              placeholder="Nombre de Usuario" 
              style={{ 
                width: '100%', 
                padding: '0.5rem', 
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '5px',
                color: 'white'
              }} 
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <input 
              type="password" 
              placeholder="Contraseña" 
              style={{ 
                width: '100%', 
                padding: '0.5rem', 
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '5px',
                color: 'white'
              }} 
            />
          </div>
          <button 
            style={{ 
              width: '100%', 
              padding: '0.5rem', 
              background: 'linear-gradient(135deg, #00b4db 0%, #0083b0 100%)',
              border: 'none',
              borderRadius: '5px',
              color: 'white',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Iniciar Sesión
          </button>
        </form>
      </div>
    </div>
  );
};

export default SimpleLogin; 