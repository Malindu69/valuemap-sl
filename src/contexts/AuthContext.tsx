import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { type User, type AuthState } from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabase';

const SESSION_KEY = 'valuemap_sl_session_v4';
const CACHED_USERS_KEY = 'valuemap_sl_cached_users_v4';

export interface StoredUser extends User {
  username: string;
  createdAt?: string;
}

function getSession(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getCachedUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(CACHED_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setCachedUsers(users: StoredUser[]): void {
  try {
    localStorage.setItem(CACHED_USERS_KEY, JSON.stringify(users));
  } catch (err) {
    console.warn('Could not cache users:', err);
  }
}

/** Escape SQL LIKE/ILIKE wildcard pattern characters (%, _, \) to prevent pattern injection */
function escapeSqlLike(text: string): string {
  return text.replace(/[%_\\]/g, '\\$&');
}

// ─── Context ───────────────────────────────────────────────────────────────

interface AuthContextValue extends AuthState {
  users: StoredUser[];
  login: (identifier: string, password: string) => Promise<{ error?: string }>;
  guestLogin: () => void;
  logout: () => void;
  createUser: (data: { username: string; name: string; email?: string; role: 'admin' | 'valuer'; password: string }) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (id: string) => Promise<{ success: boolean; error?: string }>;
  refreshUsers: () => Promise<void>;
  canEdit: boolean;
  canAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: getSession(),
    isLoading: false,
  });
  const [users, setUsers] = useState<StoredUser[]>(() => getCachedUsers());

  // Fetch users directly from Supabase DB
  const refreshUsers = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('id, username, name, email, role, created_at')
        .order('created_at', { ascending: true });

      if (!error && data) {
        const mapped: StoredUser[] = data.map((row: any) => ({
          id: String(row.id),
          username: row.username,
          name: row.name || row.username,
          email: row.email || `${row.username.toLowerCase()}@valuemap.lk`,
          role: row.role === 'admin' ? 'admin' : 'valuer',
          createdAt: row.created_at,
        }));
        setUsers(mapped);
        setCachedUsers(mapped);
      }
    } catch (err) {
      console.warn('Could not fetch app_users from Supabase:', err);
    }
  }, []);

  useEffect(() => {
    refreshUsers();
  }, [refreshUsers]);

  const login = useCallback(async (identifier: string, password: string): Promise<{ error?: string }> => {
    setState((s) => ({ ...s, isLoading: true }));
    const cleanId = identifier.trim();

    if (!cleanId || !password) {
      setState((s) => ({ ...s, isLoading: false }));
      return { error: 'Please enter both username and password' };
    }

    // Input bounds check to prevent payload bloat
    if (cleanId.length > 100 || password.length > 100) {
      setState((s) => ({ ...s, isLoading: false }));
      return { error: 'Invalid username/email or password' };
    }

    try {
      if (isSupabaseConfigured) {
        const escapedId = escapeSqlLike(cleanId);

        // Security: Query matching username AND password on DB side.
        // The plaintext password column is NEVER returned to client memory.
        let { data, error } = await supabase
          .from('app_users')
          .select('id, username, name, email, role, created_at')
          .ilike('username', escapedId)
          .eq('password', password)
          .limit(1);

        // If not matched by username, try by email + password
        if (!error && (!data || data.length === 0)) {
          const result = await supabase
            .from('app_users')
            .select('id, username, name, email, role, created_at')
            .ilike('email', escapedId)
            .eq('password', password)
            .limit(1);
          data = result.data;
          error = result.error;
        }

        if (error) {
          setState((s) => ({ ...s, isLoading: false }));
          return { error: `Database error: ${error.message}. Check Supabase RLS policies for app_users table.` };
        }

        if (!data || data.length === 0) {
          setState((s) => ({ ...s, isLoading: false }));
          return { error: 'Invalid username/email or password' };
        }

        const userRow = data[0];
        const user: User = {
          id: String(userRow.id),
          name: userRow.name || userRow.username,
          email: userRow.email || `${userRow.username.toLowerCase()}@valuemap.lk`,
          role: userRow.role === 'admin' ? 'admin' : 'valuer',
        };

        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        setState({ user, isLoading: false });
        return {};
      }

      setState((s) => ({ ...s, isLoading: false }));
      return { error: 'Supabase database is not configured' };
    } catch (err) {
      setState((s) => ({ ...s, isLoading: false }));
      return { error: `Unexpected error: ${String(err)}` };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setState({ user: null, isLoading: false });
  }, []);

  const guestLogin = useCallback(() => {
    const guest: User = {
      id: 'guest',
      email: 'guest@valuemap.lk',
      name: 'Guest Viewer',
      role: 'viewer',
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(guest));
    setState({ user: guest, isLoading: false });
  }, []);

  const createUser = useCallback(async (data: {
    username: string;
    name: string;
    email?: string;
    role: 'admin' | 'valuer';
    password: string;
  }): Promise<{ success: boolean; error?: string }> => {
    // Role-based authorization check
    if (state.user?.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only an Administrator can create users' };
    }

    const cleanUsername = data.username.trim();
    if (!cleanUsername) return { success: false, error: 'Username is required' };
    if (cleanUsername.length < 3 || cleanUsername.length > 40) {
      return { success: false, error: 'Username must be between 3 and 40 characters' };
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      return { success: false, error: 'Username can only contain alphanumeric characters, underscores, dots, or dashes' };
    }
    if (!data.password || data.password.length < 5) {
      return { success: false, error: 'Password must be at least 5 characters long' };
    }

    if (!isSupabaseConfigured) {
      return { success: false, error: 'Database is not connected' };
    }

    try {
      const { error } = await supabase.from('app_users').insert([{
        username: cleanUsername,
        name: data.name.trim() || cleanUsername,
        email: data.email?.trim() || `${cleanUsername.toLowerCase()}@valuemap.lk`,
        role: data.role,
        password: data.password,
      }]);

      if (error) {
        if (error.code === '23505') {
          return { success: false, error: `Username "${cleanUsername}" is already taken` };
        }
        return { success: false, error: error.message };
      }

      await refreshUsers();
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }, [state.user, refreshUsers]);

  const deleteUser = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    // Role-based authorization check
    if (state.user?.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only an Administrator can delete users' };
    }

    // Prevent self-deletion
    if (state.user.id === id) {
      return { success: false, error: 'Cannot delete your own active administrator account' };
    }

    if (!isSupabaseConfigured) {
      return { success: false, error: 'Database is not connected' };
    }

    try {
      const { error } = await supabase.from('app_users').delete().eq('id', id);
      if (error) {
        return { success: false, error: error.message };
      }

      await refreshUsers();
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }, [state.user, refreshUsers]);

  const canEdit = state.user?.role === 'admin' || state.user?.role === 'valuer';
  const canAdmin = state.user?.role === 'admin';

  return (
    <AuthContext.Provider value={{
      ...state,
      users,
      login,
      guestLogin,
      logout,
      createUser,
      deleteUser,
      refreshUsers,
      canEdit,
      canAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
