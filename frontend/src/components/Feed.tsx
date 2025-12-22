import React, { useCallback, useEffect, useMemo, useState } from 'react';
import CreatePost from './CreatePost';
import PostCard from './PostCard';
import StoryBar from './StoryBar';
import { INITIAL_POSTS } from '../constants';
import { getFeed, getSessionUserId, mapBackendPostToUi, type SessionUser } from '../api';
import type { Post } from '../types';

interface FeedProps {
  sessionUser: SessionUser | null;
}

const Feed: React.FC<FeedProps> = ({ sessionUser }) => {
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);

  const currentUserId = useMemo(() => getSessionUserId(sessionUser), [sessionUser]);

  const refreshFeed = useCallback(async () => {
    try {
      const backendPosts = await getFeed();
      setPosts(backendPosts.map((p) => mapBackendPostToUi(p, currentUserId)));
    } catch {
      setPosts(INITIAL_POSTS);
    }
  }, [currentUserId]);

  const handlePostDelete = useCallback((postId: string) => {
    setPosts(prev => prev.filter(post => post.id !== postId));
  }, []);

  useEffect(() => {
    refreshFeed();
  }, [refreshFeed]);

  return (
    <div className="w-full max-w-2xl mx-auto pb-20 pt-2">
        {/* Header Title Mobile */}
        <div className="xl:hidden flex items-center justify-center py-4 mb-2">
             <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-secondary-600">
            Connectify
          </h1>
        </div>

      <StoryBar sessionUser={sessionUser} />
      <CreatePost sessionUser={sessionUser} onCreated={refreshFeed} />
      
      <div className="mt-6">
        {posts.map((post) => (
          <PostCard 
            key={post.id} 
            post={post} 
            currentUserId={currentUserId} 
            onDelete={handlePostDelete}
          />
        ))}
      </div>

      {/* Loading Indicator */}
      <div className="flex justify-center py-8">
        <div className="flex gap-2 items-center text-slate-400 text-sm font-medium animate-pulse">
           <div className="w-2 h-2 bg-secondary-400 rounded-full"></div>
           <div className="w-2 h-2 bg-secondary-400 rounded-full animation-delay-200"></div>
           <div className="w-2 h-2 bg-secondary-400 rounded-full animation-delay-400"></div>
        </div>
      </div>
    </div>
  );
};

export default Feed;

