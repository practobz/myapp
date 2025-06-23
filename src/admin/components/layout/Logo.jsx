import React from 'react';

function Logo({ size = 'medium' }) {
  const sizes = {
    small: {
      container: 'h-8',
      icon: 16,
      text: 'text-lg',
    },
    medium: {
      container: 'h-10',
      icon: 20,
      text: 'text-xl',
    },
    large: {
      container: 'h-12',
      icon: 24,
      text: 'text-2xl',
    },
  };

  const currentSize = sizes[size];

  // Crown SVG icon component
  const Crown = ({ size, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M5 16L3 7L8.5 10L12 4L15.5 10L21 7L19 16H5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="currentColor"/>
    </svg>
  );

  return (
    <div className={`flex items-center ${currentSize.container}`} style={{ display: 'flex', alignItems: 'center' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
        padding: '6px',
        borderRadius: '6px',
        marginRight: '8px'
      }}>
        <Crown size={currentSize.icon} className="text-white" style={{ color: 'white' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{
          fontWeight: 'bold',
          lineHeight: 1,
          fontSize: size === 'large' ? '1.5rem' : size === 'small' ? '1.125rem' : '1.25rem',
          background: 'linear-gradient(90deg, #d97706 0%, #b45309 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontFamily: "'Dancing Script', cursive"
        }}>
          Aureum
        </span>
        <span style={{
          fontSize: '0.75rem',
          color: '#6b7280',
          lineHeight: 1,
          marginTop: '2px'
        }}>
          Solutions
        </span>
      </div>
    </div>
  );
}

export default Logo;
