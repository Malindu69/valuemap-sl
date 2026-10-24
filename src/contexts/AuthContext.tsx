import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { type User, type AuthState } from '../types';
import { generateId } from '../utils';
import { supabase, isSupabaseConfigured } from '../services/supabase';

const USERS_KEY = 'valuemap_sl_users_v3';
const SESSION_KEY = 'valuemap_sl_session_v3';

export interface StoredUser extends User {
  username: string;
  passwordHash: string;
  createdAt?: string;
}

function hashPassword(pw: string): string {
  try {
    return btoa(pw);
  } catch {
    return pw;
  }
}

const DEFAULT_USERS: StoredUser[] = [
  {
    id: 'user_admin_01',
    username: 'Admin',
    email: 'admin@valuemap.lk',
    name: 'Admin',
    role: 'admin',
    passwordHash: hashPassword('Admin@123'),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user_dilhani_02',
    username: 'Dilhani',
    email: 'dilhani@valuemap.lk',
    name: 'Dilhani',
    role: 'valuer',
    passwordHash: hashPassword('12345'),
    createdAt: new Date().toISOString(),
  },
];

function getStoredUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure Admin and Dilhani always exist
        const hasAdmin = parsed.some((u: StoredUser) => u.username?.toLowerCase() === 'admin');
        const hasDilhani = parsed.some((u: StoredUser) => u.username?.toLowerCase() === 'dilhani');
        const merged = [...parsed];
        if (!hasAdmin) merged.unshift(DEFAULT_USERS[0]);
        if (!hasDilhani) merged.push(DEFAULT_USERS[1]);
        return merged;
      }
    }
  } catch { /* empty */ }

  localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
  return DEFAULT_USERS;
}

function saveStoredUsers(users: StoredUser[]): void {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch (err) {
    console.warn('Could not save users to local storage:', err);
  }
}

function getSession(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ─── Context ───────────────────────────────────────────────────────────────

interface AuthContextValue extends AuthState {
  users: StoredUser[];
  login: (identifier: string, password: string) => Promise<{ error?: string }>;
  guestLogin: () => void;
  logout: () => void;
  createUser: (data: { username: string; name: string; email?: string; role: 'admin' | 'valuer'; password: string }) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (id: string) => Promise<{ success: boolean; error?: string }>;
  canEdit: boolean;
  canAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: getSession(),
    isLoading: false,
  });
  const [users, setUsers] = useState<StoredUser[]>(() => getStoredUsers());

  // Sync users with Supabase `app_users` table if available
  useEffect(() => {
    async function syncDbUsers() {
      if (!isSupabaseConfigured) return;
      try {
        const { data, error } = await supabase.from('app_users').select('*');
        if (!error && data && data.length > 0) {
          const dbUsers: StoredUser[] = data.map((row: any) => ({
            id: String(row.id),
            username: row.username,
            name: row.name || row.username,
            email: row.email || `${row.username.toLowerCase()}@valuemap.lk`,
            role: row.role === 'admin' ? 'admin' : 'valuer',
            passwordHash: hashPassword(row.password || ''),
            createdAt: row.created_at,
          }));

          // Merge db users with defaults
          const mergedMap = new Map<string, StoredUser>();
          getStoredUsers().forEach(u => mergedMap.set(u.username.toLowerCase(), u));
          dbUsers.forEach(u => mergedMap.set(u.username.toLowerCase(), u));
          const mergedList = Array.from(mergedMap.values());
          saveStoredUsers(mergedList);
          setUsers(mergedList);
        }
      } catch (err) {
        // Table might not exist yet, local fallback active
      }
    }
    syncDbUsers();
  }, []);

  const login = useCallback(async (identifier: string, password: string): Promise<{ error?: string }> => {
    setState((s) => ({ ...s, isLoading: true }));
    await new Promise((r) => setTimeout(r, 350));

    const currentUsers = getStoredUsers();
    const idClean = identifier.trim().toLowerCase();
    const pwHash = hashPassword(password);

    const found = currentUsers.find(
      (u) =>
        (u.username.toLowerCase() === idClean || u.email.toLowerCase() === idClean) &&
        u.passwordHash === pwHash,
    );

    if (!found) {
      setState((s) => ({ ...s, isLoading: false }));
      return { error: 'Invalid username/email or password' };
    }

    const user: User = { id: found.id, email: found.email, name: found.name, role: found.role };
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    setState({ user, isLoading: false });
    return {};
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
    const cleanUsername = data.username.trim();
    if (!cleanUsername) return { success: false, error: 'Username is required' };
    if (!data.password) return { success: false, error: 'Password is required' };

    const current = getStoredUsers();
    if (current.some(u => u.username.toLowerCase() === cleanUsername.toLowerCase())) {
      return { success: false, error: 'Username already exists' };
    }

    const newUser: StoredUser = {
      id: generateId(),
      username: cleanUsername,
      name: data.name.trim() || cleanUsername,
      email: data.email?.trim() || `${cleanUsername.toLowerCase()}@valuemap.lk`,
      role: data.role,
      passwordHash: hashPassword(data.password),
      createdAt: new Date().toISOString(),
    };

    const updated = [...current, newUser];
    saveStoredUsers(updated);
    setUsers(updated);

    // Save to Supabase if table exists
    if (isSupabaseConfigured) {
      try {
        await supabase.from('app_users').insert([{
          id: newUser.id,
          username: newUser.username,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          password: data.password,
        }]);
      } catch (err) {
        console.warn('Could not sync new user to Supabase:', err);
      }
    }

    return { success: true };
  }, []);

  const deleteUser = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    const current = getStoredUsers();
    const toDelete = current.find(u => u.id === id);
    if (!toDelete) return { success: false, error: 'User not found' };

    if (toDelete.username.toLowerCase() === 'admin') {
      return { success: false, error: 'Default Admin account cannot be deleted' };
    }

    const updated = current.filter(u => u.id !== id);
    saveStoredUsers(updated);
    setUsers(updated);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('app_users').delete().eq('id', id);
      } catch (err) {
        console.warn('Could not delete user from Supabase:', err);
      }
    }

    return { success: true };
  }, []);

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
