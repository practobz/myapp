import { useEffect } from 'react';
import { clearAllUserData } from '../utils/sessionUtils';

const LogoutHandler = ({ onLogout }) => {
  useEffect(() => {
    const handleLogout = () => {
      // Clear all user-specific social media data
      clearAllUserData();
      
      // Call the original logout function
      if (onLogout && typeof onLogout === 'function') {
        onLogout();
      }
    };

    // If you have a logout event, listen to it
    // Otherwise, you can call handleLogout directly when user logs out
    
    return () => {
      // Cleanup if needed
    };
  }, [onLogout]);

  return null; // This component doesn't render anything
};

export default LogoutHandler;
