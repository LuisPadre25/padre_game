import React, { useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import './Lobby.css';

const WindowControls = () => (
  <div className="window-controls">
    <button 
      className="minimize"
      onClick={() => window.api.minimizeWindow()}
      title="Minimizar"
    >
      −
    </button>
    <button 
      className="maximize"
      onClick={() => window.api.maximizeWindow()}
      title="Maximizar"
    >
      □
    </button>
    <button 
      className="close"
      onClick={() => window.api.closeWindow()}
      title="Cerrar"
    >
      ×
    </button>
  </div>
);

const mockFriends = [
  { id: 1, name: 'InmortalXian', status: 'online', lastSeen: 'Ahora' },
  { id: 2, name: 'EmperadorCelestial', status: 'playing', lastSeen: 'En partida' },
  { id: 3, name: 'SabioMilenario', status: 'offline', lastSeen: 'Hace 2h' },
  { id: 4, name: 'EspadachinDivino', status: 'online', lastSeen: 'Ahora' },
  { id: 5, name: 'GuardianEspiritual', status: 'playing', lastSeen: 'En partida' },
  { id: 6, name: 'DragonAncestral', status: 'online', lastSeen: 'Ahora' },
  { id: 7, name: 'FenixInmortal', status: 'offline', lastSeen: 'Hace 1h' },
  { id: 8, name: 'AlquimistaSupremo', status: 'playing', lastSeen: 'En partida' },
  { id: 9, name: 'GuerreroCeleste', status: 'online', lastSeen: 'Ahora' },
  { id: 10, name: 'MonjeAscendido', status: 'offline', lastSeen: 'Hace 3h' },
  { id: 11, name: 'HechiceroEterno', status: 'online', lastSeen: 'Ahora' },
  { id: 12, name: 'SenorDelAbismo', status: 'playing', lastSeen: 'En partida' },
  { id: 13, name: 'MaestroDelTao', status: 'online', lastSeen: 'Ahora' },
  { id: 14, name: 'GuerreroDeLuz', status: 'offline', lastSeen: 'Hace 5h' },
  { id: 15, name: 'CultivadorSupremo', status: 'playing', lastSeen: 'En partida' },
  { id: 16, name: 'SenorDelTrueno', status: 'online', lastSeen: 'Ahora' },
  { id: 17, name: 'Espiritualista', status: 'offline', lastSeen: 'Hace 30m' },
  { id: 18, name: 'SabioDeLosVientos', status: 'playing', lastSeen: 'En partida' },
  { id: 19, name: 'GuerreroInmortal', status: 'online', lastSeen: 'Ahora' },
  { id: 20, name: 'MaestroDelFuego', status: 'offline', lastSeen: 'Hace 4h' },
  { id: 21, name: 'EmperadorDivino', status: 'playing', lastSeen: 'En partida' },
  { id: 22, name: 'SenorDelHielo', status: 'online', lastSeen: 'Ahora' },
  { id: 23, name: 'GuardianEterno', status: 'offline', lastSeen: 'Hace 1h' },
  { id: 24, name: 'CultivadorDeLuz', status: 'playing', lastSeen: 'En partida' },
  { id: 25, name: 'EspadachinCeleste', status: 'online', lastSeen: 'Ahora' },
  { id: 26, name: 'AlquimistaMistico', status: 'offline', lastSeen: 'Hace 2h' },
  { id: 27, name: 'GuerreroDeLaLluvia', status: 'playing', lastSeen: 'En partida' },
  { id: 28, name: 'SabioDelTiempo', status: 'online', lastSeen: 'Ahora' },
  { id: 29, name: 'DragonDeLaLlama', status: 'offline', lastSeen: 'Hace 6h' },
  { id: 30, name: 'InmortalDeLaNoche', status: 'playing', lastSeen: 'En partida' },
  { id: 31, name: 'MaestroDelCielo', status: 'online', lastSeen: 'Ahora' },
  { id: 32, name: 'GuardianDelSol', status: 'offline', lastSeen: 'Hace 1h' },
  { id: 33, name: 'CultivadorDeLuna', status: 'playing', lastSeen: 'En partida' },
  { id: 34, name: 'EspadachinMistico', status: 'online', lastSeen: 'Ahora' },
  { id: 35, name: 'HechiceroDelVacio', status: 'offline', lastSeen: 'Hace 3h' },
  { id: 36, name: 'SenorDeLasTormentas', status: 'playing', lastSeen: 'En partida' },
  { id: 37, name: 'GuerreroDeLasEstrellas', status: 'online', lastSeen: 'Ahora' },
  { id: 38, name: 'SabioDelDestino', status: 'offline', lastSeen: 'Hace 2h' },
  { id: 39, name: 'EmperadorDelCosmos', status: 'playing', lastSeen: 'En partida' },
  { id: 40, name: 'GuardianDelTiempo', status: 'online', lastSeen: 'Ahora' },
  { id: 41, name: 'CultivadorDelCaos', status: 'offline', lastSeen: 'Hace 4h' },
  { id: 42, name: 'DragonDeLaEternidad', status: 'playing', lastSeen: 'En partida' },
  { id: 43, name: 'InmortalDelInfinito', status: 'online', lastSeen: 'Ahora' },
  { id: 44, name: 'MaestroDelDestino', status: 'offline', lastSeen: 'Hace 1h' },
  { id: 45, name: 'SenorDeLosElementos', status: 'playing', lastSeen: 'En partida' },
  { id: 46, name: 'GuerreroDelAmanecer', status: 'online', lastSeen: 'Ahora' },
  { id: 47, name: 'HechiceroDelOcaso', status: 'offline', lastSeen: 'Hace 5h' },
  { id: 48, name: 'SabioDelInfinito', status: 'playing', lastSeen: 'En partida' },
  { id: 49, name: 'EmperadorDeLosReinos', status: 'online', lastSeen: 'Ahora' },
  { id: 50, name: 'GuardianDeLosSectos', status: 'offline', lastSeen: 'Hace 2h' }
];

const mockGames = [
  {
    id: 1,
    description:"Partida de prueba",
    host: 'Alejandro',
    players: { current: 8, max: 12 },
    mode: 'competitivo',
    private: false,
    ping: 45,
    time: '2:30',
  },
  {
    id: 2,
    description:"Partida de prueba",
    host: 'María',
    players: { current: 4, max: 12 },
    mode: 'amistoso',
    private: true,
    ping: 120,
    time: '5:00',
  },{
    id: 3,
    description:"Partida de prueba",
    host: 'Alejandro',
    players: { current: 8, max: 12 },
    mode: 'competitivo',
    private: false,
    ping: 45,
    time: '2:30',
  },
  {
    id: 4,
    description:"Partida de prueba",
    host: 'María',
    players: { current: 4, max: 12 },
    mode: 'amistoso',
    private: true,
    ping: 120,
    time: '5:00',
  },{
    id: 5,
    description:"Partida de prueba",
    host: 'Alejandro',
    players: { current: 8, max: 12 },
    mode: 'competitivo',
    private: false,
    ping: 45,
    time: '2:30',
  },
  {
    id: 6,
    description:"Partida de prueba",
    host: 'María',
    players: { current: 4, max: 12 },
    mode: 'amistoso',
    private: true,
    ping: 120,
    time: '5:00',
  },{
    id:7,
    description:"Partida de prueba",
    host: 'Alejandro',
    players: { current: 8, max: 12 },
    mode: 'competitivo',
    private: false,
    ping: 45,
    time: '2:30',
  },
  {
    id: 8,
    description:"Partida de prueba",
    host: 'María',
    players: { current: 4, max: 12 },
    mode: 'amistoso',
    private: true,
    ping: 120,
    time: '5:00',
  },{
    id: 9,
    description:"Partida de prueba",
    host: 'Alejandro',
    players: { current: 8, max: 12 },
    mode: 'competitivo',
    private: false,
    ping: 45,
    time: '2:30',
  },
  {
    id: 10,
    description:"Partida de prueba",
    host: 'María',
    players: { current: 4, max: 12 },
    mode: 'amistoso',
    private: true,
    ping: 120,
    time: '5:00',
  },{
    id: 11,
    description:"Partida de prueba",
    host: 'Alejandro',
    players: { current: 8, max: 12 },
    mode: 'competitivo',
    private: false,
    ping: 45,
    time: '2:30',
  },
  {
    id: 12,
    description:"Partida de prueba",
    host: 'María12',
    players: { current: 4, max: 12 },
    mode: 'amistoso',
    private: true,
    ping: 120,
    time: '5:00',
  },
];

const statusColors = {
  online: "#4CAF50",  // Verde
  playing: "#2196F3", // Azul
  afk: "#FFC107",     // Amarillo
  offline: "#9E9E9E"  // Gris
};

const statusText = {
  online: "En línea",
  playing: "Jugando",
  afk: "Ausente",
  offline: "Desconectado"
};

const ContextMenu = ({ x, y, onClose, options }) => {
  useEffect(() => {
    const handleClick = () => onClose();
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [onClose]);

  return (
    <div 
      className="context-menu"
      style={{ 
        left: x,
        top: y,
      }}
    >
      {options.map((option, index) => (
        <div 
          key={index}
          className="context-menu-item"
          onClick={(e) => {
            e.stopPropagation();
            option.onClick();
            onClose();
          }}
        >
          <i className={option.icon}></i>
          {option.label}
        </div>
      ))}
    </div>
  );
};

const Lobby = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [games, setGames] = useState(mockGames);
  const [friends, setFriends] = useState(mockFriends);
  const [contextMenu, setContextMenu] = useState(null);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleCreateGame = () => {
    // Abrir la ventana modal de creación de partida
    window.api.openCreateGameWindow();
  };

  const handleJoinGame = (gameId) => {
    navigate(`/waiting-room/${gameId}`);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
        return '#4CAF50';
      case 'playing':
        return '#2196F3';
      case 'offline':
        return '#9e9e9e';
      default:
        return '#9e9e9e';
    }
  };

  const getPingBadgeClass = (ping) => {
    if (ping < 60) return 'good';
    if (ping < 150) return 'medium';
    return 'bad';
  };

  const handleOpenChat = (friend) => {
    console.log('Abriendo chat con:', friend.name, friend.id);
    if (window.api) {
      window.api.openChatWindow(friend);
    } else {
      console.error('API de Electron no disponible');
    }
  };

  const handleContextMenu = useCallback((e, friend) => {
    e.preventDefault();
    const options = [
      {
        label: 'Invitar a partida',
        icon: 'fas fa-gamepad',
        onClick: () => {
          console.log('Invitar a partida a:', friend.name);
        }
      },
      {
        label: 'Enviar mensaje',
        icon: 'fas fa-comment',
        onClick: () => handleOpenChat(friend)
      },
      {
        label: 'Ver perfil',
        icon: 'fas fa-user',
        onClick: () => {
          console.log('Viendo perfil de:', friend.name);
          // Implementar vista de perfil
        }
      },
      {
        label: 'Agregar a grupo',
        icon: 'fas fa-users',
        onClick: () => {
          console.log('Agregando a grupo:', friend.name);
          // Implementar agregar a grupo
        }
      },
      {
        label: 'Eliminar amigo',
        icon: 'fas fa-user-minus',
        onClick: () => {
          console.log('Eliminando amigo:', friend.name);
          setFriends(friends.filter(f => f.id !== friend.id));
        }
      }
    ];

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      options
    });
  }, [friends]);

  // Cerrar el menú contextual
  const closeContextMenu = () => setContextMenu(null);

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="lobby-container">
      <div className="window-header">
        <div className="window-title">Lobby</div>
        <WindowControls />
      </div>
      <div className="main-content">
        <div className="lobby-sidebar">
          <div className="user-profile">
            <img
              src="https://api.dicebear.com/6.x/avataaars/svg?seed=Felix"
              alt="Profile"
              className="profile-avatar"
            />
            <div className="profile-info">
              <h3>Usuario</h3>
              <span className="status">Online</span>
            </div>
          </div>

          <div className="friends-container">
            <div className="friends-header">
              <h3>Amigos</h3>
              <span className="friends-stats">
                {friends.filter(f => f.status === 'online').length}/{friends.length} online
              </span>
            </div>

            <div className="friends-search">
              <input
                type="text"
                placeholder="Buscar amigos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="friends-list">
              {filteredFriends.map((friend) => (
                <div
                  key={friend.id}
                  className={`friend-item ${selectedFriend === friend.id ? 'selected' : ''}`}
                  onClick={() => setSelectedFriend(friend.id)}
                  onContextMenu={(e) => handleContextMenu(e, friend)}
                  onDoubleClick={() => handleOpenChat(friend)}
                >
                  <div className="friend-info">
                    <div
                      className="status-dot"
                      style={{ background: getStatusColor(friend.status) }}
                    />
                    <span className="friend-name">{friend.name}</span>
                  </div>
                  <span className="friend-status-text">{friend.lastSeen}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="sidebar-actions">
            <button className="action-button">
              <i className="fas fa-sign-out-alt"></i>
              Cerrar Sesión
            </button>
          </div>
        </div>

        <div className="lobby-main">
          <div className="games-header">
            <h2>Partidas Disponibles</h2>
            <button className="create-game-button" onClick={handleCreateGame}>
              Crear Partida
            </button>
          </div>

          <div className="games-table-container">
            <table className="games-table">
              <thead>
                <tr>
                  <th>Descripcion</th>
                  <th>Host</th>
                  <th>Jugadores</th>
                  <th>Modo</th>
                  <th>Privacidad</th>
                  <th>Ping</th>
                  <th>Tiempo</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {games.map((game) => (
                  <tr key={game.id}>
                    <td>
                      <span className={`description-badge`}>
                        {game.description}
                      </span>
                    </td>
                    <td>
                      <div className="host-info">
                        <span className="host-name">{game.host}</span>
                      </div>
                    </td>
                    <td>
                      <div className="players-info">
                        <span className="players-count">
                          {game.players.current}/{game.players.max}
                        </span>
                        <div className="players-progress">
                          <div
                            className="players-progress-bar"
                            style={{
                              width: `${(game.players.current / game.players.max) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`mode-badge ${game.mode}`}>
                        {game.mode}
                      </span>
                    </td>
                    <td>
                      <span className={`private-badge ${game.private ? 'private' : 'public'}`}>
                        {game.private ? 'Privada' : 'Pública'}
                      </span>
                    </td>
                    <td>
                      <span className={`ping-badge ${getPingBadgeClass(game.ping)}`}>
                        {game.ping}ms
                      </span>
                    </td>
                    <td>
                      <span className="time-badge">{game.time}</span>
                    </td>
                    <td>
                      <button
                        className="join-button"
                        onClick={() => handleJoinGame(game.id)}
                        disabled={game.players.current >= game.players.max}
                      >
                        Unirse
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          options={contextMenu.options}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
};

export default Lobby; 