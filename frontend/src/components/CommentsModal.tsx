import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X, Send, Trash2 } from 'lucide-react';
import { addComment, deleteComment, getComments, type BackendComment } from '../api';

type Props = {
  postId: string;
  currentUserId: string | null;
  onClose: () => void;
  onCountChange: (count: number) => void;
};

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
}

const CommentsModal: React.FC<Props> = ({ postId, currentUserId, onClose, onCountChange }) => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<BackendComment[]>([]);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getComments(postId);
      setItems(res);
      onCountChange(res.length);
    } finally {
      setLoading(false);
    }
  }, [onCountChange, postId]);

  useEffect(() => {
    load();
  }, [load]);

  const canSend = useMemo(() => text.trim().length > 0 && !submitting, [submitting, text]);

  const send = async () => {
    if (!canSend) return;
    setSubmitting(true);
    try {
      const created = await addComment({ postId, content: text.trim() });
      setText('');
      setItems((prev) => {
        const next = [created, ...prev];
        onCountChange(next.length);
        return next;
      });
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (commentId: string) => {
    await deleteComment(commentId);
    setItems((prev) => {
      const next = prev.filter((c) => c._id !== commentId);
      onCountChange(next.length);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800">Comments</h3>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-50 text-slate-500">
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[55vh] overflow-y-auto no-scrollbar px-6 py-4">
          {loading ? (
            <div className="py-10 text-center text-slate-400 font-medium">Loading…</div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center text-slate-400 font-medium">No comments yet</div>
          ) : (
            <div className="space-y-4">
              {items.map((c) => {
                const canDelete = currentUserId && String(c.author._id) === String(currentUserId);
                const avatar = c.author.profilePicture && c.author.profilePicture.length > 0 ? c.author.profilePicture : 'https://picsum.photos/id/64/200/200';
                const authorName = c.author.name && c.author.name.length > 0 ? c.author.name : c.author.username;
                return (
                  <div key={c._id} className="flex gap-3">
                    <img src={avatar} alt={authorName} className="w-10 h-10 rounded-2xl object-cover" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{authorName}</span>
                        <span className="text-xs text-slate-400">{formatTimestamp(c.createdAt)}</span>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => remove(c._id)}
                            className="ml-auto text-slate-400 hover:text-red-500 p-2 rounded-xl hover:bg-red-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{c.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Add a comment…"
              className="flex-1 px-4 py-3 bg-slate-50 rounded-2xl border border-transparent focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none font-medium"
            />
            <button
              type="button"
              onClick={send}
              disabled={!canSend}
              className={`p-3 rounded-2xl text-white transition-colors ${canSend ? 'bg-primary-500 hover:bg-primary-600' : 'bg-slate-300 cursor-not-allowed'}`}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentsModal;
