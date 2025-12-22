import React, { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Story } from '../types';

type Props = {
  story: Story;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
};

const StoryViewerModal: React.FC<Props> = ({ story, onClose, onPrev, onNext, hasPrev, hasNext }) => {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onPrev();
      if (e.key === 'ArrowRight' && hasNext) onNext();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hasNext, hasPrev, onClose, onNext, onPrev]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div
        className="relative w-full max-w-md md:max-w-xl bg-black rounded-[2rem] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={story.user.avatar} alt={story.user.name} className="w-10 h-10 rounded-2xl object-cover border-2 border-white/20" />
            <div>
              <p className="text-white font-bold leading-tight">{story.user.name}</p>
              <p className="text-white/60 text-xs">Story</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="relative">
          <img src={story.image} alt="Story" className="w-full h-[70vh] object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/30" />

          {hasPrev && (
            <button
              type="button"
              onClick={onPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <ChevronLeft size={22} />
            </button>
          )}

          {hasNext && (
            <button
              type="button"
              onClick={onNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <ChevronRight size={22} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoryViewerModal;
