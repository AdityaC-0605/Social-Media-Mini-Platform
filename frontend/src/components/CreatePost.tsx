import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Smile, Mic, Sparkles, X } from 'lucide-react';
import { CURRENT_USER } from '../constants';
import { createPost, type SessionUser } from '../api';

interface CreatePostProps {
  sessionUser: SessionUser | null;
  onCreated: () => void | Promise<void>;
}

const CreatePost: React.FC<CreatePostProps> = ({ sessionUser, onCreated }) => {
  const [content, setContent] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const imagePreviewUrl = useMemo(() => {
    if (!image) return null;
    return URL.createObjectURL(image);
  }, [image]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const displayName = sessionUser?.name || sessionUser?.username || CURRENT_USER.name;
  const displayAvatar = sessionUser?.profilePicture && sessionUser.profilePicture.length > 0 ? sessionUser.profilePicture : CURRENT_USER.avatar;

  const submit = async () => {
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    try {
      await createPost({ content: content.trim(), image });
      setContent('');
      setImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onCreated();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 mb-8">
      <div className="flex gap-4">
        <img
          src={displayAvatar}
          alt={displayName}
          className="w-12 h-12 rounded-2xl object-cover"
        />
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full min-h-[100px] text-lg text-slate-700 placeholder-slate-400 border-none focus:ring-0 resize-none bg-transparent outline-none"
          />

          {imagePreviewUrl && (
            <div className="mt-3 flex items-start gap-3">
              <div className="relative">
                <img
                  src={imagePreviewUrl}
                  alt="Selected"
                  className="w-20 h-20 rounded-2xl object-cover border border-slate-200"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImage(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-md hover:bg-slate-800 transition-colors"
                  aria-label="Remove image"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 text-sm font-medium text-slate-500 pt-1">
                Image selected
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setImage(e.target.files?.[0] || null)}
          />
          <div className="flex items-center justify-between mt-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-primary-500 hover:bg-primary-50 rounded-full transition-colors"
              >
                <Image size={22} />
              </button>
              <button type="button" className="p-2 text-secondary-500 hover:bg-secondary-50 rounded-full transition-colors">
                <Smile size={22} />
              </button>
               <button type="button" className="p-2 text-purple-500 hover:bg-purple-50 rounded-full transition-colors">
                <Mic size={22} />
              </button>
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={!content.trim() || submitting}
              className={`px-6 py-2.5 rounded-2xl font-bold text-white shadow-md flex items-center gap-2 transition-all ${
                content.trim() && !submitting
                  ? 'bg-primary-500 hover:bg-primary-600 hover:-translate-y-1 hover:shadow-lg shadow-primary-500/30'
                  : 'bg-slate-300 cursor-not-allowed'
              }`}
            >
              <Sparkles size={18} />
              <span>Post</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePost;