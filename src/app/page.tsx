"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Supplier, Purchase, Payment, ExpenseHead } from '@/lib/types';
import { useApi } from '@/lib/useApi';
import { ArrowRight, TrendingDown, TrendingUp, DollarSign, Users, AlertCircle, PieChart as PieChartIcon } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

export default function Home() {
  const router = useRouter();
  const { apiFetch } = useApi();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenseHeads, setExpenseHeads] = useState<ExpenseHead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [supRes, purRes, payRes, expRes] = await Promise.all([
          apiFetch('/api/data/suppliers'),
          apiFetch('/api/data/purchases'),
          apiFetch('/api/data/payments'),
          apiFetch('/api/data/expenseHeads')
        ]);
        
        setSuppliers(await supRes.json());
        setPurchases(await purRes.json());
        setPayments(await payRes.json());
        setExpenseHeads(await expRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const formatCurrency = (val: number | undefined) => `NPR ${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // --- Analytics Calculations ---
  
  const totalPurchases = useMemo(() => purchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0), [purchases]);
  const totalPayments = useMemo(() => payments.reduce((sum, p) => sum + (p.amount || 0), 0), [payments]);
  const totalTds = useMemo(() => purchases.reduce((sum, p) => sum + (p.tdsAmount || 0), 0), [purchases]);
  const totalPayables = totalPurchases - totalPayments - totalTds;

  const topSuppliers = useMemo(() => {
    return suppliers.map(supplier => {
      const supPurchases = purchases.filter(p => p.supplierId === supplier.id);
      const supPayments = payments.filter(p => p.supplierId === supplier.id);
      
      const pTotal = supPurchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
      const payTotal = supPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const tdsTotal = supPurchases.reduce((sum, p) => sum + (p.tdsAmount || 0), 0);
      
      const balance = pTotal - payTotal - tdsTotal;
      return { ...supplier, balance };
    })
    .filter(s => s.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5);
  }, [suppliers, purchases, payments]);

  const recentTransactions = useMemo(() => {
    const pMapped = purchases.map(p => ({
      id: p.id,
      type: 'Purchase',
      date: p.date,
      createdAt: p.createdAt || p.date,
      supplierId: p.supplierId,
      amount: p.totalAmount,
      reference: p.invoiceNumber
    }));
    
    const payMapped = payments.map(p => ({
      id: p.id,
      type: 'Payment',
      date: p.date,
      createdAt: p.createdAt || p.date,
      supplierId: p.supplierId,
      amount: p.amount,
      reference: p.referenceNumber || p.paymentMethod
    }));
    return [...pMapped, ...payMapped]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);
  }, [purchases, payments]);

  // --- Chart Data Calculators ---

  const monthlyData = useMemo(() => {
    const dataMap: Record<string, { month: string; Purchases: number; Payments: number }> = {};
    
    purchases.forEach(p => {
      if (!p.date) return;
      const month = p.date.substring(0, 7); // YYYY-MM
      if (!dataMap[month]) dataMap[month] = { month, Purchases: 0, Payments: 0 };
      dataMap[month].Purchases += (p.totalAmount || 0);
    });
    
    payments.forEach(p => {
      if (!p.date) return;
      const month = p.date.substring(0, 7);
      if (!dataMap[month]) dataMap[month] = { month, Purchases: 0, Payments: 0 };
      dataMap[month].Payments += (p.amount || 0);
    });
    
    // Sort chronologically and take last 6 months
    return Object.values(dataMap).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);
  }, [purchases, payments]);

  const expenseData = useMemo(() => {
    const dataMap: Record<string, number> = {};
    purchases.forEach(p => {
      if (p.expenseHeadId) {
        const head = expenseHeads.find(e => e.id === p.expenseHeadId);
        const name = head ? head.name : 'Unknown';
        dataMap[name] = (dataMap[name] || 0) + (p.purchaseValue || 0);
      }
    });
    return Object.entries(dataMap).map(([name, value]) => ({ name, value }));
  }, [purchases, expenseHeads]);

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: '#fff', padding: '0.5rem 1rem', border: '1px solid #e2e8f0', borderRadius: '4px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <p style={{ margin: '0 0 0.25rem 0', fontWeight: 600, fontSize: '0.875rem' }}>{label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} style={{ margin: 0, color: p.color, fontSize: '0.875rem' }}>
              {p.name}: {formatCurrency(p.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const getSupplierName = (id: string) => suppliers.find(s => s.id === id)?.companyName || 'Unknown Vendor';

  if (loading) {
    return <div className="container" style={{ padding: '4rem', textAlign: 'center' }}>Loading dashboard...</div>;
  }

  return (
    <div className="container">
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">Financial Command Center</h1>
      </div>
      
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        
        <div className="glass-panel" style={{ padding: '0.875rem', borderLeft: '3px solid #ef4444' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)', letterSpacing: '0.05em' }}>Total Payables</h3>
            <div style={{ padding: '0.25rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', color: '#ef4444' }}><AlertCircle size={14} /></div>
          </div>
          <p style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>{formatCurrency(totalPayables)}</p>
        </div>

        <div className="glass-panel" style={{ padding: '0.875rem', borderLeft: '3px solid var(--color-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)', letterSpacing: '0.05em' }}>Gross Purchases</h3>
            <div style={{ padding: '0.25rem', backgroundColor: 'rgba(79, 70, 229, 0.1)', borderRadius: '50%', color: 'var(--color-primary)' }}><TrendingUp size={14} /></div>
          </div>
          <p style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>{formatCurrency(totalPurchases)}</p>
        </div>

        <div className="glass-panel" style={{ padding: '0.875rem', borderLeft: '3px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)', letterSpacing: '0.05em' }}>Total Paid</h3>
            <div style={{ padding: '0.25rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', color: '#10b981' }}><TrendingDown size={14} /></div>
          </div>
          <p style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>{formatCurrency(totalPayments)}</p>
        </div>

        <div className="glass-panel" style={{ padding: '0.875rem', borderLeft: '3px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)', letterSpacing: '0.05em' }}>TDS Held</h3>
            <div style={{ padding: '0.25rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: '50%', color: '#f59e0b' }}><DollarSign size={14} /></div>
          </div>
          <p style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>{formatCurrency(totalTds)}</p>
        </div>

      </div>

      {/* Main Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Line Chart: Cash Flow */}
        <div className="glass-panel" style={{ padding: '1.5rem', height: '400px' }}>
          <h2 style={{ fontSize: '1.125rem', color: 'var(--color-text-primary)', marginBottom: '1.25rem', fontWeight: 600 }}>Purchases vs Payments (Last 6 Months)</h2>
          {monthlyData.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)' }}>No data available</div>
          ) : (
            <ResponsiveContainer width="100%" height="85%">
              <LineChart data={monthlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(val) => `NPR ${val / 1000}k`} tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '14px' }} />
                <Line type="monotone" dataKey="Purchases" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Payments" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie Chart: Expense Breakdown */}
        <div className="glass-panel" style={{ padding: '1.5rem', height: '400px' }}>
          <h2 style={{ fontSize: '1.125rem', color: 'var(--color-text-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
            <PieChartIcon size={18} color="var(--color-primary)" /> Expense Distribution
          </h2>
          {expenseData.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)' }}>No expense data</div>
          ) : (
            <ResponsiveContainer width="100%" height="85%">
              <PieChart>
                <Pie
                  data={expenseData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {expenseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        
        {/* Recent Transactions */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.125rem', color: 'var(--color-text-primary)', fontWeight: 600 }}>Recent Activity</h2>
            <button className="btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.75rem' }} onClick={() => router.push('/reports?view=ledger')}>View All</button>
          </div>

          {recentTransactions.length === 0 ? (
            <p style={{ color: 'var(--color-text-secondary)' }}>No recent activity found.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem 0', color: 'var(--color-text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>Type</th>
                    <th style={{ padding: '0.75rem 0', color: 'var(--color-text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>Date</th>
                    <th style={{ padding: '0.75rem 0', color: 'var(--color-text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>Vendor</th>
                    <th style={{ padding: '0.75rem 0', color: 'var(--color-text-secondary)', fontWeight: 600, fontSize: '0.875rem', textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map((tx, idx) => (
                    <tr key={idx} className="table-row-hover" style={{ borderBottom: '1px solid var(--color-border-hover)', cursor: 'pointer' }} onClick={() => router.push(tx.type === 'Purchase' ? `/purchases/${tx.id}` : `/payments/${tx.id}`)}>
                      <td style={{ padding: '1rem 0' }}>
                        <span style={{ 
                          fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
                          color: '#000000'
                        }}>
                          {tx.type}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 0', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>{tx.date}</td>
                      <td style={{ padding: '1rem 0', color: 'var(--color-text-primary)', fontWeight: 500, fontSize: '0.875rem' }}>{getSupplierName(tx.supplierId)}</td>
                      <td style={{ padding: '1rem 0', textAlign: 'right', fontWeight: 600, color: 'var(--color-text-primary)' }}>{formatCurrency(tx.amount || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top Outstanding Suppliers */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', color: 'var(--color-text-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
            <Users size={18} color="var(--color-primary)" /> Top Outstanding
          </h2>

          {topSuppliers.length === 0 ? (
            <p style={{ color: 'var(--color-text-secondary)' }}>No outstanding balances!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {topSuppliers.map((supplier, idx) => (
                <div key={supplier.id} style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  padding: '1rem', backgroundColor: 'var(--color-bg-base)', borderRadius: 'var(--radius-md)',
                  marginBottom: '0.75rem', border: '1px solid var(--color-border)'
                }}>
                  <div>
                    <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '0.875rem' }}>{supplier.companyName}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>VAT: {supplier.vatNumber || 'N/A'}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: '0.9rem' }}>{formatCurrency(supplier.balance)}</p>
                    <button className="btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', marginTop: '0.3rem' }} onClick={() => router.push(`/reports?view=ledger&supplierId=${supplier.id}`)}>View Ledger</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
