import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('./wechat-pay.js', () => ({
  WechatPayService: vi.fn().mockImplementation(() => ({
    createNativeOrder: vi.fn().mockResolvedValue({
      orderNo: 'WX-TEST-001',
      codeUrl: 'weixin://wxpay/bizpayurl?pr=test',
    }),
    createJsapiOrder: vi.fn().mockResolvedValue({
      orderNo: 'WX-JSAPI-001',
      prepayId: 'prepay_test_001',
    }),
  })),
}));

vi.mock('./alipay.js', () => ({
  AlipayService: vi.fn().mockImplementation(() => ({
    createPagePayOrder: vi.fn().mockResolvedValue({
      orderNo: 'ALI-TEST-001',
      paymentUrl: 'https://openapi.alipay.com/gateway.do?test=1',
    }),
    createWapPayOrder: vi.fn().mockResolvedValue({
      orderNo: 'ALI-WAP-001',
      paymentUrl: 'https://openapi.alipay.com/gateway.do?wap=1',
    }),
  })),
}));

describe('ayment.js 源模块测试', () => {
  let SimulatedPaymentAdapter;
  let ProductionPaymentAdapter;
  let paymentService;

  beforeAll(async () => {
    const mod = await import('./payment.js');
    SimulatedPaymentAdapter = mod.SimulatedPaymentAdapter;
    ProductionPaymentAdapter = mod.ProductionPaymentAdapter;
    paymentService = mod.paymentService;
  });

  describe('SimulatedPaymentAdapter', () => {
    it('createOrder 返回成功状态的订单', async () => {
      const adapter = new SimulatedPaymentAdapter();
      const result = await adapter.createOrder({
        userId: 1,
        planType: 'monthly',
        amount: 29.9,
      });
      expect(result.status).toBe('success');
      expect(result.orderNo).toBeTruthy();
      expect(result.orderNo.startsWith('VIP')).toBe(true);
    });

    it('verifyCallback 始终返回true', async () => {
      const adapter = new SimulatedPaymentAdapter();
      const result = await adapter.verifyCallback({
        order_no: 'TEST-ORDER-001',
        status: 'success',
      });
      expect(result.success).toBe(true);
      expect(result.orderNo).toBe('TEST-ORDER-001');
      expect(result.tradeNo).toBeTruthy();
    });

    it('queryOrder 始终返回success', async () => {
      const adapter = new SimulatedPaymentAdapter();
      const result = await adapter.queryOrder('TEST-ORDER-001');
      expect(result.status).toBe('success');
      expect(result.tradeNo).toBeTruthy();
    });
  });

  describe('ProductionPaymentAdapter', () => {
    it('微信支付模式创建订单', async () => {
      const adapter = new ProductionPaymentAdapter();
      const result = await adapter.createOrder({
        amount: 29.9, planType: 'monthly', paymentMethod: 'wechat',
      });
      expect(result.orderNo).toBeTruthy();
      expect(result.qrCode).toBe('weixin://wxpay/bizpayurl?pr=test');
      expect(result.status).toBe('pending');
    });

    it('支付宝模式创建订单', async () => {
      const adapter = new ProductionPaymentAdapter();
      const result = await adapter.createOrder({
        amount: 29.9, planType: 'monthly', paymentMethod: 'alipay',
      });
      expect(result.orderNo).toBeTruthy();
      expect(result.paymentUrl).toContain('alipay');
      expect(result.status).toBe('pending');
    });

    it('online支付模式创建订单', async () => {
      const adapter = new ProductionPaymentAdapter();
      const result = await adapter.createOrder({
        amount: 29.9, planType: 'monthly', paymentMethod: 'online',
      });
      expect(result.orderNo).toBeTruthy();
      expect(result.status).toBe('pending');
    });

    it('不同套餐类型', async () => {
      const adapter = new ProductionPaymentAdapter();
      for (const planType of ['monthly', 'quarterly', 'yearly']) {
        const result = await adapter.createOrder({
          amount: 99, planType, paymentMethod: 'online',
        });
        expect(typeof result.orderNo).toBe('string');
        expect(result.orderNo.length).toBeGreaterThan(5);
      }
    });
  });

  describe('PaymentService环境切换', () => {
    it('通过 NODE_ENV 和 DEV_MODE 判断是否启用模拟适配器', () => {
      process.env.NODE_ENV = 'development';
      process.env.DEV_MODE = 'true';
      expect(paymentService.adapter).toBeDefined();
      expect(paymentService.adapter.name).toBe('simulated');

      delete process.env.DEV_MODE;
      process.env.NODE_ENV = 'test';
    });

    it('createOrder委托给适配器', async () => {
      const result = await paymentService.createOrder({
        userId: 1, planType: 'monthly', amount: 29.9,
      });
      expect(result.status).toBe('success');
      expect(result.orderNo).toBeTruthy();
    });
  });
});
