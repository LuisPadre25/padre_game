import React, { useState, useEffect, useRef } from 'react';
import './ChatWindow.css';

// Error Boundary para manejar errores en el componente
class ChatErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error en ChatWindow:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div className="error-message">Algo salió mal en el chat. Por favor, intenta recargar la página.</div>;
    }

    return this.props.children;
  }
}

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

const ChatWindow = () => {
  const [friend, setFriend] = useState({
    id: 0,
    name: 'Amigo',
    status: 'offline',
    lastSeen: 'Desconectado',
    color: '#00b4db',
    avatar: null,
    level: 0,
    rank: 'Novato',
    gameStatus: 'Disponible',
    ping: 0
  });

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleFriendData = (friendData) => {
      console.log('Datos del amigo recibidos:', friendData);
      setFriend(prev => ({
        ...prev,
        ...friendData,
        lastSeen: friendData.lastSeen || 'Desconectado',
        color: friendData.color || '#00b4db',
        level: friendData.level || 0,
        rank: friendData.rank || 'Novato',
        gameStatus: friendData.gameStatus || 'Disponible',
        ping: friendData.ping || 0
      }));
    };

    if (window.api && window.api.on) {
      window.api.on('friend-data', handleFriendData);
    }

    return () => {
      if (window.api && window.api.removeListener) {
        window.api.removeListener('friend-data', handleFriendData);
      }
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
    inputRef.current?.focus();
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message = {
      id: Date.now(),
      sender: 'me',
      text: newMessage,
      timestamp: new Date().toISOString(),
      status: 'sending'
    };

    setMessages([...messages, message]);
    setNewMessage('');

    // Simular envío y respuesta
    setTimeout(() => {
      setMessages(prev => prev.map(msg => 
        msg.id === message.id ? { ...msg, status: 'delivered' } : msg
      ));
    }, 500);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'online':
        return 'En línea';
      case 'playing':
        return 'En partida';
      case 'offline':
        return 'Desconectado';
      case 'afk':
        return 'Ausente';
      default:
        return 'Desconectado';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
        return '#4CAF50';
      case 'playing':
        return '#2196F3';
      case 'offline':
        return '#9e9e9e';
      case 'afk':
        return '#FFC107';
      default:
        return '#808080';
    }
  };

  const getPingColor = (ping) => {
    if (ping < 60) return '#4CAF50';
    if (ping < 150) return '#FFC107';
    return '#F44336';
  };

  return (
    <ChatErrorBoundary>
      <div className="chat-window">
        <div className="window-header">
          <div className="window-title">Chat</div>
          <WindowControls />
        </div>
        <div className="chat-header">
          <div className="user-info">
            {friend.avatar ? (
              <img 
                src={friend.avatar} 
                alt={friend.name} 
                className="avatar"
              />
            ) : (
              <div 
                className="avatar" 
                style={{ 
                  background: `linear-gradient(135deg, ${friend.color} 0%, ${friend.color} 100%)` 
                }}
              >
                {friend.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="user-details">
              <div className="user-name-row">
                <h3>{friend.name}</h3>
                <span className="user-level">Nivel {friend.level}</span>
              </div>
              <div className="status-row">
                <span 
                  className="status" 
                  style={{ 
                    color: getStatusColor(friend.status),
                    '--status-color': getStatusColor(friend.status)
                  }}
                >
                  {getStatusText(friend.status)}
                </span>
                {friend.ping > 0 && (
                  <span 
                    className="ping" 
                    style={{ color: getPingColor(friend.ping) }}
                  >
                    {friend.ping}ms
                  </span>
                )}
              </div>
              <div className="user-meta">
                <span className="rank">{friend.rank}</span>
                <span className="game-status">{friend.gameStatus}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="messages-container">
          {messages.map(message => (
            <div 
              key={message.id} 
              className={`message ${message.sender === 'me' ? 'sent' : 'received'}`}
            >
              <div className="message-content">
                {message.text}
                <span className="message-time">
                  {formatTime(message.timestamp)}
                </span>
                {message.sender === 'me' && (
                  <span className="message-status">
                    {message.status === 'delivered' && '✓'}
                  </span>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSendMessage} className="message-input">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Escribe un mensaje..."
            ref={inputRef}
          />
          <button type="submit">Enviar</button>
        </form>
      </div>
    </ChatErrorBoundary>
  );
};

export default ChatWindow; 