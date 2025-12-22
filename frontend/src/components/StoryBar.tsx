import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import StoryViewerModal from './StoryViewerModal';
import type { Story } from '../types';
import { createStory, getStories, getSuggestedUsers, type SessionUser } from '../api';

type Props = {
  sessionUser: SessionUser | null;
};

const StoryBar: React.FC<Props> = ({ sessionUser }) => {
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [viewed, setViewed] = useState<Record<string, boolean>>({});
  const [items, setItems] = useState<Story[]>([]);
  const [activeMyStory, setActiveMyStory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // When switching accounts, reset local UI state so we don't carry over
    // viewed/open story state from the previous session.
    setViewed({});
    setActiveStoryIndex(null);
    setActiveMyStory(false);
    setItems([]);

    let cancelled = false;
    (async () => {
      try {
        const [stories, suggested] = await Promise.all([getStories(), getSuggestedUsers()]);
        if (cancelled) return;

        const storyByUserId = new Map<string, any>();
        (stories || []).forEach((s: any) => {
          storyByUserId.set(String(s.user?._id), s);
        });

        // Default placeholder stories from suggested users, overridden by real stories when available
        const next: Story[] = (suggested || []).map((u: any) => {
          const s = storyByUserId.get(String(u._id));
          const image = s?.image || `https://picsum.photos/seed/${encodeURIComponent(u.username)}/800/1200`;
          return {
            id: String(u._id),
            user: {
              id: String(u._id),
              name: (u.name && u.name.length > 0) ? u.name : u.username,
              handle: `@${u.username}`,
              avatar: u.profilePicture && u.profilePicture.length > 0
                ? u.profilePicture
                : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.username)}`,
            },
            image,
            isViewed: false,
          };
        });

        // Also include any real stories from users not in suggested list
        (stories || []).forEach((s: any) => {
          const uid = String(s.user?._id);
          if (next.some((x) => String(x.user.id) === uid)) return;
          next.push({
            id: s._id,
            user: {
              id: uid,
              name: (s.user.name && s.user.name.length > 0) ? s.user.name : s.user.username,
              handle: `@${s.user.username}`,
              avatar: s.user.profilePicture && s.user.profilePicture.length > 0 ? s.user.profilePicture : 'https://picsum.photos/id/64/200/200',
            },
            image: s.image,
            isViewed: false,
          });
        });

        setItems(next);
      } catch {
        if (!cancelled) setItems([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionUser?._id]);

  const stories: Story[] = useMemo(() => {
    return items.map((s) => ({ ...s, isViewed: Boolean(s.isViewed) || Boolean(viewed[s.id]) }));
  }, [items, viewed]);

  const friendStories: Story[] = useMemo(() => {
    return stories.filter((s) => s.id !== 'me');
  }, [stories]);

  const myStory: Story | null = useMemo(() => {
    if (!sessionUser) return null;
    const myId = String(sessionUser._id || (sessionUser as any).id);
    const my = items.find((s) => String(s.user.id) === myId);
    if (!my) return null;
    // Only treat as "my story" if the image is an uploaded one (served from /uploads)
    const hasReal = typeof my.image === 'string' && my.image.includes('/uploads/');
    if (!hasReal) return null;
    return { ...my, id: 'me', isViewed: Boolean(viewed['me']) || Boolean(my.isViewed) };
  }, [items, sessionUser, viewed]);

  const openStory = (index: number) => {
    const story = friendStories[index];
    if (!story) return;
    setViewed((prev) => ({ ...prev, [story.id]: true }));
    setActiveStoryIndex(index);
  };

  const openMyStory = () => {
    if (!myStory) return;
    setViewed((prev) => ({ ...prev, [myStory.id]: true }));
    setActiveMyStory(true);
  };

  const pickMyStory = () => {
    fileInputRef.current?.click();
  };

  const onPickedFile = (file: File | null) => {
    if (!file) return;
    (async () => {
      try {
        await createStory(file);
        const [stories, suggested] = await Promise.all([getStories(), getSuggestedUsers()]);

        const storyByUserId = new Map<string, any>();
        (stories || []).forEach((s: any) => {
          storyByUserId.set(String(s.user?._id), s);
        });

        const next: Story[] = (suggested || []).map((u: any) => {
          const s = storyByUserId.get(String(u._id));
          const image = s?.image || `https://picsum.photos/seed/${encodeURIComponent(u.username)}/800/1200`;
          return {
            id: String(u._id),
            user: {
              id: String(u._id),
              name: (u.name && u.name.length > 0) ? u.name : u.username,
              handle: `@${u.username}`,
              avatar: u.profilePicture && u.profilePicture.length > 0
                ? u.profilePicture
                : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.username)}`,
            },
            image,
            isViewed: false,
          };
        });

        (stories || []).forEach((s: any) => {
          const uid = String(s.user?._id);
          if (next.some((x) => String(x.user.id) === uid)) return;
          next.push({
            id: s._id,
            user: {
              id: uid,
              name: (s.user.name && s.user.name.length > 0) ? s.user.name : s.user.username,
              handle: `@${s.user.username}`,
              avatar: s.user.profilePicture && s.user.profilePicture.length > 0 ? s.user.profilePicture : 'https://picsum.photos/id/64/200/200',
            },
            image: s.image,
            isViewed: false,
          });
        });

        setItems(next);
        setViewed((prev) => ({ ...prev, me: false }));
      } catch {
        // ignore
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    })();
  };

  const close = () => setActiveStoryIndex(null);
  const goPrev = () => setActiveStoryIndex((prev) => (prev === null ? prev : Math.max(0, prev - 1)));
  const goNext = () => setActiveStoryIndex((prev) => (prev === null ? prev : Math.min(stories.length - 1, prev + 1)));

  return (
    <div className="flex gap-4 overflow-x-auto no-scrollbar pb-6 pt-2">
      {/* Create Story */}
      <div
        className="flex flex-col items-center gap-2 min-w-[80px] cursor-pointer group"
        onClick={() => {
          if (myStory) openMyStory();
          else pickMyStory();
        }}
      >
        <div className="relative">
          <div className={`p-[3px] rounded-full ${myStory && !myStory.isViewed ? 'bg-gradient-to-tr from-yellow-400 via-secondary-500 to-purple-500' : 'bg-slate-200'}`}>
            <div className="w-16 h-16 rounded-full border-4 border-white shadow-md overflow-hidden relative group-hover:scale-105 transition-transform bg-white">
              <img
                src={sessionUser?.profilePicture && sessionUser.profilePicture.length > 0 ? sessionUser.profilePicture : 'https://picsum.photos/id/64/200/200'}
                alt="Me"
                className="w-full h-full object-cover opacity-80"
              />
              {!myStory && (
                <>
                  <div className="absolute inset-0 bg-black/20" />
                  <div className="absolute inset-0 flex items-center justify-center text-white">
                    <Plus size={24} strokeWidth={3} />
                  </div>
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              pickMyStory();
            }}
            className="absolute bottom-0 right-0 w-6 h-6 bg-primary-500 rounded-full border-2 border-white flex items-center justify-center text-white text-xs"
          >
            <Plus size={14} strokeWidth={4} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onPickedFile(e.target.files?.[0] || null)}
          />
        </div>
        <span className="text-xs font-semibold text-slate-600">You</span>
      </div>

      {/* Friends Stories */}
      {friendStories.map((story, index) => (
        <div key={story.id} className="flex flex-col items-center gap-2 min-w-[80px] cursor-pointer group" onClick={() => openStory(index)}>
          <div className={`p-[3px] rounded-full ${story.isViewed ? 'bg-slate-200' : 'bg-gradient-to-tr from-yellow-400 via-secondary-500 to-purple-500'}`}>
            <div className="w-16 h-16 rounded-full border-4 border-white shadow-sm overflow-hidden group-hover:scale-105 transition-transform bg-white">
              <img src={story.user.avatar} alt={story.user.name} className="w-full h-full object-cover" />
            </div>
          </div>
          <span className="text-xs font-medium text-slate-600 truncate w-20 text-center">{story.user.name.split(' ')[0]}</span>
        </div>
      ))}

      {activeStoryIndex !== null && friendStories[activeStoryIndex] && (
        <StoryViewerModal
          story={friendStories[activeStoryIndex]}
          onClose={close}
          onPrev={goPrev}
          onNext={goNext}
          hasPrev={activeStoryIndex > 0}
          hasNext={activeStoryIndex < friendStories.length - 1}
        />
      )}

      {activeMyStory && myStory && (
        <StoryViewerModal
          story={myStory}
          onClose={() => setActiveMyStory(false)}
          onPrev={() => {}}
          onNext={() => {}}
          hasPrev={false}
          hasNext={false}
        />
      )}
    </div>
  );
};

export default StoryBar;