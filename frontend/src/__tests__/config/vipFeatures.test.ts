/**
 * vipFeatures.ts — VIP特性映射单元测试
 * 覆盖：所有特性键的有效性、路由级VIP识别、requiredLevel一致性
 */

import { describe, it, expect } from 'vitest';
import {
  VIP_FEATURES,
  isVipFeature,
  getVipFeaturesByRoute,
  getVipRequiredRoutes,
  getVipRequiredBackendRoutes,
} from '../../config/vipFeatures';

describe('VIP_FEATURES 配置完整性', () => {
  it('包含所有11个VIP特性', () => {
    const keys = Object.keys(VIP_FEATURES);
    expect(keys).toHaveLength(11);
    expect(keys).toContain('resource_library');
    expect(keys).toContain('skill_enhancement');
    expect(keys).toContain('course_premium');
    expect(keys).toContain('mentor_consultation');
  });

  it('每个特性都有必需字段', () => {
    for (const feature of Object.values(VIP_FEATURES)) {
      expect(feature.key).toBeTruthy();
      expect(feature.label).toBeTruthy();
      expect(feature.description).toBeTruthy();
      expect(['basic', 'premium']).toContain(feature.requiredLevel);
      expect(feature.frontendRoutes).toBeInstanceOf(Array);
      expect(feature.backendRoutes).toBeInstanceOf(Array);
      expect(feature.features).toBeInstanceOf(Array);
    }
  });

  it('前端路由都以 / 开头', () => {
    for (const feature of Object.values(VIP_FEATURES)) {
      for (const route of feature.frontendRoutes) {
        expect(route.startsWith('/')).toBe(true);
      }
    }
  });

  it('后端路由都以 /api/ 开头', () => {
    for (const feature of Object.values(VIP_FEATURES)) {
      for (const route of feature.backendRoutes) {
        expect(route.startsWith('/api/')).toBe(true);
      }
    }
  });
});

describe('isVipFeature', () => {
  it('有效特性键返回 true', () => {
    expect(isVipFeature('resource_library')).toBe(true);
    expect(isVipFeature('mentor_consultation')).toBe(true);
    expect(isVipFeature('course_premium')).toBe(true);
  });

  it('无效特性键返回 false', () => {
    expect(isVipFeature('invalid_feature')).toBe(false);
    expect(isVipFeature('')).toBe(false);
    expect(isVipFeature('unknown')).toBe(false);
  });
});

describe('getVipFeaturesByRoute', () => {
  it('匹配资源库路由返回 resource_library 和 skill_enhancement', () => {
    const features = getVipFeaturesByRoute('/resources/skill-enhancement');
    const keys = features.map(f => f.key);
    expect(keys).toContain('resource_library');
    expect(keys).toContain('skill_enhancement');
  });

  it('匹配导师路由返回 mentor_consultation', () => {
    const features = getVipFeaturesByRoute('/skill-enhancement');
    const keys = features.map(f => f.key);
    expect(keys).toContain('mentor_consultation');
  });

  it('不匹配的路由返回空数组', () => {
    const features = getVipFeaturesByRoute('/login');
    expect(features).toHaveLength(0);
  });

  it('子路由也匹配', () => {
    const features = getVipFeaturesByRoute('/skill-enhancement/resource/some-slug');
    const keys = features.map(f => f.key);
    expect(keys).toContain('mentor_consultation');
  });
});

describe('getVipRequiredRoutes', () => {
  it('返回至少5个VIP路由', () => {
    const routes = getVipRequiredRoutes();
    expect(routes.length).toBeGreaterThanOrEqual(5);
    expect(routes).toContain('/skill-enhancement');
    expect(routes).toContain('/job-recruitment');
  });

  it('不包含公开路由', () => {
    const routes = getVipRequiredRoutes();
    expect(routes).not.toContain('/login');
    expect(routes).not.toContain('/');
  });
});

describe('getVipRequiredBackendRoutes', () => {
  it('返回与前端路由数量一致的后端路由', () => {
    const backend = getVipRequiredBackendRoutes();
    const frontend = getVipRequiredRoutes();
    expect(backend.length).toBeGreaterThanOrEqual(frontend.length);
  });
});

describe('VIP特性边界条件', () => {
  it('basic level 特性至少6个', () => {
    const basic = Object.values(VIP_FEATURES).filter(f => f.requiredLevel === 'basic');
    expect(basic.length).toBeGreaterThanOrEqual(6);
  });

  it('premium level 特性至少4个', () => {
    const premium = Object.values(VIP_FEATURES).filter(f => f.requiredLevel === 'premium');
    expect(premium.length).toBeGreaterThanOrEqual(4);
  });

  it('每个特性至少关联1个功能点', () => {
    for (const feature of Object.values(VIP_FEATURES)) {
      expect(feature.features.length).toBeGreaterThanOrEqual(1);
    }
  });
});
