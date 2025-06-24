import React, { createContext, useContext, useState, useEffect } from 'react';

// ✅ Setup backend API base URL
const BASE_URL = (process.env.REACT_APP_API_URL || '').trim().replace(/\/+$/, '');
if (!BASE_URL) {
  console.error('❌ API URL is not set');
} else {
  console.log('✅ API base URL:', BASE_URL);
}

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

useEffect(() => {
  try {
    const rawUser = localStorage.getItem('user');

    if (rawUser && rawUser !== 'undefined') {
      setCurrentUser(JSON.parse(rawUser));
    } else {
      localStorage.removeItem('user'); // remove invalid "undefined"
    }
  } catch (err) {
    console.error('❌ Invalid user JSON in localStorage:', err.message);
    localStorage.removeItem('user');
  }
  setLoading(false);
}, []);


  // ✅ Updated POST request handler with JSON safety
  const postRequest = async (url, body) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const data = await res.json().catch(() => {
        throw new Error('Invalid JSON in response');
      });

      if (!res.ok) {
        if (res.status === 409 && data.error) {
          throw new Error(data.error);
        }
        throw new Error(data.error || `HTTP ${res.status}: ${res.statusText}`);
      }

      return data;
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw new Error(
        err.message === 'Failed to fetch'
          ? 'Cannot connect to backend. Is the server running?'
          : err.message
      );
    }
  };

  // === Signup Functions ===
 async function adminSignup(email, password) {
  await postRequest(`${BASE_URL}/signup/admin`, { email, password });
  // Do not set user or localStorage — redirect to /login after this
}

  async function customerSignup(userData) {
    const data = await postRequest(`${BASE_URL}/signup/customer`, userData);
    const user = data.user || (data.success && data.user) || {
      email: userData.email,
      role: 'customer',
    };
    setCurrentUser(user);
    localStorage.setItem('user', JSON.stringify(user));
  }

  async function contentCreatorSignup(email, password) {
    const data = await postRequest(`${BASE_URL}/signup/creator`, { email, password });
    const user = { _id: data.userId, email, role: 'content_creator' };
    setCurrentUser(user);
    localStorage.setItem('user', JSON.stringify(user));
  }

  // === Login Function ===
 async function login(email, password) {
  const data = await postRequest(`${BASE_URL}/login`, { email, password });

  if (!data.user || typeof data.user !== 'object') {
    throw new Error('Login failed: Invalid user data from server');
  }

  const user = data.user;
  setCurrentUser(user);
  localStorage.setItem('user', JSON.stringify(user));
}


  function logout() {
    setCurrentUser(null);
    localStorage.removeItem('user');
  }

  const value = {
    currentUser,
    isAuthenticated: !!currentUser,
    signup: adminSignup,
    login,
    logout,
    adminSignup,
    customerSignup,
    contentCreatorSignup,
    customerLogin: login,
    contentCreatorLogin: login,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
