import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import {
  createChatConversation,
  getChatConversations,
  getChatMessages,
  getSessionUserId,
  searchUsers,
  type BackendUserSearchResult,
  type ChatConversation,
  type ChatMessage,
  type SessionUser,
} from '../api';
import { getChatSocket } from '../chatSocket';

function readByUserId(entry: { user: any }): string | null {
  const u = entry?.user;
  if (!u) return null;
  if (typeof u === 'string') return u;
  if (typeof u === 'object' && typeof u._id === 'string') return u._id;
  return null;
}

 function senderUserId(sender: any): string | null {
   if (!sender) return null;
   if (typeof sender === 'string') return sender;
   if (typeof sender === 'object') {
     if (typeof sender._id === 'string') return sender._id;
     if (typeof sender.id === 'string') return sender.id;
   }
   return null;
 }

type Props = {
  sessionUser: SessionUser | null;
};

const MessagesView: React.FC<Props> = ({ sessionUser }) => {
  const currentUserId = useMemo(() => getSessionUserId(sessionUser), [sessionUser]);

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);

  const [showNewMessage, setShowNewMessage] = useState(false);
  const [newMessageQuery, setNewMessageQuery] = useState('');
  const [newMessageLoading, setNewMessageLoading] = useState(false);
  const [newMessageResults, setNewMessageResults] = useState<BackendUserSearchResult[]>([]);
  const [newMessageError, setNewMessageError] = useState<string | null>(null);

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});

  const listRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  const activeConversation = useMemo(() => {
    if (!activeConversationId) return null;
    return conversations.find((c) => c._id === activeConversationId) || null;
  }, [activeConversationId, conversations]);

  const titleFor = useCallback(
    (c: ChatConversation) => {
      if (c.type === 'group') return c.title && c.title.length > 0 ? c.title : 'Group';
      const other = c.members.find((m) => String(m._id) !== String(currentUserId));
      return other ? (other.name && other.name.length > 0 ? other.name : other.username) : 'Direct message';
    },
    [currentUserId]
  );

  const avatarFor = useCallback(
    (c: ChatConversation) => {
      const other = c.type === 'dm'
        ? c.members.find((m) => String(m._id) !== String(currentUserId))
        : null;
      const url = other?.profilePicture;
      return url && url.length > 0 ? url : 'https://picsum.photos/id/64/200/200';
    },
    [currentUserId]
  );

  const scrollToBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  const loadConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const items = await getChatConversations();
      setConversations(items);
      if (!activeConversationId && items.length > 0) {
        setActiveConversationId(items[0]._id);
      }
    } catch {
      setConversations([]);
    } finally {
      setLoadingConversations(false);
    }
  }, [activeConversationId]);

  useEffect(() => {
    let cancelled = false;
    const q = newMessageQuery.trim();
    if (!showNewMessage) return;
    if (!q) {
      setNewMessageResults([]);
      setNewMessageError(null);
      return;
    }

    setNewMessageLoading(true);
    setNewMessageError(null);
    const t = window.setTimeout(async () => {
      try {
        const res = await searchUsers(q);
        const filtered = currentUserId ? res.filter((u) => String(u._id) !== String(currentUserId)) : res;
        if (!cancelled) setNewMessageResults(filtered);
      } catch {
        if (!cancelled) setNewMessageResults([]);
      } finally {
        if (!cancelled) setNewMessageLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [newMessageQuery, showNewMessage]);

  const startDm = useCallback(async (userId: string) => {
    if (!currentUserId) return;
    try {
      const result = await createChatConversation({
        type: 'dm',
        memberIds: [String(currentUserId), String(userId)],
      });
      const conversation = result.conversation;
      setShowNewMessage(false);
      setNewMessageQuery('');
      setNewMessageResults([]);
      setNewMessageError(null);
      setConversations((prev) => {
        const exists = prev.some((c) => c._id === conversation._id);
        if (exists) return prev;
        return [conversation, ...prev];
      });
      setActiveConversationId(conversation._id);
    } catch (e: any) {
      const message = e?.response?.data?.error || e?.message || 'Failed to start conversation';
      setNewMessageError(message);
    }
  }, [currentUserId]);

  const loadMessages = useCallback(async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      const items = await getChatMessages(conversationId);
      setMessages(items);
      window.setTimeout(scrollToBottom, 50);
    } catch {
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, [scrollToBottom]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!activeConversationId) return;
    loadMessages(activeConversationId);

    const socket = getChatSocket();
    socket.emit('conversation:join', { conversationId: activeConversationId });
  }, [activeConversationId, loadMessages]);

  useEffect(() => {
    if (!currentUserId) return;

    const socket = getChatSocket();

    const onMessageNew = ({ message }: { message: ChatMessage }) => {
      setMessages((prev) => {
        if (prev.some((m) => m._id === message._id)) return prev;
        return [...prev, message];
      });
      window.setTimeout(scrollToBottom, 50);
    };

    const onTyping = ({ conversationId, userId, isTyping }: { conversationId: string; userId: string; isTyping: boolean }) => {
      if (!activeConversationId || String(conversationId) !== String(activeConversationId)) return;
      if (String(userId) === String(currentUserId)) return;
      setTypingUsers((prev) => ({ ...prev, [userId]: Boolean(isTyping) }));
      if (isTyping) {
        window.setTimeout(() => {
          setTypingUsers((prev) => ({ ...prev, [userId]: false }));
        }, 2500);
      }
    };

    const onMessageRead = ({ messageId, userId, readAt }: { messageId: string; userId: string; readAt: string }) => {
      setMessages((prev) => prev.map((m) => {
        if (m._id !== messageId) return m;
        const exists = (m.readBy || []).some((r) => String(readByUserId(r as any)) === String(userId));
        if (exists) return m;
        return {
          ...m,
          readBy: [...(m.readBy || []), { user: { _id: userId } as any, readAt } as any],
        };
      }));
    };

    socket.on('message:new', onMessageNew);
    socket.on('conversation:typing', onTyping);
    socket.on('message:read', onMessageRead);

    return () => {
      socket.off('message:new', onMessageNew);
      socket.off('conversation:typing', onTyping);
      socket.off('message:read', onMessageRead);
    };
  }, [activeConversationId, currentUserId, scrollToBottom]);

  useEffect(() => {
    if (!currentUserId || !activeConversationId) return;
    if (messages.length === 0) return;

    const last = messages[messages.length - 1];
    const lastSenderId = senderUserId((last as any).sender);
    if (lastSenderId !== null && String(lastSenderId) === String(currentUserId)) return;

    const alreadyRead = (last.readBy || []).some((r) => {
      const userId = readByUserId(r as any);
      return userId !== null && String(userId) === String(currentUserId);
    });
    if (alreadyRead) return;

    const socket = getChatSocket();
    socket.emit('message:read', { messageId: last._id });
  }, [activeConversationId, currentUserId, messages]);

  const send = useCallback(async () => {
    if (!activeConversationId || sending) return;
    if (!input.trim()) return;

    setSending(true);
    const body = input.trim();
    setInput('');

    const socket = getChatSocket();
    socket.emit('message:send', { conversationId: activeConversationId, body }, (res: any) => {
      if (!res?.ok) {
        setInput(body);
      }
      setSending(false);
    });
  }, [activeConversationId, input, sending]);

  const emitTyping = useCallback((isTyping: boolean) => {
    if (!activeConversationId) return;
    const socket = getChatSocket();
    socket.emit('conversation:typing', { conversationId: activeConversationId, isTyping });
  }, [activeConversationId]);

  const onInputChange = (v: string) => {
    setInput(v);
    emitTyping(true);
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => {
      emitTyping(false);
    }, 800);
  };

  const typingText = useMemo(() => {
    const active = Object.entries(typingUsers).filter(([, v]) => v).map(([id]) => id);
    if (active.length === 0) return '';
    if (active.length === 1) return 'Typing…';
    return 'Multiple people are typing…';
  }, [typingUsers]);

  return (
    <div className="w-full h-[calc(100vh-0px)]">
      <div className="w-full max-w-6xl mx-auto py-6 px-4">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="text-primary-600" />
          <h2 className="text-2xl font-bold text-slate-800">Messages</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold text-slate-800">Conversations</p>
                <button
                  type="button"
                  onClick={() => setShowNewMessage(true)}
                  className="text-sm font-bold px-3 py-2 rounded-2xl bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors"
                >
                  New
                </button>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto no-scrollbar">
              {loadingConversations ? (
                <div className="p-5 text-sm text-slate-400 font-medium">Loading…</div>
              ) : conversations.length === 0 ? (
                <div className="p-5 text-sm text-slate-400 font-medium">No conversations yet</div>
              ) : (
                conversations.map((c) => (
                  <button
                    key={c._id}
                    type="button"
                    onClick={() => setActiveConversationId(c._id)}
                    className={`w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50 transition-colors ${
                      activeConversationId === c._id ? 'bg-primary-50' : ''
                    }`}
                  >
                    <img src={avatarFor(c)} className="w-10 h-10 rounded-xl object-cover" alt="" />
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate">{titleFor(c)}</p>
                      <p className="text-xs text-slate-400 truncate">{c.type === 'group' ? 'Group' : 'DM'}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {showNewMessage ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" role="dialog" aria-modal="true">
              <div className="w-full max-w-lg bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <p className="font-bold text-slate-800">New message</p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewMessage(false);
                      setNewMessageQuery('');
                      setNewMessageResults([]);
                      setNewMessageError(null);
                    }}
                    className="text-sm font-bold px-3 py-2 rounded-2xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    Close
                  </button>
                </div>

                <div className="p-6">
                  <input
                    value={newMessageQuery}
                    onChange={(e) => setNewMessageQuery(e.target.value)}
                    placeholder="Search users by username…"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-all"
                  />

                  {newMessageError ? (
                    <div className="mt-3 text-sm font-semibold text-red-600 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
                      {newMessageError}
                    </div>
                  ) : null}

                  <div className="mt-4 max-h-[320px] overflow-y-auto no-scrollbar">
                    {newMessageLoading ? (
                      <div className="py-2 text-sm text-slate-400 font-medium">Searching…</div>
                    ) : newMessageQuery.trim().length === 0 ? (
                      <div className="py-2 text-sm text-slate-400 font-medium">Type to search</div>
                    ) : newMessageResults.length === 0 ? (
                      <div className="py-2 text-sm text-slate-400 font-medium">No users found</div>
                    ) : (
                      <div className="space-y-2">
                        {newMessageResults.map((u) => (
                          <button
                            key={u._id}
                            type="button"
                            onClick={() => startDm(u._id)}
                            className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 text-left"
                          >
                            <img
                              src={u.profilePicture && u.profilePicture.length > 0 ? u.profilePicture : 'https://picsum.photos/id/64/200/200'}
                              className="w-10 h-10 rounded-xl object-cover"
                              alt={u.username}
                            />
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 truncate">{u.name && u.name.length > 0 ? u.name : u.username}</p>
                              <p className="text-xs text-slate-400 truncate">@{u.username}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="min-w-0">
                <p className="font-bold text-slate-800 truncate">{activeConversation ? titleFor(activeConversation) : 'Select a conversation'}</p>
                {typingText ? <p className="text-xs text-primary-600 font-semibold">{typingText}</p> : null}
              </div>
            </div>

            <div ref={listRef} className="flex-1 px-5 py-4 overflow-y-auto no-scrollbar bg-slate-50">
              {loadingMessages ? (
                <div className="text-sm text-slate-400 font-medium">Loading messages…</div>
              ) : messages.length === 0 ? (
                <div className="text-sm text-slate-400 font-medium">No messages</div>
              ) : (
                <div className="space-y-3">
                  {messages.map((m) => {
                    const sid = senderUserId((m as any).sender);
                    const mine = sid !== null && currentUserId !== null && String(sid) === String(currentUserId);
                    return (
                      <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[78%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                          <div
                            className={`${
                              mine
                                ? 'bg-gradient-to-r from-primary-600 to-secondary-500 text-white rounded-[1.2rem] rounded-br-md shadow-md shadow-primary-500/20'
                                : 'bg-white text-slate-800 rounded-[1.2rem] rounded-bl-md shadow-sm border border-slate-100'
                            } px-4 py-2`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{m.body}</p>
                          </div>

                          <div
                            className={`mt-1 text-[11px] font-semibold ${
                              mine ? 'text-slate-500' : 'text-slate-400'
                            } flex items-center gap-2 ${mine ? 'justify-end' : 'justify-start'}`}
                          >
                            <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {mine ? <span>{(m.readBy || []).length > 1 ? 'Read' : 'Sent'}</span> : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-white">
              <div className="flex items-center gap-3">
                <input
                  value={input}
                  onChange={(e) => onInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  disabled={!activeConversationId}
                  placeholder={activeConversationId ? 'Type a message…' : 'Select a conversation to start'}
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-all"
                />

                <button
                  type="button"
                  onClick={send}
                  disabled={!activeConversationId || sending || !input.trim()}
                  className={`px-4 py-3 rounded-2xl font-bold flex items-center gap-2 transition-colors ${
                    !activeConversationId || sending || !input.trim()
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-primary-600 text-white hover:bg-primary-700'
                  }`}
                >
                  <Send size={18} />
                  <span className="hidden sm:block">Send</span>
                </button>
              </div>

              {sending ? (
                <p className="mt-2 text-xs text-slate-400 font-medium">Sending…</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagesView;
