import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../../..');

function readSource(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('admin IA cleanup source guards', () => {
  it('keeps DevNav focused on the new public IA and access flow', () => {
    const source = readSource('src/pages/DevNav.tsx');

    expect(source).toContain(`path: '/verify-identity'`);
    expect(source).toContain(`path: '/career-plan'`);
    expect(source).toContain(`path: '/skill-enhancement'`);
    expect(source).toContain(`path: '/further-education'`);
    expect(source).toContain(`path: '/job-recruitment'`);
    expect(source).toContain(`path: '/entrepreneurship'`);

    expect(source).not.toContain(`path: '/courses'`);
    expect(source).not.toContain(`path: '/courses/1'`);
    expect(source).not.toContain(`path: '/mentors'`);
    expect(source).not.toContain(`path: '/mentors/1'`);
    expect(source).not.toContain(`path: '/study-abroad'`);
    expect(source).not.toContain(`path: '/study-abroad/programs'`);
    expect(source).not.toContain(`path: '/study-abroad/offers'`);
    expect(source).not.toContain(`path: '/study-abroad/articles'`);
    expect(source).not.toContain(`path: '/study-abroad/background'`);
  });

  it('keeps the admin sidebar aligned to the newer management naming', () => {
    const source = readSource('src/layouts/AdminLayout.tsx');

    expect(source).toContain('导师审核工作台');
    expect(source).toContain('内容资源管理');
    expect(source).toContain('升学数据管理');

    expect(source).not.toContain('导师资质审核');
    expect(source).not.toContain('课程与内容管理');
    expect(source).not.toContain('留学数据管理');
  });

  it('keeps admin study-abroad and mentor workbench labels aligned to the new naming', () => {
    const studyAbroadSource = readSource('src/pages/admin/StudyAbroad.tsx');
    const mentorsSource = readSource('src/pages/admin/Mentors.tsx');
    const dashboardSource = readSource('src/pages/admin/Dashboard.tsx');

    expect(studyAbroadSource).toContain('升学数据管理');
    expect(studyAbroadSource).not.toContain('留学数据管理');

    expect(mentorsSource).toContain('导师审核工作台');
    expect(mentorsSource).toContain('认证咨询导师');
    expect(mentorsSource).not.toContain('导师资质审核');
    expect(mentorsSource).not.toContain('认证导师');

    expect(dashboardSource).toContain('咨询履约');
    expect(dashboardSource).not.toContain('导师预约');
  });

  it('keeps admin study-abroad link inputs aligned to the new public IA', () => {
    const source = readSource('src/pages/admin/StudyAbroad.tsx');

    expect(source).toContain('/further-education 或外部链接');
    expect(source).not.toContain("placeholder: '/study-abroad/...'");
  });

  it('keeps broader admin copy aligned to service-side and content terminology', () => {
    const dashboardSource = readSource('src/pages/admin/Dashboard.tsx');
    const usersSource = readSource('src/pages/admin/Users.tsx');
    const reviewCenterSource = readSource('src/pages/admin/ReviewCenter.tsx');
    const auditLogsSource = readSource('src/pages/admin/AuditLogs.tsx');
    const announcementsSource = readSource('src/pages/admin/Announcements.tsx');
    const settingsSource = readSource('src/pages/admin/Settings.tsx');

    expect(dashboardSource).toContain('咨询人员');
    expect(dashboardSource).toContain('内容总数');
    expect(dashboardSource).toContain('已认证咨询人员');
    expect(dashboardSource).toContain('咨询预约');
    expect(dashboardSource).toContain('待审核咨询人员');
    expect(dashboardSource).not.toContain('认证导师');
    expect(dashboardSource).not.toContain('预约辅导');
    expect(dashboardSource).not.toContain('待审核导师');

    expect(usersSource).toContain("mentor: { label: '咨询人员'");
    expect(usersSource).toContain("title: '身份标签'");
    expect(usersSource).toContain("available_time: '可服务时间'");
    expect(usersSource).not.toContain("mentor: { label: '导师'");
    expect(usersSource).not.toContain("title: '导师头衔'");
    expect(usersSource).not.toContain("available_time: '可预约时间'");

    expect(reviewCenterSource).toContain('咨询资质');
    expect(reviewCenterSource).toContain('非咨询角色用户');
    expect(reviewCenterSource).not.toContain('导师资质审核失败');
    expect(reviewCenterSource).not.toContain('非导师用户');

    expect(auditLogsSource).toContain("mentor: '咨询人员'");
    expect(auditLogsSource).toContain("<option value=\"course\">内容</option>");
    expect(auditLogsSource).not.toContain("mentor: '导师'");

    expect(announcementsSource).toContain("mentor: '咨询人员'");
    expect(settingsSource).toContain("mentor: '咨询人员'");
    expect(settingsSource).toContain("course: '内容'");
  });

  it('points postgrad admin preview to the new further-education IA', () => {
    const source = readSource('src/pages/admin/PostgradConfig.tsx');

    expect(source).toContain('href="/further-education"');
    expect(source).not.toContain('href="/postgrad"');
  });

  it('removes the legacy study-abroad homepage preview from admin config', () => {
    const source = readSource('src/pages/admin/StudyAbroadConfig.tsx');

    expect(source).toContain('/further-education');
    expect(source).toMatch(/已并入|统一从新 IA|升学深造/);
    expect(source).not.toContain("window.open('/study-abroad'");
  });

  it('removes the legacy background-boost preview from admin config', () => {
    const source = readSource('src/pages/admin/BackgroundBoostConfig.tsx');

    expect(source).toContain('/further-education');
    expect(source).toMatch(/已并入|统一从新 IA|升学深造/);
    expect(source).not.toContain('href="/study-abroad/background"');
  });
});
