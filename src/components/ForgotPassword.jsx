import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AtSign, Lock, AlertCircle, CheckCircle, ArrowLeft, KeyRound, Eye, EyeOff, Palette } from 'lucide-react';
import Logo from '../admin/components/layout/Logo';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Configuration for different user types
const roleConfig = {
  admin: {
    title: 'Admin Portal',
    subtitle: 'Reset your admin password',
    loginPath: '/login',
    primaryColor: 'blue',
    gradientFrom: 'from-blue-600',
    gradientTo: 'to-indigo-600',
    hoverFrom: 'hover:from-blue-700',
    hoverTo: 'hover:to-indigo-700',
    focusRing: 'focus:ring-blue-500',
    textColor: 'text-blue-600',
    hoverTextColor: 'hover:text-blue-800',
    bgGradient: 'from-slate-50 via-blue-50 to-indigo-50',
  },
  customer: {
    title: 'Customer Portal',
    subtitle: 'Reset your customer password',
    loginPath: '/customer/login',
    primaryColor: 'indigo',
    gradientFrom: 'from-cyan-500',
    gradientTo: 'to-blue-600',
    hoverFrom: 'hover:from-cyan-600',
    hoverTo: 'hover:to-blue-700',
    focusRing: 'focus:ring-cyan-500',
    textColor: 'text-indigo-600',
    hoverTextColor: 'hover:text-indigo-800',
    bgGradient: 'from-slate-50 via-blue-50 to-indigo-50',
  },
  content_creator: {
    title: 'Content Creator Portal',
    subtitle: 'Reset your creator password',
    loginPath: '/content-creator/login',
    primaryColor: 'purple',
    gradientFrom: 'from-purple-600',
    gradientTo: 'to-indigo-600',
    hoverFrom: 'hover:from-purple-700',
    hoverTo: 'hover:to-indigo-700',
    focusRing: 'focus:ring-purple-500',
    textColor: 'text-purple-600',
    hoverTextColor: 'hover:text-purple-800',
    bgGradient: 'from-purple-50 via-indigo-50 to-blue-50',
  },
};

function ForgotPassword({ userType = 'admin' }) {
  const navigate = useNavigate();
  const config = roleConfig[userType] || roleConfig.admin;
  
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    try {
      setError('');
      setLoading(true);

      const response = await fetch(`${API_BASE}/password-reset/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, userType })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('OTP sent to your email. Please check your inbox.');
        setStep(2);
      } else {
        setError(data.error || 'Failed to send OTP');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) {
      setError('Please enter the OTP');
      return;
    }

    try {
      setError('');
      setLoading(true);

      const response = await fetch(`${API_BASE}/password-reset/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, userType })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('OTP verified. Please set your new password.');
        setStep(3);
      } else {
        setError(data.error || 'Invalid OTP');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setError('');
      setLoading(true);

      const response = await fetch(`${API_BASE}/password-reset/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword, userType })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Password reset successful! Redirecting to login...');
        setTimeout(() => navigate(config.loginPath), 2000);
      } else {
        setError(data.error || 'Failed to reset password');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      setError('');
      setLoading(true);

      const response = await fetch(`${API_BASE}/password-reset/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, userType })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('New OTP sent to your email.');
        setOtp('');
      } else {
        setError(data.error || 'Failed to resend OTP');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const buttonClasses = `w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r ${config.gradientFrom} ${config.gradientTo} text-white font-semibold rounded-xl ${config.hoverFrom} ${config.hoverTo} focus:outline-none focus:ring-2 ${config.focusRing} focus:ring-offset-2 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`;

  return (
    <div className={`min-h-screen bg-gradient-to-br ${config.bgGradient} relative overflow-hidden`}>
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-32 h-32 bg-indigo-400/20 rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-20 w-48 h-48 bg-blue-300/30 rounded-full animate-pulse"></div>
        <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-cyan-400/20 transform rotate-45"></div>
        <div className="absolute top-1/3 right-1/3 w-24 h-24 bg-indigo-400/20 rounded-lg animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-indigo-300/30 to-transparent rounded-tr-full"></div>
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-blue-300/30 to-transparent rounded-bl-full"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header Section */}
          <div className="text-center">
            <div className="flex justify-center mb-6">
              {userType === 'content_creator' ? (
                <div className="p-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-lg">
                  <Palette className="h-8 w-8 text-white" />
                </div>
              ) : (
                <Logo size="large" />
              )}
            </div>
            {userType === 'content_creator' && (
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                {config.title}
              </h1>
            )}
            <h2 className="mt-3 text-2xl font-bold text-gray-900">
              Reset Password
            </h2>
            <p className="mt-2 text-gray-600">
              {step === 1 && 'Enter your email to receive a verification code'}
              {step === 2 && 'Enter the OTP sent to your email'}
              {step === 3 && 'Create your new password'}
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="flex justify-center space-x-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
                  step === s
                    ? `bg-gradient-to-r ${config.gradientFrom} ${config.gradientTo} text-white scale-110 shadow-lg`
                    : step > s
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {step > s ? <CheckCircle className="w-5 h-5" /> : s}
              </div>
            ))}
          </div>

          {/* Form Container */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-200/50">
            {error && (
              <div className="mb-6 bg-red-50/80 backdrop-blur-sm border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start">
                <AlertCircle className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-6 bg-green-50/80 backdrop-blur-sm border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-start">
                <CheckCircle className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-sm font-medium">{success}</span>
              </div>
            )}

            {/* Step 1: Email Input */}
            {step === 1 && (
              <form onSubmit={handleRequestOtp} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <AtSign className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200 hover:border-gray-400"
                      placeholder="Enter your registered email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading} className={buttonClasses}>
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Sending OTP...
                    </div>
                  ) : (
                    'Send OTP'
                  )}
                </button>
              </form>
            )}

            {/* Step 2: OTP Verification */}
            {step === 2 && (
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div>
                  <label htmlFor="otp" className="block text-sm font-semibold text-gray-700 mb-2">
                    Enter OTP
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <KeyRound className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="otp"
                      type="text"
                      maxLength={6}
                      required
                      className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200 hover:border-gray-400 text-center tracking-widest font-mono text-lg"
                      placeholder="000000"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">OTP sent to {email}</p>
                </div>

                <button type="submit" disabled={loading} className={buttonClasses}>
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Verifying...
                    </div>
                  ) : (
                    'Verify OTP'
                  )}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={loading}
                    className={`text-sm ${config.textColor} ${config.hoverTextColor} font-medium transition-colors`}
                  >
                    Didn't receive the code? Resend OTP
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: New Password */}
            {step === 3 && (
              <form onSubmit={handleResetPassword} className="space-y-6">
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      required
                      className="w-full pl-10 pr-12 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200 hover:border-gray-400"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      className="w-full pl-10 pr-12 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200 hover:border-gray-400"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                      )}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading} className={buttonClasses}>
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Resetting...
                    </div>
                  ) : (
                    'Reset Password'
                  )}
                </button>
              </form>
            )}

            {/* Back to Login */}
            <div className="mt-6 text-center">
              <Link
                to={config.loginPath}
                className={`inline-flex items-center text-sm text-gray-600 ${config.hoverTextColor} font-medium transition-colors`}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
