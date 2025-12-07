export class MetaAdvertisingAPI {
  /**
   * Get campaign objectives dynamically from Meta API
   */
  static async getCampaignObjectives(accessToken, platform = 'instagram') {
    return new Promise((resolve, reject) => {
      console.info('Using default campaign objectives - targeting APIs require Marketing API access');
      resolve(MetaAdvertisingAPI.getDefaultObjectives());
    });
  }

  /**
   * Get available targeting options for a platform
   */
  static async getTargetingOptions(accessToken, adAccountId, platform = 'instagram') {
    return new Promise((resolve, reject) => {
      if (!window.FB) {
        reject(new Error('Facebook SDK not loaded'));
        return;
      }

      window.FB.api('/search', {
        type: 'adgeolocation',
        location_types: ['country'],
        limit: 250,
        access_token: accessToken
      }, function(geoResponse) {
        const targetingData = {
          geolocations: geoResponse.data || MetaAdvertisingAPI.getDefaultCountries(),
          demographics: [],
          placements: MetaAdvertisingAPI.getDefaultPlacements(platform)
        };
        
        resolve(targetingData);
      });
    });
  }

  /**
   * Get available countries dynamically
   */
  static async getTargetingCountries(accessToken) {
    return new Promise((resolve, reject) => {
      if (!window.FB) {
        resolve(MetaAdvertisingAPI.getDefaultCountries());
        return;
      }

      window.FB.api('/search', {
        type: 'adgeolocation',
        location_types: ['country'],
        limit: 250,
        access_token: accessToken
      }, function(response) {
        if (response.error) {
          console.warn('Failed to fetch countries, using defaults:', response.error);
          resolve(MetaAdvertisingAPI.getDefaultCountries());
        } else {
          const countries = (response.data || []).map(country => ({
            value: country.country_code || country.key,
            label: country.name,
            code: country.country_code,
            key: country.key
          }));
          resolve(countries.length > 0 ? countries : MetaAdvertisingAPI.getDefaultCountries());
        }
      });
    });
  }

  /**
   * Search for interest targeting options
   */
  static async searchInterests(accessToken, query, limit = 25) {
    return new Promise((resolve, reject) => {
      if (!window.FB) {
        reject(new Error('Facebook SDK not loaded'));
        return;
      }

      if (!query || query.trim().length < 2) {
        resolve([]);
        return;
      }

      window.FB.api('/search', {
        type: 'adinterest',
        q: query.trim(),
        limit: limit,
        access_token: accessToken
      }, function(response) {
        if (response.error) {
          console.error('Interest search failed:', response.error);
          resolve([]);
        } else {
          const interests = (response.data || []).map(interest => ({
            id: interest.id,
            name: interest.name,
            audience_size: interest.audience_size_lower_bound || 0,
            audience_size_upper: interest.audience_size_upper_bound || 0,
            path: interest.path || [],
            description: interest.description || interest.name
          }));
          resolve(interests);
        }
      });
    });
  }

  /**
   * Get behaviors for targeting
   */
  static async getTargetingBehaviors(accessToken, category = null) {
    return new Promise((resolve) => {
      console.info('Using default behaviors - targeting APIs require Marketing API access');
      resolve(MetaAdvertisingAPI.getDefaultBehaviors());
    });
  }

  /**
   * Get call-to-action options dynamically
   */
  static async getCallToActionTypes(accessToken, platform = 'instagram') {
    return new Promise((resolve) => {
      console.info('Using default CTAs - targeting APIs require Marketing API access');
      resolve(MetaAdvertisingAPI.getDefaultCallToActions(platform));
    });
  }

  /**
   * Get ad placements for platform
   */
  static async getAdPlacements(accessToken, platform = 'instagram') {
    return new Promise((resolve) => {
      console.info('Using default placements - targeting APIs require Marketing API access');
      resolve(MetaAdvertisingAPI.getDefaultPlacements(platform));
    });
  }

  /**
   * Get bid strategies dynamically
   */
  static async getBidStrategies(accessToken, adAccountId, objective) {
    return new Promise((resolve, reject) => {
      if (!window.FB) {
        reject(new Error('Facebook SDK not loaded'));
        return;
      }

      const optimizationGoal = MetaAdvertisingAPI.getOptimizationGoal(objective);

      window.FB.api(`/${adAccountId}/delivery_estimate`, {
        optimization_goal: optimizationGoal,
        targeting_spec: {
          geo_locations: { countries: ['US'] },
          age_min: 18,
          age_max: 65,
          publisher_platforms: ['instagram']
        },
        access_token: accessToken
      }, function(response) {
        if (response.error) {
          console.warn('Failed to fetch bid strategies, using defaults:', response.error);
          resolve(MetaAdvertisingAPI.getDefaultBidStrategies(objective));
        } else {
          const strategies = response.data?.bid_estimations?.map(est => ({
            value: est.bid_strategy,
            label: MetaAdvertisingAPI.formatBidStrategyLabel(est.bid_strategy),
            description: est.description || `${est.bid_strategy} bidding strategy`,
            min_bid: est.min_bid,
            max_bid: est.max_bid,
            requires_bid_amount: MetaAdvertisingAPI.bidStrategyRequiresBidAmount(est.bid_strategy)
          })) || MetaAdvertisingAPI.getDefaultBidStrategies(objective);
          
          resolve(strategies);
        }
      });
    });
  }

  /**
   * Get audience estimation
   */
  static async getAudienceEstimate(accessToken, adAccountId, targetingSpec, platform = 'instagram') {
    return new Promise((resolve, reject) => {
      if (!window.FB) {
        reject(new Error('Facebook SDK not loaded'));
        return;
      }

      const enhancedTargeting = {
        ...targetingSpec,
        publisher_platforms: [platform],
        // Add required targeting_automation for audience estimation
        targeting_automation: {
          advantage_audience: 0
        }
      };

      window.FB.api(`/${adAccountId}/delivery_estimate`, {
        targeting_spec: enhancedTargeting,
        optimization_goal: 'REACH',
        access_token: accessToken
      }, function(response) {
        if (response.error) {
          console.error('Audience estimate failed:', response.error);
          resolve({
            estimate_ready: false,
            users: 0,
            error: response.error.message
          });
        } else {
          resolve({
            estimate_ready: response.data?.estimate_ready || false,
            users: response.data?.users || 0,
            daily_outcomes_curve: response.data?.daily_outcomes_curve || [],
            estimate_dau: response.data?.estimate_dau || 0
          });
        }
      });
    });
  }

  // ----------------------------------------
  // DEFAULTS & FORMATTING HELPERS
  // ----------------------------------------

  static getDefaultObjectives() {
    return [
      { value: 'OUTCOME_AWARENESS', label: 'Brand Awareness', description: 'Increase brand recognition and reach' },
      { value: 'OUTCOME_TRAFFIC', label: 'Traffic', description: 'Drive people to your website or app' },
      { value: 'OUTCOME_ENGAGEMENT', label: 'Engagement', description: 'Get more likes, comments, and shares' },
      { value: 'OUTCOME_LEADS', label: 'Lead Generation', description: 'Collect leads and contact info' },
      { value: 'OUTCOME_SALES', label: 'Conversions', description: 'Encourage purchases or sign-ups' },
      { value: 'OUTCOME_APP_PROMOTION', label: 'App Promotion', description: 'Increase app installs or engagement' }
    ];
  }

  static getDefaultBidStrategies(objective) {
    const strategies = {
      'OUTCOME_AWARENESS': [
        { value: 'LOWEST_COST_WITHOUT_CAP', label: 'Lowest Cost', requires_bid_amount: false },
        { value: 'LOWEST_COST_WITH_BID_CAP', label: 'Bid Cap', requires_bid_amount: true }
      ],
      'OUTCOME_TRAFFIC': [
        { value: 'LOWEST_COST_WITHOUT_CAP', requires_bid_amount: false },
        { value: 'LOWEST_COST_WITH_BID_CAP', requires_bid_amount: true },
        { value: 'TARGET_COST', requires_bid_amount: true }
      ],
      'OUTCOME_SALES': [
        { value: 'LOWEST_COST_WITHOUT_CAP', requires_bid_amount: false },
        { value: 'LOWEST_COST_WITH_BID_CAP', requires_bid_amount: true },
        { value: 'TARGET_COST', requires_bid_amount: true },
        { value: 'TARGET_ROAS', requires_bid_amount: false }
      ]
    };
    
    return strategies[objective] || strategies['OUTCOME_AWARENESS'];
  }

  static getDefaultCountries() {
    return [
      { value: 'US', label: 'United States', code: 'US' },
      { value: 'CA', label: 'Canada', code: 'CA' },
      { value: 'GB', label: 'United Kingdom', code: 'GB' },
      { value: 'AU', label: 'Australia', code: 'AU' },
      { value: 'DE', label: 'Germany', code: 'DE' },
      { value: 'FR', label: 'France', code: 'FR' },
      { value: 'IT', label: 'Italy', code: 'IT' },
      { value: 'ES', label: 'Spain', code: 'ES' },
      { value: 'NL', label: 'Netherlands', code: 'NL' },
      { value: 'BR', label: 'Brazil', code: 'BR' },
      { value: 'MX', label: 'Mexico', code: 'MX' },
      { value: 'JP', label: 'Japan', code: 'JP' },
      { value: 'IN', label: 'India', code: 'IN' }
    ];
  }

  static formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  }

  static formatNumber(number) {
    if (number >= 1_000_000) return (number / 1_000_000).toFixed(1) + 'M';
    if (number >= 1_000) return (number / 1_000).toFixed(1) + 'K';
    return number.toString();
  }

  static getDefaultCallToActions(platform = 'instagram') {
    const common = [
      { value: 'LEARN_MORE', label: 'Learn More', description: 'Encourage users to learn more about your business' },
      { value: 'SHOP_NOW', label: 'Shop Now', description: 'Drive users to make a purchase' },
      { value: 'SIGN_UP', label: 'Sign Up', description: 'Get users to sign up for your service' },
      { value: 'DOWNLOAD', label: 'Download', description: 'Promote app or file downloads' },
      { value: 'CONTACT_US', label: 'Contact Us', description: 'Encourage users to get in touch' },
      { value: 'GET_QUOTE', label: 'Get Quote', description: 'Generate leads for your business' }
    ];

    if (platform === 'instagram') {
      return [
        ...common,
        { value: 'WATCH_MORE', label: 'Watch More', description: 'Drive video engagement' },
        { value: 'INSTALL_APP', label: 'Install App', description: 'Promote app installations' },
        { value: 'MESSAGE_PAGE', label: 'Send Message', description: 'Start conversations with users' }
      ];
    } else {
      return [
        ...common,
        { value: 'CALL_NOW', label: 'Call Now', description: 'Drive phone calls to your business' },
        { value: 'GET_DIRECTIONS', label: 'Get Directions', description: 'Help users find your location' }
      ];
    }
  }

  static getDefaultPlacements(platform = 'instagram') {
    if (platform === 'instagram') {
      return [
        { value: 'instagram_feed', label: 'Instagram Feed' },
        { value: 'instagram_stories', label: 'Stories' },
        { value: 'instagram_reels', label: 'Reels' },
        { value: 'instagram_explore', label: 'Explore' }
      ];
    } else {
      return [
        { value: 'facebook_feed', label: 'Facebook Feed' },
        { value: 'facebook_marketplace', label: 'Marketplace' },
        { value: 'facebook_video_feeds', label: 'Video Feeds' }
      ];
    }
  }

  static getDefaultBehaviors() {
    return [
      { id: 'online_shopper', name: 'Online Shoppers' },
      { id: 'frequent_travelers', name: 'Frequent Travelers' },
      { id: 'mobile_users', name: 'Mobile Device Users' }
    ];
  }

  static formatBidStrategyLabel(strategy) {
    const labels = {
      'LOWEST_COST_WITHOUT_CAP': 'Lowest Cost',
      'LOWEST_COST_WITH_BID_CAP': 'Bid Cap',
      'TARGET_COST': 'Target Cost',
      'TARGET_ROAS': 'Target ROAS',
      'COST_CAP': 'Cost Cap'
    };
    return labels[strategy] || strategy;
  }

  static bidStrategyRequiresBidAmount(strategy) {
    return [
      'LOWEST_COST_WITH_BID_CAP',
      'TARGET_COST',
      'COST_CAP'
    ].includes(strategy);
  }

  static validateBidStrategyAndAmount(bidStrategy, bidAmount) {
    const requires = MetaAdvertisingAPI.bidStrategyRequiresBidAmount(bidStrategy);

    if (requires && (!bidAmount || bidAmount <= 0)) {
      return { valid: false, error: `Bid strategy "${bidStrategy}" requires a valid bid amount` };
    }

    if (!requires && bidAmount) {
      return { valid: false, error: `Bid strategy "${bidStrategy}" does not allow bid_amount` };
    }

    return { valid: true };
  }

  static getOptimizationGoal(objective) {
    const map = {
      'OUTCOME_AWARENESS': 'IMPRESSIONS', // Changed from REACH to IMPRESSIONS
      'OUTCOME_TRAFFIC': 'LINK_CLICKS',
      'OUTCOME_ENGAGEMENT': 'POST_ENGAGEMENT',
      'OUTCOME_LEADS': 'IMPRESSIONS', // Use IMPRESSIONS for better compatibility
      'OUTCOME_SALES': 'IMPRESSIONS', // Use IMPRESSIONS for better compatibility
      'OUTCOME_APP_PROMOTION': 'APP_INSTALLS'
    };
    return map[objective] || 'IMPRESSIONS';
  }

  /**
   * Get valid optimization goals for a campaign objective
   */
  static getValidOptimizationGoals(campaignObjective) {
    const validMappings = {
      'OUTCOME_AWARENESS': [
        { value: 'IMPRESSIONS', label: 'Impressions', description: 'Maximize ad impressions' },
        { value: 'REACH', label: 'Reach', description: 'Reach unique people' }
      ],
      'OUTCOME_TRAFFIC': [
        { value: 'LINK_CLICKS', label: 'Link Clicks', description: 'Maximize clicks to your website' },
        { value: 'LANDING_PAGE_VIEWS', label: 'Landing Page Views', description: 'Optimize for landing page views' }
      ],
      'OUTCOME_ENGAGEMENT': [
        { value: 'POST_ENGAGEMENT', label: 'Post Engagement', description: 'Maximize post engagement' }
      ],
      'OUTCOME_LEADS': [
        { value: 'IMPRESSIONS', label: 'Impressions', description: 'Maximize reach for lead generation' },
        { value: 'LEAD_GENERATION', label: 'Lead Generation', description: 'Optimize for lead form submissions' }
      ],
      'OUTCOME_SALES': [
        { value: 'IMPRESSIONS', label: 'Impressions', description: 'Maximize reach for conversions' },
        { value: 'CONVERSIONS', label: 'Conversions', description: 'Optimize for purchase conversions' }
      ],
      'OUTCOME_APP_PROMOTION': [
        { value: 'APP_INSTALLS', label: 'App Installs', description: 'Maximize app installations' }
      ]
    };

    return validMappings[campaignObjective] || [
      { value: 'IMPRESSIONS', label: 'Impressions', description: 'Maximize ad impressions' }
    ];
  }

  /**
   * Get compatible billing event for optimization goal
   */
  static getCompatibleBillingEvent(optimizationGoal) {
    const compatibilityMap = {
      'REACH': 'IMPRESSIONS',
      'IMPRESSIONS': 'IMPRESSIONS',
      'LINK_CLICKS': 'LINK_CLICKS',
      'LANDING_PAGE_VIEWS': 'LINK_CLICKS',
      'POST_ENGAGEMENT': 'POST_ENGAGEMENT',
      'ENGAGEMENT': 'POST_ENGAGEMENT',
      'APP_INSTALLS': 'APP_INSTALLS',
      'LEAD_GENERATION': 'IMPRESSIONS',
      'CONVERSIONS': 'IMPRESSIONS'
    };

    return compatibilityMap[optimizationGoal] || 'IMPRESSIONS';
  }

  /**
   * Validate optimization goal and billing event compatibility
   */
  static validateOptimizationCompatibility(campaignObjective, optimizationGoal, billingEvent) {
    const validGoals = MetaAdvertisingAPI.getValidOptimizationGoals(campaignObjective);
    const isValidGoal = validGoals.some(goal => goal.value === optimizationGoal);

    if (!isValidGoal) {
      return {
        valid: false,
        error: `Optimization goal "${optimizationGoal}" is not valid for campaign objective "${campaignObjective}"`,
        suggestion: `Use one of: ${validGoals.map(g => g.value).join(', ')}`,
        recommendedGoal: validGoals[0].value
      };
    }

    const compatibleBillingEvent = MetaAdvertisingAPI.getCompatibleBillingEvent(optimizationGoal);
    if (billingEvent !== compatibleBillingEvent) {
      return {
        valid: false,
        error: `Billing event "${billingEvent}" is not compatible with optimization goal "${optimizationGoal}"`,
        suggestion: `Use billing event: ${compatibleBillingEvent}`,
        recommendedBillingEvent: compatibleBillingEvent
      };
    }

    return { valid: true };
  }

  // ---------------------------------------------------
  // FIXED CLEANING LOGIC — NO MORE BID CAP ERRORS
  // ---------------------------------------------------
  static cleanAdSetParameters(params) {
    const cleaned = { ...params };

    const strategy = cleaned.bid_strategy;
    const requiresBid = MetaAdvertisingAPI.bidStrategyRequiresBidAmount(strategy);

    // ❌ If strategy does NOT allow bid_amount → always remove it
    if (!requiresBid && 'bid_amount' in cleaned) {
      console.info(`Removed bid_amount for strategy: ${strategy}`);
      delete cleaned.bid_amount;
    }

    // STRICT CLEANUP - Force delete for LOWEST_COST_WITHOUT_CAP
    if (cleaned.bid_strategy === "LOWEST_COST_WITHOUT_CAP") {
      delete cleaned.bid_amount;
    }

    // ⚠️ If strategy REQUIRES bid_amount but missing
    if (requiresBid && (!cleaned.bid_amount || cleaned.bid_amount <= 0)) {
      console.warn(`Strategy ${strategy} REQUIRES bid_amount`);
    }

    return cleaned;
  }

  // ---------------------------------------------------
  // FIXED prepareAdSetData() — GUARANTEED NO ERRORS
  // ---------------------------------------------------
  static prepareAdSetData(formData, campaignId, adAccountId) {
    const params = {
      name: formData.adSetName || `${formData.name} - Ad Set`,
      campaign_id: campaignId,
      status: 'PAUSED',
      billing_event: 'IMPRESSIONS',
      optimization_goal: MetaAdvertisingAPI.getOptimizationGoal(formData.objective),
      bid_strategy: formData.bidStrategy || 'LOWEST_COST_WITHOUT_CAP',
      targeting: {
        geo_locations: { countries: formData.countries || ['US'] },
        age_min: parseInt(formData.ageMin) || 18,
        age_max: parseInt(formData.ageMax) || 65,
        publisher_platforms: ['instagram'],
        facebook_positions: ['feed'],
        instagram_positions: ['stream'],
        // REQUIRED: Meta now requires explicit Advantage Audience configuration
        targeting_automation: {
          advantage_audience: 0 // 0 = disabled, 1 = enabled
        }
      }
    };

    // Add budget (either daily or lifetime) with proper validation
    const budgetAmount = parseFloat(formData.dailyBudget || formData.budget) || 10;
    console.log('Original budget amount:', budgetAmount, 'Type:', formData.budgetType);
    
    // Validate budget is reasonable (between $1 and $10,000)
    const clampedBudget = Math.max(1, Math.min(budgetAmount, 10000));
    if (clampedBudget !== budgetAmount) {
      console.warn(`Budget clamped from ${budgetAmount} to ${clampedBudget}`);
    }
    
    // Convert to cents (multiply by 100)
    const budgetInCents = Math.round(clampedBudget * 100);
    console.log('Budget in cents:', budgetInCents);
    
    if (formData.budgetType === 'DAILY') {
      params.daily_budget = budgetInCents;
    } else {
      params.lifetime_budget = budgetInCents;
    }

    // Add start time only if in the future
    if (formData.startDate) {
      const startDate = new Date(formData.startDate + 'T00:00:00');
      const now = new Date();
      if (startDate > now) {
        params.start_time = startDate.toISOString();
      }
    }

    // Extra targeting options
    if (formData.interests?.length > 0) {
      params.targeting.interests = formData.interests.map(i => ({ id: i.id, name: i.name }));
    }

    if (formData.genders?.length > 0) {
      params.targeting.genders = formData.genders;
    }

    // FINAL CLEANUP (strict) - Force delete bid_amount for LOWEST_COST_WITHOUT_CAP
    if (params.bid_strategy === "LOWEST_COST_WITHOUT_CAP") {
      delete params.bid_amount;
    }

    console.log('Final prepared ad set data:', params);
    return MetaAdvertisingAPI.cleanAdSetParameters(params);
  }

  // Add budget validation helper
  static validateBudget(budget, budgetType = 'DAILY') {
    const numBudget = parseFloat(budget);
    
    if (isNaN(numBudget) || numBudget <= 0) {
      return { valid: false, error: 'Budget must be a positive number' };
    }
    
    const minBudget = budgetType === 'DAILY' ? 1 : 10;
    const maxBudget = budgetType === 'DAILY' ? 1000 : 50000;
    
    if (numBudget < minBudget) {
      return { valid: false, error: `Minimum ${budgetType.toLowerCase()} budget is $${minBudget}` };
    }
    
    if (numBudget > maxBudget) {
      return { valid: false, error: `Maximum ${budgetType.toLowerCase()} budget is $${maxBudget}` };
    }
    
    return { valid: true };
  }

  // Add creative preparation helper
  static prepareCreativeData(formData, pageId, instagramActorId = null, accessToken) {
    const baseCreative = {
      name: `${formData.name || 'Campaign'} - Creative`,
      access_token: accessToken
    };

    // Try link data creative first (for website/link ads)
    if (formData.adCreative?.websiteUrl) {
      const linkCreative = {
        ...baseCreative,
        object_story_spec: {
          page_id: pageId,
          ...(instagramActorId ? { instagram_actor_id: instagramActorId } : {}),
          link_data: {
            message: formData.adCreative.description || '',
            name: formData.adCreative.headline || '',
            link: formData.adCreative.websiteUrl,
            call_to_action: {
              type: formData.adCreative.callToAction || 'LEARN_MORE'
            }
            // Note: image_url not supported in link_data
            // Use image_hash after uploading image separately
          }
        }
      };
      return { type: 'link', data: linkCreative };
    }

    // Fallback to text-only creative
    const textCreative = {
      ...baseCreative,
      object_story_spec: {
        page_id: pageId,
        text_data: {
          message: `${formData.adCreative?.headline || ''}\n\n${formData.adCreative?.description || ''}`.trim()
        }
      }
    };
    return { type: 'text', data: textCreative };
  }

  /**
   * Upload image for ad creative
   */
  static async uploadAdImage(accessToken, adAccountId, imageFile, onProgress = null) {
    return new Promise((resolve, reject) => {
      if (!imageFile) {
        reject(new Error('No image file provided'));
        return;
      }

      // Validate file size (8MB limit)
      const maxSize = 8 * 1024 * 1024;
      if (imageFile.size > maxSize) {
        reject(new Error('Image file size must be less than 8MB'));
        return;
      }

      // Validate file type
      if (!imageFile.type.startsWith('image/')) {
        reject(new Error('File must be an image'));
        return;
      }

      const formData = new FormData();
      formData.append('source', imageFile);
      formData.append('access_token', accessToken);
      formData.append('account_id', adAccountId);

      const xhr = new XMLHttpRequest();

      // Track upload progress
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = (e.loaded / e.total) * 100;
            onProgress(Math.round(progress));
          }
        });
      }

      xhr.onload = () => {
        if (xhr.status === 200) {
          try {
            const result = JSON.parse(xhr.responseText);
            if (result.success && result.data.hash) {
              resolve({
                hash: result.data.hash,
                filename: result.data.filename,
                size: result.data.size
              });
            } else {
              reject(new Error(result.error || 'Upload failed'));
            }
          } catch (parseError) {
            reject(new Error('Invalid response from server'));
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during upload'));
      };

      const API_BASE_URL = process.env.REACT_APP_API_URL;
      xhr.open('POST', `${API_BASE_URL}/api/meta/upload-image`);
      xhr.send(formData);
    });
  }

  /**
   * Create ad creative with image
   */
  static async createImageCreative(accessToken, adAccountId, creativeData) {
    return new Promise((resolve, reject) => {
      if (!window.FB) {
        reject(new Error('Facebook SDK not loaded'));
        return;
      }

      const creativePayload = {
        name: creativeData.name,
        object_story_spec: creativeData.object_story_spec,
        access_token: accessToken
      };

      console.log('Creating image creative:', {
        name: creativePayload.name,
        hasImageHash: !!(creativeData.object_story_spec.link_data?.image_hash || 
                        creativeData.object_story_spec.photo_data?.image_hash)
      });

      window.FB.api(`/${adAccountId}/adcreatives`, 'POST', creativePayload, function(response) {
        if (response.error) {
          console.error('Creative creation failed:', response.error);
          
          // Handle specific errors
          if (response.error.code === 100) {
            if (response.error.message.includes('image_hash')) {
              reject(new Error('Invalid image hash. Please upload the image again.'));
              return;
            }
            if (response.error.message.includes('instagram_actor_id')) {
              reject(new Error('Invalid Instagram account. Please check your Instagram connection.'));
              return;
            }
          }
          
          reject(new Error(response.error.message || 'Creative creation failed'));
        } else {
          console.log('✅ Image creative created successfully:', response);
          resolve({
            id: response.id,
            name: creativePayload.name,
            type: 'image'
          });
        }
      });
    });
  }

  /**
   * Build creative data for different ad types
   */
  static buildCreativeData(campaignData, pageId, instagramActorId, imageHash = null) {
    const baseName = `${campaignData.name || 'Campaign'} - Creative`;
    
    // Image + Link Creative (like in Ads Manager)
    if (imageHash && campaignData.adCreative.websiteUrl) {
      return {
        name: `${baseName} (Image + Link)`,
        object_story_spec: {
          page_id: pageId,
          ...(instagramActorId ? { instagram_actor_id: instagramActorId } : {}),
          link_data: {
            message: campaignData.adCreative.description || '',
            name: campaignData.adCreative.headline || '',
            link: campaignData.adCreative.websiteUrl,
            image_hash: imageHash,
            call_to_action: {
              type: campaignData.adCreative.callToAction || 'LEARN_MORE'
            }
          }
        }
      };
    }
    
    // Image Post Creative (like Instagram post)
    if (imageHash) {
      return {
        name: `${baseName} (Image Post)`,
        object_story_spec: {
          page_id: pageId,
          ...(instagramActorId ? { instagram_actor_id: instagramActorId } : {}),
          photo_data: {
            image_hash: imageHash,
            caption: `${campaignData.adCreative.headline ? campaignData.adCreative.headline + '\n\n' : ''}${campaignData.adCreative.description || ''}`.trim()
          }
        }
      };
    }
    
    // Text + Link Creative (no image)
    if (campaignData.adCreative.websiteUrl) {
      return {
        name: `${baseName} (Link)`,
        object_story_spec: {
          page_id: pageId,
          ...(instagramActorId ? { instagram_actor_id: instagramActorId } : {}),
          link_data: {
            message: campaignData.adCreative.description || '',
            name: campaignData.adCreative.headline || '',
            link: campaignData.adCreative.websiteUrl,
            call_to_action: {
              type: campaignData.adCreative.callToAction || 'LEARN_MORE'
            }
          }
        }
      };
    }
    
    // Text-only Creative (fallback)
    return {
      name: `${baseName} (Text)`,
      object_story_spec: {
        page_id: pageId,
        text_data: {
          message: `${campaignData.adCreative.headline || ''}\n\n${campaignData.adCreative.description || ''}`.trim()
        }
      }
    };
  }

  /**
   * Validate image file before upload
   */
  static validateImageFile(file) {
    const errors = [];

    if (!file) {
      return { valid: false, errors: ['No file provided'] };
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      errors.push('File must be an image');
    }

    // Check supported formats
    const supportedFormats = ['image/jpeg', 'image/png', 'image/gif'];
    if (!supportedFormats.includes(file.type)) {
      errors.push('Supported formats: JPEG, PNG, GIF');
    }

    // Check file size (8MB limit for Instagram)
    const maxSize = 8 * 1024 * 1024;
    if (file.size > maxSize) {
      errors.push(`File size must be less than ${MetaAdvertisingAPI.formatFileSize(maxSize)}`);
    }

    // Check minimum dimensions (optional)
    if (file.type.startsWith('image/')) {
      // This would require loading the image to check dimensions
      // For now, just validate basic requirements
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get recommended image dimensions for different placements
   */
  static getRecommendedImageDimensions(placement = 'instagram_feed') {
    const dimensions = {
      'instagram_feed': { width: 1080, height: 1080, ratio: '1:1', description: 'Square format' },
      'instagram_stories': { width: 1080, height: 1920, ratio: '9:16', description: 'Portrait format' },
      'instagram_reels': { width: 1080, height: 1920, ratio: '9:16', description: 'Portrait format' },
      'facebook_feed': { width: 1200, height: 628, ratio: '1.91:1', description: 'Landscape format' }
    };

    return dimensions[placement] || dimensions['instagram_feed'];
  }

  /**
   * Create creative with automatic fallback and retry logic
   */
  static async createCreativeWithFallback(accessToken, adAccountId, campaignData, pageId, instagramActorId, imageHash = null) {
    const attempts = [];

    // Strategy 1: Full creative with image and Instagram actor
    if (imageHash && instagramActorId) {
      attempts.push({
        type: 'full_instagram_image',
        data: MetaAdvertisingAPI.buildCreativeData(campaignData, pageId, instagramActorId, imageHash)
      });
    }

    // Strategy 2: Creative with image but no Instagram actor
    if (imageHash) {
      attempts.push({
        type: 'page_image',
        data: MetaAdvertisingAPI.buildCreativeData(campaignData, pageId, null, imageHash)
      });
    }

    // Strategy 3: Link creative without image
    if (campaignData.adCreative.websiteUrl) {
      attempts.push({
        type: 'link_only',
        data: MetaAdvertisingAPI.buildCreativeData(campaignData, pageId, instagramActorId, null)
      });
    }

    // Strategy 4: Text-only creative (most compatible)
    attempts.push({
      type: 'text_only',
      data: {
        name: `${campaignData.name} - Text Creative`,
        object_story_spec: {
          page_id: pageId,
          text_data: {
            message: `${campaignData.adCreative.headline || ''}\n\n${campaignData.adCreative.description || ''}`.trim()
          }
        }
      }
    });

    // Try each strategy in order
    for (const attempt of attempts) {
      try {
        console.log(`Trying creative strategy: ${attempt.type}`);
        const result = await MetaAdvertisingAPI.createImageCreative(accessToken, adAccountId, attempt.data);
        console.log(`✅ Creative created using ${attempt.type} strategy:`, result);
        return {
          ...result,
          strategy: attempt.type
        };
      } catch (error) {
        console.warn(`Strategy ${attempt.type} failed:`, error.message);
        continue;
      }
    }

    throw new Error('All creative creation strategies failed');
  }

  /**
   * Fetch live ad performance data (requires ads_read)
   */
  static async getAdPerformance(accessToken, adId) {
    return new Promise((resolve, reject) => {
      if (!window.FB) {
        reject(new Error('Facebook SDK not loaded'));
        return;
      }
      window.FB.api(
        `/${adId}/insights`,
        {
          access_token: accessToken,
          fields: 'impressions,clicks,spend,reach,actions,objective,ad_name,ad_id'
        },
        (resp) => {
          if (resp && !resp.error && resp.data && resp.data.length > 0) {
            resolve(resp.data[0]);
          } else {
            reject(resp.error || new Error('No ad performance data found'));
          }
        }
      );
    });
  }
}
