import axios from 'axios';

const rawBaseUrl = (import.meta as any).env?.VITE_API_URL as string | undefined;

function normalizeApiBaseUrl(url: string): string {
  const trimmed = url.replace(/\s+/g, '').replace(/\/+$/, '');
  if (trimmed.endsWith('/api')) return trimmed;
  if (trimmed.endsWith('/api/')) return trimmed.replace(/\/+$/, '');
  return `${trimmed}/api`;
}

const baseURL = rawBaseUrl && rawBaseUrl.length > 0
  ? normalizeApiBaseUrl(rawBaseUrl)
  : '/api';

const rawApiOrigin = (import.meta as any).env?.VITE_API_ORIGIN as string | undefined;

const apiOrigin = rawBaseUrl && rawBaseUrl.length > 0
  ? normalizeApiBaseUrl(rawBaseUrl).replace(/\/api\/?$/, '')
  : (rawApiOrigin && rawApiOrigin.length > 0 ? rawApiOrigin : 'http://localhost:5000');

export function getApiOrigin(): string {
  return apiOrigin;
}

function resolveUploadsUrl(pathOrUrl?: string): string | undefined {
  if (!pathOrUrl || pathOrUrl.length === 0) return undefined;
  if (pathOrUrl.startsWith('/uploads') && apiOrigin) return `${apiOrigin}${pathOrUrl}`;
  return pathOrUrl;
}

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

type BackendUser = {
  id?: string;
  _id?: string;
  name?: string;
  username: string;
  email: string;
  profilePicture?: string;
  isVerified?: boolean;
  bio?: string;
  coverImage?: string;
  followers?: string[];
  following?: string[];
};

type BackendPost = {
  _id: string;
  author: {
    _id: string;
    name?: string;
    username: string;
    profilePicture?: string;
    isVerified?: boolean;
  };
  content: string;
  image?: string;
  likes: Array<{ _id: string; username: string }>;
  comments: unknown[];
  createdAt: string;
};

type BackendStory = {
  _id: string;
  user: {
    _id: string;
    name?: string;
    username: string;
    profilePicture?: string;
  };
  image: string;
  createdAt: string;
};

export type SessionUser = BackendUser;

export function getSessionUserId(user: SessionUser | null): string | null {
  if (!user) return null;
  return (user.id || user._id || null) as string | null;
}

export async function getMe(): Promise<SessionUser> {
  const res = await api.get('/auth/me');
  return res.data.user as SessionUser;
}

export async function login(params: { email: string; password: string }): Promise<SessionUser> {
  const res = await api.post('/auth/login', params);
  return res.data.user as SessionUser;
}

export async function register(params: { username: string; email: string; password: string }): Promise<SessionUser> {
  const res = await api.post('/auth/register', params);
  return res.data.user as SessionUser;
}

export async function forgotPassword(email: string): Promise<{ message: string; token?: string }> {
  const res = await api.post('/auth/forgot-password', { email });
  return res.data as { message: string; token?: string };
}

export async function resetPassword(params: { token: string; password: string }): Promise<{ message: string }> {
  const res = await api.post('/auth/reset-password', params);
  return res.data as { message: string };
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

export async function updateProfile(params: { name?: string; username?: string; bio?: string; profilePicture?: File | null }): Promise<SessionUser> {
  const form = new FormData();
  if (params.name !== undefined) {
    form.append('name', params.name);
  }
  if (params.username !== undefined) {
    form.append('username', params.username);
  }
  if (params.bio !== undefined) {
    form.append('bio', params.bio);
  }
  if (params.profilePicture) {
    form.append('profilePicture', params.profilePicture);
  }

  const res = await api.put('/users/profile', form, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  const user = res.data.user as SessionUser;
  if (user && user.profilePicture) {
    (user as any).profilePicture = resolveUploadsUrl(user.profilePicture);
  }
  return user;
}

export async function createPost(params: { content: string; image?: File | null }): Promise<BackendPost> {
  const form = new FormData();
  form.append('content', params.content);
  if (params.image) {
    form.append('image', params.image);
  }

  const res = await api.post('/posts', form, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return res.data.post as BackendPost;
}

export async function createStory(image: File): Promise<BackendStory> {
  const form = new FormData();
  form.append('image', image);
  const res = await api.post('/stories', form, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  const story = res.data.story as BackendStory;
  story.image = resolveUploadsUrl(story.image) as string;
  if (story.user?.profilePicture) {
    story.user.profilePicture = resolveUploadsUrl(story.user.profilePicture);
  }
  return story;
}

export async function getStories(): Promise<BackendStory[]> {
  const res = await api.get('/stories');
  const items = (res.data.stories || []) as BackendStory[];
  return items.map((s) => ({
    ...s,
    image: (resolveUploadsUrl(s.image) as string) || s.image,
    user: {
      ...s.user,
      profilePicture: resolveUploadsUrl(s.user?.profilePicture),
    },
  }));
}

export async function deletePost(postId: string): Promise<void> {
  await api.delete(`/posts/${postId}`);
}

export async function getFeed(): Promise<BackendPost[]> {
  const res = await api.get('/posts/feed');
  return (res.data.posts || []) as BackendPost[];
}

export async function toggleLike(postId: string): Promise<BackendPost> {
  const res = await api.post(`/posts/${postId}/like`);
  return res.data.post as BackendPost;
}

export type BackendComment = {
  _id: string;
  post: string;
  author: {
    _id: string;
    name?: string;
    username: string;
    profilePicture?: string;
  };
  content: string;
  createdAt: string;
};

export async function getComments(postId: string): Promise<BackendComment[]> {
  const res = await api.get(`/comments/post/${postId}`);
  const items = (res.data.comments || []) as BackendComment[];
  return items.map((c) => ({
    ...c,
    author: {
      ...c.author,
      profilePicture: resolveUploadsUrl(c.author.profilePicture),
    },
  }));
}

export async function addComment(params: { postId: string; content: string }): Promise<BackendComment> {
  const res = await api.post('/comments', params);
  const c = res.data.comment as BackendComment;
  return {
    ...c,
    author: {
      ...c.author,
      profilePicture: resolveUploadsUrl(c.author.profilePicture),
    },
  };
}

export async function deleteComment(commentId: string): Promise<void> {
  await api.delete(`/comments/${commentId}`);
}

export type BackendNotification = {
  _id: string;
  user: string;
  type: 'like' | 'comment' | 'follow' | 'unfollow' | 'mention';
  from: {
    _id: string;
    username: string;
    profilePicture?: string;
  };
  targetUser?: {
    _id: string;
    username: string;
    name?: string;
    profilePicture?: string;
  };
  post?: {
    _id: string;
    content?: string;
    image?: string;
    author?: {
      _id: string;
      username: string;
      name?: string;
    };
  };
  read: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function getNotifications(): Promise<BackendNotification[]> {
  try {
    console.log('Making API call to /api/notifications');
    const res = await api.get('/notifications');
    console.log('API response data:', res.data);
    const items = (res.data.notifications || []) as BackendNotification[];
    console.log('Processed notifications:', items);
    return items.map((n) => ({
      ...n,
      from: {
        ...n.from,
        profilePicture: resolveUploadsUrl(n.from.profilePicture),
      },
    }));
  } catch (error) {
    console.error('Error in getNotifications:', error);
    throw error;
  }
}

export async function markNotificationRead(id: string): Promise<BackendNotification> {
  const res = await api.put(`/notifications/${id}/read`);
  return res.data.notification as BackendNotification;
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.put('/notifications/read-all');
}

export async function createTestNotification(): Promise<any> {
  const res = await api.post('/notifications/test');
  return res.data;
}

export async function getUnreadNotificationCount(): Promise<number> {
  const res = await api.get('/notifications/unread-count');
  return Number(res.data.count || 0);
}

export type BackendUserSearchResult = {
  _id: string;
  name?: string;
  username: string;
  email: string;
  profilePicture?: string;
  bio?: string;
  followers?: string[];
  following?: string[];
};

export async function searchUsers(query: string): Promise<BackendUserSearchResult[]> {
  const res = await api.get(`/users/search/${encodeURIComponent(query)}`);
  return res.data.users || [];
}

export async function getSuggestedUsers(): Promise<BackendUserSearchResult[]> {
  const res = await api.get('/users/suggested');
  const users = (res.data.users || []) as BackendUserSearchResult[];
  return users.map((u) => ({
    ...u,
    profilePicture: resolveUploadsUrl(u.profilePicture),
  }));
}

export async function toggleFollow(userId: string): Promise<{ 
  currentUser: { following: BackendUserSearchResult[]; followers: BackendUserSearchResult[] };
  targetUser: { following: BackendUserSearchResult[]; followers: BackendUserSearchResult[] };
}> {
  const res = await api.post(`/users/${userId}/follow`);
  return {
    currentUser: {
      following: (res.data.currentUser?.following || []) as BackendUserSearchResult[],
      followers: (res.data.currentUser?.followers || []) as BackendUserSearchResult[],
    },
    targetUser: {
      following: (res.data.targetUser?.following || []) as BackendUserSearchResult[],
      followers: (res.data.targetUser?.followers || []) as BackendUserSearchResult[],
    },
  };
}

export async function getUserProfile(userId: string): Promise<{ user: BackendUserSearchResult; posts: BackendPost[] }> {
  const res = await api.get(`/users/${userId}`);
  return { user: res.data.user as BackendUserSearchResult, posts: (res.data.posts || []) as BackendPost[] };
}

export async function getUserLikedPosts(userId: string): Promise<BackendPost[]> {
  const res = await api.get(`/users/${userId}/likes`);
  return (res.data.posts || []) as BackendPost[];
}

export async function getUserRepliedPosts(userId: string): Promise<BackendPost[]> {
  const res = await api.get(`/users/${userId}/replies`);
  return (res.data.posts || []) as BackendPost[];
}

export function mapBackendPostToUi(post: BackendPost, currentUserId?: string | null) {
  const imageUrl = resolveUploadsUrl(post.image);

  const avatarUrl = post.author.profilePicture && post.author.profilePicture.length > 0
    ? (resolveUploadsUrl(post.author.profilePicture) as string)
    : 'https://picsum.photos/id/64/200/200';

  const likedByMe = Boolean(
    currentUserId && Array.isArray(post.likes) && post.likes.some((l) => String(l._id) === String(currentUserId))
  );

  return {
    id: post._id,
    user: {
      id: post.author._id,
      name: (post.author as any).name && String((post.author as any).name).length > 0 ? (post.author as any).name : post.author.username,
      handle: `@${post.author.username}`,
      avatar: avatarUrl,
      isVerified: Boolean(post.author.isVerified),
    },
    content: post.content,
    image: imageUrl,
    likes: Array.isArray(post.likes) ? post.likes.length : 0,
    comments: Array.isArray(post.comments) ? post.comments.length : 0,
    shares: 0,
    timestamp: new Date(post.createdAt).toLocaleString(),
    isLiked: likedByMe,
  };
}

export type ChatUser = {
  _id: string;
  username: string;
  name?: string;
  profilePicture?: string;
};

export type ChatConversation = {
  _id: string;
  type: 'dm' | 'group';
  members: ChatUser[];
  admins?: ChatUser[];
  title?: string;
  lastMessageAt?: string | null;
  createdAt: string;
};

export type ChatMessage = {
  _id: string;
  conversation: string;
  sender: ChatUser;
  body: string;
  readBy?: Array<{ user: ChatUser | string; readAt: string }>;
  createdAt: string;
};

export async function getChatConversations(): Promise<ChatConversation[]> {
  const res = await api.get('/chat/conversations');
  const items = (res.data.conversations || []) as ChatConversation[];
  return items.map((c) => ({
    ...c,
    members: (c.members || []).map((m) => ({
      ...m,
      profilePicture: resolveUploadsUrl(m.profilePicture),
    })),
    admins: (c.admins || []).map((a) => ({
      ...a,
      profilePicture: resolveUploadsUrl(a.profilePicture),
    })),
  }));
}

export async function createChatConversation(params: { type: 'dm' | 'group'; memberIds: string[]; title?: string }): Promise<{ conversation: ChatConversation; created: boolean }> {
  const res = await api.post('/chat/conversations', params);
  const conversation = res.data.conversation as ChatConversation;
  return {
    conversation: {
      ...conversation,
      members: (conversation.members || []).map((m) => ({
        ...m,
        profilePicture: resolveUploadsUrl(m.profilePicture),
      })),
      admins: (conversation.admins || []).map((a) => ({
        ...a,
        profilePicture: resolveUploadsUrl(a.profilePicture),
      })),
    },
    created: Boolean(res.data.created),
  };
}

export async function getChatMessages(conversationId: string, params?: { limit?: number; before?: string }): Promise<ChatMessage[]> {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.before) qs.set('before', String(params.before));

  const url = qs.toString().length > 0
    ? `/chat/conversations/${conversationId}/messages?${qs.toString()}`
    : `/chat/conversations/${conversationId}/messages`;

  const res = await api.get(url);
  const items = (res.data.messages || []) as ChatMessage[];
  return items.map((m) => ({
    ...m,
    sender: {
      ...m.sender,
      profilePicture: resolveUploadsUrl((m.sender as any)?.profilePicture),
    },
  }));
}

export async function sendChatMessage(conversationId: string, body: string): Promise<ChatMessage> {
  const res = await api.post(`/chat/conversations/${conversationId}/messages`, { body });
  const message = res.data.message as ChatMessage;
  return {
    ...message,
    sender: {
      ...message.sender,
      profilePicture: resolveUploadsUrl((message.sender as any)?.profilePicture),
    },
  };
}

export async function markChatMessageRead(messageId: string): Promise<ChatMessage> {
  const res = await api.put(`/chat/messages/${messageId}/read`);
  return res.data.message as ChatMessage;
}
