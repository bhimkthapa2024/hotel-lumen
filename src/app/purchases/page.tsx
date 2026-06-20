"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Purchase, Supplier, ExpenseHead } from '@/lib/types';
import { Plus, Eye, Edit2 } from 'lucide-react';
import { useUser } from '@/components/UserContext';
import { useApi } from '@/lib/useApi';

export default function PurchasesPage() {
  const { isAdmin } = useUser();
  const { apiFetch } = useApi();
  const [purchases, setPurchases] = useState<(Purchase & { supplierName?: string, expenseHeadName?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [suppliersRes, expensesRes, purchasesRes] = await Promise.all([
          apiFetch('/api/data/suppliers'),
          apiFetch('/api/data/expenseHeads'),
          apiFetch('/api/data/purchases')
        ]);
        
        const suppliersData: Supplier[] = await suppliersRes.json();
        const expensesData: ExpenseHead[] = await expensesRes.json();
        const purchasesData: Purchase[] = await purchasesRes.json();
        
        const suppliersMap: Record<string, string> = {};
        suppliersData.forEach(s => { if(s.id) suppliersMap[s.id] = s.companyName; });

        const expensesMap: Record<string, string> = {};
        expensesData.forEach(e => { if(e.id) expensesMap[e.id] = e.name; });

        const enrichedPurchases = purchasesData.map(p => ({
          ...p,
          supplierName: p.supplierId ? suppliersMap[p.supplierId] || 'Unknown Supplier' : 'Unknown Supplier',
          expenseHeadName: p.expenseHeadId ? expensesMap[p.expenseHeadId] || 'Uncategorized' : 'Uncategorized'
        })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        setPurchases(enrichedPurchases);
      } catch (error) {
        console.error("Error fetching purchases:", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  return (
    <div className="container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">Purchases</h1>
        <Link href="/purchases/new" className="btn-primary">
          <Plus size={20} /> Add Purchase
        </Link>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        {loading ? (
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading purchases...</p>
        ) : purchases.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>No purchases found.</p>
            <Link href="/purchases/new" className="btn-secondary">
              Record a purchase
            </Link>
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Invoice #</th>
                  <th>Supplier</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map(purchase => (
                  <tr key={purchase.id}>
                    <td>{purchase.date}</td>
                    <td>{purchase.invoiceNumber}</td>
                    <td><strong>{purchase.supplierName}</strong></td>
                    <td>
                      <span className="status-pill info">{purchase.expenseHeadName}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <strong>NPR {Number((purchase as any).totalAmount || (purchase as any).amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <Link href={`/purchases/${purchase.id}`} className="btn-secondary" style={{ padding: '0.3rem', borderRadius: '4px' }} title="View Voucher">
                          <Eye size={16} />
                        </Link>
                        {isAdmin && (
                          <Link href={`/purchases/${purchase.id}/edit`} className="btn-secondary" style={{ padding: '0.3rem', borderRadius: '4px' }} title="Edit Purchase">
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
