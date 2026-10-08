import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageCircle, Phone, Plus, Search, Send, Stethoscope, Users, X } from 'lucide-react';
import useFetch from '../../hooks/useFetch';
import { errorMessage, services } from '../../services/api';
import { useRealtime } from '../../context/RealtimeContext';
import { useAuth } from '../../context/AuthContext';
import { Badge, Card, SectionHeader } from '../../components/Card';
import { EmptyState, ErrorMessage, PageLoader } from '../../components/Feedback';
import { DoctorAvatar } from '../../components/DoctorCard';

function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function MessagesPage({ role }) {
  const { user } = useAuth();
  const realtime = useRealtime();
  const { connected, onEvent, startCall } = realtime;
  const [params] = useSearchParams();

  const [conversations, setConversations] = useState([]);
  const { data: convData, loading: convLoading, error: convError, reload: reloadConvs } = useFetch(
    () => services.conversations.list()
  );
  const { data: appointments } = useFetch(() => services.appointments.list(true));

  const [activeId, setActiveId] = useState(null);
  const [activePeer, setActivePeer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [composer, setComposer] = useState('');
  const [typingPeer, setTypingPeer] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [busyTarget, setBusyTarget] = useState(null);
  const bottomRef = useRef(null);
  const typingTimerRef = useRef(null);
  const activeIdRef = useRef(null);
  const meRef = useRef(user?.id);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    if (convData) setConversations(convData);
  }, [convData]);

  const contacts = useMemo(() => {
    const map = new Map();
    (appointments || []).forEach((appointment) => {
      const side = role === 'patient' ? appointment.doctor : appointment.patient;
      if (!side) return;
      const key = `${side.user_id}:${side.id}`;
      if (!map.has(key)) {
        map.set(key, { user_id: side.user_id, id: side.id, full_name: side.full_name });
      }
    });
    return [...map.values()];
  }, [appointments, role]);

  const conversationForPeer = useCallback(
    (peerUserId) => conversations.find((conversation) => conversation.other_user_id === peerUserId),
    [conversations]
  );

  const selectConversation = useCallback(async (conversation, peer) => {
    setActiveId(conversation.id);
    setActivePeer(peer);
    setThreadLoading(true);
    try {
      const items = await services.conversations.messages(conversation.id);
      setMessages(items);
      setConversations((current) =>
        current.map((item) => (item.id === conversation.id ? { ...item, unread_count: 0 } : item))
      );
    } catch (err) {
      console.error('load messages', err);
    } finally {
      setThreadLoading(false);
    }
  }, []);

  const openingRef = useRef(new Set());

  const openWithPeer = useCallback(
    async (peer) => {
      if (!peer?.user_id) return;
      if (openingRef.current.has(peer.user_id)) return;
      const existing = conversationForPeer(peer.user_id);
      if (existing) {
        await selectConversation(existing, peer);
        return;
      }
      openingRef.current.add(peer.user_id);
      setBusyTarget(peer.user_id);
      try {
        const conversation = await services.conversations.open(peer.user_id);
        setConversations((current) =>
          current.some((item) => item.id === conversation.id)
            ? current
            : [conversation, ...current]
        );
        await selectConversation(conversation, peer);
      } catch (err) {
        console.error('open conversation', err);
      } finally {
        openingRef.current.delete(peer.user_id);
        setBusyTarget(null);
      }
    },
    [conversationForPeer, selectConversation]
  );

  // Handle ?peer=&name=&call=1 deep link from profile/patient cards.
  useEffect(() => {
    const peerId = params.get('peer');
    if (!peerId) return;
    const peer = { user_id: Number(peerId), name: params.get('name') || 'Contact' };
    const doCall = params.get('call') === '1';
    openWithPeer(peer).then(() => {
      if (doCall) startCall(peer);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // Live events.
  useEffect(() => {
    const unsubscribe = onEvent((payload) => {
      if (payload.type === 'message') {
        const message = payload.message;
        const conversationId = payload.conversation_id;
        const activeNow = activeIdRef.current;
        if (conversationId === activeNow) {
          setMessages((current) => {
            if (current.some((item) => item.id === message.id)) return current;
            const isSelf = message.sender_id === meRef.current;
            const cleaned = isSelf
              ? current.filter(
                  (item) =>
                    !(
                      typeof item.id === 'string' &&
                      item.id.startsWith('temp-') &&
                      item.content === message.content
                    )
                )
              : current;
            return [...cleaned, message];
          });
        } else {
          setConversations((current) =>
            current.map((item) =>
              item.id === conversationId
                ? {
                    ...item,
                    last_message: message.content,
                    updated_at: message.created_at,
                    unread_count: (item.unread_count || 0) + 1,
                  }
                : item
            )
          );
        }
      } else if (payload.type === 'typing') {
        if (payload.conversation_id === activeIdRef.current && payload.user_id !== meRef.current) {
          setTypingPeer(true);
          window.setTimeout(() => setTypingPeer(false), 2500);
        }
      }
    });
    return unsubscribe;
  }, [onEvent]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, threadLoading, typingPeer]);

  function sendTyping() {
    if (!activeIdRef.current) return;
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = window.setTimeout(() => {
      realtime.send({ type: 'typing', conversation_id: activeIdRef.current });
    }, 200);
  }

  async function sendMessage() {
    const content = composer.trim();
    if (!content || !activeId) return;
    const optimistic = {
      id: `temp-${Date.now()}`,
      content,
      sender_id: user?.id,
      created_at: new Date().toISOString(),
      read_at: null,
    };
    setMessages((current) => [...current, optimistic]);
    setComposer('');
    const sent = realtime.send({ type: 'message', conversation_id: activeId, content });
    if (!sent) {
      try {
        await services.conversations.send(activeId, content);
        setMessages((current) => [...current.filter((item) => item.id !== optimistic.id)]);
        const items = await services.conversations.messages(activeId);
        setMessages(items);
      } catch (err) {
        setMessages((current) => current.filter((item) => item.id !== optimistic.id));
        console.error('send message', err);
      }
    } else {
      setConversations((current) =>
        current.map((item) =>
          item.id === activeId ? { ...item, last_message: content, updated_at: new Date().toISOString() } : item
        )
      );
    }
  }

  if (convLoading) return <PageLoader label="Loading conversations..." />;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Messages"
        subtitle="Chat securely with your doctor or patient"
        action={
          <div className="flex items-center gap-2">
            {connected && <Badge tone="green">Connected</Badge>}
            <button
              type="button"
              onClick={() => setShowNew((value) => !value)}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-brand-700"
            >
              {showNew ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              New message
            </button>
          </div>
        }
      />
      <ErrorMessage message={convError} onRetry={reloadConvs} />

      {showNew && (
        <Card className="p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">
            {role === 'patient' ? 'Your doctors' : 'Your patients'}
          </p>
          {contacts.length === 0 ? (
            <p className="text-sm text-slate-500">
              {role === 'patient'
                ? 'Doctors appear here once you book an appointment.'
                : 'Patients appear here once they book an appointment with you.'}
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {contacts.map((contact) => {
                const busy = busyTarget === contact.user_id;
                return (
                  <button
                    key={`${contact.user_id}-${contact.id}`}
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      openWithPeer(contact);
                      setShowNew(false);
                    }}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-left transition hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50"
                  >
                    <DoctorAvatar name={contact.full_name} size="h-9 w-9" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{contact.full_name}</p>
                      <p className="truncate text-xs text-slate-500">
                        {role === 'patient' ? 'Doctor' : 'Patient'}
                      </p>
                    </div>
                    {busy && <span className="text-xs text-slate-400">Opening...</span>}
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {conversations.length === 0 ? (
        <EmptyState
          icon={role === 'patient' ? Stethoscope : Users}
          title="No conversations yet."
          description={
            role === 'patient'
              ? 'Open a conversation with your doctor from their profile, or book an appointment first.'
              : 'Open a conversation with a patient from your patient list.'
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
          {/* Conversation list */}
          <Card className="flex max-h-[70vh] flex-col overflow-hidden">
            <div className="space-y-1 overflow-y-auto p-2">
              {conversations.map((conversation) => {
                const active = conversation.id === activeId;
                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => selectConversation(conversation, {
                      user_id: conversation.other_user_id,
                      name: conversation.other_name,
                    })}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                      active ? 'bg-brand-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="relative">
                      <DoctorAvatar name={conversation.other_name} size="h-10 w-10" />
                      {conversation.unread_count > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                          {conversation.unread_count}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {conversation.other_name}
                        </p>
                        <span className="shrink-0 text-[10px] text-slate-400">
                          {formatTime(conversation.updated_at)}
                        </span>
                      </div>
                      <p className="truncate text-xs text-slate-500">
                        {conversation.last_message || 'No messages yet'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Thread */}
          <Card className="flex max-h-[70vh] flex-col overflow-hidden">
            {!activeId ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
                <MessageCircle className="h-10 w-10 text-slate-300" />
                <p className="text-sm font-medium text-slate-500">Select a conversation</p>
                <p className="text-xs text-slate-400">Messages and video calls with your doctor appear here.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <DoctorAvatar name={activePeer?.name} size="h-9 w-9" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{activePeer?.name}</p>
                      {typingPeer && <p className="text-xs text-brand-600">typing...</p>}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => startCall(activePeer)}
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-white transition hover:bg-slate-700"
                  >
                    <Phone className="h-4 w-4" /> Video call
                  </button>
                </div>

                <div className="scrollable flex-1 space-y-3 overflow-y-auto p-4">
                  {threadLoading ? (
                    <PageLoader label="Loading messages..." />
                  ) : messages.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-400">
                      Say hello to start the conversation.
                    </p>
                  ) : (
                    messages.map((message) => {
                      const mine = message.sender_id === user?.id;
                      return (
                        <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                              mine ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{message.content}</p>
                            <p
                              className={`mt-1 text-[10px] ${
                                mine ? 'text-brand-100' : 'text-slate-400'
                              }`}
                            >
                              {formatTime(message.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={bottomRef} />
                </div>

                <div className="border-t border-slate-100 bg-slate-50 p-3">
                  <div className="flex gap-2">
                    <input
                      className="input-base flex-1"
                      placeholder="Type a message..."
                      value={composer}
                      onChange={(event) => {
                        setComposer(event.target.value);
                        sendTyping();
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          sendMessage();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={sendMessage}
                      disabled={!composer.trim()}
                      className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Send message"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>
      )}
      <p className="flex items-center gap-1 text-xs text-slate-400">
        <Search className="h-3 w-3" /> Live messages and video calls require the backend to be
        running.
      </p>
    </div>
  );
}