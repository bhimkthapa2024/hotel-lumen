"use client";

import React, { useState, useEffect } from 'react';
import { useUser } from '@/components/UserContext';
import { useAlert } from '@/components/AlertContext';
import { Trash2, UserPlus, Shield, User as UserIcon } from 'lucide-react';

export default function UsersPage() {
  const { isAdmin, user: currentUser } = useUser();
  const { showAlert } = useAlert();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'admin'|'user'>('user');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      const token = await currentUser?.getIdToken();
      const res = await fetch('/api/auth/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin && currentUser) {
      fetchUsers();
    }
  }, [isAdmin, currentUser]);

  if (!isAdmin) {
    return <div className="container" style={{ padding: '2rem' }}><h1>Access Denied</h1><p>You need administrator privileges to view this page.</p></div>;
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = await currentUser?.getIdToken();
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ email, password, displayName, role })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      showAlert("User created successfully", "success");
      setEmail('');
      setPassword('');
      setDisplayName('');
      setRole('user');
      fetchUsers();
    } catch (e: any) {
      showAlert(e.message || "Failed to create user", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (uid: string) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      const token = await currentUser?.getIdToken();
      const res = await fetch('/api/auth/users', {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ uid })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      showAlert("User deleted", "success");
      fetchUsers();
    } catch (e: any) {
      showAlert(e.message || "Failed to delete user", "error");
    }
  };

  return (
    <div className="container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">User Management</h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', margin: '0.5rem 0 0 0' }}>Manage system access and roles</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', alignItems: 'start' }}>
        <div className="data-table-container glass-panel">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>Loading...</td></tr>
              ) : users.map(u => (
                <tr key={u.id}>
                  <td><strong>{u.displayName}</strong></td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`status-pill ${u.role === 'admin' ? 'info' : 'success'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      {u.role === 'admin' ? <Shield size={12} /> : <UserIcon size={12} />}
                      {u.role}
                    </span>
                  </td>
                  <td>
                    {u.id !== currentUser?.uid && (
                      <button onClick={() => handleDelete(u.id)} className="btn-secondary" style={{ padding: '0.5rem', color: '#ef4444' }}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && users.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserPlus size={20} className="text-primary" />
            Add New User
          </h3>
          <form onSubmit={handleCreateUser}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Display Name</label>
              <input type="text" className="form-input" value={displayName} onChange={e => setDisplayName(e.target.value)} required placeholder="John Doe" />
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Email</label>
              <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} required placeholder="john@example.com" />
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Password</label>
              <input type="password" className="form-input" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="••••••••" />
            </div>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Role</label>
              <select className="form-input" value={role} onChange={e => setRole(e.target.value as any)}>
                <option value="user">Standard User</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create User'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
