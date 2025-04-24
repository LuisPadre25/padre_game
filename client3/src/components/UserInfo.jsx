import React, { useState } from 'react';

const UserInfo = ({ user }) => {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const handleContextMenu = (e) => {
    e.preventDefault();
    setMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleClick = () => {
    setShowContextMenu(false);
  };

  return (
    <div 
      className="user-info-container"
      onContextMenu={handleContextMenu}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
    >
      <div className="user-avatar">
        <img src={user.avatar || '/default-avatar.png'} alt="Avatar" />
      </div>
      <div className="user-details">
        <h3>{user.name}</h3>
        <p className="user-status">{user.status}</p>
      </div>
      
      {showContextMenu && (
        <div 
          className="context-menu"
          style={{
            position: 'fixed',
            top: menuPosition.y,
            left: menuPosition.x,
            zIndex: 1000
          }}
        >
          {/* No se muestra el botón para ver perfil */}
        </div>
      )}
    </div>
  );
};

export default UserInfo; 