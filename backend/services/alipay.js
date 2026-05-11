/**
 * 支付宝支付服务封装
 *
 * 生产环境需配置：
 * - ALIPAY_APP_ID          支付宝应用ID
 * - ALIPAY_PRIVATE_KEY     应用私钥
 * - ALIPAY_PUBLIC_KEY      支付宝公钥（用于验签）
 * - certs/alipay_private_key.pem  私钥文件
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALIPAY_GATEWAY = 'https://openapi.alipay.com/gateway.do';
const ALIPAY_SANDBOX_GATEWAY = 'https://openapi-sandbox.dl.alipaydev.com/gateway.do';

class AlipayService {
  constructor(config = {}) {
    this.appId = config.appId || process.env.ALIPAY_APP_ID;
    this.notifyUrl = config.notifyUrl || process.env.PAYMENT_NOTIFY_URL;
    this.useSandbox = config.sandbox || process.env.ALIPAY_SANDBOX === 'true' || false;
    this.gateway = this.useSandbox ? ALIPAY_SANDBOX_GATEWAY : ALIPAY_GATEWAY;

    const privateKeyFromEnv = process.env.ALIPAY_PRIVATE_KEY;
    this.privateKeyPath = config.privateKeyPath
      || path.join(__dirname, '..', 'certs', 'alipay_private_key.pem');

    if (privateKeyFromEnv) {
      this.privateKey = privateKeyFromEnv.replace(/\\n/g, '\n');
    } else if (fs.existsSync(this.privateKeyPath)) {
      this.privateKey = fs.readFileSync(this.privateKeyPath, 'utf8');
    } else {
      this.privateKey = '';
    }

    const publicKeyFromEnv = process.env.ALIPAY_PUBLIC_KEY;
    if (publicKeyFromEnv) {
      this.alipayPublicKey = publicKeyFromEnv.replace(/\\n/g, '\n');
    } else {
      const publicKeyPath = config.publicKeyPath
        || path.join(__dirname, '..', 'certs', 'alipay_public_key.pem');
      if (fs.existsSync(publicKeyPath)) {
        this.alipayPublicKey = fs.readFileSync(publicKeyPath, 'utf8');
      } else {
        this.alipayPublicKey = '';
      }
    }

    if (!this.appId || !this.privateKey) {
      console.warn('[支付宝] 缺少必要配置，使用模拟模式。请在 .env 中配置 ALIPAY_APP_ID 等');
    }
  }

  get _isConfigured() {
    return !!(this.appId && this.privateKey);
  }

  /**
   * 生成支付宝签名（RSA2）
   */
  _generateSign(params) {
    const sortedKeys = Object.keys(params).sort();
    const content = sortedKeys
      .filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '')
      .map(k => `${k}=${params[k]}`)
      .join('&');

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(content);
    return sign.sign(this.privateKey, 'base64');
  }

  /**
   * 验证支付宝回调签名
   */
  verifyCallbackSign(params) {
    if (!this._isConfigured || !this.alipayPublicKey) {
      return false;
    }

    const sign = params.sign;
    const signParams = { ...params };
    delete signParams.sign;
    delete signParams.sign_type;

    const sortedKeys = Object.keys(signParams).sort();
    const content = sortedKeys
      .filter(k => signParams[k] !== undefined && signParams[k] !== null && signParams[k] !== '')
      .map(k => `${k}=${signParams[k]}`)
      .join('&');

    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(content);

    try {
      return verify.verify(this.alipayPublicKey, sign, 'base64');
    } catch {
      return false;
    }
  }

  /**
   * 创建电脑网站支付订单
   * @returns {{ paymentUrl, orderNo }}
   */
  async createPagePayOrder({ amount, orderNo, subject, returnUrl }) {
    if (!this._isConfigured) {
      throw new Error('支付宝未配置完整，请检查 ALIPAY_APP_ID / ALIPAY_PRIVATE_KEY 等环境变量');
    }

    const bizContent = {
      out_trade_no: orderNo,
      product_code: 'FAST_INSTANT_TRADE_PAY',
      total_amount: Number(amount).toFixed(2),
      subject: subject || 'VIP会员订阅',
    };

    const params = {
      app_id: this.appId,
      method: 'alipay.trade.page.pay',
      format: 'JSON',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, '+08:00'),
      version: '1.0',
      notify_url: this.notifyUrl,
      return_url: returnUrl || (process.env.FRONTEND_URL || 'http://localhost:5174') + '/vip/result',
      biz_content: JSON.stringify(bizContent),
    };

    params.sign = this._generateSign(params);

    const queryString = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');

    return {
      paymentUrl: `${this.gateway}?${queryString}`,
      orderNo,
    };
  }

  /**
   * 创建移动网站支付订单（H5支付）
   * @returns {{ paymentUrl, orderNo }}
   */
  async createWapPayOrder({ amount, orderNo, subject, returnUrl }) {
    if (!this._isConfigured) {
      throw new Error('支付宝未配置完整，请检查 ALIPAY_APP_ID / ALIPAY_PRIVATE_KEY 等环境变量');
    }

    const bizContent = {
      out_trade_no: orderNo,
      product_code: 'QUICK_WAP_WAY',
      total_amount: Number(amount).toFixed(2),
      subject: subject || 'VIP会员订阅',
    };

    const params = {
      app_id: this.appId,
      method: 'alipay.trade.wap.pay',
      format: 'JSON',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, '+08:00'),
      version: '1.0',
      notify_url: this.notifyUrl,
      return_url: returnUrl || (process.env.FRONTEND_URL || 'http://localhost:5174') + '/vip/result',
      biz_content: JSON.stringify(bizContent),
    };

    params.sign = this._generateSign(params);

    const queryString = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');

    return {
      paymentUrl: `${this.gateway}?${queryString}`,
      orderNo,
    };
  }

  /**
   * 查询订单状态
   */
  async queryOrder(orderNo) {
    if (!this._isConfigured) {
      throw new Error('支付宝未配置完整');
    }

    const bizContent = {
      out_trade_no: orderNo,
    };

    const params = {
      app_id: this.appId,
      method: 'alipay.trade.query',
      format: 'JSON',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, '+08:00'),
      version: '1.0',
      biz_content: JSON.stringify(bizContent),
    };

    params.sign = this._generateSign(params);

    const queryString = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');

    const response = await fetch(`${this.gateway}?${queryString}`);
    const result = await response.json();

    const responseBody = result.alipay_trade_query_response;
    if (responseBody.code !== '10000') {
      throw new Error(`支付宝查询失败: ${responseBody.sub_msg || responseBody.msg}`);
    }

    return {
      orderNo,
      tradeNo: responseBody.trade_no,
      status: responseBody.trade_status,
      amount: responseBody.total_amount,
    };
  }

  /**
   * 申请退款
   */
  async createRefund({ orderNo, refundNo, amount }) {
    if (!this._isConfigured) {
      throw new Error('支付宝未配置完整');
    }

    const bizContent = {
      out_trade_no: orderNo,
      out_request_no: refundNo,
      refund_amount: Number(amount).toFixed(2),
    };

    const params = {
      app_id: this.appId,
      method: 'alipay.trade.refund',
      format: 'JSON',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, '+08:00'),
      version: '1.0',
      biz_content: JSON.stringify(bizContent),
    };

    params.sign = this._generateSign(params);

    const queryString = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');

    const response = await fetch(`${this.gateway}?${queryString}`);
    const result = await response.json();

    const responseBody = result.alipay_trade_refund_response;
    if (responseBody.code !== '10000') {
      throw new Error(`支付宝退款失败: ${responseBody.sub_msg || responseBody.msg}`);
    }

    return { refundNo, status: 'SUCCESS' };
  }
}

export { AlipayService };
