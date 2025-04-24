import React, { useState } from 'react';
import './WaitingRoom.css';

const mockPlayers = [
  { id: 1, username: 'InmortalXian', ready: true, isHost: true },
  { id: 2, username: 'CultivadorSupremo', ready: true },
  { id: 3, username: 'GuerreroCelestial', ready: true },
  { id: 4, username: 'DragónAncestral', ready: true },
  { id: 5, username: 'EspadachínDivino', ready: false },
  { id: 6, username: 'SabioMilenario', ready: true },
  { id: 7, username: 'EmperadorEterno', ready: false },
  { id: 8, username: 'GuardianEspiritual', ready: true },
  { id: 9, username: 'AlquimistaInmortal', ready: true },
  { id: 10, username: 'HechiceroSupremo', ready: false },
  { id: 11, username: 'MonjeAscendido', ready: true },
  { id: 12, username: 'GuerreroDeLuz', ready: true }
];

const mockChat = [
  { id: 1, username: 'InmortalXian', message: '¡Bienvenidos cultivadores!', timestamp: '10:30' },
  { id: 2, username: 'CultivadorSupremo', message: 'Gracias por la invitación', timestamp: '10:31' },
  { id: 3, username: 'GuerreroCelestial', message: '¿Todos listos para el torneo?', timestamp: '10:31' },
  { id: 4, username: 'DragónAncestral', message: 'Preparado para la batalla', timestamp: '10:32' },
  { id: 5, username: 'EspadachínDivino', message: 'Un momento, ajustando mi equipo', timestamp: '10:32' },
  { id: 6, username: 'SabioMilenario', message: 'Que gane el mejor cultivador', timestamp: '10:33' },
  { id: 7, username: 'EmperadorEterno', message: 'Necesito unos minutos más', timestamp: '10:33' },
  { id: 8, username: 'GuardianEspiritual', message: '¡Que empiece el combate!', timestamp: '10:34' },
  { id: 9, username: 'AlquimistaInmortal', message: 'Mis elixires están listos', timestamp: '10:34' },
  { id: 10, username: 'HechiceroSupremo', message: 'Preparando mis hechizos...', timestamp: '10:35' },
  { id: 11, username: 'MonjeAscendido', message: 'Que la sabiduría nos guíe', timestamp: '10:35' },
  { id: 12, username: 'GuerreroDeLuz', message: '¡A la victoria!', timestamp: '10:36' }
];

const Modal = ({ isOpen, onClose, onConfirm, playerName }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Confirmar Expulsión</h3>
        <p>¿Estás seguro de expulsar a <span className="player-name">{playerName}</span>?</p>
        <div className="modal-actions">
          <button className="modal-button cancel" onClick={onClose}>Cancelar</button>
          <button className="modal-button confirm" onClick={onConfirm}>Expulsar</button>
        </div>
      </div>
    </div>
  );
};

const WaitingRoom = ({ gameData }) => {
  const [players, setPlayers] = useState(mockPlayers);
  const [messages] = useState(mockChat);
  const [newMessage, setNewMessage] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleStartGame = () => {
    console.log('Iniciando partida...');
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      console.log('Enviando mensaje:', newMessage);
      setNewMessage('');
    }
  };

  const handlePlayerSelect = (player) => {
    if (player.isHost) return;
    if (selectedPlayer?.id === player.id) {
      setSelectedPlayer(null);
    } else {
      setSelectedPlayer(player);
    }
  };

  const handleKickPlayer = () => {
    if (selectedPlayer) {
      setPlayers(players.filter(p => p.id !== selectedPlayer.id));
      setSelectedPlayer(null);
      setIsModalOpen(false);
    }
  };

  return (
    <div className="waiting-room-container">
      <div className="waiting-room-header">
        <div className="header-left">
          <h2>Sala de Espera - {gameData?.name || 'Torneo Celestial'}</h2>
          <div className="game-info">
            <span>🎮 {gameData?.mode || 'Competitivo'}</span>
            <span>🗺️ {gameData?.map || 'Valle Celestial'}</span>
            <span>👥 {players.length}/12</span>
          </div>
        </div>
        <div className="header-right">
          <button 
            className="start-game-button"
            onClick={handleStartGame}
          >
            Iniciar Partida
          </button>
        </div>
      </div>

      <div className="main-content">
        <div className="players-section">
          <div className="players-header">
            <h3>Jugadores</h3>
            {selectedPlayer && !selectedPlayer.isHost && (
              <button 
                className="kick-button"
                onClick={() => setIsModalOpen(true)}
              >
                Expulsar Jugador
              </button>
            )}
          </div>
          <div className="players-list">
            {players.map(player => (
              <div 
                key={player.id} 
                className={`player-item ${player.ready ? 'ready' : ''} ${selectedPlayer?.id === player.id ? 'selected' : ''}`}
                onClick={() => handlePlayerSelect(player)}
              >
                <div className="player-info">
                  <span className="player-name">{player.username}</span>
                  {player.isHost && <span className="host-badge">Anfitrión</span>}
                </div>
                <span className="ready-status">
                  {player.ready ? '✓ Listo' : '⌛ Esperando...'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="chat-section">
          <div className="chat-messages">
            {messages.map(msg => (
              <div key={msg.id} className="chat-message">
                <span className="message-time">[{msg.timestamp}]</span>
                <span className="message-user">{msg.username}:</span>
                <span className="message-text">{msg.message}</span>
              </div>
            ))}
          </div>
          <div className="chat-input">
            <input 
              type="text" 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Escribe un mensaje..."
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button onClick={handleSendMessage}>Enviar</button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleKickPlayer}
        playerName={selectedPlayer?.username}
      />
    </div>
  );
};

export default WaitingRoom; 