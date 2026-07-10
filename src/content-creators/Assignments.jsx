import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Filter, Search, MessageSquare, CheckCircle, Clock, AlertCircle, Palette, Calendar, User, ChevronDown, ChevronUp, Building2, Users, Globe, ShieldCheck, Bell, Send, Image, Eye, Play, MapPin, Video, FileText } from 'lucide-react';
import { Facebook, Instagram, Linkedin, Youtube, Twitter } from 'lucide-react';
import Logo from '../admin/components/layout/Logo';
import ContentCreatorLayout from './Layout';

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

function CustomerFeedback({ isTab = false }) {
  const navigate = useNavigate();
  const creatorEmail = getCreatorEmail();

  const [feedbackItems, setFeedbackItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCalendars, setExpandedCalendars] = useState({});
  const [expandedItems, setExpandedItems] = useState({});
  const [selectedCalendarId, setSelectedCalendarId] = useState(null);

  useEffect(() => {
    if (!creatorEmail) navigate('/content-creator/login');
  }, [creatorEmail, navigate]);

  useEffect(() => {
    if (!creatorEmail) return;

    const fetchFeedback = async () => {
      setLoading(true);
      try {
        // Fetch all submissions to find ones with comments made by this creator
        const [submissionsRes, calendarsRes] = await Promise.all([
          fetch(`${process.env.REACT_APP_API_URL}/api/content-submissions`),
          fetch(`${process.env.REACT_APP_API_URL}/calendars`)
        ]);

        const submissions = submissionsRes.ok ? await submissionsRes.json() : [];
        const calendars = calendarsRes.ok ? await calendarsRes.json() : [];

        // Build a calendar map for looking up names / assigned items
        const calendarMap = {};
        if (Array.isArray(calendars)) {
          calendars.forEach(cal => {
            calendarMap[cal._id || cal.id] = cal;
          });
        }

        // Filter submissions that:
        // 1. Were created by this creator  OR
        // 2. Are assigned to this creator via the calendar item
        //   AND have at least one comment
        const relevant = Array.isArray(submissions)
          ? submissions.filter(sub => {
            // Check if created by this creator
            const byThisCreator =
              (sub.created_by || '').toLowerCase() === creatorEmail;

            // Or assigned to this creator via calendar item
            let assignedToCreator = false;
            if (!byThisCreator && sub.calendar_id) {
              const cal = calendarMap[sub.calendar_id];
              if (cal && Array.isArray(cal.contentItems)) {
                const item = cal.contentItems.find(
                  ci =>
                    (sub.item_id && ci.id === sub.item_id) ||
                    (sub.item_name && (ci.title === sub.item_name || ci.description === sub.item_name))
                );
                if (item && (item.assignedTo || '').toLowerCase() === creatorEmail) {
                  assignedToCreator = true;
                }
              }
            }

            const hasComments =
              Array.isArray(sub.comments) && sub.comments.some(c => {
                return c.finalized === true && !c.discarded;
              });

            return (byThisCreator || assignedToCreator) && hasComments;
          })
          : [];

        // Enrich with calendar name and group key
        const enriched = relevant.map(sub => {
          const cal = calendarMap[sub.calendar_id] || null;
          return {
            ...sub,
            calendarName: sub.calendar_name || cal?.name || 'Unknown Calendar',
            itemTitle: sub.item_name || 'Unnamed Item',
            calendarId: sub.calendar_id || 'unknown'
          };
        });

        // Sort by latest comment timestamp desc
        enriched.sort((a, b) => {
          const aLatest = a.comments?.slice(-1)[0]?.timestamp || a.created_at || '';
          const bLatest = b.comments?.slice(-1)[0]?.timestamp || b.created_at || '';
          return bLatest.localeCompare(aLatest);
        });

        setFeedbackItems(enriched);
      } catch (err) {
        console.error('Failed to fetch feedback:', err);
        setFeedbackItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFeedback();
  }, [creatorEmail]);

  // Group by calendar
  const groupedByCalendar = feedbackItems.reduce((acc, item) => {
    const key = item.calendarId || 'unknown';
    const name = item.calendarName || 'Unknown Calendar';
    if (!acc[key]) acc[key] = { calendarId: key, calendarName: name, items: [] };
    acc[key].items.push(item);
    return acc;
  }, {});

  const allCalendars = Object.values(groupedByCalendar).sort((a, b) =>
    a.calendarName.localeCompare(b.calendarName)
  );

  const displayedCalendars = selectedCalendarId
    ? allCalendars.filter(c => c.calendarId === selectedCalendarId)
    : allCalendars;

  const toggleCalendar = id =>
    setExpandedCalendars(prev => ({ ...prev, [id]: !prev[id] }));

  const toggleItem = id =>
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));

  const formatDate = dateString => {
    if (!dateString) return 'N/A';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const getStatusBadge = status => {
    switch (status) {
      case 'sent_to_creator':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-800 border border-violet-300">
            <Send className="h-3 w-3" /> Sent to Creator
          </span>
        );
      case 'under_review':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="h-3 w-3" /> Under Review
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle className="h-3 w-3" /> Approved
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            <AlertCircle className="h-3 w-3" /> {status || 'Pending'}
          </span>
        );
    }
  };

  if (isTab) {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20 bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-3 border-violet-200 border-t-violet-600 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">Loading feedback...</p>
          </div>
        </div>
      );
    }
    if (feedbackItems.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/50">
          <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="h-8 w-8 text-violet-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-1">No Feedback Yet</h3>
          <p className="text-slate-500 text-sm max-w-sm">
            When a customer adds comments to your content and sends feedback, it will appear here.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {feedbackItems.map(sub => {
          const visibleComments = (sub.comments || []).filter(c => {
            return c.finalized === true && !c.discarded;
          });
          const totalComments = visibleComments.length;
          const commentsByMedia = visibleComments.reduce((acc, c) => {
            const idx = c.mediaIndex ?? 0;
            if (!acc[idx]) acc[idx] = [];
            acc[idx].push(c);
            return acc;
          }, {});

          return (
            <div key={sub._id} className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden p-5">
              {/* Item header */}
              <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3 mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Image className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-slate-800">{sub.itemTitle}</span>
                      {getStatusBadge(sub.status)}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                        <MessageSquare className="h-3 w-3" />
                        {totalComments} comment{totalComments !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                      {sub.platform && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {sub.platform}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(sub.comments?.slice(-1)[0]?.timestamp || sub.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comments detail */}
              <div className="space-y-4 pl-0">
                {Object.entries(commentsByMedia).sort(([a], [b]) => Number(a) - Number(b)).map(([mediaIdx, mediaComments]) => (
                  <div key={mediaIdx} className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                    {/* Media label */}
                    <div className="px-4 py-2 bg-gradient-to-r from-slate-100 to-slate-50 border-b border-slate-200 flex items-center gap-2">
                      <Image className="h-3.5 w-3.5 text-slate-500" />
                      <span className="text-xs font-semibold text-slate-700">
                        Media {Number(mediaIdx) + 1}
                      </span>
                      <span className="ml-auto text-[10px] text-slate-500">
                        {mediaComments.length} comment{mediaComments.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Flex container for Media on Left and Comments on Right */}
                    <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-200">
                      {/* Media preview container (Left side) */}
                      <div className="flex-1 p-4 flex items-center justify-center">
                        {(() => {
                          const mediaArr = sub.images || sub.media || [];
                          const mediaItem = mediaArr[Number(mediaIdx)];
                          const url = typeof mediaItem === 'string' ? mediaItem : (mediaItem?.url || mediaItem?.publicUrl || '');
                          const isImage = url && !/\.(mp4|mov|webm|avi)/i.test(url);
                          if (!url) return <div className="text-xs text-gray-500">No media file uploaded</div>;
                          return isImage ? (
                            <img
                              src={url}
                              alt={`Media ${Number(mediaIdx) + 1}`}
                              className="max-h-96 rounded-lg object-contain border border-slate-200 shadow-sm"
                            />
                          ) : (
                            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg border border-gray-200">
                              <Video className="h-5 w-5 text-gray-500" />
                              <span className="text-xs text-gray-500">Video file</span>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Comment list container (Right side) */}
                      <div className="w-full md:w-1/2 p-4 space-y-2">
                        {mediaComments.map((comment, ci) => (
                          <div key={comment.id || ci} className={`flex gap-3 p-3 rounded-lg border ${comment.done || comment.status === 'completed' ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
                            <span className="flex-shrink-0 w-5 h-5 bg-violet-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                              {ci + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-800 break-words leading-relaxed">{comment.comment}</p>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className="text-[10px] text-slate-400">{formatDate(comment.timestamp)}</span>
                                {comment.x !== undefined && comment.y !== undefined && (
                                  <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                    <MapPin className="h-2.5 w-2.5" />
                                    {Math.round(comment.x)}%, {Math.round(comment.y)}%
                                  </span>
                                )}
                                {(comment.done || comment.status === 'completed') && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                                    <CheckCircle className="h-3 w-3" /> Resolved
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Navigation to content details */}
                <button
                  onClick={() => {
                    if (sub.calendar_id) {
                      navigate(`/content-creator/upload/${sub.calendar_id}/${sub.item_index ?? 0}`);
                    }
                  }}
                  className="text-xs font-medium text-violet-600 hover:text-violet-800 transition-colors flex items-center gap-1"
                >
                  <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
                  View full content details
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const feedbackContent = (
    <div className="flex-1 flex min-h-0">
      {/* Calendar Sidebar */}
      <aside className="w-52 bg-white border-r border-gray-200/70 flex-shrink-0 sticky top-16 self-start h-[calc(100vh-4rem)] overflow-y-auto">
        <div className="p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Calendars</h3>
          <ul className="space-y-1">
            <li>
              <button
                onClick={() => setSelectedCalendarId(null)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${!selectedCalendarId
                    ? 'bg-violet-100 text-violet-700'
                    : 'text-gray-700 hover:bg-gray-100'
                  }`}
              >
                All Calendars
              </button>
            </li>
            {allCalendars.map(cal => (
              <li key={cal.calendarId}>
                <button
                  onClick={() => setSelectedCalendarId(cal.calendarId)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors duration-150 truncate ${selectedCalendarId === cal.calendarId
                      ? 'bg-violet-100 font-semibold text-violet-700'
                      : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  title={cal.calendarName}
                >
                  {cal.calendarName}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-3 border-violet-200 border-t-violet-600 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">Loading feedback...</p>
            </div>
          </div>
        ) : feedbackItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="h-8 w-8 text-violet-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-1">No Feedback Yet</h3>
            <p className="text-slate-500 text-sm max-w-sm">
              When a customer adds comments to your content and sends feedback, it will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {displayedCalendars.map(calendar => (
              <div key={calendar.calendarId} className="bg-white rounded-2xl shadow-sm border border-gray-200/70 overflow-hidden">
                {/* Calendar header */}
                <button
                  onClick={() => toggleCalendar(calendar.calendarId)}
                  className="w-full px-5 py-4 flex items-center gap-3 bg-gradient-to-r from-violet-50 to-purple-50 hover:from-violet-100 hover:to-purple-100 transition-colors text-left border-b border-violet-100"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-violet-400 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-sm text-slate-800 truncate">{calendar.calendarName}</span>
                    <span className="ml-2 px-2 py-0.5 bg-violet-500 text-white rounded-full text-[10px] font-semibold">
                      {calendar.items.length} item{calendar.items.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex-shrink-0 text-slate-500">
                    {expandedCalendars[calendar.calendarId]
                      ? <ChevronUp className="h-4 w-4" />
                      : <ChevronDown className="h-4 w-4" />}
                  </div>
                </button>

                {/* Calendar items */}
                {expandedCalendars[calendar.calendarId] && (
                  <div className="divide-y divide-gray-100">
                    {calendar.items.map(sub => {
                      const visibleComments = (sub.comments || []).filter(c => {
                        return c.finalized === true && !c.discarded;
                      });
                      const totalComments = visibleComments.length;
                      const commentsByMedia = visibleComments.reduce((acc, c) => {
                        const idx = c.mediaIndex ?? 0;
                        if (!acc[idx]) acc[idx] = [];
                        acc[idx].push(c);
                        return acc;
                      }, {});

                      return (
                        <div key={sub._id} className="p-4">
                          {/* Item header */}
                          <button
                            onClick={() => toggleItem(sub._id)}
                            className="w-full flex items-start gap-3 text-left group"
                          >
                            <div className="w-7 h-7 bg-gradient-to-br from-indigo-400 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Image className="h-3.5 w-3.5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                <span className="font-semibold text-sm text-slate-800 truncate">{sub.itemTitle}</span>
                                {getStatusBadge(sub.status)}
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                                  <MessageSquare className="h-3 w-3" />
                                  {totalComments} comment{totalComments !== 1 ? 's' : ''}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                {sub.customer_name && (
                                  <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {sub.customer_name}
                                  </span>
                                )}
                                {sub.platform && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {sub.platform}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDate(sub.comments?.slice(-1)[0]?.timestamp || sub.created_at)}
                                </span>
                              </div>
                            </div>
                            <div className="flex-shrink-0 text-slate-400 group-hover:text-slate-600 transition-colors mt-0.5">
                              {expandedItems[sub._id]
                                ? <ChevronUp className="h-4 w-4" />
                                : <ChevronDown className="h-4 w-4" />}
                            </div>
                          </button>

                          {/* Comments detail */}
                          {expandedItems[sub._id] && (
                            <div className="mt-4 space-y-4 pl-10">
                              {Object.entries(commentsByMedia).sort(([a], [b]) => Number(a) - Number(b)).map(([mediaIdx, mediaComments]) => (
                                <div key={mediaIdx} className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                                  {/* Media label */}
                                  <div className="px-4 py-2 bg-gradient-to-r from-slate-100 to-slate-50 border-b border-slate-200 flex items-center gap-2">
                                    <Image className="h-3.5 w-3.5 text-slate-500" />
                                    <span className="text-xs font-semibold text-slate-700">
                                      Media {Number(mediaIdx) + 1}
                                    </span>
                                    <span className="ml-auto text-[10px] text-slate-500">
                                      {mediaComments.length} comment{mediaComments.length !== 1 ? 's' : ''}
                                    </span>
                                  </div>

                    {/* Flex container for Media on Left and Comments on Right */}
                    <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-200">
                      {/* Media preview container (Left side) */}
                      <div className="flex-1 p-4 flex items-center justify-center">
                        {(() => {
                          const mediaArr = sub.images || sub.media || [];
                          const mediaItem = mediaArr[Number(mediaIdx)];
                          const url = typeof mediaItem === 'string' ? mediaItem : (mediaItem?.url || mediaItem?.publicUrl || '');
                          const isImage = url && !/\.(mp4|mov|webm|avi)/i.test(url);
                          if (!url) return <div className="text-xs text-gray-500">No media file uploaded</div>;
                          return isImage ? (
                            <img
                              src={url}
                              alt={`Media ${Number(mediaIdx) + 1}`}
                              className="max-h-96 rounded-lg object-contain border border-slate-200 shadow-sm"
                            />
                          ) : (
                            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg border border-gray-200">
                              <Video className="h-5 w-5 text-gray-500" />
                              <span className="text-xs text-gray-500">Video file</span>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Comment list container (Right side) */}
                      <div className="w-full md:w-1/2 p-4 space-y-2">
                        {mediaComments.map((comment, ci) => (
                          <div key={comment.id || ci} className={`flex gap-3 p-3 rounded-lg border ${comment.done || comment.status === 'completed' ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
                            <span className="flex-shrink-0 w-5 h-5 bg-violet-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                              {ci + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-800 break-words leading-relaxed">{comment.comment}</p>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className="text-[10px] text-slate-400">{formatDate(comment.timestamp)}</span>
                                {comment.x !== undefined && comment.y !== undefined && (
                                  <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                    <MapPin className="h-2.5 w-2.5" />
                                    {Math.round(comment.x)}%, {Math.round(comment.y)}%
                                  </span>
                                )}
                                {(comment.done || comment.status === 'completed') && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                                    <CheckCircle className="h-3 w-3" /> Resolved
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                                </div>
                              ))}

                              {/* Navigation to content details */}
                              <button
                                onClick={() => {
                                  if (sub.calendar_id) {
                                    navigate(`/content-creator/upload/${sub.calendar_id}/${sub.item_index ?? 0}`);
                                  }
                                }}
                                className="text-xs font-medium text-violet-600 hover:text-violet-800 transition-colors flex items-center gap-1"
                              >
                                <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
                                View full content details
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <ContentCreatorLayout
      title="Customer Feedback"
      subtitle="Comments from customers on your content"
      icon={<MessageSquare className="h-6 w-6 text-white" />}
      onBack={() => navigate('/content-creator')}
    >
      {feedbackContent}
    </ContentCreatorLayout>
  );
}

function Assignments() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedFilter, setSelectedFilter] = useState(() => {
    const param = searchParams.get('filter') || 'all';
    // 'assigned' from Dashboard maps to 'pending' in this view (initial state)
    return param === 'assigned' ? 'pending' : param;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerMap, setCustomerMap] = useState({});
  const [customersLoaded, setCustomersLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedCustomers, setExpandedCustomers] = useState({});
  const [expandedCalendars, setExpandedCalendars] = useState({});
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);

  // Scheduled posts to check published status
  const [scheduledPosts, setScheduledPosts] = useState([]);
  // Submissions to show per-assignment review status
  const [submissions, setSubmissions] = useState([]);
  // Counts for stat cards
  const [adminApprovedCount, setAdminApprovedCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);

  // Get current creator's email or id
  const creatorEmail = getCreatorEmail();

  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find(c => (c._id || c.id) === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!creatorEmail) {
      navigate('/content-creator/login');
    }
  }, [creatorEmail, navigate]);

  useEffect(() => {
    // Fetch all customers and build a map of customerId -> customerName
    const fetchCustomers = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/api/customers`);
        const data = await res.json();
        if (Array.isArray(data.customers)) {
          setCustomers(data.customers);
          const map = {};
          data.customers.forEach(c => {
            map[c._id || c.id] = c.name || c.customerName || c.email || '';
          });
          setCustomerMap(map);
        }
      } catch (err) {
        setCustomers([]);
        setCustomerMap({});
      } finally {
        setCustomersLoaded(true);
      }
    };
    fetchCustomers();
  }, []);

  useEffect(() => {
    // Fetch all content calendar items assigned to this creator
    const fetchAssignments = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/calendars`);
        const calendars = await res.json();
        let allAssignments = [];
        calendars.forEach(calendar => {
          if (Array.isArray(calendar.contentItems)) {
            calendar.contentItems.forEach((item, index) => {
              allAssignments.push({
                ...item,
                calendarName: calendar.name || calendar.customerName || calendar.customer || '',
                calendarId: calendar._id || calendar.id,
                customerId: calendar.customerId || calendar.customer_id || calendar.customer?._id || '',
                customerName: customerMap[calendar.customerId || calendar.customer_id || (calendar.customer && calendar.customer._id)] || '',
                id: item.id || item._id || item.title || Math.random().toString(36).slice(2),
                itemIndex: index
              });
            });
          }
        });
        const filtered = allAssignments.filter(item =>
          String(item.assignedTo || '').toLowerCase() === creatorEmail
        );
        setAssignments(filtered);
      } catch (err) {
        setAssignments([]);
      }
    };

    const fetchScheduledPosts = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/api/scheduled-posts`);
        if (!res.ok) {
          throw new Error(`Failed to fetch scheduled posts: ${res.statusText}`);
        }
        const data = await res.json();
        setScheduledPosts(data);
      } catch (err) {
        console.error('Failed to fetch scheduled posts:', err);
        setScheduledPosts([]);
      }
    };

    const fetchSubmissions = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/api/content-submissions`);
        if (!res.ok) return;
        const data = await res.json();
        const allSubs = Array.isArray(data) ? data : [];
        // Store ALL submissions for thumbnail/status display (includes admin-uploaded ones)
        setSubmissions(allSubs);
        // Stats use only creator's own submissions
        const creatorSubs = allSubs.filter(s => String(s.created_by || '').toLowerCase() === creatorEmail.toLowerCase());
        // Admin approved count (internal stage only)
        setAdminApprovedCount(creatorSubs.filter(s =>
          s.status === 'approved' &&
          (s.submission_stage || s.submissionStage || 'internal') !== 'customer'
        ).length);
        // Review updates: customer-stage submissions with comments
        setReviewCount(creatorSubs.filter(s =>
          (s.submission_stage || s.submissionStage || '') === 'customer' &&
          Array.isArray(s.comments) && s.comments.length > 0
        ).length);
      } catch (err) {
        console.error('Failed to fetch submissions:', err);
        setSubmissions([]);
      }
    };

    if (creatorEmail && creatorEmail.length > 0 && customersLoaded) {
      Promise.all([
        fetchAssignments(),
        fetchScheduledPosts(),
        fetchSubmissions()
      ]).finally(() => {
        setLoading(false);
      });
    }
  }, [creatorEmail, customerMap, customersLoaded]);

  // Helper: check if content is published on any platform
  const isContentPublished = (assignmentId) => {
    return scheduledPosts.some(post => post.contentId === assignmentId && post.status === 'published');
  };

  // Helper: get latest submission for an assignment (used for inline status badges)
  // Accepts either an assignment object or a plain id string for backward compat
  const getLatestSubmission = (assignmentOrId) => {
    const id = assignmentOrId && typeof assignmentOrId === 'object'
      ? (assignmentOrId.id || assignmentOrId._id)
      : assignmentOrId;
    const calId = assignmentOrId && typeof assignmentOrId === 'object' ? assignmentOrId.calendarId : undefined;
    const idx = assignmentOrId && typeof assignmentOrId === 'object' ? assignmentOrId.itemIndex : undefined;
    const subs = submissions.filter(s => {
      const sid = String(s.assignment_id || s.assignmentId || '');
      const iid = String(s.item_id || '');
      const strId = String(id || '');
      if (strId && (sid === strId || iid === strId)) return true;
      if (calId && s.calendar_id === calId && idx !== undefined && s.item_index !== undefined && Number(s.item_index) === Number(idx)) return true;
      return false;
    });
    if (subs.length === 0) return null;
    return [...subs].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0];
  };

  const isVideoUrl = (url) => /\.(mp4|mov|webm|avi|mkv)(\?|$)/i.test(url || '');

  // Helper: get thumbnail URL from the latest submission for an assignment.
  // Prefers explicit thumbnailUrl; falls back to first media item.
  const getSubmissionThumbnail = (assignment) => {
    const sub = getLatestSubmission(assignment);
    if (!sub) return null;
    const images = sub.images || sub.media || [];
    if (!Array.isArray(images) || images.length === 0) return null;
    const normalizedPostType = String(assignment?.postType || sub.postType || '').toLowerCase();

    if (normalizedPostType === 'reel' || normalizedPostType === 'video') {
      const firstVideo = images.find(item => {
        const url = typeof item === 'string' ? item : (item?.url || item?.publicUrl || '');
        return isVideoUrl(url);
      });
      if (firstVideo) {
        const url = typeof firstVideo === 'string' ? firstVideo : (firstVideo?.url || firstVideo?.publicUrl || '');
        return url ? { url, isThumbnail: false } : null;
      }
    }

    if (sub.thumbnailUrl) return { url: sub.thumbnailUrl, isThumbnail: true };

    const first = images[0];
    const url = typeof first === 'string' ? first : (first?.url || first?.publicUrl || '');
    return url ? { url, isThumbnail: false } : null;
  };

  // Precomputed Sets for reliable submission-based filtering.
  // Built from the latest submissions, avoiding fragile per-assignment ID lookups.
  const submissionFilterSets = useMemo(() => {
    const adminApprovedKeys = new Set();
    const customerApprovedKeys = new Set();
    const anySubmissionKeys = new Set();

    assignments.forEach(assignment => {
      const s = getLatestSubmission(assignment);
      if (!s) return;

      const keys = [];
      if (s.assignment_id) keys.push(String(s.assignment_id));
      if (s.item_id && String(s.item_id) !== String(s.assignment_id)) keys.push(String(s.item_id));
      if (s.calendar_id && s.item_index !== undefined && s.item_index !== null) {
        keys.push(`${s.calendar_id}::${Number(s.item_index)}`);
      }

      // Ensure the assignment's own IDs are added to keys
      const assId = String(assignment.id || assignment._id || '');
      if (assId) keys.push(assId);
      if (assignment.calendarId && assignment.itemIndex !== undefined) {
        keys.push(`${assignment.calendarId}::${Number(assignment.itemIndex)}`);
      }

      const stage = s.submission_stage || s.submissionStage || '';

      // Track every assignment that has any submission
      keys.forEach(k => anySubmissionKeys.add(k));

      const isCustomerApproved = (s.approved_by_customer === true || s.status === 'approved_customer' || s.status === 'approved_both') &&
        !['under_review', 'sent_to_creator', 'revision_requested', 'rejected', 'customer_feedback_pending_admin', 'pending_customer_review', 'changes_requested_admin', 'changes_requested_customer_approved_admin'].includes(s.status);
      const isAdminApproved = (s.approved_by_admin === true || s.status === 'approved_admin' || s.status === 'approved_both' || (s.status === 'approved' && !s.approved_by_customer) || stage === 'customer') &&
        !['revision_requested', 'rejected', 'customer_feedback_pending_admin', 'changes_requested_admin', 'changes_requested_customer_approved_admin'].includes(s.status);

      if (isAdminApproved) {
        keys.forEach(k => adminApprovedKeys.add(k));
      }
      if (isCustomerApproved) {
        keys.forEach(k => customerApprovedKeys.add(k));
      }
    });
    return { adminApprovedKeys, customerApprovedKeys, anySubmissionKeys };
  }, [assignments, submissions]);

  // Check if an assignment matches any key in a submission filter set
  const assignmentMatchesSet = (assignment, set) => {
    if (!set.size) return false;
    const id = String(assignment.id || assignment._id || '');
    if (id && set.has(id)) return true;
    if (assignment.calendarId && assignment.itemIndex !== undefined) {
      if (set.has(`${assignment.calendarId}::${Number(assignment.itemIndex)}`)) return true;
    }
    return false;
  };

  // Helper: get submission review status info for display
  const getSubmissionStatusInfo = (assignmentId) => {
    const sub = getLatestSubmission(assignmentId);
    if (!sub) return null;
    const isCustApproved = (sub.approved_by_customer === true || sub.status === 'approved_customer' || sub.status === 'approved_both') &&
      !['under_review', 'sent_to_creator', 'revision_requested', 'rejected', 'customer_feedback_pending_admin', 'pending_customer_review', 'changes_requested_admin', 'changes_requested_customer_approved_admin'].includes(sub.status);
    if (isCustApproved) {
      return { label: 'Customer Approved', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle className="h-3 w-3" />, canReupload: false, revisionNotes: '' };
    }
    if (sub.status === 'revision_requested') {
      return { label: 'Revision Requested', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: <AlertCircle className="h-3 w-3" />, canReupload: true, revisionNotes: sub.rejectionReason || '' };
    }
    if (sub.submission_stage === 'customer') {
      return { label: 'Under Customer Review', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Eye className="h-3 w-3" />, canReupload: false, revisionNotes: '' };
    }
    if (sub.status === 'approved') {
      return { label: 'Approved by Admin', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: <CheckCircle className="h-3 w-3" />, canReupload: false, revisionNotes: '' };
    }
    return { label: 'Under Admin Review', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Clock className="h-3 w-3" />, canReupload: false, revisionNotes: '' };
  };

  // Helper: get actual status considering published posts and item.published field
  const getActualStatus = (assignment) => {
    // Check if the item itself is marked as published
    if (assignment.published === true) {
      return 'published';
    }
    if (isContentPublished(assignment.id || assignment._id)) {
      return 'published';
    }
    return assignment.status || 'assigned';
  };

  const getFilterStatus = (assignment) => {
    const actual = getActualStatus(assignment);
    if (actual === 'published') return 'published';
    
    const hasSubmission = assignmentMatchesSet(assignment, submissionFilterSets.anySubmissionKeys);
    const isCustomerApproved = assignmentMatchesSet(assignment, submissionFilterSets.customerApprovedKeys) || (!hasSubmission && actual === 'approved');
    if (isCustomerApproved) return 'approved';
    
    const isAdminApproved = assignmentMatchesSet(assignment, submissionFilterSets.adminApprovedKeys);
    if (isAdminApproved) return 'admin_approved';
    
    return 'pending';
  };

  const parsePlatforms = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val.map(v => String(v).trim()).filter(Boolean);
    const s = String(val || '');
    if (s.includes(',')) return s.split(',').map(v => v.trim()).filter(Boolean);
    if (s.includes(' ')) return s.split(/\s+/).map(v => v.trim()).filter(Boolean);
    const matches = s.match(/facebook|instagram|youtube|linkedin|twitter|tiktok|pinterest/ig);
    if (matches) return matches.map(m => m.toLowerCase());
    return [s];
  };

  const platformColor = (p) => {
    switch ((p || '').toLowerCase()) {
      case 'facebook': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'instagram': return 'bg-pink-100 text-pink-700 border-pink-200';
      case 'youtube': return 'bg-red-100 text-red-700 border-red-200';
      case 'linkedin': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'twitter': return 'bg-sky-100 text-sky-700 border-sky-200';
      case 'tiktok': return 'bg-gray-900 text-white border-gray-700';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const PlatformIcon = ({ platform, className = 'h-3 w-3' }) => {
    switch ((platform || '').toLowerCase()) {
      case 'facebook': return <Facebook className={className} />;
      case 'instagram': return <Instagram className={className} />;
      case 'linkedin': return <Linkedin className={className} />;
      case 'youtube': return <Youtube className={className} />;
      case 'twitter': return <Twitter className={className} />;
      default: return <Globe className={className} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'approved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'published':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'published':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getItemApprovalStatus = (assignment) => {
    const filterStatus = getFilterStatus(assignment);
    if (filterStatus === 'published') {
      return {
        label: 'Published',
        color: 'bg-purple-50 text-purple-700 border-purple-200',
        icon: <CheckCircle className="h-4 w-4" />
      };
    }
    const hasSubmission = assignmentMatchesSet(assignment, submissionFilterSets.anySubmissionKeys);
    const isCustomerApproved = assignmentMatchesSet(assignment, submissionFilterSets.customerApprovedKeys) || (!hasSubmission && getActualStatus(assignment) === 'approved');
    const isAdminApproved = assignmentMatchesSet(assignment, submissionFilterSets.adminApprovedKeys);

    if (isCustomerApproved && isAdminApproved) {
      return {
        label: 'Both Approved',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: <CheckCircle className="h-4 w-4" />
      };
    }
    if (isCustomerApproved) {
      return {
        label: 'Customer Approved',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: <CheckCircle className="h-4 w-4" />
      };
    }
    if (isAdminApproved) {
      return {
        label: 'Approved by Admin',
        color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        icon: <CheckCircle className="h-4 w-4" />
      };
    }

    return {
      label: 'Pending',
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: <Clock className="h-4 w-4" />
    };
  };

  const getPriorityColor = (priority) => {
    switch ((priority || '').toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const stats = useMemo(() => {
    const listToCount = selectedCustomerId
      ? assignments.filter(a => a.customerId === selectedCustomerId)
      : assignments;

    return {
      total: listToCount.length,
      pending: listToCount.filter(a => getFilterStatus(a) === 'pending').length,
      approved: listToCount.filter(a => getFilterStatus(a) === 'approved').length,
      published: listToCount.filter(a => getFilterStatus(a) === 'published').length,
      adminApproved: listToCount.filter(a => getFilterStatus(a) === 'admin_approved').length,
      reviewUpdates: listToCount.filter(a => {
        const sub = getLatestSubmission(a);
        return sub && Array.isArray(sub.comments) && sub.comments.length > 0;
      }).length,
    };
  }, [assignments, selectedCustomerId, scheduledPosts, submissions, submissionFilterSets]);

  const filteredAssignments = assignments.filter(assignment => {
    const matchesFilter = selectedFilter === 'all' || getFilterStatus(assignment) === selectedFilter;
    const customerStr = typeof assignment.customer === 'string'
      ? assignment.customer
      : String(assignment.customerName || '');
    const titleStr = String(assignment.title || '');
    const typeStr = Array.isArray(assignment.type)
      ? assignment.type.map(String).join(' ')
      : String(assignment.type || '');

    const matchesSearch = customerStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      titleStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      typeStr.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCustomer = !selectedCustomerId || assignment.customerId === selectedCustomerId;
    return matchesFilter && matchesSearch && matchesCustomer;
  });

  const getAssignmentDate = (a) => {
    return new Date(a.assignedAt || a.createdAt || a.dueDate || 0).getTime();
  };

  // Sort assignments flat list by date descending (newest first)
  const sortedAssignments = [...filteredAssignments].sort((a, b) => {
    return getAssignmentDate(b) - getAssignmentDate(a);
  });

  // Group: Customer -> Calendar -> Items
  const groupedByCustomer = sortedAssignments.reduce((acc, assignment) => {
    const custKey = assignment.customerId || 'unknown';
    const custName = assignment.customerName || 'Unknown Customer';
    if (!acc[custKey]) {
      acc[custKey] = { customerName: custName, customerId: custKey, calendars: {}, maxDate: 0 };
    }
    const calKey = assignment.calendarId || 'unknown';
    const calName = assignment.calendarName || 'Unnamed Calendar';
    if (!acc[custKey].calendars[calKey]) {
      acc[custKey].calendars[calKey] = { calendarName: calName, calendarId: calKey, assignments: [], maxDate: 0 };
    }

    const date = getAssignmentDate(assignment);
    if (date > acc[custKey].maxDate) acc[custKey].maxDate = date;
    if (date > acc[custKey].calendars[calKey].maxDate) acc[custKey].calendars[calKey].maxDate = date;

    acc[custKey].calendars[calKey].assignments.push(assignment);
    return acc;
  }, {});

  // Sort customers newest first
  const sortedCustomers = Object.values(groupedByCustomer).sort((a, b) =>
    b.maxDate - a.maxDate
  );

  // All customers from unfiltered assignments (for sidebar)
  const allCustomersSorted = Object.values(
    assignments.reduce((acc, assignment) => {
      const custKey = assignment.customerId || 'unknown';
      const custName = assignment.customerName || 'Unknown Customer';
      if (!acc[custKey]) acc[custKey] = { customerName: custName, customerId: custKey };
      return acc;
    }, {})
  ).sort((a, b) => a.customerName.localeCompare(b.customerName));

  // Auto-expand the customer passed via ?expand=customerId (from Dashboard recent assignment click)
  const expandCustomerId = searchParams.get('expand');
  useEffect(() => {
    if (!expandCustomerId || assignments.length === 0) return;
    setSelectedCustomerId(expandCustomerId);
    setExpandedCustomers(prev => ({ ...prev, [expandCustomerId]: true }));
    const calendarIds = [...new Set(
      assignments
        .filter(a => a.customerId === expandCustomerId)
        .map(a => a.calendarId)
        .filter(Boolean)
    )];
    setExpandedCalendars(prev => {
      const next = { ...prev };
      calendarIds.forEach(id => { next[id] = true; });
      return next;
    });
  }, [assignments, expandCustomerId]);

  const toggleCustomer = (id) => setExpandedCustomers(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleCalendar = (id) => setExpandedCalendars(prev => ({ ...prev, [id]: !prev[id] }));

  const handleAssignmentClick = (assignment) => {
    const itemIndex = assignment.itemIndex !== undefined ? assignment.itemIndex : 0;
    navigate(`/content-creator/upload/${assignment.calendarId}/${itemIndex}`);
  };

  const handleStartWork = (assignment) => {
    // Find the index of this item in the calendar's contentItems array
    const itemIndex = assignment.itemIndex !== undefined ? assignment.itemIndex : 0;
    navigate(`/content-creator/upload/${assignment.calendarId}/${itemIndex}`);
  };



  return (
    <ContentCreatorLayout
      title="Content Creator Portal"
      subtitle="Assignment Dashboard"
      icon={<Palette className="h-6 w-6 text-white" />}
      fullWidthContent={true}
    >
      <div className="space-y-5">
        {selectedCustomer && (
          <div className="bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 rounded-xl shadow p-2.5 text-white mb-3 flex items-center">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-sm font-bold overflow-hidden flex-shrink-0">
                {selectedCustomer.profileImage ? (
                  <img src={selectedCustomer.profileImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  (selectedCustomer.name || 'C').charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-semibold truncate">{selectedCustomer.name || 'Unnamed Customer'}</h1>
                <p className="text-purple-100 text-[11px] truncate">{selectedCustomer.email}</p>
                {selectedCustomer.companyName && (
                  <p className="text-purple-200 text-[10px] mt-0.5 bg-white/10 px-1.5 py-0.5 rounded-full inline-block max-w-full truncate">
                    {selectedCustomer.companyName}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Filter Tabs + Search */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm p-4 border border-gray-200/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: 'All', count: stats.total },
                { key: 'pending', label: 'Pending', count: stats.pending },
                { key: 'approved', label: 'Customer Approved', count: stats.approved },
                { key: 'published', label: 'Published', count: stats.published },
                { key: 'admin_approved', label: 'Approved by Admin', count: stats.adminApproved },
                { key: 'review_updates', label: 'Review Updates', count: stats.reviewUpdates },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setSelectedFilter(opt.key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedFilter === opt.key
                      ? 'bg-purple-600 text-white shadow-sm'
                      : opt.key === 'review_updates'
                        ? 'bg-gray-100 text-gray-600 hover:bg-rose-100 hover:text-rose-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  {opt.label}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${selectedFilter === opt.key ? 'bg-white/20 text-white' : 'bg-white text-gray-600'
                    }`}>{opt.count}</span>
                </button>
              ))}
            </div>
            <div className="relative flex-shrink-0">
              <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search assignments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm w-full sm:w-56"
              />
            </div>
          </div>
        </div>

        {/* Assignments List - Customer > Calendar > Items */}
        <div className="space-y-4">
          {selectedFilter === 'review_updates' ? (
            <CustomerFeedback isTab={true} />
          ) : loading ? (
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-200/50">
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-purple-600 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">Loading assignments...</p>
              </div>
            </div>
          ) : sortedCustomers.length > 0 ? (
            sortedCustomers.map((custGroup) => {
              const isCustExpanded = expandedCustomers[custGroup.customerId] === true;
              const totalItems = Object.values(custGroup.calendars).reduce((sum, cal) => sum + cal.assignments.length, 0);
              return (
                <div key={custGroup.customerId} className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
                  {/* Customer Header */}
                  {!selectedCustomerId && (
                    <div
                      onClick={() => toggleCustomer(custGroup.customerId)}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-indigo-50 cursor-pointer hover:from-purple-100 hover:to-indigo-100 transition-all duration-150"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg shadow">
                          <Building2 className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h2 className="text-base font-bold text-gray-900">{custGroup.customerName}</h2>
                          <p className="text-xs text-gray-500">
                            {Object.keys(custGroup.calendars).length} {Object.keys(custGroup.calendars).length === 1 ? 'Calendar' : 'Calendars'} &middot; {totalItems} {totalItems === 1 ? 'Item' : 'Items'}
                          </p>
                        </div>
                      </div>
                      <div className="p-2 text-gray-400">
                        {isCustExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </div>
                  )}

                  {/* Calendars under this customer */}
                  {(isCustExpanded || selectedCustomerId) && (
                    <div className="p-4 space-y-4">
                      {Object.values(custGroup.calendars).sort((a, b) => b.maxDate - a.maxDate).map((calGroup) => {
                        const isCalExpanded = expandedCalendars[calGroup.calendarId] === true;
                        return (
                          <div key={calGroup.calendarId} className="border border-gray-200 rounded-xl overflow-hidden">
                            {/* Calendar sub-header */}
                            <div
                              onClick={() => toggleCalendar(calGroup.calendarId)}
                              className="flex items-center justify-between px-4 py-2.5 bg-indigo-50/60 cursor-pointer hover:bg-indigo-100/60 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <div className="p-1 bg-indigo-100 rounded">
                                  <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                                </div>
                                <span className="font-semibold text-gray-800 text-sm">{calGroup.calendarName}</span>
                                <span className="text-xs text-gray-400">{calGroup.assignments.length} {calGroup.assignments.length === 1 ? 'item' : 'items'}</span>
                              </div>
                              <div className="p-1 text-gray-400">
                                {isCalExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </div>
                            </div>

                            {/* Assignment rows under this calendar */}
                            {isCalExpanded && (
                              <div className="divide-y-2 divide-gray-200">
                                {calGroup.assignments.map((assignment, idx) => (
                                  <div
                                    key={assignment.id || assignment._id || idx}
                                    onClick={() => handleAssignmentClick(assignment)}
                                    className="px-4 py-5 hover:bg-purple-50/50 cursor-pointer transition-colors"
                                  >
                                    <div className="flex gap-3 items-start">
                                      {/* Submission thumbnail */}
                                      {(() => {
                                        const thumb = getSubmissionThumbnail(assignment);
                                        const thumbUrl = thumb?.url || '';
                                        const isVid = isVideoUrl(thumbUrl) && !thumb?.isThumbnail;
                                        return (
                                          <div className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 relative">
                                            {thumbUrl ? (
                                              isVid ? (
                                                <div className="w-full h-full bg-black relative">
                                                  <video
                                                    src={thumbUrl}
                                                    muted
                                                    playsInline
                                                    preload="metadata"
                                                    className="w-full h-full object-cover"
                                                  />
                                                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                    <Play className="h-4 w-4 text-white" />
                                                  </div>
                                                </div>
                                              ) : (
                                                <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
                                              )
                                            ) : (
                                              <div className="w-full h-full flex items-center justify-center">
                                                <Image className="h-5 w-5 text-gray-300" />
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })()}
                                      {/* Assignment details */}
                                      <div className="flex-1 min-w-0">
                                        {/* Line 1: Item label + title */}
                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="text-xs font-semibold text-gray-400 uppercase shrink-0">Item:</span>
                                            <span className="text-sm font-semibold text-gray-800 truncate">{assignment.title}</span>
                                          </div>
                                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                                            {/* Main Badge */}
                                            {(() => {
                                              const statusInfo = getItemApprovalStatus(assignment);
                                              
                                              // Check if sub status will be rendered
                                              const subStatusInfo = getFilterStatus(assignment) !== 'published' ? getSubmissionStatusInfo(assignment.id) : null;
                                              const willShowSubStatus = subStatusInfo && 
                                                subStatusInfo.label !== 'Approved by Admin' && 
                                                subStatusInfo.label !== 'Customer Approved' && 
                                                subStatusInfo.label !== 'Both Approved';

                                              // If main is Pending and we have a specific sub-status, hide Pending
                                              if (statusInfo.label === 'Pending' && willShowSubStatus) {
                                                return null;
                                              }

                                              return (
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${statusInfo.color}`}>
                                                  {statusInfo.icon}
                                                  <span>{statusInfo.label}</span>
                                                </span>
                                              );
                                            })()}
                                            {/* Sub Submission Status Badge */}
                                            {(() => {
                                              if (getFilterStatus(assignment) === 'published') return null;
                                              const subStatusInfo = getSubmissionStatusInfo(assignment.id);
                                              if (!subStatusInfo) return null;
                                              if (subStatusInfo.label === 'Approved by Admin' || subStatusInfo.label === 'Customer Approved' || subStatusInfo.label === 'Both Approved') return null;
                                              return (
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${subStatusInfo.color}`}>
                                                  {subStatusInfo.icon}
                                                  <span>{subStatusInfo.label}</span>
                                                </span>
                                              );
                                            })()}
                                          </div>
                                        </div>
                                        {/* Line 2: Platform, Due Date, Priority */}
                                        <div className="flex items-center gap-4 flex-wrap">
                                          <div className="flex items-center gap-1 flex-wrap">
                                            {parsePlatforms(assignment.platform || assignment.type).map((p, i) => (
                                              <span key={i} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-xs font-medium ${platformColor(p)}`}>
                                                <PlatformIcon platform={p} className="h-3 w-3 flex-shrink-0" />
                                                {p.charAt(0).toUpperCase() + p.slice(1)}
                                              </span>
                                            ))}
                                          </div>
                                          {assignment.postType && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100 capitalize">
                                              <FileText className="h-3 w-3" />
                                              Type: {assignment.postType}
                                            </span>
                                          )}
                                          <div className="flex items-center gap-1">
                                            <span className="text-xs font-semibold text-gray-400 uppercase">Due:</span>
                                            <span className="text-xs text-gray-600">{assignment.dueDate ? format(new Date(assignment.dueDate), 'MMM dd, yyyy') : 'N/A'}</span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <span className="text-xs font-semibold text-gray-400 uppercase">Priority:</span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(assignment.priority)}`}>
                                              {(assignment.priority || 'Medium').charAt(0).toUpperCase() + (assignment.priority || 'Medium').slice(1).toLowerCase()}
                                            </span>
                                          </div>
                                        </div>
                                        {/* Line 3: Submission Review Status Notes/Actions */}
                                        {(() => {
                                          if (getFilterStatus(assignment) === 'published') return null;
                                          const statusInfo = getSubmissionStatusInfo(assignment.id);
                                          if (!statusInfo) return null;
                                          const isApproved = statusInfo.label === 'Approved by Admin';
                                          const hasBottomContent = isApproved || statusInfo.canReupload || statusInfo.revisionNotes;
                                          if (!hasBottomContent) return null;
                                          return (
                                            <div
                                              className={`flex items-center gap-2 mt-2 pt-2 border-t flex-wrap ${isApproved ? 'border-orange-200 bg-orange-50 -mx-4 px-4 pb-2 rounded-b-xl' : 'border-gray-100'}`}
                                              onClick={e => e.stopPropagation()}
                                            >
                                              {isApproved && (
                                                <CheckCircle className="h-4 w-4 text-orange-600 flex-shrink-0" />
                                              )}
                                              {isApproved && (
                                                <span className="text-xs text-orange-700 font-medium">Your content was approved by admin!</span>
                                              )}
                                              {statusInfo.canReupload && (
                                                <button
                                                  onClick={(e) => { e.stopPropagation(); handleStartWork(assignment); }}
                                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-600 text-white hover:bg-orange-700 transition-colors"
                                                >
                                                  Re-upload
                                                </button>
                                              )}
                                              {statusInfo.revisionNotes && (
                                                <span className="text-xs text-orange-600 italic truncate max-w-xs" title={statusInfo.revisionNotes}>
                                                  "{statusInfo.revisionNotes}"
                                                </span>
                                              )}
                                            </div>
                                          );
                                        })()}
                                      </div>{/* end assignment details */}
                                    </div>{/* end flex gap-3 */}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-200/50">
              <div className="text-center py-12">
                <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments found</h3>
                <p className="text-gray-500">No assignments match your current search criteria.</p>
              </div>
            </div>
          )}
        </div>
      </div>


    </ContentCreatorLayout>
  );
}

export default Assignments;