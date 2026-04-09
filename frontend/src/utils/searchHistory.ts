/**
 * 搜索历史工具函数
 * 基于 localStorage 实现搜索历史的增删查
 */

const STORAGE_KEY = 'qihang_search_history';
const MAX_ITEMS = 10;

/**
 * 获取搜索历史列表
 */
export function getSearchHistory(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * 添加搜索历史（去重，最新置顶，最多保留 MAX_ITEMS 条）
 */
export function addSearchHistory(keyword: string): void {
  const trimmed = keyword.trim();
  if (!trimmed) return;

  try {
    const history = getSearchHistory();
    // 去重：移除已存在的相同关键词
    const filtered = history.filter(item => item !== trimmed);
    // 置顶最新
    filtered.unshift(trimmed);
    // 限制数量
    const limited = filtered.slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limited));
  } catch {
    // localStorage 不可用时静默失败
  }
}

/**
 * 清空搜索历史
 */
export function clearSearchHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 静默失败
  }
}

/**
 * 删除单条搜索历史
 */
export function removeSearchHistoryItem(keyword: string): void {
  try {
    const history = getSearchHistory();
    const filtered = history.filter(item => item !== keyword);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch {
    // 静默失败
  }
}
