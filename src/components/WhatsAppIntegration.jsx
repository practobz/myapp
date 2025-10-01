import React, { useState } from 'react';
import { MessageCircle, Send, CheckCircle, AlertCircle, Loader, Phone, User, FileText, Settings } from 'lucide-react';

function WhatsAppIntegration({ contentDetails = {}, onNotificationSent }) {
  const [sending, setSending] = useState(false);
  const [useTemplate, setUseTemplate] = useState(true);
  const [customMessage, setCustomMessage] = useState('');
  const [result, setResult] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);

  // Early return if contentDetails is not available
  if (!contentDetails || Object.keys(contentDetails).length === 0) {
    return (
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
        <div className="flex items-center justify-center space-x-3">
          <Loader className="h-6 w-6 animate-spin text-gray-400" />
          <span className="text-gray-600">Loading content details...</span>
        </div>
      </div>
    );
  }

  // WhatsApp Business Template parameters
  const templateParams = {
    name: 'new_content_notification',
    language: { code: 'en' },
    components: [
      {
        type: 'header',
        parameters: [
          {
            type: 'text',
            text: contentDetails.creatorName || 'Your Creator'
          }
        ]
      },
      {
        type: 'body',
        parameters: [
          {
            type: 'text',
            text: contentDetails.title || 'New Content'
          },
          {
            type: 'text',
            text: contentDetails.contentType || 'Content'
          }
        ]
      },
      {
        type: 'button',
        sub_type: 'url',
        index: 0,
        parameters: [
          {
            type: 'text',
            text: `content/${contentDetails.id || contentDetails._id}`
          }
        ]
      }
    ]
  };

  // Fallback message for regular WhatsApp (if template fails)
  const defaultMessage = `🎉 New content from ${contentDetails?.creatorName || 'your creator'}!

📱 ${contentDetails?.contentType || 'Content'}: "${contentDetails?.title || 'New Content'}"

Check it out now in your dashboard!
${process.env.REACT_APP_API_URL?.replace(':3001', ':3000') || 'http://localhost:3000'}/customer/content-review`;

  const handleSendNotification = async () => {
    setSending(true);
    setResult(null);
    setDebugInfo(null);

    try {
      // Validate request before sending
      const validationErrors = validateRequest();
      if (validationErrors.length > 0) {
        setResult({ 
          type: 'error', 
          message: 'Validation failed: ' + validationErrors.join(', ')
        });
        setSending(false);
        return;
      }

      const requestBody = {
        contentId: contentDetails?.id || contentDetails?._id,
        creatorId: contentDetails?.creatorId,
        useTemplate: useTemplate,
        template: useTemplate ? templateParams : null,
        message: useTemplate ? null : (customMessage || defaultMessage),
        contentDetails: {
          title: contentDetails?.title || 'Untitled Content',
          creatorName: contentDetails?.creatorName || 'Unknown Creator',
          contentType: contentDetails?.contentType || 'Content',
          customerId: contentDetails?.customerId,
          customerEmail: contentDetails?.customerEmail,
          customerPhone: contentDetails?.customerPhone
        }
      };

      // Set debug info for troubleshooting
      setDebugInfo({
        requestUrl: `${process.env.REACT_APP_API_URL}/api/whatsapp/send-content-notification`,
        requestBody: JSON.stringify(requestBody, null, 2),
        timestamp: new Date().toISOString()
      });

      console.log('Sending WhatsApp notification request:', requestBody);
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/whatsapp/send-content-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Failed to parse response JSON:', parseError);
        const responseText = await response.text();
        console.error('Response text:', responseText);
        
        setResult({ 
          type: 'error', 
          message: `Server error (${response.status}): Invalid response format. Check if WhatsApp Business API is configured properly.` 
        });
        return;
      }

      console.log('WhatsApp notification response:', data);

      if (response.ok && data.success) {
        setResult({ 
          type: 'success', 
          message: `${useTemplate ? 'Template' : 'Message'} notification sent to ${data.notificationsSent || 0} customer(s)` 
        });
        
        if (onNotificationSent) {
          onNotificationSent(data);
        }
      } else {
        // Handle specific WhatsApp API errors
        let errorMessage = data.error || data.message || `Server error (${response.status})`;
        
        // Handle OAuth token expiration specifically
        if (data.error && data.error.code === 190) {
          const subcode = data.error.error_subcode;
          errorMessage = `WhatsApp Business API Token Expired (${data.error.code}): ${data.error.message}

🔑 TOKEN RENEWAL REQUIRED:

The WhatsApp Business API access token has expired and needs to be renewed. Please contact your system administrator to:

1. Generate a new access token from Meta Business Manager
2. Update the WHATSAPP_ACCESS_TOKEN in server environment variables
3. Restart the server application

Technical Details:
• Error Code: ${data.error.code}
• Subcode: ${subcode || 'N/A'}
• Session expired on: ${data.error.message.match(/expired on (.*?)\./)?.[1] || 'Unknown date'}
• Current time: ${data.error.message.match(/current time is (.*?)\./)?.[1] || 'Unknown'}

For immediate assistance, check the Meta Business Manager → WhatsApp API Setup → Access Tokens section.`;
        }
        // Add specific error context based on status code
        else if (response.status === 400) {
          errorMessage = `Bad Request (400): ${errorMessage}. Check template configuration and parameters.`;
        } else if (response.status === 401) {
          errorMessage = `Authentication Failed (401): ${errorMessage}. WhatsApp Business API credentials are invalid or missing. Please check:
          
• WhatsApp Business API Access Token (may be expired)
• Phone Number ID configuration  
• Business Account verification status
• API permissions and scopes

Contact your administrator to configure WhatsApp Business API credentials.`;
        } else if (response.status === 403) {
          errorMessage = `Access Forbidden (403): ${errorMessage}. Check WhatsApp Business API permissions and phone number verification.`;
        } else if (response.status === 429) {
          errorMessage = `Rate Limited (429): ${errorMessage}. Too many requests. Please wait before retrying.`;
        } else if (response.status === 500) {
          errorMessage = `Server Error (500): ${errorMessage}. WhatsApp Business API service is experiencing issues.`;
        }
        
        if (errorMessage.includes('template') || errorMessage.includes('Template')) {
          errorMessage += '\n\nTemplate issues: Verify the template is approved and active in WhatsApp Business Manager.';
        } else if (errorMessage.includes('phone') || errorMessage.includes('number')) {
          errorMessage += '\n\nPhone number issues: Verify customer phone numbers are valid and opted-in for WhatsApp messages.';
        }
        
        setResult({ 
          type: 'error', 
          message: errorMessage 
        });
      }
    } catch (error) {
      console.error('Error sending WhatsApp notification:', error);
      setResult({ 
        type: 'error', 
        message: `Network error: ${error.message || 'Please check your connection and try again. Verify WhatsApp Business API service is running.'}` 
      });
    } finally {
      setSending(false);
    }
  };

  const validateRequest = () => {
    const errors = [];
    
    if (!contentDetails?.id && !contentDetails?._id) {
      errors.push('Content ID is missing');
    }
    
    if (!contentDetails?.creatorId) {
      errors.push('Creator ID is missing');
    }

    // Check for customer phone number for both template and regular messages
    if (!contentDetails?.customerPhone || contentDetails.customerPhone.trim() === '') {
      errors.push('Customer phone number is missing or empty');
    } else {
      // Validate phone number format
      const phoneRegex = /^\+?[\d\s\-\(\)]{10,15}$/;
      if (!phoneRegex.test(contentDetails.customerPhone.trim())) {
        errors.push(`Invalid phone number format: "${contentDetails.customerPhone}"`);
      }
    }
    
    if (useTemplate) {
      if (!templateParams.name) {
        errors.push('Template name is missing');
      }
      if (!templateParams.components || templateParams.components.length === 0) {
        errors.push('Template components are missing');
      }
    } else {
      const messageToSend = customMessage || defaultMessage;
      if (!messageToSend.trim()) {
        errors.push('Message content is empty');
      }
    }
    
    return errors;
  };

  const isPhoneValid = contentDetails?.customerPhone && contentDetails.customerPhone.trim() !== '';

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
      {/* Header Section */}
      <div className="relative bg-gradient-to-br from-emerald-600 via-green-600 to-teal-600 px-8 py-6">
        <div className="absolute inset-0 bg-black/5"></div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
              <MessageCircle className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">WhatsApp Business</h2>
              <p className="text-emerald-100 text-sm">Send instant notification to customer</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-emerald-200 uppercase tracking-wider font-medium">Status</div>
            <div className={`text-sm font-semibold ${isPhoneValid ? 'text-white' : 'text-red-200'}`}>
              {isPhoneValid ? 'Ready to Send' : 'Phone Required'}
            </div>
          </div>
        </div>
      </div>

      {/* Content Preview Section */}
      <div className="px-8 py-6 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <FileText className="h-5 w-5 mr-2 text-gray-600" />
            Content Summary
          </h3>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
            {contentDetails?.contentType || 'Content'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <User className="h-4 w-4 text-gray-500" />
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Creator</span>
                <p className="text-sm font-semibold text-gray-900">{contentDetails?.creatorName || 'Not specified'}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <FileText className="h-4 w-4 text-gray-500" />
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Title</span>
                <p className="text-sm font-semibold text-gray-900">{contentDetails?.title || 'Untitled'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Phone className="h-4 w-4 text-gray-500" />
              <div className="flex-1">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Customer Phone</span>
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-semibold text-gray-900">
                    {contentDetails?.customerPhone || 'Not provided'}
                  </p>
                  {isPhoneValid ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Settings className="h-4 w-4 text-gray-500" />
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Content ID</span>
                <p className="text-sm font-mono text-gray-700 truncate max-w-32">
                  {contentDetails?.id || contentDetails?._id || 'Missing'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Phone validation warning */}
        {!isPhoneValid && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-red-800">Phone Number Required</h4>
                <p className="text-xs text-red-600 mt-1">
                  A valid customer phone number is required for WhatsApp notifications. 
                  Please ensure the customer profile includes a verified mobile number.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Message Type Selection */}
      <div className="px-8 py-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Notification Method</h3>
        
        <div className="space-y-4">
          {/* Business Template Option */}
          <div 
            className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
              useTemplate 
                ? 'border-emerald-500 bg-emerald-50' 
                : 'border-gray-200 bg-gray-50 hover:border-gray-300'
            }`}
            onClick={() => setUseTemplate(true)}
          >
            <div className="flex items-start space-x-4">
              <input
                type="radio"
                id="templateMessage"
                name="messageType"
                checked={useTemplate}
                onChange={() => setUseTemplate(true)}
                className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500 focus:ring-2 border-gray-300"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="templateMessage" className="text-base font-semibold text-gray-900 cursor-pointer">
                    Business Template
                  </label>
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                    Recommended
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Pre-approved template ensures reliable delivery and professional branding
                </p>
                
                {/* Template Preview */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                        <MessageCircle className="h-4 w-4 text-emerald-600" />
                      </div>
                      <span className="font-medium text-gray-900 text-sm">WhatsApp Business</span>
                    </div>
                    <span className="text-xs text-gray-500">Template Preview</span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="font-semibold text-gray-900">
                      New content from {contentDetails?.creatorName || 'Your Creator'}
                    </div>
                    <div className="text-gray-700">
                      <span className="font-medium">{contentDetails?.contentType || 'Content'}:</span> {contentDetails?.title || 'New Content'}
                    </div>
                    <div className="pt-2">
                      <div className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg">
                        Visit Website →
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Regular Message Option */}
          <div 
            className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
              !useTemplate 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 bg-gray-50 hover:border-gray-300'
            }`}
            onClick={() => setUseTemplate(false)}
          >
            <div className="flex items-start space-x-4">
              <input
                type="radio"
                id="regularMessage"
                name="messageType"
                checked={!useTemplate}
                onChange={() => setUseTemplate(false)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 focus:ring-2 border-gray-300"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="regularMessage" className="text-base font-semibold text-gray-900 cursor-pointer">
                    Custom Message
                  </label>
                  <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                    Limited Delivery
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Send a custom message (may have delivery limitations for marketing content)
                </p>
                
                {!useTemplate && (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Custom Message Content
                    </label>
                    <textarea
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      placeholder={defaultMessage}
                      rows={5}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none transition-all duration-200"
                    />
                    <p className="text-xs text-gray-500">
                      {customMessage.length > 0 ? customMessage.length : defaultMessage.length} characters
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Result Message */}
      {result && (
        <div className="mx-8 mb-6">
          <div className={`p-5 rounded-2xl border-2 ${
            result.type === 'success' 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start space-x-3">
              <div className={`p-2 rounded-xl ${
                result.type === 'success' 
                  ? 'bg-green-100' 
                  : 'bg-red-100'
              }`}>
                {result.type === 'success' ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
              </div>
              <div className="flex-1">
                <h4 className={`text-sm font-semibold ${
                  result.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {result.type === 'success' ? 'Notification Sent' : 'Notification Failed'}
                </h4>
                <div className={`text-sm mt-1 whitespace-pre-line ${
                  result.type === 'success' ? 'text-green-700' : 'text-red-700'
                }`}>
                  {result.message}
                </div>
                
                {result.type === 'error' && (result.message.includes('401') || result.message.includes('190')) && (
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <div className="text-sm text-amber-800">
                      <div className="font-semibold mb-2 flex items-center">
                        <Settings className="h-4 w-4 mr-2" />
                        Configuration Required
                      </div>
                      {result.message.includes('190') || result.message.includes('expired') ? (
                        <p>
                          The WhatsApp Business API access token has expired and must be renewed. 
                          Contact your system administrator to generate a fresh token from Meta Business Manager.
                        </p>
                      ) : (
                        <p>
                          WhatsApp Business API needs to be set up with valid credentials. 
                          Contact your system administrator to configure the API keys and tokens.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Button Section */}
      <div className="px-8 pb-8">
        <button
          onClick={handleSendNotification}
          disabled={sending || !isPhoneValid}
          className={`w-full flex items-center justify-center px-6 py-4 font-semibold rounded-2xl transition-all duration-300 transform ${
            sending || !isPhoneValid
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
              : 'bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:from-emerald-700 hover:to-green-700 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]'
          }`}
        >
          {sending ? (
            <>
              <Loader className="h-5 w-5 mr-3 animate-spin" />
              <span>Sending {useTemplate ? 'Template' : 'Message'}...</span>
            </>
          ) : (
            <>
              <Send className="h-5 w-5 mr-3" />
              <span>
                Send WhatsApp {useTemplate ? 'Template' : 'Message'}
                {!isPhoneValid && ' (Phone Required)'}
              </span>
            </>
          )}
        </button>

        {/* Info Footer */}
        <div className="mt-4 text-center space-y-1">
          <p className="text-xs text-gray-600">
            {useTemplate 
              ? '✓ Using approved WhatsApp Business template for optimal delivery'
              : '⚠ Regular messages may have delivery limitations for promotional content'
            }
          </p>
          <p className="text-xs text-red-500">
            Requires active WhatsApp Business API configuration
          </p>
        </div>
      </div>

      {/* Debug Info (Development Only) */}
      {debugInfo && (
        <div className="mx-8 mb-8">
          <details className="group">
            <summary className="cursor-pointer p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors duration-200">
              <span className="select-none">🔧 Debug Information</span>
            </summary>
            <div className="mt-3 p-4 bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
              <pre className="text-xs text-green-400 font-mono overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

export default WhatsAppIntegration;