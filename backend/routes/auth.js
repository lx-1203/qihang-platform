import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { generateToken, authMiddleware } from '../middleware/auth.js';

const router = Router();

// ==================== 注册 ====================
router.post('/register', async (req, res) => {
  try {
    const { email, password, role = 'student', nickname = '' } = req.body;

    // 参数校验
    if (!email || !password) {
      return res.status(400).json({ code: 400, message: '邮箱和密码不能为空' });
    }

    // 邮箱格式校验
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ code: 400, message: '邮箱格式不正确' });
    }

    // 密码长度校验
    if (password.length < 6) {
      return res.status(400).json({ code: 400, message: '密码长度不能少于6位' });
    }

    // 角色校验（注册时不允许直接注册管理员）
    const allowedRoles = ['student', 'company', 'mentor'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ code: 400, message: '不支持的角色类型' });
    }

    // 检查邮箱是否已注册
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ code: 409, message: '该邮箱已被注册' });
    }

    // 密码加密
    const hashedPassword = await bcrypt.hash(password, 10);

    // 自动生成昵称
    const finalNickname = nickname || email.split('@')[0];

    // 插入数据库
    const [result] = await pool.query(
      'INSERT INTO users (email, password, nickname, role) VALUES (?, ?, ?, ?)',
      [email, hashedPassword, finalNickname, role]
    );

    // 查询完整用户信息
    const [users] = await pool.query(
      'SELECT id, email, nickname, role, avatar, phone, status, created_at FROM users WHERE id = ?',
      [result.insertId]
    );
    const user = users[0];

    // 生成 token
    const token = generateToken(user);

    res.status(201).json({
      code: 201,
      message: '注册成功',
      data: { token, user }
    });
  } catch (err) {
    console.error('注册失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 登录 ====================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 参数校验
    if (!email || !password) {
      return res.status(400).json({ code: 400, message: '邮箱和密码不能为空' });
    }

    // 查询用户
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ code: 401, message: '邮箱或密码错误' });
    }

    const user = users[0];

    // 检查账号状态
    if (user.status === 0) {
      return res.status(403).json({ code: 403, message: '账号已被禁用，请联系管理员' });
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ code: 401, message: '邮箱或密码错误' });
    }

    // 生成 token
    const token = generateToken(user);

    // 返回用户信息（不含密码）
    const { password: _, ...userInfo } = user;

    res.json({
      code: 200,
      message: '登录成功',
      data: { token, user: userInfo }
    });
  } catch (err) {
    console.error('登录失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 获取当前用户信息 ====================
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, email, nickname, role, avatar, phone, status, created_at, updated_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ code: 404, message: '用户不存在' });
    }

    res.json({
      code: 200,
      data: { user: users[0] }
    });
  } catch (err) {
    console.error('获取用户信息失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 修改密码 ====================
router.put('/password', authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ code: 400, message: '旧密码和新密码不能为空' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ code: 400, message: '新密码长度不能少于6位' });
    }

    // 查询当前密码
    const [users] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) {
      return res.status(404).json({ code: 404, message: '用户不存在' });
    }

    // 验证旧密码
    const isValid = await bcrypt.compare(oldPassword, users[0].password);
    if (!isValid) {
      return res.status(401).json({ code: 401, message: '旧密码错误' });
    }

    // 更新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);

    res.json({ code: 200, message: '密码修改成功' });
  } catch (err) {
    console.error('修改密码失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

export default router;
