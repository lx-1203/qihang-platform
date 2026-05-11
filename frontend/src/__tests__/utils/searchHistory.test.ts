import { describe, it, expect, beforeEach, vi } from 'vitest';

// ====== localStorage 内存存储 ======
let store: Record<string, string>;

// ====== 导入被测模块（模块本身不在导入时调用 localStorage，安全） ======
import {
  getSearchHistory,
  addSearchHistory,
  clearSearchHistory,
  removeSearchHistoryItem,
} from '@/utils/searchHistory';

// ====== 测试套件 ======
describe('searchHistory', () => {
  beforeEach(() => {
    // 重置内存存储
    store = {};
    // 创建 localStorage mock
    const mockLocalStorage = {
      getItem: vi.fn((key: string): string | null => {
        return store[key] ?? null;
      }),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      }),
    };
    vi.stubGlobal('localStorage', mockLocalStorage);
  });

  // ====== getSearchHistory ======
  describe('getSearchHistory', () => {
    it('无缓存数据时返回空数组', () => {
      const result = getSearchHistory();
      expect(result).toEqual([]);
    });

    it('有缓存数据时返回解析后的数组', () => {
      store['qihang_search_history'] = JSON.stringify(['前端', 'React', 'TypeScript']);
      const result = getSearchHistory();
      expect(result).toEqual(['前端', 'React', 'TypeScript']);
    });

    it('缓存数据损坏（非 JSON）时返回空数组', () => {
      store['qihang_search_history'] = '这不是 JSON';
      const result = getSearchHistory();
      expect(result).toEqual([]);
    });

    it('缓存数据为非数组类型时返回空数组', () => {
      store['qihang_search_history'] = JSON.stringify({ foo: 'bar' });
      const result = getSearchHistory();
      expect(result).toEqual([]);
    });

    it('缓存数据为数字时返回空数组', () => {
      store['qihang_search_history'] = JSON.stringify(123);
      const result = getSearchHistory();
      expect(result).toEqual([]);
    });
  });

  // ====== addSearchHistory ======
  describe('addSearchHistory', () => {
    it('首次添加关键词写入 localStorage', () => {
      addSearchHistory('React');

      const raw = store['qihang_search_history'];
      expect(raw).toBeDefined();
      const parsed = JSON.parse(raw);
      expect(parsed).toEqual(['React']);
    });

    it('重复关键词去重并置顶', () => {
      store['qihang_search_history'] = JSON.stringify(['Java', 'React', 'Python']);

      addSearchHistory('React');

      const parsed = JSON.parse(store['qihang_search_history']);
      expect(parsed).toEqual(['React', 'Java', 'Python']);
      // React 只出现一次，且在最前面
    });

    it('超过 10 条时截断到最近 10 条', () => {
      store['qihang_search_history'] = JSON.stringify([
        '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
      ]);

      addSearchHistory('11');

      const parsed = JSON.parse(store['qihang_search_history']);
      expect(parsed).toHaveLength(10);
      expect(parsed[0]).toBe('11');
      // '10' 应该被挤出去
      expect(parsed).not.toContain('10');
    });

    it('空字符串不写入', () => {
      addSearchHistory('');

      expect(store['qihang_search_history']).toBeUndefined();
    });

    it('纯空格字符串不写入', () => {
      addSearchHistory('   ');

      expect(store['qihang_search_history']).toBeUndefined();
    });

    it('自动 trim 前后空格', () => {
      addSearchHistory('  Vue  ');

      const parsed = JSON.parse(store['qihang_search_history']);
      expect(parsed[0]).toBe('Vue');
    });

    it('trim 后去重生效（空格版本与无空格版本视为相同）', () => {
      store['qihang_search_history'] = JSON.stringify(['React', 'Vue']);

      addSearchHistory('  React  ');

      const parsed = JSON.parse(store['qihang_search_history']);
      expect(parsed).toEqual(['React', 'Vue']);
    });

    it('添加多个关键词后保持正确的顺序', () => {
      addSearchHistory('A');
      addSearchHistory('B');
      addSearchHistory('C');

      const parsed = JSON.parse(store['qihang_search_history']);
      expect(parsed).toEqual(['C', 'B', 'A']);
    });

    it('重新添加旧关键词时置顶，其他顺序不变', () => {
      addSearchHistory('C');
      addSearchHistory('B');
      addSearchHistory('A');
      addSearchHistory('B'); // B 应被提到最前面

      const parsed = JSON.parse(store['qihang_search_history']);
      expect(parsed).toEqual(['B', 'A', 'C']);
    });
  });

  // ====== clearSearchHistory ======
  describe('clearSearchHistory', () => {
    it('清除所有历史记录', () => {
      store['qihang_search_history'] = JSON.stringify(['A', 'B', 'C']);

      clearSearchHistory();

      expect(store['qihang_search_history']).toBeUndefined();
      expect(getSearchHistory()).toEqual([]);
    });

    it('空历史时调用不报错', () => {
      expect(() => clearSearchHistory()).not.toThrow();
    });
  });

  // ====== removeSearchHistoryItem ======
  describe('removeSearchHistoryItem', () => {
    it('删除存在的关键词', () => {
      store['qihang_search_history'] = JSON.stringify(['React', 'Vue', 'Angular']);

      removeSearchHistoryItem('Vue');

      const parsed = JSON.parse(store['qihang_search_history']);
      expect(parsed).toEqual(['React', 'Angular']);
    });

    it('删除不存在的关键词不影响数据', () => {
      store['qihang_search_history'] = JSON.stringify(['React', 'Vue']);

      removeSearchHistoryItem('Svelte');

      const parsed = JSON.parse(store['qihang_search_history']);
      expect(parsed).toEqual(['React', 'Vue']);
    });

    it('删除最后一个关键词后数组为空', () => {
      store['qihang_search_history'] = JSON.stringify(['React']);

      removeSearchHistoryItem('React');

      const parsed = JSON.parse(store['qihang_search_history']);
      expect(parsed).toEqual([]);
    });
  });
});
