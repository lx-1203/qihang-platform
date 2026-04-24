import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import CompanyProfile from '../../../pages/company/Profile';
import http from '@/api/http';

vi.mock('@/api/http', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('@/components/ui/ToastContainer', () => ({
  showToast: vi.fn(),
}));

describe('CompanyProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows an editable empty profile form when backend returns no company profile', async () => {
    vi.mocked(http.get).mockResolvedValueOnce({
      data: {
        code: 200,
        data: {
          company: null,
        },
      },
    });

    render(<CompanyProfile />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '企业资料' })).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText('请输入企业全称')).toBeInTheDocument();
    expect(screen.queryByText('企业资料加载失败')).not.toBeInTheDocument();
  });
});
