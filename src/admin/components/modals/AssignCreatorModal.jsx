import React, { useState, useEffect } from 'react';
import { X, User, UserCheck } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL;

function AssignCreatorModal({ isOpen, onClose, onAssign, calendarName }) {
  const [creators, setCreators] = useState([]);
  const [selectedCreator, setSelectedCreator] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCreators();
    }
  }, [isOpen]);

  const fetchCreators = async () => {
    try {
      const response = await fetch(`${API_URL}/users?role=content_creator`);
      if (!response.ok) throw new Error('Failed to fetch content creators');
      const data = await response.json();
      setCreators(Array.isArray(data) ? data : (data.creators || []));
    } catch (error) {
      console.error('Error fetching creators:', error);
      setCreators([]);
    }
  };

  const handleAssign = () => {
    if (!selectedCreator) return;
    
    const creator = creators.find(c => c.email === selectedCreator);
    setLoading(true);
    onAssign(creator);
    setLoading(false);
    handleClose();
  };

  const handleClose = () => {
    setSelectedCreator('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl border border-gray-200/50 relative">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-xl mr-3">
                <UserCheck className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Assign Content Creator</h3>
                <p className="text-sm text-gray-600 mt-1">Calendar: {calendarName}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Select Content Creator
              </label>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {creators.length > 0 ? (
                  creators.map((creator) => (
                    <div
                      key={creator._id}
                      className={`p-4 border rounded-xl cursor-pointer transition-all duration-200 ${
                        selectedCreator === creator.email
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300 hover:bg-purple-25'
                      }`}
                      onClick={() => setSelectedCreator(creator.email)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {(creator.name || 'U').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{creator.name || 'Unnamed Creator'}</h4>
                          <p className="text-sm text-gray-600">{creator.email}</p>
                          {creator.mobile && (
                            <p className="text-xs text-gray-500">{creator.mobile}</p>
                          )}
                        </div>
                        {selectedCreator === creator.email && (
                          <UserCheck className="h-5 w-5 text-purple-600" />
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <User className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No content creators available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={loading || !selectedCreator}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? 'Assigning...' : 'Assign Creator'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AssignCreatorModal;