import React, { useCallback, useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import RightPanel from './components/RightPanel';
import Feed from './components/Feed';
import ProfileView from './components/ProfileView';
import NotificationsView from './components/NotificationsView';
import ExploreView from './components/ExploreView';
import SettingsView from './components/SettingsView';
import MessagesView from './components/MessagesView';
import AuthView from './components/AuthView';
import { getMe, logout, type SessionUser } from './api';
import { ViewState } from './types';

function App() {
  const [currentView, setCurrentView] = useState<ViewState>('HOME');
  const [sessionStatus, setSessionStatus] = useState<'checking' | 'authed' | 'unauthed'>('checking');
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | null>(null);
  const [selectedExploreTopic, setSelectedExploreTopic] = useState<string | null>(null);
  const [followingCount, setFollowingCount] = useState<number>(0);

  const refreshMe = useCallback(async () => {
    try {
      const me = await getMe();
      setSessionUser(me);
      setSessionStatus('authed');
      // Initialize following count from the user data
      if (me.following && Array.isArray(me.following)) {
        setFollowingCount(me.following.length);
      }
    } catch {
      setSessionUser(null);
      setSessionStatus('unauthed');
    }
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } finally {
      setSessionUser(null);
      setSessionStatus('unauthed');
      setCurrentView('HOME');
      setSelectedProfileUserId(null);
      setSelectedExploreTopic(null);
    }
  }, []);

  const handleChangeView = useCallback((view: ViewState) => {
    setCurrentView(view);
    if (view === 'PROFILE') {
      setSelectedProfileUserId(null);
    }
    if (view !== 'EXPLORE') {
      setSelectedExploreTopic(null);
    }
  }, []);

  const openUserProfile = useCallback((userId: string) => {
    setSelectedProfileUserId(userId);
    setCurrentView('PROFILE');
  }, []);

  const openExploreTopic = useCallback((topic: string) => {
    setSelectedExploreTopic(topic);
    setCurrentView('EXPLORE');
  }, []);

  const renderContent = () => {
    switch (currentView) {
      case 'HOME':
        return <Feed sessionUser={sessionUser} />;
      case 'PROFILE':
        return <ProfileView sessionUser={sessionUser} onUpdated={setSessionUser} onChangeView={handleChangeView} userId={selectedProfileUserId} followingCount={followingCount} />;
      case 'NOTIFICATIONS':
        return <NotificationsView />;
      case 'MESSAGES':
        return <MessagesView sessionUser={sessionUser} />;
      case 'EXPLORE':
        return <ExploreView onOpenProfile={openUserProfile} initialTopic={selectedExploreTopic} onSelectTopic={setSelectedExploreTopic} />;
      case 'SETTINGS':
         return <SettingsView sessionUser={sessionUser} onLogout={handleLogout} onUpdated={setSessionUser} />;
      default:
        return <Feed sessionUser={sessionUser} />;
    }
  };

  if (sessionStatus === 'unauthed') {
    return <AuthView onAuthed={refreshMe} />;
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      <div className="flex-shrink-0 z-50">
          <Sidebar
            currentView={currentView}
            onChangeView={handleChangeView}
            sessionUser={sessionUser}
            onLogout={handleLogout}
          />
      </div>

      <main className="flex-1 ml-20 xl:ml-72 min-h-screen transition-all duration-300">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 lg:gap-8 max-w-[1600px] mx-auto">
          {/* Main Feed / Content Area */}
          <div className="lg:col-span-2 min-h-screen border-r border-slate-100/50">
            {sessionStatus === 'checking' ? null : renderContent()}
          </div>

          {/* Right Panel - Hidden on smaller screens */}
          <div className="hidden lg:block lg:col-span-1">
            <RightPanel 
              onOpenProfile={openUserProfile} 
              onOpenExploreTopic={openExploreTopic}
              onFollowingUpdate={setFollowingCount}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;