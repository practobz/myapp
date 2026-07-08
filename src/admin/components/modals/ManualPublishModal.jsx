import React, { useState, useEffect } from 'react';
import { 
  X, Facebook, Instagram, Youtube, Linkedin, Twitter, Globe,
  CheckCircle, AlertCircle, Clock, Send, Mail
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL;

// Available platforms to list in the modal
const PLATFORMS_CONFIG = [
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-200' },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  { id: 'twitter', name: 'Twitter/X', icon: Twitter, color: 'text-gray-800', bg: 'bg-gray-50', border: 'border-gray-200' },
];

function ManualPublishModal({ isOpen, onClose, onSave, item, scheduledPosts = [], saving = false }) {
  const [checkedPlatforms, setCheckedPlatforms] = useState([]);
  const [manualPlatformUrls, setManualPlatformUrls] = useState({});
  const [publishedNotes, setPublishedNotes] = useState('');
  const [sendEmailNotification, setSendEmailNotification] = useState(false);
  const [urlErrors, setUrlErrors] = useState({});
  
  // Track which platforms are auto-published
  const [autoPublished, setAutoPublished] = useState({});

  useEffect(() => {
    if (isOpen && item) {
      // Find matching scheduled posts that are published
      const matchingPosts = scheduledPosts.filter(post => 
        ((post.item_id && post.item_id === item.id) ||
         (post.contentId && post.contentId === item.id) ||
         (post.item_name && post.item_name === (item.title || item.description))) &&
        (post.status === 'published' || post.publishedAt)
      );

      const autoMap = {};
      const autoUrls = {};
      
      matchingPosts.forEach(post => {
        const platformKey = post.platform?.toLowerCase();
        if (platformKey) {
          autoMap[platformKey] = true;
          // Resolve url
          let url = '';
          if (platformKey === 'facebook' && post.facebookPostId) {
            const fbId = post.facebookPostId;
            url = fbId.includes('_')
              ? `https://www.facebook.com/permalink.php?story_fbid=${fbId.split('_')[1]}&id=${fbId.split('_')[0]}`
              : `https://www.facebook.com/${fbId}`;
          } else if (platformKey === 'instagram') {
            url = post.instagramPermalink || (post.instagramPostId ? `https://www.instagram.com/p/${post.instagramPostId}` : '');
          } else if (platformKey === 'youtube' && post.youtubePostId) {
            url = `https://www.youtube.com/watch?v=${post.youtubePostId}`;
          } else if (platformKey === 'linkedin' && post.linkedinPostId) {
            url = `https://www.linkedin.com/feed/update/${post.linkedinPostId}`;
          }
          if (url) {
            autoUrls[platformKey] = url;
          }
        }
      });

      setAutoPublished(autoMap);

      // Manual urls populated from item
      const initialManualUrls = item.manualPlatformUrls || {};
      
      // Determine checked state: either auto-published or manual url exists or platform is in item.publishedPlatforms
      const initialChecked = [];
      const initialUrls = {};

      PLATFORMS_CONFIG.forEach(plat => {
        const pId = plat.id;
        const isAuto = autoMap[pId];
        const isManual = (item.publishedPlatforms && item.publishedPlatforms.includes(pId)) || !!initialManualUrls[pId];
        
        if (isAuto) {
          initialChecked.push(pId);
          initialUrls[pId] = autoUrls[pId] || '';
        } else if (isManual) {
          initialChecked.push(pId);
          initialUrls[pId] = initialManualUrls[pId] || '';
        } else {
          initialUrls[pId] = '';
        }
      });

      setCheckedPlatforms(initialChecked);
      setManualPlatformUrls(initialUrls);
      setPublishedNotes(item.publishedNotes || '');
      setSendEmailNotification(false);
      setUrlErrors({});
    }
  }, [isOpen, item, scheduledPosts]);

  const handleTogglePlatform = (platformId) => {
    if (autoPublished[platformId]) return; // Cannot toggle auto-published ones

    setCheckedPlatforms(prev => {
      if (prev.includes(platformId)) {
        return prev.filter(p => p !== platformId);
      } else {
        return [...prev, platformId];
      }
    });
  };

  const validateUrl = (platformId, url) => {
    if (!url) return '';
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();
      switch (platformId) {
        case 'facebook':
          if (!hostname.includes('facebook.com') && !hostname.includes('fb.com') && !hostname.includes('fb.watch')) return 'Must be a valid Facebook URL';
          break;
        case 'instagram':
          if (!hostname.includes('instagram.com')) return 'Must be a valid Instagram URL';
          break;
        case 'linkedin':
          if (!hostname.includes('linkedin.com')) return 'Must be a valid LinkedIn URL';
          break;
        case 'youtube':
          if (!hostname.includes('youtube.com') && !hostname.includes('youtu.be')) return 'Must be a valid YouTube URL';
          break;
        case 'twitter':
          if (!hostname.includes('twitter.com') && !hostname.includes('x.com') && !hostname.includes('t.co')) return 'Must be a valid Twitter/X URL';
          break;
        default:
          break;
      }
    } catch (e) {
      return 'Invalid URL format (include https://)';
    }
    return '';
  };

  const handleUrlChange = (platformId, value) => {
    setManualPlatformUrls(prev => ({
      ...prev,
      [platformId]: value
    }));
    
    const error = validateUrl(platformId, value.trim());
    setUrlErrors(prev => ({
      ...prev,
      [platformId]: error
    }));
  };

  const handleSave = () => {
    // Only send manual checked platforms
    const finalManualPlatforms = checkedPlatforms.filter(p => !autoPublished[p]);
    
    let hasError = false;
    const errors = {};
    const finalUrls = {};
    
    finalManualPlatforms.forEach(p => {
      const url = manualPlatformUrls[p]?.trim();
      if (url) {
        const error = validateUrl(p, url);
        if (error) {
          errors[p] = error;
          hasError = true;
        } else {
          finalUrls[p] = url;
        }
      }
    });

    if (hasError) {
      setUrlErrors(errors);
      return;
    }

    onSave(
      finalManualPlatforms,
      finalUrls,
      publishedNotes,
      sendEmailNotification
    );
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        {/* Modal Panel */}
        <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-2xl rounded-2xl border border-gray-200/50 relative">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Publish Status Manager</h3>
              <p className="text-xs text-gray-500 mt-1 truncate max-w-lg">
                Manage posting details for: <span className="font-semibold">{item.title || item.description}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {/* Platforms List */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Platforms & Post Links</h4>
              <div className="space-y-3">
                {PLATFORMS_CONFIG.map((platform) => {
                  const pId = platform.id;
                  const Icon = platform.icon;
                  const isAuto = !!autoPublished[pId];
                  const isChecked = checkedPlatforms.includes(pId);
                  
                  let statusBadge = (
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                      Not Published
                    </span>
                  );
                  if (isAuto) {
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700">
                        Auto Published
                      </span>
                    );
                  } else if (isChecked) {
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700">
                        Manually Published
                      </span>
                    );
                  }

                  return (
                    <div 
                      key={pId} 
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border transition-all duration-200 ${
                        isChecked 
                          ? isAuto 
                            ? 'border-blue-100 bg-blue-50/20' 
                            : 'border-emerald-100 bg-emerald-50/20'
                          : 'border-gray-100 hover:border-gray-200 bg-gray-50/10'
                      }`}
                    >
                      {/* Left: Checkbox + Icon + Label */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <input
                          type="checkbox"
                          id={`check-${pId}`}
                          checked={isChecked}
                          disabled={isAuto}
                          onChange={() => handleTogglePlatform(pId)}
                          className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <label 
                          htmlFor={`check-${pId}`}
                          className="flex items-center gap-2 cursor-pointer select-none font-semibold text-gray-700 text-sm"
                        >
                          <span className={`p-1.5 rounded-lg ${platform.bg} ${platform.color} border ${platform.border}`}>
                            <Icon className="h-4 w-4" />
                          </span>
                          {platform.name}
                        </label>
                        {statusBadge}
                      </div>

                      {/* Right: URL Input */}
                      <div className="flex-1 min-w-[200px] w-full">
                        <input
                          type="url"
                          placeholder={
                            isAuto 
                              ? "Auto-generated link" 
                              : isChecked 
                                ? "Paste manually published URL here" 
                                : "Check platform to add URL"
                          }
                          value={manualPlatformUrls[pId] || ''}
                          onChange={(e) => handleUrlChange(pId, e.target.value)}
                          disabled={isAuto || !isChecked}
                          className={`w-full text-xs px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 transition-all duration-200 disabled:bg-gray-100 disabled:text-gray-400 ${
                            urlErrors[pId]
                              ? 'border-red-300 focus:ring-red-500 placeholder-red-300'
                              : 'border-gray-200 focus:ring-emerald-500 placeholder-gray-400'
                          }`}
                        />
                        {urlErrors[pId] && (
                          <p className="text-[10px] text-red-500 mt-1 pl-1 font-medium">{urlErrors[pId]}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notes Section */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Publishing Notes
              </label>
              <textarea
                value={publishedNotes}
                onChange={(e) => setPublishedNotes(e.target.value)}
                placeholder="Add notes about manual publication (e.g. targeted hashtags, specific time shared, accounts tagged...)"
                rows="3"
                className="w-full text-sm p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder-gray-400"
              />
            </div>

            {/* Email Notification */}
            <div className="flex items-center gap-2.5 p-3.5 bg-gray-50 border border-gray-100 rounded-xl">
              <input
                type="checkbox"
                id="email-notify"
                checked={sendEmailNotification}
                onChange={(e) => setSendEmailNotification(e.target.checked)}
                className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer"
              />
              <label 
                htmlFor="email-notify"
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-650 cursor-pointer select-none"
              >
                <Mail className="h-3.5 w-3.5 text-gray-500" />
                Send Email Notification to Customer about this update
              </label>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-700 text-sm font-semibold hover:bg-gray-50 focus:outline-none transition-all duration-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl focus:outline-none transition-all duration-200 disabled:opacity-50 shadow-md flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Save Status
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ManualPublishModal;
