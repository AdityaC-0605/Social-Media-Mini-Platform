import React, { useEffect, useMemo, useState } from 'react';
import { Search, TrendingUp, UserPlus, MoreHorizontal } from 'lucide-react';
import { TRENDING_TOPICS, USERS } from '../constants';
import { getSuggestedUsers, searchUsers, toggleFollow, type BackendUserSearchResult } from '../api';

interface RightPanelProps {
  onOpenProfile: (userId: string) => void;
  onFollowingUpdate?: (followingCount: number) => void;
  onOpenExploreTopic: (topic: string) => void;
}

const RightPanel: React.FC<RightPanelProps> = ({ onOpenProfile, onOpenExploreTopic, onFollowingUpdate }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BackendUserSearchResult[]>([]);

  const [suggested, setSuggested] = useState<BackendUserSearchResult[]>([]);
  const [suggestedLoading, setSuggestedLoading] = useState(false);
  const [followingIds, setFollowingIds] = useState<Record<string, boolean>>({});

  const normalizedQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!normalizedQuery) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await searchUsers(normalizedQuery);
        if (!cancelled) setResults(res);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const t = window.setTimeout(run, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [normalizedQuery]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSuggestedLoading(true);
      try {
        const users = await getSuggestedUsers();
        if (!cancelled) setSuggested(users);
      } finally {
        if (!cancelled) setSuggestedLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onToggleFollow = async (userId: string) => {
    const isCurrentlyFollowing = followingIds[userId];
    setFollowingIds((prev) => ({ ...prev, [userId]: !isCurrentlyFollowing }));
    try {
      const result = await toggleFollow(userId);
      // Update the following count in the parent component
      if (onFollowingUpdate) {
        onFollowingUpdate(result.currentUser.following.length);
      }
    } catch {
      setFollowingIds((prev) => ({ ...prev, [userId]: isCurrentlyFollowing }));
    }
  };

  const avatarFor = (u: BackendUserSearchResult) => {
    return u.profilePicture && u.profilePicture.length > 0 ? u.profilePicture : 'https://picsum.photos/id/64/200/200';
  };

  const displayNameFor = (u: BackendUserSearchResult) => {
    return u.name && u.name.length > 0 ? u.name : u.username;
  };

  return (
    <aside className="hidden lg:block w-[350px] p-6 h-screen sticky top-0 overflow-y-auto no-scrollbar space-y-8">
      {/* Search Bar */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search size={20} className="text-slate-400 group-focus-within:text-primary-500 transition-colors" />
        </div>
        <input
          type="text"
          placeholder="Search Connectify..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-all shadow-sm"
        />

        {normalizedQuery && (
          <div className="absolute left-0 right-0 top-[52px] z-50 bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden">
            {loading && results.length === 0 ? (
              <div className="p-4 text-sm text-slate-400 font-medium">Searching…</div>
            ) : results.length === 0 ? (
              <div className="p-4 text-sm text-slate-400 font-medium">No users found</div>
            ) : (
              <div className="max-h-[320px] overflow-y-auto no-scrollbar">
                {results.map((u) => (
                  <button
                    key={u._id}
                    type="button"
                    onClick={() => {
                      onOpenProfile(u._id);
                      setQuery('');
                      setResults([]);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left"
                  >
                    <img src={avatarFor(u)} alt={u.username} className="w-10 h-10 rounded-xl object-cover" />
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-slate-800 truncate">{displayNameFor(u)}</p>
                      <p className="text-xs text-slate-400 truncate">@{u.username}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Daily Vibe Widget */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] p-6 text-white shadow-lg shadow-indigo-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
        <h3 className="text-xl font-bold mb-1 relative z-10">Daily Vibe 🌟</h3>
        <p className="text-indigo-100 text-sm mb-4 relative z-10">Don't forget to smile today! You are doing amazing.</p>
        <div className="flex items-center justify-between relative z-10">
            <span className="text-3xl">🌈 ✨ ☁️</span>
            <button className="bg-white/20 hover:bg-white/30 backdrop-blur-md px-4 py-1.5 rounded-xl text-sm font-semibold transition-colors">
                Share Mood
            </button>
        </div>
      </div>

      {/* Trending Topics */}
      <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <TrendingUp size={20} className="text-secondary-500" />
            Trending
          </h3>
          <MoreHorizontal size={20} className="text-slate-400 cursor-pointer" />
        </div>
        <div className="space-y-5">
          {TRENDING_TOPICS.map((item, index) => (
            <button
              key={index}
              type="button"
              onClick={() => onOpenExploreTopic(item.topic)}
              className="w-full flex justify-between items-center cursor-pointer group text-left"
            >
              <div>
                <p className="font-bold text-slate-700 group-hover:text-primary-500 transition-colors">{item.topic}</p>
                <p className="text-xs text-slate-400">{item.posts} posts</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-50 text-slate-300 flex items-center justify-center group-hover:bg-primary-50 group-hover:text-primary-500 transition-colors">
                <span className="text-xs font-bold">#</span>
              </div>
            </button>
          ))}
        </div>
        <button className="w-full mt-6 py-2 text-primary-500 font-semibold hover:bg-primary-50 rounded-xl transition-colors text-sm">
          Show more
        </button>
      </div>

      {/* Who to Follow */}
      <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
         <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-lg text-slate-800">Who to follow</h3>
          <a href="#" className="text-xs font-bold text-primary-500 hover:underline">See all</a>
        </div>
        <div className="space-y-4">
          {suggestedLoading && suggested.length === 0 ? (
            <div className="py-2 text-sm text-slate-400 font-medium">Loading…</div>
          ) : (
            (suggested.length > 0 ? suggested.slice(0, 5) : []).map((u) => (
              <div key={u._id} className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onOpenProfile(u._id)}
                  className="flex items-center gap-3 text-left"
                >
                  <img src={avatarFor(u)} alt={u.username} className="w-10 h-10 rounded-xl object-cover" />
                  <div>
                    <p className="font-bold text-sm text-slate-800 hover:underline cursor-pointer">{displayNameFor(u)}</p>
                    <p className="text-xs text-slate-400">@{u.username}</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onToggleFollow(u._id)}
                  className={`p-2 rounded-xl transition-colors shadow-md shadow-slate-200 ${
                    followingIds[u._id]
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      : 'bg-slate-900 text-white hover:bg-slate-700'
                  }`}
                  aria-label={followingIds[u._id] ? 'Unfollow' : 'Follow'}
                >
                  <UserPlus size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
};

export default RightPanel;