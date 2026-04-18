import { useState, useCallback, useEffect } from 'react';
import { Palette, Circle, Square, Sun, Save, RotateCcw, Eye, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import http from '@/api/http';
import { useToast } from '@/components/ui';
import { useConfigStore } from '@/store/config';
import { Skeleton } from '@/components/ui/Skeleton';
import { handleApiFailure } from '@/utils/connectionStatus';

// 预设品牌色方案
const PRESET_COLORS = [
  { name: '湖绿（默认）', value: '#14b8a6', rgb: '20 184 166' },
  { name: '靛蓝', value: '#6366f1', rgb: '99 102 241' },
  { name: '天蓝', value: '#3b82f6', rgb: '59 130 246' },
  { name: '紫罗兰', value: '#8b5cf6', rgb: '139 92 246' },
  { name: '玫瑰红', value: '#f43f5e', rgb: '244 63 94' },
  { name: '琥珀橙', value: '#f59e0b', rgb: '245 158 11' },
];

// 圆角预设
const RADIUS_PRESETS = [
  { name: '直角', sm: '0.125rem', md: '0.25rem', lg: '0.375rem', xl: '0.5rem' },
  { name: '微圆（默认）', sm: '0.375rem', md: '0.5rem', lg: '0.75rem', xl: '1rem' },
  { name: '大圆', sm: '0.5rem', md: '0.75rem', lg: '1rem', xl: '1.5rem' },
  { name: '全圆', sm: '0.75rem', md: '1rem', lg: '1.5rem', xl: '2rem' },
];

// 阴影预设
const SHADOW_PRESETS = [
  { name: '无阴影', sm: 'none', md: 'none', lg: 'none' },
  { name: '轻柔（默认）', sm: '0 1px 2px rgba(0,0,0,0.05)', md: '0 4px 6px rgba(0,0,0,0.07)', lg: '0 10px 15px rgba(0,0,0,0.08)' },
  { name: '明显', sm: '0 1px 3px rgba(0,0,0,0.12)', md: '0 4px 8px rgba(0,0,0,0.15)', lg: '0 12px 24px rgba(0,0,0,0.18)' },
];

type TabKey = 'color' | 'radius' | 'shadow';

const TABS: { key: TabKey; label: string; icon: typeof Palette }[] = [
  { key: 'color', label: '品牌色', icon: Palette },
  { key: 'radius', label: '圆角', icon: Circle },
  { key: 'shadow', label: '阴影', icon: Square },
];

export default function ThemeConfig() {
  const toast = useToast();
  const refreshConfig = useConfigStore((s) => s.fetchConfigs);
  const [activeTab, setActiveTab] = useState<TabKey>('color');
  const [selectedColor, setSelectedColor] = useState(0);
  const [customColor, setCustomColor] = useState('#14b8a6');
  const [selectedRadius, setSelectedRadius] = useState(1);
  const [selectedShadow, setSelectedShadow] = useState(1);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const currentColor = PRESET_COLORS[selectedColor]?.value || customColor;

  // 从后端加载已保存的主题配置
  useEffect(() => {
    async function loadThemeConfig() {
      try {
        const res = await http.get('/config/public');
        if (res.data?.code === 200 && res.data.data) {
          const configs = res.data.data;
          if (configs.theme_brand_color) {
            const savedColor = configs.theme_brand_color;
            const presetIdx = PRESET_COLORS.findIndex(c => c.value === savedColor);
            if (presetIdx >= 0) {
              setSelectedColor(presetIdx);
              setCustomColor(savedColor);
            } else {
              setSelectedColor(-1);
              setCustomColor(savedColor);
            }
          }
          if (configs.theme_radius) {
            try {
              const radiusConfig = typeof configs.theme_radius === 'string'
                ? JSON.parse(configs.theme_radius)
                : configs.theme_radius;
              const radiusIdx = RADIUS_PRESETS.findIndex(
                r => r.sm === radiusConfig.sm && r.md === radiusConfig.md
              );
              if (radiusIdx >= 0) setSelectedRadius(radiusIdx);
            } catch { /* 解析失败使用默认值 */ }
          }
          if (configs.theme_shadow) {
            try {
              const shadowConfig = typeof configs.theme_shadow === 'string'
                ? JSON.parse(configs.theme_shadow)
                : configs.theme_shadow;
              const shadowIdx = SHADOW_PRESETS.findIndex(
                s => s.sm === shadowConfig.sm && s.md === shadowConfig.md
              );
              if (shadowIdx >= 0) setSelectedShadow(shadowIdx);
            } catch { /* 解析失败使用默认值 */ }
          }
        }
      } catch {
        await handleApiFailure('主题配置');
      } finally {
        setLoading(false);
      }
    }
    loadThemeConfig();
  }, [toast]);

  // 实时更新 CSS 变量（预览效果）
  const updateCSSVariables = useCallback((color?: string, radiusIdx?: number, shadowIdx?: number) => {
    const root = document.documentElement;

    // 更新品牌色
    if (color) {
      root.style.setProperty('--color-primary', color);
      // 更新 Tailwind primary 色的 RGB 值用于透明度变体
      const hex = color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      root.style.setProperty('--color-primary-rgb', `${r} ${g} ${b}`);
    }

    // 更新圆角变量
    if (radiusIdx !== undefined) {
      const preset = RADIUS_PRESETS[radiusIdx];
      root.style.setProperty('--radius-sm', preset.sm);
      root.style.setProperty('--radius-md', preset.md);
      root.style.setProperty('--radius-lg', preset.lg);
      root.style.setProperty('--radius-xl', preset.xl);
    }

    // 更新阴影变量
    if (shadowIdx !== undefined) {
      const preset = SHADOW_PRESETS[shadowIdx];
      root.style.setProperty('--shadow-sm', preset.sm);
      root.style.setProperty('--shadow-md', preset.md);
      root.style.setProperty('--shadow-lg', preset.lg);
    }
  }, []);

  // 颜色变化时实时预览
  const handleColorChange = (color: number | string) => {
    if (typeof color === 'number') {
      setSelectedColor(color);
      setCustomColor(PRESET_COLORS[color].value);
      updateCSSVariables(PRESET_COLORS[color].value);
    } else {
      setSelectedColor(-1);
      setCustomColor(color);
      updateCSSVariables(color);
    }
  };

  // 圆角变化时实时预览
  const handleRadiusChange = (idx: number) => {
    setSelectedRadius(idx);
    updateCSSVariables(undefined, idx, undefined);
  };

  // 阴影变化时实时预览
  const handleShadowChange = (idx: number) => {
    setSelectedShadow(idx);
    updateCSSVariables(undefined, undefined, idx);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);

    try {
      const res = await http.post('/config/batch', {
        configs: {
          'theme_brand_color': currentColor,
          'theme_radius': JSON.stringify(RADIUS_PRESETS[selectedRadius]),
          'theme_shadow': JSON.stringify(SHADOW_PRESETS[selectedShadow]),
        },
      });

      if (res.data?.code === 200) {
        toast.success('保存成功', '主题配置已更新，全局样式已生效');
        // 刷新配置 store
        await refreshConfig();
      } else {
        toast.error('保存失败', res.data?.message || '请稍后重试');
      }
    } catch {
      toast.error('网络错误', '无法连接到服务器，请检查网络连接');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSelectedColor(0);
    setCustomColor('#14b8a6');
    setSelectedRadius(1);
    setSelectedShadow(1);
    // 重置CSS变量到默认值
    updateCSSVariables('#14b8a6', 1, 1);
    toast.info('已恢复默认主题');
  };

  // 加载状态
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-80 mb-8" />
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
          <div>
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">主题配置</h1>
          <p className="text-gray-500 mt-1">自定义平台品牌色、圆角和阴影风格</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            恢复默认
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> 保存中...</>
            ) : (
              <><Save className="w-4 h-4" /> 保存配置</>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：配置面板 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tab 切换 */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex border-b border-gray-200">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'text-primary-600 border-b-2 border-primary-500 bg-primary-50/50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {/* 品牌色 Tab */}
              {activeTab === 'color' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">预设色板</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {PRESET_COLORS.map((color, idx) => (
                        <button
                          key={color.value}
                          onClick={() => handleColorChange(idx)}
                          className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                            selectedColor === idx
                              ? 'border-gray-900 bg-gray-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div
                            className="w-8 h-8 rounded-full shrink-0 ring-2 ring-white shadow-sm"
                            style={{ backgroundColor: color.value }}
                          />
                          <span className="text-sm font-medium text-gray-700">{color.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">自定义颜色</h3>
                    <div className="flex items-center gap-4">
                      <input
                        type="color"
                        value={customColor}
                        onChange={(e) => handleColorChange(e.target.value)}
                        className="w-12 h-12 rounded-lg cursor-pointer border border-gray-300"
                      />
                      <input
                        type="text"
                        value={customColor}
                        onChange={(e) => handleColorChange(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                        placeholder="#14b8a6"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 圆角 Tab */}
              {activeTab === 'radius' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">圆角风格</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {RADIUS_PRESETS.map((preset, idx) => (
                      <button
                        key={preset.name}
                        onClick={() => handleRadiusChange(idx)}
                        className={`p-4 border-2 rounded-lg transition-all text-left ${
                          selectedRadius === idx
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div
                            className="w-10 h-10 bg-primary-500"
                            style={{ borderRadius: preset.lg }}
                          />
                          <span className="text-sm font-medium text-gray-800">{preset.name}</span>
                        </div>
                        <div className="flex gap-2">
                          {['sm', 'md', 'lg', 'xl'].map((size) => (
                            <div
                              key={size}
                              className="w-6 h-6 bg-gray-300"
                              style={{ borderRadius: preset[size as keyof typeof preset] as string }}
                            />
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 阴影 Tab */}
              {activeTab === 'shadow' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">阴影风格</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {SHADOW_PRESETS.map((preset, idx) => (
                      <button
                        key={preset.name}
                        onClick={() => handleShadowChange(idx)}
                        className={`p-4 border-2 rounded-lg transition-all ${
                          selectedShadow === idx
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div
                          className="w-full h-16 bg-white rounded-lg mb-3"
                          style={{ boxShadow: preset.md }}
                        />
                        <span className="text-sm font-medium text-gray-700">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右侧：实时预览 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Eye className="w-4 h-4" />
            实时预览
          </div>

          {/* 预览卡片 */}
          <motion.div
            key={`${currentColor}-${selectedRadius}-${selectedShadow}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-gray-200 overflow-hidden"
            style={{
              borderRadius: RADIUS_PRESETS[selectedRadius]?.xl || '1rem',
              boxShadow: SHADOW_PRESETS[selectedShadow]?.lg || 'none',
            }}
          >
            {/* 预览头部 */}
            <div
              className="h-24 flex items-end p-4"
              style={{ background: `linear-gradient(135deg, ${currentColor}, ${currentColor}dd)` }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <Sun className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">启航平台</p>
                  <p className="text-white/70 text-xs">品牌色预览</p>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {/* 预览按钮 */}
              <div className="flex gap-2">
                <button
                  className="flex-1 py-2 text-white text-sm font-medium"
                  style={{
                    backgroundColor: currentColor,
                    borderRadius: RADIUS_PRESETS[selectedRadius]?.md || '0.5rem',
                  }}
                >
                  主要按钮
                </button>
                <button
                  className="flex-1 py-2 text-sm font-medium border"
                  style={{
                    color: currentColor,
                    borderColor: currentColor,
                    borderRadius: RADIUS_PRESETS[selectedRadius]?.md || '0.5rem',
                  }}
                >
                  次要按钮
                </button>
              </div>

              {/* 预览标签 */}
              <div className="flex gap-2 flex-wrap">
                {['React', 'TypeScript', 'Tailwind'].map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 text-xs font-medium"
                    style={{
                      backgroundColor: `${currentColor}15`,
                      color: currentColor,
                      borderRadius: RADIUS_PRESETS[selectedRadius]?.sm || '0.375rem',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* 预览卡片 */}
              <div
                className="p-3 border border-gray-100"
                style={{
                  borderRadius: RADIUS_PRESETS[selectedRadius]?.lg || '0.75rem',
                  boxShadow: SHADOW_PRESETS[selectedShadow]?.sm || 'none',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: `${currentColor}30` }}
                  />
                  <span className="text-xs font-medium text-gray-700">示例卡片</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: '65%', backgroundColor: currentColor }}
                  />
                </div>
              </div>

              {/* 预览侧边栏片段 */}
              <div className="bg-slate-900 rounded-lg p-3 space-y-1.5">
                <div
                  className="flex items-center gap-2 px-2 py-1.5 rounded text-white text-xs font-medium"
                  style={{ backgroundColor: currentColor }}
                >
                  <div className="w-3 h-3 bg-white/30 rounded" />
                  活跃菜单项
                </div>
                <div className="flex items-center gap-2 px-2 py-1.5 rounded text-slate-400 text-xs">
                  <div className="w-3 h-3 bg-slate-600 rounded" />
                  普通菜单项
                </div>
                <div className="flex items-center gap-2 px-2 py-1.5 rounded text-slate-400 text-xs">
                  <div className="w-3 h-3 bg-slate-600 rounded" />
                  普通菜单项
                </div>
              </div>
            </div>
          </motion.div>

          {/* 当前配置摘要 */}
          <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-500 space-y-1">
            <p><span className="font-medium text-gray-700">品牌色：</span>{currentColor}</p>
            <p><span className="font-medium text-gray-700">圆角：</span>{RADIUS_PRESETS[selectedRadius]?.name}</p>
            <p><span className="font-medium text-gray-700">阴影：</span>{SHADOW_PRESETS[selectedShadow]?.name}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
