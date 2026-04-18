import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Eye, CheckCircle2, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import http from '@/api/http';
import { useToast } from '@/components/ui';
import { useConfigStore } from '@/store/config';
import { Skeleton, CardSkeleton } from '@/components/ui/Skeleton';
import homeConfig from '../../data/home-ui-config.json';
import { handleApiFailure } from '@/utils/connectionStatus';

type HeroSlide = typeof homeConfig.heroSlides[0];
type QuickEntry = typeof homeConfig.quickEntries[0];
type ValueSection = typeof homeConfig.valueSections[0];

export default function HomeConfig() {
  const toast = useToast();
  const refreshConfig = useConfigStore((s) => s.fetchConfigs);
  const [activeTab, setActiveTab] = useState<'hero' | 'entries' | 'colors' | 'values'>('hero');
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(homeConfig.heroSlides);
  const [quickEntries, setQuickEntries] = useState<QuickEntry[]>(homeConfig.quickEntries);
  const [courseColors, setCourseColors] = useState<string[]>(homeConfig.courseColors);
  const [valueSections, setValueSections] = useState<ValueSection[]>(homeConfig.valueSections);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; index: number } | null>(null);

  // 从后端加载配置
  useEffect(() => {
    async function loadConfig() {
      try {
        setLoading(true);
        const res = await http.get('/config/public');
        if (res.data?.code === 200 && res.data.data) {
          const configs = res.data.data;
          // 尝试从后端配置中获取首页UI配置
          if (configs.home_ui_config) {
            try {
              const parsedConfig = typeof configs.home_ui_config === 'string'
                ? JSON.parse(configs.home_ui_config)
                : configs.home_ui_config;
              if (parsedConfig.heroSlides) setHeroSlides(parsedConfig.heroSlides);
              if (parsedConfig.quickEntries) setQuickEntries(parsedConfig.quickEntries);
              if (parsedConfig.courseColors) setCourseColors(parsedConfig.courseColors);
              if (parsedConfig.valueSections) setValueSections(parsedConfig.valueSections);
            } catch {
              toast.warning('配置解析失败', '使用默认配置');
            }
          }
        }
      } catch {
        await handleApiFailure('首页配置');
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, [toast]);

  const handleSave = async () => {
    if (saving) return;

    // 表单验证
    if (heroSlides.length === 0) {
      toast.error('验证失败', '至少需要保留一个轮播项');
      return;
    }
    if (quickEntries.length === 0) {
      toast.error('验证失败', '至少需要保留一个快捷入口');
      return;
    }

    // 验证必填字段
    for (let i = 0; i < heroSlides.length; i++) {
      if (!heroSlides[i].title.trim()) {
        toast.error('验证失败', `轮播 #${i + 1} 的标题不能为空`);
        setActiveTab('hero');
        return;
      }
    }
    for (let i = 0; i < quickEntries.length; i++) {
      if (!quickEntries[i].label.trim()) {
        toast.error('验证失败', `入口 #${i + 1} 的标签不能为空`);
        setActiveTab('entries');
        return;
      }
    }

    setSaving(true);

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

    try {
      // 调用后端批量更新接口
      const res = await http.post('/config/batch', {
        configs: {
          'home_ui_config': JSON.stringify(newConfig),
        },
      });

      if (res.data?.code === 200) {
        toast.success('保存成功', '首页配置已更新，刷新页面后可见变更');
        setSaved(true);
        // 刷新配置 store
        await refreshConfig();
        setTimeout(() => setSaved(false), 2000);
      } else {
        toast.error('保存失败', res.data?.message || '请稍后重试');
      }
    } catch {
      toast.error('网络错误', '无法连接到服务器，请检查网络连接');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { key: 'hero' as const, label: 'Hero 轮播' },
    { key: 'entries' as const, label: '快捷入口' },
    { key: 'colors' as const, label: '课程配色' },
    { key: 'values' as const, label: '平台价值' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 加载状态 */}
      {loading && (
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <div className="flex gap-2 mt-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-24" />
            ))}
          </div>
          <div className="grid gap-4 mt-6">
            {[1, 2, 3].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      )}

      {/* 主内容 */}
      {!loading && (
      <>
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
                disabled={saving}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                  saved ? 'bg-green-500 text-white' : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}>
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> 保存中...</>
                ) : saved ? (
                  <><CheckCircle2 className="w-4 h-4" /> 已保存</>
                ) : (
                  <><Save className="w-4 h-4" /> 保存配置</>
                )}
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
                    <button onClick={() => setDeleteConfirm({ type: 'hero', index: idx })}
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
                    <button onClick={() => setDeleteConfirm({ type: 'entry', index: idx })}
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
                    <button onClick={() => setDeleteConfirm({ type: 'color', index: idx })}
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

      {/* 删除确认对话框 */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">确认删除</h3>
                <p className="text-sm text-gray-500 mt-1">
                  确定要删除此项吗？此操作无法撤销。
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (deleteConfirm.type === 'hero') {
                    setHeroSlides(heroSlides.filter((_, i) => i !== deleteConfirm.index));
                  } else if (deleteConfirm.type === 'entry') {
                    setQuickEntries(quickEntries.filter((_, i) => i !== deleteConfirm.index));
                  } else if (deleteConfirm.type === 'color') {
                    setCourseColors(courseColors.filter((_, i) => i !== deleteConfirm.index));
                  }
                  toast.success('已删除', '项目已被移除');
                  setDeleteConfirm(null);
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                确认删除
              </button>
            </div>
          </motion.div>
        </div>
      )}
      </>
      )}
    </div>
  );
}
