"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useAlert } from '@/components/AlertContext';
import { useApi } from '@/lib/useApi';

export default function NewSupplierPage() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const { apiFetch } = useApi();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    vatNumber: '',
    address: '',
    telephone: '',
    isVatRegistered: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await apiFetch('/api/data/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      router.push('/suppliers');
    } catch (error) {
      console.error("Error adding document: ", error);
      showAlert("Failed to save supplier.", "error");
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="container" style={{ maxWidth: '800px' }}>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link href="/suppliers">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="page-title">Add New Supplier</h1>
      </div>

      <div className="glass-panel" style={{ padding: '2.5rem' }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="companyName">Company Name</label>
            <input 
              type="text" id="companyName" name="companyName" className="form-input" placeholder="e.g. Acme Corp" required
              value={formData.companyName} onChange={handleChange}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="vatNumber">VAT / PAN Number</label>
              <input 
                type="text" id="vatNumber" name="vatNumber" className="form-input" placeholder="Tax Identification" required
                value={formData.vatNumber} onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="telephone">Telephone</label>
              <input 
                type="tel" id="telephone" name="telephone" className="form-input" placeholder="+1 234 567 8900" required
                value={formData.telephone} onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="address">Address</label>
            <textarea 
              id="address" name="address" className="form-input" placeholder="Full physical address" rows={3} required
              value={formData.address} onChange={handleChange} style={{ resize: 'vertical' }}
            />
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input 
              type="checkbox" 
              id="isVatRegistered" 
              name="isVatRegistered" 
              checked={formData.isVatRegistered} 
              onChange={e => setFormData(prev => ({ ...prev, isVatRegistered: e.target.checked }))}
              style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer' }}
            />
            <label htmlFor="isVatRegistered" style={{ fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}>
              Supplier is VAT Registered
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
            <button type="submit" className="btn-primary" disabled={loading}>
              <Save size={20} /> {loading ? 'Saving...' : 'Save Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
