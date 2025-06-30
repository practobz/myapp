import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';

const ContentCalendar = ({ customerId }) => {
  const [customer, setCustomer] = useState(null);
  const [calendarItems, setCalendarItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch customer details
    const fetchCustomer = async () => {
      try {
        const res = await fetch(`/api/customers/${customerId}`);
        const data = await res.json();
        setCustomer(data);
      } catch (err) {
        setCustomer(null);
      }
    };

    // Fetch calendar items for this customer
    const fetchCalendarItems = async () => {
      try {
        const res = await fetch(`/calendars/${customerId}`);
        const raw = await res.json();
        // Normalize to array
        const calendarArray = Array.isArray(raw) ? raw : [raw];
        // Flatten and sort content items
        const allItems = calendarArray
          .filter(c => Array.isArray(c.contentItems) && c.contentItems.length > 0)
          .flatMap(c => c.contentItems.map(item => ({
            ...item,
            _calendarId: c._id,
            _id: `${c._id}_${item.date}_${item.description}`
          })))
          .sort((a, b) => new Date(a.date) - new Date(b.date));
        setCalendarItems(allItems);
      } catch (err) {
        setCalendarItems([]);
      } finally {
        setLoading(false);
      }
    };

    if (customerId) {
      setLoading(true);
      fetchCustomer();
      fetchCalendarItems();
    }
  }, [customerId]);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading...</div>;
  }

  if (!customer) {
    return (
      <div className="p-8 text-center text-red-500">
        Customer not found.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h2 className="text-2xl font-bold mb-4">{customer.name} - Content Calendar</h2>
      {calendarItems.length > 0 ? (
        <ul className="divide-y divide-gray-200 bg-white rounded-lg shadow">
          {calendarItems.map(item => (
            <li key={item._id} className="p-4 flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-gray-500">{format(new Date(item.date), "do MMMM")}</p>
                <p className="text-base mt-1 text-primary-700">{item.description}</p>
              </div>
              <div>
                <span className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
                  {item.type}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="p-8 text-center text-gray-500">No content items found.</div>
      )}
    </div>
  );
};

export default ContentCalendar;