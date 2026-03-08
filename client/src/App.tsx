import React, { useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { MapInterface } from './components/MapInterface';
import { HistoricalDataInterface } from './components/HistoricalDataInterface';
import { CommunityAlertInterface } from './components/CommunityAlertInterface';
import { LoginModal } from './components/LoginModal';
import { IntroAnimation } from './components/IntroAnimation';
import type { UserType, User } from './types';

function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [currentView, setCurrentView] = useState<'landing' | 'map' | 'history' | 'alerts'>('landing');
  const [user, setUser] = useState<User>({ type: null, authenticated: false });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingView, setPendingView] = useState<'map' | 'history' | 'alerts' | null>(null);

  const handleUserTypeSelect = (type: UserType) => {
    if (type === 'community-member') {
      setShowLoginModal(true);
    } else {
      setUser({ type, authenticated: true });
      setCurrentView('map');
    }
  };

  const handleLogin = (name: string, email: string, password: string) => {
    setUser({ type: 'community-member', name, email, authenticated: true });
    setShowLoginModal(false);
    // If there was a pending navigation request (e.g. user tried to access alerts), honor it
    if (pendingView) {
      setCurrentView(pendingView);
      setPendingView(null);
    } else {
      setCurrentView('map');
    }
  };

  const handleLogout = () => {
    setUser({ type: null, authenticated: false });
    setCurrentView('landing');
    setPendingView(null);
  };

  const handleNavigation = (view: 'map' | 'history' | 'alerts') => {
    // If user requests community alerts but isn't a community-member, prompt login
    if (view === 'alerts' && user.type !== 'community-member') {
      setPendingView(view);
      setShowLoginModal(true);
      return;
    }

    setCurrentView(view);
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {showIntro && (
        <IntroAnimation onComplete={() => setShowIntro(false)} />
      )}
      
      {!showIntro && (
        <>
          {currentView === 'landing' && (
            <LandingPage onUserTypeSelect={handleUserTypeSelect} />
          )}
          
          {currentView === 'map' && user.authenticated && (
            <MapInterface 
              user={user} 
              onNavigate={handleNavigation}
              onLogout={handleLogout}
            />
          )}

          {currentView === 'history' && user.authenticated && (
            <HistoricalDataInterface 
              user={user} 
              onNavigate={handleNavigation}
              onLogout={handleLogout}
            />
          )}

          {currentView === 'alerts' && user.authenticated && user.type === 'community-member' && (
            <CommunityAlertInterface 
              user={user} 
              onNavigate={handleNavigation}
              onLogout={handleLogout}
            />
          )}

          {showLoginModal && (
            <LoginModal 
              onLogin={handleLogin}
              onClose={() => {
                setShowLoginModal(false);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

export default App;