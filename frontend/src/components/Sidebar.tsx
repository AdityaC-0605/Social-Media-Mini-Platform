import React from 'react';
import { Home, Compass, Bell, User, Settings, Sparkles, LogOut, MessageCircle } from 'lucide-react';
import { ViewState } from '../types';
import { CURRENT_USER } from '../constants';
import type { SessionUser } from '../api';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  sessionUser: SessionUser | null;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, sessionUser, onLogout }) => {
  const menuItems = [
    { id: 'HOME', icon: Home, label: 'Home' },
    { id: 'EXPLORE', icon: Compass, label: 'Explore' },
    { id: 'MESSAGES', icon: MessageCircle, label: 'Messages' },
    { id: 'NOTIFICATIONS', icon: Bell, label: 'Notifications' },
    { id: 'PROFILE', icon: User, label: 'Profile' },
    { id: 'SETTINGS', icon: Settings, label: 'Settings' },
  ];

  const displayName = sessionUser?.name || sessionUser?.username || CURRENT_USER.name;
  const displayHandle = sessionUser?.username ? `@${sessionUser.username}` : CURRENT_USER.handle;
  const displayAvatar = sessionUser?.profilePicture && sessionUser.profilePicture.length > 0 ? sessionUser.profilePicture : CURRENT_USER.avatar;

  return (
    <aside className="fixed left-0 top-0 h-screen w-20 xl:w-72 flex flex-col items-center xl:items-start p-4 bg-white/80 backdrop-blur-xl border-r border-slate-100 z-50">
      {/* Logo */}
      <div className="mb-10 p-2">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onChangeView('HOME')}>
          <div className="w-10 h-10 bg-gradient-to-tr from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary-500/30">
            <Sparkles size={24} />
          </div>
          <h1 className="hidden xl:block text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-secondary-600">
            Connectify
          </h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 w-full space-y-4">
        {menuItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id as ViewState)}
              className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all duration-200 group ${
                isActive
                  ? 'bg-primary-50 text-primary-600 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon
                size={26}
                strokeWidth={isActive ? 2.5 : 2}
                className={isActive ? 'scale-110 transition-transform' : 'group-hover:scale-110 transition-transform'}
              />
              <span className={`hidden xl:block text-lg font-medium ${isActive ? 'font-bold' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Mini Profile */}
      <div className="w-full mt-auto flex items-center gap-3 p-2 rounded-2xl hover:bg-slate-50 cursor-pointer transition-colors">
        <img src={displayAvatar} alt="Profile" className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
        <div className="hidden xl:block overflow-hidden">
          <p className="font-bold text-sm truncate">{displayName}</p>
          <p className="text-slate-400 text-xs truncate">{displayHandle}</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="hidden xl:block ml-auto text-slate-400 hover:text-red-500"
        >
          <LogOut size={20} />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;