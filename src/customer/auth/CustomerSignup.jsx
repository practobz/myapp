import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../admin/contexts/AuthContext';
import { AtSign, Lock, AlertCircle, User, Phone, MapPin, FileText, Eye, EyeOff, ArrowRight, CheckCircle, Mail, Clock, RefreshCw, Sparkles } from 'lucide-react';
import Logo from '../../admin/components/layout/Logo';

function CustomerSignup() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    address: '',
    gstNumber: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [showOtpForm, setShowOtpForm] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);

  const { customerSignup, sendOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let interval = null;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer(otpTimer - 1);
      }, 1000);
    } else if (otpTimer === 0 && showOtpForm) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [otpTimer, showOtpForm]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(value);
  };

  const getPasswordStrength = (password) => {
    if (password.length === 0) return { strength: 0, text: '', color: '' };
    if (password.length < 8) return { strength: 1, text: 'Weak', color: 'text-red-500' };
    if (password.length < 10 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return { strength: 2, text: 'Fair', color: 'text-yellow-500' };
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(password)) {
      return { strength: 3, text: 'Good', color: 'text-blue-500' };
    }
    return { strength: 4, text: 'Strong', color: 'text-green-500' };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  const validateForm = () => {
    if (!formData.name) return 'Full name is required';
    if (!formData.email) return 'Email is required';
    if (!/\S+@\S+\.\S+/.test(formData.email)) return 'Please enter a valid email address';
    if (!formData.mobile) return 'Mobile number is required';
    if (!/^[+]?[0-9]{10,15}$/.test(formData.mobile.replace(/\s/g, ''))) return 'Please enter a valid mobile number';
    if (!formData.address) return 'Address is required';
    if (formData.gstNumber && formData.gstNumber.trim() !== '' && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.gstNumber)) return 'Please enter a valid GST number format';
    if (!formData.password) return 'Password is required';
    if (formData.password.length < 8) return 'Password must be at least 8 characters long';
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setError('');
      setLoading(true);

      await sendOtp(formData.email.trim().toLowerCase(), 'signup');

      setShowOtpForm(true);
      setOtpTimer(300);
      setCanResend(false);

    } catch (err) {
      if (err.message?.includes('already exists') || err.message?.includes('409')) {
        setError('An account with this email already exists. Please sign in instead.');
      } else {
        setError(err.message || 'Failed to send OTP. Please try again.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerification = async (e) => {
    e.preventDefault();

    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    try {
      setError('');
      setOtpLoading(true);

      await verifyOtp(formData.email.trim().toLowerCase(), otp);

      const data = { ...formData, email: formData.email.trim().toLowerCase() };
      await customerSignup(data);
      navigate('/customer');

    } catch (err) {
      if (err.message?.includes('Invalid OTP') || err.message?.includes('expired')) {
        setError('Invalid or expired OTP. Please try again.');
      } else {
        setError(err.message || 'OTP verification failed. Please try again.');
      }
      console.error(err);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      setResendLoading(true);
      setError('');

      await sendOtp(formData.email.trim().toLowerCase(), 'signup');

      setOtpTimer(300);
      setCanResend(false);
      setOtp('');

    } catch (err) {
      setError(err.message || 'Failed to resend OTP. Please try again.');
      console.error(err);
    } finally {
      setResendLoading(false);
    }
  };

  const handleBackToForm = () => {
    setShowOtpForm(false);
    setOtp('');
    setOtpTimer(0);
    setCanResend(false);
    setError('');
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-32 h-32 bg-indigo-400/20 rounded-full animate-float"></div>
        <div className="absolute top-40 right-20 w-48 h-48 bg-blue-300/30 rounded-full animate-float-delayed"></div>
        <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-cyan-400/20 transform rotate-45 animate-spin-slow"></div>
        <div className="absolute top-1/3 right-1/3 w-24 h-24 bg-indigo-400/20 rounded-lg animate-pulse-slow"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-indigo-300/30 to-transparent rounded-tr-full"></div>
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-blue-300/30 to-transparent rounded-bl-full"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 animate-fade-in">

          {/* Header Section */}
          <div className="text-center">
            {/* Use Logo component instead of inline logo */}
            <div className="flex justify-center mb-6">
              <Logo size="large" />
            </div>
            <h2 className="text-4xl font-bold text-slate-800 mb-2 animate-fade-in-up">
              {showOtpForm ? 'Verify Your Email' : 'Create Account'}
            </h2>
            <p className="text-slate-600 animate-fade-in-up animation-delay-100">
              {showOtpForm
                ? `Enter the OTP sent to ${formData.email}`
                : 'Join AirSpark and ignite your social presence'
              }
            </p>
          </div>

          {/* Form Container */}
          <div className="bg-white rounded-2xl shadow-xl hover:shadow-2xl p-8 border border-slate-200 transition-all duration-300">
            {error && (
              <div className="mb-6 bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start animate-shake">
                <AlertCircle className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}

            {!showOtpForm ? (
              <form className="space-y-5" onSubmit={handleSubmit}>
                {/* Name Field */}
                <div className="transform transition-all duration-200 hover:translate-x-1">
                  <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-2">
                    Full Name
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                    </div>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                {/* Email Field */}
                <div className="transform transition-all duration-200 hover:translate-x-1">
                  <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <AtSign className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md"
                      placeholder="Enter your email address"
                      value={formData.email}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                {/* Mobile Field */}
                <div className="transform transition-all duration-200 hover:translate-x-1">
                  <label htmlFor="mobile" className="block text-sm font-semibold text-slate-700 mb-2">
                    Mobile Number
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                    </div>
                    <input
                      id="mobile"
                      name="mobile"
                      type="tel"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md"
                      placeholder="+91 9876543210"
                      value={formData.mobile}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                {/* Address Field */}
                <div className="transform transition-all duration-200 hover:translate-x-1">
                  <label htmlFor="address" className="block text-sm font-semibold text-slate-700 mb-2">
                    Address
                  </label>
                  <div className="relative group">
                    <div className="absolute top-3 left-3 pointer-events-none">
                      <MapPin className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                    </div>
                    <textarea
                      id="address"
                      name="address"
                      rows={2}
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md resize-none"
                      placeholder="Enter your complete address"
                      value={formData.address}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                {/* GST Number Field */}
                <div className="transform transition-all duration-200 hover:translate-x-1">
                  <label htmlFor="gstNumber" className="block text-sm font-semibold text-slate-700 mb-2">
                    GST Number
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FileText className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                    </div>
                    <input
                      id="gstNumber"
                      name="gstNumber"
                      type="text"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md"
                      placeholder="27ABCDE1234F1Z5 (optional)"
                      value={formData.gstNumber}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="transform transition-all duration-200 hover:translate-x-1">
                  <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                    Password
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      className="w-full pl-10 pr-12 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md"
                      placeholder="Create a strong password"
                      value={formData.password}
                      onChange={handleInputChange}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={togglePasswordVisibility}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-slate-400 hover:text-indigo-600 transition-colors" />
                      ) : (
                        <Eye className="h-5 w-5 text-slate-400 hover:text-indigo-600 transition-colors" />
                      )}
                    </button>
                  </div>

                  {formData.password && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-500">Password strength:</span>
                        <span className={`text-xs font-semibold ${passwordStrength.color}`}>
                          {passwordStrength.text}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-300 ${passwordStrength.strength === 1 ? 'bg-red-500 w-1/4' :
                              passwordStrength.strength === 2 ? 'bg-yellow-500 w-2/4' :
                                passwordStrength.strength === 3 ? 'bg-blue-500 w-3/4' :
                                  passwordStrength.strength === 4 ? 'bg-green-500 w-full' : 'w-0'
                            }`}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div className="transform transition-all duration-200 hover:translate-x-1">
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                    </div>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      className="w-full pl-10 pr-12 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md"
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={toggleConfirmPasswordVisibility}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5 text-slate-400 hover:text-indigo-600 transition-colors" />
                      ) : (
                        <Eye className="h-5 w-5 text-slate-400 hover:text-indigo-600 transition-colors" />
                      )}
                    </button>
                  </div>

                  {formData.confirmPassword && (
                    <div className="mt-2 flex items-center">
                      {formData.password === formData.confirmPassword ? (
                        <div className="flex items-center text-green-600">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          <span className="text-xs font-medium">Passwords match</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-red-600">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          <span className="text-xs font-medium">Passwords do not match</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="group relative w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 group-hover:animate-shine"></div>
                    {loading ? (
                      <div className="flex items-center relative z-10">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Sending OTP...
                      </div>
                    ) : (
                      <div className="flex items-center relative z-10">
                        Send OTP
                        <Mail className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                      </div>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <form className="space-y-6" onSubmit={handleOtpVerification}>
                <div className="transform transition-all duration-200 hover:translate-x-1">
                  <label htmlFor="otp" className="block text-sm font-semibold text-slate-700 mb-2">
                    Enter OTP
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                    </div>
                    <input
                      id="otp"
                      name="otp"
                      type="text"
                      maxLength="6"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md text-center text-lg font-mono tracking-widest"
                      placeholder="000000"
                      value={otp}
                      onChange={handleOtpChange}
                    />
                  </div>
                  <div className="mt-2 text-xs text-slate-500 text-center">
                    Enter the 6-digit code sent to your email
                  </div>
                </div>

                {otpTimer > 0 && (
                  <div className="flex items-center justify-center text-sm text-slate-600 bg-indigo-50 py-2 rounded-lg">
                    <Clock className="h-4 w-4 mr-2 text-indigo-600" />
                    <span>Resend OTP in <span className="font-bold text-indigo-600">{formatTime(otpTimer)}</span></span>
                  </div>
                )}

                <div>
                  <button
                    type="submit"
                    disabled={otpLoading || !otp || otp.length !== 6}
                    className="group relative w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 group-hover:animate-shine"></div>
                    {otpLoading ? (
                      <div className="flex items-center relative z-10">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Verifying...
                      </div>
                    ) : (
                      <div className="flex items-center relative z-10">
                        Verify & Create Account
                        <CheckCircle className="h-5 w-5 ml-2 group-hover:scale-110 transition-transform" />
                      </div>
                    )}
                  </button>
                </div>

                {canResend && (
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendLoading}
                      className="inline-flex items-center px-4 py-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {resendLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
                          Sending...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Resend OTP
                        </>
                      )}
                    </button>
                  </div>
                )}

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleBackToForm}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 rounded-lg transition-colors"
                  >
                    <ArrowRight className="h-4 w-4 mr-1 rotate-180" />
                    Back to form
                  </button>
                </div>
              </form>
            )}

            {!showOtpForm && (
              <div className="mt-6 text-center">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t-2 border-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-slate-500 font-medium">Already have an account?</span>
                  </div>
                </div>
                <div className="mt-4">
                  <Link
                    to="/customer/login"
                    className="inline-flex items-center px-6 py-2.5 border-2 border-indigo-500 rounded-xl text-sm font-semibold text-indigo-600 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 hover:scale-105 hover:shadow-lg"
                  >
                    Sign in instead
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Additional Info */}
          <div className="text-center animate-fade-in-up animation-delay-200">
            <p className="text-xs text-slate-600">
              By creating an account, you agree to our{' '}
              <span className="text-indigo-600 hover:underline cursor-pointer font-medium">Terms</span>
              {' '}and{' '}
              <span className="text-indigo-600 hover:underline cursor-pointer font-medium">Privacy Policy</span>
            </p>
          </div>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-30px); }
        }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }

        @keyframes shine {
          0% { left: -100%; }
          100% { left: 200%; }
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        .animate-float-delayed {
          animation: float-delayed 8s ease-in-out infinite;
        }

        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }

        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out;
        }

        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }

        .animation-delay-100 {
          animation-delay: 0.1s;
        }

        .animation-delay-200 {
          animation-delay: 0.2s;
        }

        .animate-shine {
          animation: shine 1.5s ease-in-out;
          position: absolute;
          inset: 0;
          left: -100%;
        }
      `}</style>
    </div>
  );
}

export default CustomerSignup;