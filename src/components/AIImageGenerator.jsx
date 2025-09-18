import React, { useState, useEffect } from 'react';
import { Sparkles, Download, Copy, RefreshCw, AlertCircle, ImageIcon, Zap, CheckCircle, Settings, Save, Upload, X, Image, Wand2 } from 'lucide-react';

const AIImageGenerator = ({ 
  onImageGenerated, 
  contentItemId = null, 
  customerId = '', 
  customerName = '', 
  customerEmail = '',
  initialPrompt = '',
  showSaveOptions = true 
}) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('gemini');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inputImage, setInputImage] = useState(null);
  const [inputImagePreview, setInputImagePreview] = useState('');
  const [generationMode, setGenerationMode] = useState('text-to-image');
  const [enhancedPrompt, setEnhancedPrompt] = useState('');
  const [showEnhancedPrompt, setShowEnhancedPrompt] = useState(false);
  
  // Advanced options with better defaults for quality
  const [options, setOptions] = useState({
    width: 1024,
    height: 1024,
    guidance: 12, // Higher for better quality
    steps: 40, // More steps for better quality
    negativePrompt: 'blurry, low quality, distorted, ugly, deformed, pixelated, artifacts, noise, bad anatomy, watermark, signature, text overlay',
    strength: 0.7, // Better balance for transformations
    style: 'professional', // New style option
    quality: 'premium' // New quality option
  });

  // Quality presets
  const qualityPresets = {
    draft: {
      steps: 20,
      guidance: 7,
      quality: 'standard'
    },
    standard: {
      steps: 30,
      guidance: 10,
      quality: 'premium'
    },
    premium: {
      steps: 50,
      guidance: 15,
      quality: 'ultra'
    }
  };

  // Style presets optimized for professional results
  const stylePresets = {
    professional: 'professional photography, high quality, studio lighting, crisp details, commercial grade',
    marketing: 'marketing material, brand focused, clean design, professional presentation, commercial photography',
    social: 'social media optimized, eye-catching, vibrant, engaging, shareable content',
    festive: 'festive celebration, cultural elements, traditional colors, joyful atmosphere, ceremonial',
    luxury: 'luxury branding, premium quality, elegant design, sophisticated, high-end',
    modern: 'modern design, contemporary, sleek, minimalist, cutting-edge',
    creative: 'creative artwork, artistic expression, unique style, innovative design'
  };

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/ai/providers`);
        const data = await response.json();
        console.log('Available AI providers:', data.providers);
        
        setProviders(data.providers || []);
        if (data.providers?.length > 0) {
          // Prioritize Gemini for best results
          const preferredProvider = data.providers.includes('gemini') ? 'gemini' :
                                   data.providers.includes('stability') ? 'stability' :
                                   data.providers.includes('replicate') ? 'replicate' : 
                                   data.providers[0];
          setSelectedProvider(preferredProvider);
        } else {
          setError('No AI providers are available. Please check your API keys in the .env file.');
        }
      } catch (err) {
        console.error('Failed to fetch AI providers:', err);
        setError('Failed to connect to AI services. Please try again later.');
        setProviders([]);
      }
    };
    fetchProviders();
  }, []);

  const enhancePrompt = async () => {
    if (!prompt.trim()) return;
    
    try {
      setLoading(true);
      
      // Enhanced prompt engineering for better results
      const enhancementRequest = {
        prompt: prompt.trim(),
        style: options.style,
        context: generationMode === 'image-to-image' ? 'transformation' : 'generation',
        quality: options.quality
      };

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/ai/enhance-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enhancementRequest)
      });
      
      const data = await response.json();
      if (data.enhancedPrompt) {
        setEnhancedPrompt(data.enhancedPrompt);
        setPrompt(data.enhancedPrompt);
        setShowEnhancedPrompt(true);
      }
    } catch (err) {
      console.error('Failed to enhance prompt:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file');
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        setError('Image must be smaller than 10MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Data = e.target.result;
        setInputImage(base64Data);
        setInputImagePreview(base64Data);
        setGenerationMode('image-to-image');
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const removeInputImage = () => {
    setInputImage(null);
    setInputImagePreview('');
    setGenerationMode('text-to-image');
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setImageUrl('');
    setError('');
    setShowEnhancedPrompt(false);

    try {
      if (providers.length === 0) {
        throw new Error('No AI providers are available. Please check your API configuration.');
      }

      // Build enhanced request with quality optimizations
      const requestBody = {
        prompt: prompt.trim(),
        provider: selectedProvider,
        customerId,
        customerName,
        customerEmail,
        contentItemId,
        ...options,
        // Quality enhancements
        enhanceQuality: true,
        optimizeForCommercial: true,
        professionalGrade: true
      };

      // Add input image if in image-to-image mode
      if (generationMode === 'image-to-image' && inputImage) {
        requestBody.inputImage = inputImage;
        requestBody.transformationMode = 'professional';
      }

      // Provider-specific quality optimizations
      if (selectedProvider === 'gemini') {
        requestBody.useVisionAnalysis = true;
        requestBody.detailedPrompting = true;
        requestBody.commercialQuality = true;
      } else if (selectedProvider === 'stability') {
        requestBody.engine = 'stable-diffusion-xl-1024-v1-0';
        requestBody.style_preset = 'commercial';
      } else if (selectedProvider === 'replicate') {
        requestBody.model = 'flux-1-1-pro';
        requestBody.safety_tolerance = 5;
      }

      console.log('🎨 Generating premium quality image with request:', { 
        ...requestBody, 
        inputImage: inputImage ? '[IMAGE_DATA]' : null 
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, selectedProvider === 'gemini' ? 180000 : // 3 minutes for Gemini
         selectedProvider === 'stability' ? 120000 : // 2 minutes for Stability
         selectedProvider === 'replicate' ? 300000 : 60000); // 5 minutes for Replicate

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Image generation failed');
      }

      const result = await response.json();
      
      if (result.success) {
        setImageUrl(result.imageUrl);
        setError('');
        
        // Show enhanced prompt info
        if (result.enhancedPrompt) {
          setEnhancedPrompt(result.enhancedPrompt);
          setShowEnhancedPrompt(true);
        }
        
        // Show quality info
        if (result.provider === 'gemini') {
          const qualityMessage = result.mode === 'image-to-image' 
            ? `✨ Professional Quality: Gemini analyzed your image and created an optimized transformation using ${result.actualGenerator}` 
            : `✨ Professional Quality: Gemini enhanced your prompt for premium results using ${result.actualGenerator}`;
          
          setError(qualityMessage);
          setTimeout(() => setError(''), 8000);
        }
        
        if (onImageGenerated) {
          onImageGenerated(result.imageUrl, result.isBase64);
        }
      } else {
        setError(result.message || 'Failed to generate image');
      }
      
    } catch (err) {
      console.error('Generation error:', err);
      let errorMessage = err.message || 'Something went wrong';
      
      if (err.name === 'AbortError') {
        errorMessage = 'Generation timed out. For complex requests, try using Gemini provider for best results.';
      } else if (errorMessage.includes('authentication')) {
        errorMessage = `${selectedProvider.toUpperCase()} API authentication failed. Please check your API key.`;
      } else if (errorMessage.includes('insufficient credits')) {
        errorMessage = `${selectedProvider.toUpperCase()} account has insufficient credits. Please add credits or try Gemini provider.`;
      }
      
      setError(errorMessage);

      if (providers.length > 1 && !errorMessage.includes('No AI providers')) {
        const recommendedProvider = providers.includes('gemini') ? 'Gemini (recommended for best quality)' :
                                   providers.includes('stability') ? 'Stability AI' :
                                   providers.includes('replicate') ? 'Replicate' : 
                                   'available provider';
        setError(errorMessage + ` Try switching to ${recommendedProvider}.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const saveToMediaLibrary = async () => {
    if (!imageUrl || !customerId) return;
    
    setSaving(true);
    try {
      let base64Data = '';
      if (imageUrl.startsWith('data:')) {
        base64Data = imageUrl.split(',')[1];
      } else {
        const imageResponse = await fetch(imageUrl);
        const blob = await imageResponse.blob();
        const buffer = await blob.arrayBuffer();
        base64Data = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/media-library/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: `ai-premium-${Date.now()}.png`,
          contentType: 'image/png',
          base64Data,
          tags: ['ai-generated', selectedProvider, 'premium-quality'],
          type: 'image',
          customer_id: customerId,
          customer_name: customerName,
          customer_email: customerEmail,
          metadata: {
            provider: selectedProvider,
            quality: options.quality,
            style: options.style,
            enhanced: !!enhancedPrompt
          }
        })
      });

      if (response.ok) {
        alert('Premium quality image saved to media library successfully!');
      } else {
        throw new Error('Failed to save to media library');
      }
    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to save image to media library');
    } finally {
      setSaving(false);
    }
  };

  const copyPrompt = async () => {
    const textToCopy = enhancedPrompt || prompt;
    if (textToCopy) {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadImage = async () => {
    if (!imageUrl) return;
    
    try {
      let blob;
      let filename = `premium-ai-image-${Date.now()}.png`;
      
      if (imageUrl.startsWith('data:')) {
        const response = await fetch(imageUrl);
        blob = await response.blob();
      } else {
        try {
          const response = await fetch(imageUrl, {
            mode: 'cors',
            headers: { 'Accept': 'image/*' }
          });
          
          if (!response.ok) throw new Error('Network response was not ok');
          blob = await response.blob();
        } catch (corsError) {
          const response = await fetch(`${process.env.REACT_APP_API_URL}/api/proxy-image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl })
          });
          
          if (!response.ok) throw new Error('Proxy fetch failed');
          blob = await response.blob();
        }
      }
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
      
    } catch (err) {
      console.error('Download error:', err);
      window.open(imageUrl, '_blank');
      setError('Download failed. Image opened in new tab for manual download.');
    }
  };

  const clearAll = () => {
    setPrompt('');
    setImageUrl('');
    setError('');
    setEnhancedPrompt('');
    setShowEnhancedPrompt(false);
  };

  const applyQualityPreset = (presetName) => {
    setOptions(prev => ({
      ...prev,
      ...qualityPresets[presetName],
      quality: presetName
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 rounded-full shadow-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Professional AI Image Generator
            </h1>
          </div>
          <p className="text-gray-600 text-lg">Create premium quality visuals with Gemini-level intelligence</p>
        </div>

        {/* Quality Presets */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-purple-600" />
            Quality Presets
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(qualityPresets).map(([preset, config]) => (
              <button
                key={preset}
                onClick={() => applyQualityPreset(preset)}
                className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  options.quality === preset
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 hover:border-purple-300 text-gray-700'
                }`}
              >
                <div className="font-semibold capitalize">{preset}</div>
                <div className="text-xs opacity-75 mt-1">
                  {config.steps} steps • {config.guidance} guidance
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="space-y-6">
            {/* Generation Mode Toggle */}
            <div className="flex gap-4 p-1 bg-gray-100 rounded-lg">
              <button
                onClick={() => {
                  setGenerationMode('text-to-image');
                  removeInputImage();
                }}
                className={`flex-1 py-3 px-4 rounded-md font-medium transition-all ${
                  generationMode === 'text-to-image'
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <ImageIcon className="w-4 h-4 inline mr-2" />
                Text to Image
              </button>
              <button
                onClick={() => setGenerationMode('image-to-image')}
                className={`flex-1 py-3 px-4 rounded-md font-medium transition-all ${
                  generationMode === 'image-to-image'
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Image className="w-4 h-4 inline mr-2" />
                Image to Image
              </button>
            </div>

            {/* Image Upload Section */}
            {generationMode === 'image-to-image' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  <Upload className="w-4 h-4 inline mr-2" />
                  Upload Image to Transform
                </label>
                
                {!inputImagePreview ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-400 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 font-medium">Click to upload an image</p>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG, WebP up to 10MB</p>
                    </label>
                  </div>
                ) : (
                  <div className="relative">
                    <img
                      src={inputImagePreview}
                      alt="Input for transformation"
                      className="w-full max-h-64 object-contain rounded-xl border shadow-sm"
                    />
                    <button
                      onClick={removeInputImage}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Provider Selection */}
            {providers.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  AI Provider
                </label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                >
                  {providers.map(provider => (
                    <option key={provider} value={provider}>
                      {provider === 'gemini' && '🧠 Gemini 2.5 Flash (Recommended for Best Quality)'}
                      {provider === 'stability' && '🎨 Stability AI (Professional Grade)'}
                      {provider === 'replicate' && '⚡ Replicate Flux (Fast & High Quality)'}
                      {provider === 'huggingface' && '🤗 Hugging Face (Free Option)'}
                      {provider === 'openai' && '🔥 OpenAI DALL-E (Creative)'}
                      {!['gemini', 'stability', 'replicate', 'huggingface', 'openai'].includes(provider) && 
                        provider.charAt(0).toUpperCase() + provider.slice(1)}
                    </option>
                  ))}
                </select>
                <div className="mt-2 text-xs text-gray-600">
                  {selectedProvider === 'gemini' && (
                    <span className="text-blue-600 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Premium quality with intelligent image analysis and prompt enhancement
                    </span>
                  )}
                  {selectedProvider === 'stability' && (
                    <span className="text-purple-600">Professional-grade results with Stable Diffusion XL</span>
                  )}
                  {selectedProvider === 'replicate' && (
                    <span className="text-green-600">High quality with Flux 1.1 Pro model</span>
                  )}
                </div>
              </div>
            )}

            {/* Style Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Style Preset
              </label>
              <select
                value={options.style}
                onChange={(e) => setOptions(prev => ({...prev, style: e.target.value}))}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
              >
                {Object.entries(stylePresets).map(([style, description]) => (
                  <option key={style} value={style}>
                    {style.charAt(0).toUpperCase() + style.slice(1)} - {description.split(',')[0]}
                  </option>
                ))}
              </select>
            </div>

            {/* Text Prompt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <ImageIcon className="w-4 h-4 inline mr-2" />
                {generationMode === 'image-to-image' ? 'Describe how to transform the image' : 'Describe your image'}
              </label>
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                    generationMode === 'image-to-image'
                      ? "e.g., Transform this into a premium Diwali promotional poster with elegant golden decorations and festive lighting..."
                      : "e.g., Professional Diwali celebration poster for ice cream parlor, elegant design with traditional decorations, premium quality, commercial grade..."
                  }
                  className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 resize-none"
                  rows={5}
                  maxLength={2000}
                />
                <div className="absolute bottom-3 right-3 flex gap-2">
                  <button
                    onClick={enhancePrompt}
                    disabled={!prompt.trim() || loading}
                    className="p-2 text-gray-400 hover:text-purple-600 transition-colors disabled:opacity-50"
                    title="Enhance prompt with AI"
                  >
                    <Zap className="w-4 h-4" />
                  </button>
                  <button
                    onClick={copyPrompt}
                    disabled={!prompt}
                    className="p-2 text-gray-400 hover:text-purple-600 transition-colors disabled:opacity-50"
                    title="Copy prompt"
                  >
                    {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-between text-sm text-gray-500 mt-1">
                <span>Be specific and detailed for premium results</span>
                <span>{prompt.length}/2000</span>
              </div>
            </div>

            {/* Enhanced Prompt Display */}
            {showEnhancedPrompt && enhancedPrompt && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  AI Enhanced Prompt
                </h4>
                <p className="text-sm text-blue-700">{enhancedPrompt}</p>
              </div>
            )}

            {/* Advanced Options */}
            <div>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Advanced Options
                <span className="text-xs">({showAdvanced ? 'Hide' : 'Show'})</span>
              </button>
              
              {showAdvanced && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Guidance Scale</label>
                      <input
                        type="range"
                        min="1"
                        max="20"
                        step="0.5"
                        value={options.guidance}
                        onChange={(e) => setOptions(prev => ({...prev, guidance: parseFloat(e.target.value)}))}
                        className="w-full"
                      />
                      <div className="text-xs text-gray-500 mt-1">Current: {options.guidance} (Higher = more prompt adherence)</div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Steps</label>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        value={options.steps}
                        onChange={(e) => setOptions(prev => ({...prev, steps: parseInt(e.target.value)}))}
                        className="w-full"
                      />
                      <div className="text-xs text-gray-500 mt-1">Current: {options.steps} (More steps = higher quality)</div>
                    </div>
                  </div>

                  {generationMode === 'image-to-image' && (
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Transformation Strength
                      </label>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.1"
                        value={options.strength}
                        onChange={(e) => setOptions(prev => ({...prev, strength: parseFloat(e.target.value)}))}
                        className="w-full"
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        Current: {options.strength} (0.1 = subtle, 1.0 = complete transformation)
                      </div>
                    </div>
                  )}

                  {selectedProvider !== 'openai' && generationMode === 'text-to-image' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Width</label>
                        <select
                          value={options.width}
                          onChange={(e) => setOptions(prev => ({...prev, width: parseInt(e.target.value)}))}
                          className="w-full p-2 text-sm border border-gray-200 rounded"
                        >
                          <option value="512">512px</option>
                          <option value="768">768px</option>
                          <option value="1024">1024px (Recommended)</option>
                          <option value="1536">1536px</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Height</label>
                        <select
                          value={options.height}
                          onChange={(e) => setOptions(prev => ({...prev, height: parseInt(e.target.value)}))}
                          className="w-full p-2 text-sm border border-gray-200 rounded"
                        >
                          <option value="512">512px</option>
                          <option value="768">768px</option>
                          <option value="1024">1024px (Recommended)</option>
                          <option value="1536">1536px</option>
                        </select>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Negative Prompt</label>
                    <input
                      type="text"
                      value={options.negativePrompt}
                      onChange={(e) => setOptions(prev => ({...prev, negativePrompt: e.target.value}))}
                      className="w-full p-2 text-sm border border-gray-200 rounded"
                      placeholder="What to avoid in the image..."
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleGenerate}
                disabled={loading || !prompt.trim() || (generationMode === 'image-to-image' && !inputImage)}
                className="flex-1 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white py-4 px-8 rounded-xl font-semibold hover:from-purple-700 hover:via-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    {selectedProvider === 'gemini' ? 'Creating Premium Image...' :
                     selectedProvider === 'stability' ? 'Crafting Professional Quality...' :
                     selectedProvider === 'replicate' ? 'Generating High Quality...' :
                     'Generating...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    {generationMode === 'image-to-image' ? 'Transform Image' : 'Generate Premium Image'}
                  </>
                )}
              </button>

              {(prompt || imageUrl) && (
                <button
                  onClick={clearAll}
                  className="px-6 py-4 border-2 border-gray-200 text-gray-600 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className={`border rounded-xl p-4 mb-8 flex items-start gap-3 ${
            error.includes('✨') || error.includes('✅') 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            {error.includes('✨') || error.includes('✅') ? (
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            )}
            <div>
              <p className={`text-sm ${
                error.includes('✨') || error.includes('✅') ? 'text-green-700' : 'text-red-700'
              }`}>
                {error}
              </p>
            </div>
          </div>
        )}

        {/* Generated Image Display */}
        {imageUrl && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Generated Premium Content
              </h3>
              <div className="relative inline-block">
                <img
                  src={imageUrl}
                  alt="AI Generated premium content"
                  className="max-w-full h-auto rounded-xl shadow-lg"
                  style={{ maxHeight: '600px' }}
                />
                <div className="absolute top-2 right-2 bg-black/75 text-white px-2 py-1 rounded text-xs">
                  Premium Quality
                </div>
              </div>
              <div className="mt-6 flex justify-center gap-4 flex-wrap">
                <button
                  onClick={downloadImage}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2 shadow-lg hover:shadow-xl"
                >
                  <Download className="w-4 h-4" />
                  Download Premium
                </button>
                
                {showSaveOptions && customerId && (
                  <button
                    onClick={saveToMediaLibrary}
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2 disabled:opacity-50 shadow-lg hover:shadow-xl"
                  >
                    {saving ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save to Library
                  </button>
                )}
              </div>
              
              <div className="mt-4 text-sm text-gray-500">
                Generated with {selectedProvider === 'gemini' ? 'Gemini Intelligence' : 
                              selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)} •
                Premium Quality • {options.quality.charAt(0).toUpperCase() + options.quality.slice(1)} Settings
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIImageGenerator;