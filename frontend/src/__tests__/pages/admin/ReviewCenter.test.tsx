import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ReviewCenter from '@/pages/admin/ReviewCenter';

describe('ReviewCenter', () => {
  it('shows the unified admin review entry points', () => {
    render(
      <MemoryRouter>
        <ReviewCenter />
      </MemoryRouter>,
    );

    expect(screen.getByText('审核中心')).toBeInTheDocument();
    expect(screen.getByText('用户与实名审核')).toBeInTheDocument();

    const identityElements = screen.getAllByText('实名认证');
    expect(identityElements.length).toBeGreaterThanOrEqual(1);

    const careerElements = screen.getAllByText('生涯规划');
    expect(careerElements.length).toBeGreaterThanOrEqual(1);

    const companyElements = screen.getAllByText('企业资质');
    expect(companyElements.length).toBeGreaterThanOrEqual(1);

    const mentorElements = screen.getAllByText('咨询资质');
    expect(mentorElements.length).toBeGreaterThanOrEqual(1);
  });
});
