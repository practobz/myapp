import React, { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { QrCode, Facebook, Instagram, Linkedin, Youtube, Download, ExternalLink, AlertCircle, Loader2, User, Clock, AlertTriangle, Search, CheckCircle, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/layout/AdminLayout';

// Memoized Platform Button Component for better performance
const PlatformButton = memo(({ platform, isGenerating, loading, onGenerate }) => {
  const Icon = platform.icon;
  return (
    <button
      onClick={onGenerate}
      disabled={loading}
      className={`${platform.color} text-white px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1 sm:gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md active:scale-95 min-w-[40px] sm:min-w-[44px] justify-center touch-manipulation`}
      title={platform.label}
    >
      {isGenerating ? (
        <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
      ) : (
        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      )}
      <span className="hidden lg:inline">{platform.label}</span>
    </button>
  );
});

// Memoized Customer Card Component
const CustomerCard = memo(({ customer, activeCustomer, loading, onGenerateQr }) => {
  // Check if platform is enabled for customer
  const isPlatformEnabled = (platform) => {
    if (!customer.platformAccess) return true; // If no platformAccess, allow all
    
    // Map QR platform keys to platformAccess keys
    const platformMap = {
      'fb': 'facebook',
      'insta': 'instagram',
      'linkedin': 'linkedin',
      'yt': 'youtube'
    };
    
    const accessKey = platformMap[platform];
    return customer.platformAccess[accessKey] !== false;
  };

  return (
    <div
      className={`px-3 sm:px-4 lg:px-6 py-3 sm:py-4 transition-colors duration-150 hover:bg-[#F4F9FF] ${
        activeCustomer?.id === customer._id 
          ? 'bg-[#F4F9FF] border-l-4 border-l-[#0066CC]' 
          : ''
      }`}
    >
      <div className="flex flex-col gap-3">
        {/* Customer Info Row */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-[#00E5FF] to-[#0066CC] rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[#0F172A] truncate text-sm sm:text-base lg:text-lg">{customer.name}</h3>
            <p className="text-xs sm:text-sm text-[#475569] truncate">{customer.email}</p>
          </div>
        </div>
        
        {/* Platform Buttons Row */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {PLATFORMS.map(platform => {
            const platformEnabled = isPlatformEnabled(platform.key);
            return (
              <button
                key={platform.key}
                onClick={() => platformEnabled && onGenerateQr(customer._id, customer.name, platform.key)}
                disabled={loading || !platformEnabled}
                className={`${platformEnabled ? platform.color : 'bg-gray-400 cursor-not-allowed'} text-white px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1 sm:gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md active:scale-95 min-w-[40px] sm:min-w-[44px] justify-center touch-manipulation`}
                title={!platformEnabled ? 'Platform disabled by admin' : platform.label}
              >
                {loading && activeCustomer?.id === customer._id ? (
                  <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                ) : (
                  <>
                    <platform.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden lg:inline">{platform.label}</span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});

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
  const { currentUser } = useAuth();
  
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingCustomers, setFetchingCustomers] = useState(true);
  const [qrResult, setQrResult] = useState({});
  const [error, setError] = useState('');
  const [activeCustomer, setActiveCustomer] = useState(null);
  const [qrExpiration, setQrExpiration] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const fetchCustomers = useCallback(async () => {
    try {
      const apiBaseUrl = getApiBaseUrl();
      
      if (currentUser && currentUser.role === 'admin') {
        const response = await fetch(`${apiBaseUrl}/admin/assigned-customers?adminId=${currentUser._id || currentUser.id}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        setCustomers(data || []);
      } else {
        const response = await fetch(`${apiBaseUrl}/api/customers`);
        const data = await response.json();
        setCustomers(data.customers || []);
      }
      
      setFetchingCustomers(false);
    } catch (err) {
      console.error('Failed to load customers:', err);
      setError('Failed to load customers');
      setFetchingCustomers(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Memoized filtered customers for better performance
  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customers;
    const term = searchTerm.toLowerCase();
    return customers.filter(customer =>
      customer.name.toLowerCase().includes(term) ||
      customer.email.toLowerCase().includes(term) ||
      customer._id.toLowerCase().includes(term)
    );
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

  const handleGenerateQr = useCallback(async (customerId, customerName, platform) => {
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
        
        // ✅ FIXED: Construct QR URL with correct domain based on environment
        let qrCodeUrl = '';
        
        if (process.env.NODE_ENV === 'production') {
          // ✅ For production, always use the production domain for QR codes
          // This ensures QR codes work correctly when scanned from any device
          qrCodeUrl = `https://airspark.storage.googleapis.com/index.html#/configure?customerId=${customerId}&platform=${platform}&source=admin-qr-generator&autoConnect=1&t=${Date.now()}`;
        } else {
          // For development, use localhost
          qrCodeUrl = `http://localhost:3000/#/configure?customerId=${customerId}&platform=${platform}&source=admin-qr-generator&autoConnect=1&t=${Date.now()}`;
        }

        // ✅ For "View Configuration" link, use current window origin (admin interface)
        let viewConfigUrl = '';
        
        if (process.env.NODE_ENV === 'production') {
          // For production admin interface, use the storage bucket URL
          viewConfigUrl = `https://airspark.storage.googleapis.com/index.html#/configure?customerId=${customerId}&platform=${platform}&t=${Date.now()}`;
        } else {
          // For development, use localhost
          viewConfigUrl = `${window.location.origin}/#/configure?customerId=${customerId}&platform=${platform}&t=${Date.now()}`;
        }
        
        console.log(`🔗 QR Code URL (for scanning): ${qrCodeUrl}`);
        console.log(`🔗 View Config URL (for admin): ${viewConfigUrl}`);
        
        // Update the result with both URLs
        setQrResult({ 
          ...data, 
          configUrl: viewConfigUrl, // For "View Configuration" button
          qrCodeUrl: qrCodeUrl,     // URL that goes into the QR code
          platform, 
          customerName, 
          customerId 
        });
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
  }, []);

  const downloadQrCode = useCallback(async () => {
    if (!qrResult.qrDataUrl) return;

    try {
      // Create a professional branded QR code image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas size for professional output (A4-like ratio)
      const canvasWidth = 800;
      const canvasHeight = 900;
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
      
      // Show the actual QR URL for debugging (small text)
      if (qrResult.qrCodeUrl) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px Arial, sans-serif';
        ctx.fillText(`QR URL: ${qrResult.qrCodeUrl}`, canvasWidth / 2, footerY + 45);
      }
      
      // Website/contact info
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px Arial, sans-serif';
      ctx.fillText('www.airspark.com', canvasWidth / 2, footerY + 65);

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
  });

  const clearError = useCallback(() => setError(''), []);
  const clearSuccess = useCallback(() => setSuccessMessage(''), []);
  const clearSearch = useCallback(() => setSearchTerm(''), []);

  const getExpirationColor = useMemo(() => {
    switch (qrExpiration) {
      case 'expired': return 'text-red-700 bg-red-50 border-red-200';
      case 'warning': return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'valid': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  }, [qrExpiration]);

  const expirationIcon = useMemo(() => {
    switch (qrExpiration) {
      case 'expired': return <AlertTriangle className="w-4 h-4" />;
      case 'warning': return <AlertCircle className="w-4 h-4" />;
      case 'valid': return <CheckCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  }, [qrExpiration]);

  const getPlatformDetails = useCallback((platformKey) => {
    return PLATFORMS.find(p => p.key === platformKey) || PLATFORMS[0];
  }, []);

  const currentPlatformDetails = useMemo(() => 
    qrResult.platform ? getPlatformDetails(qrResult.platform) : null
  , [qrResult.platform, getPlatformDetails]);

  return (
    <AdminLayout title="QR Code Generator">
      <div className="space-y-3 sm:space-y-4 lg:space-y-6 px-1 sm:px-0">
        {/* Alerts Section - Compact on mobile */}
        <div className="space-y-2 sm:space-y-3">
          {/* Success Message */}
          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg sm:rounded-xl p-3 sm:p-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 flex-shrink-0" />
                <p className="text-emerald-700 text-xs sm:text-sm truncate">{successMessage}</p>
              </div>
              <button onClick={clearSuccess} className="text-emerald-600 p-1 flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg sm:rounded-xl p-3 sm:p-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0" />
                <p className="text-red-700 text-xs sm:text-sm truncate">{error}</p>
              </div>
              <button onClick={clearError} className="text-red-600 p-1 flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Expiration Warning */}
          {qrExpiration === 'expired' && (
            <div className="bg-red-50 border border-red-200 rounded-lg sm:rounded-xl p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-semibold text-red-900 text-sm">QR Code Expired</p>
                <p className="text-red-700 text-xs sm:text-sm">Please generate a new one.</p>
              </div>
            </div>
          )}
        </div>

        {/* Main Content Grid - Stack on mobile, side by side on xl */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          {/* Customers List */}
          <div className="xl:col-span-2 order-2 xl:order-1">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Header */}
              <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 border-b border-gray-100 bg-[#F4F9FF]">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-[#0F172A]">Customer Directory</h2>
                    <p className="text-xs sm:text-sm text-[#475569]">
                      {filteredCustomers.length} of {customers.length} customers
                    </p>
                  </div>

                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 sm:pl-10 pr-8 py-2 sm:py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC] transition-colors w-full sm:w-56 lg:w-64"
                    />
                    {searchTerm && (
                      <button
                        onClick={clearSearch}
                        className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Customer List */}
              <div className="divide-y divide-gray-100 max-h-[50vh] sm:max-h-[400px] lg:max-h-[500px] xl:max-h-[600px] overflow-y-auto overscroll-contain">
                {fetchingCustomers ? (
                  <div className="px-4 py-10 sm:py-16 text-center">
                    <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-[#0066CC] animate-spin mx-auto mb-3" />
                    <p className="text-[#0F172A] font-medium text-sm sm:text-base">Loading customers...</p>
                  </div>
                ) : filteredCustomers.length === 0 ? (
                  <div className="px-4 py-10 sm:py-16 text-center">
                    {searchTerm ? (
                      <>
                        <Search className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-[#0F172A] font-medium text-sm">No customers found</p>
                        <button onClick={clearSearch} className="mt-2 text-[#0066CC] text-sm font-medium">
                          Clear search
                        </button>
                      </>
                    ) : (
                      <>
                        <User className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-[#0F172A] font-medium text-sm">No customers available</p>
                      </>
                    )}
                  </div>
                ) : (
                  filteredCustomers.map(customer => (
                    <CustomerCard
                      key={customer._id}
                      customer={customer}
                      activeCustomer={activeCustomer}
                      loading={loading}
                      onGenerateQr={handleGenerateQr}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* QR Code Preview - Shows first on mobile when QR is generated */}
          <div className="xl:col-span-1 order-1 xl:order-2">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 xl:sticky xl:top-4 overflow-hidden">
              {/* Header */}
              <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 border-b border-gray-100 bg-[#F4F9FF]">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-[#0F172A]">QR Preview</h2>
                    {qrResult.validForHours && (
                      <p className="text-xs sm:text-sm text-[#475569]">Valid for {qrResult.validForHours}h</p>
                    )}
                  </div>
                  {currentPlatformDetails && (
                    <div className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-medium ${currentPlatformDetails.lightColor}`}>
                      {currentPlatformDetails.label}
                    </div>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="p-3 sm:p-4 lg:p-6">
                {loading ? (
                  <div className="text-center py-8 sm:py-12">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#F4F9FF] rounded-full mx-auto mb-3 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-[#0066CC] animate-spin" />
                    </div>
                    <p className="text-[#0F172A] font-semibold text-sm sm:text-base">Generating...</p>
                    {activeCustomer && (
                      <p className="text-xs sm:text-sm text-[#475569] mt-1">{activeCustomer.name}</p>
                    )}
                  </div>
                ) : qrResult.qrDataUrl ? (
                  <div className="space-y-3 sm:space-y-4">
                    {/* Expiration Status */}
                    {timeRemaining && (
                      <div className={`border rounded-lg sm:rounded-xl p-2.5 sm:p-3 flex items-center gap-2 sm:gap-3 ${getExpirationColor}`}>
                        <div className="flex-shrink-0">{expirationIcon}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-xs sm:text-sm">
                            {qrExpiration === 'expired' ? 'Expired' : 
                             qrExpiration === 'warning' ? 'Expiring Soon' : 'Active'}
                          </p>
                          <p className="text-xs truncate">
                            {qrExpiration === 'expired' ? 'Generate new' : timeRemaining}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* QR Code Display - Compact on mobile */}
                    <div className="bg-[#F4F9FF] rounded-lg sm:rounded-xl p-4 sm:p-6 lg:p-8 flex items-center justify-center relative">
                      <img
                        src={qrResult.qrDataUrl}
                        alt="QR Code"
                        className={`w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 rounded-lg sm:rounded-xl shadow-lg bg-white p-2 sm:p-3 ${
                          qrExpiration === 'expired' ? 'opacity-40 grayscale' : ''
                        }`}
                      />
                      {qrExpiration === 'expired' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-red-500 text-white px-2 py-1 rounded text-xs sm:text-sm font-semibold">
                            EXPIRED
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Compact Info Grid on Mobile */}
                    <div className="grid grid-cols-2 gap-2 sm:hidden">
                      <div className="bg-[#F4F9FF] rounded-lg p-2.5">
                        <p className="text-xs text-[#475569]">Customer</p>
                        <p className="font-semibold text-[#0F172A] text-sm truncate">{qrResult.customerName}</p>
                      </div>
                      <div className="bg-[#F4F9FF] rounded-lg p-2.5">
                        <p className="text-xs text-[#475569]">Platform</p>
                        <p className="font-semibold text-[#0F172A] text-sm capitalize">{currentPlatformDetails?.label}</p>
                      </div>
                    </div>

                    {/* Full Info Cards - Hidden on mobile, shown on tablet+ */}
                    <div className="hidden sm:block space-y-3">
                      <div className="bg-[#F4F9FF] rounded-xl p-3 lg:p-4">
                        <div className="flex items-center gap-2 mb-1.5">
                          <User className="w-4 h-4 text-[#0066CC]" />
                          <p className="text-xs font-semibold text-[#0F172A] uppercase">Customer</p>
                        </div>
                        <p className="font-bold text-[#0F172A] text-base lg:text-lg">{qrResult.customerName}</p>
                        <p className="text-xs text-[#475569] font-mono bg-white px-2 py-1 rounded mt-1 truncate">
                          {qrResult.customerId}
                        </p>
                      </div>

                      <div className="bg-[#F4F9FF] rounded-xl p-3 lg:p-4">
                        <div className="flex items-center gap-2 mb-1.5">
                          {currentPlatformDetails && React.createElement(currentPlatformDetails.icon, { 
                            className: "w-4 h-4 text-[#0066CC]" 
                          })}
                          <p className="text-xs font-semibold text-[#0F172A] uppercase">Platform</p>
                        </div>
                        <p className="font-bold text-[#0F172A] capitalize">{currentPlatformDetails?.label}</p>
                      </div>

                      <div className="bg-[#F4F9FF] rounded-xl p-3 lg:p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4 text-[#0066CC]" />
                          <p className="text-xs font-semibold text-[#0F172A] uppercase">Expiration</p>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-[#475569]">Expires:</span>
                            <span className="font-semibold text-[#0F172A] text-xs">
                              {qrResult.expiresAt ? new Date(qrResult.expiresAt).toLocaleString() : 'Not set'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {qrResult.configUrl && (
                        <a
                          href={qrResult.configUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 p-3 bg-[#F4F9FF] rounded-xl text-[#0066CC] hover:bg-blue-100 transition-colors text-sm font-medium"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>View Configuration</span>
                        </a>
                      )}
                    </div>

                    {/* Download Button */}
                    <button
                      onClick={downloadQrCode}
                      disabled={qrExpiration === 'expired'}
                      className={`w-full px-4 py-3 sm:py-4 rounded-lg sm:rounded-xl font-semibold transition-all flex items-center justify-center gap-2 sm:gap-3 shadow-sm active:scale-95 touch-manipulation ${
                        qrExpiration === 'expired' 
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                          : 'bg-gradient-to-r from-[#00E5FF] to-[#0066CC] text-white'
                      }`}
                    >
                      <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="text-sm sm:text-base">{qrExpiration === 'expired' ? 'Expired' : 'Download QR'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8 sm:py-12 lg:py-16">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-[#F4F9FF] rounded-full mx-auto mb-4 flex items-center justify-center">
                      <QrCode className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-[#0066CC]" />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-[#0F172A] mb-1 sm:mb-2">Ready to Generate</h3>
                    <p className="text-[#475569] text-xs sm:text-sm mb-3 sm:mb-4">Select a customer and platform</p>
                    <div className="flex justify-center gap-1.5 sm:gap-2">
                      {PLATFORMS.map(platform => {
                        const Icon = platform.icon;
                        return (
                          <div key={platform.key} className="w-7 h-7 sm:w-8 sm:h-8 bg-[#F4F9FF] rounded-lg flex items-center justify-center">
                            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0066CC]" />
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
    </AdminLayout>
  );
}
