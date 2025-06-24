import React, { createContext, useContext, useState, useEffect } from 'react';

// Remove trailing slash and whitespace if present
const BASE_URL = (process.env.REACT_APP_API_URL || '').trim().replace(/\/+$/, '');
if (!BASE_URL) {
  console.error("API URL is not set");
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
    const user = localStorage.getItem('user');
    if (user) {
      setCurrentUser(JSON.parse(user));
    }
    setLoading(false);
  }, []);

  // Utility function to handle POST requests
  const postRequest = async (url, body) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(timeout);

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Show backend error message for 409 (Conflict) and other errors
        if (res.status === 409 && data.error) {
          throw new Error(data.error); // Show "Email already exists" directly
        }
        throw new Error(data.error || `HTTP ${res.status}: ${res.statusText}`);
      }
      return data;
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw new Error(err.message === 'Failed to fetch'
        ? 'Cannot connect to backend. Is the server running?'
        : err.message);
    }
  };

  // === Signup Functions ===
  async function adminSignup(email, password) {
    const data = await postRequest(`${BASE_URL}/signup/admin`, { email, password });
    const user = { _id: data.userId, email, role: 'admin' };
    setCurrentUser(user);
    localStorage.setItem('user', JSON.stringify(user));
  }

  async function customerSignup(userData) {
    const data = await postRequest(`${BASE_URL}/signup/customer`, userData);
    // Use the full user object from backend response (data.user or data.success && data.user)
    const user = data.user || (data.success && data.user) || { email: userData.email, role: 'customer' };
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
