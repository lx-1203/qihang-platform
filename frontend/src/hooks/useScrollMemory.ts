import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * 滚动位置记忆 hook
 * 从详情页返回列表页时恢复滚动位置
 *
 * @param key - 唯一标识符（通常使用路由路径）
 *
 * @example
 * // 列表页
 * useScrollMemory('jobs-list');
 *
 * // 点击卡片跳转前会自动保存位置
 * // 返回时自动恢复位置
 */
export function useScrollMemory(key?: string) {
  const location = useLocation();
  const storageKey = `scroll-pos-${key || location.pathname}`;

  // 恢复滚动位置
  useEffect(() => {
    const saved = sessionStorage.getItem(storageKey);
    if (saved) {
      const pos = parseInt(saved, 10);
      // 延迟恢复，等待内容渲染完成
      requestAnimationFrame(() => {
        window.scrollTo({ top: pos, behavior: 'instant' as ScrollBehavior });
      });
      // 恢复后清除，避免下次直接导航时仍然跳转
      sessionStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  // 保存当前滚动位置（在离开页面前调用）
  const savePosition = () => {
    sessionStorage.setItem(storageKey, String(window.scrollY));
  };

  return { savePosition };
}
