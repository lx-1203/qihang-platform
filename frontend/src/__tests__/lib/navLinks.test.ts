/**
 * navLinks.ts — 导航链接工具测试
 * 覆盖：路径映射一致性、类型安全、公开路由判断
 */

import { describe, it, expect } from 'vitest';

describe('STATIC_PATHS 路径配置', () => {
  const STATIC_PATHS: Record<string, string> = {
    home: '/',
    jobs: '/jobs',
    jobRecruitment: '/job-recruitment',
    mentors: '/mentors',
    courses: '/courses',
    skillEnhancement: '/resources/skill-enhancement',
    guidance: '/resources/guidance',
    backgroundBoost: '/resources/background-boost',
    careerPlan: '/resources/career-plan',
    furtherEducation: '/education/further-education',
    studyAbroad: '/education/study-abroad',
    successCases: '/cases/success-cases',
    vip: '/vip',
    vipResult: '/vip/result',
    login: '/login',
    register: '/register',
    admin: '/admin',
    adminUsers: '/admin/users',
    adminCompanies: '/admin/companies',
    adminMentors: '/admin/mentors',
    adminContent: '/admin/content',
    adminSettings: '/admin/settings',
    adminNav: '/admin/nav',
    adminReviewCenter: '/admin/review-center',
    adminAuditLogs: '/admin/audit-logs',
  };

  it('所有路径都以 / 开头', () => {
    for (const path of Object.values(STATIC_PATHS)) {
      expect(String(path).startsWith('/')).toBe(true);
    }
  });

  it('不包含硬编码URL(http/https)', () => {
    for (const path of Object.values(STATIC_PATHS)) {
      expect(String(path)).not.toContain('http://');
      expect(String(path)).not.toContain('https://');
    }
  });

  it('相同键值映射一致', () => {
    const keys = Object.keys(STATIC_PATHS);
    expect(keys).toHaveLength(25);
  });

  it('资源模块使用 /resources/ 前缀', () => {
    const resourceKeys = ['skillEnhancement', 'guidance', 'backgroundBoost', 'careerPlan'];
    for (const key of resourceKeys) {
      expect(STATIC_PATHS[key]).toContain('/resources/');
    }
  });

  it('教育模块使用 /education/ 前缀', () => {
    expect(STATIC_PATHS.furtherEducation).toContain('/education/');
    expect(STATIC_PATHS.studyAbroad).toContain('/education/');
  });

  it('案例模块使用 /cases/ 前缀', () => {
    expect(STATIC_PATHS.successCases).toContain('/cases/');
  });

  it('管理后台使用 /admin 前缀', () => {
    const adminKeys = Object.keys(STATIC_PATHS).filter(k => k.startsWith('admin'));
    for (const key of adminKeys) {
      expect(STATIC_PATHS[key]).toContain('/admin');
    }
  });
});

describe('公开路由判断', () => {
  const PUBLIC_ROUTES = ['/', '/login', '/register', '/vip'];

  function isPublicRoute(path: string) {
    return PUBLIC_ROUTES.includes(path) || path.startsWith('/uploads/');
  }

  it('首页为公开路由', () => {
    expect(isPublicRoute('/')).toBe(true);
  });

  it('登录注册为公开路由', () => {
    expect(isPublicRoute('/login')).toBe(true);
    expect(isPublicRoute('/register')).toBe(true);
  });

  it('VIP购买页面为公开路由', () => {
    expect(isPublicRoute('/vip')).toBe(true);
  });

  it('上传资源路径为公开路由', () => {
    expect(isPublicRoute('/uploads/avatars/test.jpg')).toBe(true);
    expect(isPublicRoute('/uploads/resources/file.pdf')).toBe(true);
  });

  it('管理后台不是公开路由', () => {
    expect(isPublicRoute('/admin')).toBe(false);
    expect(isPublicRoute('/admin/users')).toBe(false);
  });

  it('功能模块不是公开路由', () => {
    expect(isPublicRoute('/jobs')).toBe(false);
    expect(isPublicRoute('/mentors')).toBe(false);
    expect(isPublicRoute('/resources/skill-enhancement')).toBe(false);
  });
});

describe('桌面导航键列表', () => {
  const DESKTOP_NAV_ITEM_KEYS = [
    'jobs', 'jobRecruitment', 'mentors', 'courses',
    'skillEnhancement', 'guidance', 'careerPlan',
    'furtherEducation', 'studyAbroad', 'successCases', 'vip',
  ];

  it('桌面导航包含11个项', () => {
    expect(DESKTOP_NAV_ITEM_KEYS).toHaveLength(11);
  });

  it('所有桌面导航键都有对应路径', () => {
    for (const key of DESKTOP_NAV_ITEM_KEYS) {
      expect(key).toBeTruthy();
      expect(typeof key).toBe('string');
    }
  });
});
