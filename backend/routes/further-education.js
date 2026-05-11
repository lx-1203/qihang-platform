import { Router } from 'express';
import pool from '../db.js';

const router = Router();

const VALID_DIRECTIONS = ['postgrad', 'recommend', 'abroad'];

router.get('/timelines', async (req, res) => {
  try {
    const { direction } = req.query;

    if (direction && !VALID_DIRECTIONS.includes(direction)) {
      return res.status(400).json({
        code: 400,
        message: `无效的 direction 参数，可选值: ${VALID_DIRECTIONS.join(', ')}`,
      });
    }

    try {
      let query = 'SELECT * FROM further_education_timelines WHERE status = ?';
      const params = ['active'];

      if (direction) {
        query += ' AND direction = ?';
        params.push(direction);
      }

      query += ' ORDER BY sort_order ASC, id ASC';

      const [rows] = await pool.query(query, params);

      if (Array.isArray(rows) && rows.length > 0) {
        return res.json({ code: 200, data: rows });
      }
    } catch (tableErr) {
      const errMsg = tableErr instanceof Error ? tableErr.message : String(tableErr);
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[further-education] further_education_timelines 表查询失败，尝试兼容查询:', errMsg);
      }
    }

    if (direction === 'abroad' || !direction) {
      try {
        const [abroadRows] = await pool.query(
          `SELECT id, DATE_FORMAT(date, '%Y-%m') AS month, title, description, 'abroad' AS direction,
                  ROW_NUMBER() OVER (ORDER BY date ASC) AS sort_order
           FROM study_abroad_timeline
           WHERE status = 'active'
           ORDER BY date ASC`
        );

        if (Array.isArray(abroadRows) && abroadRows.length > 0) {
          return res.json({ code: 200, data: abroadRows });
        }
      } catch (abroadErr) {
        const errMsg = abroadErr instanceof Error ? abroadErr.message : String(abroadErr);
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[further-education] study_abroad_timeline 兼容查询失败:', errMsg);
        }
      }
    }

    try {
      const [configRows] = await pool.query(
        "SELECT value FROM site_configs WHERE config_key = ? AND status = 'active'",
        ['further_education_timelines_config']
      );

      if (Array.isArray(configRows) && configRows.length > 0) {
        const configValue = typeof configRows[0].value === 'string'
          ? JSON.parse(configRows[0].value)
          : configRows[0].value;

        if (direction && configValue[direction]) {
          return res.json({ code: 200, data: configValue[direction] });
        } else if (!direction) {
          return res.json({ code: 200, data: configValue });
        }
      }
    } catch (configErr) {
      const errMsg = configErr instanceof Error ? configErr.message : String(configErr);
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[further-education] 配置中心查询失败:', errMsg);
      }
    }

    return res.json({ code: 200, data: [] });
  } catch (err) {
    console.error('[further-education] 获取时间线失败:', err);
    return res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

router.get('/cases', async (req, res) => {
  try {
    const { direction } = req.query;

    if (direction && !VALID_DIRECTIONS.includes(direction)) {
      return res.status(400).json({
        code: 400,
        message: `无效的 direction 参数，可选值: ${VALID_DIRECTIONS.join(', ')}`,
      });
    }

    try {
      let query = 'SELECT * FROM further_education_cases WHERE status = ?';
      const params = ['active'];

      if (direction) {
        query += ' AND direction = ?';
        params.push(direction);
      }

      query += ' ORDER BY sort_order ASC, id ASC';

      const [rows] = await pool.query(query, params);

      if (Array.isArray(rows) && rows.length > 0) {
        return res.json({ code: 200, data: rows });
      }
    } catch (tableErr) {
      const errMsg = tableErr instanceof Error ? tableErr.message : String(tableErr);
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[further-education] further_education_cases 表查询失败，尝试配置中心:', errMsg);
      }
    }

    try {
      const [configRows] = await pool.query(
        "SELECT value FROM site_configs WHERE config_key = ? AND status = 'active'",
        ['success_cases_page_config']
      );

      if (Array.isArray(configRows) && configRows.length > 0) {
        const configValue = typeof configRows[0].value === 'string'
          ? JSON.parse(configRows[0].value)
          : configRows[0].value;

        if (configValue.cases && Array.isArray(configValue.cases)) {
          const categoryToDirection = {
            postgrad: 'postgrad',
            abroad: 'abroad',
          };

          const mappedCases = configValue.cases
            .filter((c) => {
              if (!direction) return true;
              const mappedDir = categoryToDirection[c.category];
              return mappedDir === direction;
            })
            .map((c, idx) => ({
              id: idx + 1,
              direction: categoryToDirection[c.category] || 'postgrad',
              name: c.name || '',
              school: c.school || '',
              result: c.achievement || '',
              quote: c.quote || '',
              avatar: c.avatar || '',
              sort_order: idx + 1,
            }));

          return res.json({ code: 200, data: mappedCases });
        }
      }
    } catch (configErr) {
      const errMsg = configErr instanceof Error ? configErr.message : String(configErr);
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[further-education] 配置中心案例查询失败:', errMsg);
      }
    }

    return res.json({ code: 200, data: [] });
  } catch (err) {
    console.error('[further-education] 获取成功案例失败:', err);
    return res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

export default router;
