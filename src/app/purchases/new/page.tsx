"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft, X } from 'lucide-react';
import Link from 'next/link';
import { useAlert } from '@/components/AlertContext';
import { Supplier, ExpenseHead, Purchase } from '@/lib/types';
import SearchableSelect from '@/components/SearchableSelect';
import { useApi } from '@/lib/useApi';

export default function NewPurchasePage() {
  const router = useRouter();
  const { showAlert, showConfirm } = useAlert();
  const { apiFetch } = useApi();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [expenseHeads, setExpenseHeads] = useState<ExpenseHead[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ companyName: '', vatNumber: '', telephone: '', address: '', isVatRegistered: false });
  const [savingSupplier, setSavingSupplier] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    invoiceNumber: '',
    voucherType: 'PURCHASE VOUCHER',
    supplierId: '',
    expenseHeadId: '',
    subLedger: '',
    exemptedValue: '',
    purchaseValue: '',
    isTdsApplicable: false,
    description: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [supRes, expRes, purRes] = await Promise.all([
        apiFetch('/api/data/suppliers'),
        apiFetch('/api/data/expenseHeads'),
        apiFetch('/api/data/purchases')
      ]);
      setSuppliers(await supRes.json());
      setExpenseHeads(await expRes.json());
      setPurchases(await purRes.json());
    } catch (err) {
      console.error("Error loading dependencies", err);
    }
  }

  // Calculate total automatically
  const exempted = Number(formData.exemptedValue) || 0;
  const purchase = Number(formData.purchaseValue) || 0;
  const vatAmount = purchase * 0.13;
  
  const selectedSupplier = suppliers.find(s => s.id === formData.supplierId);
  const isSupplierVatRegistered = selectedSupplier?.isVatRegistered || false;
  
  let tdsAmount = 0;
  if (formData.isTdsApplicable && isSupplierVatRegistered) {
    tdsAmount = purchase * 0.015;
  }
  
  const totalAmount = exempted + purchase + vatAmount; // TDS does not reduce the bill's gross total


  const handleQuickAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSupplier(true);
    try {
      const res = await apiFetch('/api/data/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supplierForm)
      });
      const newSupplier = await res.json();
      await fetchData(); 
      setFormData(prev => ({ ...prev, supplierId: newSupplier.id }));
      setShowSupplierModal(false);
      setSupplierForm({ companyName: '', vatNumber: '', telephone: '', address: '', isVatRegistered: false });
    } catch (err) {
      console.error("Error saving supplier", err);
      showAlert("Failed to add supplier.", "error");
    } finally {
      setSavingSupplier(false);
    }
  };

  const handleClear = () => {
    setFormData(prev => ({
      ...prev,
      exemptedValue: '',
      purchaseValue: '',
      isTdsApplicable: false
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplierId || !formData.expenseHeadId) return showAlert("Please select Vendor Name and Account Name", "warning");
    if (totalAmount <= 0) return showAlert("Please enter at least one value greater than 0.", "warning");

    const isDuplicate = purchases.some(p => 
      p.supplierId === formData.supplierId && 
      p.invoiceNumber.trim().toLowerCase() === formData.invoiceNumber.trim().toLowerCase()
    );
    
    if (isDuplicate) {
      return showAlert("WARNING: A bill with this Invoice Number already exists for this vendor!\nPlease check for duplication before proceeding.", "warning");
    }

    const confirmed = await showConfirm("Are you sure you want to save this purchase?\nPlease verify the amounts before confirming.", "confirm");
    if (!confirmed) return;

    setLoading(true);
    
    try {
      const response = await apiFetch('/api/data/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          exemptedValue: exempted,
          purchaseValue: purchase,
          vatAmount,
          tdsAmount,
          totalAmount
        })
      });
      const data = await response.json();
      
      if (data.pjvNumber) {
        showAlert("Purchase saved successfully!", "success", data.pjvNumber);
        router.push(`/purchases/${data.id}`);
      } else {
        router.push('/reports?view=purchases');
      }
    } catch (error) {
      console.error("Error adding document: ", error);
      showAlert("Failed to save purchase.", "error");
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'expenseHeadId') {
      setFormData(prev => ({ ...prev, expenseHeadId: value, subLedger: '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    if (name === 'expenseHeadId') {
      setFormData(prev => ({ ...prev, expenseHeadId: value, subLedger: '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const selectedExpenseHead = expenseHeads.find(eh => eh.id === formData.expenseHeadId);
  const availableSubLedgers = selectedExpenseHead?.subLedgers || [];

  return (
    <div className="container" style={{ maxWidth: '1000px' }}>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Link href="/purchases">
          <ArrowLeft size={28} />
        </Link>
        <h1 className="page-title" style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>Purchase Entry Form</h1>
      </div>

      <div className="glass-panel" style={{ padding: '3rem', borderRadius: 'var(--radius-lg)', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)' }}>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '2rem', fontWeight: 500 }}>
          All fields marked with an asterisk (<span style={{ color: '#ef4444' }}>*</span>) are mandatory.
        </p>
        
        <form onSubmit={handleSubmit}>
          
          {/* Top Section */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1.5fr', gap: '2rem', marginBottom: '2rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="date">Bill Date<span style={{ color: '#ef4444' }}>*</span></label>
              <input 
                type="date" id="date" name="date" className="form-input" required
                value={formData.date} onChange={handleChange} 
                style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderColor: 'rgba(0,0,0,0.1)' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="invoiceNumber">Bill Number<span style={{ color: '#ef4444' }}>*</span></label>
              <input 
                type="text" id="invoiceNumber" name="invoiceNumber" className="form-input" required placeholder="Enter bill number"
                value={formData.invoiceNumber} onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="voucherType">Voucher Type<span style={{ color: '#ef4444' }}>*</span></label>
              <select 
                id="voucherType" name="voucherType" className="form-input" required
                value={formData.voucherType} onChange={handleChange}
                style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
              >
                <option value="PURCHASE VOUCHER">PURCHASE VOUCHER</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '3rem' }}>
            <label className="form-label" htmlFor="supplierId" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Vendor Name<span style={{ color: '#ef4444' }}>*</span></span>
              <button type="button" onClick={() => setShowSupplierModal(true)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
                + Quick Add Vendor
              </button>
            </label>
            <SearchableSelect 
              options={suppliers.map(sup => ({ value: sup.id, label: sup.companyName }))}
              value={formData.supplierId}
              onChange={(val: string) => handleSelectChange('supplierId', val)}
              placeholder="Select Vendor"
              required
            />
          </div>

          {/* Values Section - Luxurious Redesign */}
          <div style={{ 
            border: '1px solid rgba(0,0,0,0.08)', 
            borderRadius: 'var(--radius-lg)', 
            marginBottom: '3rem',
            backgroundColor: '#fafafa',
            boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.02)'
          }}>
            <div style={{ 
              padding: '1.5rem 2rem', 
              borderBottom: '1px solid rgba(0,0,0,0.08)',
              display: 'flex',
              alignItems: 'center'
            }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>Financial Values</h3>
            </div>
            
            <div style={{ padding: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem', marginBottom: '2.5rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="expenseHeadId">Account Name<span style={{ color: '#ef4444' }}>*</span></label>
                  <SearchableSelect 
                    options={expenseHeads.map(eh => ({ value: eh.id, label: eh.name }))}
                    value={formData.expenseHeadId}
                    onChange={(val: string) => handleSelectChange('expenseHeadId', val)}
                    placeholder="Select Chart Of Accounts"
                    required
                  />
                </div>
                
                {availableSubLedgers.length > 0 && (
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="subLedger">Sub Ledger<span style={{ color: '#ef4444' }}>*</span></label>
                    <SearchableSelect 
                      options={availableSubLedgers.map(sl => ({ value: sl.name, label: sl.name }))}
                      value={formData.subLedger}
                      onChange={(val: string) => handleSelectChange('subLedger', val)}
                      placeholder="Select Sub Ledger"
                      required
                    />
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem', marginBottom: '2.5rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="exemptedValue">Exempted Value</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>NPR</span>
                    <input 
                      type="number" id="exemptedValue" name="exemptedValue" className="form-input" min="0" step="0.01" placeholder="0.00"
                      value={formData.exemptedValue} onChange={handleChange} style={{ paddingLeft: '3.5rem' }}
                    />
                  </div>
                </div>
                
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="purchaseValue">Purchase Value (Taxable)</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>NPR</span>
                    <input 
                      type="number" id="purchaseValue" name="purchaseValue" className="form-input" min="0" step="0.01" placeholder="0.00"
                      value={formData.purchaseValue} onChange={handleChange} style={{ paddingLeft: '3.5rem' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input 
                  type="checkbox" 
                  id="isTdsApplicable" 
                  name="isTdsApplicable" 
                  checked={formData.isTdsApplicable} 
                  onChange={e => setFormData(prev => ({ ...prev, isTdsApplicable: e.target.checked }))}
                  style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer' }}
                />
                <label htmlFor="isTdsApplicable" style={{ fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}>
                  Apply TDS (Auto-calculated if Supplier is VAT Registered)
                </label>
              </div>

              {/* Dynamic Calculations */}
              <div style={{ 
                marginTop: '1rem',
                paddingTop: '2rem', 
                borderTop: '1px solid rgba(0,0,0,0.08)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
                  <span>VAT (13% on Purchase Value)</span>
                  <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>NPR {vatAmount.toFixed(2)}</span>
                </div>
                
                {tdsAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
                    <span>TDS Deducted (1.5% on Taxable Value)</span>
                    <span style={{ fontWeight: 500, color: '#ef4444' }}>- NPR {tdsAmount.toFixed(2)}</span>
                  </div>
                )}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    Bill Total Amount
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    NPR {totalAmount.toFixed(2)}
                  </div>
                </div>

                {tdsAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px dashed rgba(0,0,0,0.1)' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      Net Payable
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                      NPR {(totalAmount - tdsAmount).toFixed(2)}
                    </div>
                  </div>
                )}
                {tdsAmount === 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      Net Payable
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                      NPR {totalAmount.toFixed(2)}
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Bottom Section */}
          <div className="form-group" style={{ marginBottom: '2.5rem' }}>
            <label className="form-label" htmlFor="description">Narration<span style={{ color: '#ef4444' }}>*</span></label>
            <textarea 
              id="description" name="description" className="form-input" required rows={3} placeholder="Enter bill narration or description"
              value={formData.description} onChange={handleChange} style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button type="button" onClick={handleClear} className="btn-secondary">
              Clear Form
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Purchase'}
            </button>
          </div>
        </form>
      </div>

      {showSupplierModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ padding: '2.5rem', width: '100%', maxWidth: '500px', position: 'relative', borderRadius: 'var(--radius-lg)' }}>
            <button onClick={() => setShowSupplierModal(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
              <X size={24} />
            </button>
            <h2 style={{ marginBottom: '2rem', fontSize: '1.5rem', fontWeight: 700 }}>Quick Add Vendor</h2>
            <form onSubmit={handleQuickAddSupplier}>
              <div className="form-group">
                <label className="form-label">Vendor Name<span style={{ color: '#ef4444' }}>*</span></label>
                <input type="text" className="form-input" required value={supplierForm.companyName} onChange={e => setSupplierForm({...supplierForm, companyName: e.target.value})} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label">VAT/PAN<span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="text" className="form-input" required value={supplierForm.vatNumber} onChange={e => setSupplierForm({...supplierForm, vatNumber: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Telephone<span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="text" className="form-input" required value={supplierForm.telephone} onChange={e => setSupplierForm({...supplierForm, telephone: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                  <label className="form-label" htmlFor="newAddress">Address</label>
                  <textarea 
                    id="newAddress" className="form-input" rows={2} required
                    value={supplierForm.address} onChange={e => setSupplierForm({...supplierForm, address: e.target.value})}
                  />
                </div>
                
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input 
                    type="checkbox" 
                    id="newIsVatRegistered" 
                    checked={supplierForm.isVatRegistered} 
                    onChange={e => setSupplierForm({...supplierForm, isVatRegistered: e.target.checked})}
                    style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer' }}
                  />
                  <label htmlFor="newIsVatRegistered" style={{ fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}>
                    Supplier is VAT Registered
                  </label>
                </div>
                
              <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '1.5rem' }} disabled={savingSupplier}>
                {savingSupplier ? 'Saving...' : 'Add Vendor'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
