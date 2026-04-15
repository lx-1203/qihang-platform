import { useState } from 'react';
import { Palette, Circle, Square, Sun, Save, RotateCcw, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '../../components/ui';

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
  const [activeTab, setActiveTab] = useState<TabKey>('color');
  const [selectedColor, setSelectedColor] = useState(0);
  const [customColor, setCustomColor] = useState('#14b8a6');
  const [selectedRadius, setSelectedRadius] = useState(1);
  const [selectedShadow, setSelectedShadow] = useState(1);

  const currentColor = PRESET_COLORS[selectedColor]?.value || customColor;

  const handleSave = () => {
    const config = {
      brandColor: currentColor,
      radius: RADIUS_PRESETS[selectedRadius],
      shadow: SHADOW_PRESETS[selectedShadow],
    };
    console.log('🎨 主题配置已保存:', JSON.stringify(config, null, 2));
    toast.success('主题配置已保存', '配置已输出到控制台，后续可对接后端 API');
  };

  const handleReset = () => {
    setSelectedColor(0);
    setCustomColor('#14b8a6');
    setSelectedRadius(1);
    setSelectedShadow(1);
    toast.info('已恢复默认主题');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
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
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium"
          >
            <Save className="w-4 h-4" />
            保存配置
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
                          onClick={() => { setSelectedColor(idx); setCustomColor(color.value); }}
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
                        onChange={(e) => { setCustomColor(e.target.value); setSelectedColor(-1); }}
                        className="w-12 h-12 rounded-lg cursor-pointer border border-gray-300"
                      />
                      <input
                        type="text"
                        value={customColor}
                        onChange={(e) => { setCustomColor(e.target.value); setSelectedColor(-1); }}
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
                        onClick={() => setSelectedRadius(idx)}
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
                        onClick={() => setSelectedShadow(idx)}
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
