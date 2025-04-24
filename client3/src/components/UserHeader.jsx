import React from 'react';

const UserHeader = ({ user }) => {
  const handleDoubleClick = () => {
    console.log('Viendo perfil de:', user.name);
  };

  return (
    <div 
      className="user-header"
      onDoubleClick={handleDoubleClick}
      style={{ cursor: 'pointer' }}
    >
      <div className="user-header-avatar">
        <img 
          src={user.avatar || '/default-avatar.png'} 
          alt="Avatar" 
          className="user-header-avatar-img"
        />
        {user.tier === 'gold' && <div className="user-header-badge gold">Gold</div>}
        {user.tier === 'silver' && <div className="user-header-badge silver">Silver</div>}
      </div>
      <div className="user-header-info">
        <h2 className="user-header-name">{user.name}</h2>
        <p className="user-header-status">{user.status}</p>
      </div>
    </div>
  );
};

export default UserHeader; 