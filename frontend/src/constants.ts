import { User, Post, Story, Notification } from './types';

export const CURRENT_USER: User = {
  id: 'u1',
  name: 'User Sparkle',
  handle: '@user',
  avatar: 'https://picsum.photos/id/64/200/200',
  bio: '✨ Creating daily joy | Digital Artist 🎨 | Coffee Lover ☕️',
  followers: 12500,
  following: 450,
  coverImage: 'https://picsum.photos/id/12/1200/400'
};

export const USERS: User[] = [
  { id: 'u2', name: 'Alex River', handle: '@ariver', avatar: 'https://picsum.photos/id/91/200/200', isVerified: true },
  { id: 'u3', name: 'Sarah Green', handle: '@sgreen_design', avatar: 'https://picsum.photos/id/129/200/200' },
  { id: 'u4', name: 'Techie Tom', handle: '@tomtech', avatar: 'https://picsum.photos/id/177/200/200' },
  { id: 'u5', name: 'Luna Love', handle: '@lunalove', avatar: 'https://picsum.photos/id/338/200/200', isVerified: true },
];

export const STORIES: Story[] = [
  { id: 's1', user: USERS[0], image: 'https://picsum.photos/id/101/300/500', isViewed: false },
  { id: 's2', user: USERS[1], image: 'https://picsum.photos/id/102/300/500', isViewed: false },
  { id: 's3', user: USERS[2], image: 'https://picsum.photos/id/103/300/500', isViewed: true },
  { id: 's4', user: USERS[3], image: 'https://picsum.photos/id/104/300/500', isViewed: false },
];

export const INITIAL_POSTS: Post[] = [
  {
    id: 'p1',
    user: USERS[0],
    content: "Just finished hiking up the mountain! The view is absolutely breathtaking today. 🏔️✨ Who else loves a Sunday hike?",
    image: 'https://picsum.photos/id/1036/800/600',
    likes: 342,
    comments: 24,
    shares: 12,
    timestamp: '2 hours ago',
    isLiked: false
  },
  {
    id: 'p2',
    user: USERS[3],
    content: "Working on a new secret project. Can't wait to share it with you all! 💖 #creative #art",
    likes: 856,
    comments: 112,
    shares: 45,
    timestamp: '4 hours ago',
    isLiked: true
  },
  {
    id: 'p3',
    user: USERS[1],
    content: "Minimalism is not about having less. It's about making room for more of what matters.",
    likes: 124,
    comments: 8,
    shares: 2,
    timestamp: '6 hours ago',
    isLiked: false
  },
    {
    id: 'p4',
    user: USERS[2],
    content: "Check out this amazing coffee setup! ☕️",
    image: 'https://picsum.photos/id/425/800/600',
    likes: 2241,
    comments: 89,
    shares: 302,
    timestamp: '1 day ago',
    isLiked: false
  },
];

export const NOTIFICATIONS: Notification[] = [
  { id: 'n1', type: 'like', user: USERS[0], content: 'liked your post', timestamp: '2m ago', read: false },
  { id: 'n2', type: 'follow', user: USERS[2], timestamp: '1h ago', read: false },
  { id: 'n3', type: 'comment', user: USERS[1], content: 'commented: "Amazing view!"', timestamp: '3h ago', read: true },
];

export const TRENDING_TOPICS = [
  { topic: '#SundayVibes', posts: '125K' },
  { topic: '#DigitalArt', posts: '89K' },
  { topic: 'New Cafe Opening', posts: '12K' },
  { topic: '#TechTrends2024', posts: '56K' },
  { topic: 'Mental Health Awareness', posts: '34K' },
];