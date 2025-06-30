import React, { createContext, useContext, useState, useEffect } from 'react';

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
      const raw = localStorage.getItem('user');
      if (raw && raw !== 'undefined' && raw !== '') {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          setCurrentUser(parsed);
        }
      }
    } catch (err) {
      console.warn('⚠️ Failed to load user from localStorage:', err.message);
      localStorage.removeItem('user');
    }
    setLoading(false);
  }, []);

  // Utility function to handle POST requests
  const postRequest = async (url, body) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      console.log('Posting to URL:', url);

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(timeout);

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Invalid credentials or sign up to create account');
        }
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
    const data = await postRequest(
      `${process.env.REACT_APP_API_URL}/signup/admin`,
      { email, password }
    );
    const user = { _id: data.userId, email, role: 'admin' };
    setCurrentUser(user);
if (user) {
  localStorage.setItem('user', JSON.stringify(user));
}

  }

  async function customerSignup(userData) {
    const data = await postRequest(
      `${process.env.REACT_APP_API_URL}/signup/customer`,
      userData
    );
    const user =
      data.user || (data.success && data.user) || { email: userData.email, role: 'customer' };
   setCurrentUser(user);
if (user) {
  localStorage.setItem('user', JSON.stringify(user));
}

  }

  async function contentCreatorSignup(email, password, additionalData) {
    const data = await postRequest(
      `${process.env.REACT_APP_API_URL}/signup/creator`,
      {
        email,
        password,
        ...additionalData
      }
    );
    const user = { _id: data.userId, email, role: 'content_creator', ...additionalData };
   setCurrentUser(user);
if (user) {
  localStorage.setItem('user', JSON.stringify(user));
}

  }

  // === Login Function ===
  async function login(email, password, role = 'admin') {
    const data = await postRequest(
      `${process.env.REACT_APP_API_URL}/${role}/login`,
      { email, password }
    );
    const user = data.user;
   setCurrentUser(user);
if (user) {
  localStorage.setItem('user', JSON.stringify(user));
}

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
    adminLogin: (email, password) => login(email, password, 'admin'),
    customerLogin: (email, password) => login(email, password, 'customer'),
    contentCreatorLogin: (email, password) => login(email, password, 'content_creator'),
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
