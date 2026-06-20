"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X, HelpCircle } from 'lucide-react';

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

interface AlertState {
  isOpen: boolean;
  message: string;
  type: AlertType;
  isConfirm?: boolean;
  highlight?: string;
}

interface AlertContextType {
  showAlert: (message: string, type?: AlertType, highlight?: string) => void;
  showConfirm: (message: string, type?: AlertType) => Promise<boolean>;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}

export function AlertProvider({ children }: { children: ReactNode }) {
  const confirmResolveRef = React.useRef<((value: boolean) => void) | null>(null);

  const [alertState, setAlertState] = useState<AlertState>({
    isOpen: false,
    message: '',
    type: 'info',
    isConfirm: false
  });

  const showAlert = (message: string, type: AlertType = 'info', highlight?: string) => {
    setAlertState({ isOpen: true, message, type, isConfirm: false, highlight });
  };

  const showConfirm = (message: string, type: AlertType = 'confirm'): Promise<boolean> => {
    return new Promise((resolve) => {
      confirmResolveRef.current = resolve;
      setAlertState({ isOpen: true, message, type, isConfirm: true });
    });
  };

  const closeAlert = () => {
    setAlertState(prev => ({ ...prev, isOpen: false }));
    if (alertState.isConfirm && confirmResolveRef.current) {
      confirmResolveRef.current(false);
      confirmResolveRef.current = null;
    }
  };

  const handleConfirm = () => {
    setAlertState(prev => ({ ...prev, isOpen: false }));
    if (confirmResolveRef.current) {
      confirmResolveRef.current(true);
      confirmResolveRef.current = null;
    }
  };

  const getTypeStyles = (type: AlertType) => {
    switch (type) {
      case 'success':
        return { icon: <CheckCircle2 size={32} color="#10b981" />, title: 'Success', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
      case 'error':
        return { icon: <AlertCircle size={32} color="#ef4444" />, title: 'Error', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
      case 'warning':
        return { icon: <AlertTriangle size={32} color="#f59e0b" />, title: 'Warning', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
      case 'confirm':
        return { icon: <HelpCircle size={32} color="var(--color-primary)" />, title: 'Confirmation', color: 'var(--color-primary)', bg: 'rgba(79, 70, 229, 0.1)' };
      default:
        return { icon: <Info size={32} color="var(--color-primary)" />, title: 'Information', color: 'var(--color-primary)', bg: 'rgba(79, 70, 229, 0.1)' };
    }
  };

  const styles = getTypeStyles(alertState.type);

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      
      {alertState.isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 9999,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="glass-panel" style={{
            width: '90%', maxWidth: '400px',
            padding: '2rem',
            position: 'relative',
            display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
            backgroundColor: '#ffffff',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            transform: 'scale(1)',
            animation: 'scaleUp 0.2s ease-out'
          }}>
            <button 
              onClick={closeAlert}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
            >
              <X size={20} />
            </button>

            <div style={{ padding: '1rem', backgroundColor: styles.bg, borderRadius: '50%', marginBottom: '1.5rem' }}>
              {styles.icon}
            </div>

            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '1rem' }}>
              {styles.title}
            </h3>

            <div style={{ color: 'var(--color-text-secondary)', fontSize: '1rem', lineHeight: 1.5, marginBottom: alertState.highlight ? '1.5rem' : '2rem', width: '100%' }}>
              {alertState.message.split('\n').map((line, i) => (
                <p key={i} style={{ marginBottom: i === alertState.message.split('\n').length - 1 ? 0 : '0.5rem' }}>{line}</p>
              ))}
            </div>

            {alertState.highlight && (
              <div style={{
                marginBottom: '2rem',
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                width: '100%',
                boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.5), 0 4px 12px rgba(0,0,0,0.05)'
              }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Generated Voucher</span>
                <div style={{ 
                  fontSize: '2.5rem', 
                  fontWeight: 800, 
                  background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  marginTop: '0.25rem', 
                  letterSpacing: '0.02em',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                }}>
                  {alertState.highlight}
                </div>
              </div>
            )}

            {alertState.isConfirm ? (
              <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
                <button 
                  className="btn-secondary" 
                  onClick={closeAlert}
                  style={{ flex: 1, padding: '0.75rem', fontSize: '1rem', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button 
                  className="btn-primary" 
                  onClick={handleConfirm}
                  style={{ flex: 1, padding: '0.75rem', fontSize: '1rem', fontWeight: 600, backgroundColor: 'var(--color-primary)', border: 'none', color: '#fff' }}
                >
                  Confirm
                </button>
              </div>
            ) : (
              <button 
                className="btn-primary" 
                onClick={closeAlert}
                style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', fontWeight: 600, backgroundColor: styles.color, border: 'none' }}
              >
                OK
              </button>
            )}
          </div>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes scaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
          `}} />
        </div>
      )}
    </AlertContext.Provider>
  );
}
