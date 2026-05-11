import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import JobRecruitment from '../../pages/JobRecruitment';
import http from '../../api/http';

vi.mock('../../api/http', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('JobRecruitment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the independent recruitment workspace with backend timeline items and jobs', async () => {
    vi.mocked(http.get).mockImplementation((url: string) => {
      if (url === '/recruitment-timelines') {
        return Promise.resolve({
          data: {
            code: 200,
            data: [
              {
                id: 1,
                title: '2027 秋招提前批',
                company_name: '字节跳动',
                event_type: '提前批',
                start_date: '2026-07-10',
                end_date: '2026-08-15',
                apply_link: 'https://example.com/apply',
                description: '技术、产品、运营岗位同步开放',
              },
            ],
          },
        });
      }

      if (url === '/jobs') {
        return Promise.resolve({
          data: {
            code: 200,
            data: {
              jobs: [
                {
                  id: 9,
                  title: '前端开发工程师',
                  company_name: '启航科技',
                  location: '上海',
                  salary: '18k-28k',
                  type: '校招',
                  tags: ['React', 'TypeScript'],
                },
              ],
            },
          },
        });
      }

      return Promise.resolve({ data: { code: 200, data: { jobs: [] } } });
    });

    render(
      <MemoryRouter>
        <JobRecruitment />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: '求职招聘' })).toBeInTheDocument();
    expect(screen.getByText('大厂招聘时间线')).toBeInTheDocument();
    expect(screen.getByText('岗位浏览')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('2027 秋招提前批')).toBeInTheDocument();
      expect(screen.getByText('前端开发工程师')).toBeInTheDocument();
    });
  });

  it('shows an empty-state message when no timeline items are available', async () => {
    vi.mocked(http.get).mockImplementation((url: string) => {
      if (url === '/recruitment-timelines') {
        return Promise.resolve({ data: { code: 200, data: [] } });
      }

      if (url === '/jobs') {
        return Promise.resolve({ data: { code: 200, data: { jobs: [] } } });
      }

      return Promise.resolve({ data: { code: 200, data: { jobs: [] } } });
    });

    render(
      <MemoryRouter>
        <JobRecruitment />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/暂无招聘时间线/)).toBeInTheDocument();
    });
  });

  it('hydrates keyword filters from the new job-recruitment query string', async () => {
    vi.mocked(http.get).mockImplementation((url: string) => {
      if (url === '/recruitment-timelines') {
        return Promise.resolve({ data: { code: 200, data: [] } });
      }

      if (url === '/jobs') {
        return Promise.resolve({
          data: {
            code: 200,
            data: {
              jobs: [],
              total: 0,
            },
          },
        });
      }

      return Promise.resolve({ data: { code: 200, data: [] } });
    });

    render(
      <MemoryRouter initialEntries={['/job-recruitment?keyword=海外']}>
        <JobRecruitment />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(vi.mocked(http.get)).toHaveBeenCalledWith('/jobs', {
        params: expect.objectContaining({ keyword: '海外' }),
      });
    });
  });
});
