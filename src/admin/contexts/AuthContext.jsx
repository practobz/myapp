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
    // Fix: Only parse if value is a valid JSON string
    const user = localStorage.getItem('user');
    if (user && user !== 'undefined') {
      try {
        setCurrentUser(JSON.parse(user));
      } catch (e) {
        setCurrentUser(null);
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // Utility function to handle POST requests
  const postRequest = async (url, body) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout for better debugging

      console.log('Making request to:', url); // Debug log
      console.log('Request body:', body); // Debug log
      
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(timeout);

      console.log('Response status:', res.status); // Debug log

      const responseText = await res.text();
      console.log('Raw response:', responseText); // Debug log

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response JSON:', parseError);
        data = { error: 'Invalid response from server' };
      }
      
      console.log('Response data:', data); // Debug log

      if (!res.ok) {
        // Show backend error message for 409 (Conflict) and other errors
        if (res.status === 409 && data.error) {
          throw new Error(data.error); // Show "Email already exists" directly
        }
        throw new Error(data.error || data.message || `HTTP ${res.status}: ${res.statusText}`);
      }
      return data;
    } catch (err) {
      console.error('Request error:', err); // Debug log
      if (err.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw new Error(err.message === 'Failed to fetch'
        ? 'Cannot connect to backend. Is the server running?'
        : err.message);
    }
  };

  // === Signup Functions ===
  async function adminSignup(name, email, password) {
    const data = await postRequest(
      `${process.env.REACT_APP_API_URL}/signup/admin`,
      { name, email, password }
    );
    const user = { _id: data.userId, name, email, role: 'admin' };
    setCurrentUser(user);
    localStorage.setItem('user', JSON.stringify(user));
  }

  async function superAdminSignup(name, email, password) {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    console.log('API URL for superadmin signup:', apiUrl); // Debug log
    
    const data = await postRequest(
      `${apiUrl}/signup/superadmin`,
      { name, email, password }
    );
    const user = { _id: data.userId, name, email, role: 'superadmin' };
    setCurrentUser(user);
    localStorage.setItem('user', JSON.stringify(user));
  }

  async function customerSignup(userData) {
    const data = await postRequest(
      `${process.env.REACT_APP_API_URL}/signup/customer`,
      userData
    );
    // Use the full user object from backend response (data.user or data.success && data.user)
    const user = data.user || (data.success && data.user) || { email: userData.email, role: 'customer' };
    setCurrentUser(user);
    localStorage.setItem('user', JSON.stringify(user));
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
    localStorage.setItem('user', JSON.stringify(user));
  }

  // === Login Function ===
  async function login(email, password, role = 'admin') {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    let endpoint = `${apiUrl}/${role}/login`;
    
    // Handle superadmin login endpoint
    if (role === 'superadmin') {
      endpoint = `${apiUrl}/superadmin/login`;
    }

    console.log('Login endpoint:', endpoint); // Debug log

    const data = await postRequest(endpoint, { email, password });

    let user;
    if (role === 'superadmin') {
      user = { ...data.superadmin, role: 'superadmin' };
    } else {
      user = data.user;
    }
    
    setCurrentUser(user);
    localStorage.setItem('user', JSON.stringify(user));
  }

  // === OTP Functions ===
  async function sendOtp(email, type = 'signup') {
    const data = await postRequest(
      `${process.env.REACT_APP_API_URL}/otp/send`,
      { email, type }
    );
    return data;
  }

  async function verifyOtp(email, otp) {
    const data = await postRequest(
      `${process.env.REACT_APP_API_URL}/otp/verify`,
      { email, otp }
    );
    return data;
  }

  function logout() {
    setCurrentUser(null);
    localStorage.removeItem('user');
  }

  // Update current user data (e.g., after profile update)
  function updateCurrentUser(updatedData) {
    const updatedUser = { ...currentUser, ...updatedData };
    setCurrentUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  }

  const value = {
    currentUser,
    isAuthenticated: !!currentUser,
    signup: adminSignup, // This now takes name, email, password
    login, // use this only when passing a role
    logout,
    updateCurrentUser,
    adminSignup,
    superAdminSignup,
    customerSignup,
    contentCreatorSignup,
    adminLogin: (email, password) => login(email, password, 'admin'),
    superAdminLogin: (email, password) => login(email, password, 'superadmin'),
    customerLogin: (email, password) => login(email, password, 'customer'),
    contentCreatorLogin: (email, password) => login(email, password, 'content_creator'),
    sendOtp,
    verifyOtp,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
