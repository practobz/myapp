import React, { useState } from 'react';
import { Sparkles, Calendar, Image, Plus, Edit } from 'lucide-react';
import AIImageGenerator from './AIImageGenerator';

const ContentCalendarView = ({ userRole, customerId, customerName, customerEmail }) => {
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [selectedContentItem, setSelectedContentItem] = useState(null);

  const handleGenerateAI = (contentItem) => {
    setSelectedContentItem(contentItem);
    setShowAIGenerator(true);
  };

  const handleImageGenerated = (imageData) => {
    console.log('✅ Image generated for content item:', selectedContentItem?.id, imageData);
    // Update content item with generated image
    if (selectedContentItem) {
      // Call API to update content item with image
      updateContentItemWithImage(selectedContentItem.id, imageData);
    }
  };

  const updateContentItemWithImage = async (contentItemId, imageData) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/calendar/content-item/update-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentItemId,
          imageUrl: imageData.imageUrl,
          aiProvider: imageData.provider,
          aiPrompt: imageData.prompt
        })
      });

      if (response.ok) {
        console.log('✅ Content item updated with AI image');
        // Refresh content calendar or update state
      }
    } catch (error) {
      console.error('❌ Failed to update content item:', error);
    }
  };

  if (showAIGenerator) {
    return (
      <div>
        <button
          onClick={() => setShowAIGenerator(false)}
          className="mb-4 px-4 py-2 text-purple-600 hover:text-purple-700 flex items-center gap-2"
        >
          ← Back to Calendar
        </button>
        
        <AIImageGenerator
          contentItemId={selectedContentItem?.id}
          customerId={customerId}
          customerName={customerName}
          customerEmail={customerEmail}
          initialPrompt={selectedContentItem?.description || ''}
          onImageGenerated={handleImageGenerated}
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Content Calendar</h1>
        <button
          onClick={() => setShowAIGenerator(true)}
          className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:from-purple-700 hover:to-blue-700 transition-all duration-200 flex items-center gap-2"
        >
          <Sparkles className="w-5 h-5" />
          Create AI Content
        </button>
      </div>

      {/* Calendar content would go here */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <p className="text-gray-600">Your content calendar items will appear here.</p>
        <p className="text-sm text-gray-500 mt-2">Click "Create AI Content" to generate images for your social media posts.</p>
      </div>
    </div>
  );
};

export default ContentCalendarView;
