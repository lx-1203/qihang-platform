import type { PaymentProvider, PaymentMethod } from './types';
import { MockPaymentProvider } from './MockPaymentProvider';
import { AlipayProvider } from './AlipayProvider';
import { WechatPayProvider } from './WechatPayProvider';

let mockProviderInstance: MockPaymentProvider | null = null;

function getMockProvider(): MockPaymentProvider {
  if (!mockProviderInstance) {
    mockProviderInstance = new MockPaymentProvider();
  }
  return mockProviderInstance;
}

export function createPaymentProvider(type?: PaymentMethod): PaymentProvider {
  const providerType = type || resolveDefaultProvider();

  switch (providerType) {
    case 'alipay':
      return new AlipayProvider();
    case 'wechat':
      return new WechatPayProvider();
    case 'mock':
    default:
      return getMockProvider();
  }
}

function resolveDefaultProvider(): PaymentMethod {
  try {
    const envProvider = import.meta.env.VITE_PAYMENT_PROVIDER as PaymentMethod | undefined;
    if (envProvider && ['mock', 'alipay', 'wechat'].includes(envProvider)) {
      return envProvider;
    }
  } catch {
    // import.meta.env 不可用时回退
  }

  if (import.meta.env.DEV) {
    return 'mock';
  }

  return 'alipay';
}

export function getMockPaymentProvider(): MockPaymentProvider {
  return getMockProvider();
}

export type { PaymentProvider, PaymentResult, PaymentMethod } from './types';
export { MockPaymentProvider } from './MockPaymentProvider';
export { AlipayProvider } from './AlipayProvider';
export { WechatPayProvider } from './WechatPayProvider';