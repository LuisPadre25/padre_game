import React, { useState, useEffect, useRef } from 'react';
import './Chat.css';

const Chat = ({ onClose }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      content: "¡Hola! ¿Cómo estás?",
      sender: "friend",
      timestamp: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 2,
      content: "¡Muy bien! ¿Listo para jugar?",
      sender: "me",
      timestamp: new Date(Date.now() - 1800000).toISOString()
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const newMsg = {
      id: messages.length + 1,
      content: newMessage,
      sender: "me",
      timestamp: new Date().toISOString()
    };

    setMessages([...messages, newMsg]);
    setNewMessage('');
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="chat-user-info">
          <div className="chat-avatar">A</div>
          <span className="chat-username">Amigo</span>
        </div>
        <button className="chat-close-btn" onClick={onClose}>&times;</button>
      </div>

      <div className="chat-messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`chat-message ${message.sender === 'me' ? 'sent' : 'received'}`}
          >
            <div className="message-content">{message.content}</div>
            <div className="message-timestamp">
              {formatTimestamp(message.timestamp)}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          className="chat-input"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Escribe un mensaje..."
        />
        <button type="submit" className="chat-send-btn">
          Enviar
        </button>
      </form>
    </div>
  );
};

export default Chat; 