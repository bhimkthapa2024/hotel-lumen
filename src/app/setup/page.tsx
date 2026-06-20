"use client";

import { useEffect, useState } from 'react';
import { useAlert } from '@/components/AlertContext';
import { Bank, ExpenseHead, PropertyDetails } from '@/lib/types';
import { Save, Building2, Tag, Pencil, X, Check, FileText, AlertTriangle, Download, UploadCloud } from 'lucide-react';
import { useUser } from '@/components/UserContext';

export default function SetupPage() {
  const { showAlert } = useAlert();
  const { isAdmin, logout } = useUser();
  const [activeTab, setActiveTab] = useState<'property' | 'banks' | 'expenses'>('property');
  const [loading, setLoading] = useState(true);
  const [isWiping, setIsWiping] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Data
  const [propertyDetails, setPropertyDetails] = useState<PropertyDetails | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [expenseHeads, setExpenseHeads] = useState<ExpenseHead[]>([]);

  // Forms
  const [propertyForm, setPropertyForm] = useState<Partial<PropertyDetails>>({
    companyName: '', address: '', vatPan: '', telephone: '', email: '', currency: 'NPR', fiscalYearStart: '', fiscalYearEnd: ''
  });
  
  const [bankForm, setBankForm] = useState({ name: '', accountNumber: '' });
  const [expenseForm, setExpenseForm] = useState({ name: '', description: '', subLedgersStr: '' });
  const [mappingForm, setMappingForm] = useState({ expenseHeadId: '', subLedgersStr: '' });

  // Edit States
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [editBankForm, setEditBankForm] = useState({ name: '', accountNumber: '' });
  
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editExpenseForm, setEditExpenseForm] = useState({ name: '', description: '' });

  // Saving states
  const [savingProperty, setSavingProperty] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [savingMapping, setSavingMapping] = useState(false);

  const fetchData = async () => {
    try {
      const [banksRes, expensesRes, propertyRes] = await Promise.all([
        fetch('/api/data/banks'),
        fetch('/api/data/expenseHeads'),
        fetch('/api/data/propertyDetails')
      ]);
      
      setBanks(await banksRes.json());
      setExpenseHeads(await expensesRes.json());
      
      const props = await propertyRes.json();
      if (props && props.length > 0) {
        setPropertyDetails(props[0]);
        setPropertyForm(props[0]);
      }
    } catch (error) {
      console.error("Error fetching setup data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProperty(true);
    try {
      const method = propertyDetails?.id ? 'PUT' : 'POST';
      const body = propertyDetails?.id ? { ...propertyForm, id: propertyDetails.id } : propertyForm;

      await fetch('/api/data/propertyDetails', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      showAlert("Property details saved successfully", "success");
      fetchData();
    } catch (error) {
      showAlert("Error saving property details", "error");
    } finally {
      setSavingProperty(false);
    }
  };

  // --- Banks Logic ---
  const handleAddBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBank(true);
    try {
      await fetch('/api/data/banks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bankForm)
      });
      setBankForm({ name: '', accountNumber: '' });
      showAlert("Bank added successfully", "success");
      fetchData();
    } catch (error) {
      showAlert("Error adding bank", "error");
    } finally {
      setSavingBank(false);
    }
  };

  const handleUpdateBank = async (id: string) => {
    try {
      await fetch('/api/data/banks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...editBankForm })
      });
      setEditingBankId(null);
      showAlert("Bank updated successfully", "success");
      fetchData();
    } catch (error) {
      showAlert("Error updating bank", "error");
    }
  };

  // --- Expense Heads Logic ---
  const handleAddExpenseHead = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingExpense(true);
    try {
      const subLedgers = expenseForm.subLedgersStr
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .map(name => ({ id: crypto.randomUUID(), name }));

      await fetch('/api/data/expenseHeads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: expenseForm.name,
          description: expenseForm.description,
          subLedgers
        })
      });
      setExpenseForm({ name: '', description: '', subLedgersStr: '' });
      showAlert("Expense Head added successfully", "success");
      fetchData();
    } catch (error) {
      showAlert("Error adding expense head", "error");
    } finally {
      setSavingExpense(false);
    }
  };

  const handleUpdateExpenseHead = async (id: string) => {
    try {
      await fetch('/api/data/expenseHeads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...editExpenseForm })
      });
      setEditingExpenseId(null);
      showAlert("Expense Head updated successfully", "success");
      fetchData();
    } catch (error) {
      showAlert("Error updating expense head", "error");
    }
  };

  const handleMapSubLedgers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mappingForm.expenseHeadId) return;
    
    setSavingMapping(true);
    try {
      const selectedHead = expenseHeads.find(eh => eh.id === mappingForm.expenseHeadId);
      if (!selectedHead) return;
      
      const newSubLedgers = mappingForm.subLedgersStr
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .map(name => ({ id: crypto.randomUUID(), name }));
        
      const combinedSubLedgers = [...(selectedHead.subLedgers || []), ...newSubLedgers];

      await fetch('/api/data/expenseHeads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedHead.id,
          subLedgers: combinedSubLedgers
        })
      });
      
      setMappingForm({ expenseHeadId: '', subLedgersStr: '' });
      showAlert("Sub ledgers mapped successfully", "success");
      fetchData();
    } catch (error) {
      showAlert("Error mapping sub ledgers", "error");
    } finally {
      setSavingMapping(false);
    }
  };

  const handleWipeData = async () => {
    if (!window.confirm("DANGER: Are you absolutely sure you want to wipe ALL data? This will factory reset the entire system. This action cannot be undone.")) {
      return;
    }
    
    setIsWiping(true);
    try {
      await fetch('/api/data/wipe', {
        method: 'POST'
      });
      showAlert("All data has been successfully wiped.", "success");
      logout(); // Force logout to clear state
      window.location.href = '/';
    } catch (error) {
      showAlert("Error wiping data", "error");
    } finally {
      setIsWiping(false);
    }
  };

  const handleExportBackup = () => {
    window.location.href = '/api/data/backup';
  };

  const handleImportBackup = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      
      if (!window.confirm(`Are you sure you want to restore from ${file.name}? This will overwrite all current data.`)) {
        return;
      }

      setIsRestoring(true);
      try {
        const fileContent = await file.text();
        const res = await fetch('/api/data/restore', {
          method: 'POST',
          body: fileContent
        });
        
        if (res.ok) {
          showAlert("Backup restored successfully. Reloading...", "success");
          setTimeout(() => window.location.reload(), 1500);
        } else {
          const err = await res.json();
          showAlert(err.error || "Failed to restore backup", "error");
        }
      } catch (error) {
        showAlert("Error restoring backup", "error");
      } finally {
        setIsRestoring(false);
      }
    };
    fileInput.click();
  };

  if (loading) {
    return <div className="container" style={{ padding: '2rem', textAlign: 'center' }}>Loading setup data...</div>;
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Setup & Configuration</h1>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--color-border)' }}>
        <button 
          onClick={() => setActiveTab('property')}
          style={{
            padding: '1rem 1.5rem', background: 'none', border: 'none', cursor: 'pointer',
            borderBottom: activeTab === 'property' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'property' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            fontWeight: activeTab === 'property' ? 600 : 500, display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}
        >
          <Building2 size={18} /> Property Details
        </button>
        <button 
          onClick={() => setActiveTab('banks')}
          style={{
            padding: '1rem 1.5rem', background: 'none', border: 'none', cursor: 'pointer',
            borderBottom: activeTab === 'banks' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'banks' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            fontWeight: activeTab === 'banks' ? 600 : 500, display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}
        >
          <FileText size={18} /> Banks
        </button>
        <button 
          onClick={() => setActiveTab('expenses')}
          style={{
            padding: '1rem 1.5rem', background: 'none', border: 'none', cursor: 'pointer',
            borderBottom: activeTab === 'expenses' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'expenses' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            fontWeight: activeTab === 'expenses' ? 600 : 500, display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}
        >
          <Tag size={18} /> Expense Heads
        </button>
      </div>

      {/* Property Details Tab */}
      {activeTab === 'property' && (
        <div className="glass-panel" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Company & Property Profile</h2>
          <form onSubmit={handleSaveProperty}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Company / Property Name</label>
                <input type="text" className="form-input" required 
                  value={propertyForm.companyName || ''} onChange={e => setPropertyForm({...propertyForm, companyName: e.target.value})}
                />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Address</label>
                <input type="text" className="form-input" required 
                  value={propertyForm.address || ''} onChange={e => setPropertyForm({...propertyForm, address: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">VAT / PAN Number</label>
                <input type="text" className="form-input" required 
                  value={propertyForm.vatPan || ''} onChange={e => setPropertyForm({...propertyForm, vatPan: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Base Currency</label>
                <input type="text" className="form-input" placeholder="e.g. NPR, USD"
                  value={propertyForm.currency || ''} onChange={e => setPropertyForm({...propertyForm, currency: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Telephone</label>
                <input type="text" className="form-input" 
                  value={propertyForm.telephone || ''} onChange={e => setPropertyForm({...propertyForm, telephone: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" className="form-input" 
                  value={propertyForm.email || ''} onChange={e => setPropertyForm({...propertyForm, email: e.target.value})}
                />
              </div>
            </div>
            <button type="submit" className="btn-primary" disabled={savingProperty}>
              <Save size={18} /> {savingProperty ? 'Saving...' : 'Save Property Details'}
            </button>
          </form>
        </div>
      )}

      {/* Banks Tab */}
      {activeTab === 'banks' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Add New Bank</h2>
            <form onSubmit={handleAddBank}>
              <div className="form-group">
                <label className="form-label">Bank Name</label>
                <input type="text" className="form-input" required 
                  value={bankForm.name} onChange={e => setBankForm({...bankForm, name: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Account Number</label>
                <input type="text" className="form-input" required 
                  value={bankForm.accountNumber} onChange={e => setBankForm({...bankForm, accountNumber: e.target.value})}
                />
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={savingBank}>
                <Save size={18} /> Add Bank
              </button>
            </form>
          </div>

          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Existing Banks</h2>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {banks.map(bank => (
                <li key={bank.id} style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-surface)' }}>
                  {editingBankId === bank.id ? (
                    <div>
                      <input type="text" className="form-input" style={{ marginBottom: '0.5rem' }} value={editBankForm.name} onChange={e => setEditBankForm({...editBankForm, name: e.target.value})} />
                      <input type="text" className="form-input" style={{ marginBottom: '0.5rem' }} value={editBankForm.accountNumber} onChange={e => setEditBankForm({...editBankForm, accountNumber: e.target.value})} />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn-primary" onClick={() => handleUpdateBank(bank.id!)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                          <Check size={14} /> Save
                        </button>
                        <button className="btn-secondary" onClick={() => setEditingBankId(null)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                          <X size={14} /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ fontWeight: 600 }}>{bank.name}</p>
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Acct: {bank.accountNumber}</p>
                      </div>
                      <button onClick={() => { setEditingBankId(bank.id!); setEditBankForm({ name: bank.name, accountNumber: bank.accountNumber }); }} style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                        <Pencil size={16} />
                      </button>
                    </div>
                  )}
                </li>
              ))}
              {banks.length === 0 && <p style={{ color: 'var(--color-text-secondary)' }}>No banks configured yet.</p>}
            </ul>
          </div>
        </div>
      )}

      {/* Expense Heads Tab */}
      {activeTab === 'expenses' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Add Expense Category</h2>
              <form onSubmit={handleAddExpenseHead}>
                <div className="form-group">
                  <label className="form-label">Category Name</label>
                  <input type="text" className="form-input" required 
                    value={expenseForm.name} onChange={e => setExpenseForm({...expenseForm, name: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input type="text" className="form-input" required 
                    value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Sub Ledgers (Optional)</label>
                  <input type="text" className="form-input" placeholder="e.g. Fuel, Maintenance (comma separated)"
                    value={expenseForm.subLedgersStr} onChange={e => setExpenseForm({...expenseForm, subLedgersStr: e.target.value})}
                  />
                </div>
                <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={savingExpense}>
                  <Save size={18} /> Add Category
                </button>
              </form>
            </div>

            <div className="glass-panel" style={{ padding: '2rem' }}>
              <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Map New Sub Ledgers</h2>
              <form onSubmit={handleMapSubLedgers}>
                <div className="form-group">
                  <label className="form-label">Select Category</label>
                  <select className="form-input" required value={mappingForm.expenseHeadId} onChange={e => setMappingForm({...mappingForm, expenseHeadId: e.target.value})}>
                    <option value="" disabled>Select...</option>
                    {expenseHeads.map(eh => <option key={eh.id} value={eh.id}>{eh.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">New Sub Ledgers</label>
                  <input type="text" className="form-input" required placeholder="Comma separated"
                    value={mappingForm.subLedgersStr} onChange={e => setMappingForm({...mappingForm, subLedgersStr: e.target.value})}
                  />
                </div>
                <button type="submit" className="btn-secondary" style={{ width: '100%' }} disabled={savingMapping}>
                  Add Sub Ledgers
                </button>
              </form>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Existing Categories</h2>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {expenseHeads.map(eh => (
                <li key={eh.id} style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-surface)' }}>
                  {editingExpenseId === eh.id ? (
                    <div>
                      <input type="text" className="form-input" style={{ marginBottom: '0.5rem' }} value={editExpenseForm.name} onChange={e => setEditExpenseForm({...editExpenseForm, name: e.target.value})} />
                      <input type="text" className="form-input" style={{ marginBottom: '0.5rem' }} value={editExpenseForm.description} onChange={e => setEditExpenseForm({...editExpenseForm, description: e.target.value})} />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn-primary" onClick={() => handleUpdateExpenseHead(eh.id!)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                          <Check size={14} /> Save
                        </button>
                        <button className="btn-secondary" onClick={() => setEditingExpenseId(null)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                          <X size={14} /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ fontWeight: 600 }}>{eh.name}</p>
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{eh.description}</p>
                        {eh.subLedgers && eh.subLedgers.length > 0 && (
                          <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
                            <strong>Sub Ledgers:</strong> {eh.subLedgers.map(s => s.name).join(', ')}
                          </div>
                        )}
                      </div>
                      <button onClick={() => { setEditingExpenseId(eh.id!); setEditExpenseForm({ name: eh.name, description: eh.description }); }} style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                        <Pencil size={16} />
                      </button>
                    </div>
                  )}
                </li>
              ))}
              {expenseHeads.length === 0 && <p style={{ color: 'var(--color-text-secondary)' }}>No expense heads configured.</p>}
            </ul>
          </div>

        </div>
      )}

      {/* BACKUP AND RESTORE (Admin Only) */}
      {isAdmin && (
        <div style={{ marginTop: '3rem', padding: '2rem', border: '1px solid #c7d2fe', borderRadius: 'var(--radius-lg)', backgroundColor: '#eef2ff' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem' }}>
            <div style={{ backgroundColor: '#e0e7ff', padding: '1rem', borderRadius: '50%' }}>
              <Save size={24} color="#4f46e5" />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ color: '#3730a3', fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Data Backup & Restore</h3>
              <p style={{ color: '#4338ca', marginBottom: '1.5rem', fontSize: '0.875rem', lineHeight: '1.5' }}>
                Download a complete copy of your database to keep it safe. You can restore your data from this backup file at any time.
              </p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  onClick={handleExportBackup}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    backgroundColor: '#4f46e5', color: 'white', border: 'none', padding: '0.75rem 1.5rem', 
                    borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                >
                  <Download size={16} /> Export Backup File
                </button>
                <button 
                  onClick={handleImportBackup}
                  disabled={isRestoring}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    backgroundColor: 'white', color: '#4f46e5', border: '1px solid #4f46e5', padding: '0.75rem 1.5rem', 
                    borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: isRestoring ? 'not-allowed' : 'pointer',
                    opacity: isRestoring ? 0.7 : 1, transition: 'background-color 0.2s'
                  }}
                >
                  <UploadCloud size={16} /> {isRestoring ? 'Restoring...' : 'Restore from Backup'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DANGER ZONE (Admin Only) */}
      {isAdmin && (
        <div style={{ marginTop: '4rem', padding: '2rem', border: '1px solid #fecaca', borderRadius: 'var(--radius-lg)', backgroundColor: '#fef2f2' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem' }}>
            <div style={{ backgroundColor: '#fee2e2', padding: '1rem', borderRadius: '50%' }}>
              <AlertTriangle size={24} color="#ef4444" />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ color: '#b91c1c', fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Danger Zone</h3>
              <p style={{ color: '#991b1b', marginBottom: '1.5rem', fontSize: '0.875rem', lineHeight: '1.5' }}>
                Wiping data will permanently delete all property details, banks, expense heads, suppliers, purchases, and payments from the system. This action is irreversible. You will be logged out automatically after the wipe is complete.
              </p>
              <button 
                onClick={handleWipeData}
                disabled={isWiping}
                style={{ 
                  backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '0.75rem 1.5rem', 
                  borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: isWiping ? 'not-allowed' : 'pointer',
                  opacity: isWiping ? 0.7 : 1, transition: 'background-color 0.2s'
                }}
              >
                {isWiping ? 'Wiping Data...' : 'Wipe All Data'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
