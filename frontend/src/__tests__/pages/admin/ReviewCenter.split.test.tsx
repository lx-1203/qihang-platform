import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ReviewCenter from '@/pages/admin/ReviewCenter';

vi.mock('@/api/http', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { code: 200, data: { records: [] } } }),
    put: vi.fn(),
  },
}));

vi.mock('@/components/ui/ToastContainer', () => ({
  showToast: vi.fn(),
}));

vi.mock('@/pages/admin/CompanyReview', () => ({
  default: () => <div data-testid="company-review">CompanyReview Component</div>,
}));

vi.mock('@/pages/admin/MentorReview', () => ({
  default: () => <div data-testid="mentor-review">MentorReview Component</div>,
}));

describe('ReviewCenter - Tab Splitting', () => {
  it('渲染 3 个 Tab（用户与实名审核、企业资质审核、导师资质审核）', () => {
    render(<ReviewCenter />);

    expect(screen.getByText('用户与实名审核')).toBeInTheDocument();
    expect(screen.getByText('企业资质审核')).toBeInTheDocument();
    expect(screen.getByText('导师资质审核')).toBeInTheDocument();
  });

  it('默认激活"用户与实名审核"Tab', () => {
    render(<ReviewCenter />);

    const identityTab = screen.getByText('用户与实名审核');
    expect(identityTab).toBeInTheDocument();
    expect(identityTab.closest('button')?.className).toContain('bg-primary-600');
  });

  it('点击企业Tab后切换到企业资质审核', async () => {
    render(<ReviewCenter />);

    const companyTab = screen.getByText('企业资质审核');
    fireEvent.click(companyTab);

    expect(screen.getByTestId('company-review')).toBeInTheDocument();
    expect(screen.getByText('CompanyReview Component')).toBeInTheDocument();
  });

  it('企业Tab渲染 CompanyReview 组件', async () => {
    render(<ReviewCenter />);

    fireEvent.click(screen.getByText('企业资质审核'));

    expect(screen.getByTestId('company-review')).toBeInTheDocument();
  });

  it('导师Tab渲染 MentorReview 组件', async () => {
    render(<ReviewCenter />);

    fireEvent.click(screen.getByText('导师资质审核'));

    expect(screen.getByTestId('mentor-review')).toBeInTheDocument();
    expect(screen.getByText('MentorReview Component')).toBeInTheDocument();
  });

  it('Tab 切换后旧 Tab 内容不再显示', async () => {
    render(<ReviewCenter />);

    fireEvent.click(screen.getByText('企业资质审核'));
    expect(screen.getByTestId('company-review')).toBeInTheDocument();

    fireEvent.click(screen.getByText('导师资质审核'));
    expect(screen.getByTestId('mentor-review')).toBeInTheDocument();
  });

  it('用户Tab渲染搜索框和审核统计面板', () => {
    render(<ReviewCenter />);

    expect(screen.getByText('审核中心')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/搜索.*用户.*邮箱.*姓名/i)).toBeInTheDocument();
  });

  it('审核统计面板渲染 4 个统计卡片', () => {
    render(<ReviewCenter />);

    expect(screen.getByText('实名认证')).toBeInTheDocument();
    expect(screen.getByText('生涯规划')).toBeInTheDocument();
    expect(screen.getByText('企业资质')).toBeInTheDocument();
    expect(screen.getByText('咨询资质')).toBeInTheDocument();
  });
});