import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CareerPlan from '../../pages/CareerPlan';
import { useAuthStore } from '../../store/auth';

const { getMock, postMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
}));

vi.mock('../../api/http', () => ({
  default: {
    get: getMock,
    post: postMock,
  },
}));

describe('CareerPlan', () => {
  beforeEach(async () => {
    getMock.mockReset();
    postMock.mockReset();
    getMock.mockResolvedValue({ data: { data: null } });
    await useAuthStore.getState().logout();
    useAuthStore.getState().resetAccessStatus();
    localStorage.clear();
  });

  it('falls back to / when submit response has no redirectTo', async () => {
    postMock.mockResolvedValue({
      data: {
        data: {
          realNameStatus: 'approved',
          careerPlanStatus: 'completed',
          role: 'student',
          allowedRoutes: ['*'],
        },
      },
    });

    render(
      <MemoryRouter initialEntries={['/career-plan']}>
        <Routes>
          <Route path="/" element={<div>home</div>} />
          <Route path="/career-plan" element={<CareerPlan />} />
        </Routes>
      </MemoryRouter>
    );

    await userEvent.type(screen.getByPlaceholderText(/姓名/i), '张三');
    await userEvent.type(screen.getByPlaceholderText(/学校/i), '测试大学');
    await userEvent.type(screen.getByPlaceholderText(/专业/i), '计算机');
    await userEvent.type(screen.getByPlaceholderText(/毕业年份/i), '2027');
    await userEvent.click(screen.getByRole('button', { name: '求职就业' }));
    await userEvent.click(screen.getByRole('button', { name: /完成生涯规划并进入平台/i }));

    expect(await screen.findByText('home')).toBeInTheDocument();
  });
});
