import { describe, it, expect } from 'vitest';

const MOCK_VIP_FEATURES = { resource_library: { key: 'resource_library', label: '资源库', frontendRoutes: ['/resources/skill-enhancement'] }, skill_enhancement: { key: 'skill_enhancement', label: '能力提升', frontendRoutes: ['/resources/skill-enhancement'] }, guidance_articles: { key: 'guidance_articles', label: '指导文章', frontendRoutes: ['/resources/guidance'] }, background_boost: { key: 'background_boost', label: '背景提升', frontendRoutes: ['/resources/background-boost'] }, career_plan_templates: { key: 'career_plan_templates', label: '规划模板', frontendRoutes: ['/resources/career-plan'] }, mentor_consultation: { key: 'mentor_consultation', label: '导师咨询', frontendRoutes: ['/mentors'] }, course_premium: { key: 'course_premium', label: '精品课程', frontendRoutes: ['/courses'] }, job_priority: { key: 'job_priority', label: '优先投递', frontendRoutes: ['/jobs'] }, success_case_details: { key: 'success_case_details', label: '案例详情', frontendRoutes: ['/cases/success-cases'] }, study_abroad_offers: { key: 'study_abroad_offers', label: 'Offer数据', frontendRoutes: ['/education/study-abroad'] }, further_education_advanced: { key: 'further_education_advanced', label: '升学进阶', frontendRoutes: ['/education/further-education'] } };

function getVipFeaturesByRoute(route) {
  return Object.values(MOCK_VIP_FEATURES).filter(f => f.frontendRoutes.some(r => route.startsWith(r)));
}

function isPublicRoute(path) {
  const PUBLIC_ROUTES = ['/', '/login', '/register', '/vip'];
  return PUBLIC_ROUTES.includes(path) || path.startsWith('/uploads/');
}

describe('performance - VIP路由查找', () => {
  it('100000次路由查找性能', () => {
    const start = performance.now();
    for (let i = 0; i < 100000; i++) {
      getVipFeaturesByRoute('/resources/skill-enhancement/videos/123');
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(500);
  });
});

describe('performance - 公开路由检查', () => {
  it('100000次公开路由检查', () => {
    const start = performance.now();
    for (let i = 0; i < 50000; i++) {
      isPublicRoute('/uploads/avatar/test.png');
      isPublicRoute('/admin/users');
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(200);
  });
});
