import React, { useEffect } from 'react';
import { Routes, Route, BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from '../admin/contexts/AuthContext';
import { CustomerProvider } from './contexts/CustomerContext';
import Dashboard from './Dashboard';
import ContentCalendar from './ContentCalendar';
import Settings from './Settings';
import CustomerLogin from './auth/CustomerLogin';
import CustomerSignup from './auth/CustomerSignup';
import Subscription from './Subscription';
import Layout from './Layout';

function App() {
  useEffect(() => {
    document.title = 'Aureum Solutions';
  }, []);

  return (
    <AuthProvider>
      <CustomerProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/customer/login" element={<CustomerLogin />} />
            <Route path="/customer/signup" element={<CustomerSignup />} />

            {/* Protected Routes with Layout */}
            <Route
              path="/customer"
              element={
                <Layout>
                  <Dashboard />
                </Layout>
              }
            />
            <Route
              path="/customer/calendar"
              element={
                <Layout>
                  <ContentCalendar />
                </Layout>
              }
            />
            <Route
              path="/customer/settings"
              element={
                <Layout>
                  <Settings />
                </Layout>
              }
            />
            <Route
              path="/customer/subscription"
              element={
                <Layout>
                  <Subscription />
                </Layout>
              }
            />
          </Routes>
        </Router>
      </CustomerProvider>
    </AuthProvider>
  );
}

export default App;