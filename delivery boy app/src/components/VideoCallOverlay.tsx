import React, { useState, useEffect, useRef } from 'react';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Phone } from 'lucide-react';
import { db, auth, hasValidConfig, appCheck } from '../lib/firebase';
import { getToken } from 'firebase/app-check';
import { doc, updateDoc, onSnapshot, collection, addDoc } from 'firebase/firestore';
import { API_BASE_URL } from '../lib/apiConfig';

interface VideoCallOverlayProps {
  orderId: string;
  callerRole: 'customer' | 'rider';
  callerName: string;
  calleeName: string;
  incomingCallData?: {
    callerId: string;
    callerName: string;
    callerRole: 'customer' | 'rider';
  } | null;
  onClose: () => void;
}

const rtcConfig = {
  iceServers: [
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302'
      ]
    }
  ]
};

export const VideoCallOverlay: React.FC<VideoCallOverlayProps> = ({
  orderId,
  callerRole,
  callerName: _callerName,
  calleeName,
  incomingCallData = null,
  onClose
}) => {
  const [callStatus, setCallStatus] = useState<'ringing' | 'connecting' | 'connected' | 'ended'>(
    incomingCallData ? 'ringing' : 'connecting'
  );
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const isCaller = !incomingCallData;
  const isMock = !hasValidConfig || !db;

  const unsubscribeDocRef = useRef<(() => void) | null>(null);
  const unsubscribeIceCallerRef = useRef<(() => void) | null>(null);
  const unsubscribeIceCalleeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    startMedia();
    return () => {
      cleanupCall();
    };
  }, []);

  const startMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      if (isMock) {
        // High fidelity mock path
        if (isCaller) {
          setCallStatus('ringing');
          setTimeout(() => {
            setCallStatus('connected');
          }, 3500); // Simulate connection
        }
      } else {
        // Real WebRTC setup
        initializeWebRTC();
      }
    } catch (err) {
      console.error('Failed to access media devices:', err);
      // Fallback for mock environments without video hardware
      if (isMock) {
        setCallStatus(isCaller ? 'ringing' : 'connected');
        if (isCaller) {
          setTimeout(() => {
            setCallStatus('connected');
          }, 3000);
        }
      }
    }
  };

  const initializeWebRTC = async () => {
    const pc = new RTCPeerConnection(rtcConfig);
    pcRef.current = pc;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    const callDocRef = doc(db!, 'videoCalls', orderId);

    if (isCaller) {
      // Caller Setup (Rider - shouldn't happen, but here for symmetry)
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          const candRef = collection(db!, 'videoCalls', orderId, 'callerCandidates');
          await addDoc(candRef, event.candidate.toJSON());
        }
      };

      try {
        const token = auth?.currentUser ? await auth.currentUser.getIdToken() : '';
        let appCheckToken = '';
        try {
          if (appCheck) {
            const tokenResult = await getToken(appCheck);
            appCheckToken = tokenResult.token;
          }
        } catch (e) {}

        const initiateRes = await fetch(`${API_BASE_URL}/v1/video/initiate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Firebase-AppCheck': appCheckToken
          },
          body: JSON.stringify({ orderId })
        });

        if (!initiateRes.ok) {
          const errData = await initiateRes.json().catch(() => ({ message: 'Failed to initiate video call.' }));
          alert(errData.message || 'Call failed.');
          onClose();
          return;
        }

        const offerDescription = await pc.createOffer();
        await pc.setLocalDescription(offerDescription);

        await updateDoc(callDocRef, {
          offer: {
            type: offerDescription.type,
            sdp: offerDescription.sdp
          }
        });
        
        setCallStatus('ringing');
      } catch (err: any) {
        console.error('Caller signaling initialization failed:', err);
        alert('Network error. Failed to initiate call.');
        onClose();
        return;
      }

      // Listen for remote answer
      unsubscribeDocRef.current = onSnapshot(callDocRef, (snap) => {
        const data = snap.data();
        if (data?.answer && !pc.currentRemoteDescription) {
          const answerDesc = new RTCSessionDescription(data.answer);
          pc.setRemoteDescription(answerDesc);
          setCallStatus('connected');
        }
        if (data?.status === 'ended' || data?.status === 'declined' || data?.status === 'missed') {
          handleHangUpLocal();
        }
      });

      // Listen for callee ICE candidates
      const calleeCandidatesCol = collection(db!, 'videoCalls', orderId, 'calleeCandidates');
      unsubscribeIceCalleeRef.current = onSnapshot(calleeCandidatesCol, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            const candidate = new RTCIceCandidate(data);
            pc.addIceCandidate(candidate).catch((e) => console.warn('Ice candidate add failure', e));
          }
        });
      });

    } else {
      // Callee Setup (Rider answering call)
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          const candRef = collection(db!, 'videoCalls', orderId, 'calleeCandidates');
          await addDoc(candRef, event.candidate.toJSON());
        }
      };

      // Read remote offer
      unsubscribeDocRef.current = onSnapshot(callDocRef, async (snap) => {
        const data = snap.data();
        if (data?.offer && !pc.currentRemoteDescription) {
          const offerDesc = new RTCSessionDescription(data.offer);
          await pc.setRemoteDescription(offerDesc);

          const answerDesc = await pc.createAnswer();
          await pc.setLocalDescription(answerDesc);

          await updateDoc(callDocRef, {
            answer: {
              type: answerDesc.type,
              sdp: answerDesc.sdp
            },
            status: 'connected',
            startedAt: new Date().toISOString()
          });
          setCallStatus('connected');
        }
        if (data?.status === 'ended' || data?.status === 'declined' || data?.status === 'missed') {
          handleHangUpLocal();
        }
      });

      // Listen for caller ICE candidates
      const callerCandidatesCol = collection(db!, 'videoCalls', orderId, 'callerCandidates');
      unsubscribeIceCallerRef.current = onSnapshot(callerCandidatesCol, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            const candidate = new RTCIceCandidate(data);
            pc.addIceCandidate(candidate).catch((e) => console.warn('Ice candidate add failure', e));
          }
        });
      });
    }
  };

  const handleDeclineIncoming = async () => {
    setCallStatus('ended');
    if (!isMock) {
      const callDocRef = doc(db!, 'videoCalls', orderId);
      await updateDoc(callDocRef, { status: 'declined' });
    }
    setTimeout(onClose, 800);
  };

  const handleAcceptIncoming = async () => {
    setCallStatus('connecting');
    if (isMock) {
      setTimeout(() => {
        setCallStatus('connected');
      }, 1500);
    } else {
      initializeWebRTC();
    }
  };

  const handleHangUp = async () => {
    setCallStatus('ended');
    if (!isMock) {
      try {
        const token = auth?.currentUser ? await auth.currentUser.getIdToken() : '';
        let appCheckToken = '';
        try {
          if (appCheck) {
            const tokenResult = await getToken(appCheck);
            appCheckToken = tokenResult.token;
          }
        } catch (e) {}

        await fetch(`${API_BASE_URL}/v1/video/terminate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Firebase-AppCheck': appCheckToken
          },
          body: JSON.stringify({ orderId, endedBy: callerRole })
        });
      } catch (err) {
        console.error('Failed to terminate call session via server:', err);
      }
    }
    setTimeout(onClose, 800);
  };

  const handleHangUpLocal = () => {
    setCallStatus('ended');
    setTimeout(onClose, 800);
  };

  const cleanupCall = () => {
    if (unsubscribeDocRef.current) unsubscribeDocRef.current();
    if (unsubscribeIceCallerRef.current) unsubscribeIceCallerRef.current();
    if (unsubscribeIceCalleeRef.current) unsubscribeIceCalleeRef.current();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between text-white select-none">
      
      {/* Upper Status Bar */}
      <div className="p-6 pt-12 flex flex-col items-center gap-1.5 z-20">
        <h3 className="text-xl font-black tracking-wide drop-shadow-md">
          {isCaller ? calleeName : incomingCallData?.callerName || 'Delivery Partner'}
        </h3>
        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest bg-black/40 px-3.5 py-1.5 rounded-full backdrop-blur-md">
          {callStatus === 'ringing' && 'Ringing...'}
          {callStatus === 'connecting' && 'Connecting...'}
          {callStatus === 'connected' && 'Live Video Call'}
          {callStatus === 'ended' && 'Call Ended'}
        </span>
      </div>

      {/* Main Video View Canvas */}
      <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden">
        {callStatus === 'connected' ? (
          <>
            {/* Remote Partner Video - Full Screen */}
            {isMock || !remoteVideoRef.current?.srcObject ? (
              // Mock Remote Feed Video Placeholder
              <div className="w-full h-full relative">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80"
                  alt="Remote User"
                  className="w-full h-full object-cover filter blur-[2px]"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <span className="text-xs font-black uppercase text-emerald-400 bg-emerald-950/80 px-4 py-2 rounded-full border border-emerald-500/20 tracking-wider">
                    {callerRole === 'customer' ? 'Rider Feed Connected' : 'Customer Feed Connected'}
                  </span>
                </div>
              </div>
            ) : (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            )}

            {/* Self Camera Feed - Drag-pip Box */}
            <div className="absolute top-28 right-4 w-28 aspect-[3/4] rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl z-20 bg-slate-900">
              {isVideoOff ? (
                <div className="w-full h-full flex items-center justify-center bg-slate-800">
                  <VideoOff className="h-5 w-5 text-gray-500" />
                </div>
              ) : (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              )}
            </div>
          </>
        ) : (
          // Inbound Ringing or Connecting Backdrop Avatar
          <div className="flex flex-col items-center gap-4">
            <div className="h-28 w-28 rounded-full bg-emerald-600/10 border-4 border-emerald-500/30 flex items-center justify-center text-emerald-400 text-3xl font-black animate-pulse shadow-lg shadow-emerald-500/10">
              {isCaller 
                ? calleeName.split(' ').map(n => n[0]).join('') 
                : (incomingCallData?.callerName || 'Hero').split(' ').map(n => n[0]).join('')}
            </div>
            {callStatus === 'ringing' && !isCaller && (
              <span className="text-xs font-semibold text-emerald-400 animate-pulse mt-2 uppercase tracking-widest">
                Incoming Video Call...
              </span>
            )}
          </div>
        )}
      </div>

      {/* Control Actions Dock */}
      <div className="p-8 pb-12 z-20 flex justify-center items-center gap-6 backdrop-gradient-bottom">
        {callStatus === 'ringing' && !isCaller ? (
          // Incoming Call Controls: Decline and Accept buttons
          <div className="flex gap-12">
            <button
              onClick={handleDeclineIncoming}
              className="p-5 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg cursor-pointer transform hover:scale-105 transition-transform"
            >
              <PhoneOff className="h-6 w-6" />
            </button>
            <button
              onClick={handleAcceptIncoming}
              className="p-5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg cursor-pointer transform hover:scale-105 transition-transform animate-bounce"
            >
              <Phone className="h-6 w-6" />
            </button>
          </div>
        ) : (
          // Connected Call Action Bars
          <>
            <button
              onClick={toggleMute}
              className={`p-4 rounded-full border transition-colors cursor-pointer
                ${isMuted 
                  ? 'bg-red-500/80 border-red-500 hover:bg-red-600/80 text-white' 
                  : 'bg-white/10 border-white/20 hover:bg-white/20 text-white'}`}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>

            <button
              onClick={handleHangUp}
              className="p-5 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg cursor-pointer transform hover:scale-105 transition-transform"
            >
              <PhoneOff className="h-6 w-6" />
            </button>

            <button
              onClick={toggleVideo}
              className={`p-4 rounded-full border transition-colors cursor-pointer
                ${isVideoOff 
                  ? 'bg-red-500/80 border-red-500 hover:bg-red-600/80 text-white' 
                  : 'bg-white/10 border-white/20 hover:bg-white/20 text-white'}`}
            >
              {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </button>
          </>
        )}
      </div>

    </div>
  );
};
