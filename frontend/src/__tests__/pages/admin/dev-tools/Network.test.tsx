import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Network from '../../../../pages/admin/dev-tools/Network';

// ====== Test Suite ======
describe('Network (dev-tools)', () => {
  // ========== 1. Network 页面正常渲染 ==========
  describe('page rendering', () => {
    it('renders the page title "网络监控"', () => {
      render(<Network />);
      expect(screen.getByText('网络监控')).toBeInTheDocument();
    });

    it('renders the subtitle description', () => {
      render(<Network />);
      expect(
        screen.getByText('监控 API 请求、响应时间、错误率'),
      ).toBeInTheDocument();
    });

    it('renders the Activity icon wrapper with correct styling', () => {
      const { container } = render(<Network />);

      // Activity 图标容器应有 sky 色系样式
      const iconWrapper = container.querySelector('.bg-sky-500\\/15');
      expect(iconWrapper).toBeInTheDocument();
      expect(iconWrapper?.className).toContain('rounded-2xl');

      // 应包含 svg（Activity 图标）
      const svg = iconWrapper?.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('renders the Wifi icon', () => {
      render(<Network />);

      // Wifi 图标由 lucide-react 提供，通过 svg 标签验证
      const wifiContainer = document.querySelector('.bg-slate-800\\/50');
      const svgs = wifiContainer?.querySelectorAll('svg');
      expect(svgs?.length).toBeGreaterThan(0);
    });

    it('displays "开发中，即将上线" development status badge', () => {
      render(<Network />);

      expect(screen.getByText('开发中，即将上线')).toBeInTheDocument();
    });

    it('development badge is styled with muted colors', () => {
      render(<Network />);

      const badge = screen.getByText('开发中，即将上线');
      const badgeContainer = badge.closest('span');
      // 文字颜色应为 muted slate
      expect(badgeContainer?.className).toContain('text-slate-500');
    });
  });

  // ========== 2. 页面布局 ==========
  describe('page layout', () => {
    it('renders as a centered flex container', () => {
      const { container } = render(<Network />);

      const rootDiv = container.firstChild as HTMLElement;
      expect(rootDiv?.className).toContain('flex');
      expect(rootDiv?.className).toContain('flex-col');
      expect(rootDiv?.className).toContain('items-center');
      expect(rootDiv?.className).toContain('justify-center');
    });

    it('has minimum height to prevent content collapse', () => {
      const { container } = render(<Network />);

      const rootDiv = container.firstChild as HTMLElement;
      expect(rootDiv?.className).toContain('min-h-[400px]');
    });

    it('renders icon wrapper with correct size (16x16 → w-16 h-16)', () => {
      const { container } = render(<Network />);

      const iconWrapper = container.querySelector('.w-16');
      expect(iconWrapper).toBeInTheDocument();
      const heightWrapper = container.querySelector('.h-16');
      expect(heightWrapper).toBeInTheDocument();
    });
  });

  // ========== 3. 占位页面无交互元素 ==========
  describe('placeholder state behavior', () => {
    it('has no interactive buttons', () => {
      render(<Network />);

      const buttons = screen.queryAllByRole('button');
      expect(buttons.length).toBe(0);
    });

    it('has no form inputs', () => {
      render(<Network />);

      const inputs = screen.queryAllByRole('textbox');
      expect(inputs.length).toBe(0);
    });
  });

  // ========== 4. 未来升级预留测试（skip 标记） ==========
  // 当 Network 页面从占位页升级为完整功能时，取消 skip 并更新这些测试

  describe.skip('stats card display (future)', () => {
    it('displays total request count stat card', () => {
      // 待实现：统计卡片展示总请求数
    });

    it('displays average response time stat card', () => {
      // 待实现：统计卡片展示平均响应时间
    });

    it('displays error rate stat card', () => {
      // 待实现：统计卡片展示错误率
    });
  });

  describe.skip('request list rendering (future)', () => {
    it('renders a table with request rows', () => {
      // 待实现：请求列表表格渲染
    });

    it('displays Method column for each request', () => {
      // 待实现：表格 Method 列
    });

    it('displays URL column for each request', () => {
      // 待实现：表格 URL 列
    });

    it('displays Status column for each request', () => {
      // 待实现：表格 Status 列
    });

    it('displays Duration column for each request', () => {
      // 待实现：表格 Duration 列
    });
  });

  describe.skip('filter functionality (future)', () => {
    it('filters by status code range', () => {
      // 待实现：状态码范围过滤（2xx/3xx/4xx/5xx）
    });

    it('filters by HTTP method', () => {
      // 待实现：HTTP Method 过滤（GET/POST/PUT/DELETE）
    });

    it('filters by URL search keyword', () => {
      // 待实现：URL 关键词搜索过滤
    });

    it('clears filter to show all requests', () => {
      // 待实现：清除过滤恢复全部显示
    });
  });
});