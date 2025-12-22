import React, { useEffect, useMemo, useRef, useState } from 'react';
import { User, Bell, Lock, ChevronRight, Save, LogOut } from 'lucide-react';
import { CURRENT_USER } from '../constants';
import type { SessionUser } from '../api';
import { updateProfile } from '../api';

interface SettingsViewProps {
    sessionUser: SessionUser | null;
    onLogout: () => void;
    onUpdated: (user: SessionUser) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ sessionUser, onLogout, onUpdated }) => {
    const [activeTab, setActiveTab] = useState('account');

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form States
    const [name, setName] = useState(sessionUser?.name || sessionUser?.username || CURRENT_USER.name);
    const [username, setUsername] = useState(sessionUser?.username || CURRENT_USER.handle.replace(/^@/, ''));
    const [bio, setBio] = useState(sessionUser?.bio || CURRENT_USER.bio || '');
    const [email, setEmail] = useState('user@connectify.com');

    useEffect(() => {
        setName(sessionUser?.name || sessionUser?.username || CURRENT_USER.name);
        setUsername(sessionUser?.username || CURRENT_USER.handle.replace(/^@/, ''));
        setBio(sessionUser?.bio || CURRENT_USER.bio || '');
    }, [sessionUser]);

    const displayAvatar = useMemo(() => {
        const avatar = sessionUser?.profilePicture && sessionUser.profilePicture.length > 0
            ? sessionUser.profilePicture
            : CURRENT_USER.avatar;
        if (selectedFile) {
            return URL.createObjectURL(selectedFile);
        }
        return avatar;
    }, [sessionUser?.profilePicture, selectedFile]);

    // Toggles
    const [notifications, setNotifications] = useState({
        likes: true,
        comments: true,
        follows: true,
        email: false
    });
    
    const [privacy, setPrivacy] = useState({
        privateAccount: false,
        statusActive: true
    });

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            const updated = await updateProfile({
                name,
                username,
                bio,
                profilePicture: selectedFile
            });
            onUpdated(updated);

            const btn = document.getElementById('save-btn');
            if (btn) {
                btn.innerHTML = 'Saved! ✨';
                setTimeout(() => {
                    btn.innerHTML = 'Save Changes';
                }, 2000);
            }

            setSelectedFile(null);
        } catch (e: any) {
            setError(e?.response?.data?.error || e?.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto py-8 px-4 pb-20">
            <h2 className="text-2xl font-bold mb-6 text-slate-800">Settings</h2>
            
            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar */}
                <div className="w-full md:w-64 flex-shrink-0 space-y-2">
                    {[
                        { id: 'account', icon: User, label: 'Account' },
                        { id: 'notifications', icon: Bell, label: 'Notifications' },
                        { id: 'privacy', icon: Lock, label: 'Privacy' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${
                                activeTab === tab.id 
                                ? 'bg-white shadow-sm border border-slate-100 text-primary-600' 
                                : 'text-slate-500 hover:bg-white/50'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <tab.icon size={20} />
                                <span className="font-semibold">{tab.label}</span>
                            </div>
                            {activeTab === tab.id && <ChevronRight size={16} />}
                        </button>
                    ))}
                    
                     <button onClick={onLogout} className="w-full flex items-center gap-3 p-4 rounded-2xl text-red-500 hover:bg-red-50 mt-8 transition-colors">
                        <LogOut size={20} />
                        <span className="font-semibold">Log Out</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
                    {activeTab === 'account' && (
                        <div className="space-y-6">
                            <h3 className="text-xl font-bold text-slate-800 mb-4">Edit Profile</h3>
                            
                            <div className="flex justify-center mb-6">
                                <div
                                    className="relative group cursor-pointer"
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => fileInputRef.current?.click()}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
                                    }}
                                >
                                    <img src={displayAvatar} alt="Profile" className="w-24 h-24 rounded-full border-4 border-slate-50 object-cover" />
                                    <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-medium text-xs">
                                        Change
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const f = e.target.files?.[0] || null;
                                            setSelectedFile(f);
                                        }}
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm font-medium">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Display Name</label>
                                    <input 
                                        type="text" 
                                        value={name} 
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full p-3 bg-slate-50 rounded-xl border-transparent focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none font-medium" 
                                    />
                                </div>
                                 <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Username</label>
                                    <input 
                                        type="text" 
                                        value={`@${username}`}
                                        onChange={(e) => setUsername(e.target.value.replace(/^@/, ''))}
                                        className="w-full p-3 bg-slate-50 rounded-xl border-transparent focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none font-medium" 
                                    />
                                </div>
                                 <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Bio</label>
                                    <textarea 
                                        value={bio} 
                                        onChange={(e) => setBio(e.target.value)}
                                        rows={3}
                                        className="w-full p-3 bg-slate-50 rounded-xl border-transparent focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none font-medium resize-none" 
                                    />
                                </div>
                                 <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
                                    <input 
                                        type="email" 
                                        value={email} 
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full p-3 bg-slate-50 rounded-xl border-transparent focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none font-medium" 
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                         <div className="space-y-6">
                            <h3 className="text-xl font-bold text-slate-800 mb-4">Notification Preferences</h3>
                            {Object.entries(notifications).map(([key, value]) => (
                                <div key={key} className="flex items-center justify-between p-2">
                                    <span className="font-medium text-slate-700 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()} Notifications</span>
                                    <button 
                                        onClick={() => setNotifications({...notifications, [key]: !value})}
                                        className={`w-12 h-7 rounded-full transition-colors relative ${value ? 'bg-primary-500' : 'bg-slate-200'}`}
                                    >
                                        <div className={`w-5 h-5 bg-white rounded-full shadow-md absolute top-1 transition-transform ${value ? 'left-6' : 'left-1'}`} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    
                     {activeTab === 'privacy' && (
                         <div className="space-y-6">
                            <h3 className="text-xl font-bold text-slate-800 mb-4">Privacy & Security</h3>
                             <div className="flex items-center justify-between p-2">
                                <div>
                                    <span className="block font-medium text-slate-700">Private Account</span>
                                    <span className="text-xs text-slate-400">Only followers can see your content</span>
                                </div>
                                <button 
                                    onClick={() => setPrivacy({...privacy, privateAccount: !privacy.privateAccount})}
                                    className={`w-12 h-7 rounded-full transition-colors relative ${privacy.privateAccount ? 'bg-primary-500' : 'bg-slate-200'}`}
                                >
                                    <div className={`w-5 h-5 bg-white rounded-full shadow-md absolute top-1 transition-transform ${privacy.privateAccount ? 'left-6' : 'left-1'}`} />
                                </button>
                            </div>
                            <div className="flex items-center justify-between p-2">
                                <div>
                                    <span className="block font-medium text-slate-700">Show Online Status</span>
                                    <span className="text-xs text-slate-400">Let others know when you are active</span>
                                </div>
                                <button 
                                    onClick={() => setPrivacy({...privacy, statusActive: !privacy.statusActive})}
                                    className={`w-12 h-7 rounded-full transition-colors relative ${privacy.statusActive ? 'bg-primary-500' : 'bg-slate-200'}`}
                                >
                                    <div className={`w-5 h-5 bg-white rounded-full shadow-md absolute top-1 transition-transform ${privacy.statusActive ? 'left-6' : 'left-1'}`} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="pt-8 mt-8 border-t border-slate-50 flex justify-end">
                        <button 
                            id="save-btn"
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-2xl shadow-lg shadow-primary-500/30 flex items-center gap-2 transition-all active:scale-95"
                        >
                            <Save size={18} />
                            {saving ? 'Saving…' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsView;