"use client";

import Link from 'next/link';
import { Home, Users, ShoppingCart, CreditCard, Settings, BarChart3, UserCog } from 'lucide-react';
import { useUser } from './UserContext';
import './Navigation.css';

export default function Navigation() {
  const { role, logout, isAdmin, user } = useUser();
  return (
    <nav className="sidebar glass-panel">
      <div className="sidebar-header">
        <div className="logo-mark">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div className="logo-text">
          <h2>LUMEN</h2>
          <p>Accounting</p>
        </div>
      </div>
      <ul className="sidebar-nav">
        <li>
          <Link href="/" className="nav-link">
            <Home size={20} /> Dashboard
          </Link>
        </li>
        <li>
          <Link href="/suppliers" className="nav-link">
            <Users size={20} /> Suppliers
          </Link>
        </li>
        <li>
          <Link href="/purchases" className="nav-link">
            <ShoppingCart size={20} /> Purchases
          </Link>
        </li>
        <li>
          <Link href="/payments" className="nav-link">
            <CreditCard size={20} /> Payments
          </Link>
        </li>
        <li>
          <div className="nav-link" style={{ cursor: 'default', paddingBottom: '0.5rem', color: 'var(--color-text-primary)', fontWeight: 800 }}>
            <BarChart3 size={20} /> Reports
          </div>
          <ul style={{ listStyle: 'none', marginLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <li>
              <Link href="/reports?view=ledger" className="nav-link" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                Supplier Ledger
              </Link>
            </li>
            <li>
              <Link href="/reports?view=purchases" className="nav-link" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                Purchase Register
              </Link>
            </li>
            <li>
              <Link href="/reports?view=pjv" className="nav-link" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                PJV Register
              </Link>
            </li>
            <li>
              <Link href="/reports?view=payments" className="nav-link" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                Payment Register
              </Link>
            </li>
            <li>
              <Link href="/reports?view=tds" className="nav-link" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                TDS Report
              </Link>
            </li>
            <li>
              <Link href="/reports?view=ageing" className="nav-link" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                Ageing Report
              </Link>
            </li>
            <li>
              <Link href="/reports?view=expenses" className="nav-link" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                Expense Heads
              </Link>
            </li>
          </ul>
        </li>
        {isAdmin && (
          <li>
            <Link href="/users" className="nav-link">
              <UserCog size={20} /> Users
            </Link>
          </li>
        )}
        <li>
          <Link href="/setup" className="nav-link">
            <Settings size={20} /> Setup
          </Link>
        </li>
      </ul>
      
      <div style={{ marginTop: 'auto', paddingTop: '2rem', borderTop: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: isAdmin ? 'rgba(99, 102, 241, 0.1)' : 'var(--color-bg-base)' }}>
            <UserCog size={18} color={isAdmin ? 'var(--color-primary)' : 'var(--color-text-secondary)'} />
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', fontWeight: 700 }}>
                {isAdmin ? 'Administrator' : 'Standard User'}
              </p>
              <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.displayName || user?.email || 'Loading...'}
              </p>
            </div>
          </div>
          
          <button 
            onClick={logout}
            className="btn-secondary" 
            style={{ width: '100%', justifyContent: 'center', border: '1px solid var(--color-border-hover)' }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
}
