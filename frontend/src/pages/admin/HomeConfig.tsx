import { useState } from 'react';
import { Save, Plus, Trash2, Eye, CheckCircle2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import homeConfig from '../../data/home-ui-config.json';

type HeroSlide = typeof homeConfig.heroSlides[0];
type QuickEntry = typeof homeConfig.quickEntries[0];
type ValueSection = typeof homeConfig.valueSections[0];

export default function HomeConfig() {
  const [activeTab, setActiveTab] = useState<'hero' | 'entries' | 'colors' | 'values'>('hero');
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(homeConfig.heroSlides);
  const [quickEntries, setQuickEntries] = useState<QuickEntry[]>(homeConfig.quickEntries);
  const [courseColors, setCourseColors] = useState<string[]>(homeConfig.courseColors);
  const [valueSections, setValueSections] = useState<ValueSection[]>(homeConfig.valueSections);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const newConfig = {
      ...homeConfig,
      heroSlides,
      quickEntries,
      courseColors,
      valueSections,
      _meta: {
        ...homeConfig._meta,
        lastUpdated: new Date().toISOString().split('T')[0],
      },
    };

    console.log('=== 首页配置已保存 ===');
    console.log(JSON.stringify(newConfig, null, 2));
    console.log('====================');

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs = [
    { key: 'hero' as const, label: 'Hero 轮播' },
    { key: 'entries' as const, label: '快捷入口' },
    { key: 'colors' as const, label: '课程配色' },
    { key: 'values' as const, label: '平台价值' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部工具栏 */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">首页可视化配置</h1>
              <p className="text-gray-500 text-sm mt-1">无需代码，点击即可修改首页内容</p>
            </div>
            <div className="flex items-center gap-3">
              <a href="/" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                <Eye className="w-4 h-4" /> 预览首页
              </a>
              <button onClick={handleSave}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                  saved ? 'bg-green-500 text-white' : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}>
                {saved ? <><CheckCircle2 className="w-4 h-4" /> 已保存</> : <><Save className="w-4 h-4" /> 保存配置</>}
              </button>
            </div>
          </div>

          {/* Tab 导航 */}
          <div className="flex gap-1 mt-4 border-t border-gray-100 pt-3">
            {tabs.map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.key ? 'bg-primary-50 text-primary-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">

        {/* ====== Hero 轮播编辑 ====== */}
        {activeTab === 'hero' && (
          <div className="space-y-4">
            {heroSlides.map((slide, idx) => (
              <motion.div key={slide.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-900">轮播 #{idx + 1}</h3>
                  {heroSlides.length > 1 && (
                    <button onClick={() => setHeroSlides(heroSlides.filter((_, i) => i !== idx))}
                      className="text-red-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">标题（支持 \n 换行）</label>
                    <textarea value={slide.title} rows={2}
                      onChange={e => { const arr = [...heroSlides]; arr[idx] = { ...arr[idx], title: e.target.value }; setHeroSlides(arr); }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">副标题</label>
                    <input value={slide.subtitle} onChange={e => { const arr = [...heroSlides]; arr[idx] = { ...arr[idx], subtitle: e.target.value }; setHeroSlides(arr); }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">渐变色 (Tailwind class)</label>
                    <input value={slide.gradient} onChange={e => { const arr = [...heroSlides]; arr[idx] = { ...arr[idx], gradient: e.target.value }; setHeroSlides(arr); }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">按钮文字</label>
                      <input value={slide.cta} onChange={e => { const arr = [...heroSlides]; arr[idx] = { ...arr[idx], cta: e.target.value }; setHeroSlides(arr); }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">跳转链接</label>
                      <input value={slide.ctaLink} onChange={e => { const arr = [...heroSlides]; arr[idx] = { ...arr[idx], ctaLink: e.target.value }; setHeroSlides(arr); }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                    </div>
                  </div>
                </div>
                {/* 实时预览 */}
                <div className={`mt-4 rounded-xl p-6 bg-gradient-to-br ${slide.gradient} text-white`}>
                  <h4 className="text-lg font-bold whitespace-pre-line mb-1">{slide.title}</h4>
                  <p className="text-sm text-white/70 mb-3">{slide.subtitle}</p>
                  <span className="inline-flex items-center gap-1 bg-white text-gray-900 px-3 py-1.5 rounded-lg text-xs font-bold">
                    {slide.cta} <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </motion.div>
            ))}
            <button onClick={() => setHeroSlides([...heroSlides, { id: `slide-${Date.now()}`, title: '新轮播标题', subtitle: '副标题描述', gradient: 'from-gray-600 to-gray-800', cta: '了解更多', ctaLink: '/' }])}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> 添加轮播
            </button>
          </div>
        )}

        {/* ====== 快捷入口编辑 ====== */}
        {activeTab === 'entries' && (
          <div className="space-y-4">
            {quickEntries.map((entry, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-900">入口 #{idx + 1}: {entry.label}</h3>
                  {quickEntries.length > 1 && (
                    <button onClick={() => setQuickEntries(quickEntries.filter((_, i) => i !== idx))}
                      className="text-red-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">标签</label>
                    <input value={entry.label} onChange={e => { const arr = [...quickEntries]; arr[idx] = { ...arr[idx], label: e.target.value }; setQuickEntries(arr); }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">描述</label>
                    <input value={entry.desc} onChange={e => { const arr = [...quickEntries]; arr[idx] = { ...arr[idx], desc: e.target.value }; setQuickEntries(arr); }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">图标名 (Lucide)</label>
                    <input value={entry.icon} onChange={e => { const arr = [...quickEntries]; arr[idx] = { ...arr[idx], icon: e.target.value }; setQuickEntries(arr); }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">跳转链接</label>
                    <input value={entry.link} onChange={e => { const arr = [...quickEntries]; arr[idx] = { ...arr[idx], link: e.target.value }; setQuickEntries(arr); }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                  </div>
                </div>
              </motion.div>
            ))}
            <button onClick={() => setQuickEntries([...quickEntries, { label: '新入口', desc: '描述', icon: 'Star', link: '/', color: 'text-gray-600', bg: 'bg-gradient-to-br from-gray-50 to-gray-100/50' }])}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> 添加入口
            </button>
          </div>
        )}

        {/* ====== 课程配色编辑 ====== */}
        {activeTab === 'colors' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-4">课程封面渐变色（循环使用）</h3>
            <div className="space-y-3">
              {courseColors.map((color, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className={`w-24 h-12 rounded-lg bg-gradient-to-r ${color}`} />
                  <input value={color} onChange={e => { const arr = [...courseColors]; arr[idx] = e.target.value; setCourseColors(arr); }}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                  {courseColors.length > 1 && (
                    <button onClick={() => setCourseColors(courseColors.filter((_, i) => i !== idx))}
                      className="text-red-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => setCourseColors([...courseColors, 'from-gray-400 to-gray-500'])}
              className="mt-4 w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> 添加配色
            </button>
          </div>
        )}

        {/* ====== 平台价值编辑 ====== */}
        {activeTab === 'values' && (
          <div className="space-y-4">
            {valueSections.map((section, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-bold text-gray-900 mb-4">{section.role}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">角色名</label>
                    <input value={section.role} onChange={e => { const arr = [...valueSections]; arr[idx] = { ...arr[idx], role: e.target.value }; setValueSections(arr); }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">图标名</label>
                    <input value={section.icon} onChange={e => { const arr = [...valueSections]; arr[idx] = { ...arr[idx], icon: e.target.value }; setValueSections(arr); }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">文字色</label>
                    <input value={section.color} onChange={e => { const arr = [...valueSections]; arr[idx] = { ...arr[idx], color: e.target.value }; setValueSections(arr); }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">背景色</label>
                    <input value={section.bg} onChange={e => { const arr = [...valueSections]; arr[idx] = { ...arr[idx], bg: e.target.value }; setValueSections(arr); }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">价值点（每行一条）</label>
                  <textarea value={section.points.join('\n')} rows={4}
                    onChange={e => { const arr = [...valueSections]; arr[idx] = { ...arr[idx], points: e.target.value.split('\n').filter(Boolean) }; setValueSections(arr); }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                </div>
              </motion.div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
