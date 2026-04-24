import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CompanyJobManage from '../../../pages/company/JobManage';
import http from '@/api/http';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/api/http', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('CompanyJobManage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('does not render soft-deleted jobs returned by the backend list', async () => {
    vi.mocked(http.get).mockResolvedValueOnce({
      data: {
        code: 200,
        data: {
          list: [
            {
              id: 1,
              title: '可见职位',
              location: '南京',
              salary: '10k-15k',
              type: '校招',
              status: 'active',
              view_count: 12,
              applications: 3,
              description: 'desc',
              requirements: 'req',
              created_at: '2026-04-01',
              deleted_at: null,
            },
            {
              id: 2,
              title: '已软删除职位',
              location: '苏州',
              salary: '8k-10k',
              type: '实习',
              status: 'inactive',
              view_count: 0,
              applications: 0,
              description: 'desc',
              requirements: 'req',
              created_at: '2026-04-02',
              deleted_at: '2026-04-03 10:00:00',
            },
          ],
          total: 2,
        },
      },
    });

    render(
      <MemoryRouter>
        <CompanyJobManage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('可见职位')).toBeInTheDocument();
    });

    expect(screen.queryByText('已软删除职位')).not.toBeInTheDocument();
  });

  it('restores the job row when delete request fails', async () => {
    vi.mocked(http.get).mockImplementation(() => Promise.resolve({
      data: {
        code: 200,
        data: {
          list: [
            {
              id: 1,
              title: '删除失败职位',
              location: '南京',
              salary: '10k-15k',
              type: '校招',
              status: 'active',
              view_count: 12,
              applications: 3,
              description: 'desc',
              requirements: 'req',
              created_at: '2026-04-01',
            },
          ],
          total: 1,
        },
      },
    }));
    vi.mocked(http.delete).mockRejectedValueOnce(new Error('delete failed'));

    render(
      <MemoryRouter>
        <CompanyJobManage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('删除失败职位')).toBeInTheDocument();
    });

    const jobRow = screen.getByText('删除失败职位').closest('tr');
    expect(jobRow).toBeTruthy();
    await userEvent.click(within(jobRow as HTMLElement).getAllByRole('button')[1]);
    await userEvent.click(screen.getByRole('button', { name: /删除/ }));
    await userEvent.click(screen.getByRole('button', { name: '确认删除' }));

    await waitFor(() => {
      expect(http.delete).toHaveBeenCalledWith('/company/jobs/1');
      expect(screen.getByText('删除失败职位')).toBeInTheDocument();
    });
  });
});
