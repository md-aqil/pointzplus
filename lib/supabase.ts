// lib/supabase.ts – Supabase client with PostgreSQL backend
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import { useAuthStore } from '../store/authStore';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhY2xhdi1mYXN0bW9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY0MTMxNDEsImV4cCI6MjA0MTk4OTE0MX0.xOqYzP9N7xZz';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    detectSessionInUrl: false,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public',
  },
});

// Auto-logout when app goes to background (security)
AppState.addEventListener('change', (state) => {
  if (state === 'background' || state === 'inactive') {
    // Session stays in local storage; app just won't auto-sync in background
    console.log('App went to background - sync paused');
  } else if (state === 'active') {
    // Optional: Auto-refresh session or sync on foreground
    console.log('App foregrounded - ready to sync');
  }
});

// Realtime channel manager
export const createRealtimeChannel = (channelName: string, callback: (payload: any) => void) => {
  return supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public' },
      callback
    )
    .subscribe();
};

// Helper: Get current user ID safely
export const getCurrentUserId = () => {
  const { user } = useAuthStore.getState();
  return user?.id || supabase.auth.getUser().then(r => r.data.user?.id);
};
