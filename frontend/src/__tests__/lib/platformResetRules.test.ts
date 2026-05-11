import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PLATFORM_RESET_RULES,
  collectPlatformResetViolations,
} from '@/lib/platformResetRules';

const repoRoot = path.resolve(__dirname, '../../..');

function readRepoFile(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('platformResetRules', () => {
  it('flags removed community and public mentor-booking runtime phrases', () => {
    const violations = collectPlatformResetViolations(
      '社区 预约导师 导师1v1 一对一导师 优先预约权 /student/appointments',
    );

    expect(violations).toEqual([
      '社区',
      '预约导师',
      '导师1v1',
      '一对一导师',
      '优先预约权',
      '/student/appointments',
      PLATFORM_RESET_RULES.publicMentorBookingFuzzy[0].toString(),
    ]);
  });

  it('flags public mentor-booking phrases via fuzzy regex patterns', () => {
    const fuzzyRegex = /导师.*预约|预约.*导师|1v1.*咨询.*导师/i;

    const violations1 = collectPlatformResetViolations('导师一对一预约服务现已上线');
    expect(violations1).toContain(fuzzyRegex.toString());

    const violations2 = collectPlatformResetViolations('立即预约资深导师进行评估');
    expect(violations2).toContain(fuzzyRegex.toString());

    const violations3 = collectPlatformResetViolations('享受1v1咨询导师的专属通道');
    expect(violations3).toContain(fuzzyRegex.toString());

    const violationsNoMatch = collectPlatformResetViolations('正常的学习辅导内容');
    expect(violationsNoMatch).not.toContain(fuzzyRegex.toString());
  });

  it('keeps owned public runtime files clear of removed public-booking copy', () => {
    const fileMap = {
      'src/components/BusinessSectors.tsx': readRepoFile('src/components/BusinessSectors.tsx'),
      'src/data/business-sectors.json': readRepoFile('src/data/business-sectors.json'),
      'src/components/CampusTimeline.tsx': readRepoFile('src/components/CampusTimeline.tsx'),
      'src/components/OnboardingGuide.tsx': readRepoFile('src/components/OnboardingGuide.tsx'),
      'src/components/ProcessSteps.tsx': readRepoFile('src/components/ProcessSteps.tsx'),
      'src/components/SceneBanner.tsx': readRepoFile('src/components/SceneBanner.tsx'),
      'src/components/ServiceGrid.tsx': readRepoFile('src/components/ServiceGrid.tsx'),
      'src/pages/MentorDetail.tsx': readRepoFile('src/pages/MentorDetail.tsx'),
    };

    const violations = Object.entries(fileMap)
      .map(([relativePath, source]) => ({
        relativePath,
        matches: collectPlatformResetViolations(source),
      }))
      .filter((entry) => entry.matches.length > 0);

    expect(violations).toEqual([]);
  });

  it('exposes the expected reset rule categories', () => {
    expect(PLATFORM_RESET_RULES.community).toContain('社区');
    expect(PLATFORM_RESET_RULES.publicMentorBooking).toContain('/student/appointments');
    expect(PLATFORM_RESET_RULES.publicMentorBooking).toContain('导师1v1');
    expect(PLATFORM_RESET_RULES.publicMentorBooking).toContain('一对一导师');
    expect(PLATFORM_RESET_RULES.publicMentorBooking).toContain('优先预约权');
    expect(PLATFORM_RESET_RULES.publicMentorBookingFuzzy).toBeDefined();
    expect(PLATFORM_RESET_RULES.publicMentorBookingFuzzy.length).toBeGreaterThan(0);
  });

  it('keeps selected init-db runtime config phrases free of public mentor-booking language', () => {
    const initDbSource = readRepoFile('../backend/init-db.js');
    const runtimeConfigSnippets = [
      "title: '大咖导师\\n1对1辅导'",
      "desc: '导师辅导预约'",
      "points: ['一站搜索校招/实习/社招岗位', '1v1预约行业大咖导师辅导'",
    ];

    for (const snippet of runtimeConfigSnippets) {
      expect(initDbSource).not.toContain(snippet);
    }
  });
  it('keeps init-db homepage and platform feature seeds aligned to the new IA', () => {
    const initDbSource = readRepoFile('../backend/init-db.js');

    for (const snippet of [
      'home_hero_slides',
      'home_process_steps',
      'home_stats_jobs',
      'home_stats_companies',
      'home_stats_mentors',
      'home_stats_students',
      'home_features',
      'quickEntries',
      'valueSections',
      "title: '导师1v1'",
      "title: '技能课程'",
      "title: '全程护航'",
    ]) {
      expect(initDbSource).not.toContain(snippet);
    }

    expect(initDbSource).toContain("link: '/skill-enhancement'");
    expect(initDbSource).toContain("link: '/further-education'");
    expect(initDbSource).toContain("link: '/job-recruitment'");
    expect(initDbSource).toContain("link: '/entrepreneurship'");
  });
});
