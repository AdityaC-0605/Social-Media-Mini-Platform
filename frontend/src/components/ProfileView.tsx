import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Mail, Edit3, Sparkles, Palette, Music } from 'lucide-react';
import { CURRENT_USER, INITIAL_POSTS } from '../constants';
import PostCard from './PostCard';
import { getMe, getSessionUserId, getUserLikedPosts, getUserProfile, getUserRepliedPosts, mapBackendPostToUi, toggleFollow, updateProfile, type BackendUserSearchResult, type SessionUser } from '../api';
import type { Post, ViewState } from '../types';

interface ProfileViewProps {
  sessionUser: SessionUser | null;
  onUpdated: (user: SessionUser) => void;
  onChangeView?: (view: ViewState) => void;
  userId?: string | null;
  followingCount?: number;
}

const ProfileView: React.FC<ProfileViewProps> = ({ sessionUser, onUpdated, onChangeView, userId, followingCount }) => {
  const [profile, setProfile] = useState<BackendUserSearchResult | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'replies' | 'likes'>('posts');
  const [tabLoading, setTabLoading] = useState(false);
  const [showList, setShowList] = useState<null | 'followers' | 'following'>(null);
  const [followingBusy, setFollowingBusy] = useState(false);
  const [photoSaving, setPhotoSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const targetUserId = userId || getSessionUserId(sessionUser);
  const currentUserId = getSessionUserId(sessionUser);
  const isOwnProfile = !userId || userId === currentUserId;

  const load = useCallback(async () => {
    if (!targetUserId) return;
    try {
      const res = await getUserProfile(targetUserId);
      setProfile(res.user);
      const mappedPosts = res.posts.map(p => mapBackendPostToUi(p, currentUserId));
      setPosts(mappedPosts);
    } catch {
      setProfile(null);
      setPosts([]);
    }
  }, [targetUserId, currentUserId]);

  const loadTab = useCallback(async (tab: 'posts' | 'replies' | 'likes') => {
    if (!targetUserId) return;
    setTabLoading(true);
    try {
      if (tab === 'posts') {
        const res = await getUserProfile(targetUserId);
        setProfile(res.user);
        setPosts(res.posts.map(p => mapBackendPostToUi(p, currentUserId)));
        return;
      }

      if (tab === 'likes') {
        const liked = await getUserLikedPosts(targetUserId);
        setPosts(liked.map(p => mapBackendPostToUi(p, currentUserId)));
        return;
      }

      const replied = await getUserRepliedPosts(targetUserId);
      setPosts(replied.map(p => mapBackendPostToUi(p, currentUserId)));
    } catch {
      setPosts([]);
    } finally {
      setTabLoading(false);
    }
  }, [targetUserId, currentUserId]);

  const handlePostDelete = useCallback((postId: string) => {
    setPosts(prev => prev.filter(post => post.id !== postId));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadTab(activeTab);
  }, [activeTab, loadTab]);

  const changePhoto = async (file: File | null) => {
    if (!isOwnProfile) return;
    if (!file || photoSaving) return;
    setPhotoSaving(true);
    try {
      const updated = await updateProfile({ profilePicture: file });
      onUpdated(updated);
      setProfile((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          profilePicture: updated.profilePicture,
        };
      });
    } finally {
      setPhotoSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const displayName = isOwnProfile
    ? (profile?.name || sessionUser?.name || profile?.username || sessionUser?.username || CURRENT_USER.name)
    : (profile?.name || profile?.username || 'User');
  const displayHandle = isOwnProfile
    ? (profile?.username || sessionUser?.username ? `@${profile?.username || sessionUser?.username}` : CURRENT_USER.handle)
    : (profile?.username ? `@${profile.username}` : '@user');
  const displayBio = isOwnProfile
    ? ((profile?.bio ?? sessionUser?.bio) || CURRENT_USER.bio)
    : (profile?.bio || '');
  const displayAvatar = (profile?.profilePicture && profile.profilePicture.length > 0)
    ? profile.profilePicture
    : (isOwnProfile ? CURRENT_USER.avatar : 'https://picsum.photos/id/64/200/200');
  const displayCover = CURRENT_USER.coverImage;
  const followerCount = Array.isArray(profile?.followers) ? profile!.followers!.length : (CURRENT_USER.followers || 0);
  const displayFollowingCount = isOwnProfile && followingCount !== undefined 
    ? followingCount 
    : (Array.isArray(profile?.following) ? profile!.following!.length : (CURRENT_USER.following || 0));

  const isFollowingTarget = useMemo(() => {
    if (!targetUserId || !sessionUser) return false;
    const followingAny = (sessionUser as any)?.following;
    if (!Array.isArray(followingAny)) return false;
    return followingAny.some((f: any) => String(f?._id || f?.id || f) === String(targetUserId));
  }, [sessionUser, targetUserId]);

  const handleToggleFollow = useCallback(async () => {
    if (!targetUserId || followingBusy) return;
    setFollowingBusy(true);
    try {
      await toggleFollow(targetUserId);
      const me = await getMe();
      onUpdated(me);
      await load();
    } finally {
      setFollowingBusy(false);
    }
  }, [targetUserId, followingBusy, onUpdated, load]);

  const listItems = useMemo(() => {
    const raw = showList === 'followers' ? (profile as any)?.followers : (profile as any)?.following;
    return Array.isArray(raw) ? raw : [];
  }, [profile, showList]);

  return (
    <div className="w-full max-w-3xl mx-auto pb-20">
        {/* Cover Image */}
        <div className="h-48 md:h-64 rounded-b-[3rem] overflow-hidden relative mb-16 shadow-sm">
            <img src={displayCover} alt="Cover" className="w-full h-full object-cover" />
            <button className="absolute top-4 right-4 bg-black/30 backdrop-blur-md text-white p-2 rounded-xl hover:bg-black/40 transition-colors">
                <Edit3 size={18} />
            </button>
        </div>

        {/* Profile Info */}
        <div className="px-6 relative">
             {/* Avatar */}
            <div className="absolute -top-32 left-8 md:left-12">
                <div
                    className={`w-32 h-32 md:w-40 md:h-40 rounded-[2rem] border-4 border-white shadow-lg overflow-hidden bg-white ${isOwnProfile ? 'cursor-pointer' : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                        if (!isOwnProfile) return;
                        fileInputRef.current?.click();
                    }}
                    onKeyDown={(e) => {
                        if (!isOwnProfile) return;
                        if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
                    }}
                >
                    <img src={displayAvatar} alt={displayName} className="w-full h-full object-cover" />
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => changePhoto(e.target.files?.[0] || null)}
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mb-6">
                 <button className="p-2.5 border-2 border-slate-200 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 transition-colors">
                    <Mail size={20} />
                </button>
                {isOwnProfile ? (
                    <button
                        type="button"
                        onClick={() => {
                            onChangeView?.('SETTINGS');
                        }}
                        className="px-6 py-2.5 rounded-2xl font-bold transition-colors shadow-lg shadow-slate-200 bg-slate-900 text-white hover:bg-slate-800"
                    >
                        Edit Profile
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={handleToggleFollow}
                        disabled={followingBusy || !targetUserId}
                        className={`px-6 py-2.5 rounded-2xl font-bold transition-colors shadow-lg shadow-slate-200 ${
                            isFollowingTarget
                                ? 'bg-white text-slate-900 border border-slate-200 hover:bg-slate-50'
                                : 'bg-primary-500 text-white hover:bg-primary-600'
                        } ${followingBusy ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                        {followingBusy ? 'Please wait…' : (isFollowingTarget ? 'Unfollow' : 'Follow')}
                    </button>
                )}
            </div>

            {/* Names & Bio */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-1">{displayName}</h1>
                <p className="text-slate-400 font-medium mb-4">{displayHandle}</p>
                <p className="text-slate-700 text-lg leading-relaxed max-w-xl">{displayBio}</p>

                <div className="flex flex-wrap gap-y-2 gap-x-4 mt-6 text-sm font-bold">
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-primary-50 text-primary-600 rounded-full border border-primary-100 shadow-sm">
                        <Sparkles size={16} />
                        <span>Mood: Creative ✨</span>
                    </div>
                     <div className="flex items-center gap-2 px-4 py-1.5 bg-secondary-50 text-secondary-600 rounded-full border border-secondary-100 shadow-sm">
                        <Palette size={16} />
                        <span>Loves Art 🎨</span>
                    </div>
                     <div className="flex items-center gap-2 px-4 py-1.5 bg-purple-50 text-purple-600 rounded-full border border-purple-100 shadow-sm">
                        <Music size={16} />
                        <span>Lo-fi Vibes 🎧</span>
                    </div>
                </div>

                <div className="flex gap-6 mt-8">
                    <button
                        type="button"
                        onClick={() => setShowList('following')}
                        className="flex gap-1.5 items-baseline hover:underline"
                    >
                        <span className="text-slate-900 font-bold text-lg">{displayFollowingCount}</span>
                        <span className="text-slate-500">Following</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowList('followers')}
                        className="flex gap-1.5 items-baseline hover:underline"
                    >
                        <span className="text-slate-900 font-bold text-lg">{followerCount}</span>
                        <span className="text-slate-500">Followers</span>
                    </button>
                </div>
            </div>
            
            {/* Tabs */}
            <div className="flex border-b border-slate-200 mb-6">
                <button
                    type="button"
                    onClick={() => setActiveTab('posts')}
                    className={`px-6 py-4 font-bold transition-colors ${activeTab === 'posts' ? 'text-primary-500 border-b-2 border-primary-500' : 'text-slate-500 hover:text-slate-800'}`}
                >
                    Posts
                </button>
                 <button
                    type="button"
                    onClick={() => setActiveTab('replies')}
                    className={`px-6 py-4 font-bold transition-colors ${activeTab === 'replies' ? 'text-primary-500 border-b-2 border-primary-500' : 'text-slate-500 hover:text-slate-800'}`}
                >
                    Replies
                </button>
                 <button
                    type="button"
                    onClick={() => setActiveTab('likes')}
                    className={`px-6 py-4 font-bold transition-colors ${activeTab === 'likes' ? 'text-primary-500 border-b-2 border-primary-500' : 'text-slate-500 hover:text-slate-800'}`}
                >
                    Likes
                </button>
            </div>

            {/* Content */}
            <div className="space-y-6">
                {tabLoading ? (
                    <div className="p-8 text-center text-slate-500 font-medium">Loading…</div>
                ) : posts.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 font-medium">No posts found.</div>
                ) : (
                    posts.map(post => <PostCard key={post.id} post={post} currentUserId={currentUserId} onDelete={handlePostDelete} />)
                )}
            </div>
        </div>

        {showList && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowList(null)}>
                <div className="w-full max-w-md bg-white rounded-[1.5rem] shadow-xl border border-slate-100 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800">{showList === 'followers' ? 'Followers' : 'Following'}</h3>
                        <button type="button" className="text-slate-500 hover:text-slate-800" onClick={() => setShowList(null)}>Close</button>
                    </div>
                    <div className="max-h-[60vh] overflow-auto">
                        {listItems.length === 0 ? (
                            <div className="p-6 text-center text-slate-500 font-medium">No users found.</div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {listItems.map((u: any) => (
                                    <div key={String(u._id || u.id)} className="flex items-center gap-3 p-4">
                                        <img
                                            src={u.profilePicture && String(u.profilePicture).length > 0 ? u.profilePicture : 'https://picsum.photos/id/64/200/200'}
                                            alt=""
                                            className="w-10 h-10 rounded-full object-cover"
                                        />
                                        <div className="min-w-0">
                                            <div className="font-bold text-slate-800 truncate">{u.name || u.username}</div>
                                            <div className="text-sm font-medium text-slate-500 truncate">@{u.username}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default ProfileView;