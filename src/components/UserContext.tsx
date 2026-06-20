"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type Role = 'admin' | 'user';

interface UserContextType {
  role: Role;
  isLoggedIn: boolean;
  isAdmin: boolean;
  login: (role: Role) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>('user');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  
  // Try to load role from localStorage to persist state
  useEffect(() => {
    setIsMounted(true);
    const savedRole = localStorage.getItem('lumen_role') as Role | null;
    const savedStatus = localStorage.getItem('lumen_auth_status');
    
    if (savedStatus === 'loggedIn' && savedRole) {
      setRoleState(savedRole);
      setIsLoggedIn(true);
    }
  }, []);

  const login = (newRole: Role) => {
    setRoleState(newRole);
    setIsLoggedIn(true);
    localStorage.setItem('lumen_role', newRole);
    localStorage.setItem('lumen_auth_status', 'loggedIn');
  };

  const logout = () => {
    setRoleState('user');
    setIsLoggedIn(false);
    localStorage.removeItem('lumen_role');
    localStorage.removeItem('lumen_auth_status');
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-bg-base)' }}>Loading...</div>;
  }

  return (
    <UserContext.Provider value={{ role, isLoggedIn, isAdmin: role === 'admin', login, logout }}>
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
