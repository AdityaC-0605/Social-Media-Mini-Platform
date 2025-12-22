import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Heart, MessageCircle, UserPlus, AtSign } from 'lucide-react';
import { getNotifications, markNotificationRead, markAllNotificationsRead, type BackendNotification } from '../api';

const NotificationsView: React.FC = () => {
  const [items, setItems] = useState<BackendNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart size={20} className="fill-white text-white" />;
      case 'comment': return <MessageCircle size={20} className="fill-white text-white" />;
      case 'follow': return <UserPlus size={20} className="fill-white text-white" />;
      default: return <AtSign size={20} className="text-white" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'like': return 'bg-secondary-500 shadow-secondary-200';
      case 'comment': return 'bg-primary-500 shadow-primary-200';
      case 'follow': return 'bg-purple-500 shadow-purple-200';
      default: return 'bg-slate-500';
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getNotifications();
      console.log('Notifications API response:', res);
      console.log('Notifications count:', res.length);
      setItems(res);
    } catch (error) {
      console.error('Error loading notifications:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);

  const markRead = useCallback(async (notif: BackendNotification) => {
    if (notif.read) return;
    try {
      const updated = await markNotificationRead(notif._id);
      setItems((prev) => prev.map((n) => (n._id === updated._id ? updated : n)));
    } catch {
      setItems((prev) => prev.map((n) => (n._id === notif._id ? { ...n, read: true } : n)));
    }
  }, []);

  const markAll = useCallback(async () => {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } finally {
      setMarkingAll(false);
    }
  }, [markingAll, unreadCount]);

  const toAvatar = (profilePicture?: string) => {
    return profilePicture && profilePicture.length > 0 ? profilePicture : 'https://picsum.photos/id/64/200/200';
  };

  const toTimestamp = (createdAt: string) => {
    const d = new Date(createdAt);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString();
  };

  const toText = (notif: BackendNotification) => {
    if (notif.type === 'follow') {
      if (notif.targetUser) {
        // If this notification is for the followed user, say "you". Otherwise show target username.
        if (String(notif.user) === String(notif.targetUser._id)) return 'started following you';
        return `started following ${notif.targetUser.name || notif.targetUser.username}`;
      }
      return 'started following';
    }
    if (notif.type === 'unfollow') {
      if (notif.targetUser) {
        if (String(notif.user) === String(notif.targetUser._id)) return 'stopped following you';
        return `stopped following ${notif.targetUser.name || notif.targetUser.username}`;
      }
      return 'stopped following';
    }
    if (notif.type === 'like') {
      if (notif.post?.author) {
        return `liked ${notif.post.author.name || notif.post.author.username}'s post`;
      }
      return 'liked your post';
    }
    if (notif.type === 'comment') {
      if (notif.post?.author) {
        return `commented on ${notif.post.author.name || notif.post.author.username}'s post`;
      }
      return 'commented on your post';
    }
    if (notif.type === 'mention') return `mentioned you in ${notif.post ? "a post" : "a comment"}`;
    return '';
  };

  return (
    <div className="w-full max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Notifications</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={markAll}
            disabled={unreadCount === 0 || markingAll}
            className={`text-sm font-bold px-4 py-2 rounded-2xl transition-colors ${
              unreadCount === 0 || markingAll
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-primary-50 text-primary-600 hover:bg-primary-100'
            }`}
          >
            Mark all read
          </button>
        </div>
      </div>
      
      <div className="space-y-4">
        {items.map((notif) => (
          <button
            type="button"
            key={notif._id}
            onClick={() => markRead(notif)}
            className={`w-full text-left p-4 rounded-[1.5rem] flex gap-4 items-center transition-all hover:scale-[1.01] ${notif.read ? 'bg-white border border-slate-100' : 'bg-primary-50 border border-primary-100'}`}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${getBgColor(notif.type)}`}>
              {getIcon(notif.type)}
            </div>
            
            <div className="flex-1">
               <div className="flex gap-2 items-center mb-1">
                  <img src={toAvatar(notif.from?.profilePicture)} className="w-6 h-6 rounded-full object-cover" alt="" />
                  <span className="font-bold text-slate-800">{notif.from?.username}</span>
                  <span className="text-slate-600">{toText(notif)}</span>
               </div>
               {notif.type === 'comment' && notif.post?.content && (
                 <p className="text-slate-500 text-sm">"{notif.post.content}"</p>
               )}
               {notif.post?.image && (
                 <div className="mt-2 flex items-center gap-2">
                   <img 
                     src={notif.post.image} 
                     alt="Post image" 
                     className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                   />
                   <span className="text-slate-500 text-sm">Image attachment</span>
                 </div>
               )}
            </div>
             <span className="text-xs font-semibold text-slate-400">{toTimestamp(notif.createdAt)}</span>
          </button>
        ))}
        
        {/* Placeholder for more */}
         <div className={`p-4 rounded-[1.5rem] bg-white border border-slate-100 flex gap-4 items-center opacity-60 ${loading ? '' : 'hidden'}`}>
             <div className="w-12 h-12 rounded-2xl bg-slate-200 flex items-center justify-center">
                 <Heart size={20} className="text-slate-400" />
             </div>
             <div className="flex-1 space-y-2">
                 <div className="h-4 w-32 bg-slate-200 rounded-full"></div>
                 <div className="h-3 w-48 bg-slate-100 rounded-full"></div>
             </div>
         </div>
      </div>
    </div>
  );
};

export default NotificationsView;