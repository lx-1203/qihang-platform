import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CompanyResumePool from '../../../pages/company/ResumePool';
import http from '@/api/http';

vi.mock('@/api/http', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock('@/components/ui/ToastContainer', () => ({
  showToast: vi.fn(),
}));

describe('CompanyResumePool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows only the normalized three-state workflow columns', async () => {
    vi.mocked(http.get).mockResolvedValueOnce({
      data: {
        code: 200,
        data: {
          resumes: [
            {
              id: 1,
              student_name: 'Ada',
              school: 'FDU',
              major: 'CS',
              job_title: 'Platform Engineer',
              status: 'passed',
              created_at: '2026-04-01 10:00:00',
            },
          ],
        },
      },
    });

    render(<CompanyResumePool />);

    expect((await screen.findAllByText('待筛选')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('通过').length).toBeGreaterThan(0);
    expect(screen.getAllByText('淘汰').length).toBeGreaterThan(0);
    expect(screen.queryByText(/viewed/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/interview/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/offered/i)).not.toBeInTheDocument();
  });
});
