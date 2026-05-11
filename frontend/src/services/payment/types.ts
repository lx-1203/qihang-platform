export interface PaymentResult {
  success: boolean;
  transactionId: string;
  amount: number;
  timestamp: string;
  message?: string;
}

export interface PaymentProvider {
  pay(orderId: string, amount: number, description: string): Promise<PaymentResult>;
  query(transactionId: string): Promise<PaymentResult>;
  refund(transactionId: string, amount: number): Promise<PaymentResult>;
  callback(data: Record<string, unknown>): Promise<PaymentResult>;
}

export type PaymentMethod = 'mock' | 'alipay' | 'wechat';

export type PayMode = 'success' | 'failure' | 'timeout';