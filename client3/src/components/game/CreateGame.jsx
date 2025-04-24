import React, { useState } from 'react';
import './CreateGame.css';

const CreateGame = () => {
  const [formData, setFormData] = useState({
    name: '',
    maxPlayers: '4',
    isPrivate: false,
    mode: 'competitivo',
    password: '',
    timeLimit: '30',
    map: 'default'
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    console.log('Cambio detectado:', { name, value, type, checked });
    
    if (name === 'isPrivate' && type === 'checkbox') {
      console.log('Cambio en sala privada detectado:', checked);
      const width = 600;
      const height = checked ? 455 : 380;
      console.log('Calculando nuevo tamaño:', { width, height });
      
      // Verificar que la API está disponible
      if (!window.api) {
        console.error('API de Electron no está disponible');
        return;
      }
      
      // Asegurarnos de que los valores sean números positivos
      const newWidth = Math.max(1, Number(width));
      const newHeight = Math.max(1, Number(height));
      
      console.log('Enviando evento de resize:', { newWidth, newHeight });
      try {
        window.api.resizeWindowCreateGame(newWidth, newHeight);
        console.log('Evento de resize enviado correctamente');
      } catch (error) {
        console.error('Error al enviar evento de resize:', error);
      }
    }

    // Actualizar el estado después de manejar el resize
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
      ...(name === 'isPrivate' && !checked && { password: '' })
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Creando partida:', formData);
    
    // Cerrar la ventana actual y abrir la sala de espera
    if (window.api) {
      console.log('Intentando abrir sala de espera con datos:', formData);
      try {
        window.api.openWaitingRoom(formData);
        window.close();
      } catch (error) {
        console.error('Error al abrir la sala de espera:', error);
      }
    } else {
      console.error('API de Electron no disponible');
    }
  };

  return (
    <div className="create-game-container">
      <div className="create-game-content">
        <div className="create-game-header">
          <h2>Crear Nueva Partida</h2>
          <button className="close-button" onClick={() => window.close()}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="create-game-form">
          <div className="form-group">
            <label htmlFor="name">Nombre de la Sala</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Ej: Torneo Celestial"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="maxPlayers">Número de Jugadores</label>
            <select
              id="maxPlayers"
              name="maxPlayers"
              value={formData.maxPlayers}
              onChange={handleChange}
            >
              <option value="2">2 Jugadores</option>
              <option value="4">4 Jugadores</option>
              <option value="8">8 Jugadores</option>
              <option value="16">16 Jugadores</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="mode">Modo de Juego</label>
            <select
              id="mode"
              name="mode"
              value={formData.mode}
              onChange={handleChange}
            >
              <option value="competitivo">Competitivo</option>
              <option value="amistoso">Amistoso</option>
              <option value="torneo">Torneo</option>
              <option value="entrenamiento">Entrenamiento</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="map">Mapa</label>
            <select
              id="map"
              name="map"
              value={formData.map}
              onChange={handleChange}
            >
              <option value="default">Valle Celestial</option>
              <option value="mountain">Montaña Ancestral</option>
              <option value="forest">Bosque de los Espíritus</option>
              <option value="desert">Desierto de las Arenas</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="timeLimit">Límite de Tiempo (minutos)</label>
            <select
              id="timeLimit"
              name="timeLimit"
              value={formData.timeLimit}
              onChange={handleChange}
            >
              <option value="15">15 minutos</option>
              <option value="30">30 minutos</option>
              <option value="45">45 minutos</option>
              <option value="60">60 minutos</option>
            </select>
          </div>

          <div className="form-group">
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="isPrivate"
                name="isPrivate"
                checked={formData.isPrivate}
                onChange={handleChange}
              />
              <label htmlFor="isPrivate">Sala Privada</label>
            </div>
          </div>

          {formData.isPrivate && (
            <div className="form-group full-width">
              <label htmlFor="password">Contraseña</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Contraseña para la sala"
              />
            </div>
          )}

          <div className="form-actions full-width">
            <button type="submit" className="create-button">
              Crear Partida
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGame; 