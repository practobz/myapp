/**
 * Utility functions for managing user-specific session data
 */

// Get current user ID from various possible sources
export const getCurrentUserId = () => {
  try {
    // Try multiple ways to get customer ID
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    let userId = currentUser.userId || currentUser.id || currentUser._id || currentUser.customer_id;
    
    // If still no user ID, try getting from other possible sources
    if (!userId) {
      const authUser = JSON.parse(localStorage.getItem('user') || '{}');
      userId = authUser.userId || authUser.id || authUser._id || authUser.customer_id;
    }
    
    // If still no user ID, try auth token data
    if (!userId) {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      if (token) {
        try {
          // Simple base64 decode to extract user info (adjust based on your token structure)
          const payload = JSON.parse(atob(token.split('.')[1]));
          userId = payload.userId || payload.id || payload.sub;
        } catch (e) {
          console.warn('Could not decode token:', e);
        }
      }
    }
    
    return userId;
  } catch (error) {
    console.warn('Error getting current user ID:', error);
    return null;
  }
};

// Create user-specific localStorage key
export const getUserSpecificKey = (baseKey) => {
  const userId = getCurrentUserId();
  if (!userId) {
    console.warn(`No user ID found for key: ${baseKey}`);
    return baseKey; // Fallback to original key
  }
  return `${baseKey}_user_${userId}`;
};

// Get user-specific data from localStorage
export const getUserData = (baseKey, defaultValue = null) => {
  try {
    const userKey = getUserSpecificKey(baseKey);
    const data = localStorage.getItem(userKey);
    return data ? JSON.parse(data) : defaultValue;
  } catch (error) {
    console.warn(`Error getting user data for key ${baseKey}:`, error);
    return defaultValue;
  }
};

// Set user-specific data to localStorage
export const setUserData = (baseKey, data) => {
  try {
    const userKey = getUserSpecificKey(baseKey);
    localStorage.setItem(userKey, JSON.stringify(data));
    return true;
  } catch (error) {
    console.warn(`Error setting user data for key ${baseKey}:`, error);
    return false;
  }
};

// Remove user-specific data from localStorage
export const removeUserData = (baseKey) => {
  try {
    const userKey = getUserSpecificKey(baseKey);
    localStorage.removeItem(userKey);
    return true;
  } catch (error) {
    console.warn(`Error removing user data for key ${baseKey}:`, error);
    return false;
  }
};

// Clear all data for current user (useful for logout)
export const clearAllUserData = () => {
  try {
    const userId = getCurrentUserId();
    if (!userId) return;
    
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes(`_user_${userId}`)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`Cleared ${keysToRemove.length} user-specific keys for user ${userId}`);
    return true;
  } catch (error) {
    console.warn('Error clearing user data:', error);
    return false;
  }
};

// Migrate existing data to user-specific keys (run once during upgrade)
export const migrateToUserSpecificStorage = (baseKeys) => {
  try {
    const userId = getCurrentUserId();
    if (!userId) return false;
    
    let migratedCount = 0;
    baseKeys.forEach(baseKey => {
      const oldData = localStorage.getItem(baseKey);
      if (oldData) {
        const userKey = getUserSpecificKey(baseKey);
        // Only migrate if user-specific key doesn't exist
        if (!localStorage.getItem(userKey)) {
          localStorage.setItem(userKey, oldData);
          migratedCount++;
        }
        // Remove old key after migration
        localStorage.removeItem(baseKey);
      }
    });
    
    if (migratedCount > 0) {
      console.log(`Migrated ${migratedCount} keys to user-specific storage`);
    }
    return true;
  } catch (error) {
    console.warn('Error during migration:', error);
    return false;
  }
};
