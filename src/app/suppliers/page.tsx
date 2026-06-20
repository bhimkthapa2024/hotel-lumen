"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAlert } from '@/components/AlertContext';
import { Supplier } from '@/lib/types';
import { Plus, Edit2, Save, X } from 'lucide-react';

export default function SuppliersPage() {
  const { showAlert } = useAlert();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Supplier>>({});

  const fetchSuppliers = async () => {
    try {
      const res = await fetch('/api/data/suppliers');
      setSuppliers(await res.json());
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleEditClick = (supplier: Supplier) => {
    setEditingId(supplier.id || null);
    setEditForm({ ...supplier });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSaveEdit = async () => {
    if (!editForm.id) return;
    try {
      await fetch('/api/data/suppliers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      setEditingId(null);
      fetchSuppliers();
    } catch (error) {
      showAlert("Error saving supplier", "error");
    }
  };

  return (
    <div className="container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">Suppliers</h1>
        <Link href="/suppliers/new" className="btn-primary">
          <Plus size={20} /> Add Supplier
        </Link>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        {loading ? (
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading suppliers...</p>
        ) : suppliers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>No suppliers found.</p>
            <Link href="/suppliers/new" className="btn-secondary">
              Create your first supplier
            </Link>
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Company Name</th>
                  <th>VAT/PAN Number</th>
                  <th>Telephone</th>
                  <th>Address</th>
                  <th>VAT Reg.</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map(supplier => (
                  <tr key={supplier.id}>
                    {editingId === supplier.id ? (
                      <>
                        <td>
                          <input type="text" className="form-input" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }} value={editForm.companyName || ''} onChange={e => setEditForm({...editForm, companyName: e.target.value})} />
                        </td>
                        <td>
                          <input type="text" className="form-input" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }} value={editForm.vatNumber || ''} onChange={e => setEditForm({...editForm, vatNumber: e.target.value})} />
                        </td>
                        <td>
                          <input type="text" className="form-input" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }} value={editForm.telephone || ''} onChange={e => setEditForm({...editForm, telephone: e.target.value})} />
                        </td>
                        <td>
                          <input type="text" className="form-input" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }} value={editForm.address || ''} onChange={e => setEditForm({...editForm, address: e.target.value})} />
                        </td>
                        <td>
                          <input 
                            type="checkbox" 
                            checked={!!editForm.isVatRegistered} 
                            onChange={e => setEditForm({...editForm, isVatRegistered: e.target.checked})}
                            style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button onClick={handleSaveEdit} className="btn-primary" style={{ padding: '0.3rem', borderRadius: '4px' }} title="Save">
                              <Save size={16} />
                            </button>
                            <button onClick={handleCancelEdit} className="btn-secondary" style={{ padding: '0.4rem', borderRadius: '4px' }} title="Cancel">
                              <X size={16} />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td><strong>{supplier.companyName}</strong></td>
                        <td>{supplier.vatNumber}</td>
                        <td>{supplier.telephone}</td>
                        <td>{supplier.address}</td>
                        <td>
                          {supplier.isVatRegistered ? (
                            <span className="status-pill success">Yes</span>
                          ) : (
                            <span className="status-pill info" style={{ backgroundColor: '#f1f5f9', color: 'var(--color-text-secondary)' }}>No</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button onClick={() => handleEditClick(supplier)} className="btn-secondary" style={{ padding: '0.3rem', borderRadius: '4px' }} title="Edit">
                            <Edit2 size={16} />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
