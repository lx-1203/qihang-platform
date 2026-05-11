import type { PaymentProvider, PaymentResult, PayMode } from './types';

function generateTransactionId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `MOCK_${timestamp}_${random}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export class MockPaymentProvider implements PaymentProvider {
  private mode: PayMode;

  constructor(mode: PayMode = 'success') {
    this.mode = mode;
  }

  setMode(mode: PayMode): void {
    this.mode = mode;
  }

  async pay(_orderId: string, amount: number, _description: string): Promise<PaymentResult> {
    const waitMs = randomBetween(1500, 2500);
    await delay(waitMs);

    const transactionId = generateTransactionId();

    if (this.mode === 'timeout') {
      throw new Error('支付超时，请稍后重试');
    }

    if (this.mode === 'failure') {
      return {
        success: false,
        transactionId,
        amount,
        timestamp: new Date().toISOString(),
        message: '模拟支付失败：余额不足',
      };
    }

    return {
      success: true,
      transactionId,
      amount,
      timestamp: new Date().toISOString(),
      message: '支付成功',
    };
  }

  async query(transactionId: string): Promise<PaymentResult> {
    await delay(300);
    return {
      success: true,
      transactionId,
      amount: 0,
      timestamp: new Date().toISOString(),
      message: '交易已完成',
    };
  }

  async refund(transactionId: string, amount: number): Promise<PaymentResult> {
    await delay(500);
    return {
      success: true,
      transactionId,
      amount,
      timestamp: new Date().toISOString(),
      message: '退款成功',
    };
  }

  async callback(data: Record<string, unknown>): Promise<PaymentResult> {
    return {
      success: true,
      transactionId: (data.transaction_id as string) || generateTransactionId(),
      amount: Number(data.amount) || 0,
      timestamp: new Date().toISOString(),
      message: '回调处理成功',
    };
  }
}