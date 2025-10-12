import React, { useEffect, useState } from 'react';
import {
  QrCode,
  Facebook,
  Instagram,
  Linkedin,
  Youtube,
  Download,
  ExternalLink,
  AlertCircle,
  Loader2,
  User
} from 'lucide-react';

// Define supported platforms
const PLATFORMS = [
  { key: 'fb', label: 'Facebook', icon: Facebook, color: 'bg-blue-600 hover:bg-blue-700' },
  { key: 'insta', label: 'Instagram', icon: Instagram, color: 'bg-pink-600 hover:bg-pink-700' },
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'bg-blue-700 hover:bg-blue-800' },
  { key: 'yt', label: 'YouTube', icon: Youtube, color: 'bg-red-600 hover:bg-red-700' }
];

// ✅ Hardcoded backend API base URL
const API_BASE = "https://my-backend-593529385135.asia-south1.run.app";

export default function AdminQrGenerator() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingCustomers, setFetchingCustomers] = useState(true);
  const [qrResult, setQrResult] = useState({});
  const [error, setError] = useState('');
  const [activeCustomer, setActiveCustomer] = useState(null);

  // ✅ Fetch customers from backend
  useEffect(() => {
    fetch(`${API_BASE}/api/customers`)
      .then(res => res.json())
      .then(data => {
        setCustomers(data.customers || []);
        setFetchingCustomers(false);
      })
      .catch(() => {
        setError('Failed to load customers');
        setFetchingCustomers(false);
      });
  }, []);

  // ✅ Generate QR code
  const handleGenerateQr = async (customerId, customerName, platform) => {
    setLoading(true);
    setError('');
    setQrResult({});
    setActiveCustomer({ id: customerId, name: customerName });

    try {
      const res = await fetch(`${API_BASE}/api/generate-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, platform })
      });

      const data = await res.json();

      if (res.ok) {
        setQrResult({ ...data, platform, customerName });
        setError('');
      } else {
        setError(data.error || 'Failed to generate QR code');
      }
    } catch (err) {
      setError('Network error occurred. Please try again.');
    }

    setLoading(false);
  };

  // ✅ Download QR code as image
  const downloadQrCode = () => {
    if (!qrResult.qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrResult.qrDataUrl;
    link.download = `${qrResult.customerName}-${qrResult.platform}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ✅ JSX Layout
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-blue-600 rounded-lg">
              <QrCode className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">QR Code Generator</h1>
              <p className="text-slate-600 mt-1">Generate social media QR codes for customers</p>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Error</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Customers List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">Customers</h2>
                <p className="text-sm text-slate-600 mt-1">Select a platform to generate QR code</p>
              </div>

              <div className="divide-y divide-slate-200">
                {fetchingCustomers ? (
                  <div className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
                    <p className="text-slate-600">Loading customers...</p>
                  </div>
                ) : customers.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600">No customers found</p>
                  </div>
                ) : (
                  customers.map(customer => (
                    <div
                      key={customer._id}
                      className={`px-6 py-5 transition-colors ${
                        activeCustomer?.id === customer._id ? 'bg-blue-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 truncate">{customer.name}</h3>
                          <p className="text-sm text-slate-600 truncate mt-0.5">{customer.email}</p>
                        </div>

                        <div className="flex flex-wrap gap-2 justify-end">
                          {PLATFORMS.map(platform => {
                            const Icon = platform.icon;
                            return (
                              <button
                                key={platform.key}
                                onClick={() => handleGenerateQr(customer._id, customer.name, platform.key)}
                                disabled={loading}
                                className={`${platform.color} text-white px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md`}
                                title={`Generate ${platform.label} QR`}
                              >
                                <Icon className="w-4 h-4" />
                                <span className="hidden sm:inline">{platform.label}</span>
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

          {/* QR Code Preview */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 sticky top-8">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">Generated QR Code</h2>
              </div>

              <div className="p-6">
                {loading ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-3" />
                    <p className="text-slate-600 font-medium">Generating QR code...</p>
                    <p className="text-sm text-slate-500 mt-1">Please wait</p>
                  </div>
                ) : qrResult.qrDataUrl ? (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-6 flex items-center justify-center">
                      <img
                        src={qrResult.qrDataUrl}
                        alt="QR Code"
                        className="w-full max-w-[240px] h-auto rounded-lg shadow-md bg-white p-2"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="bg-slate-50 rounded-lg p-4">
                        <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Customer</p>
                        <p className="text-sm font-semibold text-slate-900">{qrResult.customerName}</p>
                      </div>

                      <div className="bg-slate-50 rounded-lg p-4">
                        <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Platform</p>
                        <p className="text-sm font-semibold text-slate-900 capitalize">{qrResult.platform}</p>
                      </div>

                      {qrResult.configUrl && (
                        <div className="bg-slate-50 rounded-lg p-4">
                          <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-2">Config URL</p>
                          <a
                            href={qrResult.configUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-2 break-all"
                          >
                            <ExternalLink className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{qrResult.configUrl}</span>
                          </a>
                        </div>
                      )}

                      <button
                        onClick={downloadQrCode}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                      >
                        <Download className="w-5 h-5" />
                        Download QR Code
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <QrCode className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium">No QR code generated</p>
                    <p className="text-sm text-slate-500 mt-1">Click a platform button to generate</p>
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
