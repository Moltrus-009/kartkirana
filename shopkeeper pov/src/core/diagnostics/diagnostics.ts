import { create } from 'zustand';

export interface TimelineEvent {
  timestamp: number;
  stage: string;
  status: 'PENDING' | 'SUCCESS' | 'ERROR' | 'WAITING';
  detail?: string;
}

export interface ProviderStatus {
  name: string;
  status: 'Initialized' | 'Loaded' | 'Waiting' | 'Ready' | 'Error';
  detail?: string;
}

export interface DiagnosticsState {
  timeline: TimelineEvent[];
  providers: Record<string, ProviderStatus>;
  navigation: {
    currentRoute: string;
    lastRoute: string;
    pendingRoute: string;
  };
  components: Record<string, { mounted: boolean; renders: number; lastState: string }>;
  firestoreQueries: Record<string, { status: string; detail?: string; timestamp: number }>;
  unhandledError: { message: string; stack?: string } | null;
  
  addEvent: (stage: string, status: TimelineEvent['status'], detail?: string) => void;
  updateProvider: (name: string, status: ProviderStatus['status'], detail?: string) => void;
  setRoute: (route: string) => void;
  trackComponent: (name: string, event: 'mount' | 'unmount' | 'render', state?: string) => void;
  trackQuery: (id: string, status: string, detail?: string) => void;
  setError: (message: string, stack?: string) => void;
  clearError: () => void;
}

export const useDiagnostics = create<DiagnosticsState>((set) => ({
  timeline: [{ timestamp: Date.now(), stage: 'App Launch', status: 'SUCCESS', detail: 'Vite process running' }],
  providers: {
    'Authentication': { name: 'Authentication', status: 'Waiting', detail: 'Awaiting Auth observer' },
    'Merchant Profile': { name: 'Merchant Profile', status: 'Waiting', detail: 'Awaiting uid' },
    'Shop Profile': { name: 'Shop Profile', status: 'Waiting', detail: 'Awaiting shopId' },
    'Database Sync': { name: 'Database Sync', status: 'Waiting', detail: 'Awaiting shop validation' }
  },
  navigation: { currentRoute: '/', lastRoute: '', pendingRoute: '' },
  components: {},
  firestoreQueries: {},
  unhandledError: null,

  addEvent: (stage, status, detail) => set((state) => ({
    timeline: [...state.timeline, { timestamp: Date.now(), stage, status, detail }]
  })),

  updateProvider: (name, status, detail) => set((state) => ({
    providers: { ...state.providers, [name]: { name, status, detail } }
  })),

  setRoute: (route) => set((state) => ({
    navigation: { ...state.navigation, lastRoute: state.navigation.currentRoute, currentRoute: route }
  })),

  trackComponent: (name, event, lastState) => set((state) => {
    const existing = state.components[name] || { mounted: false, renders: 0, lastState: '' };
    return {
      components: {
        ...state.components,
        [name]: {
          mounted: event === 'mount' ? true : (event === 'unmount' ? false : existing.mounted),
          renders: event === 'render' ? existing.renders + 1 : existing.renders,
          lastState: lastState || existing.lastState
        }
      }
    };
  }),

  trackQuery: (id, status, detail) => set((state) => ({
    firestoreQueries: { ...state.firestoreQueries, [id]: { status, detail, timestamp: Date.now() } }
  })),

  setError: (message, stack) => set({ unhandledError: { message, stack } }),
  clearError: () => set({ unhandledError: null })
}));
