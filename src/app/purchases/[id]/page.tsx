"use client";

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Purchase, Supplier, ExpenseHead } from '@/lib/types';
import { ArrowLeft, Printer } from 'lucide-react';

export default function PurchaseView({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const id = unwrappedParams.id;
  
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [expenseHead, setExpenseHead] = useState<ExpenseHead | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [purRes, supRes, expRes] = await Promise.all([
          fetch('/api/data/purchases'),
          fetch('/api/data/suppliers'),
          fetch('/api/data/expenseHeads')
        ]);
        
        const purchases: Purchase[] = await purRes.json();
        const suppliers: Supplier[] = await supRes.json();
        const expenseHeads: ExpenseHead[] = await expRes.json();
        
        const foundPurchase = purchases.find(p => p.id === id);
        if (foundPurchase) {
          setPurchase(foundPurchase);
          setSupplier(suppliers.find(s => s.id === foundPurchase.supplierId) || null);
          setExpenseHead(expenseHeads.find(e => e.id === foundPurchase.expenseHeadId) || null);
        }
      } catch (err) {
        console.error("Failed to load purchase details", err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [id]);

  if (loading) {
    return <div className="container" style={{ padding: '4rem', textAlign: 'center' }}>Loading invoice details...</div>;
  }

  if (!purchase) {
    return (
      <div className="container">
        <div style={{ padding: '4rem', textAlign: 'center', backgroundColor: 'var(--color-bg-surface)', borderRadius: 'var(--radius-lg)' }}>
          <h2>Purchase Not Found</h2>
          <button className="btn-primary" style={{ marginTop: '2rem' }} onClick={() => router.push('/reports?view=purchases')}>
            Back to Reports
          </button>
        </div>
      </div>
    );
  }

  const formatCurrency = (val: number | undefined) => `NPR ${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="container" id="voucher-container" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #voucher-container, #voucher-container * {
            visibility: visible;
          }
          #voucher-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 1rem !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
          .print-hide {
            display: none !important;
          }
          .glass-panel {
            box-shadow: none !important;
            border: none !important;
            padding: 2.5rem !important;
            border-radius: 0 !important;
          }
        }
        @media print and (max-width: 160mm) {
          html {
            font-size: 11px !important;
          }
          .glass-panel {
            padding: 1.5rem !important;
          }
        }
      `}} />
      
      {/* Header Actions */}
      <div className="print-hide" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <button className="btn-secondary" onClick={() => router.back()} style={{ border: 'none', background: 'none', boxShadow: 'none', padding: '0.5rem', color: 'var(--color-text-secondary)' }}>
          <ArrowLeft size={20} /> <span style={{ fontWeight: 600 }}>Back</span>
        </button>
        <button className="btn-secondary" onClick={() => window.print()}>
          <Printer size={18} /> Print Invoice
        </button>
      </div>

      {/* Invoice Document */}
      <div className="glass-panel" style={{ padding: '4rem', backgroundColor: '#fff' }}>
        
        {/* Invoice Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--color-border)', paddingBottom: '2rem', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', color: 'var(--color-text-primary)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>INVOICE</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontWeight: 500, fontSize: '1.1rem' }}># {purchase.invoiceNumber}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            {purchase.pjvNumber && (
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>PJV Number</p>
                <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>{purchase.pjvNumber}</p>
              </div>
            )}
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Invoice Date</p>
            <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{purchase.date}</p>
          </div>
        </div>

        {/* Parties Information */}
        <div style={{ marginBottom: '3rem' }}>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Billed From (Vendor)</p>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>{supplier?.companyName || 'Unknown Vendor'}</h3>
            {supplier?.address && <p style={{ color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>{supplier.address}</p>}
            {supplier?.vatNumber && <p style={{ color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>VAT/PAN: {supplier.vatNumber}</p>}
            {supplier?.telephone && <p style={{ color: 'var(--color-text-secondary)' }}>Tel: {supplier.telephone}</p>}
          </div>
        </div>

        {/* Line Items Table */}
        <div style={{ marginBottom: '3rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)' }}>
                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--color-text-secondary)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Item Description</th>
                <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--color-text-secondary)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Qty</th>
                <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--color-text-secondary)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rate</th>
                <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--color-text-secondary)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
                <tr style={{ borderBottom: '1px solid var(--color-border-hover)' }}>
                  <td style={{ padding: '1.25rem 1rem', color: 'var(--color-text-primary)' }}>
                    <div style={{ fontWeight: 500, marginBottom: '0.5rem' }}>{purchase.description || 'Goods / Services'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <span>Expense Head: <strong style={{ color: 'var(--color-text-primary)' }}>{expenseHead?.name || 'N/A'}</strong></span>
                      {purchase.subLedger && <span>Sub-Ledger: <strong style={{ color: 'var(--color-text-primary)' }}>{purchase.subLedger}</strong></span>}
                      {purchase.voucherType && <span>Voucher: <strong style={{ color: 'var(--color-text-primary)' }}>{purchase.voucherType}</strong></span>}
                    </div>
                  </td>
                  <td style={{ padding: '1.25rem 1rem', textAlign: 'right', color: 'var(--color-text-secondary)' }}>-</td>
                  <td style={{ padding: '1.25rem 1rem', textAlign: 'right', color: 'var(--color-text-secondary)' }}>-</td>
                  <td style={{ padding: '1.25rem 1rem', textAlign: 'right', color: 'var(--color-text-primary)', fontWeight: 600 }}>{formatCurrency((purchase.purchaseValue || 0) + (purchase.exemptedValue || 0))}</td>
                </tr>
            </tbody>
          </table>
        </div>

        {/* Financial Summary */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '350px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', color: 'var(--color-text-secondary)' }}>
              <span>Taxable Value</span>
              <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{formatCurrency(purchase.purchaseValue)}</span>
            </div>
            {purchase.exemptedValue ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', color: 'var(--color-text-secondary)' }}>
                <span>Exempted Value</span>
                <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{formatCurrency(purchase.exemptedValue)}</span>
              </div>
            ) : null}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', color: 'var(--color-text-secondary)' }}>
              <span>VAT (13%)</span>
              <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{formatCurrency(purchase.vatAmount)}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderTop: '2px solid var(--color-border)', borderBottom: '2px solid var(--color-border)', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Gross Total</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{formatCurrency(purchase.totalAmount)}</span>
            </div>

            {purchase.isTdsApplicable && purchase.tdsAmount && purchase.tdsAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', color: 'var(--color-text-secondary)' }}>
                <span>TDS Held (1.5%)</span>
                <span style={{ color: '#ef4444', fontWeight: 600 }}>- {formatCurrency(purchase.tdsAmount)}</span>
              </div>
            )}
            
            {purchase.isTdsApplicable && purchase.tdsAmount && purchase.tdsAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', marginTop: '0.5rem', backgroundColor: 'var(--color-bg-base)', borderRadius: 'var(--radius-md)', paddingLeft: '1rem', paddingRight: '1rem' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>Net Payable</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)' }}>{formatCurrency((purchase.totalAmount || 0) - purchase.tdsAmount)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Timestamps */}
        <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
          <div>
            <strong>Generated By:</strong> Administrator <br/>
            <strong>System Time:</strong> {new Date().toLocaleString('en-IN')}
          </div>
          <div style={{ textAlign: 'right' }}>
            {purchase.createdAt && <div><strong>Created At:</strong> {new Date(purchase.createdAt).toLocaleString('en-IN')}</div>}
            {purchase.updatedAt && <div><strong>Last Modified:</strong> {new Date(purchase.updatedAt).toLocaleString('en-IN')}</div>}
          </div>
        </div>

      </div>
    </div>
  );
}
