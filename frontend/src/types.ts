export interface Order {
  id: string;
  customerName: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  status: string;
  createdAt: string;
}

export interface NewOrder {
  customerName: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}
