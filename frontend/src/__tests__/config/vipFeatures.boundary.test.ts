import { describe, it, expect } from 'vitest';
import {
  VIP_FEATURES,
  isVipFeature,
  getVipFeaturesByRoute,
  getVipRequiredRoutes,
  getVipRequiredBackendRoutes,
} from '@/config/vipFeatures';

describe('VIP特性边界条件', () => {
  it('应包含11个VIP特性', () => {
    expect(Object.keys(VIP_FEATURES)).toHaveLength(11);
  });

  it('所有特性requiredLevel为basic或premium', () => {
    Object.values(VIP_FEATURES).forEach(f => {
      expect(['basic', 'premium']).toContain(f.requiredLevel);
    });
  });

  it('所有特性至少有一条frontendRoute', () => {
    Object.values(VIP_FEATURES).forEach(f => {
      expect(f.frontendRoutes.length).toBeGreaterThan(0);
    });
  });

  it('所有特性至少有一条backendRoute', () => {
    Object.values(VIP_FEATURES).forEach(f => {
      expect(f.backendRoutes.length).toBeGreaterThan(0);
    });
  });

  it('所有特性至少有一个feature点', () => {
    Object.values(VIP_FEATURES).forEach(f => {
      expect(f.features.length).toBeGreaterThan(0);
    });
  });

  it('所有frontendRoutes以/开头', () => {
    Object.values(VIP_FEATURES).forEach(f => {
      f.frontendRoutes.forEach(r => {
        expect(r.startsWith('/')).toBe(true);
      });
    });
  });

  it('所有backendRoutes以/api/开头', () => {
    Object.values(VIP_FEATURES).forEach(f => {
      f.backendRoutes.forEach(r => {
        expect(r.startsWith('/api/')).toBe(true);
      });
    });
  });

  it('isVipFeature对不存在key返回false', () => {
    expect(isVipFeature('nonexistent')).toBe(false);
  });

  it('basic级别共6个', () => {
    const basic = Object.values(VIP_FEATURES).filter(f => f.requiredLevel === 'basic');
    expect(basic).toHaveLength(6);
  });

  it('premium级别共5个', () => {
    const premium = Object.values(VIP_FEATURES).filter(f => f.requiredLevel === 'premium');
    expect(premium).toHaveLength(5);
  });
});

describe('getVipFeaturesByRoute路由匹配', () => {
  it('匹配子路由', () => {
    const result = getVipFeaturesByRoute('/resources/skill-enhancement/videos');
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it('精确匹配', () => {
    const result = getVipFeaturesByRoute('/resources/skill-enhancement');
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it('不匹配无关路由', () => {
    const result = getVipFeaturesByRoute('/home');
    expect(result).toHaveLength(0);
  });

  it('空字符串不匹配任何', () => {
    const result = getVipFeaturesByRoute('');
    expect(result).toHaveLength(0);
  });

  it('仅/不匹配', () => {
    const result = getVipFeaturesByRoute('/');
    expect(result).toHaveLength(0);
  });
});

describe('getVipRequiredRoutes', () => {
  it('去重后包含至少7个不同路由', () => {
    const routes = getVipRequiredRoutes();
    const unique = new Set(routes);
    expect(unique.size).toBeGreaterThanOrEqual(7);
  });

  it('每个路由均以/开头', () => {
    getVipRequiredRoutes().forEach(r => {
      expect(r.startsWith('/')).toBe(true);
    });
  });
});

describe('getVipRequiredBackendRoutes', () => {
  it('去重后包含12个不同后端路由', () => {
    const routes = getVipRequiredBackendRoutes();
    const unique = new Set(routes);
    expect(unique.size).toBe(12);
  });

  it('每个路由均以/api/开头', () => {
    getVipRequiredBackendRoutes().forEach(r => {
      expect(r.startsWith('/api/')).toBe(true);
    });
  });
});
