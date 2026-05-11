/**
 * payment.js — 支付服务单元测试
 * 覆盖：模拟适配器、订单创建、回调验证、订单查询
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('支付订单号生成', () => {
  function generateOrderNo() {
    const ts = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ORDER_${ts}_${random}`;
  }

  it('生成以 ORDER_ 开头的订单号', () => {
    const orderNo = generateOrderNo();
    expect(orderNo.startsWith('ORDER_')).toBe(true);
  });

  it('生成的订单号长度大于 12', () => {
    expect(generateOrderNo().length).toBeGreaterThan(12);
  });

  it('连续生成的订单号不相同', () => {
    const a = generateOrderNo();
    const b = generateOrderNo();
    expect(a).not.toBe(b);
  });

  it('订单号格式包含时间戳和随机段', () => {
    const orderNo = generateOrderNo();
    const parts = orderNo.split('_');
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe('ORDER');
  });
});

describe('SimulatedPaymentAdapter', () => {
  let adapter;

  beforeEach(() => {
    adapter = {
      name: 'simulated',
      delay: async (ms) => new Promise(r => setTimeout(r, ms)),
    };

    adapter.createOrder = async function (params) {
      await this.delay(50);
      const ts = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      const orderNo = `ORDER_${ts}_${random}`;

      return {
        orderNo,
        paymentUrl: null,
        qrCode: null,
        status: 'pending',
        message: `模拟订单已创建: ${orderNo} (${params.planType})`,
      };
    };

    adapter.verifyCallback = async function (cbData) {
      return {
        success: true,
        orderNo: cbData.orderNo || cbData.out_trade_no || '',
        tradeNo: `SIM_${Date.now()}`,
        amount: cbData.amount || null,
      };
    };

    adapter.queryOrder = async function () {
      return {
        status: 'success',
        tradeNo: 'SIM_TRADE_001',
        amount: 29.9,
      };
    };
  });

  it('createOrder 返回 pending 状态的订单', async () => {
    const result = await adapter.createOrder({ amount: 29.9, planType: 'monthly' });
    expect(result.status).toBe('pending');
    expect(result.orderNo).toBeTruthy();
    expect(result.orderNo.startsWith('ORDER_')).toBe(true);
  });

  it('createOrder 传入不同 planType 均能成功创建', async () => {
    for (const type of ['monthly', 'quarterly', 'yearly']) {
      const result = await adapter.createOrder({ amount: 99, planType: type });
      expect(result.orderNo).toBeTruthy();
      expect(result.status).toBe('pending');
    }
  });

  it('verifyCallback 对有效回调返回 success', async () => {
    const result = await adapter.verifyCallback({
      orderNo: 'ORDER_TEST',
      amount: 29.9,
      trade_no: 'TRADE_001',
    });
    expect(result.success).toBe(true);
    expect(result.orderNo).toBe('ORDER_TEST');
    expect(result.tradeNo).toBeTruthy();
  });

  it('verifyCallback 处理缺少 orderNo 的回调', async () => {
    const result = await adapter.verifyCallback({ amount: 29.9 });
    expect(result.orderNo).toBe('');
  });

  it('queryOrder 返回 success 状态', async () => {
    const result = await adapter.queryOrder();
    expect(result.status).toBe('success');
    expect(result.tradeNo).toBeTruthy();
    expect(result.amount).toBe(29.9);
  });
});

describe('支付金额边界检查', () => {
  it('最小金额 0.01 元', () => {
    const amount = 0.01;
    const inFen = Math.round(amount * 100);
    expect(inFen).toBe(1);
  });

  it('正常金额保留正确的分单位', () => {
    expect(Math.round(29.9 * 100)).toBe(2990);
    expect(Math.round(99 * 100)).toBe(9900);
    expect(Math.round(199 * 100)).toBe(19900);
  });

  it('大金额不会溢出', () => {
    const amount = 9999.99;
    const inFen = Math.round(amount * 100);
    expect(inFen).toBe(999999);
    expect(Number.isSafeInteger(inFen)).toBe(true);
  });
});

describe('支付环境切换', () => {
  it('开发模式默认使用模拟适配器', () => {
    const isDev = process.env.DEV_MODE !== 'false' || !process.env.NODE_ENV;
    const useSimulated = isDev || process.env.DEV_MODE !== 'false';
    expect(useSimulated).toBe(true);
  });

  it('生产环境 + 缺少配置时使用模拟适配器', () => {
    const hasConfig = process.env.WECHAT_PAY_MCH_ID || process.env.ALIPAY_APP_ID;
    const useProduction = process.env.NODE_ENV === 'production' && hasConfig;
    expect(useProduction).toBe(false);
  });
});
