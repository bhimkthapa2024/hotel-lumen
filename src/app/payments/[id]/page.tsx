"use client";

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Payment, Supplier, Bank } from '@/lib/types';
import { ArrowLeft, Printer } from 'lucide-react';
import { useApi } from '@/lib/useApi';

function numberToWords(num: number): string {
  if (!num) return 'Zero';
  
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const formatTens = (n: number) => {
    if (n < 20) return a[n];
    return b[Math.floor(n / 10)] + ' ' + a[n % 10];
  };

  let res = '';
  let cr = Math.floor(num / 10000000);
  num %= 10000000;
  let lk = Math.floor(num / 100000);
  num %= 100000;
  let th = Math.floor(num / 1000);
  num %= 1000;
  let hd = Math.floor(num / 100);
  num %= 100;
  
  if (cr > 0) res += formatTens(cr) + 'Crore ';
  if (lk > 0) res += formatTens(lk) + 'Lakh ';
  if (th > 0) res += formatTens(th) + 'Thousand ';
  if (hd > 0) res += formatTens(hd) + 'Hundred ';
  if (num > 0) res += formatTens(num);
  
  return res.trim() + ' Only';
}

export default function PaymentView({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const id = unwrappedParams.id;
  const { apiFetch } = useApi();
  
  const [payment, setPayment] = useState<Payment | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [bank, setBank] = useState<Bank | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [payRes, supRes, bankRes] = await Promise.all([
          apiFetch('/api/data/payments'),
          apiFetch('/api/data/suppliers'),
          apiFetch('/api/data/banks')
        ]);
        
        const payments: Payment[] = await payRes.json();
        const suppliers: Supplier[] = await supRes.json();
        const banks: Bank[] = await bankRes.json();
        
        const foundPayment = payments.find(p => p.id === id);
        if (foundPayment) {
          setPayment(foundPayment);
          setSupplier(suppliers.find(s => s.id === foundPayment.supplierId) || null);
          if (foundPayment.bankId) {
            setBank(banks.find(b => b.id === foundPayment.bankId) || null);
          }
        }
      } catch (err) {
        console.error("Failed to load payment details", err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [id]);

  if (loading) {
    return <div className="container" style={{ padding: '4rem', textAlign: 'center' }}>Loading receipt details...</div>;
  }

  if (!payment) {
    return (
      <div className="container">
        <div style={{ padding: '4rem', textAlign: 'center', backgroundColor: 'var(--color-bg-surface)', borderRadius: 'var(--radius-lg)' }}>
          <h2>Payment Not Found</h2>
          <button className="btn-primary" style={{ marginTop: '2rem' }} onClick={() => router.push('/reports?view=payments')}>
            Back to Reports
          </button>
        </div>
      </div>
    );
  }

  const formatCurrency = (val: number | undefined) => `NPR ${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="container" id="voucher-container" style={{ maxWidth: '700px', margin: '0 auto' }}>
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
            border-top: 8px solid var(--color-primary) !important;
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
          <Printer size={18} /> Print Voucher
        </button>
      </div>

      {/* Receipt Document */}
      <div className="glass-panel" style={{ padding: '2.5rem', backgroundColor: '#fff', borderTop: '8px solid var(--color-primary)' }}>
        
        {/* Receipt Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--color-border)', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', color: 'var(--color-text-primary)', marginBottom: '0.25rem', letterSpacing: '-0.02em' }}>PAYMENT VOUCHER</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontWeight: 500, fontSize: '1.1rem' }}>Voucher # PMT-{payment.paymentNumber || payment.id?.substring(0, 8).toUpperCase()}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Payment Date</p>
            <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{payment.date}</p>
          </div>
        </div>

        {/* Details Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', marginBottom: '2rem' }}>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>Paid To (Vendor Details)</p>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>{supplier?.companyName || 'Unknown Vendor'}</h3>
            {supplier?.address && <p style={{ color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>{supplier.address}</p>}
            {supplier?.vatNumber && <p style={{ color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>VAT/PAN: <strong style={{ color: 'var(--color-text-primary)' }}>{supplier.vatNumber}</strong></p>}
            {supplier?.telephone && <p style={{ color: 'var(--color-text-secondary)' }}>Tel: {supplier.telephone}</p>}
          </div>

          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>Payment Information</p>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>Payment Method:</span>
              <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{payment.paymentMethod}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>Paid From:</span>
              <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
                {payment.paymentMethod === 'Bank' ? bank?.name || 'Unknown Bank' : 'Cash Account'}
              </span>
            </div>

            {payment.referenceNumber && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>Reference / Cheque No:</span>
                <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{payment.referenceNumber}</span>
              </div>
            )}
          </div>
        </div>

        {/* Amount Paid Highlight */}
        <div style={{ backgroundColor: 'var(--color-bg-base)', padding: '1.5rem', borderRadius: 'var(--radius-md)', textAlign: 'center', marginBottom: '2rem', border: '1px solid var(--color-border)' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Total Amount Paid</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1, marginBottom: '0.5rem' }}>{formatCurrency(payment.amount)}</p>
          <p style={{ fontSize: '1rem', color: 'var(--color-text-secondary)', fontWeight: 600, fontStyle: 'italic' }}>{numberToWords(payment.amount)}</p>
        </div>

        {payment.remarks && (
          <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Remarks / Notes</p>
            <p style={{ color: 'var(--color-text-primary)', fontStyle: 'italic' }}>"{payment.remarks}"</p>
          </div>
        )}
        
        {/* Timestamps */}
        <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
          <div>
            <strong>Generated By:</strong> Administrator <br/>
            <strong>System Time:</strong> {new Date().toLocaleString('en-IN')}
          </div>
          <div style={{ textAlign: 'right' }}>
            {payment.createdAt && <div><strong>Created At:</strong> {new Date(payment.createdAt).toLocaleString('en-IN')}</div>}
            {payment.updatedAt && <div><strong>Last Modified:</strong> {new Date(payment.updatedAt).toLocaleString('en-IN')}</div>}
          </div>
        </div>

      </div>
    </div>
  );
}
