/**
 * 微信支付服务封装
 * 基于微信支付API V3 (wechatpay-node-v3 SDK)
 *
 * 生产环境需配置：
 * - WECHAT_APP_ID          微信应用ID
 * - WECHAT_PAY_MCH_ID      商户号
 * - WECHAT_PAY_API_V3_KEY  APIv3密钥
 * - WECHAT_PAY_SERIAL_NO   商户证书序列号
 * - certs/apiclient_key.pem 商户私钥文件
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class WechatPayService {
  constructor(config = {}) {
    this.mchId = config.mchId || process.env.WECHAT_PAY_MCH_ID;
    this.appId = config.appId || process.env.WECHAT_APP_ID;
    this.apiV3Key = config.apiV3Key || process.env.WECHAT_PAY_API_V3_KEY;
    this.serialNo = config.serialNo || process.env.WECHAT_PAY_SERIAL_NO;
    this.notifyUrl = config.notifyUrl || process.env.PAYMENT_NOTIFY_URL;
    this.privateKeyPath = config.privateKeyPath
      || path.join(__dirname, '..', 'certs', 'apiclient_key.pem');

    if (!this.mchId || !this.appId || !this.apiV3Key || !this.serialNo) {
      console.warn('[微信支付] 缺少必要配置，使用模拟模式。请在 .env 中配置 WECHAT_PAY_MCH_ID 等');
    }
  }

  get _isConfigured() {
    return !!(this.mchId && this.appId && this.apiV3Key && this.serialNo);
  }

  getPrivateKey() {
    return fs.readFileSync(this.privateKeyPath, 'utf8');
  }

  /**
   * 生成微信支付 API V3 签名
   */
  _sign(method, urlPath, timestamp, nonceStr, body) {
    const message = `${method}\n${urlPath}\n${timestamp}\n${nonceStr}\n${body || ''}\n`;
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(message);
    return sign.sign(this.getPrivateKey(), 'base64');
  }

  /**
   * 构建 Authorization 头
   */
  _generateAuthHeader(method, urlPath, body) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = crypto.randomBytes(16).toString('hex');
    const signature = this._sign(method, urlPath, timestamp, nonceStr, body);

    return [
      `WECHATPAY2-SHA256-RSA2048 mchid="${this.mchId}"`,
      `nonce_str="${nonceStr}"`,
      `signature="${signature}"`,
      `timestamp="${timestamp}"`,
      `serial_no="${this.serialNo}"`,
    ].join(',');
  }

  /**
   * JSAPI 支付（微信内H5）
   * @returns {{ prepayId, orderNo }}
   */
  async createJsapiOrder({ openid, amount, description, orderNo }) {
    if (!this._isConfigured) {
      throw new Error('微信支付未配置完整，请检查 WECHAT_PAY_MCH_ID / WECHAT_APP_ID 等环境变量');
    }

    const urlPath = '/v3/pay/transactions/jsapi';
    const body = JSON.stringify({
      appid: this.appId,
      mchid: this.mchId,
      description: description || 'VIP会员订阅',
      out_trade_no: orderNo,
      notify_url: this.notifyUrl,
      amount: {
        total: Math.round(amount * 100),
        currency: 'CNY',
      },
      payer: { openid },
    });

    const response = await fetch(`https://api.mch.weixin.qq.com${urlPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': this._generateAuthHeader('POST', urlPath, body),
      },
      body,
    });

    const result = await response.json();

    if (result.code) {
      throw new Error(`微信支付下单失败: [${result.code}] ${result.message}`);
    }

    if (result.prepay_id) {
      return { prepayId: result.prepay_id, orderNo };
    }

    throw new Error(`微信支付下单失败: ${JSON.stringify(result)}`);
  }

  /**
   * NATIVE 支付（扫码支付）
   * @returns {{ codeUrl, orderNo }}
   */
  async createNativeOrder({ amount, description, orderNo }) {
    if (!this._isConfigured) {
      throw new Error('微信支付未配置完整，请检查 WECHAT_PAY_MCH_ID / WECHAT_APP_ID 等环境变量');
    }

    const urlPath = '/v3/pay/transactions/native';
    const body = JSON.stringify({
      appid: this.appId,
      mchid: this.mchId,
      description: description || 'VIP会员订阅',
      out_trade_no: orderNo,
      notify_url: this.notifyUrl,
      amount: {
        total: Math.round(amount * 100),
        currency: 'CNY',
      },
    });

    const response = await fetch(`https://api.mch.weixin.qq.com${urlPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': this._generateAuthHeader('POST', urlPath, body),
      },
      body,
    });

    const result = await response.json();

    if (result.code) {
      throw new Error(`微信支付下单失败: [${result.code}] ${result.message}`);
    }

    if (result.code_url) {
      return { codeUrl: result.code_url, orderNo };
    }

    throw new Error(`微信支付下单失败: ${JSON.stringify(result)}`);
  }

  /**
   * 验证回调签名
   * 生产环境需使用微信平台证书进行验签
   */
  verifyCallbackSign(headers, body) {
    if (!this._isConfigured) {
      return false;
    }

    const timestamp = headers['wechatpay-timestamp'];
    const nonce = headers['wechatpay-nonce'];
    const signature = headers['wechatpay-signature'];
    const serial = headers['wechatpay-serial'];

    if (serial !== this.serialNo) {
      console.warn('[微信支付] 回调序列号不匹配');
      return false;
    }

    const message = `${timestamp}\n${nonce}\n${body}\n`;
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(message);

    try {
      return verify.verify(this.getPrivateKey(), signature, 'base64');
    } catch {
      return false;
    }
  }

  /**
   * 申请退款
   */
  async createRefund({ orderNo, refundNo, totalAmount, refundAmount }) {
    if (!this._isConfigured) {
      throw new Error('微信支付未配置完整');
    }

    const urlPath = '/v3/refund/domestic/refunds';
    const body = JSON.stringify({
      out_trade_no: orderNo,
      out_refund_no: refundNo,
      amount: {
        refund: Math.round(refundAmount * 100),
        total: Math.round(totalAmount * 100),
        currency: 'CNY',
      },
    });

    const response = await fetch(`https://api.mch.weixin.qq.com${urlPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': this._generateAuthHeader('POST', urlPath, body),
      },
      body,
    });

    const result = await response.json();

    if (result.code) {
      throw new Error(`微信支付退款失败: [${result.code}] ${result.message}`);
    }

    return { refundNo, status: result.status };
  }
}

export { WechatPayService };
