/**
 * VIP 权限特性映射表（单一事实来源）
 * 统一前后端 VIP 权限判断逻辑
 *
 * 使用方式：
 *   import { isVipFeature } from '@/config/vipFeatures';
 *   if (isVipFeature('resource_library')) { /* VIP内容 *​/ }
 */

export type VipFeatureKey =
  | 'resource_library'
  | 'skill_enhancement'
  | 'guidance_articles'
  | 'background_boost'
  | 'career_plan_templates'
  | 'mentor_consultation'
  | 'course_premium'
  | 'job_priority'
  | 'success_case_details'
  | 'study_abroad_offers'
  | 'further_education_advanced';

interface VipFeatureConfig {
  key: VipFeatureKey;
  label: string;
  description: string;
  requiredLevel: 'basic' | 'premium';
  frontendRoutes: string[];
  backendRoutes: string[];
  features: string[];
}

export const VIP_FEATURES: Record<VipFeatureKey, VipFeatureConfig> = {
  resource_library: {
    key: 'resource_library',
    label: '资源库VIP内容',
    description: '可查看VIP专属资源、下载资料',
    requiredLevel: 'basic',
    frontendRoutes: ['/resources/skill-enhancement'],
    backendRoutes: ['/api/resource-library'],
    features: ['resource_vip_access', 'resource_download'],
  },
  skill_enhancement: {
    key: 'skill_enhancement',
    label: '能力提升高级课程',
    description: '访问进阶技能课程和实战项目',
    requiredLevel: 'premium',
    frontendRoutes: ['/resources/skill-enhancement'],
    backendRoutes: ['/api/skill-enhancement'],
    features: ['skill_vip_courses', 'skill_projects'],
  },
  guidance_articles: {
    key: 'guidance_articles',
    label: '指导文章深度内容',
    description: '阅读专家深度指导文章和案例分析',
    requiredLevel: 'basic',
    frontendRoutes: ['/resources/guidance'],
    backendRoutes: ['/api/guidance'],
    features: ['guidance_vip_articles', 'guidance_expert_qa'],
  },
  background_boost: {
    key: 'background_boost',
    label: '背景提升服务',
    description: '背景评估和提升方案',
    requiredLevel: 'premium',
    frontendRoutes: ['/resources/background-boost'],
    backendRoutes: ['/api/background-boost'],
    features: ['bg_assessment', 'bg_improvement_plan'],
  },
  career_plan_templates: {
    key: 'career_plan_templates',
    label: '职业规划模板',
    description: '使用专业职业规划模板和工具',
    requiredLevel: 'basic',
    frontendRoutes: ['/career-plan'],
    backendRoutes: ['/api/career-plan'],
    features: ['plan_templates', 'plan_tools'],
  },
  mentor_consultation: {
    key: 'mentor_consultation',
    label: '导师咨询',
    description: '与认证导师进行一对一咨询',
    requiredLevel: 'premium',
    frontendRoutes: ['/skill-enhancement'],
    backendRoutes: ['/api/mentors', '/api/mentor'],
    features: ['mentor_1v1', 'mentor_group'],
  },
  course_premium: {
    key: 'course_premium',
    label: '精品课程',
    description: '访问平台独家精品付费课程',
    requiredLevel: 'premium',
    frontendRoutes: ['/skill-enhancement'],
    backendRoutes: ['/api/courses'],
    features: ['course_premium_access', 'course_certificate'],
  },
  job_priority: {
    key: 'job_priority',
    label: '岗位优先投递',
    description: 'VIP会员享受岗位优先投递权益',
    requiredLevel: 'basic',
    frontendRoutes: ['/jobs', '/job-recruitment'],
    backendRoutes: ['/api/jobs'],
    features: ['job_priority_apply', 'job_vip_match'],
  },
  success_case_details: {
    key: 'success_case_details',
    label: '成功案例详情',
    description: '查看成功案例完整分析和经验分享',
    requiredLevel: 'basic',
    frontendRoutes: ['/success-cases'],
    backendRoutes: ['/api/success-cases'],
    features: ['case_details', 'case_analysis'],
  },
  study_abroad_offers: {
    key: 'study_abroad_offers',
    label: '留学Offer数据',
    description: '查看留学申请Offer数据和趋势分析',
    requiredLevel: 'basic',
    frontendRoutes: ['/further-education'],
    backendRoutes: ['/api/study-abroad'],
    features: ['abroad_offer_data', 'abroad_trends'],
  },
  further_education_advanced: {
    key: 'further_education_advanced',
    label: '升学进阶方案',
    description: '获取个性化升学进阶方案',
    requiredLevel: 'premium',
    frontendRoutes: ['/further-education'],
    backendRoutes: ['/api/further-education'],
    features: ['edu_advanced_plan', 'edu_school_match'],
  },
};

export function isVipFeature(featureKey: VipFeatureKey): boolean {
  return VIP_FEATURES[featureKey] !== undefined;
}

export function getVipFeaturesByRoute(route: string): VipFeatureConfig[] {
  return Object.values(VIP_FEATURES).filter(
    (f) => f.frontendRoutes.some((r) => route.startsWith(r))
  );
}

export function getVipRequiredRoutes(): string[] {
  const routes = new Set<string>();
  Object.values(VIP_FEATURES).forEach((f) => {
    f.frontendRoutes.forEach((r) => routes.add(r));
  });
  return Array.from(routes);
}

export function getVipRequiredBackendRoutes(): string[] {
  const routes = new Set<string>();
  Object.values(VIP_FEATURES).forEach((f) => {
    f.backendRoutes.forEach((r) => routes.add(r));
  });
  return Array.from(routes);
}
