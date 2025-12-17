import React, { useState, useEffect } from 'react';
import Dashboard from './Dashboard';
import LandingPage from './LandingPage';
import PricingPage from './PricingPage';
import LoginPage from './LoginPage';
import SignupPage from './SignupPage';
import ProfilePage from './ProfilePage';
import { AuthService } from './services/auth';
import { User } from './types';
import { ArrowRightOnRectangleIcon, UserCircleIcon } from '@heroicons/react/24/outline';

// Router Type
type Page = 'landing' | 'pricing' | 'dashboard' | 'login' | 'signup' | 'profile';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [user, setUser] = useState<User | null>(null);

  // Check auth on load
  useEffect(() => {
    const currentUser = AuthService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
  }, []);

  // Navigation Handler
  const navigate = (page: string) => {
    setCurrentPage(page as Page);
    window.scrollTo(0, 0);
  };

  const handleLoginSuccess = (user: User) => {
    setUser(user);
    navigate('dashboard');
  };

  const handleLogout = () => {
    AuthService.logout();
    setUser(null);
    navigate('landing');
  };

  return (
    <div className="min-h-screen bg-dark-bg text-slate-200">
      
      {/* Global Navbar */}
      <nav className="border-b border-dark-border bg-dark-surface/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => navigate('landing')}
          >
            <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-indigo-600 rounded-lg shadow-lg shadow-brand-500/20"></div>
            <span className="text-xl font-bold tracking-tight text-white">Dubber<span className="text-brand-500">AI</span></span>
          </div>

          <div className="flex items-center gap-6">
             <nav className="hidden md:flex gap-6 text-sm text-slate-400 font-medium">
               <button onClick={() => navigate('landing')} className="hover:text-white transition">Features</button>
               <button onClick={() => navigate('pricing')} className="hover:text-white transition">Pricing</button>
               {user && (
                 <button onClick={() => navigate('dashboard')} className={`${currentPage === 'dashboard' ? 'text-brand-400' : 'hover:text-white'} transition`}>
                   Studio
                 </button>
               )}
             </nav>
             
             {!user ? (
                <div className="flex gap-3">
                  <button onClick={() => navigate('login')} className="text-sm font-medium text-slate-300 hover:text-white">Login</button>
                  <button onClick={() => navigate('signup')} className="text-sm font-bold bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg transition">
                    Get Started
                  </button>
                </div>
             ) : (
                <div className="flex items-center gap-4">
                  <div 
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => navigate('profile')}
                  >
                      <div className="hidden sm:flex flex-col items-end mr-2">
                        <span className="text-sm font-bold text-white group-hover:text-brand-400 transition">{user.name}</span>
                        <span className="text-xs text-brand-400">{user.credits} Credits</span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-brand-500 to-indigo-500 flex items-center justify-center text-xs font-bold text-white border border-white/10 group-hover:ring-2 ring-brand-500 transition">
                          {user.name.charAt(0).toUpperCase()}
                      </div>
                  </div>
                  <button 
                    onClick={handleLogout}
                    title="Logout"
                    className="text-slate-400 hover:text-white transition border-l border-slate-700 pl-4"
                  >
                    <ArrowRightOnRectangleIcon className="w-5 h-5" />
                  </button>
                </div>
             )}
          </div>
        </div>
      </nav>

      {/* Page Content */}
      {currentPage === 'landing' && <LandingPage onNavigate={navigate} />}
      {currentPage === 'pricing' && <PricingPage onNavigate={navigate} />}
      
      {/* Auth Pages */}
      {currentPage === 'login' && <LoginPage onLoginSuccess={handleLoginSuccess} onNavigateSignup={() => navigate('signup')} />}
      {currentPage === 'signup' && <SignupPage onSignupSuccess={handleLoginSuccess} onNavigateLogin={() => navigate('login')} />}
      
      {/* Protected Pages */}
      {currentPage === 'dashboard' && (
          user ? <Dashboard /> : <LoginPage onLoginSuccess={handleLoginSuccess} onNavigateSignup={() => navigate('signup')} />
      )}
      {currentPage === 'profile' && (
          user ? <ProfilePage user={user} /> : <LoginPage onLoginSuccess={handleLoginSuccess} onNavigateSignup={() => navigate('signup')} />
      )}

    </div>
  );
}