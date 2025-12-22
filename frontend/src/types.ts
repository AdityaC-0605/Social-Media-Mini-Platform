export interface User {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  isVerified?: boolean;
  bio?: string;
  followers?: number;
  following?: number;
  coverImage?: string;
}

export interface Comment {
  id: string;
  user: User;
  content: string;
  timestamp: string;
  likes: number;
}

export interface Post {
  id: string;
  user: User;
  content: string;
  image?: string;
  video?: string;
  likes: number;
  comments: number;
  shares: number;
  timestamp: string;
  isLiked?: boolean;
  isSaved?: boolean;
}

export interface Story {
  id: string;
  user: User;
  image: string;
  isViewed: boolean;
}

export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'mention';
  user: User;
  content?: string;
  timestamp: string;
  read: boolean;
}

export type ViewState = 'HOME' | 'EXPLORE' | 'MESSAGES' | 'NOTIFICATIONS' | 'PROFILE' | 'SETTINGS';