
import React from 'react';
import './App.css';
import BudgetTracker from './Dashboard';
import Login from './Login';
import { AuthProvider, useAuth } from './AuthContext';
import { LogOut } from 'lucide-react';

const AppContent: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();

  const handleLoginSuccess = () => {
    // The login success is handled by the Login component through the auth context
    // This function is passed to Login but the actual state update happens in AuthContext
  };

  const handleLogout = () => {
    logout();
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="relative">
      {/* Logout button */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={handleLogout}
          className="flex items-center px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
        >
          <LogOut className="w-4 h-4 mr-1" />
          Logout
        </button>
      </div>
      <BudgetTracker />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
