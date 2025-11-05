import React, { useEffect, useState, useRef } from 'react';
import SocialIntegrations from '../customer/Integration/SocialIntegrations';
import { ExternalLink, AlertCircle, CheckCircle, Clock } from 'lucide-react';

const QR_EXPIRATION_TIME = 2 * 60 * 60 * 1000; // match backend (2 hours)

// Robust query parser: prefer explicit search params, fall back to hash query.
const parseQuery = () => {
  // 1) If the URL contains search params (?a=1&b=2), use them
  if (window.location.search && window.location.search.length > 1) {
    try {
      return new URLSearchParams(window.location.search);
    } catch (e) { /* fall through */ }
  }

  // 2) Otherwise, check the hash fragment for query params (#/path?x=1)
  const hash = window.location.hash || '';
  const idx = hash.indexOf('?');
  if (idx !== -1) {
    try {
      return new URLSearchParams(hash.substring(idx + 1));
    } catch (e) { /* fall through */ }
  }

  // 3) Empty params if none found
  return new URLSearchParams();
};

export default function Configure() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [platformKey, setPlatformKey] = useState('');
  const [autoConnect, setAutoConnect] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);

  // NEW: awaiting user gesture to allow opening popup
  const [awaitingUserGesture, setAwaitingUserGesture] = useState(false);

  const socialRef = useRef(null);

  useEffect(() => {
    const params = parseQuery();
    const customerId = params.get('customerId') || '';
    const platform = params.get('platform') || '';
    const auto = params.get('autoConnect') || params.get('auto') || '';
    const timestamp = params.get('t');

    if (!customerId || !platform) {
      setError('Missing customerId or platform in URL.');
      setLoading(false);
      return;
    }

    setPlatformKey(platform);
    setAutoConnect(auto === '1' || auto === 'true');

    // Use a local timer id and do NOT return early so fetchCustomer runs
    let tId = null;

    if (timestamp) {
      const linkGeneratedAt = parseInt(timestamp, 10);
      if (!isNaN(linkGeneratedAt)) {
        const now = Date.now();
        const age = now - linkGeneratedAt;
        if (age > QR_EXPIRATION_TIME) {
          setExpired(true);
          setLoading(false);
          return;
        }

        // start countdown
        const updateRemaining = () => {
          const rem = linkGeneratedAt + QR_EXPIRATION_TIME - Date.now();
          if (rem <= 0) {
            setTimeRemaining('Expired');
            setExpired(true);
            return;
          }
          const h = Math.floor(rem / (1000 * 60 * 60));
          const m = Math.floor((rem % (1000 * 60 * 60)) / (1000 * 60));
          const s = Math.floor((rem % (1000 * 60)) / 1000);
          setTimeRemaining(`${h}h ${m}m ${s}s`);
        };
        updateRemaining();
        tId = setInterval(updateRemaining, 1000);
      }
    }

    // fetch customer info (try multiple endpoints with fallbacks)
    const fetchCustomer = async () => {
      try {
        setLoading(true);
        setError('');

        // ✅ Use production-aware API endpoints
        const tryFetchJson = async (url, opts = {}) => {
          try {
            const res = await fetch(url, opts);
            if (!res.ok) {
              let txt;
              try { txt = await res.text(); } catch (e) { txt = String(e); }
              console.warn('Request failed', url, res.status, txt);
              return { ok: false, status: res.status, bodyText: txt, json: null };
            }
            const json = await res.json();
            return { ok: true, status: res.status, json };
          } catch (err) {
            console.warn('Network fetch error for', url, err.message);
            return null;
          }
        };

        // ✅ Try production backend first if in production
        if (process.env.NODE_ENV === 'production') {
          const productionById = `https://my-backend-593529385135.asia-south1.run.app/api/customers/${encodeURIComponent(customerId)}`;
          const attemptProductionById = await tryFetchJson(productionById);
          if (attemptProductionById && attemptProductionById.ok) {
            const fetched = attemptProductionById.json.customer || attemptProductionById.json;
            setCustomer(fetched);
            setLoading(false);
            return;
          }
        }

        // Try relative endpoint (works when backend is proxied by frontend dev server)
        const relativeById = `/api/customers/${encodeURIComponent(customerId)}`;
        const attemptRelativeById = await tryFetchJson(relativeById);
        if (attemptRelativeById && attemptRelativeById.ok) {
          const fetched = attemptRelativeById.json.customer || attemptRelativeById.json;
          setCustomer(fetched);
          setLoading(false);
          return;
        }

        // Try configured API base (if different origin)
        const apiBase = process.env.REACT_APP_API_URL;
        if (apiBase) {
          const remoteById = `${apiBase.replace(/\/$/, '')}/api/customers/${encodeURIComponent(customerId)}`;
          const attemptRemoteById = await tryFetchJson(remoteById);
          if (attemptRemoteById && attemptRemoteById.ok) {
            const fetched = attemptRemoteById.json.customer || attemptRemoteById.json;
            setCustomer(fetched);
            setLoading(false);
            return;
          }
        }

        // ✅ Fallback: try listing endpoints
        const endpoints = [];
        if (process.env.NODE_ENV === 'production') {
          endpoints.push(`https://my-backend-593529385135.asia-south1.run.app/api/customers`);
        }
        endpoints.push(`/api/customers`);
        if (apiBase) {
          endpoints.push(`${apiBase.replace(/\/$/, '')}/api/customers`);
        }

        for (const listUrl of endpoints) {
          const attemptList = await tryFetchJson(listUrl);
          if (attemptList && attemptList.ok) {
            const list = attemptList.json.customers || attemptList.json;
            const found = Array.isArray(list) ? list.find(c => String(c._id) === String(customerId) || String(c.id) === String(customerId)) : null;
            if (found) {
              setCustomer(found);
              setLoading(false);
              return;
            }
          }
        }

        setError('Customer not found. Please verify the QR was generated for an existing customer or that the API is reachable.');
      } catch (err) {
        setError('Network error while fetching customer.');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();

    // cleanup interval on unmount
    return () => {
      if (tId) clearInterval(tId);
    };
  }, []); // run once on mount

  // REPLACE previous auto-trigger effect with user-gesture flow:
  useEffect(() => {
    // If autoConnect was requested, wait for customer & platform to be loaded,
    // then show a prompt so the user can tap a button (real user gesture)
    if (!autoConnect || !customer || !platformKey) return;

    // show prompt that requires a tap (user gesture) to open auth popup
    setAwaitingUserGesture(true);

    // focus the button shortly after render so mobile users can tap faster
    const t = setTimeout(() => {
      const btn = document.getElementById('auto-connect-btn');
      if (btn) btn.focus();
    }, 300);

    return () => clearTimeout(t);
  }, [autoConnect, customer, platformKey]);

  // ✅ Improved auto-connect handler
  const handleAutoConnect = () => {
    setAwaitingUserGesture(false);
    
    // Clear any existing errors
    setError('');
    
    // Try multiple approaches to trigger connection
    setTimeout(() => {
      try {
        // Method 1: Try the ref's triggerConnect method
        if (socialRef.current && typeof socialRef.current.triggerConnect === 'function') {
          console.log('🔗 Using ref triggerConnect method');
          socialRef.current.triggerConnect();
          return;
        }

        // Method 2: Try to find and click the connect button directly
        const connectBtn = document.querySelector('button[disabled="false"]:not([id="auto-connect-btn"])');
        if (connectBtn && connectBtn.textContent.includes('Connect')) {
          console.log('🔗 Using direct button click');
          connectBtn.click();
          return;
        }

        // Method 3: Find platform-specific buttons
        const platformButtons = {
          'facebook': () => document.querySelector('button:has(.lucide-facebook)') || document.querySelector('button[class*="bg-blue-600"]'),
          'instagram': () => document.querySelector('button:has(.lucide-instagram)') || document.querySelector('button[class*="from-pink-500"]'),
          'youtube': () => document.querySelector('button:has(.lucide-youtube)') || document.querySelector('button[class*="bg-red-600"]'),
          'linkedin': () => document.querySelector('button:has(.lucide-linkedin)') || document.querySelector('button[class*="bg-blue-700"]'),
          'twitter': () => document.querySelector('button:has(.lucide-twitter)') || document.querySelector('button[class*="bg-blue-400"]')
        };

        const platformBtn = platformButtons[platform] && platformButtons[platform]();
        if (platformBtn) {
          console.log('🔗 Using platform-specific button click');
          platformBtn.click();
          return;
        }

        // Method 4: Fallback error
        setError(`Auto-connect not available for ${platform}. Please click the Connect button manually.`);
        
      } catch (err) {
        console.error('Auto-connect error:', err);
        setError('Auto-connect failed. Please click the Connect button manually.');
      }
    }, 100);
  };

  const mapPlatform = (key) => {
    switch (key) {
      case 'fb': return 'facebook';
      case 'insta': return 'instagram';
      case 'yt': return 'youtube';
      case 'linkedin': return 'linkedin';
      case 'twitter': return 'twitter';
      default: return key; // allow full names as well
    }
  };

  const platform = mapPlatform(platformKey);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-white rounded-xl p-6 shadow">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <div>
              <h3 className="font-semibold text-red-900">Configuration error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <div className="mt-4">
                <a href="/" className="text-blue-600 hover:underline flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" /> Go to main app
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-white rounded-xl p-6 shadow">
          <div className="flex items-start gap-3">
            <Clock className="w-6 h-6 text-amber-600" />
            <div>
              <h3 className="font-semibold text-amber-900">QR Code Expired</h3>
              <p className="text-sm text-amber-700 mt-1">This QR code has expired. For security reasons QR codes expire after a short time.</p>
              <div className="mt-4 space-x-3">
                <a href="/" className="text-blue-600 hover:underline flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" /> Go to main app
                </a>
                <a href="/#/admin/qr-generator" className="text-slate-700 hover:underline flex items-center gap-2">
                  Open Admin QR Generator
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-pulse text-slate-400">Loading configuration...</div>
        </div>
      </div>
    );
  }

  // final render (unchanged surrounding layout) but add overlay when awaitingUserGesture
  return (
    <div className="min-h-screen flex items-start justify-center p-6">
      <div className="w-full max-w-2xl bg-white rounded-xl p-6 shadow">
        <div className="mb-4">
          <h2 className="text-xl font-bold">Configure {platform ? platform.charAt(0).toUpperCase() + platform.slice(1) : 'Social'}</h2>
          {timeRemaining && <p className="text-sm text-slate-600 mt-1">Link valid for: {timeRemaining}</p>}
        </div>

        {/* Social integrations widget */}
        <SocialIntegrations
          ref={socialRef}
          platform={platform}
          customer={customer}
          compact={true}
          onConnectionSuccess={() => {
            // minimal success UX: show confirmation then redirect to app home
            window.location.href = '/';
          }}
        />

        {/* NEW: Overlay prompt for autoConnect requiring user gesture */}
        {awaitingUserGesture && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
            <div className="bg-white rounded-xl p-6 max-w-md w-full text-center shadow-lg">
              <h3 className="text-lg font-semibold mb-2">Continue to Connect {platform ? platform.charAt(0).toUpperCase() + platform.slice(1) : ''}</h3>
              <p className="text-sm text-slate-600 mb-4">
                To complete authentication we need to open the {platform} sign-in window. Tap the button below to continue.
                This must be initiated by a tap on most mobile browsers.
              </p>

              <button
                id="auto-connect-btn"
                onClick={handleAutoConnect}
                className="px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
              >
                Tap to Connect {platform ? platform.charAt(0).toUpperCase() + platform.slice(1) : 'Account'}
              </button>

              <div className="mt-3 text-sm text-slate-500">
                <button
                  onClick={() => {
                    setAwaitingUserGesture(false);
                    setError('Auto-connect cancelled by user.');
                  }}
                  className="text-slate-600 hover:underline"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
