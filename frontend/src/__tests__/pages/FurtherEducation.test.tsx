import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const { mockGet } = vi.hoisted(() => ({
  mockGet: vi.fn(),
}));

vi.mock('@/api/http', () => ({
  default: {
    get: mockGet,
  },
}));

import FurtherEducation from '../../pages/FurtherEducation';

describe('FurtherEducation', () => {
  it('splits the section into postgraduate exam, recommendation, and study abroad', async () => {
    mockGet.mockRejectedValue(new Error('network error'));
    mockGet.mockRejectedValue(new Error('network error'));

    render(
      <MemoryRouter>
        <FurtherEducation />
      </MemoryRouter>,
    );

    const furtherEdElements = screen.getAllByText('升学深造');
    expect(furtherEdElements.length).toBeGreaterThanOrEqual(2);

    expect(screen.getByRole('button', { name: '考研' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保研' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '留学' })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '考研时间线' })).toBeInTheDocument();
    }, { timeout: 3000 });
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '考研成功案例' })).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('switches the timeline and success cases with the active sub-section', async () => {
    mockGet.mockRejectedValue(new Error('network error'));

    render(
      <MemoryRouter>
        <FurtherEducation />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '考研时间线' })).toBeInTheDocument();
    }, { timeout: 3000 });

    await userEvent.click(screen.getByRole('button', { name: '保研' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '保研时间线' })).toBeInTheDocument();
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(screen.getByText('夏令营信息搜集')).toBeInTheDocument();
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '保研成功案例' })).toBeInTheDocument();
    }, { timeout: 3000 });

    await userEvent.click(screen.getByRole('button', { name: '留学' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '留学时间线' })).toBeInTheDocument();
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(screen.getByText('选校定位与语言准备')).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
