import React, { useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { MapInterface } from './components/MapInterface';
import { HistoricalDataInterface } from './components/HistoricalDataInterface';
import { CommunityAlertInterface } from './components/CommunityAlertInterface';
import { LoginModal } from './components/LoginModal';
import { IntroAnimation } from './components/IntroAnimation';

export type UserType = 'visitor' | 'community-member' | null;

export interface User {
  type: UserType;
  name?: string;
  email?: string;
  authenticated: boolean;
}

export type AQICategory = 'good' | 'moderate' | 'sensitive' | 'unhealthy' | 'very-unhealthy' | 'hazardous';

export type HealthRiskZone = 'moderate-risk' | 'high-risk' | 'severe-risk';

export interface Sensor {
  id: string;
  lat: number;
  lng: number;
  aqi: number;
  category: AQICategory;
  healthRiskZone: HealthRiskZone; // New field for health risk classification
  pm25: number;
  pm10: number;
  no2: number;
  o3: number;
  co: number;
  so2: number;
  dataSource: 'ANM' | 'ANPM' | 'Civic Network';
  cluster?: number;
  riskCluster?: number; // New field for risk-based clustering
}

function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [currentView, setCurrentView] = useState<'landing' | 'map' | 'history' | 'alerts'>('landing');
  const [user, setUser] = useState<User>({ type: null, authenticated: false });
  const [showLoginModal, setShowLoginModal] = useState(false);

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
    setCurrentView('map');
  };

  const handleLogout = () => {
    setUser({ type: null, authenticated: false });
    setCurrentView('landing');
  };

  const handleNavigation = (view: 'map' | 'history' | 'alerts') => {
    if (view === 'alerts' && user.type !== 'community-member') {
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