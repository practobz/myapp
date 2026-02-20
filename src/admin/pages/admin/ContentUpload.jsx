import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Upload, Image, X, Check, FileText, Calendar, Clock, Palette, Send, MapPin, Tag, MessageSquare, Play, Video } from 'lucide-react';
import Logo from '../../components/layout/Logo'; // Add this import for watermark overlay

// Helper to get creator email from localStorage
function getCreatorEmail() {
  let email = '';
  try {
    email = (localStorage.getItem('userEmail') || '').toLowerCase();
    if (!email) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const userObj = JSON.parse(userStr);
        if (userObj.email) {
          email = userObj.email.toLowerCase();
        }
      }
    }
  } catch (e) {
    email = '';
  }
  return email;
}

function ContentUpload() {
  const navigate = useNavigate();
  const { calendarId, itemIndex } = useParams();
  const fileInputRef = useRef(null);

  // State for assignment details
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [geoLocation, setGeoLocation] = useState({ latitude: '', longitude: '' });
  const [address, setAddress] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [postType, setPostType] = useState('image');
  const [scheduledTime, setScheduledTime] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [tags, setTags] = useState('');
  const [previousSubmissionLoaded, setPreviousSubmissionLoaded] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);

  const creatorEmail = getCreatorEmail();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!creatorEmail) {
      navigate('/content-creator/login');
    }
  }, [creatorEmail, navigate]);

  // Fetch real assignment data based on calendarId and itemIndex
  useEffect(() => {
    const fetchAssignment = async () => {
      setLoading(true);
      try {
        // First fetch customers to build a map
        const customersRes = await fetch(`${process.env.REACT_APP_API_URL}/api/customers`);
        const customersData = await customersRes.json();

        const customerMap = {};
        if (Array.isArray(customersData.customers)) {
          customersData.customers.forEach(c => {
            customerMap[c._id || c.id] = {
              name: c.name || c.customerName || c.email || '',
              email: c.email || '',
              id: c._id || c.id
            };
          });
        }

        // Then fetch calendars with customer context
        const res = await fetch(`${process.env.REACT_APP_API_URL}/calendars`);
        const calendars = await res.json();

        let found = null;
        calendars.forEach((calendar) => {
          const customerId = calendar.customerId || calendar.customer_id || calendar.customer?._id || '';
          const customerInfo = customerMap[customerId] || {};

          if (Array.isArray(calendar.contentItems)) {
            // Use itemIndex to get the correct item
            const idx = parseInt(itemIndex, 10);
            if (!isNaN(idx) && calendar._id === calendarId && calendar.contentItems[idx]) {
              const item = calendar.contentItems[idx];
              found = {
                ...item,
                calendarName: calendar.name || calendar.customerName || calendar.customer || '',
                calendarId: calendar._id,
                customerId: customerId,
                customerName: customerInfo.name || calendar.customerName || calendar.name || '',
                customerEmail: customerInfo.email || '',
                id: item.id || item._id || item.title,
                dueDate: item.dueDate || item.due_date || item.date,
                platform: item.platform || 'Instagram',
                requirements: item.requirements || [],
              };
            }
          }
        });

        if (!found) {
          console.error('❌ Assignment not found for calendarId:', calendarId, 'itemIndex:', itemIndex);
        }

        setAssignment(found);
      } catch (err) {
        console.error('❌ Error fetching assignment:', err);
        setAssignment(null);
      } finally {
        setLoading(false);
      }
    };
    if (calendarId && itemIndex !== undefined) {
      fetchAssignment();
    }
  }, [calendarId, itemIndex]);

  // Fetch previous submission to pre-fill caption and hashtags for revisions
  useEffect(() => {
    const fetchPreviousSubmission = async () => {
      if (!assignment || !assignment.id || previousSubmissionLoaded) {
        console.log('⏭️ Skipping fetch - assignment:', !!assignment, 'id:', assignment?.id, 'loaded:', previousSubmissionLoaded);
        return;
      }

      try {
        console.log('🔍 Fetching previous submissions for assignment:', assignment.id, 'by admin:', creatorEmail);
        
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/content-submissions`);
        
        if (!response.ok) {
          console.error('❌ Failed to fetch previous submissions:', response.status);
          setPreviousSubmissionLoaded(true);
          return;
        }

        const data = await response.json();
        console.log('📦 Received submissions data:', data);
        
        // Handle both array response and object with submissions property
        const submissions = Array.isArray(data) ? data : (data.submissions || []);
        console.log('📋 Total submissions count:', submissions.length);
        
        if (submissions.length > 0) {
          console.log('🔍 Sample submission structure:', {
            assignment_id: submissions[0].assignment_id,
            created_by: submissions[0].created_by,
            caption: submissions[0].caption?.substring(0, 50),
            hashtags: submissions[0].hashtags?.substring(0, 50)
          });
        }
        
        // Filter submissions for this specific assignment (any creator)
        // Handle various possible field names
        const previousSubmissions = submissions.filter(sub => {
          const subAssignmentId = sub.assignment_id || sub.assignmentId || sub.assignmentID;
          
          const matchesAssignment = subAssignmentId === assignment.id || 
                                   subAssignmentId === assignment._id ||
                                   String(subAssignmentId) === String(assignment.id);
          
          console.log('🔎 Checking submission:', {
            subAssignmentId,
            assignmentId: assignment.id,
            matchesAssignment,
            creator: sub.created_by || sub.createdBy || sub.creator
          });
          
          return matchesAssignment;
        });

        console.log('✅ Found', previousSubmissions.length, 'previous submissions for this assignment (any creator)');

        // Sort by date to get the most recent submission
        previousSubmissions.sort((a, b) => 
          new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0)
        );

        if (previousSubmissions.length > 0) {
          const latestSubmission = previousSubmissions[0];
          console.log('✅ Pre-filling from latest submission:', {
            caption: latestSubmission.caption?.substring(0, 50),
            hashtags: latestSubmission.hashtags?.substring(0, 50),
            notes: latestSubmission.notes?.substring(0, 50),
            date: latestSubmission.created_at || latestSubmission.createdAt
          });
          
          // Pre-fill caption and hashtags from previous submission
          if (latestSubmission.caption) {
            setCaption(latestSubmission.caption);
            console.log('📝 Caption set');
          }
          if (latestSubmission.hashtags) {
            setHashtags(latestSubmission.hashtags);
            console.log('🏷️ Hashtags set');
          }
          // Optionally pre-fill notes as well
          if (latestSubmission.notes) {
            setNotes(latestSubmission.notes);
            console.log('📋 Notes set');
          }
        } else {
          console.log('ℹ️ No previous submission found - this is a first-time upload');
        }

        setPreviousSubmissionLoaded(true);
      } catch (err) {
        console.error('❌ Error fetching previous submission:', err);
        setPreviousSubmissionLoaded(true);
      }
    };

    if (assignment && creatorEmail) {
      fetchPreviousSubmission();
    }
  }, [assignment, creatorEmail, previousSubmissionLoaded]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = async (files) => {
    Array.from(files).forEach(async file => {
      if (file.type.startsWith('image/')) {
        const preview = URL.createObjectURL(file);
        const newFile = {
          id: Date.now() + Math.random(),
          file: file,
          preview: preview,
          name: file.name,
          size: file.size,
          type: 'image',
          uploaded: false,
          uploading: false,
          publicUrl: null,
          error: null
        };
        setUploadedFiles(prev => [...prev, newFile]);
      } else if (file.type.startsWith('video/')) {
        const preview = URL.createObjectURL(file);
        const newFile = {
          id: Date.now() + Math.random(),
          file: file,
          preview: preview,
          name: file.name,
          size: file.size,
          type: 'video',
          uploaded: false,
          uploading: false,
          publicUrl: null,
          error: null
        };
        setUploadedFiles(prev => [...prev, newFile]);
      }
    });
  };

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Upload single file - uses signed URL for large files (>=10MB), base64 for small files
  const uploadFileToGCS = async (fileObj) => {
    try {
      const fileSizeMB = fileObj.file.size / (1024 * 1024);
      console.log(`📤 Starting upload for ${fileObj.name} (${formatFileSize(fileObj.size)})`);
      
      // Validate file object
      if (!fileObj.file || !fileObj.file.size || fileObj.file.size === 0) {
        throw new Error(`Invalid file: ${fileObj.name} has no content or is corrupted`);
      }

      // Update file status to uploading
      setUploadedFiles(prev => 
        prev.map(f => f.id === fileObj.id ? { ...f, uploading: true, error: null } : f)
      );

      let publicUrl;

      // Use signed URL for large files (>=10MB) to bypass Cloud Run's 32MB limit
      if (fileSizeMB >= 10) {
        console.log(`📤 Using signed URL for large file: ${fileObj.name} (${fileSizeMB.toFixed(2)} MB)`);
        
        // Step 1: Get signed URL from backend
        const signedUrlResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/gcs/signed-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: fileObj.name,
            contentType: fileObj.file.type
          })
        });

        if (!signedUrlResponse.ok) {
          const errorData = await signedUrlResponse.json();
          throw new Error(`Failed to get signed URL: ${errorData.error || signedUrlResponse.statusText}`);
        }

        const { signedUrl, publicUrl: uploadedUrl } = await signedUrlResponse.json();

        if (!signedUrl) {
          throw new Error('No signed URL received from backend');
        }

        // Step 2: Upload directly to GCS using signed URL
        console.log(`📤 Uploading ${fileObj.name} directly to GCS...`);
        const uploadResponse = await fetch(signedUrl, {
          method: 'PUT',
          headers: { 
            'Content-Type': fileObj.file.type
          },
          body: fileObj.file  // Send the actual file, not base64
        });

        if (!uploadResponse.ok) {
          throw new Error(`GCS upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
        }

        publicUrl = uploadedUrl;
        console.log(`✅ Successfully uploaded ${fileObj.name} via signed URL`);

      } else {
        // Use base64 upload for small files (<10MB)
        console.log(`📤 Using base64 upload for small file: ${fileObj.name} (${fileSizeMB.toFixed(2)} MB)`);
        
        // Convert file to base64
        const base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result;
            if (!result || typeof result !== 'string') {
              reject(new Error('Failed to read file as base64'));
              return;
            }
            const base64 = result.split(',')[1];
            if (!base64 || base64.length === 0) {
              reject(new Error('Base64 conversion resulted in empty data'));
              return;
            }
            resolve(base64);
          };
          reader.onerror = () => reject(new Error('FileReader error'));
          reader.readAsDataURL(fileObj.file);
        });

        const payload = {
          filename: fileObj.name,
          contentType: fileObj.file.type,
          base64Data: base64Data
        };

        if (!payload.filename || !payload.contentType || !payload.base64Data) {
          throw new Error(`Invalid payload: missing ${!payload.filename ? 'filename' : !payload.contentType ? 'contentType' : 'base64Data'}`);
        }

        // Upload using base64 through backend API
        const uploadResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/gcs/upload-base64`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(`Upload failed: ${errorData.error || uploadResponse.statusText}`);
        }

        const responseData = await uploadResponse.json();
        publicUrl = responseData.publicUrl;
        
        console.log(`✅ Successfully uploaded ${fileObj.name} via base64`);
      }

      if (!publicUrl) {
        throw new Error('No public URL returned from upload');
      }

      // Update file status to uploaded
      setUploadedFiles(prev => 
        prev.map(f => f.id === fileObj.id ? { 
          ...f, 
          uploading: false, 
          uploaded: true, 
          publicUrl: publicUrl,
          error: null 
        } : f)
      );

      return {
        url: publicUrl,
        type: fileObj.type,
        name: fileObj.name,
        size: fileObj.file.size,
        originalName: fileObj.name
      };

    } catch (error) {
      console.error(`❌ Upload failed for ${fileObj.name}:`, error);
      
      // Update file status to error
      setUploadedFiles(prev => 
        prev.map(f => f.id === fileObj.id ? { 
          ...f, 
          uploading: false, 
          uploaded: false, 
          error: error.message 
        } : f)
      );

      throw error;
    }
  };

  const handleSubmit = async () => {
    if (uploadedFiles.length === 0) {
      alert('Please upload at least one image or video');
      return;
    }

    if (!assignment) {
      alert('Assignment data not found. Please try again.');
      return;
    }

    // Enhanced validation and fallback for customer information
    let finalCustomerId = assignment.customerId;
    let finalCustomerName = assignment.customerName;
    let finalCustomerEmail = assignment.customerEmail;

    if (!finalCustomerId || !finalCustomerName) {
      console.error('❌ Missing customer information in assignment');
      
      // Use calendar data as fallback
      finalCustomerId = finalCustomerId || assignment.calendarId || '';
      finalCustomerName = finalCustomerName || assignment.calendarName || 'Unknown Customer';
    }

    // Additional validation to ensure we have proper customer name
    if (!finalCustomerName || finalCustomerName === 'Unknown Customer') {
      finalCustomerName = finalCustomerName || 
                         assignment.customer || 
                         assignment.client || 
                         assignment.calendarName || 
                         'Unknown Customer';
    }

    // CRITICAL: Ensure we have valid customer information before proceeding
    if (!finalCustomerId || !finalCustomerName || finalCustomerName === 'Unknown Customer') {
      console.error('❌ CRITICAL: Cannot proceed without valid customer information!');
      alert(`Missing customer information. Please contact support.\n\nDetails:\n- Customer ID: ${finalCustomerId || 'Missing'}\n- Customer Name: ${finalCustomerName || 'Missing'}\n- Assignment ID: ${assignment.id}`);
      return;
    }

    setSubmitting(true);
    const uploadedMediaUrls = [];

    try {
      // Upload all files that haven't been uploaded yet
      const filesToUpload = uploadedFiles.filter(f => !f.uploaded);
      const alreadyUploaded = uploadedFiles.filter(f => f.uploaded);

      console.log(`📤 Uploading ${filesToUpload.length} files, ${alreadyUploaded.length} already uploaded`);

      // Upload files in parallel (but limit concurrency to avoid overwhelming the server)
      const uploadPromises = filesToUpload.map(fileObj => uploadFileToGCS(fileObj));
      const uploadResults = await Promise.allSettled(uploadPromises);

      // Process upload results
      uploadResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          uploadedMediaUrls.push(result.value);
        } else {
          console.error(`❌ Failed to upload file ${filesToUpload[index].name}:`, result.reason);
          throw new Error(`Upload failed for ${filesToUpload[index].name}: ${result.reason.message}`);
        }
      });

      // Add already uploaded files
      alreadyUploaded.forEach(fileObj => {
        if (fileObj.publicUrl) {
          uploadedMediaUrls.push({
            url: fileObj.publicUrl,
            type: fileObj.type,
            name: fileObj.name,
            size: fileObj.size,
            originalName: fileObj.name
          });
        }
      });

      console.log(`✅ All files uploaded successfully. Total: ${uploadedMediaUrls.length}`);

      // Prepare submission data with comprehensive customer information
      const submissionData = {
        assignment_id: assignment.id,
        caption: caption || '',
        hashtags: hashtags || '',
        notes: notes || '',
        images: uploadedMediaUrls,
        media: uploadedMediaUrls,
        created_by: creatorEmail,
        customer_id: finalCustomerId,
        customer_name: finalCustomerName,
        customer_email: finalCustomerEmail || assignment.customerEmail || '',
        platform: assignment.platform || 'Instagram',
        calendar_id: assignment.calendarId,
        calendar_name: assignment.calendarName,
        item_id: assignment._id || assignment.id || assignment.itemId || '',
        item_name: assignment.title || assignment.itemName || assignment.description || '',
        assignment_title: assignment.title,
        assignment_description: assignment.description,
        due_date: assignment.dueDate,
        status: 'submitted',
        created_at: new Date().toISOString(),
        type: 'submission',
        geo_location: (geoLocation.latitude && geoLocation.longitude) ? geoLocation : undefined,
        address: address || undefined,
        contact_info: contactInfo || undefined,
        postType,
        scheduledTime: scheduledTime || assignment.dueDate,
        thumbnail,
        tags,
      };

      // FINAL VALIDATION - Ensure all critical fields are present
      const missingFields = [];
      if (!submissionData.customer_id) missingFields.push('customer_id');
      if (!submissionData.customer_name) missingFields.push('customer_name');
      if (!submissionData.assignment_id) missingFields.push('assignment_id');
      if (!submissionData.created_by) missingFields.push('created_by');
      if (!submissionData.images || submissionData.images.length === 0) missingFields.push('images');

      if (missingFields.length > 0) {
        console.error('❌ VALIDATION FAILED: Missing required fields:', missingFields);
        alert(`Validation failed. Missing required fields: ${missingFields.join(', ')}`);
        setSubmitting(false);
        return;
      }

      // Additional validation for customer info quality
      if (submissionData.customer_name === 'Unknown Customer' || 
          submissionData.customer_name.length < 2 ||
          !submissionData.customer_id ||
          submissionData.customer_id.length < 5) {
        console.error('❌ QUALITY CHECK FAILED: Invalid customer information quality');
        alert('Invalid customer information detected. Please refresh the page and try again.');
        setSubmitting(false);
        return;
      }

      console.log('📤 Submitting content to API...');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/content-submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submissionData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Backend submission failed:', errorData);
        throw new Error(`Backend error: ${errorData.error || 'Unknown error'}`);
      }

      const result = await response.json();
      console.log('✅ Content submission successful:', result);

      alert('Content submitted successfully! The customer will review your work.');
      navigate('/content-creator/assignments');
    } catch (err) {
      console.error('❌ Upload error:', err);
      alert(`Upload failed: ${err.message}. Please try again.`);
    } finally {
      setSubmitting(false);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  // Retry upload for failed files
  const retryUpload = async (fileObj) => {
    try {
      await uploadFileToGCS(fileObj);
    } catch (error) {
      console.error('Retry failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <span className="text-lg text-gray-700">Loading assignment...</span>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <span className="text-lg text-red-600">Assignment not found.</span>
          <button
            onClick={() => navigate('/content-creator/assignments')}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            Back to Assignments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/content-creator/assignments')}
                className="mr-4 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Palette className="h-5 w-5 text-purple-600" />
                </div>
                <span className="ml-3 text-xl font-bold text-gray-900">Content Upload</span>
              </div>
            </div>

            {/* Assignment Info in Header */}
            <div className="hidden md:flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{assignment.title}</p>
                <p className="text-xs text-gray-500">for {assignment.customerName}</p>
              </div>
              <div className="flex items-center text-xs text-gray-500">
                <Calendar className="h-3 w-3 mr-1" />
                {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'N/A'}
              </div>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                {assignment.platform}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Assignment Details - Compact */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 md:hidden">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">{assignment.title}</h1>
              <p className="text-sm text-gray-600">for {assignment.customerName}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center text-xs text-gray-500 mb-1">
                <Calendar className="h-3 w-3 mr-1" />
                {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'N/A'}
              </div>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                {assignment.platform}
              </span>
            </div>
          </div>
          {assignment.description && (
            <p className="text-sm text-gray-600 mt-2">{assignment.description}</p>
          )}
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Upload Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upload Area */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <Upload className="h-5 w-5 mr-2 text-purple-600" />
                Upload Media
              </h2>
              
              <div
                className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
                  dragActive 
                    ? 'border-purple-400 bg-purple-50 scale-105' 
                    : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50/50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleChange}
                  className="hidden"
                />
                
                <div className="space-y-3">
                  <div className="flex justify-center space-x-2">
                    <Upload className="h-8 w-8 text-gray-400" />
                    <Video className="h-8 w-8 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-base font-medium text-gray-900">
                      Drag and drop your images and videos here
                    </p>
                    <p className="text-sm text-gray-500">or</p>
                    <button
                      onClick={onButtonClick}
                      className="mt-2 inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                    >
                      <Image className="h-4 w-4 mr-2" />
                      Browse Files
                    </button>
                  </div>
                  <p className="text-xs text-gray-400">
                    Supports: JPG, PNG, GIF, MP4, MOV, AVI (Max 100MB per file)
                  </p>
                </div>
              </div>
            </div>

            {/* Media Preview Grid */}
            {uploadedFiles.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <Image className="h-5 w-5 mr-2 text-purple-600" />
                  Media Files ({uploadedFiles.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {uploadedFiles.map((file) => (
                    <div key={file.id} className="relative group">
                      <div 
                        className="aspect-square rounded-lg overflow-hidden bg-gray-100 ring-2 ring-transparent group-hover:ring-purple-200 transition-all relative cursor-pointer"
                        onClick={() => setSelectedMedia(file)}
                      >
                        {file.type === 'image' ? (
                          <img
                            src={file.preview}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="relative w-full h-full">
                            <video
                              src={file.preview}
                              className="w-full h-full object-cover"
                              muted
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                              <Play className="h-8 w-8 text-white" />
                            </div>
                            <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                              VIDEO
                            </div>
                          </div>
                        )}
                        
                        {/* Upload Status Overlay */}
                        {file.uploading && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                            <div className="text-white text-center">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-2"></div>
                              <p className="text-xs">Uploading...</p>
                            </div>
                          </div>
                        )}
                        
                        {file.uploaded && (
                          <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                        
                        {file.error && (
                          <div className="absolute inset-0 bg-red-500 bg-opacity-50 flex items-center justify-center">
                            <div className="text-white text-center p-2">
                              <X className="h-4 w-4 mx-auto mb-1" />
                              <p className="text-xs">Failed</p>
                              <button
                                onClick={() => retryUpload(file)}
                                className="text-xs underline mt-1"
                              >
                                Retry
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={() => removeFile(file.id)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      
                      <div className="mt-2">
                        <p className="text-xs font-medium text-gray-900 truncate">{file.name}</p>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            file.type === 'image' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {file.type.toUpperCase()}
                          </span>
                        </div>
                        {file.error && (
                          <p className="text-xs text-red-500 mt-1 truncate" title={file.error}>
                            {file.error}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Content Details & Assignment Info */}
          <div className="space-y-6">
            {/* Assignment Details - Desktop */}
            <div className="bg-white rounded-lg shadow-sm p-6 hidden md:block">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-purple-600" />
                Assignment Details
              </h2>
              
              <div className="space-y-3">
                <div>
                  <h3 className="font-medium text-gray-900">{assignment.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{assignment.description}</p>
                </div>
                
                <div className="flex items-center text-sm text-gray-500">
                  <MapPin className="h-4 w-4 mr-1" />
                  {assignment.customerName}
                </div>
                
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="h-4 w-4 mr-1" />
                  Due: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'N/A'}
                </div>

                {assignment.requirements && assignment.requirements.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 text-sm mb-2">Requirements:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {assignment.requirements.map((req, index) => (
                        <li key={index} className="flex items-start">
                          <Check className="h-3 w-3 mr-2 mt-0.5 text-green-500 flex-shrink-0" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Content Details Form */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <MessageSquare className="h-5 w-5 mr-2 text-purple-600" />
                Content Details
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Caption
                  </label>
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Write an engaging caption..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Tag className="h-4 w-4 inline mr-1" />
                    Hashtags
                  </label>
                  <input
                    type="text"
                    value={hashtags}
                    onChange={(e) => setHashtags(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="#fashion #summer #style"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes for Client
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Additional notes..."
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-center">
                <h3 className="font-semibold text-gray-900 mb-2">Ready to Submit?</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Your content will be sent to {assignment.customerName} for review
                </p>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || uploadedFiles.length === 0 || uploadedFiles.some(f => f.uploading)}
                  className="w-full inline-flex items-center justify-center px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Content
                    </>
                  )}
                </button>
                {uploadedFiles.some(f => f.uploading) && (
                  <p className="text-xs text-gray-500 mt-2">
                    Please wait for all uploads to complete
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Media Preview Modal */}
      {selectedMedia && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedMedia(null)}
        >
          <div className="relative max-w-7xl max-h-full" onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button
              onClick={() => setSelectedMedia(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <X className="h-8 w-8" />
            </button>
            
            {/* Media Content */}
            <div className="bg-white rounded-lg overflow-hidden shadow-2xl">
              {selectedMedia.type === 'image' ? (
                <img
                  src={selectedMedia.preview}
                  alt={selectedMedia.name}
                  className="max-w-full max-h-[85vh] w-auto h-auto object-contain"
                />
              ) : (
                <video
                  src={selectedMedia.preview}
                  controls
                  autoPlay
                  className="max-w-full max-h-[85vh] w-auto h-auto"
                />
              )}
              
              {/* Media Info */}
              <div className="p-4 bg-gray-50 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{selectedMedia.name}</p>
                    <p className="text-sm text-gray-500">{formatFileSize(selectedMedia.size)}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedMedia.type === 'image' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {selectedMedia.type.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContentUpload;