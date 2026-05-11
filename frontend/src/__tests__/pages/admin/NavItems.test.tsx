import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import NavItems from '../../../pages/admin/NavItems';

const { getMock, postMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
}));

vi.mock('../../../api/http', () => ({
  default: {
    get: getMock,
    post: postMock,
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Admin NavItems', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    getMock.mockResolvedValue({ data: { data: [] } });
  });

  it('shows a constrained icon selector instead of a free-text icon input', async () => {
    render(
      <MemoryRouter>
        <NavItems />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('combobox', { name: '图标' })).toBeInTheDocument();
  });

  it('blocks external-path mismatches before writing nav items', async () => {
    render(
      <MemoryRouter>
        <NavItems />
      </MemoryRouter>,
    );

    await screen.findByRole('combobox', { name: '图标' });

    await userEvent.type(screen.getByLabelText('名称'), 'External Docs');
    await userEvent.type(screen.getByLabelText('链接'), '/docs');
    await userEvent.click(screen.getByRole('checkbox', { name: '外部链接' }));
    await userEvent.click(screen.getByRole('button', { name: '新增导航' }));

    await waitFor(() => {
      expect(postMock).not.toHaveBeenCalled();
    });

    expect(screen.getByText(/http|https|URL/i)).toBeInTheDocument();
  });

  it('blocks retired runtime paths before writing nav items', async () => {
    render(
      <MemoryRouter>
        <NavItems />
      </MemoryRouter>,
    );

    await screen.findByRole('combobox', { name: '图标' });

    await userEvent.type(screen.getByLabelText('名称'), 'Retired Mentors');
    await userEvent.type(screen.getByLabelText('链接'), '/mentors');
    await userEvent.click(screen.getByRole('button', { name: '新增导航' }));

    await waitFor(() => {
      expect(postMock).not.toHaveBeenCalled();
    });

    expect(screen.getByText('该路径仅保留兼容，请改用新的板块路径')).toBeInTheDocument();
  });

  it('blocks legacy jobs paths before writing nav items', async () => {
    render(
      <MemoryRouter>
        <NavItems />
      </MemoryRouter>,
    );

    await screen.findByRole('combobox', { name: '图标' });

    await userEvent.type(screen.getByLabelText('名称'), 'Legacy Jobs');
    await userEvent.type(screen.getByLabelText('链接'), '/jobs');
    await userEvent.click(screen.getByRole('button', { name: '新增导航' }));

    await waitFor(() => {
      expect(postMock).not.toHaveBeenCalled();
    });

    expect(screen.getByText('该路径仅保留兼容，请改用新的板块路径')).toBeInTheDocument();
  });
});
