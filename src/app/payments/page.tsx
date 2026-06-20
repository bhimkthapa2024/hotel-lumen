"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Payment, Supplier, Bank } from '@/lib/types';
import { Plus, Eye, Edit2 } from 'lucide-react';
import { useUser } from '@/components/UserContext';

export default function PaymentsPage() {
  const { isAdmin } = useUser();
  const [payments, setPayments] = useState<(Payment & { supplierName?: string, bankName?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [suppliersRes, banksRes, paymentsRes] = await Promise.all([
          fetch('/api/data/suppliers'),
          fetch('/api/data/banks'),
          fetch('/api/data/payments')
        ]);
        
        const suppliersData: Supplier[] = await suppliersRes.json();
        const banksData: Bank[] = await banksRes.json();
        const paymentsData: Payment[] = await paymentsRes.json();
        
        const suppliersMap: Record<string, string> = {};
        suppliersData.forEach(s => { if(s.id) suppliersMap[s.id] = s.companyName; });

        const banksMap: Record<string, string> = {};
        banksData.forEach(b => { if(b.id) banksMap[b.id] = b.name; });

        const enrichedPayments = paymentsData.map(p => ({
          ...p,
          supplierName: p.supplierId ? suppliersMap[p.supplierId] || 'Unknown Supplier' : 'Unknown Supplier',
          bankName: p.paymentMethod === 'Cash' ? 'Cash' : (p.bankId ? banksMap[p.bankId] || 'Unknown Bank' : 'Unknown Bank')
        })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        setPayments(enrichedPayments);
      } catch (error) {
        console.error("Error fetching payments:", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  return (
    <div className="container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">Payments</h1>
        <Link href="/payments/new" className="btn-primary">
          <Plus size={20} /> Record Payment
        </Link>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        {loading ? (
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading payments...</p>
        ) : payments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>No payments found.</p>
            <Link href="/payments/new" className="btn-secondary">
              Record a payment
            </Link>
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Voucher No.</th>
                  <th>Date</th>
                  <th>Supplier</th>
                  <th>Bank</th>
                  <th>Method / Ref</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(payment => (
                  <tr key={payment.id}>
                    <td><strong>{payment.paymentNumber || '-'}</strong></td>
                    <td>{payment.date}</td>
                    <td><strong>{payment.supplierName}</strong></td>
                    <td>{payment.bankName}</td>
                    <td>
                      <span className="status-pill info" style={{ marginRight: '0.5rem' }}>{payment.paymentMethod}</span>
                      {payment.referenceNumber && <span>{payment.referenceNumber}</span>}
                      {payment.remarks ? <span style={{ display: 'block', fontSize: '0.75rem', marginTop: '0.25rem', fontStyle: 'italic', color: 'var(--color-text-secondary)', opacity: 0.8 }}>{payment.remarks}</span> : null}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <strong>NPR {Number(payment.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <Link href={`/payments/${payment.id}`} className="btn-secondary" style={{ padding: '0.3rem', borderRadius: '4px' }} title="View Voucher">
                          <Eye size={16} />
                        </Link>
                        {isAdmin && (
                          <Link href={`/payments/${payment.id}/edit`} className="btn-secondary" style={{ padding: '0.3rem', borderRadius: '4px' }} title="Edit Payment">
                            <Edit2 size={16} />
                          </Link>
                        )}
                      </div>
                    </td>
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
