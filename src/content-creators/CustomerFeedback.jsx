import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MessageSquare, Palette, Calendar, User, ChevronDown,
  ChevronUp, Image, Video, CheckCircle, Clock, Send, AlertCircle, MapPin
} from 'lucide-react';
import Footer from '../admin/components/layout/Footer';
import Logo from '../admin/components/layout/Logo';

function getCreatorEmail() {
  try {
    const email = (localStorage.getItem('userEmail') || '').toLowerCase();
    if (email) return email;
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const userObj = JSON.parse(userStr);
      if (userObj.email) return userObj.email.toLowerCase();
    }
  } catch (e) {}
  return '';
}

function CustomerFeedback() {
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
                Array.isArray(sub.comments) && sub.comments.length > 0;

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/content-creator')}
                className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center">
                <div className="p-2 bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl shadow-lg">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>
                <div className="ml-3">
                  <span className="text-xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                    Customer Feedback
                  </span>
                  <p className="text-sm text-gray-500">Comments from customers on your content</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Calendar Sidebar */}
        <aside className="w-52 bg-white border-r border-gray-200/70 flex-shrink-0 sticky top-16 self-start h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Calendars</h3>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => setSelectedCalendarId(null)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                    !selectedCalendarId
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
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors duration-150 truncate ${
                      selectedCalendarId === cal.calendarId
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
                        const totalComments = (sub.comments || []).length;
                        const commentsByMedia = (sub.comments || []).reduce((acc, c) => {
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
                                <div className="flex flex-wrap items-center gap-2 mb-1">
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

                                    {/* Media preview (if available) */}
                                    {(() => {
                                      const mediaArr = sub.images || sub.media || [];
                                      const mediaItem = mediaArr[Number(mediaIdx)];
                                      const url = typeof mediaItem === 'string' ? mediaItem : (mediaItem?.url || mediaItem?.publicUrl || '');
                                      const isImage = url && !/\.(mp4|mov|webm|avi)/i.test(url);
                                      if (!url) return null;
                                      return (
                                        <div className="px-4 pt-3 flex justify-center">
                                          {isImage ? (
                                            <img
                                              src={url}
                                              alt={`Media ${Number(mediaIdx) + 1}`}
                                              className="max-h-48 rounded-lg object-contain border border-slate-200 shadow-sm"
                                            />
                                          ) : (
                                            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg border border-gray-200">
                                              <Video className="h-5 w-5 text-gray-500" />
                                              <span className="text-xs text-gray-500">Video file</span>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()}

                                    {/* Comment list */}
                                    <div className="p-4 space-y-2">
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
                                ))}

                                {/* Navigation to content details */}
                                <button
                                  onClick={() => {
                                    if (sub.calendar_id) {
                                      navigate(`/content-creator/content-details/${sub.calendar_id}/0`);
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

      <Footer />
    </div>
  );
}

export default CustomerFeedback;
