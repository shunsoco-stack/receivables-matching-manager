export type Customer = { id: string; name: string; kana: string };

export type Note = {
  id: string;
  date: string;
  method: "電話" | "メール" | "訪問";
  content: string;
};

export type PromisePayment = {
  date: string;
  amount: number;
  baseline: number;
};

export type Invoice = {
  id: string;
  customerId: string;
  number: string;
  amount: number;
  issued: string;
  due: string;
  notes: Note[];
  promise?: PromisePayment;
};

export type Deposit = {
  id: string;
  date: string;
  name: string;
  amount: number;
};

export type Allocation = {
  invoiceId: string;
  amount: number;
  fee: number;
};

export type Match = {
  id: string;
  date: string;
  depositId: string;
  allocations: Allocation[];
  canceledAt?: string;
};

export type Data = {
  version: 1;
  customers: Customer[];
  invoices: Invoice[];
  deposits: Deposit[];
  matches: Match[];
  feeLimit: number;
};
