import React, { useState } from 'react';

const DEFAULT_PERMISSIONS = {
  facebook: 'pages_show_list,pages_read_engagement,pages_manage_posts,pages_manage_metadata,email,public_profile',
  instagram: 'email,public_profile,pages_show_list,pages_read_engagement,instagram_basic,instagram_content_publish'
};

function MetaLoginPopup({
  platform = 'facebook',
  appId = '4416243821942660',
  permissions,
  onSuccess,
  onError,
  show,
  onClose
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = () => {
    setLoading(true);
    setError(null);

    if (!window.FB) {
      setError('Facebook SDK not loaded yet.');
      setLoading(false);
      return;
    }

    window.FB.login((response) => {
      setLoading(false);
      if (response.status === 'connected') {
        if (onSuccess) onSuccess(response);
      } else {
        setError('Login failed or cancelled.');
        if (onError) onError(response);
      }
    }, {
      scope: permissions || DEFAULT_PERMISSIONS[platform],
      return_scopes: true,
      auth_type: 'rerequest'
    });
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-2">
          {platform === 'facebook' ? 'Connect Facebook Account' : 'Connect Instagram Account'}
        </h2>
        <p className="mb-4 text-gray-600">
          Please log in to your {platform} account and grant the required permissions.
        </p>
        {error && <div className="text-red-600 mb-2">{error}</div>}
        <div className="flex space-x-3">
          <button
            onClick={handleLogin}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            {loading ? 'Connecting...' : 'Login'}
          </button>
          <button
            onClick={onClose}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default MetaLoginPopup;
