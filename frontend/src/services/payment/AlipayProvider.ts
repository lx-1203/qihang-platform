import type { PaymentProvider, PaymentResult } from './types';

export class AlipayProvider implements PaymentProvider {
  async pay(): Promise<PaymentResult> {
    throw new Error('支付宝支付网关未在生产环境配置');
  }

  async query(): Promise<PaymentResult> {
    throw new Error('支付宝支付网关未在生产环境配置');
  }

  async refund(): Promise<PaymentResult> {
    throw new Error('支付宝支付网关未在生产环境配置');
  }

  async callback(): Promise<PaymentResult> {
    throw new Error('支付宝支付网关未在生产环境配置');
  }
}