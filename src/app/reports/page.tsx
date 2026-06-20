"use client";

import { useState, useEffect, useMemo, Suspense, Fragment } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Supplier, Purchase, Payment, Bank, ExpenseHead, PropertyDetails } from '@/lib/types';
import { BookOpen, Printer, Download } from 'lucide-react';
import SearchableSelect from '@/components/SearchableSelect';

function ReportsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get('view') || 'ledger';
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [expenseHeads, setExpenseHeads] = useState<ExpenseHead[]>([]);
  const [propertyDetails, setPropertyDetails] = useState<PropertyDetails | null>(null);
  
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [selectedTdsSupplierId, setSelectedTdsSupplierId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      if (startDate && p.date < startDate) return false;
      if (endDate && p.date > endDate) return false;
      return true;
    });
  }, [purchases, startDate, endDate]);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      if (startDate && p.date < startDate) return false;
      if (endDate && p.date > endDate) return false;
      return true;
    });
  }, [payments, startDate, endDate]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [supRes, purRes, payRes, bankRes, expRes, propRes] = await Promise.all([
          fetch('/api/data/suppliers'),
          fetch('/api/data/purchases'),
          fetch('/api/data/payments'),
          fetch('/api/data/banks'),
          fetch('/api/data/expenseHeads'),
          fetch('/api/data/propertyDetails')
        ]);
        setSuppliers(await supRes.json());
        setPurchases(await purRes.json());
        setPayments(await payRes.json());
        setBanks(await bankRes.json());
        setExpenseHeads(await expRes.json());
        
        const props = await propRes.json();
        if (props && props.length > 0) {
          setPropertyDetails(props[0]);
        }
      } catch (err) {
        console.error("Error loading report data", err);
      }
    }
    fetchData();
  }, []);

  const getSupplierName = (id: string) => suppliers.find(s => s.id === id)?.companyName || 'Unknown';
  const getBankName = (id: string) => banks.find(b => b.id === id)?.name || 'Unknown';

  // Ledger Logic
  const { ledgerEntries, openingBalance } = useMemo(() => {
    if (!selectedSupplierId) return { ledgerEntries: [], openingBalance: 0 };
    
    // Calculate opening balance
    const allPurchases = purchases.filter(p => p.supplierId === selectedSupplierId);
    const allPayments = payments.filter(p => p.supplierId === selectedSupplierId);
    
    let opBal = 0;
    if (startDate) {
      const priorCr = allPurchases.filter(p => p.date < startDate).reduce((sum, p) => sum + p.totalAmount, 0);
      const priorTds = allPurchases.filter(p => p.date < startDate).reduce((sum, p) => sum + (p.tdsAmount || 0), 0);
      const priorDr = allPayments.filter(p => p.date < startDate).reduce((sum, p) => sum + p.amount, 0);
      opBal = priorCr - priorDr - priorTds;
    }

    const currentPurchases = filteredPurchases.filter(p => p.supplierId === selectedSupplierId).flatMap(p => {
      const supplierName = getSupplierName(p.supplierId).toUpperCase();
      const entries = [{
        id: p.id,
        date: p.date,
        type: 'Purchase',
        reference: p.pjvNumber || '-',
        description: `SUNDRY CREDITORS: ${supplierName};\nType: ${p.voucherType || 'Service Purchase'}; Purchased From: ${supplierName}; Bill Number: ${p.invoiceNumber}; Narration: ${p.description?.toUpperCase() || ''}`,
        debit: 0,
        credit: p.totalAmount
      }];
      
      if (p.isTdsApplicable && p.tdsAmount && p.tdsAmount > 0) {
        entries.push({
          id: p.id + '-tds',
          date: p.date,
          type: 'TDS Held',
          reference: p.pjvNumber || '-',
          description: `SUNDRY CREDITORS: ${supplierName};\nTDS HELD AGAINST BILL ${p.invoiceNumber}`,
          debit: p.tdsAmount,
          credit: 0
        });
      }
      return entries;
    });

    const currentPayments = filteredPayments.filter(p => p.supplierId === selectedSupplierId).map(p => {
      const supplierName = getSupplierName(p.supplierId).toUpperCase();
      const bankName = p.bankId ? getBankName(p.bankId).toUpperCase() : 'CASH';
      return {
        id: p.id,
        date: p.date,
        type: 'Payment',
        reference: p.paymentNumber || (p.id ? `PV${p.id.slice(0,6).toUpperCase()}` : '-'),
        description: `SUNDRY CREDITORS: ${supplierName};\nBEING PAID BY ${p.paymentMethod !== 'Cash' ? (bankName + ' (' + p.paymentMethod.toUpperCase() + ') REF NO ') : 'CASH '}${p.referenceNumber || ''}${p.remarks ? ' - ' + p.remarks.toUpperCase() : ''}`,
        debit: p.amount,
        credit: 0
      };
    });

    const combined = [...currentPurchases, ...currentPayments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    let runningBalance = opBal;
    const entries = combined.map(entry => {
      runningBalance = runningBalance + entry.credit - entry.debit;
      return { ...entry, balance: runningBalance };
    });

    return { ledgerEntries: entries, openingBalance: opBal };
  }, [selectedSupplierId, purchases, payments, filteredPurchases, filteredPayments, startDate, suppliers, banks]);

  const totalBilled = ledgerEntries.reduce((sum, entry) => sum + entry.credit, 0);
  const totalPaid = ledgerEntries.reduce((sum, entry) => sum + entry.debit, 0);
  const outstandingBalance = openingBalance + totalBilled - totalPaid;

  const formatCurrency = (val: number | undefined) => `NPR ${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;



  let pageTitle = "Reports";
  if (activeTab === 'ledger') pageTitle = "Supplier Ledger";
  if (activeTab === 'purchases') pageTitle = "Purchase Register";
  if (activeTab === 'payments') pageTitle = "Payment Register";
  if (activeTab === 'tds') pageTitle = "TDS Held Report";
  if (activeTab === 'expenses') pageTitle = "Expense Head Summary";
  if (activeTab === 'ageing') pageTitle = "Supplier Ageing Report";
  if (activeTab === 'pjv') pageTitle = "PJV Register";

  const tdsPurchases = filteredPurchases.filter(p => 
    p.isTdsApplicable && p.tdsAmount && p.tdsAmount > 0 &&
    (selectedTdsSupplierId ? p.supplierId === selectedTdsSupplierId : true)
  );
  const totalTdsHeld = tdsPurchases.reduce((sum, p) => sum + (p.tdsAmount || 0), 0);

  const expenseSummary = expenseHeads.map(eh => {
    const ehPurchases = filteredPurchases.filter(p => p.expenseHeadId === eh.id);
    
    const subLedgersSummary = (eh.subLedgers || []).map(sl => {
      const slPurchases = ehPurchases.filter(p => p.subLedger === sl.id || p.subLedger === sl.name);
      return {
        id: sl.id,
        name: sl.name,
        taxable: slPurchases.reduce((sum, p) => sum + (p.purchaseValue || 0), 0),
        vat: slPurchases.reduce((sum, p) => sum + (p.vatAmount || 0), 0),
        exempt: slPurchases.reduce((sum, p) => sum + (p.exemptedValue || 0), 0),
        total: slPurchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0)
      };
    }).filter(row => row.total > 0);

    const uncatSlPurchases = ehPurchases.filter(p => !p.subLedger || !eh.subLedgers?.some(sl => sl.id === p.subLedger || sl.name === p.subLedger));
    if (uncatSlPurchases.length > 0 && eh.subLedgers && eh.subLedgers.length > 0) {
      subLedgersSummary.push({
        id: 'uncat',
        name: 'Unspecified Sub-Ledger',
        taxable: uncatSlPurchases.reduce((sum, p) => sum + (p.purchaseValue || 0), 0),
        vat: uncatSlPurchases.reduce((sum, p) => sum + (p.vatAmount || 0), 0),
        exempt: uncatSlPurchases.reduce((sum, p) => sum + (p.exemptedValue || 0), 0),
        total: uncatSlPurchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0)
      });
    }

    return {
      id: eh.id,
      name: eh.name,
      description: eh.description || '-',
      taxable: ehPurchases.reduce((sum, p) => sum + (p.purchaseValue || 0), 0),
      vat: ehPurchases.reduce((sum, p) => sum + (p.vatAmount || 0), 0),
      exempt: ehPurchases.reduce((sum, p) => sum + (p.exemptedValue || 0), 0),
      total: ehPurchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0),
      purchases: ehPurchases,
      subLedgers: subLedgersSummary
    };
  }).filter(row => row.total > 0);

  // Add uncategorized
  const uncatPurchases = filteredPurchases.filter(p => !p.expenseHeadId);
  if (uncatPurchases.length > 0) {
    expenseSummary.push({
      id: 'uncat',
      name: 'Uncategorized',
      description: '-',
      taxable: uncatPurchases.reduce((sum, p) => sum + (p.purchaseValue || 0), 0),
      vat: uncatPurchases.reduce((sum, p) => sum + (p.vatAmount || 0), 0),
      exempt: uncatPurchases.reduce((sum, p) => sum + (p.exemptedValue || 0), 0),
      total: uncatPurchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0),
      purchases: uncatPurchases,
      subLedgers: []
    });
  }

  // Ageing Report Logic
  const ageingReport = useMemo(() => {
    if (activeTab !== 'ageing') return [];

    const now = Date.now();
    
    return suppliers.map(supplier => {
      const supPurchases = purchases.filter(p => p.supplierId === supplier.id).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const supPayments = payments.filter(p => p.supplierId === supplier.id);
      
      let totalPaid = supPayments.reduce((sum, p) => sum + p.amount, 0);
      
      let bucket0_30 = 0;
      let bucket31_60 = 0;
      let bucket61_90 = 0;
      let bucket90Plus = 0;
      let outstandingPurchases = [];

      for (const pur of supPurchases) {
        // totalAmount from Purchase minus any TDS held equals what we actually owe the supplier for that invoice
        const owed = pur.totalAmount - (pur.tdsAmount || 0);
        
        if (totalPaid >= owed) {
          totalPaid -= owed;
        } else {
          const unpaidAmount = owed - totalPaid;
          totalPaid = 0;
          
          if (unpaidAmount > 0) {
            const ageInDays = Math.floor((now - new Date(pur.date).getTime()) / (1000 * 60 * 60 * 24));
            
            outstandingPurchases.push({
              ...pur,
              unpaidAmount,
              ageInDays
            });

            if (ageInDays <= 30) bucket0_30 += unpaidAmount;
            else if (ageInDays <= 60) bucket31_60 += unpaidAmount;
            else if (ageInDays <= 90) bucket61_90 += unpaidAmount;
            else bucket90Plus += unpaidAmount;
          }
        }
      }

      const totalOutstanding = bucket0_30 + bucket31_60 + bucket61_90 + bucket90Plus;

      return {
        supplierId: supplier.id,
        supplierName: supplier.companyName,
        bucket0_30,
        bucket31_60,
        bucket61_90,
        bucket90Plus,
        totalOutstanding,
        outstandingPurchases
      };
    }).filter(row => row.totalOutstanding > 0).sort((a, b) => b.totalOutstanding - a.totalOutstanding);
  }, [suppliers, purchases, payments, activeTab]);

  const pjvList = useMemo(() => {
    return [...filteredPurchases].sort((a, b) => {
      const numA = parseInt(a.pjvNumber?.replace(/\D/g, '') || '0', 10);
      const numB = parseInt(b.pjvNumber?.replace(/\D/g, '') || '0', 10);
      return numA - numB || (a.pjvNumber || '').localeCompare(b.pjvNumber || '');
    });
  }, [filteredPurchases]);

  const handleExportCSV = () => {
    let csvContent = "Transaction Date,Voucher Number,Description,Debit,Credit,Balance\n"; // Default
    
    if (activeTab === 'ledger') {
      csvContent = "Transaction Date,Voucher Number,Description,Debit,Credit,Balance\n";
      ledgerEntries.forEach(row => {
        const desc = row.description.replace(/"/g, '""');
        csvContent += `"${row.date}","${row.reference}","${desc}","${row.debit}","${row.credit}","${row.balance}"\n`;
      });
    } else if (activeTab === 'purchases') {
      csvContent = "Date,Vendor,PJV #,Invoice #,Taxable,VAT,Exempted,Total Amount\n";
      filteredPurchases.forEach(row => {
        csvContent += `"${row.date}","${getSupplierName(row.supplierId)}","${row.pjvNumber || ''}","${row.invoiceNumber}","${row.purchaseValue || ''}","${row.vatAmount || ''}","${row.exemptedValue || ''}","${row.totalAmount}"\n`;
      });
    } else if (activeTab === 'pjv') {
      csvContent = "PJV #,Date,Vendor,Invoice #,Total Amount\n";
      pjvList.forEach(row => {
        csvContent += `"${row.pjvNumber || ''}","${row.date}","${getSupplierName(row.supplierId)}","${row.invoiceNumber}","${row.totalAmount}"\n`;
      });
    } else if (activeTab === 'payments') {
      csvContent = "Date,Vendor,Paid From,Method,Reference,Amount Paid\n";
      filteredPayments.forEach(row => {
        csvContent += `"${row.date}","${getSupplierName(row.supplierId)}","${row.bankId ? getBankName(row.bankId) : 'Cash'}","${row.paymentMethod}","${row.referenceNumber || ''}","${row.amount}"\n`;
      });
    } else if (activeTab === 'tds') {
      csvContent = "Date,Vendor,PJV #,Invoice #,Taxable Amount,TDS Held\n";
      tdsPurchases.forEach(row => {
        csvContent += `"${row.date}","${getSupplierName(row.supplierId)}","${row.pjvNumber || ''}","${row.invoiceNumber}","${row.purchaseValue || ''}","${row.tdsAmount || ''}"\n`;
      });
    } else if (activeTab === 'expenses') {
      csvContent = "Expense Head,Description,Taxable Amount,VAT,Exempted,Total Amount\n";
      expenseSummary.forEach(row => {
        csvContent += `"${row.name}","${row.description}","${row.taxable}","${row.vat}","${row.exempt}","${row.total}"\n`;
      });
    } else if (activeTab === 'ageing') {
      csvContent = "Supplier Name,0-30 Days,31-60 Days,61-90 Days,> 90 Days,Total Outstanding\n";
      ageingReport.forEach(row => {
        csvContent += `"${row.supplierName}","${row.bucket0_30}","${row.bucket31_60}","${row.bucket61_90}","${row.bucket90Plus}","${row.totalOutstanding}"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${activeTab}_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container" id="report-container">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #report-container, #report-container * {
            visibility: visible;
          }
          #report-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-hide {
            display: none !important;
          }
          .glass-panel {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
          }
        }
      `}} />

      <div className="print-hide" style={{ backgroundColor: '#4f46e5', color: 'white', padding: '1.25rem 2rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em', color: 'white' }}>{pageTitle}</h1>
        
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <label style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>From</label>
            <input 
              type="date" style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.875rem', borderRadius: '6px', border: 'none', color: '#1e293b', fontWeight: 500, outline: 'none' }}
              value={startDate} onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <label style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>To</label>
            <input 
              type="date" style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.875rem', borderRadius: '6px', border: 'none', color: '#1e293b', fontWeight: 500, outline: 'none' }}
              value={endDate} onChange={e => setEndDate(e.target.value)}
            />
          </div>
          {(startDate || endDate) && (
            <button style={{ padding: '0.4rem 1rem', fontSize: '0.875rem', backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, transition: 'background-color 0.2s' }} onClick={() => { setStartDate(''); setEndDate(''); }}>
              Clear
            </button>
          )}
          
          <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.3)', margin: '0 0.5rem' }}></div>
          
          <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1rem', fontSize: '0.875rem', backgroundColor: 'white', color: '#4f46e5', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, transition: 'opacity 0.2s' }}>
            <Printer size={16} /> Print
          </button>
          <button onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1rem', fontSize: '0.875rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, transition: 'opacity 0.2s' }}>
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '2.5rem', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        
        {/* Helper for rendering the common property header */}
        {(() => {
          if (activeTab === 'ledger') return null; // Ledger has custom injected layout

          return (
            <div style={{ textAlign: 'center', marginBottom: '2rem', borderBottom: '2px solid #111', paddingBottom: '1rem' }}>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 0.35rem 0', color: '#111', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{propertyDetails?.companyName || 'HOTEL LUMEN'}</h1>
              <div style={{ fontSize: '1.05rem', color: '#333', marginBottom: '0.15rem' }}>{propertyDetails?.address || ''}</div>
              <div style={{ fontSize: '1rem', color: '#444' }}>PAN: {propertyDetails?.vatPan || ''} | Phone: {propertyDetails?.telephone || ''}</div>
              <h2 style={{ fontSize: '0.85rem', fontWeight: 600, margin: '1.25rem 0 0 0', textTransform: 'uppercase', color: '#333', letterSpacing: '0.05em' }}>{pageTitle}</h2>
              <div style={{ fontSize: '0.85rem', color: '#555', marginTop: '0.25rem' }}>FISCAL YEAR : {propertyDetails?.fiscalYearStart ? `${propertyDetails.fiscalYearStart} TO ${propertyDetails.fiscalYearEnd}` : '2025-2026'}</div>
              {(startDate || endDate) && (
                 <div style={{ fontSize: '0.85rem', color: '#555', marginTop: '0.25rem' }}>FROM: {startDate || 'ALL'} | TO: {endDate || 'ALL'}</div>
              )}
            </div>
          );
        })()}
        
        {/* SUPPLIER LEDGER */}
        {activeTab === 'ledger' && (
          <div>
            <div className="print-hide" style={{ marginBottom: '3rem', maxWidth: '350px' }}>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Select Vendor to View Ledger</label>
              <SearchableSelect 
                options={suppliers.map(sup => ({ value: sup.id, label: sup.companyName }))}
                value={selectedSupplierId}
                onChange={setSelectedSupplierId}
                placeholder="-- Select Vendor --"
              />
            </div>

            {selectedSupplierId ? (
              ledgerEntries.length > 0 ? (
                <div style={{ border: '1px solid #ccc', padding: '2rem', backgroundColor: '#fff', fontSize: '0.85rem', fontFamily: 'Arial, Helvetica, sans-serif' }}>
                  {/* Traditional Report Header */}
                  <div style={{ textAlign: 'center', marginBottom: '2rem', borderBottom: '2px solid #111', paddingBottom: '1rem' }}>
                    <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 0.35rem 0', color: '#111', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{propertyDetails?.companyName || 'HOTEL LUMEN'}</h1>
                    <div style={{ fontSize: '1.05rem', color: '#333', marginBottom: '0.15rem' }}>{propertyDetails?.address || ''}</div>
                    <div style={{ fontSize: '1rem', color: '#444' }}>PAN: {propertyDetails?.vatPan || ''} | Phone: {propertyDetails?.telephone || ''}</div>
                    <h2 style={{ fontSize: '0.85rem', fontWeight: 600, margin: '1.25rem 0 0 0', textTransform: 'uppercase', color: '#333', letterSpacing: '0.05em' }}>LEDGER BALANCE REPORT : SUNDRY CREDITORS</h2>
                    <div style={{ fontSize: '0.85rem', color: '#555', marginTop: '0.25rem' }}>FISCAL YEAR : {propertyDetails?.fiscalYearStart ? `${propertyDetails.fiscalYearStart} TO ${propertyDetails.fiscalYearEnd}` : '2025-2026'}</div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <div style={{ lineHeight: '1.4' }}>
                      <div style={{ color: '#333' }}><strong>FROM DATE:</strong> {startDate || 'ALL'}</div>
                      <div style={{ color: '#333' }}><strong>TO DATE:</strong> {endDate || 'ALL'}</div>
                      <div style={{ marginTop: '0.5rem', color: '#333' }}><strong>NAME:</strong> {suppliers.find(s => s.id === selectedSupplierId)?.companyName?.toUpperCase() || ''}</div>
                      <div style={{ color: '#333' }}><strong>PAN:</strong> {suppliers.find(s => s.id === selectedSupplierId)?.vatNumber || ''}</div>
                      <div style={{ color: '#333' }}><strong>PHONE:</strong> {suppliers.find(s => s.id === selectedSupplierId)?.telephone || ''}</div>
                      <div style={{ color: '#333' }}><strong>ADDRESS:</strong> {suppliers.find(s => s.id === selectedSupplierId)?.address?.toUpperCase() || ''}</div>
                    </div>
                    <div>
                      <table style={{ borderCollapse: 'collapse', width: '250px', fontSize: '0.85rem', color: '#333' }}>
                        <tbody>
                          <tr>
                            <td style={{ border: '1px solid #e5e5e5', padding: '0.25rem 0.5rem' }}>Opening</td>
                            <td style={{ border: '1px solid #e5e5e5', padding: '0.25rem 0.5rem', textAlign: 'right' }}>{Math.abs(openingBalance).toLocaleString('en-IN', {minimumFractionDigits: 2})} {openingBalance >= 0 ? 'CR' : 'DR'}</td>
                          </tr>
                          <tr>
                            <td style={{ border: '1px solid #e5e5e5', padding: '0.25rem 0.5rem' }}>Debit</td>
                            <td style={{ border: '1px solid #e5e5e5', padding: '0.25rem 0.5rem', textAlign: 'right' }}>{totalPaid.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                          </tr>
                          <tr>
                            <td style={{ border: '1px solid #e5e5e5', padding: '0.25rem 0.5rem' }}>Credit</td>
                            <td style={{ border: '1px solid #e5e5e5', padding: '0.25rem 0.5rem', textAlign: 'right' }}>{totalBilled.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                          </tr>
                          <tr>
                            <td style={{ border: '1px solid #e5e5e5', padding: '0.25rem 0.5rem', fontWeight: 700 }}>Closing</td>
                            <td style={{ border: '1px solid #e5e5e5', padding: '0.25rem 0.5rem', textAlign: 'right', fontWeight: 700 }}>{Math.abs(outstandingBalance).toLocaleString('en-IN', {minimumFractionDigits: 2})} {outstandingBalance >= 0 ? 'CR' : 'DR'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Traditional Ledger Table */}
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', color: '#111' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#fafafa', borderTop: '1px solid #ccc', borderBottom: '1px solid #ccc', textAlign: 'left' }}>
                          <th style={{ padding: '0.4rem', borderRight: '1px solid #e5e5e5', fontWeight: 700 }}>Transaction Date</th>
                          <th style={{ padding: '0.4rem', borderRight: '1px solid #e5e5e5', fontWeight: 700 }}>Voucher Number</th>
                          <th style={{ padding: '0.4rem', borderRight: '1px solid #e5e5e5', fontWeight: 700 }}>Description</th>
                          <th style={{ padding: '0.4rem', borderRight: '1px solid #e5e5e5', fontWeight: 700, textAlign: 'right' }}>Debit</th>
                          <th style={{ padding: '0.4rem', borderRight: '1px solid #e5e5e5', fontWeight: 700, textAlign: 'right' }}>Credit</th>
                          <th style={{ padding: '0.4rem', fontWeight: 700, textAlign: 'right' }}>Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '0.4rem', borderRight: '1px solid #e5e5e5' }}>{startDate || ''}</td>
                          <td style={{ padding: '0.4rem', borderRight: '1px solid #e5e5e5' }}></td>
                          <td style={{ padding: '0.4rem', borderRight: '1px solid #e5e5e5', fontWeight: 700 }}>Opening Balance</td>
                          <td style={{ padding: '0.4rem', borderRight: '1px solid #e5e5e5', textAlign: 'right' }}>0.00</td>
                          <td style={{ padding: '0.4rem', borderRight: '1px solid #e5e5e5', textAlign: 'right' }}>{Math.abs(openingBalance).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                          <td style={{ padding: '0.4rem', textAlign: 'right' }}>{Math.abs(openingBalance).toLocaleString('en-IN', {minimumFractionDigits: 2})} {openingBalance >= 0 ? 'CR' : 'DR'}</td>
                        </tr>
                        {ledgerEntries.map((entry, idx) => (
                          <Fragment key={idx}>
                            <tr 
                              style={{ borderBottom: '1px solid #eee', cursor: 'pointer' }}
                              onClick={() => setExpandedRowId(expandedRowId === entry.id ? null : (entry.id || null))}
                            >
                              <td style={{ padding: '0.4rem', borderRight: '1px solid #e5e5e5' }}>{entry.date}</td>
                              <td style={{ padding: '0.4rem', borderRight: '1px solid #e5e5e5' }}>{entry.reference}</td>
                              <td style={{ padding: '0.4rem', borderRight: '1px solid #e5e5e5', whiteSpace: 'pre-line', fontStyle: 'italic', color: '#444' }}>
                                {entry.description}
                              </td>
                              <td style={{ padding: '0.4rem', borderRight: '1px solid #e5e5e5', textAlign: 'right' }}>{entry.debit > 0 ? entry.debit.toLocaleString('en-IN', {minimumFractionDigits: 2}) : '0.00'}</td>
                              <td style={{ padding: '0.4rem', borderRight: '1px solid #e5e5e5', textAlign: 'right' }}>{entry.credit > 0 ? entry.credit.toLocaleString('en-IN', {minimumFractionDigits: 2}) : '0.00'}</td>
                              <td style={{ padding: '0.4rem', textAlign: 'right' }}>{Math.abs(entry.balance).toLocaleString('en-IN', {minimumFractionDigits: 2})} {entry.balance >= 0 ? 'CR' : 'DR'}</td>
                            </tr>
                            {expandedRowId === entry.id && (
                              <tr className="print-hide" style={{ backgroundColor: '#fdfdfd', borderBottom: '2px solid #ddd' }}>
                                <td colSpan={6} style={{ padding: '1rem', borderRight: '1px solid #e5e5e5' }}>
                                  {entry.type === 'Purchase' && (() => {
                                    const p = purchases.find(p => p.id === entry.id);
                                    if (!p) return null;
                                    return (
                                      <div style={{ padding: '1rem', border: '1px solid #eee', borderRadius: '4px', backgroundColor: '#fff', fontSize: '0.85rem' }}>
                                        <h4 style={{ margin: '0 0 1rem 0', color: '#333' }}>Purchase Details (Invoice: {p.invoiceNumber})</h4>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
                                          <thead>
                                            <tr style={{ backgroundColor: '#f9f9f9', borderBottom: '1px solid #ddd' }}>
                                              <th style={{ padding: '0.4rem', textAlign: 'left' }}>Particulars</th>
                                              <th style={{ padding: '0.4rem', textAlign: 'right' }}>Qty</th>
                                              <th style={{ padding: '0.4rem', textAlign: 'right' }}>Rate</th>
                                              <th style={{ padding: '0.4rem', textAlign: 'right' }}>Amount</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {p.items && p.items.length > 0 ? (
                                              p.items.map((item, i) => (
                                                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                                                  <td style={{ padding: '0.4rem' }}>{item.particulars}</td>
                                                  <td style={{ padding: '0.4rem', textAlign: 'right' }}>{item.quantity}</td>
                                                  <td style={{ padding: '0.4rem', textAlign: 'right' }}>{item.rate.toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
                                                  <td style={{ padding: '0.4rem', textAlign: 'right' }}>{item.amount.toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
                                                </tr>
                                              ))
                                            ) : (
                                              <tr style={{ borderBottom: '1px solid #eee' }}>
                                                <td style={{ padding: '0.4rem' }}>{p.description || 'General Purchase'}</td>
                                                <td style={{ padding: '0.4rem', textAlign: 'right' }}>-</td>
                                                <td style={{ padding: '0.4rem', textAlign: 'right' }}>-</td>
                                                <td style={{ padding: '0.4rem', textAlign: 'right' }}>{(p.subtotal || ((p.purchaseValue || 0) + (p.exemptedValue || 0))).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
                                              </tr>
                                            )}
                                          </tbody>
                                        </table>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '2rem' }}>
                                          <div style={{ textAlign: 'right' }}>
                                            <div style={{ marginBottom: '0.25rem' }}>Subtotal:</div>
                                            <div style={{ marginBottom: '0.25rem' }}>VAT (13%):</div>
                                            <div style={{ fontWeight: 700 }}>Total:</div>
                                          </div>
                                          <div style={{ textAlign: 'right' }}>
                                            <div style={{ marginBottom: '0.25rem' }}>{(p.subtotal || ((p.purchaseValue || 0) + (p.exemptedValue || 0))).toLocaleString('en-IN', {minimumFractionDigits:2})}</div>
                                            <div style={{ marginBottom: '0.25rem' }}>{p.vatAmount?.toLocaleString('en-IN', {minimumFractionDigits:2}) || '0.00'}</div>
                                            <div style={{ fontWeight: 700 }}>{p.totalAmount.toLocaleString('en-IN', {minimumFractionDigits:2})}</div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })()}
                                  {entry.type === 'Payment' && (() => {
                                    const p = payments.find(p => p.id === entry.id);
                                    if (!p) return null;
                                    return (
                                      <div style={{ padding: '1rem', border: '1px solid #eee', borderRadius: '4px', backgroundColor: '#fff', fontSize: '0.85rem' }}>
                                        <h4 style={{ margin: '0 0 1rem 0', color: '#333' }}>Payment Details</h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                          <div>
                                            <div style={{ color: '#666', marginBottom: '0.25rem' }}>Method</div>
                                            <div style={{ fontWeight: 600 }}>{p.paymentMethod}</div>
                                          </div>
                                          {p.bankId && (
                                            <div>
                                              <div style={{ color: '#666', marginBottom: '0.25rem' }}>Bank</div>
                                              <div style={{ fontWeight: 600 }}>{getBankName(p.bankId)}</div>
                                            </div>
                                          )}
                                          <div>
                                            <div style={{ color: '#666', marginBottom: '0.25rem' }}>Reference / Cheque No.</div>
                                            <div style={{ fontWeight: 600 }}>{p.referenceNumber || 'N/A'}</div>
                                          </div>
                                          <div>
                                            <div style={{ color: '#666', marginBottom: '0.25rem' }}>Remarks</div>
                                            <div style={{ fontWeight: 600, whiteSpace: 'pre-line' }}>{p.remarks || 'None'}</div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })()}
                                  {entry.type === 'TDS Held' && (
                                    <div style={{ padding: '1rem', border: '1px solid #eee', borderRadius: '4px', backgroundColor: '#fff', fontSize: '0.85rem', fontStyle: 'italic', color: '#555' }}>
                                      This entry represents the 1.5% TDS automatically deducted and held from the total taxable value of the corresponding purchase invoice.
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ borderTop: '2px solid #ccc', borderBottom: '2px solid #ccc', backgroundColor: '#fafafa' }}>
                          <td colSpan={3} style={{ padding: '0.4rem', borderRight: '1px solid #e5e5e5', fontWeight: 700 }}>Total</td>
                          <td style={{ padding: '0.4rem', borderRight: '1px solid #e5e5e5', textAlign: 'right', fontWeight: 700 }}>{totalPaid.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                          <td style={{ padding: '0.4rem', borderRight: '1px solid #e5e5e5', textAlign: 'right', fontWeight: 700 }}>{totalBilled.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                          <td style={{ padding: '0.4rem', textAlign: 'right', fontWeight: 700 }}>{Math.abs(outstandingBalance).toLocaleString('en-IN', {minimumFractionDigits: 2})} {outstandingBalance >= 0 ? 'CR' : 'DR'}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Report Footer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', fontSize: '0.75rem', fontWeight: 700, color: '#111' }}>
                    <div>
                      <div>Generated By: ADMIN</div>
                      <div>Generated On: {new Date().toLocaleDateString('en-GB')}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div>{propertyDetails?.companyName || 'LumenPMS V1.0'}</div>
                      <div>{propertyDetails?.telephone ? `Ph: ${propertyDetails.telephone}` : 'www.hotellumen.com'}</div>
                      {propertyDetails?.email && <div>{propertyDetails.email}</div>}
                    </div>
                  </div>

                </div>
              ) : (
                <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-secondary)', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-lg)' }}>
                  <p>No transactions found for this vendor.</p>
                </div>
              )
            ) : (
              <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-secondary)', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-lg)' }}>
                <BookOpen size={48} style={{ opacity: 0.2, margin: '0 auto 1rem auto' }} />
                <p>Select a vendor above to generate their statement of account.</p>
              </div>
            )}
          </div>
        )}

        {/* PURCHASE REGISTER */}
        {activeTab === 'purchases' && (() => {
          const totalTaxable = filteredPurchases.reduce((sum, p) => sum + (p.purchaseValue || 0), 0);
          const totalVat = filteredPurchases.reduce((sum, p) => sum + (p.vatAmount || 0), 0);
          const totalExempted = filteredPurchases.reduce((sum, p) => sum + (p.exemptedValue || 0), 0);
          const totalAmount = filteredPurchases.reduce((sum, p) => sum + p.totalAmount, 0);

          return (
            <div>
              {filteredPurchases.length === 0 ? (
              <p style={{ color: 'var(--color-text-secondary)' }}>No purchases recorded in this date range.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '1rem 0.5rem', color: '#0f172a', fontWeight: 600, fontSize: '0.875rem' }}>Date</th>
                      <th style={{ padding: '1rem 0.5rem', color: '#0f172a', fontWeight: 600, fontSize: '0.875rem' }}>Vendor</th>
                      <th style={{ padding: '1rem 0.5rem', color: '#0f172a', fontWeight: 600, fontSize: '0.875rem' }}>PJV #</th>
                      <th style={{ padding: '1rem 0.5rem', color: '#0f172a', fontWeight: 600, fontSize: '0.875rem' }}>Invoice #</th>
                      <th style={{ padding: '1rem 0.5rem', color: '#0f172a', fontWeight: 600, fontSize: '0.875rem', textAlign: 'right' }}>Taxable</th>
                      <th style={{ padding: '1rem 0.5rem', color: '#0f172a', fontWeight: 600, fontSize: '0.875rem', textAlign: 'right' }}>VAT (13%)</th>
                      <th style={{ padding: '1rem 0.5rem', color: '#0f172a', fontWeight: 600, fontSize: '0.875rem', textAlign: 'right' }}>Exempted</th>
                      <th style={{ padding: '1rem 0.5rem', color: '#0f172a', fontWeight: 700, fontSize: '0.875rem', textAlign: 'right' }}>Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPurchases.map((p) => (
                      <tr key={p.id} className="table-row-hover" style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }} onClick={() => router.push('/purchases/' + p.id)}>
                        <td style={{ padding: '1rem 0.5rem', color: '#334155', fontSize: '0.875rem' }}>{p.date}</td>
                        <td style={{ padding: '1rem 0.5rem', fontWeight: 600, color: '#334155', fontSize: '0.875rem' }}>{getSupplierName(p.supplierId)}</td>
                        <td style={{ padding: '1rem 0.5rem', color: '#000000', fontWeight: 600, fontSize: '0.875rem' }}>{p.pjvNumber || '-'}</td>
                        <td style={{ padding: '1rem 0.5rem', color: '#334155', fontSize: '0.875rem' }}>{p.invoiceNumber}</td>
                        <td style={{ padding: '1rem 0.5rem', textAlign: 'right', color: '#334155', fontSize: '0.875rem' }}>{p.purchaseValue ? formatCurrency(p.purchaseValue) : '-'}</td>
                        <td style={{ padding: '1rem 0.5rem', textAlign: 'right', color: '#334155', fontSize: '0.875rem' }}>{p.vatAmount ? formatCurrency(p.vatAmount) : '-'}</td>
                        <td style={{ padding: '1rem 0.5rem', textAlign: 'right', color: '#334155', fontSize: '0.875rem' }}>{p.exemptedValue ? formatCurrency(p.exemptedValue) : '-'}</td>
                        <td style={{ padding: '1rem 0.5rem', textAlign: 'right', fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>{formatCurrency(p.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                      <td colSpan={4} style={{ padding: '1rem 0.5rem', fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>Total</td>
                      <td style={{ padding: '1rem 0.5rem', textAlign: 'right', fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>{formatCurrency(totalTaxable)}</td>
                      <td style={{ padding: '1rem 0.5rem', textAlign: 'right', fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>{formatCurrency(totalVat)}</td>
                      <td style={{ padding: '1rem 0.5rem', textAlign: 'right', fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>{formatCurrency(totalExempted)}</td>
                      <td style={{ padding: '1rem 0.5rem', textAlign: 'right', fontWeight: 800, color: '#000000', fontSize: '0.875rem' }}>{formatCurrency(totalAmount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        );
        })()}

        {/* PJV REGISTER */}
        {activeTab === 'pjv' && (() => {
          const totalAmount = pjvList.reduce((sum, p) => sum + p.totalAmount, 0);

          return (
            <div>
              {pjvList.length === 0 ? (
              <p style={{ color: 'var(--color-text-secondary)' }}>No PJVs recorded in this date range.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '1rem 0.5rem', color: '#0f172a', fontWeight: 600, fontSize: '0.875rem' }}>PJV #</th>
                      <th style={{ padding: '1rem 0.5rem', color: '#0f172a', fontWeight: 600, fontSize: '0.875rem' }}>Date</th>
                      <th style={{ padding: '1rem 0.5rem', color: '#0f172a', fontWeight: 600, fontSize: '0.875rem' }}>Vendor</th>
                      <th style={{ padding: '1rem 0.5rem', color: '#0f172a', fontWeight: 600, fontSize: '0.875rem' }}>Invoice #</th>
                      <th style={{ padding: '1rem 0.5rem', color: '#0f172a', fontWeight: 700, fontSize: '0.875rem', textAlign: 'right' }}>Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pjvList.map((p) => (
                      <tr key={p.id} className="table-row-hover" style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }} onClick={() => router.push('/purchases/' + p.id)}>
                        <td style={{ padding: '1rem 0.5rem', color: '#000000', fontWeight: 700, fontSize: '0.875rem' }}>{p.pjvNumber || '-'}</td>
                        <td style={{ padding: '1rem 0.5rem', color: '#334155', fontSize: '0.875rem' }}>{p.date}</td>
                        <td style={{ padding: '1rem 0.5rem', fontWeight: 600, color: '#334155', fontSize: '0.875rem' }}>{getSupplierName(p.supplierId)}</td>
                        <td style={{ padding: '1rem 0.5rem', color: '#334155', fontSize: '0.875rem' }}>{p.invoiceNumber}</td>
                        <td style={{ padding: '1rem 0.5rem', textAlign: 'right', fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>{formatCurrency(p.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                      <td colSpan={4} style={{ padding: '1rem 0.5rem', fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>Total</td>
                      <td style={{ padding: '1rem 0.5rem', textAlign: 'right', fontWeight: 800, color: '#000000', fontSize: '0.875rem' }}>{formatCurrency(totalAmount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        );
        })()}

        {/* PAYMENT REGISTER */}
        {activeTab === 'payments' && (() => {
          const totalAmountPaid = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

          return (
            <div>
              {filteredPayments.length === 0 ? (
              <p style={{ color: 'var(--color-text-secondary)' }}>No payments recorded in this date range.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '1rem 0.5rem', color: '#0f172a', fontWeight: 600, fontSize: '0.875rem' }}>Date</th>
                      <th style={{ padding: '1rem 0.5rem', color: '#0f172a', fontWeight: 600, fontSize: '0.875rem' }}>Vendor</th>
                      <th style={{ padding: '1rem 0.5rem', color: '#0f172a', fontWeight: 600, fontSize: '0.875rem' }}>Paid From</th>
                      <th style={{ padding: '1rem 0.5rem', color: '#0f172a', fontWeight: 600, fontSize: '0.875rem' }}>Method</th>
                      <th style={{ padding: '1rem 0.5rem', color: '#0f172a', fontWeight: 600, fontSize: '0.875rem' }}>Reference</th>
                      <th style={{ padding: '1rem 0.5rem', color: '#0f172a', fontWeight: 700, fontSize: '0.875rem', textAlign: 'right' }}>Amount Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((p) => (
                      <tr key={p.id} className="table-row-hover" style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }} onClick={() => router.push('/payments/' + p.id)}>
                        <td style={{ padding: '1rem 0.5rem', color: '#334155', fontSize: '0.875rem' }}>{p.date}</td>
                        <td style={{ padding: '1rem 0.5rem', fontWeight: 600, color: '#334155', fontSize: '0.875rem' }}>{getSupplierName(p.supplierId)}</td>
                        <td style={{ padding: '1rem 0.5rem', color: '#334155', fontSize: '0.875rem' }}>{p.bankId ? getBankName(p.bankId) : 'Cash'}</td>
                        <td style={{ padding: '1rem 0.5rem', color: '#334155', fontSize: '0.875rem' }}>{p.paymentMethod}</td>
                        <td style={{ padding: '1rem 0.5rem', color: '#475569', fontSize: '0.875rem' }}>{p.referenceNumber || '-'}</td>
                        <td style={{ padding: '1rem 0.5rem', textAlign: 'right', fontWeight: 700, color: '#000000', fontSize: '0.875rem' }}>{formatCurrency(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                      <td colSpan={5} style={{ padding: '1rem 0.5rem', fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>Total Amount Paid</td>
                      <td style={{ padding: '1rem 0.5rem', textAlign: 'right', fontWeight: 800, color: '#000000', fontSize: '0.875rem' }}>{formatCurrency(totalAmountPaid)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        );
        })()}

        {/* TDS REPORT */}
        {activeTab === 'tds' && (
          <div>
              <div className="print-hide" style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ width: '300px' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>Filter by Vendor</label>
                  <SearchableSelect 
                    options={[{ value: '', label: 'All Vendors' }, ...suppliers.map(s => ({ value: s.id, label: s.companyName }))]}
                    value={selectedTdsSupplierId}
                    onChange={setSelectedTdsSupplierId}
                    placeholder="Search vendor..."
                  />
                </div>

                <div style={{ padding: '1.25rem', backgroundColor: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: 'var(--radius-md)' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#000000', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Total TDS Held in Period</p>
                  <p style={{ fontSize: '1.75rem', fontWeight: 700, color: '#000000' }}>{formatCurrency(totalTdsHeld)}</p>
                </div>
              </div>
            
            {tdsPurchases.length === 0 ? (
              <p style={{ color: 'var(--color-text-secondary)' }}>No TDS held in this date range.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '1rem 0.5rem', color: '#0f172a', fontWeight: 600, fontSize: '0.875rem' }}>Date</th>
                      <th style={{ padding: '1rem 0.5rem', color: '#0f172a', fontWeight: 600, fontSize: '0.875rem' }}>Vendor</th>
                      <th style={{ padding: '1rem 0.5rem', color: '#0f172a', fontWeight: 600, fontSize: '0.875rem' }}>PJV #</th>
                      <th style={{ padding: '1rem 0.5rem', color: '#0f172a', fontWeight: 600, fontSize: '0.875rem' }}>Invoice #</th>
                      <th style={{ padding: '1rem 0.5rem', color: '#0f172a', fontWeight: 600, fontSize: '0.875rem', textAlign: 'right' }}>Taxable Amount</th>
                      <th style={{ padding: '1rem 0.5rem', color: '#0f172a', fontWeight: 700, fontSize: '0.875rem', textAlign: 'right' }}>TDS Held (1.5%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tdsPurchases.map((p) => (
                      <tr key={p.id} className="table-row-hover" style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }} onClick={() => router.push('/purchases/' + p.id)}>
                        <td style={{ padding: '1rem 0.5rem', color: '#334155', fontSize: '0.875rem' }}>{p.date}</td>
                        <td style={{ padding: '1rem 0.5rem', fontWeight: 600, color: '#334155', fontSize: '0.875rem' }}>{getSupplierName(p.supplierId)}</td>
                        <td style={{ padding: '1rem 0.5rem', color: '#000000', fontWeight: 600, fontSize: '0.875rem' }}>{p.pjvNumber || '-'}</td>
                        <td style={{ padding: '1rem 0.5rem', color: '#334155', fontSize: '0.875rem' }}>{p.invoiceNumber}</td>
                        <td style={{ padding: '1rem 0.5rem', textAlign: 'right', color: '#475569', fontSize: '0.875rem' }}>{p.purchaseValue ? formatCurrency(p.purchaseValue) : '-'}</td>
                        <td style={{ padding: '1rem 0.5rem', textAlign: 'right', fontWeight: 700, color: '#000000', fontSize: '0.875rem' }}>{p.tdsAmount ? formatCurrency(p.tdsAmount) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* EXPENSE HEAD REPORT */}
        {activeTab === 'expenses' && (
          <div>
            {expenseSummary.length === 0 ? (
              <p style={{ color: 'var(--color-text-secondary)' }}>No expenses recorded in this date range.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '1rem 0.5rem', color: '#0f172a', fontWeight: 600, fontSize: '0.875rem' }}>Expense Head</th>
                      <th style={{ padding: '1rem 0.5rem', color: '#0f172a', fontWeight: 600, fontSize: '0.875rem' }}>Description</th>
                      <th style={{ padding: '1rem 0.5rem', color: '#0f172a', fontWeight: 600, fontSize: '0.875rem', textAlign: 'right' }}>Taxable Amount</th>
                      <th style={{ padding: '1rem 0.5rem', color: '#0f172a', fontWeight: 600, fontSize: '0.875rem', textAlign: 'right' }}>VAT</th>
                      <th style={{ padding: '1rem 0.5rem', color: '#0f172a', fontWeight: 600, fontSize: '0.875rem', textAlign: 'right' }}>Exempted</th>
                      <th style={{ padding: '1rem 0.5rem', color: '#0f172a', fontWeight: 700, fontSize: '0.875rem', textAlign: 'right' }}>Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenseSummary.map((row) => (
                      <Fragment key={row.id}>
                        <tr className="table-row-hover" style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }} onClick={() => setExpandedRowId(expandedRowId === row.id ? null : (row.id || null))}>
                          <td style={{ padding: '1rem 0.5rem', fontWeight: 600, color: '#334155', fontSize: '0.875rem' }}>{row.name}</td>
                          <td style={{ padding: '1rem 0.5rem', color: '#334155', fontSize: '0.875rem' }}>{row.description}</td>
                          <td style={{ padding: '1rem 0.5rem', textAlign: 'right', color: '#475569', fontSize: '0.875rem' }}>{formatCurrency(row.taxable)}</td>
                          <td style={{ padding: '1rem 0.5rem', textAlign: 'right', color: '#475569', fontSize: '0.875rem' }}>{formatCurrency(row.vat)}</td>
                          <td style={{ padding: '1rem 0.5rem', textAlign: 'right', color: '#475569', fontSize: '0.875rem' }}>{formatCurrency(row.exempt)}</td>
                          <td style={{ padding: '1rem 0.5rem', textAlign: 'right', fontWeight: 700, color: '#000000', fontSize: '0.875rem' }}>{formatCurrency(row.total)}</td>
                        </tr>
                        {expandedRowId === row.id && (
                          <tr style={{ backgroundColor: '#f8fafc' }}>
                            <td colSpan={6} style={{ padding: '1.5rem' }}>
                              
                              {row.subLedgers && row.subLedgers.length > 0 && (
                                <div style={{ marginBottom: '1.5rem' }}>
                                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e293b', fontSize: '0.875rem' }}>Sub Ledger Breakdown</h4>
                                  <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                    <thead>
                                      <tr style={{ backgroundColor: '#e2e8f0' }}>
                                        <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 600, color: '#1e293b' }}>Sub Ledger Name</th>
                                        <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 600, color: '#1e293b' }}>Taxable</th>
                                        <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 600, color: '#1e293b' }}>VAT</th>
                                        <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 600, color: '#1e293b' }}>Exempted</th>
                                        <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 700, color: '#1e293b' }}>Total</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {row.subLedgers.map((sl: any) => (
                                        <tr key={sl.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                          <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600, color: '#334155' }}>{sl.name}</td>
                                          <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#475569' }}>{formatCurrency(sl.taxable)}</td>
                                          <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#475569' }}>{formatCurrency(sl.vat)}</td>
                                          <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#475569' }}>{formatCurrency(sl.exempt)}</td>
                                          <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 700, color: '#000000' }}>{formatCurrency(sl.total)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e293b', fontSize: '0.875rem' }}>Transaction Details</h4>
                              <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                <thead>
                                  <tr style={{ backgroundColor: '#f1f5f9' }}>
                                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#334155' }}>Date</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#334155' }}>Supplier</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#334155' }}>PJV #</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#334155' }}>Invoice #</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, color: '#334155' }}>Taxable</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, color: '#334155' }}>Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {row.purchases.map((p: Purchase) => (
                                    <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }} onClick={() => router.push('/purchases/' + p.id)} className="table-row-hover">
                                      <td style={{ padding: '0.75rem', color: '#475569' }}>{p.date}</td>
                                      <td style={{ padding: '0.75rem', fontWeight: 600, color: '#334155' }}>{getSupplierName(p.supplierId)}</td>
                                      <td style={{ padding: '0.75rem', color: '#000000', fontWeight: 600 }}>{p.pjvNumber || '-'}</td>
                                      <td style={{ padding: '0.75rem', color: '#475569' }}>{p.invoiceNumber}</td>
                                      <td style={{ padding: '0.75rem', textAlign: 'right', color: '#475569' }}>{p.purchaseValue ? formatCurrency(p.purchaseValue) : '-'}</td>
                                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, color: '#000000' }}>{formatCurrency(p.totalAmount)}</td>
                                    </tr>
                                  ))}
                                  {row.purchases.length === 0 && (
                                    <tr>
                                      <td colSpan={6} style={{ padding: '1rem', textAlign: 'center', color: '#64748b' }}>No transactions found.</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid #ccc', borderBottom: '2px solid #ccc', backgroundColor: '#fafafa' }}>
                      <td colSpan={2} style={{ padding: '0.4rem', borderRight: '1px solid #e5e5e5', fontWeight: 700 }}>Total</td>
                      <td style={{ padding: '0.4rem', borderRight: '1px solid #e5e5e5', textAlign: 'right', fontWeight: 700 }}>{formatCurrency(expenseSummary.reduce((sum, r) => sum + r.taxable, 0))}</td>
                      <td style={{ padding: '0.4rem', borderRight: '1px solid #e5e5e5', textAlign: 'right', fontWeight: 700 }}>{formatCurrency(expenseSummary.reduce((sum, r) => sum + r.vat, 0))}</td>
                      <td style={{ padding: '0.4rem', borderRight: '1px solid #e5e5e5', textAlign: 'right', fontWeight: 700 }}>{formatCurrency(expenseSummary.reduce((sum, r) => sum + r.exempt, 0))}</td>
                      <td style={{ padding: '0.4rem', textAlign: 'right', fontWeight: 700 }}>{formatCurrency(expenseSummary.reduce((sum, r) => sum + r.total, 0))}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* AGEING REPORT */}
        {activeTab === 'ageing' && (
          <div>
            {ageingReport.length === 0 ? (
              <p style={{ color: 'var(--color-text-secondary)' }}>No outstanding balances found for any supplier.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '1rem 0.5rem', color: '#0f172a', fontWeight: 600, fontSize: '0.875rem' }}>Supplier Name</th>
                      <th style={{ padding: '1rem 0.5rem', color: '#0f172a', fontWeight: 600, fontSize: '0.875rem', textAlign: 'right' }}>0 - 30 Days</th>
                      <th style={{ padding: '1rem 0.5rem', color: '#0f172a', fontWeight: 600, fontSize: '0.875rem', textAlign: 'right' }}>31 - 60 Days</th>
                      <th style={{ padding: '1rem 0.5rem', color: '#0f172a', fontWeight: 600, fontSize: '0.875rem', textAlign: 'right' }}>61 - 90 Days</th>
                      <th style={{ padding: '1rem 0.5rem', color: '#0f172a', fontWeight: 600, fontSize: '0.875rem', textAlign: 'right' }}>&gt; 90 Days</th>
                      <th style={{ padding: '1rem 0.5rem', color: '#0f172a', fontWeight: 700, fontSize: '0.875rem', textAlign: 'right' }}>Total Outstanding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ageingReport.map((row) => (
                      <Fragment key={row.supplierId}>
                        <tr className="table-row-hover" style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }} onClick={() => setExpandedRowId(expandedRowId === row.supplierId ? null : (row.supplierId || null))}>
                          <td style={{ padding: '1rem 0.5rem', fontWeight: 600, color: '#334155', fontSize: '0.875rem' }}>{row.supplierName}</td>
                          <td style={{ padding: '1rem 0.5rem', textAlign: 'right', color: '#475569', fontSize: '0.875rem' }}>{row.bucket0_30 ? formatCurrency(row.bucket0_30) : '-'}</td>
                          <td style={{ padding: '1rem 0.5rem', textAlign: 'right', color: '#475569', fontSize: '0.875rem' }}>{row.bucket31_60 ? formatCurrency(row.bucket31_60) : '-'}</td>
                          <td style={{ padding: '1rem 0.5rem', textAlign: 'right', color: '#475569', fontSize: '0.875rem' }}>{row.bucket61_90 ? formatCurrency(row.bucket61_90) : '-'}</td>
                          <td style={{ padding: '1rem 0.5rem', textAlign: 'right', color: '#ef4444', fontWeight: 600, fontSize: '0.875rem' }}>{row.bucket90Plus ? formatCurrency(row.bucket90Plus) : '-'}</td>
                          <td style={{ padding: '1rem 0.5rem', textAlign: 'right', fontWeight: 700, color: '#000000', fontSize: '0.875rem' }}>{formatCurrency(row.totalOutstanding)}</td>
                        </tr>
                        {expandedRowId === row.supplierId && (
                          <tr style={{ backgroundColor: '#f8fafc' }}>
                            <td colSpan={6} style={{ padding: '1.5rem' }}>
                              <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e293b', fontSize: '0.875rem' }}>Outstanding Invoices Breakdown (FIFO Method)</h4>
                              <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                <thead>
                                  <tr style={{ backgroundColor: '#f1f5f9' }}>
                                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#334155' }}>Invoice Date</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#334155' }}>Invoice #</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600, color: '#334155' }}>Age (Days)</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, color: '#334155' }}>Invoice Total (Net of TDS)</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, color: '#334155' }}>Unpaid Amount</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {row.outstandingPurchases.map((p: any) => (
                                    <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }} onClick={() => router.push('/purchases/' + p.id)} className="table-row-hover">
                                      <td style={{ padding: '0.75rem', color: '#475569' }}>{p.date}</td>
                                      <td style={{ padding: '0.75rem', color: '#475569' }}>{p.invoiceNumber}</td>
                                      <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600, color: p.ageInDays > 90 ? '#ef4444' : '#334155' }}>{p.ageInDays} Days</td>
                                      <td style={{ padding: '0.75rem', textAlign: 'right', color: '#475569' }}>{formatCurrency(p.totalAmount - (p.tdsAmount || 0))}</td>
                                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, color: '#000000' }}>{formatCurrency(p.unpaidAmount)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid #ccc', borderBottom: '2px solid #ccc', backgroundColor: '#fafafa' }}>
                      <td style={{ padding: '0.4rem 0.5rem', fontWeight: 700, color: '#0f172a' }}>Total</td>
                      <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right', fontWeight: 700 }}>{formatCurrency(ageingReport.reduce((sum, r) => sum + r.bucket0_30, 0))}</td>
                      <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right', fontWeight: 700 }}>{formatCurrency(ageingReport.reduce((sum, r) => sum + r.bucket31_60, 0))}</td>
                      <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right', fontWeight: 700 }}>{formatCurrency(ageingReport.reduce((sum, r) => sum + r.bucket61_90, 0))}</td>
                      <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>{formatCurrency(ageingReport.reduce((sum, r) => sum + r.bucket90Plus, 0))}</td>
                      <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right', fontWeight: 800 }}>{formatCurrency(ageingReport.reduce((sum, r) => sum + r.totalOutstanding, 0))}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem' }}>Loading reports...</div>}>
      <ReportsContent />
    </Suspense>
  )
}
