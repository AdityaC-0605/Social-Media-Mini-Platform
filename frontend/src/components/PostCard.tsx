import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Repeat2, Share2, MoreHorizontal, BadgeCheck, Bookmark, Trash2 } from 'lucide-react';
import { Post } from '../types';
import { toggleLike, deletePost } from '../api';
import CommentsModal from './CommentsModal';

interface PostCardProps {
  post: Post;
  currentUserId: string | null;
  onDelete?: (postId: string) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, currentUserId, onDelete }) => {
  const [liked, setLiked] = useState(Boolean(post.isLiked));
  const [likeCount, setLikeCount] = useState(post.likes);
  const [saved, setSaved] = useState(post.isSaved);
  const [commentCount, setCommentCount] = useState(post.comments);
  const [showComments, setShowComments] = useState(false);
  const [liking, setLiking] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const canInteract = useMemo(() => Boolean(currentUserId), [currentUserId]);

  const handleLike = async () => {
    if (!canInteract || liking) return;
    setLiking(true);
    const prevLiked = liked;
    const prevCount = likeCount;

    setLiked(!prevLiked);
    setLikeCount((c) => c + (prevLiked ? -1 : 1));

    try {
      const updated = await toggleLike(post.id);
      const serverCount = Array.isArray(updated.likes) ? updated.likes.length : prevCount;
      setLikeCount(serverCount);
      const serverLiked = Boolean(
        currentUserId && Array.isArray(updated.likes) && updated.likes.some((l) => String(l._id) === String(currentUserId))
      );
      setLiked(serverLiked);
    } catch {
      setLiked(prevLiked);
      setLikeCount(prevCount);
    } finally {
      setLiking(false);
    }
  };

  const handleDelete = async () => {
    if (!currentUserId || !window.confirm('Are you sure you want to delete this post?')) return;
    
    setDeleting(true);
    try {
      await deletePost(post.id);
      onDelete?.(post.id);
    } catch (error) {
      console.error('Failed to delete post:', error);
    } finally {
      setDeleting(false);
      setShowDropdown(false);
    }
  };

  const isOwnPost = currentUserId === post.user.id;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  return (
    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 mb-6 hover:shadow-md transition-shadow duration-300">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex gap-3">
          <img
            src={post.user.avatar}
            alt={post.user.name}
            className="w-12 h-12 rounded-2xl object-cover hover:ring-4 ring-primary-50 transition-all cursor-pointer"
          />
          <div>
            <div className="flex items-center gap-1">
              <h3 className="font-bold text-slate-900 hover:underline cursor-pointer">{post.user.name}</h3>
              {post.user.isVerified && <BadgeCheck size={16} className="text-primary-500 fill-primary-100" />}
            </div>
            <div className="flex items-center text-slate-400 text-sm">
              <span>{post.user.handle}</span>
              <span className="mx-1">·</span>
              <span>{post.timestamp}</span>
            </div>
          </div>
        </div>
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="text-slate-300 hover:text-slate-600 p-2 hover:bg-slate-50 rounded-full transition-colors"
          >
            <MoreHorizontal size={20} />
          </button>
          
          {showDropdown && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-50">
              {isOwnPost && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors text-left"
                >
                  <Trash2 size={16} />
                  <span>{deleting ? 'Deleting...' : 'Delete post'}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <p className="text-slate-700 text-lg mb-4 leading-relaxed whitespace-pre-wrap">{post.content}</p>

      {post.image && (
        <div className="mb-4 rounded-3xl overflow-hidden shadow-sm">
          <img src={post.image} alt="Post content" className="w-full h-auto object-cover hover:scale-105 transition-transform duration-500" />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-50 mt-4">
        <div className="flex items-center gap-6">
          <button
            onClick={handleLike}
            disabled={!canInteract}
            className={`flex items-center gap-2 group transition-colors ${
              liked ? 'text-secondary-500' : 'text-slate-400 hover:text-secondary-500'
            }`}
          >
            <div className={`p-2 rounded-full group-hover:bg-secondary-50 transition-colors ${liked ? 'bg-secondary-50' : ''}`}>
               <Heart size={22} className={`${liked ? 'fill-secondary-500' : ''} group-active:scale-90 transition-transform`} />
            </div>
            <span className="font-medium">{likeCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowComments(true)}
            disabled={!canInteract}
            className="flex items-center gap-2 text-slate-400 hover:text-primary-500 group transition-colors"
          >
             <div className="p-2 rounded-full group-hover:bg-primary-50 transition-colors">
              <MessageCircle size={22} />
            </div>
            <span className="font-medium">{commentCount}</span>
          </button>

          <button className="flex items-center gap-2 text-slate-400 hover:text-green-500 group transition-colors">
            <div className="p-2 rounded-full group-hover:bg-green-50 transition-colors">
              <Repeat2 size={22} />
            </div>
            <span className="font-medium">{post.shares}</span>
          </button>
        </div>

        <div className="flex gap-2">
           <button
            onClick={() => setSaved(!saved)}
            className={`text-slate-400 hover:text-yellow-500 p-2 hover:bg-yellow-50 rounded-full transition-colors ${saved ? 'text-yellow-500' : ''}`}
           >
            <Bookmark size={22} className={saved ? 'fill-yellow-500' : ''} />
          </button>
          <button className="text-slate-400 hover:text-primary-500 p-2 hover:bg-primary-50 rounded-full transition-colors">
            <Share2 size={22} />
          </button>
        </div>
      </div>

      {showComments && (
        <CommentsModal
          postId={post.id}
          currentUserId={currentUserId}
          onClose={() => setShowComments(false)}
          onCountChange={setCommentCount}
        />
      )}
    </div>
  );
};

export default PostCard;