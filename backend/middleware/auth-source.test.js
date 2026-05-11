import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockPool = {
  query: vi.fn().mockResolvedValue([[]]),
  execute: vi.fn().mockResolvedValue([[]]),
};

vi.mock('../db.js', () => ({
  default: mockPool,
}));

describe('auth.js 源模块测试', () => {
  let generateToken, authMiddleware, requireRole, requireCapability,
      requireIdentityVerified, getAccessSnapshot, requireVip, JWT_SECRET;

  beforeEach(async () => {
    vi.clearAllMocks();

    process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests';
    process.env.JWT_EXPIRES_IN = '2h';
    delete process.env.DEV_MODE;

    const mod = await import('./auth.js');
    generateToken = mod.generateToken;
    authMiddleware = mod.authMiddleware;
    requireRole = mod.requireRole;
    requireCapability = mod.requireCapability;
    requireIdentityVerified = mod.requireIdentityVerified;
    getAccessSnapshot = mod.getAccessSnapshot;
    requireVip = mod.requireVip;
    JWT_SECRET = mod.JWT_SECRET;
  });

  describe('generateToken', () => {
    it('生成有效的JWT令牌', () => {
      const user = { id: 42, email: 'test@test.com', role: 'student' };
      const token = generateToken(user);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('不同用户生成不同令牌', () => {
      const t1 = generateToken({ id: 1, email: 'a@a.com', role: 'student' });
      const t2 = generateToken({ id: 2, email: 'b@b.com', role: 'mentor' });
      expect(t1).not.toBe(t2);
    });

    it('令牌包含过期时间', () => {
      const token = generateToken({ id: 1, email: 'a@a.com', role: 'admin' });
      const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      expect(decoded.exp).toBeDefined();
      expect(decoded.id).toBe(1);
      expect(decoded.role).toBe('admin');
    });
  });

  describe('authMiddleware', () => {
    it('缺少Authorization头返回401', () => {
      let statusCode = null;
      let resBody = null;
      const res = {
        status: (c) => { statusCode = c; return { json: (b) => { resBody = b; } }; },
      };
      authMiddleware({ headers: {} }, res, () => {});
      expect(statusCode).toBe(401);
      expect(resBody.message).toBeTruthy();
    });

    it('非Bearer格式返回401', () => {
      let statusCode = null;
      const res = {
        status: (c) => { statusCode = c; return { json: () => {} }; },
      };
      authMiddleware({ headers: { authorization: 'Basic xxx' } }, res, () => {});
      expect(statusCode).toBe(401);
    });

    it('有效token设置req.user并调用next', () => {
      const token = generateToken({ id: 99, email: 'v@v.com', role: 'admin' });
      let called = false;
      const req = { headers: { authorization: `Bearer ${token}` }, user: null };
      const res = { status: () => ({ json: () => {} }) };
      authMiddleware(req, res, () => { called = true; });
      expect(called).toBe(true);
      expect(req.user).toBeTruthy();
      expect(req.user.id).toBe(99);
      expect(req.user.role).toBe('admin');
    });

    it('无效token返回401', () => {
      let statusCode = null;
      const res = {
        status: (c) => { statusCode = c; return { json: () => {} }; },
      };
      authMiddleware({ headers: { authorization: 'Bearer invalid.token.here' } }, res, () => {});
      expect(statusCode).toBe(401);
    });

    it('DEV_MODE=true设置dev用户', () => {
      process.env.DEV_MODE = 'true';
      let called = false;
      const req = { headers: {} };
      authMiddleware(req, { status: () => ({ json: () => {} }) }, () => { called = true; });
      expect(called).toBe(true);
      expect(req.user.role).toBe('admin');
      delete process.env.DEV_MODE;
    });
  });

  describe('requireRole', () => {
    it('允许匹配角色', () => {
      const mw = requireRole('admin', 'agent');
      let called = false;
      const req = { user: { role: 'admin', id: 1 } };
      mw(req, { status: () => ({ json: () => {} }) }, () => { called = true; });
      expect(called).toBe(true);
    });

    it('拒绝不匹配角色', () => {
      const mw = requireRole('admin');
      let statusCode = null;
      mw(
        { user: { role: 'student' } },
        { status: (c) => { statusCode = c; return { json: () => {} }; } },
        () => {}
      );
      expect(statusCode).toBe(403);
    });

    it('未登录返回401', () => {
      const mw = requireRole('admin');
      let statusCode = null;
      mw(
        { user: null },
        { status: (c) => { statusCode = c; return { json: () => {} }; } },
        () => {}
      );
      expect(statusCode).toBe(401);
    });
  });

  describe('requireVip', () => {
    it('未登录返回401', async () => {
      const mw = requireVip();
      let statusCode = null;
      await new Promise((resolve) => {
        mw(
          { user: null },
          { status: (c) => { statusCode = c; return { json: () => resolve() }; } },
          resolve
        );
      });
      expect(statusCode).toBe(401);
    });

    it('admin角色跳过VIP检查', async () => {
      const mw = requireVip();
      let called = false;
      await new Promise((resolve) => {
        mw(
          { user: { id: 1, role: 'admin' } },
          { status: () => ({ json: resolve }) },
          () => { called = true; resolve(); }
        );
      });
      expect(called).toBe(true);
    });

    it('快路径VIP检查通过', async () => {
      mockPool.query.mockResolvedValueOnce([[{ is_vip: 1, vip_expires_at: '2099-12-31' }]]);

      const mw = requireVip();
      let called = false;
      await new Promise((resolve) => {
        mw(
          { user: { id: 3, role: 'student' } },
          { status: () => ({ json: resolve }) },
          () => { called = true; resolve(); }
        );
      });
      expect(called).toBe(true);
    });

    it('快路径VIP已过期回退到慢路径', async () => {
      mockPool.query
        .mockResolvedValueOnce([[{ is_vip: 1, vip_expires_at: '2020-01-01' }]])
        .mockResolvedValueOnce([[{ id: 1 }]]);

      const mw = requireVip();
      let called = false;
      await new Promise((resolve) => {
        mw(
          { user: { id: 4, role: 'student' } },
          { status: () => ({ json: resolve }) },
          () => { called = true; resolve(); }
        );
      });
      expect(called).toBe(true);
    });

    it('两个路径都失败返回403', async () => {
      mockPool.query
        .mockResolvedValueOnce([[{ is_vip: 0, vip_expires_at: null }]])
        .mockResolvedValueOnce([[]]);

      const mw = requireVip();
      let statusCode = null;
      await new Promise((resolve) => {
        mw(
          { user: { id: 5, role: 'student' } },
          { status: (c) => { statusCode = c; return { json: resolve }; } },
          resolve
        );
      });
      expect(statusCode).toBe(403);
    });
  });
});
