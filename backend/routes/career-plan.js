import { Router } from 'express';
import pool from '../db.js';
import { authMiddleware, getAccessSnapshot, requireRole } from '../middleware/auth.js';

const router = Router();

// 所有路由都需要登录且为学生角色
router.use(authMiddleware, requireRole('student'));

// ====== 合法的未来发展方向选项 ======
const VALID_DIRECTIONS = ['求职就业', '考研', '保研', '留学', '创业', '考公考编'];

// ==================== 提交生涯规划 ====================
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      fullName,
      school,
      major,
      graduationYear,
      targetCity,
      targetIndustry,
      targetRole,
      developmentDirections,
      selfSummary,
    } = req.body;

    // ====== 参数校验（422 + 详细错误信息） ======
    const errors = {};

    if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
      errors.name = '请填写姓名';
    }

    if (!school || typeof school !== 'string' || !school.trim()) {
      errors.school = '请填写学校';
    }

    if (!major || typeof major !== 'string' || !major.trim()) {
      errors.major = '请填写专业';
    }

    if (!graduationYear || typeof graduationYear !== 'string' || !graduationYear.trim()) {
      errors.graduation_year = '请填写毕业年份';
    }

    // directions 必须是非空数组
    if (!Array.isArray(developmentDirections) || developmentDirections.length === 0) {
      errors.directions = '请至少选择一个未来发展方向';
    } else {
      // 验证每个方向值是否合法
      const invalidDirections = developmentDirections.filter(
        (d) => !VALID_DIRECTIONS.includes(d)
      );
      if (invalidDirections.length > 0) {
        errors.directions = `包含无效的发展方向: ${invalidDirections.join(', ')}`;
      }
    }

    // 存在校验错误，返回 422
    if (Object.keys(errors).length > 0) {
      return res.status(422).json({
        code: 422,
        message: '表单验证失败',
        errors,
      });
    }

    // 检查是否已提交过
    const [existing] = await pool.query(
      'SELECT id, status FROM career_plan_profiles WHERE user_id = ?',
      [userId]
    );

    const directionsJson = JSON.stringify(developmentDirections || []);

    if (existing.length > 0) {
      // 更新已有记录
      await pool.query(
        `UPDATE career_plan_profiles
         SET full_name = ?, school = ?, major = ?, graduation_year = ?,
             target_city = ?, target_industry = ?, target_role = ?,
             development_directions = ?, self_summary = ?, status = 'completed'
         WHERE user_id = ?`,
        [
          fullName.trim(), school.trim(), major.trim(), graduationYear.trim(),
          targetCity || '', targetIndustry || '', targetRole || '',
          directionsJson, selfSummary || '', userId,
        ]
      );
    } else {
      // 新建记录
      await pool.query(
        `INSERT INTO career_plan_profiles
         (user_id, full_name, school, major, graduation_year, target_city, target_industry, target_role, development_directions, self_summary, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')`,
        [
          userId, fullName.trim(), school.trim(), major.trim(), graduationYear.trim(),
          targetCity || '', targetIndustry || '', targetRole || '',
          directionsJson, selfSummary || '',
        ]
      );
    }

    // ====== 更新 students 表的 career_plan_completed 字段 ======
    try {
      // 检查 students 表是否存在该用户记录
      const [studentRows] = await pool.query(
        'SELECT id FROM students WHERE user_id = ?',
        [userId]
      );

      if (studentRows.length > 0) {
        // 更新已有记录
        await pool.query(
          'UPDATE students SET career_plan_completed = ? WHERE user_id = ?',
          [true, userId]
        );
      } else {
        // 创建学生记录并标记已完成
        await pool.query(
          `INSERT INTO students (user_id, school, major, career_plan_completed)
           VALUES (?, ?, ?, ?)`,
          [userId, school.trim(), major.trim(), true]
        );
      }
    } catch (dbErr) {
      // career_plan_completed 字段可能不存在（兼容旧数据库），记录日志但不阻断主流程
      console.warn('更新 students.career_plan_completed 失败（字段可能不存在）:', dbErr.message);
    }

    const accessStatus = await getAccessSnapshot(userId, 'student');

    res.json({
      code: 200,
      message: '生涯规划已保存',
      data: { accessStatus }
    });
  } catch (err) {
    console.error('提交生涯规划失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 查询生涯规划 ====================
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(
      `SELECT full_name, school, major, graduation_year, target_city, target_industry,
              target_role, development_directions, self_summary, status, created_at, updated_at
       FROM career_plan_profiles WHERE user_id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.json({
        code: 200,
        data: null
      });
    }

    const record = rows[0];
    // 解析 JSON 字段
    let directions = record.development_directions;
    if (typeof directions === 'string') {
      try { directions = JSON.parse(directions); } catch { directions = []; }
    }

    res.json({
      code: 200,
      data: {
        full_name: record.full_name,
        school: record.school,
        major: record.major,
        graduation_year: record.graduation_year,
        target_city: record.target_city,
        target_industry: record.target_industry,
        target_role: record.target_role,
        development_directions: directions,
        self_summary: record.self_summary,
        status: record.status,
        created_at: record.created_at,
        updated_at: record.updated_at,
      }
    });
  } catch (err) {
    console.error('查询生涯规划失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

export default router;
