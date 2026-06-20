"use client";

import React, { useState, useEffect } from 'react';
import { useUser } from './UserContext';
import { useAlert } from './AlertContext';
import { Lock, UserPlus } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, loading, refreshRole } = useUser();
  const { showAlert } = useAlert();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);

  useEffect(() => {
    const checkSetup = async () => {
      try {
        const response = await fetch('/api/auth/setup', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}) // Send empty body to check status
        });
        
        // If it returns 400 Bad Request (missing email/password), it means the endpoint is open
        // If it returns 403 Forbidden, it means setup is already complete
        if (response.status !== 403) {
          setIsSetupMode(true);
        }
      } catch (e) {
        console.error('Setup check failed:', e);
      } finally {
        setCheckingSetup(false);
      }
    };
    
    if (!isLoggedIn) {
      checkSetup();
    } else {
      setCheckingSetup(false);
    }
  }, [isLoggedIn]);

  if (loading) {
    return null; // Loading handled by UserProvider
  }

  if (isLoggedIn) {
    return <>{children}</>;
  }

  if (checkingSetup) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-bg-base)' }}>Loading...</div>;
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSetupMode) {
        const res = await fetch('/api/auth/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, displayName })
        });
        
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to complete setup');
        }
        
        await signInWithEmailAndPassword(auth, email, password);
        await refreshRole();
        showAlert("Admin account created successfully!", "success");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        await refreshRole();
        showAlert("Welcome back!", "success");
      }
    } catch (error: any) {
      console.error(error);
      showAlert(error.message || (isSetupMode ? "Failed to create account." : "Invalid email or password."), "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: 'var(--color-bg-base)',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      padding: '1rem'
    }}>
      <div className="glass-panel" style={{ 
        maxWidth: '400px', 
        width: '100%', 
        padding: '3rem', 
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        borderTop: '6px solid var(--color-primary)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            borderRadius: '16px', 
            background: 'linear-gradient(135deg, var(--color-primary) 0%, #4f46e5 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)'
          }}>
            {isSetupMode ? <UserPlus size={32} color="white" /> : <Lock size={32} color="white" />}
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            LUMEN
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 500, marginTop: '0.25rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {isSetupMode ? 'Initial Setup' : 'Accounting Access'}
          </p>
        </div>

        {isSetupMode && (
          <div style={{ 
            marginBottom: '1.5rem', 
            padding: '1rem', 
            backgroundColor: 'rgba(79, 70, 229, 0.1)', 
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(79, 70, 229, 0.2)',
            fontSize: '0.875rem',
            color: 'var(--color-primary)'
          }}>
            <strong>Welcome!</strong> Please create the initial administrator account to get started.
          </div>
        )}

        <form onSubmit={handleAuth}>
          {isSetupMode && (
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" htmlFor="displayName" style={{ fontSize: '0.875rem' }}>Full Name</label>
              <input 
                id="displayName"
                type="text" 
                className="form-input" 
                placeholder="Enter your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                style={{ padding: '0.75rem 1rem' }}
              />
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label" htmlFor="email" style={{ fontSize: '0.875rem' }}>Email Address</label>
            <input 
              id="email"
              type="email" 
              className="form-input" 
              placeholder="admin@hotellumen.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ padding: '0.75rem 1rem' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '2.5rem' }}>
            <label className="form-label" htmlFor="password" style={{ fontSize: '0.875rem' }}>Password</label>
            <input 
              id="password"
              type="password" 
              className="form-input" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={{ padding: '0.75rem 1rem' }}
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            style={{ width: '100%', padding: '0.875rem', fontSize: '1rem', fontWeight: 600, justifyContent: 'center' }}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : (isSetupMode ? 'Create Admin Account' : 'Sign In')}
          </button>
        </form>
      </div>
    </div>
  );
}
