import React, { useState, useEffect } from 'react';
import { Sparkles, Download, Copy, RefreshCw, AlertCircle, ImageIcon, Zap, CheckCircle, Settings, Save, Upload, X, Image } from 'lucide-react';

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
  const [selectedProvider, setSelectedProvider] = useState('replicate');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inputImage, setInputImage] = useState(null);
  const [inputImagePreview, setInputImagePreview] = useState('');
  const [generationMode, setGenerationMode] = useState('text-to-image'); // 'text-to-image' or 'image-to-image'
  
  // Advanced options
  const [options, setOptions] = useState({
    width: 1024,
    height: 1024,
    guidance: 7.5,
    steps: 20,
    negativePrompt: 'blurry, low quality, distorted, ugly',
    strength: 0.6 // For image-to-image transformation strength
  });

  // Fetch available providers on component mount
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/ai/providers`);
        const data = await response.json();
        console.log('Available AI providers:', data.providers);
        
        setProviders(data.providers || []);
        if (data.providers?.length > 0) {
          // Use the default provider from backend (now prioritizes Hugging Face)
          setSelectedProvider(data.default || data.providers[0]);
        } else {
          setError('No AI providers are available. Please check your API keys in the .env file.');
        }
      } catch (err) {
        console.error('Failed to fetch AI providers:', err);
        setError('Failed to connect to AI services. Please try again later.');
        setProviders([]); // Empty array to show error state
      }
    };
    fetchProviders();
  }, []);

  const enhancePrompt = async () => {
    if (!prompt.trim()) return;
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/ai/enhance-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, style: 'realistic' })
      });
      
      const data = await response.json();
      if (data.enhancedPrompt) {
        setPrompt(data.enhancedPrompt);
      }
    } catch (err) {
      console.error('Failed to enhance prompt:', err);
    }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check file type
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file');
        return;
      }
      
      // Check file size (max 10MB)
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

    try {
      if (providers.length === 0) {
        throw new Error('No AI providers are available. Please check your API configuration.');
      }

      const requestBody = {
        prompt: prompt.trim(),
        provider: selectedProvider,
        customerId,
        customerName,
        customerEmail,
        contentItemId,
        ...options
      };

      // Add input image if in image-to-image mode
      if (generationMode === 'image-to-image' && inputImage) {
        requestBody.inputImage = inputImage;
      }

      // Provider-specific adjustments
      if (selectedProvider === 'replicate') {
        if (generationMode === 'text-to-image') {
          requestBody.steps = Math.min(requestBody.steps || 4, 8);
          requestBody.guidance = Math.min(requestBody.guidance || 1.0, 2.0);
        }
      }

      console.log('🎨 Generating image with request:', { ...requestBody, inputImage: inputImage ? '[IMAGE_DATA]' : null });

      // Set a longer timeout for Replicate since it needs polling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, selectedProvider === 'replicate' ? 300000 : 60000); // 5 minutes for Replicate, 1 minute for others

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

      const data = await response.json();
      if (!data.imageUrl) {
        throw new Error('No image URL received from server');
      }
      
      setImageUrl(data.imageUrl);
      
      // Call callback if provided
      if (onImageGenerated) {
        onImageGenerated({
          imageUrl: data.imageUrl,
          provider: data.provider,
          prompt: prompt,
          mediaLibraryId: data.mediaLibraryId
        });
      }
      
    } catch (err) {
      console.error('Generation error:', err);
      let errorMessage = err.message || 'Something went wrong';
      
      // Handle different error types with more specific messages
      if (err.name === 'AbortError') {
        errorMessage = 'Generation timed out. Please try again with a simpler prompt or different provider.';
      } else if (errorMessage.includes('Billing hard limit')) {
        errorMessage = 'OpenAI account has reached its billing limit. Please try Hugging Face instead.';
      } else if (errorMessage.includes('authentication failed') || errorMessage.includes('API token')) {
        errorMessage = `${selectedProvider.toUpperCase()} API key is invalid or missing. Please check your configuration.`;
      } else if (errorMessage.includes('insufficient credits')) {
        errorMessage = `${selectedProvider.toUpperCase()} account has insufficient credits. Please add credits or try a different provider.`;
      } else if (errorMessage.includes('OpenAI API error')) {
        if (errorMessage.includes('billing') || errorMessage.includes('limit')) {
          errorMessage = 'OpenAI account has billing issues. Please try Hugging Face (free) instead.';
        } else {
          errorMessage = 'OpenAI generation failed. Please check your prompt and try again.';
        }
      } else if (errorMessage.includes('Hugging Face API error')) {
        errorMessage = 'Hugging Face generation failed. The model might be loading, please try again in a moment.';
      } else if (errorMessage.includes('Replicate')) {
        if (errorMessage.includes('token') || errorMessage.includes('incomplete')) {
          errorMessage = 'Replicate API key issue. Please check your token.';
        } else if (errorMessage.includes('422')) {
          errorMessage = 'Replicate rejected the request parameters. Try adjusting your prompt or image size.';
        } else {
          errorMessage = 'Replicate generation failed. Please try again or use a different provider.';
        }
      } else if (errorMessage.includes('timed out')) {
        errorMessage = 'Generation is taking longer than expected. Please try again.';
      }
      
      setError(errorMessage);

      // Suggest trying other providers if current one failed
      if (providers.length > 1 && !errorMessage.includes('No AI providers')) {
        const otherProviders = providers.filter(p => p !== selectedProvider);
        if (otherProviders.length > 0) {
          const suggestedProvider = otherProviders.includes('replicate') ? 'Replicate' :
                                   otherProviders.includes('huggingface') ? 'Hugging Face' :
                                   otherProviders[0].toUpperCase();
          setError(errorMessage + ` Try switching to ${suggestedProvider} provider.`);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const saveToMediaLibrary = async () => {
    if (!imageUrl || !customerId) return;
    
    setSaving(true);
    try {
      // Convert image URL to base64 if needed
      let base64Data = '';
      if (imageUrl.startsWith('data:')) {
        base64Data = imageUrl.split(',')[1];
      } else {
        // Fetch image and convert to base64
        const imageResponse = await fetch(imageUrl);
        const blob = await imageResponse.blob();
        const buffer = await blob.arrayBuffer();
        base64Data = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/media-library/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: `ai-generated-${Date.now()}.png`,
          contentType: 'image/png',
          base64Data,
          tags: ['ai-generated', selectedProvider],
          type: 'image',
          customer_id: customerId,
          customer_name: customerName,
          customer_email: customerEmail
        })
      });

      if (response.ok) {
        alert('Image saved to media library successfully!');
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
    if (prompt) {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadImage = () => {
    if (imageUrl) {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `ai-generated-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const clearAll = () => {
    setPrompt('');
    setImageUrl('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              AI Content Generator
            </h1>
          </div>
          <p className="text-gray-600 text-lg">Create stunning visuals for your social media content</p>
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
                className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
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
                className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
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
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-purple-400 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">Click to upload an image</p>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG, WebP up to 10MB</p>
                    </label>
                  </div>
                ) : (
                  <div className="relative">
                    <img
                      src={inputImagePreview}
                      alt="Input for transformation"
                      className="w-full max-h-64 object-contain rounded-xl border"
                    />
                    <button
                      onClick={removeInputImage}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
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
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                >
                  {providers.map(provider => (
                    <option key={provider} value={provider}>
                      {provider.charAt(0).toUpperCase() + provider.slice(1)}
                      {provider === 'openai' && ' (DALL-E) ⚠️'}
                      {provider === 'replicate' && ' (Flux 1.1 Pro) ✅'}
                      {provider === 'huggingface' && ' (Stable Diffusion XL) ✅'}
                    </option>
                  ))}
                </select>
                <div className="mt-1 text-xs text-gray-500">
                  {selectedProvider === 'openai' && (
                    <span className="text-red-500">⚠️ OpenAI has billing limits - try other providers if this fails</span>
                  )}
                  {selectedProvider === 'replicate' && (
                    <span className="text-green-600">✅ High quality with Flux 1.1 Pro model - very fast! (recommended)</span>
                  )}
                  {selectedProvider === 'huggingface' && (
                    <span className="text-green-600">✅ Free option with good quality</span>
                  )}
                </div>
              </div>
            )}

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
                      ? "e.g., Transform this into a cyberpunk cityscape with neon lights..."
                      : "e.g., A modern office workspace with natural lighting, professional photography, high quality..."
                  }
                  className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 resize-none"
                  rows={4}
                  maxLength={1000}
                />
                <div className="absolute bottom-3 right-3 flex gap-2">
                  <button
                    onClick={enhancePrompt}
                    disabled={!prompt.trim()}
                    className="p-2 text-gray-400 hover:text-purple-600 transition-colors disabled:opacity-50"
                    title="Enhance prompt"
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
                <span>Be specific for better results</span>
                <span>{prompt.length}/1000</span>
              </div>
            </div>

            {/* Advanced Options */}
            <div>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700"
              >
                <Settings className="w-4 h-4" />
                Advanced Options
                <span className="text-xs">({showAdvanced ? 'Hide' : 'Show'})</span>
              </button>
              
              {showAdvanced && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl space-y-4">
                  {selectedProvider !== 'openai' && generationMode === 'text-to-image' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Width</label>
                        <input
                          type="number"
                          value={options.width}
                          onChange={(e) => setOptions(prev => ({...prev, width: parseInt(e.target.value)}))}
                          className="w-full p-2 text-sm border border-gray-200 rounded"
                          min="256" max="2048" step="64"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Height</label>
                        <input
                          type="number"
                          value={options.height}
                          onChange={(e) => setOptions(prev => ({...prev, height: parseInt(e.target.value)}))}
                          className="w-full p-2 text-sm border border-gray-200 rounded"
                          min="256" max="2048" step="64"
                        />
                      </div>
                    </div>
                  )}
                  
                  {generationMode === 'image-to-image' && selectedProvider === 'replicate' && (
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Transformation Strength (0.1 = subtle, 1.0 = complete change)
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
                      <div className="text-xs text-gray-500 mt-1">Current: {options.strength}</div>
                    </div>
                  )}
                  
                  {selectedProvider === 'openai' && (
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Image Size</label>
                      <select
                        value={`${options.width}x${options.height}`}
                        onChange={(e) => {
                          const [width, height] = e.target.value.split('x').map(Number);
                          setOptions(prev => ({...prev, width, height}));
                        }}
                        className="w-full p-2 text-sm border border-gray-200 rounded"
                      >
                        <option value="1024x1024">Square (1024x1024)</option>
                        <option value="1792x1024">Landscape (1792x1024)</option>
                        <option value="1024x1792">Portrait (1024x1792)</option>
                        <option value="512x512">Small Square (512x512)</option>
                        <option value="256x256">Tiny Square (256x256)</option>
                      </select>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Negative Prompt (what to avoid)</label>
                    <input
                      type="text"
                      value={options.negativePrompt}
                      onChange={(e) => setOptions(prev => ({...prev, negativePrompt: e.target.value}))}
                      className="w-full p-2 text-sm border border-gray-200 rounded"
                      placeholder="blurry, low quality, distorted..."
                    />
                    {selectedProvider === 'openai' && (
                      <div className="mt-1 text-xs text-yellow-600">
                        Note: OpenAI DALL-E doesn't support negative prompts
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleGenerate}
                disabled={loading || !prompt.trim() || (generationMode === 'image-to-image' && !inputImage)}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 px-8 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-3"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    {selectedProvider === 'replicate' ? 'Generating (usually 2-5 seconds)...' : 'Generating...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    {generationMode === 'image-to-image' ? 'Transform Image' : 'Generate Image'}
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
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-red-800 mb-1">Generation Failed</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Generated Image Display */}
        {imageUrl && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-800 mb-6">Generated Content</h3>
              <div className="relative inline-block">
                <img
                  src={imageUrl}
                  alt="AI Generated content"
                  className="max-w-full h-auto rounded-xl shadow-lg"
                  style={{ maxHeight: '600px' }}
                />
              </div>
              <div className="mt-6 flex justify-center gap-4 flex-wrap">
                <button
                  onClick={downloadImage}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                
                {showSaveOptions && customerId && (
                  <button
                    onClick={saveToMediaLibrary}
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
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
                Generated with {selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIImageGenerator;