import { describe, it, expect } from 'vitest';

/**
 * 通用表单验证逻辑单元测试
 * 覆盖：邮箱、手机号、密码、空值、长度限制
 */

function validateEmail(email) {
  if (!email || typeof email !== 'string') return { valid: false, error: '邮箱不能为空' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return { valid: false, error: '邮箱格式不正确' };
  if (email.length > 254) return { valid: false, error: '邮箱长度不能超过254个字符' };
  return { valid: true, error: null };
}

function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') return { valid: false, error: '手机号不能为空' };
  if (!/^1[3-9]\d{9}$/.test(phone.trim())) return { valid: false, error: '手机号格式不正确' };
  return { valid: true, error: null };
}

function validatePassword(password) {
  if (!password || typeof password !== 'string') return { valid: false, error: '密码不能为空' };
  if (password.length < 6) return { valid: false, error: '密码至少6位' };
  if (password.length > 128) return { valid: false, error: '密码不能超过128位' };
  if (!/[a-zA-Z]/.test(password)) return { valid: false, error: '密码需包含字母' };
  if (!/\d/.test(password)) return { valid: false, error: '密码需包含数字' };
  return { valid: true, error: null };
}

function validateRequired(value, fieldName = '此项') {
  if (value === undefined || value === null) return { valid: false, error: `${fieldName}不能为空` };
  if (typeof value === 'string' && value.trim() === '') return { valid: false, error: `${fieldName}不能为空` };
  return { valid: true, error: null };
}

describe('邮箱验证', () => {
  it('有效邮箱', () => {
    expect(validateEmail('test@example.com').valid).toBe(true);
    expect(validateEmail('user.name@domain.co').valid).toBe(true);
    expect(validateEmail('a@b.cn').valid).toBe(true);
  });

  it('缺少@符号', () => {
    expect(validateEmail('testexample.com').valid).toBe(false);
  });

  it('缺少域名', () => {
    expect(validateEmail('test@').valid).toBe(false);
  });

  it('空值', () => {
    expect(validateEmail('').valid).toBe(false);
    expect(validateEmail(null).valid).toBe(false);
    expect(validateEmail(undefined).valid).toBe(false);
  });

  it('超长邮箱', () => {
    expect(validateEmail('a'.repeat(250) + '@test.com').valid).toBe(false);
  });

  it('包含空格', () => {
    expect(validateEmail(' test@test.com ').valid).toBe(true);
  });

  it('特殊字符在邮箱中的表现', () => {
    expect(validateEmail('test+tag@domain.com').valid).toBe(true);
  });
});

describe('手机号验证', () => {
  it('有效手机号', () => {
    expect(validatePhone('13800138000').valid).toBe(true);
    expect(validatePhone('15912345678').valid).toBe(true);
    expect(validatePhone('18800001111').valid).toBe(true);
  });

  it('无效号段', () => {
    expect(validatePhone('12000138000').valid).toBe(false);
    expect(validatePhone('10012345678').valid).toBe(false);
  });

  it('位数不对', () => {
    expect(validatePhone('1380013800').valid).toBe(false);
    expect(validatePhone('138001380000').valid).toBe(false);
  });

  it('空值', () => {
    expect(validatePhone('').valid).toBe(false);
    expect(validatePhone(null).valid).toBe(false);
  });

  it('非数字', () => {
    expect(validatePhone('1380013800a').valid).toBe(false);
  });
});

describe('密码验证', () => {
  it('有效密码', () => {
    expect(validatePassword('pass123').valid).toBe(true);
    expect(validatePassword('Abcd12').valid).toBe(true);
  });

  it('纯数字', () => {
    expect(validatePassword('12345678').valid).toBe(false);
  });

  it('纯字母', () => {
    expect(validatePassword('abcdefgh').valid).toBe(false);
  });

  it('过短', () => {
    expect(validatePassword('a1b2c').valid).toBe(false);
  });

  it('过长', () => {
    expect(validatePassword('a1' + 'x'.repeat(127)).valid).toBe(false);
  });

  it('空值', () => {
    expect(validatePassword('').valid).toBe(false);
    expect(validatePassword(null).valid).toBe(false);
  });
});

describe('必填验证', () => {
  it('有效值', () => {
    expect(validateRequired('hello').valid).toBe(true);
    expect(validateRequired(0).valid).toBe(true);
    expect(validateRequired(false).valid).toBe(true);
  });

  it('空字符串', () => {
    expect(validateRequired('').valid).toBe(false);
    expect(validateRequired('   ').valid).toBe(false);
  });

  it('null/undefined', () => {
    expect(validateRequired(null).valid).toBe(false);
    expect(validateRequired(undefined).valid).toBe(false);
  });
});
