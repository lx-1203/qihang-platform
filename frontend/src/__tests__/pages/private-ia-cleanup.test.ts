import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../../..');

function readRepoFile(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('private IA cleanup within retained student and mentor surfaces', () => {
  it('removes legacy public course and mentor routes from student favorites and profile', () => {
    const favoritesSource = readRepoFile('src/pages/student/Favorites.tsx');
    const profileSource = readRepoFile('src/pages/student/Profile.tsx');

    expect(favoritesSource).not.toContain('/courses');
    expect(favoritesSource).not.toContain('/mentors');
    expect(favoritesSource).toContain('/skill-enhancement');
    expect(favoritesSource).toContain('/chat');

    expect(profileSource).not.toContain('/courses');
    expect(profileSource).not.toContain('/mentors');
    expect(profileSource).toContain('/skill-enhancement');
    expect(favoritesSource).toContain('成长内容');
    expect(favoritesSource).toContain('咨询对象');
    expect(favoritesSource).not.toContain("label: '课程'");
    expect(favoritesSource).not.toContain("label: '导师'");
  });

  it('keeps FAQ and admin quick replies aligned to current IA instead of public course or mentor funnels', () => {
    const faqSource = readRepoFile('src/components/chat/FAQList.tsx');
    const quickRepliesSource = readRepoFile('src/components/admin/QuickReplies.tsx');

    expect(faqSource).not.toContain('/courses');
    expect(faqSource).not.toContain('/mentors');
    expect(faqSource).not.toMatch(/预约导师|浏览课程|浏览导师/);

    expect(quickRepliesSource).not.toContain('/courses');
    expect(quickRepliesSource).not.toContain('/mentors');
    expect(quickRepliesSource).not.toMatch(/预约导师|导师页面|课程页面/);
  });

  it('keeps mentor dashboard on internal management routes and away from public mentor profile promotion', () => {
    const dashboardSource = readRepoFile('src/pages/mentor/Dashboard.tsx');

    expect(dashboardSource).not.toContain('/mentors/');
    expect(dashboardSource).toContain('/mentor/profile');
    expect(dashboardSource).toContain('/mentor/appointments');
  });

  it('keeps mentor-visible management copy aligned to 资源管理 while retaining 咨询管理', () => {
    const courseManageSource = readRepoFile('src/pages/mentor/CourseManage.tsx');
    const dashboardSource = readRepoFile('src/pages/mentor/Dashboard.tsx');
    const appointmentsSource = readRepoFile('src/pages/mentor/Appointments.tsx');
    const verificationSource = readRepoFile('src/pages/mentor/Verification.tsx');
    const statusBannerSource = readRepoFile('src/pages/mentor/components/MentorStatusBanner.tsx');
    const onboardingGuideSource = readRepoFile('src/components/OnboardingGuide.tsx');
    const studentsSource = readRepoFile('src/pages/mentor/Students.tsx');
    const profileSource = readRepoFile('src/pages/mentor/Profile.tsx');

    expect(courseManageSource).toContain('资源管理');
    expect(courseManageSource).not.toContain('课程管理');
    expect(dashboardSource).toContain('咨询管理');
    expect(appointmentsSource).toContain('咨询管理');
    expect(appointmentsSource).not.toContain('预约管理');
    expect(appointmentsSource).toContain('咨询记录列表');
    expect(appointmentsSource).toContain('咨询记录详情');
    expect(appointmentsSource).toContain('暂无咨询记录');
    expect(appointmentsSource).toContain('还没有任何学生咨询记录');
    expect(appointmentsSource).toContain('确定拒绝该咨询记录？');
    expect(appointmentsSource).not.toContain('学生将无法预约');
    expect(appointmentsSource).not.toContain('预约列表');
    expect(appointmentsSource).not.toContain('预约详情');
    expect(appointmentsSource).not.toContain('暂无预约');
    expect(appointmentsSource).not.toContain('还没有任何学生预约');
    expect(appointmentsSource).not.toContain('确定拒绝该预约？');

    expect(verificationSource).toContain('解锁咨询管理功能');
    expect(verificationSource).not.toContain('解锁预约管理功能');

    expect(statusBannerSource).toContain('开放咨询管理');
    expect(statusBannerSource).toContain('咨询管理已解锁');
    expect(statusBannerSource).not.toContain('开放预约操作');
    expect(statusBannerSource).not.toContain('预约管理已解锁');

    expect(onboardingGuideSource).toContain('可服务时间段');
    expect(onboardingGuideSource).not.toContain('可预约时间段');

    expect(studentsSource).toContain('咨询历史');
    expect(studentsSource).toContain('查看全部咨询');
    expect(studentsSource).not.toContain('预约历史');
    expect(studentsSource).not.toContain('查看全部预约');

    expect(profileSource).toContain('咨询服务');
    expect(profileSource).not.toContain('接受学生预约');
  });

  it('keeps student consultation history and portrait copy aligned to the new IA', () => {
    const appointmentsSource = readRepoFile('src/pages/student/MyAppointments.tsx');
    const portraitSource = readRepoFile('src/pages/student/Portrait.tsx');
    const devNavSource = readRepoFile('src/pages/DevNav.tsx');
    const zhLocaleSource = readRepoFile('src/locales/zh.ts');

    expect(appointmentsSource).toContain('我的咨询记录');
    expect(appointmentsSource).toContain('咨询已取消');
    expect(appointmentsSource).toContain('取消咨询');
    expect(appointmentsSource).not.toContain('我的预约');
    expect(appointmentsSource).not.toContain('预约已取消');
    expect(appointmentsSource).not.toContain('取消预约');
    expect(appointmentsSource).not.toContain('导师预约');

    expect(portraitSource).toContain('岗位和成长内容推荐');
    expect(portraitSource).not.toContain('岗位和课程推荐');

    expect(devNavSource).toContain('我的咨询记录');
    expect(devNavSource).toContain('导师咨询服务记录');
    expect(devNavSource).toContain('咨询管理');
    expect(devNavSource).toContain('资源管理');
    expect(devNavSource).not.toContain('我的预约');
    expect(devNavSource).not.toContain('预约管理');
    expect(devNavSource).not.toContain('辅导预约管理');
    expect(devNavSource).not.toContain('课程管理');

    expect(zhLocaleSource).toContain("myCourses: '我的资源'");
    expect(zhLocaleSource).toContain("manageCourses: '管理资源'");
    expect(zhLocaleSource).toContain("pendingAppts: '待确认咨询'");
    expect(zhLocaleSource).toContain("noAppointments: '暂无咨询记录'");
    expect(zhLocaleSource).toContain("cancel: '取消咨询'");
    expect(zhLocaleSource).toContain("confirm: '确认咨询'");
    expect(zhLocaleSource).not.toContain("myCourses: '我的课程'");
    expect(zhLocaleSource).not.toContain("manageCourses: '管理课程'");
    expect(zhLocaleSource).not.toContain("pendingAppts: '待确认预约'");
    expect(zhLocaleSource).not.toContain("noAppointments: '暂无预约记录'");
    expect(zhLocaleSource).not.toContain("cancel: '取消预约'");
    expect(zhLocaleSource).not.toContain("confirm: '确认预约'");
  });
});
