import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import fs from 'node:fs';
import path from 'node:path';
import Home from '../../pages/Home';
import MainLayout from '../../layouts/MainLayout';

const repoRoot = path.resolve(__dirname, '../../..');

vi.mock('../../api/http', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { data: [] } }),
  },
}));

vi.mock('../../store/auth', () => ({
  useAuthStore: () => ({
    isAuthenticated: false,
    user: null,
    logout: vi.fn(),
    setAccessStatus: vi.fn(),
  }),
}));

vi.mock('../../components/ui/PageTransition', () => ({
  default: () => <div>page transition</div>,
}));

vi.mock('../../components/DevFloatButton', () => ({
  default: () => null,
}));

describe('Home', () => {
  it('renders the minimal homepage without legacy promotional sections', () => {
    const { container } = render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getByText(/启航平台/)).toBeInTheDocument();
    expect(screen.queryByText(/轮播|成功案例|统计|推荐|预约导师/i)).not.toBeInTheDocument();
    expect(container.firstChild).toHaveClass('min-h-[calc(100vh-64px)]');
  });

  it('renders a mobile navigation trigger in the top shell', () => {
    render(
      <MemoryRouter>
        <MainLayout />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /open navigation menu/i })).toBeInTheDocument();
  });

  it('removes page-body cross-section entry points from phase-1 student pages', () => {
    const guidanceSource = fs.readFileSync(path.join(repoRoot, 'src/pages/Guidance.tsx'), 'utf8');
    const postgradSource = fs.readFileSync(path.join(repoRoot, 'src/pages/Postgrad.tsx'), 'utf8');
    const jobsSource = fs.readFileSync(path.join(repoRoot, 'src/pages/Jobs.tsx'), 'utf8');
    const studyAbroadArticlesSource = fs.readFileSync(
      path.join(repoRoot, 'src/pages/StudyAbroadArticles.tsx'),
      'utf8',
    );
    const studyAbroadOffersSource = fs.readFileSync(
      path.join(repoRoot, 'src/pages/StudyAbroadOffers.tsx'),
      'utf8',
    );
    const studyAbroadProgramsSource = fs.readFileSync(
      path.join(repoRoot, 'src/pages/StudyAbroadPrograms.tsx'),
      'utf8',
    );
    const floatingSource = fs.readFileSync(path.join(repoRoot, 'src/components/FloatingService.tsx'), 'utf8');
    const homeConfigSource = fs.readFileSync(path.join(repoRoot, 'src/data/home-ui-config.json'), 'utf8');
    const migrateHomeConfigSource = fs.readFileSync(path.join(repoRoot, '../backend/migrate-home-config.js'), 'utf8');

    expect(guidanceSource).not.toContain('/skill-enhancement');
    expect(jobsSource).not.toContain('/skill-enhancement');
    expect(studyAbroadArticlesSource).not.toContain('/further-education');
    expect(studyAbroadOffersSource).not.toContain('/further-education');
    expect(studyAbroadProgramsSource).not.toContain('/further-education');
    expect(floatingSource).not.toContain('/career-plan');
    expect(floatingSource).not.toContain('/guidance');
    expect(homeConfigSource).not.toContain('"heroSlides"');
    expect(homeConfigSource).not.toContain('"quickEntries"');
    expect(homeConfigSource).not.toContain('"stats"');
    expect(homeConfigSource).not.toContain('"valueSections"');
    expect(migrateHomeConfigSource).not.toContain('home_hero_slides');
    expect(migrateHomeConfigSource).not.toContain('heroSlides');
    expect(migrateHomeConfigSource).not.toContain('quickEntries');
    expect(migrateHomeConfigSource).not.toContain('valueSections');
  });

  it('keeps the top navigation shell as the only first-level entry surface in layout source', () => {
    const mainLayoutSource = fs.readFileSync(path.join(repoRoot, 'src/layouts/MainLayout.tsx'), 'utf8');

    expect(mainLayoutSource).not.toContain('DevFloatButton');
  });
});
