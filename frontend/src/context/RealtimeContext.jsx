import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Mic, MicOff, PhoneCall, PhoneOff, Video, VideoOff, X } from 'lucide-react';
import { getChatSocketURL } from '../services/api';
import { useAuth } from './AuthContext';

const RealtimeContext = createContext(null);

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

const CALL_EVENTS = new Set([
  'call-offer',
  'call-answer',
  'call-ice',
  'call-decline',
  'call-cancel',
  'call-end',
  'call-failed',
]);

function makeCallId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function RealtimeProvider({ children }) {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [eventVersion, setEventVersion] = useState(0);
  const listenersRef = useRef(new Set());
  const socketRef = useRef(null);
  const reconnectRef = useRef({ attempts: 0, timer: null, closed: false });
  const heartbeatRef = useRef(null);
  const pendingOfferRef = useRef(null);

  const [callState, setCallState] = useState('idle'); // idle|ringing|incoming|connecting|active|declined|ended|failed
  const [callPeer, setCallPeer] = useState(null);
  const [callId, setCallId] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const pcRef = useRef(null);

  const stateRef = useRef({
    callState,
    callPeer,
    callId,
    user,
    pendingOffer: null,
  });
  stateRef.current = { callState, callPeer, callId, user, pendingOffer: pendingOfferRef.current };

  // ---- generic event wiring ----
  const publish = useCallback((payload) => {
    listenersRef.current.forEach((listener) => {
      try {
        listener(payload);
      } catch (err) {
        console.error('realtime listener error', err);
      }
    });
    setEventVersion((version) => version + 1);
  }, []);

  const send = useCallback((payload) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }, []);

  const onEvent = useCallback((listener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  // ---- call helpers ----
  const cleanupCall = useCallback(() => {
    if (pcRef.current) {
      try {
        pcRef.current.onicecandidate = null;
        pcRef.current.ontrack = null;
        pcRef.current.close();
      } catch (err) {
        /* ignore */
      }
      pcRef.current = null;
    }
    if (stateRef.current.localStream) {
      stateRef.current.localStream.getTracks().forEach((track) => track.stop());
    }
    stateRef.current.localStream = null;
    pendingOfferRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setMuted(false);
    setCameraOff(false);
  }, []);

  const finishCall = useCallback(
    (state, peer = null, id = null) => {
      cleanupCall();
      setCallState(state);
      setCallPeer(peer);
      setCallId(id);
    },
    [cleanupCall]
  );

  const createPeerConnection = useCallback(() => {
    const peerId = stateRef.current.callPeer?.user_id;
    const callIdNow = stateRef.current.callId;
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        send({
          type: 'call-ice',
          call_id: callIdNow,
          to_user_id: peerId,
          candidate: event.candidate.toJSON(),
        });
      }
    };
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) setRemoteStream(event.streams[0]);
    };
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected' || state === 'completed') {
        setCallState('active');
      } else if (state === 'failed') {
        finishCall('ended', stateRef.current.callPeer, stateRef.current.callId);
      }
    };
    pcRef.current = pc;
    return pc;
  }, [send, finishCall]);

  const getMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stateRef.current.localStream = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      return null;
    }
  }, []);

  // ---- incoming event handling ----
  const handleEvent = useCallback(
    (payload) => {
      const type = payload.type;
      if (type === 'message' || type === 'typing') {
        publish(payload);
        return;
      }
      if (!CALL_EVENTS.has(type)) return;

      const current = stateRef.current;
      if (type === 'call-offer') {
        if (current.callState !== 'idle') {
          send({ type: 'call-decline', call_id: payload.call_id, to_user_id: payload.from_user_id });
          return;
        }
        pendingOfferRef.current = payload.offer || null;
        stateRef.current.pendingOffer = payload.offer || null;
        setCallPeer({
          user_id: payload.from_user_id,
          name: payload.caller_name || 'Contact',
          role: payload.caller_role || 'user',
        });
        setCallId(payload.call_id);
        setCallState('incoming');
        return;
      }

      if (payload.call_id !== current.callId) return;

      if (type === 'call-answer') {
        if (pcRef.current && payload.answer) {
          pcRef.current
            .setRemoteDescription(payload.answer)
            .then(() => setCallState('active'))
            .catch((err) => console.error('setRemoteDescription(answer)', err));
        }
        return;
      }
      if (type === 'call-ice') {
        if (pcRef.current && payload.candidate) {
          pcRef.current.addIceCandidate(payload.candidate).catch((err) => console.error('addIceCandidate', err));
        }
        return;
      }
      if (type === 'call-decline') {
        finishCall('declined', current.callPeer, payload.call_id);
        return;
      }
      if (type === 'call-cancel') {
        if (current.callState === 'incoming') {
          finishCall('idle', null, null);
        }
        return;
      }
      if (type === 'call-end') {
        finishCall('ended', current.callPeer, payload.call_id);
        return;
      }
      if (type === 'call-failed') {
        finishCall('failed', current.callPeer, payload.call_id);
      }
    },
    [publish, send, finishCall]
  );

  // ---- socket lifecycle ----
  useEffect(() => {
    if (!user) return undefined;

    let disposed = false;
    const connect = () => {
      const socket = new WebSocket(getChatSocketURL());
      socketRef.current = socket;
      socket.onopen = () => {
        reconnectRef.current.attempts = 0;
        setConnected(true);
        heartbeatRef.current = window.setInterval(() => {
          if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000);
      };
      socket.onmessage = (event) => {
        try {
          handleEvent(JSON.parse(event.data));
        } catch (err) {
          console.error('bad realtime payload', err);
        }
      };
      socket.onclose = () => {
        setConnected(false);
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
        }
        if (disposed || reconnectRef.current.closed) return;
        reconnectRef.current.attempts += 1;
        const delay = Math.min(1000 * 2 ** reconnectRef.current.attempts, 15000);
        reconnectRef.current.timer = window.setTimeout(connect, delay);
      };
      socket.onerror = () => socket.close();
    };

    connect();

    return () => {
      disposed = true;
      reconnectRef.current.closed = true;
      if (reconnectRef.current.timer) clearTimeout(reconnectRef.current.timer);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      try {
        socketRef.current?.close();
      } catch (err) {
        /* ignore */
      }
    };
  }, [user, handleEvent]);

  // ---- caller actions ----
  const startCall = useCallback(
    async (peer) => {
      const current = stateRef.current;
      if (current.callState !== 'idle' && current.callState !== 'ended') return;
      if (!peer || !peer.user_id) return;

      cleanupCall();
      const id = makeCallId();
      setCallPeer(peer);
      setCallId(id);
      setCallState('ringing');

      const stream = await getMedia();
      if (!stream) {
        finishCall('failed', peer, id);
        return;
      }

      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      send({
        type: 'call-offer',
        call_id: id,
        to_user_id: peer.user_id,
        caller_name: current.user?.full_name || 'Contact',
        caller_role: current.user?.role || 'user',
        offer: pc.localDescription,
      });
    },
    [cleanupCall, getMedia, createPeerConnection, send, finishCall]
  );

  const acceptCall = useCallback(async () => {
    if (stateRef.current.callState !== 'incoming') return;
    const peer = stateRef.current.callPeer;
    const id = stateRef.current.callId;
    setCallState('connecting');

    const stream = await getMedia();
    if (!stream) {
      send({ type: 'call-decline', call_id: id, to_user_id: peer.user_id });
      finishCall('idle', null, null);
      return;
    }

    const pc = createPeerConnection();
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    if (pendingOfferRef.current) {
      await pc.setRemoteDescription(pendingOfferRef.current);
    }
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    send({ type: 'call-answer', call_id: id, to_user_id: peer.user_id, answer: pc.localDescription });
  }, [getMedia, createPeerConnection, send, finishCall]);

  const declineCall = useCallback(() => {
    if (stateRef.current.callState !== 'incoming') return;
    send({ type: 'call-decline', call_id: stateRef.current.callId, to_user_id: stateRef.current.callPeer?.user_id });
    finishCall('idle', null, null);
  }, [send, finishCall]);

  const cancelCall = useCallback(() => {
    if (stateRef.current.callState !== 'ringing' && stateRef.current.callState !== 'connecting') return;
    send({ type: 'call-cancel', call_id: stateRef.current.callId, to_user_id: stateRef.current.callPeer?.user_id });
    finishCall('ended', stateRef.current.callPeer, stateRef.current.callId);
  }, [send, finishCall]);

  const endCall = useCallback(() => {
    send({ type: 'call-end', call_id: stateRef.current.callId, to_user_id: stateRef.current.callPeer?.user_id });
    finishCall('ended', stateRef.current.callPeer, stateRef.current.callId);
  }, [send, finishCall]);

  const toggleMute = useCallback(() => {
    setMuted((current) => {
      const next = !current;
      stateRef.current.localStream?.getAudioTracks().forEach((track) => {
        track.enabled = !next;
      });
      return next;
    });
  }, []);

  const toggleCamera = useCallback(() => {
    setCameraOff((current) => {
      const next = !current;
      stateRef.current.localStream?.getVideoTracks().forEach((track) => {
        track.enabled = !next;
      });
      return next;
    });
  }, []);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const videoRefs = useMemo(
    () => ({ local: localVideoRef, remote: remoteVideoRef }),
    []
  );

  const value = useMemo(
    () => ({
      connected,
      eventVersion,
      send,
      onEvent,
      startCall,
      acceptCall,
      declineCall,
      cancelCall,
      endCall,
      toggleMute,
      toggleCamera,
      callState,
      callPeer,
      muted,
      cameraOff,
      localStream,
      remoteStream,
      videoRefs,
    }),
    [connected, eventVersion, send, onEvent, startCall, acceptCall, declineCall, cancelCall, endCall, toggleMute, toggleCamera, callState, callPeer, muted, cameraOff, localStream, remoteStream, videoRefs]
  );

  return (
    <RealtimeContext.Provider value={value}>
      {children}
      <CallOverlay />
    </RealtimeContext.Provider>
  );
}

function CallOverlay() {
  const {
    callState,
    callPeer,
    startCall,
    acceptCall,
    declineCall,
    cancelCall,
    endCall,
    toggleMute,
    toggleCamera,
    muted,
    cameraOff,
    localStream,
    remoteStream,
    videoRefs,
  } = useRealtime();

  useEffect(() => {
    if (videoRefs.local.current && localStream) videoRefs.local.current.srcObject = localStream;
  }, [videoRefs, localStream]);
  useEffect(() => {
    if (videoRefs.remote.current && remoteStream) videoRefs.remote.current.srcObject = remoteStream;
  }, [videoRefs, remoteStream]);

  const active = ['ringing', 'incoming', 'connecting', 'active'].includes(callState);
  const ended = ['declined', 'ended', 'failed'].includes(callState);

  if (!active && !ended) return null;

  if (ended) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
          <p className="text-lg font-semibold text-slate-900">
            {callState === 'declined' ? 'Call declined' : callState === 'failed' ? 'Call not answered' : 'Call ended'}
          </p>
          {callPeer && (
            <p className="mt-1 text-sm text-slate-500">
              {callState === 'failed' ? `${callPeer.name} could not be reached.` : `Call with ${callPeer.name}`}
            </p>
          )}
          {callPeer && (
            <button
              type="button"
              onClick={() => startCall(callPeer)}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700"
            >
              <PhoneCall className="h-4 w-4" /> Call again
            </button>
          )}
        </div>
      </div>
    );
  }

  const isIncoming = callState === 'incoming';

  return (
    <div data-testid="call-overlay" className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/90 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-slate-900 shadow-2xl">
        <div className="relative aspect-video bg-slate-800">
          {isIncoming ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-white">
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-700 text-3xl font-semibold text-white">
                {(callPeer?.name || '?').trim().charAt(0).toUpperCase()}
              </span>
              <p className="text-lg font-medium">
                <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                {callPeer?.name || 'Incoming call'}
              </p>
              <p className="text-sm text-slate-400">Incoming video call</p>
            </div>
          ) : (
            <>
              {remoteStream ? (
                <video
                  ref={videoRefs.remote}
                  autoPlay
                  playsInline
                  data-testid="remote-video"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-white">
                  <span className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-700 text-3xl font-semibold text-white">
                    {(callPeer?.name || '?').trim().charAt(0).toUpperCase()}
                  </span>
                  <p className="text-lg font-medium">{callPeer?.name || 'Connecting...'}</p>
                  <p className="text-sm text-slate-400">
                    {callState === 'ringing' ? 'Ringing...' : callState === 'connecting' ? 'Connecting...' : 'In call'}
                  </p>
                </div>
              )}
              {!isIncoming && (
                <div className="absolute right-3 top-3 h-28 w-40 overflow-hidden rounded-lg border border-white/30 bg-slate-700">
                  <video ref={videoRefs.local} autoPlay playsInline muted className="h-full w-full object-cover" />
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 p-4">
          {isIncoming ? (
            <>
              <button
                type="button"
                onClick={declineCall}
                className="flex items-center gap-2 rounded-full bg-rose-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-rose-700"
              >
                <PhoneOff className="h-5 w-5" /> Decline
              </button>
              <button
                type="button"
                onClick={acceptCall}
                className="flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-emerald-700"
              >
                <PhoneCall className="h-5 w-5" /> Accept
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={toggleCamera}
                className="rounded-full bg-slate-700 p-3.5 text-white transition hover:bg-slate-600"
                aria-label={cameraOff ? 'Turn camera on' : 'Turn camera off'}
              >
                {cameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
              </button>
              <button
                type="button"
                onClick={toggleMute}
                className="rounded-full bg-slate-700 p-3.5 text-white transition hover:bg-slate-600"
                aria-label={muted ? 'Unmute' : 'Mute'}
              >
                {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              {!isIncoming && callState !== 'ringing' && callState !== 'connecting' ? (
                <button
                  type="button"
                  onClick={endCall}
                  className="flex items-center gap-2 rounded-full bg-rose-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-rose-700"
                >
                  <PhoneOff className="h-5 w-5" /> End call
                </button>
              ) : (
                <button
                  type="button"
                  onClick={cancelCall}
                  className="flex items-center gap-2 rounded-full bg-rose-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-rose-700"
                >
                  <X className="h-5 w-5" /> Cancel
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) throw new Error('useRealtime must be used inside RealtimeProvider');
  return context;
}