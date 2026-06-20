"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

type Role = 'admin' | 'user' | null;

interface UserContextType {
  user: User | null;
  role: Role;
  isLoggedIn: boolean;
  isAdmin: boolean;
  loading: boolean;
  logout: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchRole = async (currentUser: User) => {
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/auth/role', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setRole(data.role);
      } else {
        setRole(null);
      }
    } catch (error) {
      console.error('Failed to fetch role:', error);
      setRole(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchRole(currentUser);
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Failed to sign out', error);
    }
  };

  const refreshRole = async () => {
    if (user) {
      await fetchRole(user);
    }
  };

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-bg-base)' }}>Loading...</div>;
  }

  return (
    <UserContext.Provider value={{ 
      user, 
      role, 
      isLoggedIn: !!user && !!role, 
      isAdmin: role === 'admin', 
      loading, 
      logout,
      refreshRole
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
