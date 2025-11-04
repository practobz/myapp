import React, { useEffect, useState } from 'react';
import { QrCode, Facebook, Instagram, Linkedin, Youtube, Download, ExternalLink, AlertCircle, Loader2, User, Clock, AlertTriangle, Search, Filter, CheckCircle, X, BarChart3, Users } from 'lucide-react';

const PLATFORMS = [
  { key: 'fb', label: 'Facebook', icon: Facebook, color: 'bg-blue-600 hover:bg-blue-700', lightColor: 'bg-blue-50 text-blue-700' },
  { key: 'insta', label: 'Instagram', icon: Instagram, color: 'bg-pink-600 hover:bg-pink-700', lightColor: 'bg-pink-50 text-pink-700' },
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'bg-blue-700 hover:bg-blue-800', lightColor: 'bg-blue-50 text-blue-800' },
  { key: 'yt', label: 'YouTube', icon: Youtube, color: 'bg-red-600 hover:bg-red-700', lightColor: 'bg-red-50 text-red-700' }
];

// ✅ Fixed API base URL for deployment
const getApiBaseUrl = () => {
  // For production deployment, use the correct backend URL
  if (process.env.NODE_ENV === 'production') {
    return 'https://my-backend-593529385135.asia-south1.run.app';
  }
  
  // For local development, use environment variable or fallback
  return process.env.REACT_APP_API_URL || 'http://localhost:3001';
};

export default function AdminQrGenerator() {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingCustomers, setFetchingCustomers] = useState(true);
  const [qrResult, setQrResult] = useState({});
  const [error, setError] = useState('');
  const [activeCustomer, setActiveCustomer] = useState(null);
  const [qrExpiration, setQrExpiration] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const apiBaseUrl = getApiBaseUrl();
    fetch(`${apiBaseUrl}/api/customers`)
      .then(res => res.json())
      .then(data => {
        setCustomers(data.customers || []);
        setFilteredCustomers(data.customers || []);
        setFetchingCustomers(false);
      })
      .catch(() => {
        setError('Failed to load customers');
        setFetchingCustomers(false);
      });
  }, []);

  // Search and filter functionality
  useEffect(() => {
    const filtered = customers.filter(customer =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer._id.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCustomers(filtered);
  }, [searchTerm, customers]);

  // ✅ Add countdown timer for QR expiration
  useEffect(() => {
    if (qrResult.expiresAt) {
      const timer = setInterval(() => {
        const now = new Date().getTime();
        const expiry = new Date(qrResult.expiresAt).getTime();
        const remaining = expiry - now;

        if (remaining <= 0) {
          setTimeRemaining('Expired');
          setQrExpiration('expired');
          clearInterval(timer);
        } else {
          const hours = Math.floor(remaining / (1000 * 60 * 60));
          const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
          
          setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
          
          // Warn when less than 30 minutes remaining
          if (remaining < 30 * 60 * 1000) {
            setQrExpiration('warning');
          } else {
            setQrExpiration('valid');
          }
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [qrResult.expiresAt]);

  const handleGenerateQr = async (customerId, customerName, platform) => {
    setLoading(true);
    setError('');
    setSuccessMessage('');
    setQrResult({});
    setActiveCustomer({ id: customerId, name: customerName });
    setQrExpiration(null);
    setTimeRemaining(null);

    try {
      // SECURITY: Validate customer ID format
      if (!customerId || typeof customerId !== 'string' || customerId.length < 5) {
        setError('Invalid customer ID format');
        setLoading(false);
        return;
      }

      // SECURITY: Validate platform
      const validPlatforms = ['fb', 'insta', 'linkedin', 'yt'];
      if (!validPlatforms.includes(platform)) {
        setError('Invalid platform specified');
        setLoading(false);
        return;
      }

      console.log(`🔒 Generating QR for customer: ${customerId} (${customerName}) - Platform: ${platform}`);

      const apiBaseUrl = getApiBaseUrl();
      const res = await fetch(`${apiBaseUrl}/api/generate-qr`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          customerId, 
          platform,
          customerName,
          source: 'admin-qr-generator'
        })
      });
      const data = await res.json();

      if (res.ok) {
        // VALIDATION: Ensure the response includes the correct customer ID
        if (data.customerId !== customerId) {
          setError('QR generation security validation failed');
          setLoading(false);
          return;
        }

        console.log(`✅ QR generated successfully for customer: ${customerId}`);
        
        // ✅ Fix configUrl to use correct frontend domain
        let normalizedConfigUrl = data.configUrl || '';
        if (normalizedConfigUrl) {
          try {
            const parsed = new URL(normalizedConfigUrl);
            
            // Always use the current frontend's origin for the configUrl
            // This handles both localhost (dev) and production domains
            normalizedConfigUrl = `${window.location.origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
            
            console.log(`🔗 Normalized configUrl: ${normalizedConfigUrl}`);
          } catch (e) {
            // If URL parsing fails, construct a fallback URL
            console.warn('Failed to parse configUrl, creating fallback:', e);
            normalizedConfigUrl = `${window.location.origin}/#/configure?customerid=${customerId}&platform=${platform}`;
          }
        }
        
        setQrResult({ ...data, configUrl: normalizedConfigUrl, platform, customerName, customerId });
        setQrExpiration('valid');
        setError('');
        setSuccessMessage(`QR code generated successfully for ${customerName}!`);
        
        // Auto-hide success message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(data.error || 'Failed to generate QR code');
      }
    } catch (err) {
      console.error('QR generation error:', err);
      setError('Network error occurred. Please try again.');
    }
    setLoading(false);
  };

  const downloadQrCode = async () => {
    if (!qrResult.qrDataUrl) return;

    try {
      // Create a professional branded QR code image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas size for professional output (A4-like ratio)
      const canvasWidth = 800;
      const canvasHeight = 900; // Reduced height since we removed expiration section
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // Background with gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
      gradient.addColorStop(0, '#f8fafc');
      gradient.addColorStop(1, '#e2e8f0');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Load and draw the logo
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      
      const qrImg = new Image();
      qrImg.crossOrigin = 'anonymous';

      // Promise-based image loading
      const loadImage = (img, src) => {
        return new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = src;
        });
      };

      await Promise.all([
        loadImage(logoImg, '/logoAirspark.png'),
        loadImage(qrImg, qrResult.qrDataUrl)
      ]);

      // Header section with logo and branding
      const headerHeight = 120;
      
      // Header background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasWidth, headerHeight);
      
      // Add subtle shadow under header
      const shadowGradient = ctx.createLinearGradient(0, headerHeight, 0, headerHeight + 20);
      shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.1)');
      shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = shadowGradient;
      ctx.fillRect(0, headerHeight, canvasWidth, 20);

      // Draw logo (scaled appropriately)
      const logoHeight = 60;
      const logoWidth = (logoImg.width / logoImg.height) * logoHeight;
      const logoX = 40;
      const logoY = (headerHeight - logoHeight) / 2;
      ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);

      // Company name and tagline
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 28px Arial, sans-serif';
      ctx.textAlign = 'left';
      const titleX = logoX + logoWidth + 20;
      ctx.fillText('AirSpark', titleX, logoY + 25);
      
      ctx.fillStyle = '#64748b';
      ctx.font = '16px Arial, sans-serif';
      ctx.fillText('Social Media QR Code', titleX, logoY + 45);

      // Date and time
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px Arial, sans-serif';
      ctx.textAlign = 'right';
      const currentDate = new Date().toLocaleString();
      ctx.fillText(`Generated: ${currentDate}`, canvasWidth - 40, 30);

      // Main content area
      const contentY = headerHeight + 60;
      
      // Customer information card
      const cardX = 60;
      const cardY = contentY;
      const cardWidth = canvasWidth - 120;
      const cardHeight = 120;
      
      // Card background with rounded corners effect
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;
      ctx.fillRect(cardX, cardY, cardWidth, cardHeight);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Customer information
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 24px Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Customer Information', cardX + 30, cardY + 35);
      
      ctx.fillStyle = '#374151';
      ctx.font = '18px Arial, sans-serif';
      ctx.fillText(`Name: ${qrResult.customerName}`, cardX + 30, cardY + 65);
      
      ctx.fillStyle = '#6b7280';
      ctx.font = '14px Arial, sans-serif';
      ctx.fillText(`Customer ID: ${qrResult.customerId}`, cardX + 30, cardY + 90);

      // Platform information
      const platformDetails = getPlatformDetails(qrResult.platform);
      ctx.fillStyle = '#4f46e5';
      ctx.font = 'bold 16px Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`Platform: ${platformDetails.label}`, cardX + cardWidth - 30, cardY + 65);

      // QR Code section
      const qrSectionY = cardY + cardHeight + 40;
      const qrSize = 300;
      const qrX = (canvasWidth - qrSize) / 2;
      
      // QR Code background with border
      const qrPadding = 20;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
      ctx.shadowBlur = 15;
      ctx.shadowOffsetY = 8;
      ctx.fillRect(qrX - qrPadding, qrSectionY - qrPadding, qrSize + (qrPadding * 2), qrSize + (qrPadding * 2));
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Draw QR code
      ctx.drawImage(qrImg, qrX, qrSectionY, qrSize, qrSize);

      // QR Code title
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 20px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Scan QR Code', canvasWidth / 2, qrSectionY - 40);

      // Footer with instructions (moved up since we removed expiration section)
      const footerY = qrSectionY + qrSize + 80;
      ctx.fillStyle = '#64748b';
      ctx.font = '14px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Scan this QR code with your mobile device camera', canvasWidth / 2, footerY);
      ctx.fillText('to access your social media configuration', canvasWidth / 2, footerY + 20);
      
      // Website/contact info
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px Arial, sans-serif';
      ctx.fillText('www.airspark.com', canvasWidth / 2, footerY + 50);

      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `AirSpark-QR-${qrResult.customerName}-${qrResult.platform}-${new Date().toISOString().split('T')[0]}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 'image/png', 1.0);

    } catch (error) {
      console.error('Error creating professional QR code:', error);
      // Fallback to simple download
      const link = document.createElement('a');
      link.href = qrResult.qrDataUrl;
      link.download = `${qrResult.customerName}-${qrResult.platform}-qr.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const clearError = () => setError('');
  const clearSuccess = () => setSuccessMessage('');

  const getExpirationColor = () => {
    switch (qrExpiration) {
      case 'expired': return 'text-red-700 bg-red-50 border-red-200';
      case 'warning': return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'valid': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const getExpirationIcon = () => {
    switch (qrExpiration) {
      case 'expired': return <AlertTriangle className="w-4 h-4" />;
      case 'warning': return <AlertCircle className="w-4 h-4" />;
      case 'valid': return <CheckCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getPlatformDetails = (platformKey) => {
    return PLATFORMS.find(p => p.key === platformKey) || PLATFORMS[0];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Professional Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <nav className="flex items-center space-x-2 text-sm text-slate-500 mb-3">
                <span>Admin</span>
                <span>/</span>
                <span className="font-medium text-slate-900">QR Generator</span>
              </nav>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                    <QrCode className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-slate-900">QR Code Generator</h1>
                    <p className="text-slate-600">Generate and manage social media QR codes for customers</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="hidden lg:flex gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 min-w-[120px]">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{customers.length}</p>
                    <p className="text-xs text-slate-600">Total Customers</p>
                  </div>
                </div>
              </div>
              {qrResult.qrDataUrl && (
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 min-w-[120px]">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="text-2xl font-bold text-slate-900">1</p>
                      <p className="text-xs text-slate-600">QR Generated</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-semibold text-emerald-900">Success!</h3>
                  <p className="text-emerald-700 text-sm">{successMessage}</p>
                </div>
              </div>
              <button
                onClick={clearSuccess}
                className="text-emerald-600 hover:text-emerald-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <div>
                  <h3 className="font-semibold text-red-900">Error</h3>
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
              <button
                onClick={clearError}
                className="text-red-600 hover:text-red-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Expiration Warning */}
          {qrExpiration === 'expired' && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">QR Code Expired</h3>
                <p className="text-red-700 text-sm">The current QR code has expired. Please generate a new one to continue.</p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Enhanced Customers List */}
          <div className="xl:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Customer Directory</h2>
                    <p className="text-sm text-slate-600 mt-1">
                      {filteredCustomers.length} of {customers.length} customers
                    </p>
                  </div>

                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search customers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors w-full sm:w-64"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                {fetchingCustomers ? (
                  <div className="px-6 py-16 text-center">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
                    <p className="text-slate-600 font-medium">Loading customers...</p>
                    <p className="text-sm text-slate-500 mt-1">Please wait a moment</p>
                  </div>
                ) : filteredCustomers.length === 0 ? (
                  <div className="px-6 py-16 text-center">
                    {searchTerm ? (
                      <>
                        <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-600 font-medium">No customers found</p>
                        <p className="text-sm text-slate-500 mt-1">Try adjusting your search terms</p>
                        <button
                          onClick={() => setSearchTerm('')}
                          className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Clear search
                        </button>
                      </>
                    ) : (
                      <>
                        <User className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-600 font-medium">No customers available</p>
                        <p className="text-sm text-slate-500 mt-1">Customers will appear here once added</p>
                      </>
                    )}
                  </div>
                ) : (
                  filteredCustomers.map(customer => (
                    <div
                      key={customer._id}
                      className={`px-6 py-5 transition-all duration-200 hover:bg-slate-50 ${
                        activeCustomer?.id === customer._id 
                          ? 'bg-blue-50 border-l-4 border-l-blue-500' 
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-slate-200 to-slate-300 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-slate-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-slate-900 truncate text-lg">{customer.name}</h3>
                              <p className="text-sm text-slate-600 truncate">{customer.email}</p>
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-1 rounded inline-block">
                            ID: {customer._id}
                          </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                          {PLATFORMS.map(platform => {
                            const Icon = platform.icon;
                            const isGenerating = loading && activeCustomer?.id === customer._id;
                            return (
                              <button
                                key={platform.key}
                                onClick={() => handleGenerateQr(customer._id, customer.name, platform.key)}
                                disabled={loading}
                                className={`${platform.color} text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md hover:scale-105 min-w-[44px] justify-center`}
                                title={`Generate ${platform.label} QR for ${customer.name}`}
                              >
                                {isGenerating ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Icon className="w-4 h-4" />
                                )}
                                <span className="hidden md:inline">{platform.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))
)}
              </div>
            </div>
          </div>

          {/* Enhanced QR Code Preview */}
          <div className="xl:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 sticky top-8 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">QR Code Preview</h2>
                    {qrResult.validForHours && (
                      <p className="text-sm text-slate-600 mt-1">Valid for {qrResult.validForHours} hours</p>
                    )}
                  </div>
                  {qrResult.platform && (
                    <div className={`px-3 py-1.5 rounded-lg text-xs font-medium ${getPlatformDetails(qrResult.platform).lightColor}`}>
                      {getPlatformDetails(qrResult.platform).label}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="relative">
                      <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                      </div>
                    </div>
                    <p className="text-slate-700 font-semibold mb-1">Generating QR Code</p>
                    <p className="text-sm text-slate-500">Creating secure QR code...</p>
                    {activeCustomer && (
                      <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                        <p className="text-sm font-medium text-slate-700">{activeCustomer.name}</p>
                      </div>
                    )}
                  </div>
                ) : qrResult.qrDataUrl ? (
                  <div className="space-y-6">
                    {/* Enhanced Expiration Status */}
                    {timeRemaining && (
                      <div className={`border rounded-xl p-4 flex items-center gap-3 ${getExpirationColor()}`}>
                        <div className="flex-shrink-0">
                          {getExpirationIcon()}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">
                            {qrExpiration === 'expired' ? 'QR Code Expired' : 
                             qrExpiration === 'warning' ? 'Expiring Soon' : 'QR Code Active'}
                          </p>
                          <p className="text-xs mt-1">
                            {qrExpiration === 'expired' 
                              ? 'This QR code is no longer valid. Generate a new one.' 
                              : `Time remaining: ${timeRemaining}`}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* QR Code Display */}
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-8 flex items-center justify-center relative">
                      <img
                        src={qrResult.qrDataUrl}
                        alt="Generated QR Code"
                        className={`w-full max-w-[200px] h-auto rounded-xl shadow-lg bg-white p-3 transition-all duration-300 ${
                          qrExpiration === 'expired' ? 'opacity-40 grayscale' : 'hover:scale-105'
                        }`}
                      />
                      {qrExpiration === 'expired' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm font-semibold">
                            EXPIRED
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Customer Information */}
                    <div className="space-y-4">
                      <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <User className="w-5 h-5 text-slate-600" />
                          <p className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Customer Details</p>
                        </div>
                        <div className="space-y-2">
                          <p className="font-bold text-slate-900 text-lg">{qrResult.customerName}</p>
                          <p className="text-sm text-slate-600 font-mono bg-white px-2 py-1 rounded">
                            {qrResult.customerId}
                          </p>
                        </div>
                      </div>

                      {/* Platform Information */}
                      <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-2">
                          {React.createElement(getPlatformDetails(qrResult.platform).icon, { 
                            className: "w-5 h-5 text-slate-600" 
                          })}
                          <p className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Platform</p>
                        </div>
                        <p className="font-bold text-slate-900 capitalize">{getPlatformDetails(qrResult.platform).label}</p>
                      </div>

                      {/* Enhanced Expiration Details */}
                      <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <Clock className="w-5 h-5 text-slate-600" />
                          <p className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Expiration Details</p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">Expires:</span>
                            <span className="font-semibold text-slate-900 text-sm">
                              {qrResult.expiresAt ? new Date(qrResult.expiresAt).toLocaleString() : 'Not set'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">Generated:</span>
                            <span className="text-sm text-slate-700">
                              {qrResult.generatedAt ? new Date(qrResult.generatedAt).toLocaleString() : 'Unknown'}
                            </span>
                          </div>
                          {qrResult.validForHours && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-slate-600">Duration:</span>
                              <span className="text-sm text-slate-700">{qrResult.validForHours} hours</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Config URL */}
                      {qrResult.configUrl && (
                        <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-4">
                          <div className="flex items-center gap-3 mb-2">
                            <ExternalLink className="w-5 h-5 text-slate-600" />
                            <p className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Configuration</p>
                          </div>
                          <a
                            href={qrResult.configUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-2 p-2 bg-white rounded-lg hover:bg-blue-50 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate font-medium">View Configuration</span>
                          </a>
                        </div>
                      )}

                      {/* Download Button */}
                      <button
                        onClick={downloadQrCode}
                        disabled={qrExpiration === 'expired'}
                        className={`w-full px-6 py-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-3 shadow-sm hover:shadow-md transform hover:scale-105 ${
                          qrExpiration === 'expired' 
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed hover:scale-100' 
                            : 'bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black text-white'
                        }`}
                      >
                        <Download className="w-5 h-5" />
                        {qrExpiration === 'expired' ? 'QR Code Expired' : 'Download QR Code'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-slate-100 rounded-full mx-auto mb-6 flex items-center justify-center">
                      <QrCode className="w-10 h-10 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">Ready to Generate</h3>
                    <p className="text-slate-500 text-sm mb-4">Select a customer and platform to create a QR code</p>
                    <div className="flex justify-center gap-2">
                      {PLATFORMS.map(platform => {
                        const Icon = platform.icon;
                        return (
                          <div key={platform.key} className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                            <Icon className="w-4 h-4 text-slate-400" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
