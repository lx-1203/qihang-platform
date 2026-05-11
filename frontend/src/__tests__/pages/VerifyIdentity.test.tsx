import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import VerifyIdentity from '../../pages/VerifyIdentity';
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

describe('VerifyIdentity', () => {
  beforeEach(async () => {
    getMock.mockReset();
    postMock.mockReset();
    getMock.mockResolvedValue({ data: { data: null } });
    await useAuthStore.getState().logout();
    useAuthStore.getState().resetAccessStatus();
    localStorage.clear();
  });

  it('falls back to /verify-identity when submit response has no redirectTo', async () => {
    postMock.mockResolvedValue({
      data: {
        data: {
          realNameStatus: 'submitted',
          careerPlanStatus: 'incomplete',
          role: 'student',
          allowedRoutes: ['/verify-identity', '/career-plan'],
        },
      },
    });

    render(
      <MemoryRouter initialEntries={['/verify-identity']}>
        <Routes>
          <Route path="/verify-identity" element={<VerifyIdentity />} />
          <Route path="/career-plan" element={<div>career</div>} />
        </Routes>
      </MemoryRouter>
    );

    await userEvent.type(screen.getByPlaceholderText(/真实姓名|real/i), '张三');
    await userEvent.type(screen.getByPlaceholderText('身份证号/证件号'), '123456');
    await userEvent.click(screen.getByRole('button', { name: /提交实名认证|submit/i }));

    await waitFor(() => {
      expect(screen.queryByText('career')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: /实名认证/i })).toBeInTheDocument();
  });
});
