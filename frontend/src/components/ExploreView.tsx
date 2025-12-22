import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { TRENDING_TOPICS } from '../constants';
import { searchUsers, toggleFollow, type BackendUserSearchResult } from '../api';

interface ExploreViewProps {
  onOpenProfile: (userId: string) => void;
  initialTopic?: string | null;
  onSelectTopic: (topic: string | null) => void;
}

const ExploreView: React.FC<ExploreViewProps> = ({ onOpenProfile, initialTopic, onSelectTopic }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BackendUserSearchResult[]>([]);
  const [followingIds, setFollowingIds] = useState<Record<string, boolean>>({});
  const [activeTopic, setActiveTopic] = useState<string>('For You');
  const [topicRefresh, setTopicRefresh] = useState(0);

  const normalizedQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    if (initialTopic && initialTopic.length > 0) {
      setActiveTopic(initialTopic);
      setTopicRefresh((n) => n + 1);
    }
  }, [initialTopic]);

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

  const onToggleFollow = useCallback(async (userId: string) => {
    setFollowingIds((prev) => ({ ...prev, [userId]: !prev[userId] }));
    try {
      await toggleFollow(userId);
    } catch {
      setFollowingIds((prev) => ({ ...prev, [userId]: !prev[userId] }));
    }
  }, []);

  const avatarFor = (u: BackendUserSearchResult) => {
    return u.profilePicture && u.profilePicture.length > 0 ? u.profilePicture : 'https://picsum.photos/id/64/200/200';
  };

  const displayNameFor = (u: BackendUserSearchResult) => {
    return u.name && u.name.length > 0 ? u.name : u.username;
  };

  const categories = useMemo(() => {
    return ['For You', ...TRENDING_TOPICS.map((t) => t.topic), 'Photography', 'Design'];
  }, []);

  const discoveryImages = useMemo(() => {
    // Deterministic enough but still "fresh" when topicRefresh increments
    const seedBase = `${activeTopic}-${topicRefresh}`;
    return Array.from({ length: 18 }).map((_, i) => {
      const seed = encodeURIComponent(`${seedBase}-${i}`);
      return `https://picsum.photos/seed/${seed}/600/600`;
    });
  }, [activeTopic, topicRefresh]);

  return (
    <div className="w-full pb-20 pt-4 px-4">
      {/* Search Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-6 text-slate-800">Explore</h2>
        <div className="relative mb-6">
           <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={20} className="text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Search for people, tags, or inspiration..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-all shadow-sm text-lg"
          />
        </div>

        {/* Categories / Tags */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {categories.map((topic) => {
              const active = activeTopic === topic;
              return (
                <button
                  key={topic}
                  type="button"
                  onClick={() => {
                    setActiveTopic(topic);
                    setTopicRefresh((n) => n + 1);
                    onSelectTopic(topic);
                  }}
                  className={`px-6 py-2.5 rounded-xl font-bold whitespace-nowrap transition-colors shadow-md shadow-slate-200 ${
                    active
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:border-primary-300 hover:text-primary-600'
                  }`}
                >
                  {topic}
                </button>
              );
            })}
        </div>
      </div>

      {/* Empty State / Search Placeholder */}
      {normalizedQuery ? (
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">Search results</h3>
              <span className="text-sm font-semibold text-slate-400">{loading ? 'Searching…' : `${results.length} found`}</span>
            </div>

            {loading && results.length === 0 ? (
              <div className="py-10 text-center text-slate-400 font-medium">Loading…</div>
            ) : results.length === 0 ? (
              <div className="py-10 text-center text-slate-400 font-medium">No users found</div>
            ) : (
              <div className="space-y-4">
                {results.map((u) => (
                  <div key={u._id} className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => onOpenProfile(u._id)}
                      className="flex items-center gap-3 text-left"
                    >
                      <img src={avatarFor(u)} alt={u.username} className="w-12 h-12 rounded-2xl object-cover" />
                      <div>
                        <p className="font-bold text-slate-800">{displayNameFor(u)}</p>
                        <p className="text-sm text-slate-400">@{u.username}</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleFollow(u._id)}
                      className={`px-5 py-2 rounded-2xl font-bold transition-colors ${
                        followingIds[u._id]
                          ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                      }`}
                    >
                      {followingIds[u._id] ? 'Following' : 'Follow'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-slate-800">{activeTopic}</h3>
            <button
              type="button"
              onClick={() => setTopicRefresh((n) => n + 1)}
              className="text-sm font-bold text-primary-500 hover:underline"
            >
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {discoveryImages.map((src) => (
              <div key={src} className="aspect-square rounded-3xl overflow-hidden bg-white border border-slate-100 shadow-sm">
                <img src={src} alt={activeTopic} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExploreView;