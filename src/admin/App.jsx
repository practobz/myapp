// import React, { useState } from 'react';
// import { useNavigate, Routes, Route } from 'react-router-dom';
// import { useAuth } from '../../contexts/AuthContext';
// import { LayoutGrid, Users, Calendar, Settings, LogOut } from 'lucide-react';
// import Header from './Header';
// import Footer from './Footer';
// import Logo from './Logo';
// import Customers from "../../pages/admin/Customers";
// import Dashboard from '../../pages/admin/Dashboard';
// import ProtectedRoute from '../components/ProtectedRoute';

// function AdminLayout({ children, title }) {
//   const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
//   const [activeSection, setActiveSection] = useState('dashboard');
//   const { logout } = useAuth();
//   const navigate = useNavigate();

//   const handleLogout = () => {
//     logout();
//     navigate('/login');
//   };

//   const toggleMobileMenu = () => {
//     setIsMobileMenuOpen(!isMobileMenuOpen);
//   };

//   // Helper to render main content
//   const renderContent = () => {
//     if (activeSection === 'customers') {
//       return <Customers />;
//     }
//     return children;
//   };

//   return (
//     <div className="flex flex-col md:flex-row h-screen bg-gray-50">
//       {/* Sidebar */}
//       <div className={`fixed inset-0 z-40 md:hidden transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`} role="dialog" aria-modal="true">
//         <div className="fixed inset-0 bg-gray-600 bg-opacity-75" aria-hidden="true" onClick={toggleMobileMenu}></div>
//         <div className="relative flex-1 flex flex-col max-w-xs w-full" style={{ backgroundColor: '#232b3b' }}>
//           <div className="absolute top-0 right-0 -mr-12 pt-2">
//             <button
//               onClick={toggleMobileMenu}
//               className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
//             >
//               <span className="sr-only">Close sidebar</span>
//               <LogOut className="h-6 w-6 text-white" />
//             </button>
//           </div>
//           {/* Mobile sidebar content */}
//           <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
//             <div className="flex-shrink-0 flex items-center px-4">
//               <Logo size="medium" />
//             </div>
//             <nav className="mt-5 px-2 space-y-1">
//               {/* Mobile navigation items */}
//               <a
//                 href="#"
//                 className={`flex items-center px-4 py-2 text-white rounded-md hover:bg-gray-900 transition-colors ${activeSection === 'dashboard' ? 'bg-gray-900' : ''}`}
//                 onClick={(e) => { e.preventDefault(); setActiveSection('dashboard'); }}
//               >
//                 <LayoutGrid className="mr-3 h-5 w-5" />
//                 Dashboard
//               </a>
//               <a
//                 href="#"
//                 className={`flex items-center px-4 py-2 text-white rounded-md hover:bg-gray-900 transition-colors ${activeSection === 'customers' ? 'bg-gray-900' : ''}`}
//                 onClick={(e) => { e.preventDefault(); setActiveSection('customers'); }}
//               >
//                 <Users className="mr-3 h-5 w-5" />
//                 Customers
//               </a>
//               <a href="#" className="flex items-center px-4 py-2 text-white rounded-md hover:bg-gray-900 transition-colors">
//                 <Calendar className="mr-3 h-5 w-5" />
//                 Content Calendar
//               </a>
//               <a href="#" className="flex items-center px-4 py-2 text-white rounded-md hover:bg-gray-900 transition-colors">
//                 <Settings className="mr-3 h-5 w-5" />
//                 Settings
//               </a>
//             </nav>
//           </div>
//         </div>
//       </div>

//       {/* Desktop sidebar */}
//       <div className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 text-white" style={{ backgroundColor: '#232b3b' }}>
//         <div className="flex items-center justify-center h-16 px-4 border-b" style={{ borderColor: '#232b3b' }}>
//           <Logo size="medium" />
//         </div>
//         <div className="flex flex-col flex-1 overflow-y-auto">
//           <nav className="flex-1 px-2 py-4 space-y-1">
//             <a
//               href="#"
//               className={`flex items-center px-4 py-2 text-white rounded-md hover:bg-gray-900 transition-colors ${activeSection === 'dashboard' ? 'bg-gray-900' : ''}`}
//               onClick={(e) => { e.preventDefault(); setActiveSection('dashboard'); }}
//             >
//               <LayoutGrid className="mr-3 h-5 w-5" />
//               Dashboard
//             </a>
//             <a
//               href="#"
//               className={`flex items-center px-4 py-2 text-white rounded-md hover:bg-gray-900 transition-colors ${activeSection === 'customers' ? 'bg-gray-900' : ''}`}
//               onClick={(e) => { e.preventDefault(); setActiveSection('customers'); }}
//             >
//               <Users className="mr-3 h-5 w-5" />
//               Customers
//             </a>
//             <a href="#" className="flex items-center px-4 py-2 text-white rounded-md hover:bg-gray-900 transition-colors">
//               <Calendar className="mr-3 h-5 w-5" />
//               Content Calendar
//             </a>
//             <a href="#" className="flex items-center px-4 py-2 text-white rounded-md hover:bg-gray-900 transition-colors">
//               <Settings className="mr-3 h-5 w-5" />
//               Settings
//             </a>
//           </nav>
//           <div className="px-4 py-4 border-t" style={{ borderColor: '#232b3b' }}>
//             <button 
//               onClick={handleLogout}
//               className="flex items-center w-full px-4 py-2 text-white rounded-md hover:bg-gray-900 transition-colors"
//             >
//               <LogOut className="mr-3 h-5 w-5" />
//               Logout
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* Main content */}
//       <div className="flex flex-col flex-1 md:ml-64 min-h-0">
//         <Header onMenuClick={toggleMobileMenu} />
//         <main className="flex-1 p-2 sm:p-4 md:p-6 overflow-auto">
//           {renderContent()}
//         </main>
//         <Footer />
//       </div>
//     </div>
//   );
// }

// export default AdminLayout;

// function App() {
//   return (
//     // ...existing providers/wrappers...
//     <Routes>
//       {/* ...other routes... */}
//       <Route
//         path="/admin"
//         element={
//           <ProtectedRoute>
//             <AdminLayout>
//               <Dashboard />
//             </AdminLayout>
//           </ProtectedRoute>
//         }
//       />
//       <Route
//         path="/admin/customers"
//         element={
//           <ProtectedRoute>
//             <AdminLayout>
//               <Customers />
//             </AdminLayout>
//           </ProtectedRoute>
//         }
//       />
//       {/* Add more admin routes wrapped in <ProtectedRoute> as needed */}
//       {/* ...other routes... */}
//     </Routes>
//     // ...existing providers/wrappers...
//   );
// }

// export default App;