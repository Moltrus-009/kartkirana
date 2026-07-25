import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
  hasValidConfig, 
  auth,
  db,
  appCheck,
  isFirebaseActive
} from '../lib/firebase';
import { 
  signInWithPhoneNumber, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { onSnapshot, collection, doc, getDoc, query, where } from 'firebase/firestore';
import { getToken } from 'firebase/app-check';
import { API_BASE_URL } from '../lib/apiConfig';
import { registerForPushNotifications, onForegroundMessage } from '../lib/messaging';
import { isOrderStatus } from '../types/orderStatus';
import { PER_DELIVERY_FEE, BATCH_BONUS, MAX_BATCH_SIZE } from '../constants/earnings';

import { 
  getUserProfile, 
  createUserProfile, 
  updateUserProfile, 
  updateRiderLocation, 
  updateOrderStatus, 
  updateBatch, 
  createBatch,
  getOrders,
  updateRiderOnlineStatus,
  acceptOrderTransaction,
  acceptBatchTransaction
} from '../services/firestoreService';
import type { 
  OrderDocument, 
  BatchDocument, 
  UserProfileDoc,
  RouteStop
} from '../services/firestoreService';
import { locationService } from '../lib/locationService';
import { Geolocation } from '@capacitor/geolocation';
import confetti from 'canvas-confetti';
import { recaptchaManager } from '../lib/recaptchaManager';
import { logger } from '../lib/logger';
import { mapFirebaseError } from '../lib/errorMapper';

interface AppContextType {
  user: UserProfileDoc | null;
  loading: boolean;
  isOnline: boolean;
  activeOrders: OrderDocument[];
  activeBatch: BatchDocument | null;
  newRequest: {
    type: 'single' | 'batch';
    orderId?: string;
    batchId?: string;
    orderData?: OrderDocument;
    batchData?: BatchDocument;
    expiresAt?: string;
    earnings?: number;
    distance?: number;
    requestId?: string;
  } | null;
  todayEarnings: number;
  todayDeliveries: number;
  acceptanceRate: number;
  currentRating: number;
  historyOrders: OrderDocument[];
  isAccepting: boolean;
  setOnlineStatus: (status: boolean) => void;
  sendOTP: (phoneNumber: string, recaptchaVerifier: any) => Promise<{ success: boolean; message: string; confirmationResult?: any }>;
  verifyOTP: (confirmationResult: any, code: string, name?: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  acceptSingleOrder: (orderId: string) => Promise<void>;
  rejectSingleOrder: () => void;
  acceptSmartBatch: (batchId: string) => Promise<void>;
  rejectSmartBatch: () => void;
  updateWorkflowStep: () => Promise<void>;
  triggerSimulationTick: () => void;
  triggerMockOrderPlacement: () => void;
  updateProfile: (fields: Partial<UserProfileDoc>) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const MOCK_GPS_START = { lat: 28.5802, lng: 77.3105 }; // Noida Sector 15

const getMockData = <T,>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultValue;
};

const saveMockData = <T,>(key: string, data: T) => {
  localStorage.setItem(key, JSON.stringify(data));
  window.dispatchEvent(new Event('mock-db-update'));
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfileDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [activeOrders, setActiveOrders] = useState<OrderDocument[]>([]);
  const [activeBatch, setActiveBatch] = useState<BatchDocument | null>(null);
  const [newRequest, setNewRequest] = useState<AppContextType['newRequest']>(null);
  const [rejectedOrderIds, setRejectedOrderIds] = useState<string[]>([]);
  
  // Dashboard Metrics
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [todayDeliveries, setTodayDeliveries] = useState(0);
  const [acceptanceRate, setAcceptanceRate] = useState(96);
  const [currentRating, setCurrentRating] = useState(4.8);
  const [historyOrders, setHistoryOrders] = useState<OrderDocument[]>([]);
  const [isAccepting, setIsAccepting] = useState(false);

  // State Refs for stable listener callbacks without re-subscribing
  const newRequestRef = useRef(newRequest);
  const rejectedOrderIdsRef = useRef(rejectedOrderIds);

  useEffect(() => {
    newRequestRef.current = newRequest;
  }, [newRequest]);

  useEffect(() => {
    rejectedOrderIdsRef.current = rejectedOrderIds;
  }, [rejectedOrderIds]);

  // Simulation Refs
  const simIntervalRef = useRef<number | null>(null);
  const locationIntervalRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);


  // Sound synthesis via Web Audio API (no external asset downloads required)
  // Sound synthesis via Web Audio API (no external asset downloads required)
  const playDualToneNotification = () => {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      const audioCtx = new AudioCtxClass();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(800, audioCtx.currentTime); // High pitch alert
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(400, audioCtx.currentTime); // Supporting resonance

      gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.2);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(audioCtx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(audioCtx.currentTime + 1.2);
      osc2.stop(audioCtx.currentTime + 1.2);
    } catch (e) {
      // Audio playback silently suppressed prior to user gesture
    }
  };

  const triggerVibrate = () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([400, 200, 400]);
      }
    } catch (e) {
      // Vibration suppressed prior to user gesture
    }
  };

  // Push notifications: register FCM token once we have a logged-in rider on
  // a real (non-mock) Firebase session, and wire foreground pushes to the
  // same alert sound/vibration used for the in-app listener. Background
  // pushes are handled independently by public/firebase-messaging-sw.js.
  useEffect(() => {
    if (!user || !isFirebaseActive()) return;
    let unsubscribeForeground: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      try {
        const token = await registerForPushNotifications();
        if (token && !cancelled) {
          await updateUserProfile(user.uid, { fcmToken: token });
        }
      } catch (e) {
        logger.warn('Push', 'Push registration failed (non-fatal):', e);
      }

      const unsub = await onForegroundMessage(() => {
        playDualToneNotification();
        triggerVibrate();
      });
      if (!cancelled) unsubscribeForeground = unsub;
    })();

    return () => {
      cancelled = true;
      if (unsubscribeForeground) unsubscribeForeground();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  // Sync auth and session
  useEffect(() => {
    let unsubscribe: any = () => {};

    if (hasValidConfig && auth) {
      unsubscribe = onAuthStateChanged(auth, async (fUser) => {
        if (fUser) {
          const profile = await getUserProfile(fUser.uid);
          if (profile) {
            setUser(profile);
            setIsOnline(profile.status === 'online');
            syncRiderDatabaseDetails(profile.uid);
          }
        } else {
          setUser(null);
          setIsOnline(false);
        }
        setLoading(false);
      });
    } else {
      // Offline mode startup
      setUser(null);
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  // Force clean startup session to show Login screen
  useEffect(() => {
    localStorage.removeItem('hs_logged_in_user');
    localStorage.removeItem('hs_user');
  }, []);

  // Background device location lookup on startup
  useEffect(() => {
    const fetchStartupLocation = async () => {
      try {
        const coords = await locationService.getCurrentLocation({
          enableHighAccuracy: true,
          timeoutMs: 10000
        });
        console.log('[Rider Startup GPS] Found device startup coordinates:', coords);
        if (coords) {
          setUser(prev => {
            if (prev) {
              return { ...prev, coords: { lat: coords.lat, lng: coords.lng } };
            }
            return prev;
          });
        }
      } catch (err) {
        console.warn('[Rider Startup GPS] Could not get device coordinates on startup:', err);
      }
    };
    
    fetchStartupLocation();
  }, []);

  // Listen to order updates (Cross-tab or Firestore)
  useEffect(() => {
    if (!user) {
      setActiveOrders([]);
      setActiveBatch(null);
      return;
    }

    let unsubscribe = () => {};

    const syncOrdersList = (allOrders: OrderDocument[]) => {
      // Filter active orders assigned to this rider
      const active = allOrders.filter(o => 
        isOrderStatus(o.status, 'RIDER_ASSIGNED', 'ARRIVED_AT_SHOP', 'PICKED_UP', 'OUT_FOR_DELIVERY') && 
        (o.riderId === user.uid || o.rider?.phone === user.phone)
      );
      
      const history = allOrders.filter(o => 
        isOrderStatus(o.status, 'DELIVERED', 'COMPLETED', 'CANCELLED', 'SHOP_REJECTED') && 
        (o.riderId === user.uid || o.rider?.phone === user.phone)
      );

      setActiveOrders(active);
      setHistoryOrders(history);
      
      // Calculate earnings from history
      const totalDeliv = history.filter(h => h.status === 'DELIVERED' || h.status === 'COMPLETED').length;
      setTodayDeliveries(totalDeliv);
      setTodayEarnings(totalDeliv * PER_DELIVERY_FEE);

      // Check if there is an active batch linked
      const activeBatchId = active.find(a => a.batchId)?.batchId;
      if (activeBatchId) {
        if (isFirebaseActive() && db) {
          getDoc(doc(db, 'batches', activeBatchId)).then(bDocSnap => {
            if (bDocSnap.exists()) {
              setActiveBatch(bDocSnap.data() as BatchDocument);
            } else {
              setActiveBatch(null);
            }
          }).catch(err => {
            console.error("Error fetching active batch from Firestore:", err);
            setActiveBatch(null);
          });
        } else {
          const batches = getMockData<BatchDocument[]>('hs_batches', []);
          const bDoc = batches.find((b: any) => b.id === activeBatchId && b.status !== 'completed' && b.status !== 'rejected');
          setActiveBatch(bDoc || null);
        }
      } else {
        setActiveBatch(null);
      }

      // Live trigger notifications:
      // If we are online, have no active orders, and have no active request popup shown
      if (isOnline && active.length === 0 && !newRequestRef.current) {
        const pending = allOrders.filter(o => 
          isOrderStatus(o.status, 'SEARCHING_RIDER', 'SHOP_ACCEPTED') && 
          (!o.rider && !o.riderId) && 
          !o.batchId &&
          !rejectedOrderIdsRef.current.includes(o.id)
        );
        if (pending.length > 0) {
          console.log(`[Rider App] New incoming order detected: ${pending[0].id}`);
          playDualToneNotification();
          triggerVibrate();
          setNewRequest({
            type: 'single',
            orderId: pending[0].id,
            orderData: pending[0]
          });
        }
      }
    };

    if (isFirebaseActive() && db) {
      console.log("[Rider App] Activating real-time Firestore order, batch, and targeted dispatch listeners...");
      
      let assignedList: OrderDocument[] = [];
      let unassignedList: OrderDocument[] = [];

      const mergeAndSyncOrders = () => {
        const map = new Map<string, OrderDocument>();
        assignedList.forEach(o => map.set(o.id, o));
        unassignedList.forEach(o => {
          if (!map.has(o.id)) {
            map.set(o.id, o);
          }
        });
        syncOrdersList(Array.from(map.values()));
      };

      const qOrders = query(collection(db, 'orders'), where('riderId', '==', user.uid));
      const unsubOrders = onSnapshot(qOrders, (snap) => {
        assignedList = snap.docs.map(d => ({ id: d.id, ...d.data() } as OrderDocument));
        mergeAndSyncOrders();
      }, (err) => {
        console.error("Firestore onSnapshot error in rider app:", err);
      });

      const qUnassigned = query(
        collection(db, 'orders'),
        where('status', 'in', ['SEARCHING_RIDER', 'SHOP_ACCEPTED', 'ready_for_pickup', 'READY'])
      );
      const unsubUnassigned = onSnapshot(qUnassigned, (snap) => {
        unassignedList = snap.docs.map(d => ({ id: d.id, ...d.data() } as OrderDocument));
        mergeAndSyncOrders();
      }, (err) => {
        console.error("Firestore unassigned orders error in rider app:", err);
      });

      const qBatches = query(collection(db, 'batches'), where('riderId', '==', user.uid));
      const unsubBatches = onSnapshot(qBatches, (snap) => {
        const batchList = snap.docs.map(d => ({ id: d.id, ...d.data() } as BatchDocument));
        const activeB = batchList.find(b => b.status === 'assigned' || b.status === 'accepted' || b.status === 'in_progress');
        if (activeB) {
          setActiveBatch(activeB);
        } else {
          setActiveBatch(null);
        }
      }, (err) => {
        console.error("Firestore batches listener error in rider app:", err);
      });

      const qDispatches = query(
        collection(db, 'dispatchRequests'), 
        where('riderId', '==', user.uid), 
        where('status', '==', 'PENDING')
      );
      
      const unsubDispatches = onSnapshot(qDispatches, async (snap) => {
        if (!isOnline || activeOrders.length > 0) return;
        
        if (snap.empty) {
          setNewRequest(null);
          return;
        }

        const requestDoc = snap.docs[0];
        const reqData = requestDoc.data();
        
        console.log(`[Rider App] Real-time targeted dispatch request detected: ${requestDoc.id}`);
        playDualToneNotification();
        triggerVibrate();

        // Fetch targeted order details
        try {
          const orderDocRef = doc(db!, 'orders', reqData.orderId);
          const orderDocSnap = await getDoc(orderDocRef);
          
          if (orderDocSnap.exists()) {
            setNewRequest({
              type: 'single',
              orderId: reqData.orderId,
              requestId: requestDoc.id,
              orderData: { id: orderDocSnap.id, ...(orderDocSnap.data() || {}) } as OrderDocument,
              distance: reqData.distance,
              earnings: reqData.earnings,
              timeoutSeconds: reqData.timeoutSeconds,
              expiresAt: reqData.expiresAt
            } as any);
          }
        } catch (err) {
          console.error("Error fetching dispatched order details:", err);
        }
      }, (err) => {
        console.error("Firestore dispatchRequests listener error:", err);
      });

      unsubscribe = () => {
        unsubOrders();
        unsubUnassigned();
        unsubBatches();
        unsubDispatches();
      };
    } else {
      // Local Sandbox Mock Mode
      const loadMockOrders = () => {
        const list = getMockData<OrderDocument[]>('hs_orders', []);
        syncOrdersList(list);
      };
      
      loadMockOrders();

      const handleMockDBUpdate = () => {
        loadMockOrders();
      };
      window.addEventListener('mock-db-update', handleMockDBUpdate);
      unsubscribe = () => {
        window.removeEventListener('mock-db-update', handleMockDBUpdate);
      };
    }

    return () => unsubscribe();
  }, [user?.uid, isOnline]);

  // Sync rider stats
  const syncRiderDatabaseDetails = async (uid: string) => {
    const profile = await getUserProfile(uid);
    if (profile) {
      setCurrentRating(profile.rating || 4.8);
      setAcceptanceRate(profile.acceptanceRate || 96);
    }
  };

  // Online / Offline state handler
  const setOnlineStatus = async (status: boolean) => {
    let currentCoords = user?.coords;
    
    if (status) {
      // 1. Request GPS permissions natively from Android OS
      try {
        const hasPermission = await locationService.checkAndRequestPermissions();
        if (!hasPermission) {
          alert('Location permissions are required to receive delivery dispatches. Please grant location access in device settings.');
          setIsOnline(false);
          return;
        }
      } catch (permErr) {
        console.warn('[Rider GPS Permission] Failed requesting permissions natively:', permErr);
      }
      
      // 2. Fetch current location natively and update database immediately
      try {
        const coords = await locationService.getCurrentLocation();
        currentCoords = coords;
        console.log('[Rider GPS] Position check successful:', coords);
        if (user) {
          await updateRiderLocation(user.uid, coords, activeOrders.map(o => o.id));
          setUser(prev => prev ? { ...prev, coords } : null);
        }
      } catch (locErr) {
        console.warn('[Rider GPS] Failed getting current position on go-online:', locErr);
        alert('Unable to determine your location. Please check GPS settings and permissions.');
        setIsOnline(false);
        return; // Abort going online
      }
    }

    setIsOnline(status);
    if (user) {
      const nextStatus = (status ? 'online' : 'offline') as 'online' | 'offline';
      await updateUserProfile(user.uid, { status: nextStatus });
      await updateRiderOnlineStatus(user.uid, status, currentCoords || undefined);
      
      // Update local storage representation
      const updatedUser = { ...user, status: nextStatus, coords: currentCoords || user.coords };
      setUser(updatedUser);
    }
    if (!status) {
      setNewRequest(null);
    }
  };

  // Sound and Dispatch simulation tick (Check for new orders when Online - Sandbox Fallback Mode)
  useEffect(() => {
    if (isFirebaseActive()) return; // Skip if we have real Firebase active!
    if (isOnline && activeOrders.length === 0 && !newRequest) {
      // Start polling/timer to simulate order assignments
      simIntervalRef.current = window.setInterval(() => {
        simulateNewIncomingOrder();
      }, 5000);
    } else {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
    }

    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, [isOnline, activeOrders, newRequest]);

  // Simulate an incoming single order or batch
  const simulateNewIncomingOrder = async () => {
    if (!isOnline || activeOrders.length > 0 || newRequest) return;

    const allOrders = await getOrders();
    // Look for unassigned confirmed orders
    const pending = allOrders.filter(o =>
      isOrderStatus(o.status, 'SEARCHING_RIDER', 'SHOP_ACCEPTED') &&
      !o.rider &&
      !o.riderId &&
      !o.batchId &&
      !rejectedOrderIds.includes(o.id)
    );
    
    if (pending.length === 0) return;

    playDualToneNotification();
    triggerVibrate();

    // Trigger a 30s countdown timer
    const startCountdown = () => {
      countdownTimerRef.current = window.setInterval(() => {
        // Just triggers state tick triggers inside components, countdown handled by UI
      }, 1000);
    };
    startCountdown();

    // Determine if batching is beneficial (if we have 2 or more pending orders)
    if (pending.length >= 2) {
      // Create a Smart Batch, capped at MAX_BATCH_SIZE per the brief (Section 5).
      const batchOrders = pending.slice(0, MAX_BATCH_SIZE);
      
      // Calculate stops: Pickup Shop A -> Pickup Shop B -> Deliver Cust A -> Deliver Cust B
      const stops: RouteStop[] = [];
      
      // Shops pickup
      batchOrders.forEach((o, i) => {
        // Avoid duplicate pickup stops if same shop
        const exists = stops.find(s => s.type === 'pickup' && s.shopId === o.shopId);
        if (!exists) {
          stops.push({
            id: `stop-p-${o.shopId}-${i}`,
            type: 'pickup',
            orderId: o.id,
            shopId: o.shopId,
            shopName: o.shopName,
            shopAddress: o.shopAddress,
            coords: o.shopCoords || { lat: 28.58 + (i * 0.012), lng: 77.31 + (i * 0.012) },
            orderIds: [o.id],
            status: 'pending'
          });
        } else {
          exists.orderIds = [...(exists.orderIds || [exists.orderId]), o.id];
        }
      });

      // Customer deliveries
      batchOrders.forEach((o, i) => {
        stops.push({
          id: `stop-d-${o.id}-${i}`,
          type: 'delivery',
          orderId: o.id,
          customerName: o.contact?.name || 'Customer',
          customerPhone: o.contact?.phone || '',
          address: o.deliveryAddress?.address || 'Delivery Address',
          coords: o.deliveryAddress.coords || { lat: 28.59 + (i * 0.015), lng: 77.33 + (i * 0.015) },
          orderIds: [o.id],
          status: 'pending'
        });
      });

      const smartBatch: BatchDocument = {
        id: `batch-${Math.random().toString(36).substring(2, 9)}`,
        riderId: user?.uid || 'rider-amit-101',
        status: 'assigned',
        orderIds: batchOrders.map(b => b.id),
        totalEarnings: batchOrders.length * PER_DELIVERY_FEE + BATCH_BONUS,
        totalDistance: 4.8, // simulated km
        estimatedTime: 25, // mins
        stops,
        currentStopIndex: 0,
        createdAt: new Date().toISOString()
      };

      // A generated local batch must be persisted before it is offered.
      // Otherwise accepting it only changes UI state and never assigns the
      // underlying orders.
      await createBatch(smartBatch);

      // Set new request state
      setNewRequest({
        type: 'batch',
        batchId: smartBatch.id,
        batchData: smartBatch
      });
    } else {
      // Single order request
      const singleOrder = pending[0];
      setNewRequest({
        type: 'single',
        orderId: singleOrder.id,
        orderData: singleOrder
      });
    }
  };

  const autoRejectRequest = (orderId?: string) => {
    if (orderId) {
      setRejectedOrderIds(prev => [...prev, orderId]);
    }
    setNewRequest(null);
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    // Reduce acceptance rate slightly on reject
    setAcceptanceRate(prev => Math.max(70, prev - 2));
  };

  const rejectSingleOrder = async () => {
    const orderId = newRequest?.orderId;
    const requestId = newRequest?.requestId;
    
    autoRejectRequest(orderId);

    if (isFirebaseActive() && user && orderId && requestId) {
      try {
        const token = auth?.currentUser ? await auth.currentUser.getIdToken() : '';
        let appCheckToken = '';
        try {
          if (appCheck) {
            const tokenResult = await getToken(appCheck);
            appCheckToken = tokenResult.token;
          }
        } catch (e) {}

        await fetch(`${API_BASE_URL}/v1/dispatch/reject`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Firebase-AppCheck': appCheckToken
          },
          body: JSON.stringify({ orderId, requestId })
        });
      } catch (err) {
        console.error("Failed sending reject to server:", err);
      }
    }
  };

  const rejectSmartBatch = async () => {
    const batch = newRequest?.batchData;
    if (batch && !isFirebaseActive()) {
      await updateBatch(batch.id, { status: 'rejected' });
      setRejectedOrderIds(previous => [...new Set([...previous, ...batch.orderIds])]);
    }
    autoRejectRequest(batch?.id);
  };

  // Accept single order
  const acceptSingleOrder = async (orderId: string) => {
    if (isAccepting) return;

    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    
    if (!user) return;
    setIsAccepting(true);

    try {
      const riderData = {
        uid: user.uid,
        name: user.fullName || 'Delivery Partner',
        phone: user.phone || '',
        coords: user.coords || { lat: 28.58, lng: 77.31 }
      };

      if (isFirebaseActive()) {
        try {
          const token = auth?.currentUser ? await auth.currentUser.getIdToken() : '';
          let appCheckToken = '';
          try {
            if (appCheck) {
              const tokenResult = await getToken(appCheck);
              appCheckToken = tokenResult.token;
            }
          } catch (e) {}

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          try {
            const response = await fetch(`${API_BASE_URL}/v1/dispatch/accept`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-Firebase-AppCheck': appCheckToken
              },
              body: JSON.stringify({ orderId, requestId: newRequestRef.current?.requestId }),
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            const data = await response.json();
            if (response.ok && data.success) {
              setNewRequest(null);
              setAcceptanceRate(prev => Math.min(100, prev + 1));
              return;
            }
          } finally {
            clearTimeout(timeoutId);
          }
        } catch (err) {
          console.warn('Backend API accept unvailable, falling back to direct Firestore transaction:', err);
        }
      }

      const res = await acceptOrderTransaction(orderId, riderData);
      if (res.success) {
        setNewRequest(null);
        setAcceptanceRate(prev => Math.min(100, prev + 1));
      } else {
        alert(res.message);
        setNewRequest(null);
      }
    } finally {
      setIsAccepting(false);
    }
  };

  // Accept Smart Batch
  const acceptSmartBatch = async (batchId: string) => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    
    if (!user || !newRequest?.batchData) return;

    const riderData = {
      name: user.fullName,
      phone: user.phone,
      coords: user.coords || { lat: 0, lng: 0 }
    };

    const res = await acceptBatchTransaction(batchId, user.uid, riderData);
    if (res.success) {
      setNewRequest(null);
      setAcceptanceRate(prev => Math.min(100, prev + 1));
      console.log("[Smart Batch Accepted] Batch ID:", batchId);
    } else {
      alert(res.message);
      setNewRequest(null);
    }
  };

  // Main Rider Workflow Driver (Drives the active stops/orders)
  const updateWorkflowStep = async () => {
    if (activeOrders.length === 0) return;

    if (activeBatch) {
      // Smart Batch workflow updates stop by stop
      const stops = [...activeBatch.stops];
      const currIdx = activeBatch.currentStopIndex;
      const currentStop = stops[currIdx];

      if (currentStop.type === 'pickup') {
        const stopOrderIds = currentStop.orderIds || [currentStop.orderId];
        if (currentStop.status === 'pending') {
          // First confirm arrival; this keeps the checklist and pickup state
          // visible instead of skipping directly to the next route stop.
          stops[currIdx].status = 'arrived';
          await Promise.all(stopOrderIds.map(orderId => updateOrderStatus(orderId, 'ARRIVED_AT_SHOP')));
          await updateBatch(activeBatch.id, { stops });
        } else if (currentStop.status === 'arrived') {
          // Once the rider has verified the package, mark every order picked
          // up at this store and proceed to the next stop.
          stops[currIdx].status = 'completed';
          await Promise.all(stopOrderIds.map(orderId => updateOrderStatus(orderId, 'PICKED_UP')));

          const nextStopIndex = currIdx + 1;
          const hasRemainingPickup = stops.slice(nextStopIndex).some(stop => stop.type === 'pickup');
          if (!hasRemainingPickup) {
            await Promise.all(activeBatch.orderIds.map(orderId => updateOrderStatus(orderId, 'OUT_FOR_DELIVERY', user?.coords, 50)));
          }
          await updateBatch(activeBatch.id, { stops, currentStopIndex: nextStopIndex });
        }
      } else {
        // Delivery stop
        if (currentStop.status === 'pending') {
          // Delivered
          stops[currIdx].status = 'completed';
          const stopOrderIds = currentStop.orderIds || [currentStop.orderId];
          await Promise.all(stopOrderIds.map(orderId => updateOrderStatus(orderId, 'DELIVERED', user?.coords, 100)));
          await Promise.all(stopOrderIds.map(orderId => updateOrderStatus(orderId, 'COMPLETED')));
          
          // Confetti explosion on delivery dropoff!
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.85 }
          });

          const nextIdx = currIdx + 1;
          const isFinished = nextIdx >= stops.length;

          if (isFinished) {
            // Whole batch completed!
            await updateBatch(activeBatch.id, { 
              status: 'completed',
              stops,
              currentStopIndex: currIdx
            });
            // Credit earnings
            setTodayDeliveries(prev => prev + activeBatch.orderIds.length);
            setTodayEarnings(prev => prev + activeBatch.totalEarnings);
            
            // Clean active states
            setActiveBatch(null);
            setActiveOrders([]);
          } else {
            await updateBatch(activeBatch.id, { 
              stops, 
              currentStopIndex: nextIdx 
            });
          }
        }
      }
    } else {
      // Single order workflow:
      // RIDER_ASSIGNED -> ARRIVED_AT_SHOP -> PICKED_UP -> OUT_FOR_DELIVERY -> DELIVERED -> COMPLETED
      const order = activeOrders[0];
      const curStatus = order.status;

      if (isOrderStatus(curStatus, 'RIDER_ASSIGNED')) {
        await updateOrderStatus(order.id, 'ARRIVED_AT_SHOP');
      } else if (isOrderStatus(curStatus, 'ARRIVED_AT_SHOP')) {
        await updateOrderStatus(order.id, 'PICKED_UP');
      } else if (isOrderStatus(curStatus, 'PICKED_UP')) {
        await updateOrderStatus(order.id, 'OUT_FOR_DELIVERY', user?.coords, 50);
      } else if (isOrderStatus(curStatus, 'OUT_FOR_DELIVERY')) {
        await updateOrderStatus(order.id, 'DELIVERED', user?.coords, 100);
        await updateOrderStatus(order.id, 'COMPLETED');
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.85 }
        });
        setTodayDeliveries(prev => prev + 1);
        setTodayEarnings(prev => prev + PER_DELIVERY_FEE);
        setActiveOrders([]);
      }
    }
  };

  const userRef = useRef(user);
  const activeOrdersRef = useRef(activeOrders);
  const activeBatchRef = useRef(activeBatch);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    activeOrdersRef.current = activeOrders;
  }, [activeOrders]);

  useEffect(() => {
    activeBatchRef.current = activeBatch;
  }, [activeBatch]);

  const lastSyncRef = useRef<{ lat: number; lng: number; time: number } | null>(null);

  // Location updating: Continuous Real GPS / Heartbeat Tracking in Online Mode
  useEffect(() => {
    if (!isOnline || !userRef.current) {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
        locationIntervalRef.current = null;
      }
      locationService.stopTracking();
      return;
    }

    // Helper to upload a fresh location update with battery throttling
    const syncLocationToFirebase = async (
      latitude: number,
      longitude: number,
      extra: { heading?: number; speed?: number; accuracy?: number; force?: boolean } = {}
    ) => {
      const currentActiveOrders = activeOrdersRef.current;
      const currentActiveBatch = activeBatchRef.current;
      const currentUser = userRef.current;
      if (!currentUser) return;

      const now = Date.now();
      if (lastSyncRef.current && !extra.force) {
        const timeDelta = (now - lastSyncRef.current.time) / 1000;
        const distDelta = Math.hypot(latitude - lastSyncRef.current.lat, longitude - lastSyncRef.current.lng);
        // Battery Saver: Skip Firestore write if rider moved < 8 meters and < 5 seconds since last write
        if (distDelta < 0.00008 && timeDelta < 5) {
          return;
        }
      }
      lastSyncRef.current = { lat: latitude, lng: longitude, time: now };

      const activeIds = currentActiveOrders.map(a => a.id);

      // Calculate progress percentage to destination if active orders exist
      let pct = 0;
      if (currentActiveOrders.length > 0) {
        let destCoords = MOCK_GPS_START;
        if (currentActiveBatch) {
          const currentStop = currentActiveBatch.stops[currentActiveBatch.currentStopIndex];
          destCoords = currentStop.coords;
        } else {
          const order = currentActiveOrders[0];
          if (isOrderStatus(order.status, 'RIDER_ASSIGNED', 'ARRIVED_AT_SHOP')) {
            destCoords = order.shopCoords || { lat: 28.5835, lng: 77.3142 };
          } else {
            destCoords = order.deliveryAddress.coords || MOCK_GPS_START;
          }
        }
        const totalDist = Math.hypot(destCoords.lat - MOCK_GPS_START.lat, destCoords.lng - MOCK_GPS_START.lng);
        const remainingDist = Math.hypot(destCoords.lat - latitude, destCoords.lng - longitude);
        if (totalDist > 0) {
          pct = Math.min(100, Math.max(0, Math.round(((totalDist - remainingDist) / totalDist) * 100)));
        }
      }

      const updateData = {
        lat: latitude,
        lng: longitude,
        heading: extra.heading ?? 0,
        speed: extra.speed ?? 0,
        accuracy: extra.accuracy ?? 0,
        timestamp: new Date().toISOString()
      };

      console.log(`[Rider GPS Live] Syncing location:`, updateData);
      await updateRiderLocation(currentUser.uid, updateData, activeIds, pct);
      setUser(prev => prev ? { ...prev, coords: { lat: latitude, lng: longitude } } : null);
    };

    // 1. Continuous watchPosition tracking (Significant movements)
    locationService.startTracking(
      async (realCoords) => {
        await syncLocationToFirebase(realCoords.lat, realCoords.lng, {
          accuracy: realCoords.accuracy
        });
      },
      (err) => {
        console.warn('[Rider GPS] watchPosition error:', err);
      }
    );

    // 2. Continuous Fused GPS Heartbeat Query every 10 seconds
    locationIntervalRef.current = window.setInterval(async () => {
      try {
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 8000
        });
        await syncLocationToFirebase(
          pos.coords.latitude,
          pos.coords.longitude,
          {
            heading: pos.coords.heading ?? undefined,
            speed: pos.coords.speed ?? undefined,
            accuracy: pos.coords.accuracy ?? undefined
          }
        );
      } catch (err) {
        console.warn('[Rider GPS Heartbeat] Failed querying current position:', err);
        
        // Local sandbox simulation fallback (ONLY when mock mode is active)
        const currentActiveOrders = activeOrdersRef.current;
        const currentActiveBatch = activeBatchRef.current;
        const currentUser = userRef.current;
        if (!isFirebaseActive() && currentActiveOrders.length > 0 && currentUser) {
          const destCoords = currentActiveBatch 
            ? currentActiveBatch.stops[currentActiveBatch.currentStopIndex].coords 
            : (currentActiveOrders[0].deliveryAddress.coords || MOCK_GPS_START);
          const currCoords = currentUser.coords || MOCK_GPS_START;
          const nextCoords = { ...currCoords };
          const dLat = destCoords.lat - currCoords.lat;
          const dLng = destCoords.lng - currCoords.lng;
          const dist = Math.hypot(dLat, dLng);

          if (dist > 0.0005) {
            nextCoords.lat += (dLat / dist) * 0.0008;
            nextCoords.lng += (dLng / dist) * 0.0008;
          }
          await syncLocationToFirebase(nextCoords.lat, nextCoords.lng);
        }
      }
    }, 10000);

    // 3. Foreground Catch-up Sync on app visibility return / focus
    const handleForegroundResume = async () => {
      if (document.visibilityState === 'visible') {
        try {
          const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 5000 });
          await syncLocationToFirebase(pos.coords.latitude, pos.coords.longitude, { force: true });
        } catch (err) {
          console.warn('[Rider Foreground GPS] Catch-up query warning:', err);
        }
      }
    };

    // 4. Network Recovery Sync on reconnect
    const handleNetworkOnline = async () => {
      try {
        const coords = await locationService.getCurrentLocation({ timeoutMs: 5000 });
        await syncLocationToFirebase(coords.lat, coords.lng, { force: true });
      } catch (err) {
        console.warn('[Rider Network GPS] Reconnect sync warning:', err);
      }
    };

    document.addEventListener('visibilitychange', handleForegroundResume);
    window.addEventListener('focus', handleForegroundResume);
    window.addEventListener('online', handleNetworkOnline);

    return () => {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
        locationIntervalRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleForegroundResume);
      window.removeEventListener('focus', handleForegroundResume);
      window.removeEventListener('online', handleNetworkOnline);
      locationService.stopTracking();
    };
  }, [isOnline]);

  // Auth helper: send OTP SMS
  const sendOTP = async (phoneNumber: string, recaptchaVerifier: any) => {
    if (hasValidConfig && auth && isFirebaseActive()) {
      try {
        logger.info('OTP', `Sending verification SMS to: ${phoneNumber}`);
        const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
        return { success: true, message: 'SMS verification code sent successfully!', confirmationResult };
      } catch (err: any) {
        logger.error('OTP', 'SMS Send Error:', err);
        recaptchaManager.clear();
        return { success: false, message: mapFirebaseError(err) };
      }
    } else {
      // Mock code bypass
      logger.info('OTP', `[Phone Auth Mock] Sending mock OTP for bypass/sandbox phone number: ${phoneNumber}`);
      return {
        success: true,
        message: 'Mock OTP code sent! Enter code: 123456 to verify.',
        confirmationResult: { mock: true, phoneNumber }
      };
    }
  };

  // Auth helper: verify OTP
  const verifyOTP = async (confirmationResult: any, code: string, name?: string) => {
    if (isFirebaseActive() && db) {
      try {
        let fUserUid = 'dev-rider-uid';
        let phone = confirmationResult.phoneNumber || '+919999911111';
        
        if (!confirmationResult.mock) {
          logger.info('OTP', 'Confirming verification code with Firebase Auth.');
          const credentialResult = await confirmationResult.confirm(code);
          const fUser = credentialResult.user;
          fUserUid = fUser.uid;
          phone = fUser.phoneNumber || confirmationResult.phoneNumber || '';
        }

        let profile = await getUserProfile(fUserUid);
        if (!profile) {
          profile = {
            uid: fUserUid,
            fullName: name || 'Rider Partner',
            email: '',
            phone: phone,
            role: 'rider',
            vehicleType: 'Bike',
            vehicleNumber: 'UP-16-AM-9999',
            rating: 4.8,
            totalDeliveries: 10,
            todayDeliveries: 0,
            todayEarnings: 0,
            acceptanceRate: 100,
            documentStatus: 'verified',
            status: 'offline',
            coords: MOCK_GPS_START,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
          };
          await createUserProfile(fUserUid, profile);
        } else {
          await updateUserProfile(fUserUid, { lastLogin: new Date().toISOString() });
        }
        
        setUser(profile);
        localStorage.setItem('hs_logged_in_user', JSON.stringify(profile));
        localStorage.setItem('hs_user', JSON.stringify(profile));
        
        recaptchaManager.clear();
        return { success: true, message: 'Logged in successfully!' };
      } catch (err: any) {
        logger.error('Auth', 'Rider OTP verification failed:', err);
        recaptchaManager.clear();
        return { success: false, message: mapFirebaseError(err) };
      }
    } else {
      // Mock validation
      if (code !== '123456') {
        return { success: false, message: 'Invalid verification code. Enter 123456.' };
      }
      
      const phone = confirmationResult.phoneNumber || '+919999911111';
      const mockUsers = getMockData<UserProfileDoc[]>('hs_firestore_users', []);
      let matched = mockUsers.find((u: any) => u.phone === phone && u.role === 'rider');
      
      if (!matched) {
        matched = {
          uid: `rider-${Math.floor(100000 + Math.random() * 900000)}`,
          fullName: name || 'Rider Partner',
          email: '',
          phone,
          role: 'rider',
          vehicleType: 'Bike',
          vehicleNumber: 'UP-16-DK-2026',
          rating: 4.8,
          totalDeliveries: 124,
          todayDeliveries: 0,
          todayEarnings: 0,
          acceptanceRate: 96,
          documentStatus: 'verified',
          status: 'offline',
          coords: MOCK_GPS_START,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        };
        await createUserProfile(matched.uid, matched);
      } else {
        await updateUserProfile(matched.uid, { lastLogin: new Date().toISOString() });
      }
      
      setUser(matched);
      localStorage.setItem('hs_logged_in_user', JSON.stringify(matched));
      localStorage.setItem('hs_user', JSON.stringify(matched));
      return { success: true, message: 'Logged in successfully (Mock Mode)!' };
    }
  };

  // Sign out rider
  const logout = async () => {
    if (isFirebaseActive() && auth) {
      await signOut(auth);
    }
    setUser(null);
    setIsOnline(false);
    setActiveOrders([]);
    setActiveBatch(null);
    localStorage.removeItem('hs_logged_in_user');
    localStorage.removeItem('hs_user');
  };

  // Manual Trigger: Debug tick to test location updates
  const triggerSimulationTick = () => {
    if (user && activeOrders.length > 0) {
      // Speed up simulated driving by manually invoking a tick
      const event = new CustomEvent('sim-location-step');
      window.dispatchEvent(event);
    }
  };

  // Manual placement of mock orders for local testing
  const triggerMockOrderPlacement = () => {
    const orders = getMockData<OrderDocument[]>('hs_orders', []);
    const newOrderId = `order-${Math.floor(100000 + Math.random() * 900000)}`;
    const mockOrder: OrderDocument = {
      id: newOrderId,
      shopId: 'shop-1',
      shopName: 'Aggarwal Sweets',
      shopAddress: 'Sector 15 Main Market, Noida',
      items: [
        {
          product: {
            id: 'prod-1',
            name: 'Kaju Katli (500g)',
            price: 350,
            image: '',
            shopId: 'shop-1',
            shopName: 'Aggarwal Sweets'
          },
          quantity: 1,
          shopId: 'shop-1'
        }
      ],
      subtotal: 350,
      deliveryFee: 40,
      platformFee: 5,
      tax: 15,
      discount: 0,
      total: 410,
      status: 'SEARCHING_RIDER',
      paymentMethod: 'UPI',
      paymentStatus: 'completed',
      deliveryAddress: {
        id: 'addr-1',
        label: 'Home',
        address: 'Flat 402, Sector 74, Noida',
        coords: { lat: 28.5912, lng: 77.3412 }
      },
      contact: {
        name: 'Mehul Kumar',
        phone: '+91 99999 88888'
      },
      instructions: 'Leave at gate if not answering call.',
      createdAt: new Date().toISOString()
    };
    
    saveMockData('hs_orders', [mockOrder, ...orders]);
  };

  const updateProfile = async (fields: Partial<UserProfileDoc>) => {
    if (!user) return;
    const updated = { ...user, ...fields };
    setUser(updated);
    
    localStorage.setItem('hs_logged_in_user', JSON.stringify(updated));
    localStorage.setItem('hs_user', JSON.stringify(updated));
    
    if (isFirebaseActive()) {
      await updateUserProfile(user.uid, fields);
    } else {
      const mockUsers = getMockData<UserProfileDoc[]>('hs_firestore_users', []);
      const idx = mockUsers.findIndex(u => u.uid === user.uid);
      if (idx > -1) {
        mockUsers[idx] = { ...mockUsers[idx], ...fields };
        saveMockData('hs_firestore_users', mockUsers);
      }
    }
    window.dispatchEvent(new Event('mock-db-update'));
  };

  return (
    <AppContext.Provider value={{
      user,
      loading,
      isOnline,
      activeOrders,
      activeBatch,
      newRequest,
      todayEarnings,
      todayDeliveries,
      acceptanceRate,
      currentRating,
      historyOrders,
      isAccepting,
      setOnlineStatus,
      sendOTP,
      verifyOTP,
      logout,
      acceptSingleOrder,
      rejectSingleOrder,
      acceptSmartBatch,
      rejectSmartBatch,
      updateWorkflowStep,
      triggerSimulationTick,
      triggerMockOrderPlacement,
      updateProfile
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
