import React, { useState, useEffect } from 'react';
import { 
  Plus, Loader2, CheckCircle, Info, ExternalLink, Globe, Target, X, Upload, Image, AlertCircle
} from 'lucide-react';
import { MetaAdvertisingAPI } from '../utils/metaAdvertisingApi';

function InstagramCampaignCreator({ 
  userAccessToken, 
  adAccount, 
  selectedInstagramAccount, 
  onCampaignCreated, 
  onError,
  onCancel 
}) {
  // Campaign creation state
  const [loading, setLoading] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    objective: 'OUTCOME_AWARENESS',
    budget: 10,
    budgetType: 'DAILY',
    duration: 7,
    startDate: new Date().toISOString().split('T')[0],
    targetAudience: {
      age_min: 18,
      age_max: 65,
      genders: [1, 2],
      countries: ['US'],
      interests: [],
      behaviors: [],
      customAudiences: []
    },
    placements: ['instagram_feed', 'instagram_stories'],
    adCreative: {
      headline: '',
      description: '',
      imageFile: null,
      imagePreview: null,
      imageHash: null,
      videoUrl: '',
      callToAction: 'LEARN_MORE',
      websiteUrl: ''
    }
  });

  // Image upload state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState(0);

  // Dynamic field states
  const [campaignObjectives, setCampaignObjectives] = useState([]);
  const [loadingObjectives, setLoadingObjectives] = useState(false);
  const [targetingCountries, setTargetingCountries] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [callToActionTypes, setCallToActionTypes] = useState([]);
  const [loadingCTAs, setLoadingCTAs] = useState(false);
  const [interestSuggestions, setInterestSuggestions] = useState([]);
  const [loadingInterests, setLoadingInterests] = useState(false);
  const [audienceEstimate, setAudienceEstimate] = useState(null);
  const [loadingEstimate, setLoadingEstimate] = useState(false);

  // NEW: ads_read permission toggle and live data state
  const [requestAdsRead, setRequestAdsRead] = useState(false);
  const [adsReadGranted, setAdsReadGranted] = useState(false);
  const [liveAdData, setLiveAdData] = useState(null);
  const [loadingLiveAdData, setLoadingLiveAdData] = useState(false);

  // NEW: Tab state for switching between campaign creation and live performance
  const [activeTab, setActiveTab] = useState('create');

  // NEW: State for all recent ads and their live performance
  const [recentAds, setRecentAds] = useState([]);
  const [loadingRecentAds, setLoadingRecentAds] = useState(false);
  const [adsFetchError, setAdsFetchError] = useState(null);

  // Load dynamic fields when component mounts
  useEffect(() => {
    if (userAccessToken) {
      loadDynamicFields(userAccessToken);
    }
  }, [userAccessToken]);

  // Load dynamic fields
  const loadDynamicFields = async (accessToken) => {
    if (!accessToken) return;

    try {
      // Load campaign objectives
      setLoadingObjectives(true);
      try {
        const objectives = await MetaAdvertisingAPI.getCampaignObjectives(accessToken, 'instagram');
        setCampaignObjectives(objectives);
        // Set default objective if none selected
        if (objectives.length > 0 && !newCampaign.objective) {
          setNewCampaign(prev => ({ ...prev, objective: objectives[0].value }));
        }
      } catch (error) {
        console.warn('Failed to load objectives:', error);
        const fallbackObjectives = MetaAdvertisingAPI.getDefaultObjectives();
        setCampaignObjectives(fallbackObjectives);
        if (fallbackObjectives.length > 0) {
          setNewCampaign(prev => ({ ...prev, objective: fallbackObjectives[0].value }));
        }
      }
      setLoadingObjectives(false);

      // Load countries
      setLoadingCountries(true);
      try {
        const countries = await MetaAdvertisingAPI.getTargetingCountries(accessToken);
        setTargetingCountries(countries);
      } catch (error) {
        console.warn('Failed to load countries:', error);
        setTargetingCountries(MetaAdvertisingAPI.getDefaultCountries());
      }
      setLoadingCountries(false);

      // Load call-to-actions
      setLoadingCTAs(true);
      try {
        const ctas = await MetaAdvertisingAPI.getCallToActionTypes(accessToken, 'instagram');
        setCallToActionTypes(ctas);
      } catch (error) {
        console.warn('Failed to load CTAs:', error);
        setCallToActionTypes(MetaAdvertisingAPI.getDefaultCallToActions('instagram'));
      }
      setLoadingCTAs(false);

    } catch (error) {
      console.error('Failed to load dynamic fields:', error);
      // Use fallback data for all fields
      const fallbackObjectives = MetaAdvertisingAPI.getDefaultObjectives();
      setCampaignObjectives(fallbackObjectives);
      setTargetingCountries(MetaAdvertisingAPI.getDefaultCountries());
      setCallToActionTypes(MetaAdvertisingAPI.getDefaultCallToActions('instagram'));
      
      // Set loading states to false
      setLoadingObjectives(false);
      setLoadingCountries(false);
      setLoadingCTAs(false);
    }
  };

  // Search interests function
  const searchInterests = async (query) => {
    if (!userAccessToken || !query.trim()) {
      setInterestSuggestions([]);
      return;
    }

    setLoadingInterests(true);
    try {
      const interests = await MetaAdvertisingAPI.searchInterests(userAccessToken, query);
      setInterestSuggestions(interests);
    } catch (error) {
      console.error('Interest search failed:', error);
      setInterestSuggestions([]);
    }
    setLoadingInterests(false);
  };

  // Get audience estimate
  const updateAudienceEstimate = async () => {
    if (!userAccessToken || !adAccount) return;

    setLoadingEstimate(true);
    try {
      const targetingSpec = {
        age_min: newCampaign.targetAudience.age_min,
        age_max: newCampaign.targetAudience.age_max,
        genders: newCampaign.targetAudience.genders,
        geo_locations: {
          countries: newCampaign.targetAudience.countries
        },
        targeting_automation: {
          advantage_audience: 0
        },
        interests: newCampaign.targetAudience.interests?.map(i => ({ id: i.id, name: i.name }))
      };

      const estimate = await MetaAdvertisingAPI.getAudienceEstimate(
        userAccessToken, 
        adAccount.id, 
        targetingSpec, 
        'instagram'
      );
      setAudienceEstimate(estimate);
    } catch (error) {
      console.error('Audience estimate failed:', error);
      setAudienceEstimate(null);
    }
    setLoadingEstimate(false);
  };

  // Update audience estimate when targeting changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (userAccessToken && adAccount) {
        updateAudienceEstimate();
      }
    }, 1000); // Debounce API calls

    return () => clearTimeout(timeoutId);
  }, [
    newCampaign.targetAudience.age_min,
    newCampaign.targetAudience.age_max,
    newCampaign.targetAudience.genders,
    newCampaign.targetAudience.countries,
    newCampaign.targetAudience.interests
  ]);

  const validateAccessToken = (accessToken) => {
    return new Promise((resolve) => {
      if (!window.FB) {
        resolve(false);
        return;
      }

      window.FB.api('/me', {
        access_token: accessToken,
        fields: 'id'
      }, function(response) {
        if (response.error) {
          console.error('Token validation failed:', response.error);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  };

  const validateInstagramActorId = async (instagramActorId, accessToken) => {
    return new Promise((resolve) => {
      if (!window.FB || !instagramActorId) {
        resolve(false);
        return;
      }

      window.FB.api(`/${instagramActorId}`, {
        fields: 'id,username,biography,followers_count,media_count',
        access_token: accessToken
      }, function(response) {
        if (response.error) {
          console.warn('Instagram actor validation failed:', response.error);
          
          if (response.error.code === 100 && response.error.message.includes('nonexisting field')) {
            console.warn('Field access error - trying basic validation');
            window.FB.api(`/${instagramActorId}`, {
              fields: 'id,username',
              access_token: accessToken
            }, function(basicResponse) {
              if (basicResponse.error) {
                console.warn('Basic Instagram validation also failed:', basicResponse.error);
                resolve(false);
              } else {
                console.log('✅ Instagram actor ID validated with basic fields:', basicResponse);
                resolve(true);
              }
            });
          } else {
            resolve(false);
          }
        } else {
          const isValid = response.id === instagramActorId.toString();
          
          console.log('Instagram actor validation result:', {
            id: response.id,
            username: response.username,
            isValid
          });
          
          resolve(isValid);
        }
      });
    });
  };

  const getOptimizationGoal = (objective) => {
    const goals = {
      'OUTCOME_AWARENESS': 'IMPRESSIONS', // Changed from REACH to IMPRESSIONS
      'OUTCOME_TRAFFIC': 'LINK_CLICKS',
      'OUTCOME_ENGAGEMENT': 'POST_ENGAGEMENT',
      'OUTCOME_LEADS': 'IMPRESSIONS', // Use IMPRESSIONS for lead generation
      'OUTCOME_SALES': 'IMPRESSIONS', // Use IMPRESSIONS for sales
      'OUTCOME_APP_PROMOTION': 'APP_INSTALLS'
    };
    return goals[objective] || 'IMPRESSIONS';
  };

  const getBillingEvent = (objective) => {
    const events = {
      'OUTCOME_AWARENESS': 'IMPRESSIONS',
      'OUTCOME_TRAFFIC': 'LINK_CLICKS',
      'OUTCOME_ENGAGEMENT': 'POST_ENGAGEMENT',
      'OUTCOME_LEADS': 'IMPRESSIONS', // Changed from LEAD_GENERATION to IMPRESSIONS
      'OUTCOME_SALES': 'IMPRESSIONS', // Changed from CONVERSIONS to IMPRESSIONS
      'OUTCOME_APP_PROMOTION': 'APP_INSTALLS'
    };
    return events[objective] || 'IMPRESSIONS';
  };

  const resetCampaignForm = () => {
    // Cleanup image preview URL if it exists
    if (newCampaign.adCreative.imagePreview) {
      URL.revokeObjectURL(newCampaign.adCreative.imagePreview);
    }

    setNewCampaign({
      name: '',
      objective: 'OUTCOME_AWARENESS',
      budget: 10,
      budgetType: 'DAILY',
      duration: 7,
      startDate: new Date().toISOString().split('T')[0],
      targetAudience: {
        age_min: 18,
        age_max: 65,
        genders: [1, 2],
        countries: ['US'],
        interests: [],
        behaviors: [],
        customAudiences: []
      },
      placements: ['instagram_feed', 'instagram_stories'],
      adCreative: {
        headline: '',
        description: '',
        imageFile: null,
        imagePreview: null,
        imageHash: null,
        videoUrl: '',
        callToAction: 'LEARN_MORE',
        websiteUrl: ''
      }
    });
  };

  // Handle image upload
  const handleImageUpload = async (file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      onError('Please select an image file (JPG, PNG, GIF)');
      return;
    }

    // Validate file size (8MB limit for Instagram)
    const maxSize = 8 * 1024 * 1024; // 8MB
    if (file.size > maxSize) {
      onError('Image file size must be less than 8MB');
      return;
    }

    // Create preview
    const previewUrl = URL.createObjectURL(file);
    setNewCampaign(prev => ({
      ...prev,
      adCreative: {
        ...prev.adCreative,
        imageFile: file,
        imagePreview: previewUrl,
        imageHash: null
      }
    }));

    // Upload to Meta
    await uploadImageToMeta(file);
  };

  const uploadImageToMeta = async (file) => {
    if (!userAccessToken || !adAccount) {
      onError('Missing account information for image upload');
      return;
    }

    setUploadingImage(true);
    setImageUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('source', file);
      formData.append('access_token', userAccessToken);
      formData.append('account_id', adAccount.id);

      // Upload with progress tracking
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          setImageUploadProgress(Math.round(progress));
        }
      });

      const uploadPromise = new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error('Upload failed'));
      });

      const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';
      xhr.open('POST', `${API_BASE_URL}/api/meta/upload-image`);
      xhr.send(formData);

      const result = await uploadPromise;

      if (result.success && result.data.hash) {
        console.log('✅ Image uploaded successfully:', result.data.hash);
        setNewCampaign(prev => ({
          ...prev,
          adCreative: {
            ...prev.adCreative,
            imageHash: result.data.hash
          }
        }));
      } else {
        throw new Error('Failed to get image hash from upload response');
      }

    } catch (error) {
      console.error('Image upload failed:', error);
      onError(`Image upload failed: ${error.message}`);
      
      // Clear image on upload failure
      setNewCampaign(prev => ({
        ...prev,
        adCreative: {
          ...prev.adCreative,
          imageFile: null,
          imagePreview: null,
          imageHash: null
        }
      }));
    } finally {
      setUploadingImage(false);
      setImageUploadProgress(0);
    }
  };

  const removeImage = () => {
    // Cleanup preview URL
    if (newCampaign.adCreative.imagePreview) {
      URL.revokeObjectURL(newCampaign.adCreative.imagePreview);
    }

    setNewCampaign(prev => ({
      ...prev,
      adCreative: {
        ...prev.adCreative,
        imageFile: null,
        imagePreview: null,
        imageHash: null
      }
    }));
  };

  // Create campaign handler
  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    
    if (!adAccount || !userAccessToken || !selectedInstagramAccount) {
      onError('Missing required account information. Please reconnect your account.');
      return;
    }

    if (newCampaign.budget < 5) {
      onError('Minimum budget is $5.00');
      return;
    }

    // Validate that we have either an image or just text content
    if (!newCampaign.adCreative.imageHash && !newCampaign.adCreative.headline.trim()) {
      onError('Please add either an image or headline for your ad');
      return;
    }

    setLoading(true);

    try {
      // First validate the current token
      const isTokenValid = await validateAccessToken(userAccessToken);
      if (!isTokenValid) {
        onError('Access token expired. Please reconnect your account.');
        setLoading(false);
        return;
      }

      // Step 1: Create Campaign
      const campaignData = {
        name: newCampaign.name,
        objective: newCampaign.objective,
        status: 'PAUSED',
        special_ad_categories: [],
        access_token: userAccessToken
      };

      window.FB.api(`/${adAccount.id}/campaigns`, 'POST', campaignData, async function(campaignResponse) {
        if (campaignResponse.error) {
          onError(`Campaign creation failed: ${campaignResponse.error.message}`);
          setLoading(false);
          return;
        }

        console.log('✅ Campaign created:', campaignResponse);

        // Step 2: Create Ad Set using backend route with proper Instagram targeting
        const budgetAmount = Math.round(newCampaign.budget * 100);
        const optimizationGoal = getOptimizationGoal(newCampaign.objective);
        const billingEvent = getBillingEvent(newCampaign.objective);
        
        // Construct proper targeting for Instagram
        const targeting = {
          age_min: newCampaign.targetAudience.age_min,
          age_max: newCampaign.targetAudience.age_max,
          genders: newCampaign.targetAudience.genders,
          geo_locations: {
            countries: newCampaign.targetAudience.countries
          },
          // Required for Instagram ads - CRITICAL
          publisher_platforms: ['instagram'],
          device_platforms: ['mobile'], // Instagram is mobile-only
          instagram_positions: ['stream'], // Start with just feed, can add 'story' later
          // Required targeting automation field
          targeting_automation: {
            advantage_audience: 0
          }
        };

        // Add interests if selected
        if (newCampaign.targetAudience.interests?.length > 0) {
          targeting.interests = newCampaign.targetAudience.interests.map(i => ({ 
            id: i.id.toString(), 
            name: i.name 
          }));
        }

        const adSetPayload = {
          account_id: adAccount.id,
          name: `${newCampaign.name} - Ad Set`,
          campaign_id: campaignResponse.id,
          optimization_goal: optimizationGoal,
          billing_event: billingEvent,
          bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
          page_id: selectedInstagramAccount.pageId,
          targeting: targeting,
          status: 'PAUSED',
          access_token: userAccessToken
        };

        // Add budget - ensure only one type is set and minimum values are met
        if (newCampaign.budgetType === 'DAILY') {
          const dailyBudgetCents = Math.max(budgetAmount, 500); // Ensure minimum $5
          adSetPayload.daily_budget = dailyBudgetCents;
          console.log('Setting daily_budget:', dailyBudgetCents, '(cents)');
        } else if (newCampaign.budgetType === 'LIFETIME') {
          const lifetimeBudgetCents = Math.max(budgetAmount, 500); // Ensure minimum $5
          adSetPayload.lifetime_budget = lifetimeBudgetCents;
          // For lifetime budget, we need an end time
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + (newCampaign.duration || 7));
          adSetPayload.end_time = endDate.toISOString();
          console.log('Setting lifetime_budget:', lifetimeBudgetCents, '(cents) with end_time:', adSetPayload.end_time);
        }

        // Add start time if in the future
        const startDate = new Date(newCampaign.startDate + 'T00:00:00');
        const now = new Date();
        if (startDate > now) {
          adSetPayload.start_time = startDate.toISOString();
        }

        console.log('Ad Set Payload:', {
          ...adSetPayload,
          access_token: '***REDACTED***'
        });

        try {
          const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';
          const adSetResponse = await fetch(`${API_BASE_URL}/api/meta/create-adset`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(adSetPayload)
          });

          const adSetResult = await adSetResponse.json();

          if (!adSetResponse.ok || adSetResult.error) {
            console.error('Backend ad set creation error:', adSetResult);
            
            // Handle specific error cases
            if (adSetResult.details?.error?.code === 100 && adSetResult.details?.error?.error_subcode === 1359188) {
              onError('Payment method required: Your Facebook Ad Account needs a valid payment method to create ads. Please visit Facebook Ads Manager to add a payment method, then try again.');
              setLoading(false);
              return;
            }
            
            if (adSetResult.details?.error?.code === 190) {
              onError('Access token expired. Please reconnect your account.');
              setLoading(false);
              return;
            }
            
            // For other errors, show detailed message
            const errorMessage = adSetResult.details?.error?.error_user_msg || 
                               adSetResult.details?.error?.message || 
                               adSetResult.error || 
                               'Unknown error occurred';
            
            onError(`Failed to create ad set: ${errorMessage}`);
            setLoading(false);
            return;
          }

          console.log('✅ Ad Set created via backend:', adSetResult.data);

          // Step 3: Create Ad Creative with image support
          const createAdCreativeWithImage = async () => {
            // Helper to actually call FB API
            const fbCreate = (creativePayload) =>
              new Promise((resolve, reject) => {
                window.FB.api(`/${adAccount.id}/adcreatives`, 'POST', {
                  ...creativePayload,
                  access_token: userAccessToken
                }, function(response) {
                  if (response.error) {
                    reject(response.error);
                  } else {
                    resolve({
                      success: true,
                      id: response.id,
                      type: creativePayload.object_story_spec.photo_data
                        ? 'image'
                        : creativePayload.object_story_spec.link_data
                        ? 'image_link'
                        : 'text'
                    });
                  }
                });
              });

            // 1. Try with instagram_actor_id if present
            let creativePayload;
            if (newCampaign.adCreative.imageHash) {
              if (newCampaign.adCreative.websiteUrl) {
                creativePayload = {
                  name: `${newCampaign.name} - Image Link Creative`,
                  object_story_spec: {
                    page_id: selectedInstagramAccount.pageId,
                    ...(selectedInstagramAccount.id ? { instagram_actor_id: selectedInstagramAccount.id } : {}),
                    link_data: {
                      message: newCampaign.adCreative.description || '',
                      name: newCampaign.adCreative.headline || '',
                      link: newCampaign.adCreative.websiteUrl,
                      call_to_action: {
                        type: newCampaign.adCreative.callToAction || 'LEARN_MORE'
                      },
                      image_hash: newCampaign.adCreative.imageHash
                    }
                  }
                };
              } else {
                creativePayload = {
                  name: `${newCampaign.name} - Image Post Creative`,
                  object_story_spec: {
                    page_id: selectedInstagramAccount.pageId,
                    ...(selectedInstagramAccount.id ? { instagram_actor_id: selectedInstagramAccount.id } : {}),
                    photo_data: {
                      image_hash: newCampaign.adCreative.imageHash,
                      caption: `${newCampaign.adCreative.headline ? newCampaign.adCreative.headline + '\n\n' : ''}${newCampaign.adCreative.description || ''}`.trim()
                    }
                  }
                };
              }
            } else {
              creativePayload = {
                name: `${newCampaign.name} - Text Creative`,
                object_story_spec: {
                  page_id: selectedInstagramAccount.pageId,
                  text_data: {
                    message: `${newCampaign.adCreative.headline || ''}\n\n${newCampaign.adCreative.description || ''}`.trim()
                  }
                }
              };
            }

            // Try with instagram_actor_id
            try {
              return await fbCreate(creativePayload);
            } catch (err) {
              // If error is about instagram_actor_id, retry without it
              if (
                err.code === 100 &&
                err.message &&
                err.message.includes('instagram_actor_id')
              ) {
                console.warn('Retrying creative creation without instagram_actor_id...');
                // Remove instagram_actor_id and try again
                const payloadNoIG = JSON.parse(JSON.stringify(creativePayload));
                if (payloadNoIG.object_story_spec.instagram_actor_id) {
                  delete payloadNoIG.object_story_spec.instagram_actor_id;
                }
                try {
                  return await fbCreate(payloadNoIG);
                } catch (err2) {
                  // If still fails, fallback to text creative
                  console.warn('Retrying creative creation as text-only...');
                  const textPayload = {
                    name: `${newCampaign.name} - Text Creative`,
                    object_story_spec: {
                      page_id: selectedInstagramAccount.pageId,
                      text_data: {
                        message: `${newCampaign.adCreative.headline || ''}\n\n${newCampaign.adCreative.description || ''}`.trim()
                      }
                    }
                  };
                  return await fbCreate(textPayload);
                }
              }
              // If error is not about instagram_actor_id, rethrow
              throw new Error(err.message || 'Creative creation failed');
            }
          };

          try {
            const creativeResult = await createAdCreativeWithImage();
            
            console.log(`✅ Creative created successfully using ${creativeResult.type} format:`, creativeResult.id);
            
            // Step 4: Create the final ad
            const adData = {
              name: `${newCampaign.name} - Ad`,
              adset_id: adSetResult.data.id,
              creative: { 
                creative_id: creativeResult.id 
              },
              status: 'PAUSED',
              access_token: userAccessToken
            };

            console.log('Creating ad with data:', {
              ...adData,
              access_token: '***REDACTED***'
            });

            window.FB.api(`/${adAccount.id}/ads`, 'POST', adData, function(adResponse) {
              if (adResponse.error) {
                console.error('Ad creation failed:', adResponse.error);
                
                // Handle payment method errors gracefully
                if (adResponse.error.code === 100 && adResponse.error.error_subcode === 1359188) {
                  setLoading(false);
                  
                  const paymentError = (
                    <div className="space-y-4">
                      <div className="text-red-800">
                        <strong>Payment Method Required</strong>
                      </div>
                      <div className="text-red-700">
                        Your campaign structure and creative have been created successfully, but a valid payment method 
                        is required to complete the ad creation process.
                      </div>
                      <div className="text-red-700">
                        <strong>Next Steps:</strong>
                        <ol className="list-decimal list-inside mt-2 space-y-1">
                          <li>Visit Facebook Ads Manager billing section</li>
                          <li>Add a valid credit card or payment method</li>
                          <li>Return to AirSpark and try creating the ad again</li>
                        </ol>
                      </div>
                      <div className="mt-4">
                        <a 
                          href="https://adsmanager.facebook.com/billing_hub/payment_methods" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                        >
                          <span>Add Payment Method</span>
                          <ExternalLink className="h-4 w-4 ml-2" />
                        </a>
                      </div>
                    </div>
                  );
                  
                  onError(paymentError);
                  
                  alert(`✅ Campaign Structure Created Successfully!\n\nCampaign ID: ${campaignResponse.id}\nAd Set ID: ${adSetResult.data.id}\nCreative ID: ${creativeResult.id}\nCreative Type: ${creativeResult.type}\n\n⚠️ Payment Method Required:\nTo complete the process and create the actual ad, please add a valid payment method to your Facebook Ad Account.\n\nVisit: Facebook Ads Manager > Billing > Payment Methods`);
                } else {
                  onError(`Creating ad failed: ${adResponse.error.message || 'Unknown error'}`);
                }
                setLoading(false);
                return;
              }

              console.log('✅ Ad created successfully:', adResponse);
              
              setLoading(false);
              resetCampaignForm();
              
              alert(`🎉 Campaign "${newCampaign.name}" created successfully!\n\nCampaign ID: ${campaignResponse.id}\nAd Set ID: ${adSetResult.data.id}\nCreative ID: ${creativeResult.id} (${creativeResult.type})\nAd ID: ${adResponse.id}\n\nThe campaign is paused and ready for review. You can activate it from the Campaigns tab.`);
              
              onCampaignCreated();

              // NEW: Fetch live ad performance if ads_read is granted
              if (adsReadGranted) {
                fetchLiveAdPerformance(adResponse.id);
              }
            });

          } catch (creativeError) {
            console.error('Creative creation failed:', creativeError);
            onError(`Failed to create ad creative: ${creativeError.message}`);
            setLoading(false);
          }
        } catch (backendError) {
          console.error('Backend request failed:', backendError);
          onError(`Failed to create ad set: ${backendError.message}`);
          setLoading(false);
        }
      });

    } catch (err) {
      console.error('Campaign creation error:', err);
      onError(`Failed to create campaign: ${err.message}`);
      setLoading(false);
    }
  };

  // NEW: Function to request ads_read permission via FB.login
  const handleRequestAdsRead = () => {
    if (!window.FB) return;
    window.FB.login((response) => {
      if (response.status === 'connected' && response.authResponse) {
        // Check if ads_read is in granted scopes
        window.FB.api('/me/permissions', { access_token: response.authResponse.accessToken }, (permResp) => {
          const granted = permResp.data?.some(p => p.permission === 'ads_read' && p.status === 'granted');
          setAdsReadGranted(granted);
          if (granted) onError(null);
          else onError('ads_read permission was not granted.');
        });
      } else {
        setAdsReadGranted(false);
        onError('Failed to grant ads_read permission.');
      }
    }, { scope: 'ads_read', auth_type: 'rerequest' });
  };

  // NEW: Fetch live ad performance data after campaign creation if ads_read is granted
  const fetchLiveAdPerformance = async (adId) => {
    if (!userAccessToken || !adId) return;
    setLoadingLiveAdData(true);
    try {
      // Use MetaAdvertisingAPI helper if available, else direct FB.api
      window.FB.api(
        `/${adId}/insights`,
        {
          access_token: userAccessToken,
          fields: 'impressions,clicks,spend,reach,actions,objective,ad_name,ad_id'
        },
        (resp) => {
          setLoadingLiveAdData(false);
          if (resp && !resp.error && resp.data && resp.data.length > 0) {
            setLiveAdData(resp.data[0]);
          } else {
            setLiveAdData(null);
            if (resp.error) onError('Failed to fetch live ad data: ' + resp.error.message);
          }
        }
      );
    } catch (err) {
      setLoadingLiveAdData(false);
      setLiveAdData(null);
      onError('Failed to fetch live ad data: ' + err.message);
    }
  };

  // Fetch recent ads and their performance for the ad account
  useEffect(() => {
    if (activeTab === 'performance' && userAccessToken && adAccount?.id && adsReadGranted) {
      fetchRecentAdsWithPerformance();
    }
    // eslint-disable-next-line
  }, [activeTab, userAccessToken, adAccount, adsReadGranted]);

  // Fetch recent ads and their insights
  const fetchRecentAdsWithPerformance = async () => {
    setLoadingRecentAds(true);
    setAdsFetchError(null);
    setRecentAds([]);
    try {
      // Step 1: Get recent ads for the ad account
      window.FB.api(
        `/${adAccount.id}/ads`,
        {
          access_token: userAccessToken,
          fields: 'id,name,adset_id,created_time,status',
          limit: 10
        },
        (adsResp) => {
          if (adsResp && !adsResp.error && Array.isArray(adsResp.data)) {
            const ads = adsResp.data;
            if (ads.length === 0) {
              setRecentAds([]);
              setLoadingRecentAds(false);
              return;
            }
            // Step 2: For each ad, fetch insights
            let completed = 0;
            const adsWithInsights = [];
            ads.forEach((ad) => {
              window.FB.api(
                `/${ad.id}/insights`,
                {
                  access_token: userAccessToken,
                  fields: 'impressions,clicks,spend,reach,actions,objective,ad_name,ad_id',
                  limit: 1
                },
                (insightsResp) => {
                  let metrics = {};
                  if (insightsResp && !insightsResp.error && Array.isArray(insightsResp.data) && insightsResp.data.length > 0) {
                    metrics = insightsResp.data[0];
                  }
                  // Parse conversions if available
                  let conversions = 0;
                  if (metrics.actions && Array.isArray(metrics.actions)) {
                    const conv = metrics.actions.find(a => a.action_type === 'offsite_conversion.fb_pixel_purchase' || a.action_type === 'lead');
                    if (conv) conversions = conv.value;
                  }
                  adsWithInsights.push({
                    ...ad,
                    impressions: metrics.impressions || '-',
                    clicks: metrics.clicks || '-',
                    spend: metrics.spend || '-',
                    reach: metrics.reach || '-',
                    conversions: conversions || '-'
                  });
                  completed++;
                  if (completed === ads.length) {
                    // Sort by created_time desc
                    adsWithInsights.sort((a, b) => new Date(b.created_time) - new Date(a.created_time));
                    setRecentAds(adsWithInsights);
                    setLoadingRecentAds(false);
                  }
                }
              );
            });
          } else {
            setAdsFetchError(adsResp?.error?.message || 'Failed to fetch ads');
            setLoadingRecentAds(false);
          }
        }
      );
    } catch (err) {
      setAdsFetchError(err.message);
      setLoadingRecentAds(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex space-x-4 border-b mb-4">
        <button
          className={`px-4 py-2 font-medium border-b-2 transition-all ${
            activeTab === 'create'
              ? 'border-pink-600 text-pink-700'
              : 'border-transparent text-gray-500 hover:text-pink-600'
          }`}
          onClick={() => setActiveTab('create')}
        >
          Create Campaign
        </button>
        <button
          className={`px-4 py-2 font-medium border-b-2 transition-all ${
            activeTab === 'performance'
              ? 'border-green-600 text-green-700'
              : 'border-transparent text-gray-500 hover:text-green-600'
          }`}
          onClick={() => setActiveTab('performance')}
        >
          Live Ad Performance
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'create' && (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
            <div className="flex items-start space-x-3">
              <Info className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900 mb-2">Professional Campaign Creation</h4>
                <p className="text-blue-800 text-sm mb-4">
                  Create Instagram advertising campaigns with advanced targeting, budget optimization, and creative management 
                  using Meta's Marketing API. Upload images just like in Facebook Ads Manager.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <form onSubmit={handleCreateCampaign} className="space-y-6">
              {/* Campaign Basics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campaign Name *
                  </label>
                  <input
                    type="text"
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    placeholder="Enter campaign name..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campaign Objective *
                  </label>
                  {loadingObjectives ? (
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 flex items-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-gray-500">Loading objectives...</span>
                    </div>
                  ) : (
                    <select
                      value={newCampaign.objective}
                      onChange={(e) => setNewCampaign(prev => ({ ...prev, objective: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      required
                    >
                      {campaignObjectives.length === 0 ? (
                        <option value="">Loading objectives...</option>
                      ) : (
                        campaignObjectives.map((objective) => (
                          <option key={objective.value} value={objective.value}>
                            {objective.label} - {objective.description}
                          </option>
                        ))
                     ) }
                    </select>
                  )}
                </div>
              </div>

              {/* Budget & Schedule */}
              <div className="border-t pt-6">
                <h4 className="font-semibold text-gray-900 mb-4">Budget & Schedule</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Budget Type</label>
                    <div className="flex items-center space-x-4">
                      <button
                        type="button"
                        onClick={() => setNewCampaign(prev => ({ ...prev, budgetType: 'DAILY' }))}
                        className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center justify-center space-x-2 ${
                          newCampaign.budgetType === 'DAILY'
                          ? 'bg-pink-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <span>Daily Budget</span>
                        {newCampaign.budgetType === 'DAILY' && <CheckCircle className="h-5 w-5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewCampaign(prev => ({ ...prev, budgetType: 'LIFETIME' }))}
                        className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center justify-center space-x-2 ${
                          newCampaign.budgetType === 'LIFETIME'
                          ? 'bg-pink-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <span>Lifetime Budget</span>
                        {newCampaign.budgetType === 'LIFETIME' && <CheckCircle className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {newCampaign.budgetType === 'DAILY' ? 'Daily Budget ($)' : 'Total Budget ($)'} *
                    </label>
                    <input
                      type="number"
                      value={newCampaign.budget}
                      onChange={(e) => setNewCampaign(prev => ({ ...prev, budget: parseFloat(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      min="5"
                      step="0.01"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Minimum: $5.00 {newCampaign.budgetType === 'DAILY' ? 'per day' : 'total'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={newCampaign.startDate}
                      onChange={(e) => setNewCampaign(prev => ({ ...prev, startDate: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>
              </div>

              {/* Enhanced Audience Targeting */}
              <div className="border-t pt-6">
                <h4 className="font-semibold text-gray-900 mb-4">Audience Targeting</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Age Range
                    </label>
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <input
                          type="number"
                          value={newCampaign.targetAudience.age_min}
                          onChange={(e) => setNewCampaign(prev => ({
                            ...prev,
                            targetAudience: {
                              ...prev.targetAudience,
                              age_min: parseInt(e.target.value)
                            }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                          min="13"
                          max="65"
                        />
                        <p className="text-xs text-gray-500 mt-1">Min age</p>
                      </div>
                      <span className="text-gray-400">to</span>
                      <div className="flex-1">
                        <input
                          type="number"
                          value={newCampaign.targetAudience.age_max}
                          onChange={(e) => setNewCampaign(prev => ({
                            ...prev,
                            targetAudience: {
                              ...prev.targetAudience,
                              age_max: parseInt(e.target.value)
                            }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                          min="13"
                          max="65"
                        />
                        <p className="text-xs text-gray-500 mt-1">Max age</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                    <div className="space-y-2">
                      {[
                        { value: [1, 2], label: 'All genders' },
                        { value: [1], label: 'Men only' },
                        { value: [2], label: 'Women only' }
                      ].map((option) => (
                        <label key={option.label} className="flex items-center">
                          <input
                            type="radio"
                            name="gender"
                            checked={JSON.stringify(newCampaign.targetAudience.genders) === JSON.stringify(option.value)}
                            onChange={() => setNewCampaign(prev => ({
                              ...prev,
                              targetAudience: {
                                ...prev.targetAudience,
                                genders: option.value
                              }
                            }))}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Countries
                  </label>
                  {loadingCountries ? (
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 flex items-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-gray-500">Loading countries...</span>
                    </div>
                  ) : (
                    <select
                      value={newCampaign.targetAudience.countries[0]}
                      onChange={(e) => setNewCampaign(prev => ({
                        ...prev,
                        targetAudience: {
                          ...prev.targetAudience,
                          countries: [e.target.value]
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    >
                      {targetingCountries.map((country) => (
                        <option key={country.value} value={country.value}>
                          {country.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Interest Targeting */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Interest Targeting
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search interests (e.g., fashion, technology, fitness)..."
                      onChange={(e) => {
                        const query = e.target.value;
                        if (query.length >= 2) {
                          searchInterests(query);
                        } else {
                          setInterestSuggestions([]);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                    {loadingInterests && (
                      <div className="absolute right-3 top-3">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Interest Suggestions */}
                  {interestSuggestions.length > 0 && (
                    <div className="mt-2 max-h-48 overflow-y-auto border border-gray-300 rounded-lg">
                      {interestSuggestions.map((interest) => (
                        <button
                          key={interest.id}
                          type="button"
                          onClick={() => {
                            const isAlreadySelected = newCampaign.targetAudience.interests?.find(i => i.id === interest.id);
                            if (!isAlreadySelected) {
                              setNewCampaign(prev => ({
                                ...prev,
                                targetAudience: {
                                  ...prev.targetAudience,
                                  interests: [...(prev.targetAudience.interests || []), interest]
                                }
                              }));
                            }
                            setInterestSuggestions([]);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{interest.name}</div>
                          <div className="text-sm text-gray-500">
                            {MetaAdvertisingAPI.formatNumber(interest.audience_size)} people
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Selected Interests */}
                  {newCampaign.targetAudience.interests?.length > 0 && (
                    <div className="mt-3">
                      <div className="text-sm font-medium text-gray-700 mb-2">Selected Interests:</div>
                      <div className="flex flex-wrap gap-2">
                        {newCampaign.targetAudience.interests.map((interest) => (
                          <span
                            key={interest.id}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                          >
                            {interest.name}
                            <button
                              type="button"
                              onClick={() => {
                                setNewCampaign(prev => ({
                                  ...prev,
                                  targetAudience: {
                                    ...prev.targetAudience,
                                    interests: prev.targetAudience.interests.filter(i => i.id !== interest.id)
                                  }
                                }));
                              }}
                              className="ml-2 text-blue-600 hover:text-blue-800"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Audience Estimate */}
                {audienceEstimate && (
                  <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <h5 className="font-semibold text-yellow-900 mb-3">📊 Audience Estimate</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-yellow-900">
                          {loadingEstimate ? (
                            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                          ) : (
                            MetaAdvertisingAPI.formatNumber(audienceEstimate.users)
                          )}
                        </div>
                        <div className="text-sm text-yellow-700">Potential Reach</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-yellow-900">
                          {audienceEstimate.estimate_ready ? '✅' : '⏳'}
                        </div>
                        <div className="text-sm text-yellow-700">Estimate Status</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Enhanced Ad Creative */}
              <div className="border-t pt-6">
                <h4 className="font-semibold text-gray-900 mb-4">Ad Creative</h4>
                
                {/* Image Upload Section */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ad Image
                  </label>
                  
                  {!newCampaign.adCreative.imagePreview ? (
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            handleImageUpload(file);
                          }
                        }}
                        className="hidden"
                        id="image-upload"
                        disabled={uploadingImage}
                      />
                      <label
                        htmlFor="image-upload"
                        className={`flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors ${
                          uploadingImage ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          {uploadingImage ? (
                            <>
                              <Loader2 className="w-8 h-8 mb-4 text-gray-500 animate-spin" />
                              <p className="mb-2 text-sm text-gray-500">Uploading image...</p>
                              <div className="w-48 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-pink-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${imageUploadProgress}%` }}
                                ></div>
                              </div>
                              <p className="text-xs text-gray-500 mt-2">{imageUploadProgress}%</p>
                            </>
                          ) : (
                            <>
                              <Upload className="w-8 h-8 mb-4 text-gray-500" />
                              <p className="mb-2 text-sm text-gray-500">
                                <span className="font-semibold">Click to upload</span> or drag and drop
                              </p>
                              <p className="text-xs text-gray-500">PNG, JPG, GIF up to 8MB</p>
                              <p className="text-xs text-gray-400 mt-1">Recommended: 1080x1080px</p>
                            </>
                          )}
                        </div>
                      </label>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="relative w-full h-64 rounded-lg overflow-hidden border border-gray-300">
                        <img
                          src={newCampaign.adCreative.imagePreview}
                          alt="Ad preview"
                          className="w-full h-full object-cover"
                        />
                        {newCampaign.adCreative.imageHash && (
                          <div className="absolute top-2 left-2">
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Uploaded
                            </span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      {newCampaign.adCreative.imageHash && (
                        <p className="text-xs text-gray-500 mt-2">
                          Image Hash: {newCampaign.adCreative.imageHash}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Headline *
                    </label>
                    <input
                      type="text"
                      value={newCampaign.adCreative.headline}
                      onChange={(e) => setNewCampaign(prev => ({
                        ...prev,
                        adCreative: {
                          ...prev.adCreative,
                          headline: e.target.value
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      placeholder="Enter compelling headline..."
                      maxLength="40"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {newCampaign.adCreative.headline.length}/40 characters
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Call to Action
                    </label>
                    {loadingCTAs ? (
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 flex items-center">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span className="text-gray-500">Loading CTAs...</span>
                      </div>
                    ) : (
                      <select
                        value={newCampaign.adCreative.callToAction}
                        onChange={(e) => setNewCampaign(prev => ({
                          ...prev,
                          adCreative: {
                            ...prev.adCreative,
                            callToAction: e.target.value
                          }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      >
                        {callToActionTypes.map((cta) => (
                          <option key={cta.value} value={cta.value}>
                            {cta.label} - {cta.description}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={newCampaign.adCreative.description}
                    onChange={(e) => setNewCampaign(prev => ({
                      ...prev,
                      adCreative: {
                        ...prev.adCreative,
                        description: e.target.value
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    rows="3"
                    placeholder="Write engaging ad description..."
                    maxLength="125"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {newCampaign.adCreative.description.length}/125 characters
                  </p>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website URL
                  </label>
                  <input
                    type="url"
                    value={newCampaign.adCreative.websiteUrl}
                    onChange={(e) => setNewCampaign(prev => ({
                      ...prev,
                      adCreative: {
                        ...prev.adCreative,
                        websiteUrl: e.target.value
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    placeholder="https://your-website.com"
                  />
                </div>

                {/* Creative Preview */}
                {(newCampaign.adCreative.imagePreview || newCampaign.adCreative.headline || newCampaign.adCreative.description) && (
                  <div className="mt-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <h5 className="font-medium text-gray-900 mb-3">Ad Preview</h5>
                    <div className="bg-white rounded-lg p-4 max-w-sm">
                      {newCampaign.adCreative.imagePreview && (
                        <img
                          src={newCampaign.adCreative.imagePreview}
                          alt="Ad preview"
                          className="w-full rounded-lg mb-3"
                        />
                      )}
                      {newCampaign.adCreative.headline && (
                        <h6 className="font-semibold text-gray-900 mb-1">
                          {newCampaign.adCreative.headline}
                        </h6>
                      )}
                      {newCampaign.adCreative.description && (
                        <p className="text-gray-700 text-sm mb-3">
                          {newCampaign.adCreative.description}
                        </p>
                      )}
                      {newCampaign.adCreative.websiteUrl && (
                        <div className="text-xs text-gray-500 mb-2">
                          {newCampaign.adCreative.websiteUrl}
                        </div>
                      )}
                      <button
                        type="button"
                        disabled
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
                      >
                        {callToActionTypes.find(cta => cta.value === newCampaign.adCreative.callToAction)?.label || 'Learn More'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* NEW: ads_read permission toggle */}
              <div className="border-t pt-6">
                <h4 className="font-semibold text-gray-900 mb-4">Meta Permissions</h4>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={requestAdsRead}
                      onChange={() => setRequestAdsRead(v => !v)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">
                      Request <code className="bg-gray-100 px-1 rounded">ads_read</code> permission to fetch live ad performance data after campaign creation
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={handleRequestAdsRead}
                    disabled={adsReadGranted || !requestAdsRead}
                    className={`ml-4 px-3 py-2 rounded-lg text-sm font-medium ${
                      adsReadGranted
                        ? 'bg-green-100 text-green-700 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {adsReadGranted ? 'ads_read Granted' : 'Grant ads_read Permission'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  This permission is required to fetch real-time ad performance (impressions, clicks, spend, etc.) after campaign creation.
                </p>
              </div>

              {/* Submit Button */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Campaign will be created in <strong>paused state</strong> for review before activation.
                  </div>
                  <button
                    type="submit"
                    disabled={loading || uploadingImage || !newCampaign.name.trim() || !newCampaign.adCreative.headline.trim() || !newCampaign.adCreative.description.trim()}
                    className="bg-gradient-to-r from-pink-600 to-purple-600 text-white px-8 py-3 rounded-xl hover:from-pink-700 hover:to-purple-700 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : uploadingImage ? (
                      <Upload className="h-5 w-5" />
                    ) : (
                      <Plus className="h-5 w-5" />
                    )}
                    <span>
                      {loading ? 'Creating Campaign...' : 
                       uploadingImage ? 'Uploading Image...' : 
                       'Create Campaign'}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </>
      )}

      {activeTab === 'performance' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-green-900 mb-4 flex items-center">
            <Globe className="h-6 w-6 mr-2 text-green-600" />
            Live Ad Performance
          </h3>
          {!adsReadGranted ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <div>
                <div className="font-medium text-yellow-900 mb-1">ads_read Permission Required</div>
                <div className="text-yellow-800 text-sm">
                  Please grant <code className="bg-gray-100 px-1 rounded">ads_read</code> permission to fetch live ad performance data for this ad account.
                </div>
                <button
                  type="button"
                  onClick={handleRequestAdsRead}
                  disabled={adsReadGranted}
                  className="mt-3 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                >
                  Grant ads_read Permission
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing latest ads for account <span className="font-semibold">{adAccount?.id}</span>
                </div>
                <button
                  onClick={fetchRecentAdsWithPerformance}
                  className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200"
                  disabled={loadingRecentAds}
                >
                  Refresh
                </button>
              </div>
              {loadingRecentAds ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-5 w-5 animate-spin text-green-600" />
                  <span className="text-green-700">Fetching live ad data...</span>
                </div>
              ) : adsFetchError ? (
                <div className="text-red-700">{adsFetchError}</div>
              ) : recentAds.length === 0 ? (
                <>
                 <div className="text-gray-500 mb-6">No recent ads found for this account.</div>
                  {/* Mock Live Ad Performance Section */}
                  <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-4">
                    <h4 className="font-semibold text-green-900 mb-3 flex items-center">
                      <Target className="h-5 w-5 mr-2 text-green-700" />
                      Mock Live Ad Performance (Demo)
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm border">
                        <thead>
                          <tr className="bg-green-100">
                            <th className="px-3 py-2 border-b text-left">Ad Name</th>
                            <th className="px-3 py-2 border-b text-left">Status</th>
                            <th className="px-3 py-2 border-b text-left">Impressions</th>
                            <th className="px-3 py-2 border-b text-left">Clicks</th>
                            <th className="px-3 py-2 border-b text-left">Reach</th>
                            <th className="px-3 py-2 border-b text-left">Spend (USD)</th>
                            <th className="px-3 py-2 border-b text-left">Conversions</th>
                            <th className="px-3 py-2 border-b text-left">Created</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="hover:bg-green-50">
                            <td className="px-3 py-2 border-b">Spring Sale Ad</td>
                            <td className="px-3 py-2 border-b">ACTIVE</td>
                            <td className="px-3 py-2 border-b">12,345</td>
                            <td className="px-3 py-2 border-b">678</td>
                            <td className="px-3 py-2 border-b">10,200</td>
                            <td className="px-3 py-2 border-b">$123.45</td>
                            <td className="px-3 py-2 border-b">24</td>
                            <td className="px-3 py-2 border-b">{new Date(Date.now() - 86400000).toLocaleString()}</td>
                          </tr>
                          <tr className="hover:bg-green-50">
                            <td className="px-3 py-2 border-b">Brand Awareness</td>
                            <td className="px-3 py-2 border-b">PAUSED</td>
                            <td className="px-3 py-2 border-b">8,900</td>
                            <td className="px-3 py-2 border-b">312</td>
                            <td className="px-3 py-2 border-b">7,800</td>
                            <td className="px-3 py-2 border-b">$89.00</td>
                            <td className="px-3 py-2 border-b">10</td>
                            <td className="px-3 py-2 border-b">{new Date(Date.now() - 2 * 86400000).toLocaleString()}</td>
                          </tr>
                          <tr className="hover:bg-green-50">
                            <td className="px-3 py-2 border-b">Lead Gen Test</td>
                            <td className="px-3 py-2 border-b">ACTIVE</td>
                            <td className="px-3 py-2 border-b">5,432</td>
                            <td className="px-3 py-2 border-b">210</td>
                            <td className="px-3 py-2 border-b">4,900</td>
                            <td className="px-3 py-2 border-b">$54.32</td>
                            <td className="px-3 py-2 border-b">7</td>
                            <td className="px-3 py-2 border-b">{new Date(Date.now() - 3 * 86400000).toLocaleString()}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-3 text-xs text-green-700">
                      This is a mock example. Real ad performance will appear here once you create ads.
                    </div>
                  </div>
                </>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border">
                    <thead>
                      <tr className="bg-green-50">
                        <th className="px-3 py-2 border-b text-left">Ad Name</th>
                        <th className="px-3 py-2 border-b text-left">Status</th>
                        <th className="px-3 py-2 border-b text-left">Impressions</th>
                        <th className="px-3 py-2 border-b text-left">Clicks</th>
                        <th className="px-3 py-2 border-b text-left">Reach</th>
                        <th className="px-3 py-2 border-b text-left">Spend (USD)</th>
                        <th className="px-3 py-2 border-b text-left">Conversions</th>
                        <th className="px-3 py-2 border-b text-left">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentAds.map(ad => (
                        <tr key={ad.id} className="hover:bg-green-50">
                          <td className="px-3 py-2 border-b">{ad.name || ad.id}</td>
                          <td className="px-3 py-2 border-b">{ad.status}</td>
                          <td className="px-3 py-2 border-b">{ad.impressions}</td>
                          <td className="px-3 py-2 border-b">{ad.clicks}</td>
                          <td className="px-3 py-2 border-b">{ad.reach}</td>
                          <td className="px-3 py-2 border-b">{ad.spend}</td>
                          <td className="px-3 py-2 border-b">{ad.conversions}</td>
                          <td className="px-3 py-2 border-b">{ad.created_time ? new Date(ad.created_time).toLocaleString() : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default InstagramCampaignCreator;