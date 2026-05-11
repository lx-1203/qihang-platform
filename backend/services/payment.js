/**
 * 支付抽象层服务
 *
 * 架构设计：适配器模式 (Adapter Pattern)
 * - 开发环境：SimulatedPaymentAdapter —— 模拟支付成功，无需真实支付网关
 * - 生产环境：预留 ProductionPaymentAdapter 接入点，待后续接入微信/支付宝等真实网关
 *
 * 统一接口 (IPaymentAdapter)：
 *   createOrder(orderData)  → { orderNo, paymentUrl, qrCode? }
 *   verifyCallback(callbackData) → { success, orderNo, tradeNo, amount }
 *   queryOrder(orderNo) → { status, tradeNo, amount }
 *
 * 切换支付方式只需替换适配器实现，无需修改业务代码。
 */

import crypto from 'crypto';
import { WechatPayService } from './wechat-pay.js';
import { AlipayService } from './alipay.js';

// ==================== 支付适配器接口定义 ====================

/**
 * @typedef {Object} CreateOrderParams
 * @property {number} userId
 * @property {string} planType - 'monthly' | 'quarterly' | 'yearly'
 * @property {number} amount - 金额（元）
 * @property {string} userRole - 'student' | 'company'
 * @property {string} paymentMethod - 'online' | 'alipay' | 'wechat' | 'apple_pay'
 */

/**
 * @typedef {Object} CreateOrderResult
 * @property {string} orderNo - 订单号
 * @property {string} paymentUrl - 支付链接（模拟环境下为 null）
 * @property {string|null} qrCode - 二维码数据（模拟环境下为 null）
 * @property {'pending'|'success'} status - 订单状态
 */

/**
 * @typedef {Object} CallbackData
 * @property {string} order_no
 * @property {string} status - 'success' | 'failed'
 * @property {string} [trade_no]
 * @property {string} [payment_method]
 * @property {number} [amount]
 * @property {string} [sign]
 */

/**
 * @typedef {Object} CallbackResult
 * @property {boolean} success
 * @property {string} orderNo
 * @property {string|null} tradeNo
 * @property {number|null} amount
 */

// ==================== 工具函数 ====================

function generateOrderNo() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `VIP${timestamp}${random}`;
}

// ==================== 开发环境：模拟支付适配器 ====================

class SimulatedPaymentAdapter {
  constructor() {
    this.name = 'simulated';
  }

  /**
   * 创建模拟支付订单 — 开发环境下直接标记为支付成功
   */
  async createOrder(params) {
    const orderNo = generateOrderNo();

    console.log(`[模拟支付] 创建订单: ${orderNo}, 金额: ¥${params.amount}, 套餐: ${params.planType}`);

    return {
      orderNo,
      paymentUrl: null,
      qrCode: null,
      status: 'success',
    };
  }

  /**
   * 模拟支付回调验证 — 开发环境始终返回成功
   */
  async verifyCallback(callbackData) {
    console.log(`[模拟支付] 回调验证: ${callbackData.order_no}`);

    return {
      success: true,
      orderNo: callbackData.order_no,
      tradeNo: callbackData.trade_no || `SIM${Date.now()}`,
      amount: callbackData.amount || null,
    };
  }

  /**
   * 模拟订单查询 — 开发环境始终返回成功
   */
  async queryOrder(orderNo) {
    return {
      status: 'success',
      tradeNo: `SIM${Date.now()}`,
      amount: null,
    };
  }
}

// ==================== 生产环境：真实支付网关适配器 ====================

class ProductionPaymentAdapter {
  constructor(config = {}) {
    this.name = 'production';
    this.wechatPay = new WechatPayService(config);
    this.alipay = new AlipayService(config);
  }

  /**
   * 创建支付订单 — 根据支付方式调用不同网关
   * @param {Object} params
   * @param {number} params.amount      金额（元）
   * @param {string} params.planType    套餐类型 (monthly/quarterly/yearly)
   * @param {string} params.paymentMethod 支付方式 (wechat/alipay/online)
   * @returns {Promise<{orderNo, paymentUrl?, qrCode?, status}>}
   */
  async createOrder(params) {
    const orderNo = generateOrderNo();
    const planLabels = { monthly: '月度', quarterly: '季度', yearly: '年度' };
    const planLabel = planLabels[params.planType] || params.planType || 'VIP';
    const description = `VIP会员订阅 - ${planLabel}`;

    const paymentMethod = params.paymentMethod || 'online';

    if (paymentMethod === 'wechat') {
      try {
        const result = await this.wechatPay.createNativeOrder({
          amount: params.amount,
          description,
          orderNo,
        });
        return {
          orderNo: result.orderNo,
          paymentUrl: null,
          qrCode: result.codeUrl,
          status: 'pending',
        };
      } catch (err) {
        console.error('[支付服务] 微信支付下单失败:', err.message);
        throw new Error(`微信支付下单失败: ${err.message}`);
      }
    }

    if (paymentMethod === 'alipay') {
      try {
        const result = await this.alipay.createPagePayOrder({
          amount: params.amount,
          orderNo,
          subject: description,
        });
        return {
          orderNo: result.orderNo,
          paymentUrl: result.paymentUrl,
          qrCode: null,
          status: 'pending',
        };
      } catch (err) {
        console.error('[支付服务] 支付宝下单失败:', err.message);
        throw new Error(`支付宝下单失败: ${err.message}`);
      }
    }

    try {
      const result = await this.alipay.createPagePayOrder({
        amount: params.amount,
        orderNo,
        subject: description,
      });
      return {
        orderNo: result.orderNo,
        paymentUrl: result.paymentUrl,
        qrCode: null,
        status: 'pending',
      };
    } catch (err) {
      console.error('[支付服务] 支付网关下单失败:', err.message);
      throw new Error(`支付网关下单失败: ${err.message}`);
    }
  }

  /**
   * 验证支付回调
   */
  async verifyCallback(callbackData) {
    try {
      const orderNo = callbackData.order_no || callbackData.out_trade_no || '';
      const tradeNo = callbackData.trade_no || callbackData.transaction_id || '';
      const amount = callbackData.total_amount
        ? Number(callbackData.total_amount)
        : (callbackData.amount || null);

      if (!orderNo) {
        return { success: false, orderNo: '', tradeNo: null, amount: null };
      }

      return {
        success: true,
        orderNo,
        tradeNo,
        amount,
      };
    } catch (err) {
      console.error('[支付服务] 回调验证异常:', err.message);
      return {
        success: false,
        orderNo: callbackData.order_no || callbackData.out_trade_no || '',
        tradeNo: null,
        amount: null,
      };
    }
  }

  /**
   * 查询订单状态 — 从本地数据库查询
   */
  async queryOrder(orderNo) {
    try {
      const { default: pool } = await import('../db.js');
      const [rows] = await pool.query(
        'SELECT status, payment_trade_no, amount FROM vip_subscriptions WHERE order_no = ?',
        [orderNo]
      );

      if (rows.length === 0) {
        return { status: 'not_found', tradeNo: null, amount: null };
      }

      return {
        status: rows[0].status,
        tradeNo: rows[0].payment_trade_no,
        amount: rows[0].amount,
      };
    } catch (err) {
      console.error('[支付服务] 查询订单失败:', err.message);
      return { status: 'error', tradeNo: null, amount: null };
    }
  }
}

// ==================== 支付服务（适配器路由器） ====================

const isProductionMode =
  process.env.NODE_ENV === 'production' &&
  process.env.DEV_MODE !== 'true';

const hasProductionConfig =
  (process.env.WECHAT_PAY_MCH_ID && process.env.WECHAT_APP_ID) ||
  process.env.ALIPAY_APP_ID;

class PaymentService {
  constructor() {
    if (isProductionMode && hasProductionConfig) {
      this.adapter = new ProductionPaymentAdapter();
      console.log('[支付服务] 生产模式: 使用真实支付网关');
    } else {
      this.adapter = new SimulatedPaymentAdapter();
      const reason = isProductionMode
        ? '生产环境但缺少支付配置'
        : `开发模式 (DEV_MODE=${process.env.DEV_MODE}, NODE_ENV=${process.env.NODE_ENV})`;
      console.log(`[支付服务] 使用模拟适配器 — ${reason}`);
    }
  }

  async createOrder(params) {
    return this.adapter.createOrder(params);
  }

  async verifyCallback(callbackData) {
    return this.adapter.verifyCallback(callbackData);
  }

  async queryOrder(orderNo) {
    return this.adapter.queryOrder(orderNo);
  }
}

const paymentService = new PaymentService();

export { paymentService, SimulatedPaymentAdapter, ProductionPaymentAdapter };
