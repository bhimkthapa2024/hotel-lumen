"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useAlert } from '@/components/AlertContext';
import { Supplier, Bank } from '@/lib/types';
import SearchableSelect from '@/components/SearchableSelect';

export default function NewPaymentPage() {
  const router = useRouter();
  const { showAlert, showConfirm } = useAlert();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [formData, setFormData] = useState({
    supplierId: '',
    bankId: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'Bank Transfer',
    referenceNumber: '',
    amount: '',
    remarks: ''
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [supRes, bankRes] = await Promise.all([
          fetch('/api/data/suppliers'),
          fetch('/api/data/banks')
        ]);
        setSuppliers(await supRes.json());
        setBanks(await bankRes.json());
      } catch(err) {
        console.error(err);
      }
    }
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplierId) return showAlert("Please select a supplier", "warning");
    if (formData.paymentMethod !== 'Cash' && !formData.bankId) return showAlert("Please select a bank", "warning");
    
    const confirmed = await showConfirm("Are you sure you want to save this payment?\nPlease verify the amount before confirming.", "confirm");
    if (!confirmed) return;

    setLoading(true);
    
    try {
      const response = await fetch('/api/data/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: Number(formData.amount)
        })
      });
      const data = await response.json();
      
      if (data.paymentNumber) {
        showAlert("Payment saved successfully!", "success", data.paymentNumber);
      } else {
        showAlert("Payment saved successfully!", "success");
      }
      router.push('/payments');
    } catch (error) {
      console.error("Error adding document: ", error);
      showAlert("Failed to save payment.", "error");
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="container" style={{ maxWidth: '800px' }}>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link href="/payments">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="page-title">Record Payment</h1>
      </div>

      <div className="glass-panel" style={{ padding: '2.5rem' }}>
        <form onSubmit={handleSubmit}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="supplierId">Supplier</label>
              <SearchableSelect 
                options={suppliers.map(sup => ({ value: sup.id, label: sup.companyName }))}
                value={formData.supplierId}
                onChange={(val: string) => handleSelectChange('supplierId', val)}
                placeholder="Select a supplier"
                required
              />
            </div>

            {formData.paymentMethod !== 'Cash' && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="bankId">From Bank Account</label>
                <SearchableSelect 
                  options={banks.map(bank => ({ value: bank.id, label: bank.name }))}
                  value={formData.bankId}
                  onChange={(val: string) => handleSelectChange('bankId', val)}
                  placeholder="Select a bank"
                  required
                />
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="date">Date</label>
              <input 
                type="date" id="date" name="date" className="form-input" required
                value={formData.date} onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="paymentMethod">Payment Method</label>
              <SearchableSelect 
                options={[
                  { value: 'Bank Transfer', label: 'Bank Transfer' },
                  { value: 'Check', label: 'Check' },
                  { value: 'Cash', label: 'Cash' },
                  { value: 'Credit Card', label: 'Credit Card' }
                ]}
                value={formData.paymentMethod}
                onChange={(val: string) => handleSelectChange('paymentMethod', val)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="referenceNumber">
                {formData.paymentMethod === 'Cash' ? 'Receipt / Voucher Number (Optional)' : 'Reference / Check Number'}
              </label>
              <input 
                type="text" id="referenceNumber" name="referenceNumber" className="form-input" placeholder={formData.paymentMethod === 'Cash' ? "CASH-RCPT-123" : "REF-12345"} 
                required={formData.paymentMethod !== 'Cash'}
                value={formData.referenceNumber} onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="amount">Amount (NPR)</label>
              <input 
                type="number" id="amount" name="amount" className="form-input" placeholder="0.00" step="0.01" required
                value={formData.amount} onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '1.5rem' }}>
            <label className="form-label" htmlFor="remarks">Remarks (Optional)</label>
            <textarea 
              id="remarks" name="remarks" className="form-input" rows={2} placeholder="Any specific details regarding this payment..."
              value={formData.remarks} onChange={handleChange} style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
            <button type="submit" className="btn-primary" disabled={loading}>
              <Save size={20} /> {loading ? 'Saving...' : 'Save Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
