import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Entrepreneurship from '../../pages/Entrepreneurship';

describe('Entrepreneurship', () => {
  it('renders a placeholder-only entrepreneurship page for this phase', () => {
    render(
      <MemoryRouter>
        <Entrepreneurship />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: '创业' })).toBeInTheDocument();
    expect(screen.getByText('创业板块')).toBeInTheDocument();
    expect(screen.getByText('热门赛事')).toBeInTheDocument();
    expect(screen.getByText('组队大厅')).toBeInTheDocument();
    expect(screen.getByText('创业资料库')).toBeInTheDocument();
    expect(screen.getByText('创业指导')).toBeInTheDocument();
  });
});
