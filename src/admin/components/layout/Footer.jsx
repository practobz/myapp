import React from 'react';

function Footer() {
  return (
    <footer className="bg-white border-t">
      <div className="max-w-7xl mx-auto py-4 px-2 sm:px-4 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
          <div className="flex justify-center md:justify-start space-x-4 sm:space-x-6">
            <a href="#" className="text-gray-400 hover:text-gray-500">
              About Us
            </a>
            <a href="#" className="text-gray-400 hover:text-gray-500">
              Privacy Policy
            </a>
            <a href="#" className="text-gray-400 hover:text-gray-500">
              Terms of Service
            </a>
            <a href="#" className="text-gray-400 hover:text-gray-500">
              Contact
            </a>
          </div>
          <div className="mt-2 md:mt-0">
            <p className="text-center md:text-right text-xs sm:text-sm text-gray-400">
              © {new Date().getFullYear()} Aureum Solutions. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;