import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import WaitingRoom from './components/game/WaitingRoom';
import './components/game/WaitingRoom.css';

const WaitingRoomApp = () => {
  const [gameData, setGameData] = useState(null);

  useEffect(() => {
    // Escuchar los datos del juego enviados desde el proceso principal
    window.api.on('game-data', (data) => {
      console.log('Datos del juego recibidos:', data);
      setGameData(data);
    });
  }, []);

  return <WaitingRoom gameData={gameData} />;
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WaitingRoomApp />
  </React.StrictMode>
); 