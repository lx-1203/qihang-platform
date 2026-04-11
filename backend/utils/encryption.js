/**
 * 敏感数据加密工具
 *
 * 场景：手机号、身份证号等敏感字段在数据库中加密存储（可选）
 * 算法：AES-256-GCM（对称加密，支持完整性验证）
 *
 * 注意：
 *  - 加密密钥通过 .env ENCRYPTION_KEY 配置（32字节，64位十六进制）
 *  - 密钥丢失则数据无法解密，请务必备份
 *  - MVP 阶段建议仅对最敏感字段（如身份证）使用，手机号可用脱敏展示代替
 *
 * 手机号脱敏（138****1234）适合大多数场景，无需加密。
 * 本工具主要用于真实存储→查询场景。
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;    // GCM 初始化向量 16 字节
const TAG_LENGTH = 16;   // GCM 认证标签 16 字节

/**
 * 获取加密密钥（从 hex 字符串转换为 Buffer）
 */
function getKey() {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex || keyHex.length < 64) {
    // 非生产环境使用派生密钥（不安全，仅用于开发）
    if (process.env.NODE_ENV === 'production') {
      throw new Error('生产环境必须配置 ENCRYPTION_KEY（64位十六进制字符串）');
    }
    // 开发环境派生固定密钥
    return crypto.scryptSync('dev_encryption_key_qihang_2026', 'salt_qihang', 32);
  }
  return Buffer.from(keyHex, 'hex');
}

/**
 * 加密字符串
 * @param {string} plaintext - 明文
 * @returns {string} - 格式: iv:tag:ciphertext（均为 hex）
 */
export function encrypt(plaintext) {
  if (!plaintext) return plaintext;

  try {
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
      cipher.update(String(plaintext), 'utf8'),
      cipher.final()
    ]);
    const tag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  } catch (err) {
    console.error('[加密失败]', err.message);
    return plaintext; // 降级：返回明文（不阻断业务）
  }
}

/**
 * 解密字符串
 * @param {string} encrypted - 加密后的字符串（格式: iv:tag:ciphertext）
 * @returns {string} - 解密后的明文
 */
export function decrypt(encrypted) {
  if (!encrypted) return encrypted;
  if (!encrypted.includes(':')) return encrypted; // 非加密格式，直接返回

  try {
    const [ivHex, tagHex, dataHex] = encrypted.split(':');
    if (!ivHex || !tagHex || !dataHex) return encrypted;

    const key = getKey();
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const data = Buffer.from(dataHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err) {
    console.error('[解密失败]', err.message);
    return '[解密失败]';
  }
}

/**
 * 手机号脱敏（不加密，仅遮蔽中间4位）
 * @param {string} phone - 完整手机号
 * @returns {string} - 如 138****1234
 */
export function maskPhone(phone) {
  if (!phone || phone.length < 7) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(-4);
}

/**
 * 邮箱脱敏
 * @param {string} email - 完整邮箱
 * @returns {string} - 如 zha***@example.com
 */
export function maskEmail(email) {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  const masked = local.slice(0, 3) + '***';
  return `${masked}@${domain}`;
}

/**
 * 身份证脱敏（保留前4后4）
 * @param {string} idCard
 * @returns {string} - 如 4201**********1234
 */
export function maskIdCard(idCard) {
  if (!idCard || idCard.length < 8) return idCard;
  return idCard.slice(0, 4) + '*'.repeat(idCard.length - 8) + idCard.slice(-4);
}

export default { encrypt, decrypt, maskPhone, maskEmail, maskIdCard };
