import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Users, TrendingUp, ArrowRight } from 'lucide-react';
import Logo from '../../admin/components/layout/Logo';

function CustomerWelcome() {
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-100 via-cyan-50 to-yellow-100 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Geometric shapes - animated */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-blue-400/30 rounded-full animate-float"></div>
        <div className="absolute top-40 right-20 w-48 h-48 bg-pink-300/40 rounded-full animate-float-delayed"></div>
        <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-yellow-400/30 transform rotate-45 animate-spin-slow"></div>
        <div className="absolute top-1/3 right-1/3 w-24 h-24 bg-green-400/30 rounded-lg animate-pulse-slow"></div>

        {/* Abstract 3D-like shapes */}
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-pink-300/40 to-transparent rounded-tr-full"></div>
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-blue-300/40 to-transparent rounded-bl-full"></div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-12">
        <div className="max-w-6xl w-full grid lg:grid-cols-2 gap-12 items-center">

          {/* Left Side - Branding & Info */}
          <div className="text-center lg:text-left space-y-8 animate-fade-in-left">
            {/* Branding Line */}
           
            {/* Centered Large Logo */}
            <div className="flex justify-center lg:justify-start my-2">
              <Logo size="large" />
            </div>
            {/* Tagline */}
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-800 leading-tight animate-fade-in">
                Ignite Your
                <span className="block bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600 bg-clip-text text-transparent">
                  Social Presence
                </span>
              </h1>
              <p className="text-lg text-gray-600 max-w-lg mx-auto lg:mx-0">
                Connect with talented content creators and elevate your social media game with premium, ready-to-post content.
              </p>
            </div>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
              <div className="flex items-center space-x-2 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full shadow-md animate-fade-in-up">
                <Users className="h-5 w-5 text-cyan-600" />
                <span className="text-sm font-medium text-gray-700">1000+ Creators</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full shadow-md animate-fade-in-up animation-delay-100">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Boost Engagement</span>
              </div>
            </div>
          </div>

          {/* Right Side - Auth Card */}
          <div className="animate-fade-in-right">
            <div className="bg-white/70 backdrop-blur-md rounded-3xl shadow-2xl p-8 lg:p-12 border border-white/50 transform hover:scale-105 transition-all duration-300">

              {/* Card Header */}
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">Get Started</h2>
                <p className="text-gray-600">Choose an option to continue</p>
              </div>

              {/* Auth Options */}
              <div className="space-y-4">

                {/* Login Card */}
                <div
                  onMouseEnter={() => setHoveredCard('login')}
                  onMouseLeave={() => setHoveredCard(null)}
                  onClick={() => navigate('/customer/login')}
                  className="group relative bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl p-6 cursor-pointer transform transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
                >
                  <div className="flex items-center justify-between text-white">
                    <div>
                      <h3 className="text-2xl font-bold mb-1">Log In</h3>
                      <p className="text-cyan-50 text-sm">Already have an account?</p>
                    </div>
                    <ArrowRight className={`h-8 w-8 transform transition-transform duration-300 ${hoveredCard === 'login' ? 'translate-x-2' : ''}`} />
                  </div>

                  {/* Animated shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 group-hover:animate-shine"></div>
                </div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t-2 border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white/70 text-gray-500 font-medium">OR</span>
                  </div>
                </div>

                {/* Signup Card */}
                <div
                  onMouseEnter={() => setHoveredCard('signup')}
                  onMouseLeave={() => setHoveredCard(null)}
                  onClick={() => navigate('/customer/signup')}
                  className="group relative bg-gradient-to-r from-teal-500 to-emerald-600 rounded-2xl p-6 cursor-pointer transform transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
                >
                  <div className="flex items-center justify-between text-white">
                    <div>
                      <h3 className="text-2xl font-bold mb-1">Sign Up</h3>
                      <p className="text-teal-50 text-sm">Create a new account</p>
                    </div>
                    <ArrowRight className={`h-8 w-8 transform transition-transform duration-300 ${hoveredCard === 'signup' ? 'translate-x-2' : ''}`} />
                  </div>

                  {/* Animated shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 group-hover:animate-shine"></div>
                </div>

              </div>

              {/* Footer Note */}
              <div className="mt-8 text-center">
                <p className="text-xs text-gray-500">
                  By continuing, you agree to our{' '}
                  <span className="text-cyan-600 hover:underline cursor-pointer">Terms</span>
                  {' '}and{' '}
                  <span className="text-cyan-600 hover:underline cursor-pointer">Privacy Policy</span>
                </p>
              </div>

            </div>
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

        @keyframes fade-in-left {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fade-in-right {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
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

        .animate-fade-in-left {
          animation: fade-in-left 0.8s ease-out;
        }

        .animate-fade-in-right {
          animation: fade-in-right 0.8s ease-out;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out;
        }

        .animation-delay-100 {
          animation-delay: 0.1s;
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

export default CustomerWelcome;
