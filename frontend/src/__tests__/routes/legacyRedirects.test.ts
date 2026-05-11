import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../../..');

describe('legacy public route redirects', () => {
  const source = fs.readFileSync(path.join(repoRoot, 'src/routes/index.tsx'), 'utf8');

  it('redirects legacy guidance routes into skill enhancement', () => {
    expect(source).toContain("path: 'guidance'");
    expect(source).toContain('element: <Navigate to="/skill-enhancement" replace />');
    expect(source).toContain("path: 'guidance/articles'");
    expect(source).toContain("path: 'guidance/articles/:id'");
  });

  it('redirects legacy mentor and course public routes into skill enhancement', () => {
    expect(source).toContain("path: 'mentors'");
    expect(source).toContain("path: 'mentors/:id'");
    expect(source).toContain("path: 'courses'");
    expect(source).toContain("path: 'courses/:id'");
    expect(source.match(/Navigate to="\/skill-enhancement" replace/g)?.length ?? 0).toBeGreaterThanOrEqual(6);
    expect(source).not.toContain("const Mentors = lazy(() => import('../pages/Mentors'));");
    expect(source).not.toContain('<Mentors />');
    expect(source).not.toContain('<MentorDetail />');
    expect(source).not.toContain('<Courses />');
    expect(source).not.toContain('<CourseDetail />');
  });

  it('redirects the legacy jobs listing route into job recruitment', () => {
    expect(source).toContain("path: 'jobs'");
    expect(source).toContain('element: <Navigate to="/job-recruitment" replace />');
  });

  it('redirects legacy postgrad routes into further education', () => {
    expect(source).toContain("path: 'postgrad'");
    expect(source).toContain('element: <Navigate to="/further-education" replace />');
  });

  it('redirects legacy study-abroad routes into further education', () => {
    expect(source).toContain("path: 'study-abroad'");
    expect(source).toContain("path: 'study-abroad/programs'");
    expect(source).toContain("path: 'study-abroad/offers'");
    expect(source).toContain("path: 'study-abroad/background'");
    expect(source.match(/Navigate to="\/further-education" replace/g)?.length ?? 0).toBeGreaterThanOrEqual(6);
  });

  it('removes route-level capability checks from protected routes', () => {
    expect(source).not.toContain('requiredCapability=');
  });
});
