import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../admin/contexts/AuthContext';
import { AtSign, Lock, AlertCircle, Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react';
import Logo from '../../admin/components/layout/Logo';

function CustomerLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { customerLogin } = useAuth();
  const navigate = useNavigate();

  if (typeof customerLogin !== 'function') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-red-600 font-bold text-center">
          AuthContext is missing <code>customerLogin</code> function.<br />
          Please check your AuthContext implementation.
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      setError('');
      setLoading(true);
      await customerLogin(email, password);
      navigate('/customer');
    } catch (err) {
      if (err.message?.includes('Invalid credentials') || err.message?.includes('401')) {
        setError('Invalid email or password. Please check your credentials or sign up to create an account.');
      } else if (err.message?.includes('User not found')) {
        setError('No account found with this email. Please sign up to create an account.');
      } else {
        setError('Failed to log in. Please try again.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-100 via-cyan-50 to-yellow-100 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-32 h-32 bg-blue-400/30 rounded-full animate-float"></div>
        <div className="absolute top-40 right-20 w-48 h-48 bg-pink-300/40 rounded-full animate-float-delayed"></div>
        <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-yellow-400/30 transform rotate-45 animate-spin-slow"></div>
        <div className="absolute top-1/3 right-1/3 w-24 h-24 bg-green-400/30 rounded-lg animate-pulse-slow"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-pink-300/40 to-transparent rounded-tr-full"></div>
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-blue-300/40 to-transparent rounded-bl-full"></div>
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
            <h2 className="text-4xl font-bold text-gray-800 mb-2 animate-fade-in-up">
              Welcome Back
            </h2>
            <p className="text-gray-600 animate-fade-in-up animation-delay-100">
              Sign in to continue your journey
            </p>
          </div>

          {/* Login Form */}
          <div className="bg-white/70 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-white/50 transform hover:scale-[1.02] transition-all duration-300">
            {error && (
              <div className="mb-6 bg-red-50/80 backdrop-blur-sm border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start animate-shake">
                <AlertCircle className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Email Field */}
              <div className="transform transition-all duration-200 hover:translate-x-1">
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <AtSign className="h-5 w-5 text-gray-400 group-focus-within:text-cyan-600 transition-colors" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent shadow-sm transition-all duration-200 hover:border-cyan-300 hover:shadow-md"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="transform transition-all duration-200 hover:translate-x-1">
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-cyan-600 transition-colors" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    className="w-full pl-10 pr-12 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent shadow-sm transition-all duration-200 hover:border-cyan-300 hover:shadow-md"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={togglePasswordVisibility}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-cyan-600 transition-colors" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-cyan-600 transition-colors" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 group-hover:animate-shine"></div>
                  {loading ? (
                    <div className="flex items-center relative z-10">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Signing in...
                    </div>
                  ) : (
                    <div className="flex items-center relative z-10">
                      Sign In
                      <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                  )}
                </button>
              </div>
            </form>

            {/* Footer */}
            <div className="mt-8 text-center">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-2 border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white/70 text-gray-500 font-medium">New to AirSpark?</span>
                </div>
              </div>
              <div className="mt-4">
                <Link
                  to="/customer/signup"
                  className="inline-flex items-center px-6 py-2.5 border-2 border-cyan-500 rounded-xl text-sm font-semibold text-cyan-600 bg-white hover:bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 transition-all duration-200 hover:scale-105 hover:shadow-lg"
                >
                  Create an account
                </Link>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="text-center animate-fade-in-up animation-delay-200">
            <p className="text-xs text-gray-600">
              By signing in, you agree to our{' '}
              <span className="text-cyan-600 hover:underline cursor-pointer font-medium">Terms</span>
              {' '}and{' '}
              <span className="text-cyan-600 hover:underline cursor-pointer font-medium">Privacy Policy</span>
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

export default CustomerLogin;
     