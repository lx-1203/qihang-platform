import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminMentors from '../../../pages/admin/Mentors';
import http from '@/api/http';

vi.mock('@/api/http', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('@/components/ui/ToastContainer', () => ({
  showToast: vi.fn(),
}));

describe('AdminMentors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits mentor verification using the mentor user_id instead of the profile id', async () => {
    vi.mocked(http.get).mockResolvedValueOnce({
      data: {
        code: 200,
        data: {
          list: [
            {
              id: 88,
              user_id: 12,
              name: '张导师',
              title: '职业规划师',
              avatar: '',
              bio: '擅长求职辅导',
              expertise: ['简历优化'],
              rating: 4.9,
              price: 199,
              verify_status: 'pending',
              verify_remark: '',
              created_at: '2026-04-01',
            },
          ],
          total: 1,
        },
      },
    });
    vi.mocked(http.put).mockResolvedValueOnce({ data: { code: 200 } });
    vi.mocked(http.get).mockResolvedValueOnce({
      data: {
        code: 200,
        data: {
          list: [],
          total: 0,
        },
      },
    });

    render(<AdminMentors />);

    await waitFor(() => {
      expect(screen.getByText('张导师')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /通过/ }));

    await waitFor(() => {
      expect(http.put).toHaveBeenCalledWith('/admin/mentors/12/verify', {
        status: 1,
        remark: '',
      });
    });
  });
});
