export interface PropertyDetails {
  id?: string;
  companyName: string;
  address: string;
  vatPan: string;
  telephone: string;
  email?: string;
  currency?: string;
  fiscalYearStart?: string;
  fiscalYearEnd?: string;
  createdAt?: any;
}

export interface Supplier {
  id?: string;
  companyName: string;
  vatNumber: string;
  address: string;
  telephone: string;
  isVatRegistered?: boolean;
  createdAt?: any;
}

export interface Bank {
  id?: string;
  name: string;
  accountNumber: string;
  createdAt?: any;
}

export interface SubLedger {
  id: string;
  name: string;
}

export interface ExpenseHead {
  id?: string;
  name: string;
  description: string;
  subLedgers?: SubLedger[];
  createdAt?: any;
}

export interface PurchaseItem {
  id: string;
  particulars: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Purchase {
  id?: string;
  date: string;
  invoiceNumber: string;
  pjvNumber?: string;
  voucherType?: string;
  supplierId: string;
  expenseHeadId: string;
  subLedger?: string;
  
  exemptedValue?: number;
  purchaseValue?: number;
  
  amount?: number;
  items?: PurchaseItem[];
  subtotal?: number;
  vatAmount?: number;
  totalAmount: number;
  isTdsApplicable?: boolean;
  tdsAmount?: number;
  
  description: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface Payment {
  id?: string;
  paymentNumber?: string;
  supplierId: string;
  bankId?: string;
  date: string;
  paymentMethod: string;
  referenceNumber?: string;
  amount: number;
  remarks?: string;
  createdAt?: any;
  updatedAt?: any;
}
