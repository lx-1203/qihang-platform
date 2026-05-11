import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../../..');

function readRepoFile(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('Phase 1 page source cleanup', () => {
  it('keeps Guidance free of stale booking and cross-section entry points', () => {
    const source = readRepoFile('src/pages/Guidance.tsx');

    expect(source).not.toContain('/mentors');
    expect(source).not.toContain('/courses');
    expect(source).not.toContain('/guidance/articles');
  });

  it('keeps Postgrad free of stale community and cross-section entry points', () => {
    const source = readRepoFile('src/pages/Postgrad.tsx');

    expect(source).not.toContain('/guidance/articles');
    expect(source).not.toContain('咨询上岸学长');
  });

  it('keeps StudyAbroadArticles free of legacy chat entry points', () => {
    const source = readRepoFile('src/pages/StudyAbroadArticles.tsx');

    expect(source).not.toContain('/chat/conversations');
    expect(source).not.toContain("navigate('/chat')");
    expect(source).not.toContain('useAuthStore');
    expect(source).not.toContain('showToast');
  });

  it('keeps StudyAbroadOffers free of legacy chat entry points', () => {
    const source = readRepoFile('src/pages/StudyAbroadOffers.tsx');

    expect(source).not.toContain('/chat/conversations');
    expect(source).not.toContain("navigate('/chat')");
    expect(source).not.toContain('useAuthStore');
    expect(source).not.toContain('showToast');
  });

  it('keeps StudyAbroadPrograms free of legacy chat entry points', () => {
    const source = readRepoFile('src/pages/StudyAbroadPrograms.tsx');

    expect(source).not.toContain('/chat/conversations');
    expect(source).not.toContain("navigate('/chat')");
    expect(source).not.toContain('useAuthStore');
    expect(source).not.toContain('showToast');
  });

  it('keeps StudyAbroad free of mentor-booking detours', () => {
    const source = readRepoFile('src/pages/StudyAbroad.tsx');

    expect(source).not.toContain('/mentors');
  });

  it('keeps BackgroundBoost copy aligned to module browsing instead of consultation funnels', () => {
    const source = readRepoFile('src/pages/BackgroundBoost.tsx');

    expect(source).not.toMatch(/免费咨询/);
    expect(source).not.toMatch(/咨询科研项目|咨询论文发表|咨询实践项目|咨询语言课程/);
  });

  it('keeps FloatingService free of mentor-booking shortcuts', () => {
    const source = readRepoFile('src/components/FloatingService.tsx');

    expect(source).not.toContain('/mentors');
    expect(source).not.toMatch(/预约导师/);
  });

  it('keeps Jobs free of mentor-booking detours', () => {
    const source = readRepoFile('src/pages/Jobs.tsx');

    expect(source).not.toContain('/mentors');
    expect(source).not.toContain('1v1修改简历');
  });

  it('keeps public mentor detail free of direct contact exposure and course detours', () => {
    const source = readRepoFile('src/pages/MentorDetail.tsx');

    expect(source).not.toContain('contact_email');
    expect(source).not.toContain('wechat');
    expect(source).not.toContain('phone');
    expect(source).not.toContain('/courses');
  });

  it('keeps dormant public entry components free of cross-section shortcuts', () => {
    expect(readRepoFile('src/components/ServiceGrid.tsx')).not.toContain('/mentors');
    expect(readRepoFile('src/components/ServiceGrid.tsx')).not.toContain('/courses');
    expect(readRepoFile('src/components/ServiceGrid.tsx')).not.toContain('/guidance');
    expect(readRepoFile('src/components/ServiceGrid.tsx')).not.toContain('行业导师实时预约');
    expect(readRepoFile('src/components/ServiceGrid.tsx')).not.toContain('一对一深度辅导');
    expect(readRepoFile('src/components/SceneBanner.tsx')).not.toContain('/mentors');
    expect(readRepoFile('src/components/ProcessSteps.tsx')).not.toContain('/mentors');
    expect(readRepoFile('src/components/ProcessSteps.tsx')).not.toContain('/courses');
    expect(readRepoFile('src/components/CampusTimeline.tsx')).not.toContain('/mentors');
    expect(readRepoFile('src/components/BusinessSectors.tsx')).not.toContain('/jobs?');
    expect(readRepoFile('src/components/OnboardingGuide.tsx')).not.toContain('/mentors');
  });

  it('keeps login and guidance copy away from public 1v1 promotion language', () => {
    expect(readRepoFile('src/pages/Login.tsx')).not.toContain('1v1大咖导师指导');
    expect(readRepoFile('src/pages/Guidance.tsx')).not.toContain('1v1 简历精修');
  });
});
