import { describe, it, expect, vi } from 'vitest';
import { MockPaymentProvider } from '../../../services/payment/MockPaymentProvider';
import type { PaymentResult } from '../../../services/payment/types';

describe('MockPaymentProvider', () => {
  describe('pay()', () => {
    it('success 模式返回成功结果', async () => {
      const provider = new MockPaymentProvider('success');
      const result = await provider.pay('order-1', 99.9, 'VIP月度订阅');

      expect(result.success).toBe(true);
      expect(result.amount).toBe(99.9);
      expect(result.transactionId).toMatch(/^MOCK_/);
      expect(result.message).toBe('支付成功');
      expect(typeof result.timestamp).toBe('string');
    });

    it('failure 模式返回失败结果但不抛异常', async () => {
      const provider = new MockPaymentProvider('failure');
      const result = await provider.pay('order-2', 50, '测试');

      expect(result.success).toBe(false);
      expect(result.transactionId).toMatch(/^MOCK_/);
      expect(result.message).toBe('模拟支付失败：余额不足');
    });

    it('timeout 模式抛出超时错误', async () => {
      const provider = new MockPaymentProvider('timeout');

      await expect(provider.pay('order-3', 30, '超时测试')).rejects.toThrow('支付超时，请稍后重试');
    });

    it('默认 (success) 模式返回成功', async () => {
      const provider = new MockPaymentProvider();
      const result = await provider.pay('order-4', 10, '默认测试');

      expect(result.success).toBe(true);
      expect(result.transactionId).toMatch(/^MOCK_/);
    });

    it('setMode 切换模式生效', { timeout: 10000 }, async () => {
      const provider = new MockPaymentProvider('success');
      let result = await provider.pay('order-5', 100, '测试');
      expect(result.success).toBe(true);

      provider.setMode('failure');
      result = await provider.pay('order-6', 100, '测试');
      expect(result.success).toBe(false);

      provider.setMode('timeout');
      await expect(provider.pay('order-7', 100, '测试')).rejects.toThrow('支付超时，请稍后重试');
    });

    it('每次支付生成不同的 transactionId', async () => {
      const provider = new MockPaymentProvider('success');
      const result1 = await provider.pay('a', 1, '');
      const result2 = await provider.pay('b', 1, '');

      expect(result1.transactionId).not.toBe(result2.transactionId);
    });
  });

  describe('query()', () => {
    it('返回已完成结果', async () => {
      const provider = new MockPaymentProvider();
      const result = await provider.query('TX_12345');

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('TX_12345');
      expect(result.message).toBe('交易已完成');
    });
  });

  describe('refund()', () => {
    it('返回退款成功结果', async () => {
      const provider = new MockPaymentProvider();
      const result = await provider.refund('TX_REFUND', 199);

      expect(result.success).toBe(true);
      expect(result.amount).toBe(199);
      expect(result.message).toBe('退款成功');
    });
  });

  describe('callback()', () => {
    it('返回回调处理成功结果', async () => {
      const provider = new MockPaymentProvider();
      const result = await provider.callback({ transaction_id: 'CB_001', amount: 299 });

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('CB_001');
      expect(result.amount).toBe(299);
      expect(result.message).toBe('回调处理成功');
    });

    it('无数据时生成默认 transactionId', async () => {
      const provider = new MockPaymentProvider();
      const result = await provider.callback({});

      expect(result.success).toBe(true);
      expect(result.transactionId).toMatch(/^MOCK_/);
      expect(result.amount).toBe(0);
    });
  });
});

describe('Payment Provider Integration', () => {
  it('AlipayProvider.pay() 抛出预期网关未配置错误', async () => {
    const { AlipayProvider } = await import('../../../services/payment/AlipayProvider');
    const provider = new AlipayProvider();

    await expect(provider.pay('o1', 10, 'test')).rejects.toThrow(/支付网关未在生产环境配置/);
  });

  it('AlipayProvider.query() 抛出网关未配置错误', async () => {
    const { AlipayProvider } = await import('../../../services/payment/AlipayProvider');
    const provider = new AlipayProvider();

    await expect(provider.query('t1')).rejects.toThrow(/支付网关未在生产环境配置/);
  });

  it('WechatPayProvider.pay() 抛出预期网关未配置错误', async () => {
    const { WechatPayProvider } = await import('../../../services/payment/WechatPayProvider');
    const provider = new WechatPayProvider();

    await expect(provider.pay('o1', 10, 'test')).rejects.toThrow(/支付网关未在生产环境配置/);
  });

  it('WechatPayProvider.query() 抛出网关未配置错误', async () => {
    const { WechatPayProvider } = await import('../../../services/payment/WechatPayProvider');
    const provider = new WechatPayProvider();

    await expect(provider.query('t1')).rejects.toThrow(/支付网关未在生产环境配置/);
  });
});

describe('createPaymentProvider (factory)', () => {
  it('mock 参数返回 MockPaymentProvider', async () => {
    const { createPaymentProvider } = await import('../../../services/payment/index');
    const provider = createPaymentProvider('mock');

    expect(provider).toBeDefined();
    const result = await provider.pay('factory-1', 10, 'test');
    expect(result.success).toBe(true);
  });

  it('alipay 参数返回 AlipayProvider (将抛出错误)', async () => {
    const { createPaymentProvider } = await import('../../../services/payment/index');
    const provider = createPaymentProvider('alipay');

    await expect(provider.pay('f1', 10, '')).rejects.toThrow(/支付网关未在生产环境配置/);
  });

  it('wechat 参数返回 WechatPayProvider (将抛出错误)', async () => {
    const { createPaymentProvider } = await import('../../../services/payment/index');
    const provider = createPaymentProvider('wechat');

    await expect(provider.pay('f1', 10, '')).rejects.toThrow(/支付网关未在生产环境配置/);
  });

  it('getMockPaymentProvider 返回单例', async () => {
    const { getMockPaymentProvider } = await import('../../../services/payment/index');
    const p1 = getMockPaymentProvider();
    const p2 = getMockPaymentProvider();

    expect(p1).toBe(p2);
  });
});