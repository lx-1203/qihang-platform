/**
 * 导航链接辅助工具
 * 提供类型安全的路径配置，避免各页面散落硬编码链接
 */

import { getConfigValue } from '@/store/config';

export type NavPath =
  | '/'
  | '/home'
  | '/jobs'
  | '/job-recruitment'
  | '/mentors'
  | '/courses'
  | '/resources/skill-enhancement'
  | '/resources/guidance'
  | '/resources/background-boost'
  | '/resources/career-plan'
  | '/education/further-education'
  | '/education/study-abroad'
  | '/cases/success-cases'
  | '/vip'
  | '/vip/result'
  | '/admin'
  | '/admin/users'
  | '/admin/companies'
  | '/admin/mentors'
  | '/admin/content'
  | '/admin/settings'
  | '/admin/nav'
  | '/admin/review-center'
  | '/admin/audit-logs'
  | '/login'
  | '/register';

const STATIC_PATHS: Record<string, NavPath> = {
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
} as const;

export function getNavPath(key: keyof typeof STATIC_PATHS): NavPath {
  return STATIC_PATHS[key];
}

export function getDynamicNavPath(pathKey: string, fallback: NavPath = '/'): NavPath {
  try {
    const configPath = getConfigValue(`nav_${pathKey}`);
    if (typeof configPath === 'string' && configPath.startsWith('/')) {
      return configPath as NavPath;
    }
  } catch {
    // fallthrough
  }
  return fallback;
}

const PUBLIC_ROUTES: NavPath[] = ['/', '/login', '/register', '/vip'];

export function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.includes(path as NavPath) || path.startsWith('/uploads/');
}

const DESKTOP_NAV_ITEM_KEYS = [
  'jobs',
  'jobRecruitment',
  'mentors',
  'courses',
  'skillEnhancement',
  'guidance',
  'careerPlan',
  'furtherEducation',
  'studyAbroad',
  'successCases',
  'vip',
] as const;

export { DESKTOP_NAV_ITEM_KEYS };
