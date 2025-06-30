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
     const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

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
    localStorage.setItem('user', JSON.stringify(user));
  }

  async function customerSignup(userData) {
    try {
      const data = await postRequest(
        `${process.env.REACT_APP_API_URL}/signup/customer`,
        userData
      );
      const user = data.user || (data.success && data.user) || { email: userData.email, role: 'customer' };
      setCurrentUser(user);
      localStorage.setItem('user', JSON.stringify(user));
    } catch (err) {
      if (err.message === 'Request timed out') {
        throw new Error('Signup request timed out. Please try again.');
      }
      throw err;
    }
  }

  async function contentCreatorSignup(email, password, additionalData) {
    try {
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
      localStorage.setItem('user', JSON.stringify(user));
    } catch (err) {
      if (err.message === 'Request timed out') {
        throw new Error('Signup request timed out. Please try again.');
      }
      throw err;
    }
  }

  // === Login Function ===
  async function login(email, password, role = 'admin') {
    try {
      const data = await postRequest(
        `${process.env.REACT_APP_API_URL}/${role}/login`,
        { email, password }
      );
      const user = data.user;
      setCurrentUser(user);
      localStorage.setItem('user', JSON.stringify(user));
    } catch (err) {
      if (
        err.message === 'Invalid credentials or sign up to create account' ||
        err.message.toLowerCase().includes('invalid credentials')
      ) {
        throw err;
      }
      if (err.message === 'Request timed out') {
        throw new Error('Login request timed out. Please try again.');
      }
      throw err;
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
  login, // use this only when passing a role
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
