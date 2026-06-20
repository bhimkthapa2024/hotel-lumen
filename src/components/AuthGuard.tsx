"use client";

import React, { useState } from 'react';
import { useUser } from './UserContext';
import { useAlert } from './AlertContext';
import { Lock } from 'lucide-react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, login } = useUser();
  const { showAlert } = useAlert();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (isLoggedIn) {
    return <>{children}</>;
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate a brief network delay for realism
    setTimeout(() => {
      if (username === 'admin' && password === 'admin') {
        login('admin');
        showAlert("Welcome back, Administrator!", "success");
      } else if (username === 'user' && password === 'user') {
        login('user');
        showAlert("Welcome back!", "success");
      } else {
        showAlert("Invalid username or password.", "error");
      }
      setIsLoading(false);
    }, 600);
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
            <Lock size={32} color="white" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            LUMEN
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 500, marginTop: '0.25rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Accounting Access
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label" htmlFor="username" style={{ fontSize: '0.875rem' }}>Username</label>
            <input 
              id="username"
              type="text" 
              className="form-input" 
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
              style={{ padding: '0.75rem 1rem' }}
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            style={{ width: '100%', padding: '0.875rem', fontSize: '1rem', fontWeight: 600, justifyContent: 'center' }}
            disabled={isLoading}
          >
            {isLoading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
          <p style={{ marginBottom: '0.5rem' }}><strong>Admin:</strong> admin / admin</p>
          <p><strong>User:</strong> user / user</p>
        </div>
      </div>
    </div>
  );
}
