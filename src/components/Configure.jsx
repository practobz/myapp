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
  
  // NEW: show success overlay before closing
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);

  const socialRef = useRef(null);

  useEffect(() => {
    const params = parseQuery();
    const customerId = params.get('customerId') || params.get('customerid') || ''; // Also check lowercase
    const platform = params.get('platform') || '';
    const auto = params.get('autoConnect') || params.get('auto') || '';
    const timestamp = params.get('t');

    console.log('🔍 Configure URL params:', { customerId, platform, auto, timestamp });
    console.log('🔍 Current URL:', window.location.href);
    console.log('🔍 Origin:', window.location.origin);

    if (!customerId || !platform) {
      setError(`Missing required parameters. CustomerId: ${customerId || 'missing'}, Platform: ${platform || 'missing'}`);
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
        
        // ✅ UPDATED: Better API base URL detection for production
        let apiBase = process.env.REACT_APP_API_URL || '';
        
        // If no API URL configured and we're in production, use the production backend
        if (!apiBase && process.env.NODE_ENV === 'production') {
          apiBase = 'https://my-backend-593529385135.asia-south1.run.app';
        }
        
        console.log('🔍 Using API base:', apiBase);

        // helper to attempt a fetch and return parsed JSON or null
        const tryFetchJson = async (url, opts = {}) => {
          try {
            console.log('🔍 Trying fetch:', url);
            const res = await fetch(url, opts);
            if (!res.ok) {
              // still try to parse error body for debugging
              let txt;
              try { txt = await res.text(); } catch (e) { txt = String(e); }
              console.warn('Request failed', url, res.status, txt);
              return { ok: false, status: res.status, bodyText: txt, json: null };
            }
            const json = await res.json();
            console.log('✅ Fetch success:', url, json);
            return { ok: true, status: res.status, json };
          } catch (err) {
            // network error (connection refused, CORS, etc.)
            console.warn('Network fetch error for', url, err.message);
            return null;
          }
        };

        // Try configured API base first (more reliable for production)
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

        // Try relative endpoint (works when backend is proxied by frontend dev server)
        const relativeById = `/api/customers/${encodeURIComponent(customerId)}`;
        const attemptRelativeById = await tryFetchJson(relativeById);
        if (attemptRelativeById && attemptRelativeById.ok) {
          const fetched = attemptRelativeById.json.customer || attemptRelativeById.json;
          setCustomer(fetched);
          setLoading(false);
          return;
        }

        // Fallback: try listing endpoints (relative then remote)
        const relativeList = `/api/customers`;
        const attemptRelativeList = await tryFetchJson(relativeList);
        if (attemptRelativeList && attemptRelativeList.ok) {
          const list = attemptRelativeList.json.customers || attemptRelativeList.json;
          const found = Array.isArray(list) ? list.find(c => String(c._id) === String(customerId) || String(c.id) === String(customerId)) : null;
          if (found) {
            setCustomer(found);
            setLoading(false);
            return;
          }
        }

        if (apiBase) {
          const remoteList = `${apiBase.replace(/\/$/, '')}/api/customers`;
          const attemptRemoteList = await tryFetchJson(remoteList);
          if (attemptRemoteList && attemptRemoteList.ok) {
            const list = attemptRemoteList.json.customers || attemptRemoteList.json;
            const found = Array.isArray(list) ? list.find(c => String(c._id) === String(customerId) || String(c.id) === String(customerId)) : null;
            if (found) {
              setCustomer(found);
              setLoading(false);
            
              return;
            }
          }
        }

        setError(`Customer not found. CustomerId: ${customerId}. Please verify the QR was generated for an existing customer or that the API is reachable.`);
      } catch (err) {
        console.error('🚫 Network error:', err);
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
            // Show success overlay immediately
            setShowSuccessOverlay(true);
            
            // Wait 3 seconds, then close the window
            setTimeout(() => {
              // Try to close the window first (works if opened as popup)
              if (window.opener) {
                window.close();
              } else {
                // If not a popup, just keep the success message visible
                // User can close manually
              }
            }, 3000);
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
                onClick={() => {
                  // hide the prompt and trigger connect inside user gesture
                  setAwaitingUserGesture(false);
                  setTimeout(() => {
                    if (socialRef.current && typeof socialRef.current.triggerConnect === 'function') {
                      socialRef.current.triggerConnect();
                    } else {
                      setError('Automatic trigger not available. Please press Connect in the widget.');
                    }
                  }, 100);
                }}
                className="px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold"
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

        {/* Success Overlay */}
        {showSuccessOverlay && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-green-100 p-3">
                  <CheckCircle className="h-16 w-16 text-green-600" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Successfully Connected!</h3>
              <p className="text-gray-600 mb-4">
                Your {platform ? platform.charAt(0).toUpperCase() + platform.slice(1) : 'social media'} account has been connected successfully.
              </p>
              <p className="text-sm text-gray-500">
                This window will close automatically...
              </p>
              <button
                onClick={() => {
                  if (window.opener) {
                    window.close();
                  } else {
                    setShowSuccessOverlay(false);
                  }
                }}
                className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                Close Now
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
