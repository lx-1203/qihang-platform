import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import StudyAbroadArticles from '../../pages/StudyAbroadArticles';
import Jobs from '../../pages/Jobs';
import Mentors from '../../pages/Mentors';

/**
 * 表单字段可访问性测试
 *
 * 测试目标：确保所有表单字段（input, select, textarea）都有 id 或 name 属性
 * 这对于浏览器自动填充功能至关重要
 */

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Form Field Accessibility - id/name attributes', () => {
  describe('StudyAbroadArticles.tsx', () => {
    it('搜索输入框应该有 id 属性 (line 93)', () => {
      const { container } = renderWithRouter(<StudyAbroadArticles />);
      const searchInput = container.querySelector('input[placeholder*="搜索"]');
      expect(searchInput).toBeTruthy();
      expect(searchInput?.getAttribute('id') || searchInput?.getAttribute('name')).toBeTruthy();
    });

    it('分类选择器应该有 id 属性 (line 139)', () => {
      const { container } = renderWithRouter(<StudyAbroadArticles />);
      const categorySelect = container.querySelector('select');
      expect(categorySelect).toBeTruthy();
      expect(categorySelect?.getAttribute('id') || categorySelect?.getAttribute('name')).toBeTruthy();
    });
  });

  describe('Jobs.tsx', () => {
    it('职位类型选择器应该有 id 属性 (line 360)', () => {
      const { container } = renderWithRouter(<Jobs />);
      const typeSelects = container.querySelectorAll('select');
      expect(typeSelects.length).toBeGreaterThan(0);
      typeSelects.forEach(select => {
        expect(select.getAttribute('id') || select.getAttribute('name')).toBeTruthy();
      });
    });

    it('地区选择器应该有 id 属性 (line 377)', () => {
      const { container } = renderWithRouter(<Jobs />);
      const selects = container.querySelectorAll('select');
      expect(selects.length).toBeGreaterThanOrEqual(2);
      // 第二个 select 是地区选择器
      if (selects[1]) {
        expect(selects[1].getAttribute('id') || selects[1].getAttribute('name')).toBeTruthy();
      }
    });

    it('排序选择器应该有 id 属性 (line 394)', () => {
      const { container } = renderWithRouter(<Jobs />);
      const selects = container.querySelectorAll('select');
      expect(selects.length).toBeGreaterThanOrEqual(3);
      // 第三个 select 是排序选择器
      if (selects[2]) {
        expect(selects[2].getAttribute('id') || selects[2].getAttribute('name')).toBeTruthy();
      }
    });
  });

  describe('Mentors.tsx', () => {
    it('专业领域选择器应该有 id 属性 (line 160)', () => {
      const { container } = renderWithRouter(<Mentors />);
      const selects = container.querySelectorAll('select');
      expect(selects.length).toBeGreaterThan(0);
      selects.forEach(select => {
        expect(select.getAttribute('id') || select.getAttribute('name')).toBeTruthy();
      });
    });

    it('排序选择器应该有 id 属性 (line 177)', () => {
      const { container } = renderWithRouter(<Mentors />);
      const selects = container.querySelectorAll('select');
      expect(selects.length).toBeGreaterThanOrEqual(2);
      if (selects[1]) {
        expect(selects[1].getAttribute('id') || selects[1].getAttribute('name')).toBeTruthy();
      }
    });
  });
});
