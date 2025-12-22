const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Post = require('../models/Post');

async function upsertUser({ name, username, email, password, bio, profilePicture }) {
  const existing = await User.findOne({ email });
  if (existing) {
    const update = {};
    if (name !== undefined) update.name = name;
    if (bio !== undefined) update.bio = bio;
    if (profilePicture !== undefined) update.profilePicture = profilePicture;

    if (Object.keys(update).length > 0) {
      await User.updateOne({ _id: existing._id }, { $set: update });
    }

    return await User.findById(existing._id);
  }

  const user = new User({
    name: name || '',
    username,
    email,
    password,
    bio: bio || '',
    profilePicture: profilePicture || ''
  });
  await user.save();
  return user;
}

async function ensurePosts(user, contents) {
  const existingCount = await Post.countDocuments({ author: user._id });
  const desired = Math.min(3, Math.max(2, contents.length));
  if (existingCount >= desired) return;

  const needed = desired - existingCount;
  const toCreate = contents.slice(0, needed);

  for (const content of toCreate) {
    const post = new Post({ author: user._id, content, image: '' });
    await post.save();
  }
}

async function main() {
  const MONGODB_URI =
    process.env.MONGODB_URI ||
    'mongodb+srv://dental_admin:akash2004@cluster0.nz99qzc.mongodb.net/SocialMedia?retryWrites=true&w=majority&tls=true';

  await mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 45000
  });

  const password = 'password123';

  const seeds = [
    {
      name: 'Ananya',
      username: 'ananya',
      email: 'ananya@connectify.com',
      bio: 'Coffee. Code. Chill.',
      profilePicture: 'https://picsum.photos/seed/ananya/400/400',
      posts: ['New day, new goals.', 'Weekend vibes.', 'Working on something cool.']
    },
    {
      name: 'Rahul',
      username: 'rahul',
      email: 'rahul@connectify.com',
      bio: 'Gym + tech + travel',
      profilePicture: 'https://picsum.photos/seed/rahul/400/400',
      posts: ['Morning grind.', 'Just shipped a feature.', 'Late night drive.']
    },
    {
      name: 'Sneha',
      username: 'sneha',
      email: 'sneha@connectify.com',
      bio: 'Designing pixels into products',
      profilePicture: 'https://picsum.photos/seed/sneha/400/400',
      posts: ['Sketching a new UI.', 'Color palettes make me happy.', 'Small wins today.']
    },
    {
      name: 'Karthik',
      username: 'karthik',
      email: 'karthik@connectify.com',
      bio: 'Food explorer | Photographer',
      profilePicture: 'https://picsum.photos/seed/karthik/400/400',
      posts: ['Tried a new place today.', 'Street food is love.', 'Captured a golden hour shot.']
    },
    {
      name: 'Meera',
      username: 'meera',
      email: 'meera@connectify.com',
      bio: 'Books, sunsets, and playlists',
      profilePicture: 'https://picsum.photos/seed/meera/400/400',
      posts: ['Reading something amazing.', 'Sunset appreciation post.', 'Music on repeat.']
    }
  ];

  const users = [];
  for (const s of seeds) {
    const u = await upsertUser({
      name: s.name,
      username: s.username,
      email: s.email,
      password,
      bio: s.bio,
      profilePicture: s.profilePicture || ''
    });
    users.push({ user: u, seed: s });
  }

  // Make all seeded users follow each other (so they show up in feeds when followed)
  const userIds = users.map((u) => u.user._id);
  for (const { user } of users) {
    const others = userIds.filter((id) => id.toString() !== user._id.toString());
    await User.updateOne(
      { _id: user._id },
      {
        $addToSet: {
          following: { $each: others }
        }
      }
    );
    await User.updateMany(
      { _id: { $in: others } },
      {
        $addToSet: { followers: user._id }
      }
    );
  }

  // Ensure 2-3 posts each
  for (const { user, seed } of users) {
    await ensurePosts(user, seed.posts);
  }

  console.log('Seed complete: users and posts ensured.');
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch (e) {
    // ignore
  }
  process.exit(1);
});
