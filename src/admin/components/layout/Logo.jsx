import React from 'react';

function Logo({ size = 'medium' }) {
  const sizes = {
    small: {
      container: 'h-8',
      icon: 32,
    },
    medium: {
      container: 'h-10',
      icon: 40,
    },
    large: {
      container: 'h-12',
      icon: 48,
    },
  };

  const currentSize = sizes[size];

  return (
    <div
      className={`flex items-center ${currentSize.container}`}
      style={{
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <img
        src="/logoAirspark.png"
        alt="AirSpark Logo"
        style={{
          maxWidth: currentSize.icon * 2.5,
          height: 'auto',
          verticalAlign: 'middle',
          display: 'block',
        }}
      />
    </div>
  );
}

export default Logo;


