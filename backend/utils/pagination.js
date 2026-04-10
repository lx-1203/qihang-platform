/**
 * 游标分页工具（Cursor-based Pagination）
 * 相比 OFFSET/LIMIT，游标分页性能更稳定，支持实时数据变化
 *
 * 原理：
 * - 使用最后一条记录的 cursor（通常是 id 或 created_at）
 * - 下一页查询时用 cursor 作为条件（id > cursor），替代 OFFSET
 * - 避免大翻页时的性能衰减
 */

/**
 * 生成分页响应
 * @param {Array} rows - 查询结果
 * @param {number} pageSize - 页面大小
 * @returns {Object} { items, nextCursor, hasMore }
 */
export function generatePaginationResponse(rows, pageSize = 20) {
  const hasMore = rows.length > pageSize;
  // 只返回 pageSize 条记录
  const items = hasMore ? rows.slice(0, pageSize) : rows;

  // 生成 nextCursor（下一页的游标）
  const nextCursor = items.length > 0 ? items[items.length - 1].id : null;

  return {
    items,
    nextCursor,
    hasMore,
  };
}

/**
 * 构建游标分页 SQL WHERE 条件
 * @param {string} cursorId - 游标（上一页最后一条记录的 id）
 * @param {string} baseCondition - 基础 WHERE 条件
 * @returns {string} 完整的 WHERE 条件
 */
export function buildCursorCondition(cursorId, baseCondition = '') {
  if (!cursorId) {
    return baseCondition;
  }
  const condition = baseCondition ? baseCondition + ' AND' : 'WHERE';
  return `${condition} id > ?`;
}

/**
 * 添加参数到查询参数数组
 * @param {Array} params - 现有参数数组
 * @param {string|number} cursorId - 游标 ID
 * @returns {Array} 更新后的参数数组
 */
export function appendCursorParam(params, cursorId) {
  if (cursorId) {
    params.push(Number(cursorId));
  }
  return params;
}

/**
 * 示例：使用游标分页的 SQL 构建
 *
 * // 第一页（无 cursor）
 * const sql1 = `
 *   SELECT * FROM jobs
 *   WHERE status = 'active' AND deleted_at IS NULL
 *   ORDER BY created_at DESC, id DESC
 *   LIMIT ?
 * `;
 * const [rows1] = await pool.query(sql1, [21]); // 取 21 条（多取一条判断是否有下页）
 * const { items, nextCursor, hasMore } = generatePaginationResponse(rows1, 20);
 *
 * // 第二页（有 cursor = 最后一条的 id）
 * const sql2 = `
 *   SELECT * FROM jobs
 *   WHERE status = 'active' AND deleted_at IS NULL AND id > ?
 *   ORDER BY created_at DESC, id DESC
 *   LIMIT ?
 * `;
 * const [rows2] = await pool.query(sql2, [nextCursor, 21]);
 * const page2 = generatePaginationResponse(rows2, 20);
 */
