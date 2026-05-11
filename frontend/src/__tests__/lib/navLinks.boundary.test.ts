import { describe, it, expect } from 'vitest';
import { getNavPath, isPublicRoute } from '@/lib/navLinks';

describe('navLinks边界条件', () => {
  it('所有静态路径以 / 开头', () => {
    const keys = [
      'home', 'jobs', 'jobRecruitment', 'mentors', 'courses',
      'skillEnhancement', 'guidance', 'backgroundBoost', 'careerPlan',
      'furtherEducation', 'studyAbroad', 'successCases',
      'vip', 'vipResult', 'login', 'register',
    ];
    keys.forEach(k => {
      expect(getNavPath(k).startsWith('/')).toBe(true);
    });
  });

  it('所有管理路径以 /admin 开头', () => {
    const adminKeys = [
      'admin', 'adminUsers', 'adminCompanies', 'adminMentors',
      'adminContent', 'adminSettings', 'adminNav',
      'adminReviewCenter', 'adminAuditLogs',
    ];
    adminKeys.forEach(k => {
      expect(getNavPath(k).startsWith('/admin')).toBe(true);
    });
  });

  it('isPublicRoute 对公开路由返回true', () => {
    expect(isPublicRoute('/')).toBe(true);
    expect(isPublicRoute('/login')).toBe(true);
    expect(isPublicRoute('/register')).toBe(true);
    expect(isPublicRoute('/vip')).toBe(true);
    expect(isPublicRoute('/uploads/avatar/test.png')).toBe(true);
  });

  it('isPublicRoute 对非公开路由返回false', () => {
    expect(isPublicRoute('/admin')).toBe(false);
    expect(isPublicRoute('/jobs')).toBe(false);
    expect(isPublicRoute('/resources/skill-enhancement')).toBe(false);
  });

  it('路径不区分大小写严格匹配', () => {
    expect(isPublicRoute('/LOGIN')).toBe(false);
    expect(isPublicRoute('/Login')).toBe(false);
  });

  it('不要匹配前缀', () => {
    expect(isPublicRoute('/login-test')).toBe(false);
    expect(isPublicRoute('/vips')).toBe(false);
  });

  it('以uploads开头的所有路径均为公开', () => {
    expect(isPublicRoute('/uploads/file.pdf')).toBe(true);
    expect(isPublicRoute('/uploads/deep/nested/file.jpg')).toBe(true);
  });

  it('不含uploads但路径部分匹配不算公开', () => {
    expect(isPublicRoute('/my-uploads/file')).toBe(false);
  });
});
