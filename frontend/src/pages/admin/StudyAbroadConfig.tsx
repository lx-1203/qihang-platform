import { useState, useEffect } from 'react';
import { Save, Image, RefreshCw, Plus, Trash2, Upload, Eye, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import http from '@/api/http';
import { useToast } from '@/components/ui';
import { useConfigStore } from '@/store/config';
import { Skeleton, CardSkeleton } from '@/components/ui/Skeleton';
import uiConfig from '../../data/study-abroad-ui-config.json';

type HeroSlide = typeof uiConfig.heroSlides[0];
type ServiceCard = typeof uiConfig.serviceCards[0];
type StudentStory = typeof uiConfig.studentStories[0];
type NewcomerQuote = typeof uiConfig.newcomerQuotes[0];

export default function StudyAbroadConfig() {
  const toast = useToast();
  const refreshConfig = useConfigStore((s) => s.fetchConfigs);
  const [activeTab, setActiveTab] = useState<'hero' | 'services' | 'stories' | 'quotes'>('hero');
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(uiConfig.heroSlides);
  const [serviceCards, setServiceCards] = useState<ServiceCard[]>(uiConfig.serviceCards);
  const [studentStories, setStudentStories] = useState<StudentStory[]>(uiConfig.studentStories);
  const [newcomerQuotes, setNewcomerQuotes] = useState<NewcomerQuote[]>(uiConfig.newcomerQuotes);
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
          // 尝试从后端配置中获取留学UI配置
          if (configs.study_abroad_ui_config) {
            try {
              const parsedConfig = typeof configs.study_abroad_ui_config === 'string'
                ? JSON.parse(configs.study_abroad_ui_config)
                : configs.study_abroad_ui_config;
              if (parsedConfig.heroSlides) setHeroSlides(parsedConfig.heroSlides);
              if (parsedConfig.serviceCards) setServiceCards(parsedConfig.serviceCards);
              if (parsedConfig.studentStories) setStudentStories(parsedConfig.studentStories);
              if (parsedConfig.newcomerQuotes) setNewcomerQuotes(parsedConfig.newcomerQuotes);
            } catch {
              toast.warning('配置解析失败', '使用默认配置');
            }
          }
        }
      } catch {
        toast.info('使用本地默认配置', '无法连接服务器，当前使用内置默认值');
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  const handleSave = async () => {
    if (saving) return;

    // 表单验证
    if (heroSlides.length === 0) {
      toast.error('验证失败', '至少需要保留一个轮播图');
      return;
    }
    if (serviceCards.length === 0) {
      toast.error('验证失败', '至少需要保留一个服务卡片');
      return;
    }

    // 验证必填字段
    for (let i = 0; i < heroSlides.length; i++) {
      if (!heroSlides[i].title.trim()) {
        toast.error('验证失败', `轮播图 #${i + 1} 的标题不能为空`);
        setActiveTab('hero');
        return;
      }
    }
    for (let i = 0; i < serviceCards.length; i++) {
      if (!serviceCards[i].title.trim()) {
        toast.error('验证失败', `服务卡片 #${i + 1} 的标题不能为空`);
        setActiveTab('services');
        return;
      }
    }

    setSaving(true);

    const newConfig = {
      ...uiConfig,
      heroSlides,
      serviceCards,
      studentStories,
      newcomerQuotes,
      _meta: {
        ...uiConfig._meta,
        lastUpdated: new Date().toISOString().split('T')[0]
      }
    };

    try {
      // 调用后端批量更新接口
      const res = await http.post('/config/batch', {
        configs: {
          'study_abroad_ui_config': JSON.stringify(newConfig),
        },
      });

      if (res.data?.code === 200) {
        toast.success('保存成功', '留学板块配置已更新，刷新页面后可见变更');
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 加载状态 */}
      {loading && (
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <div className="flex gap-2 mt-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-28" />
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
              <h1 className="text-2xl font-bold text-gray-900">留学板块可视化配置</h1>
              <p className="text-gray-500 text-sm mt-1">无需代码，点击即可修改</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.open('/study-abroad', '_blank')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Eye className="w-4 h-4" /> 预览页面
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-primary-500 text-white rounded-xl font-semibold hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/25 disabled:opacity-60 disabled:cursor-not-allowed"
              >
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
        </div>
      </div>

      {/* Tab 导航 */}
      <div className="sticky top-[73px] z-10 bg-white border-b border-gray-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
          <div className="flex gap-1 overflow-x-auto py-2">
            {[
              { id: 'hero', label: 'Hero 轮播图', icon: Image },
              { id: 'services', label: '服务卡片', icon: Plus },
              { id: 'stories', label: '学员故事', icon: Eye },
              { id: 'quotes', label: '新人寄语', icon: RefreshCw },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-primary-500 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8">
        {/* Hero 轮播图配置 */}
        {activeTab === 'hero' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Hero 轮播图</h2>
              <button
                onClick={() => setHeroSlides([...heroSlides, { ...heroSlides[0], id: `hero-${Date.now()}` }])}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800"
              >
                <Plus className="w-4 h-4" /> 新增轮播
              </button>
            </div>

            <div className="grid gap-6">
              {heroSlides.map((slide, index) => (
                <motion.div
                  key={slide.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-primary-500 text-white rounded-lg flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </span>
                      <span className="text-gray-500 text-sm">轮播 {index + 1}</span>
                    </div>
                    <button
                      onClick={() => setDeleteConfirm({ type: 'hero', index: index })}
                      className="text-red-500 hover:text-red-600 p-1"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">标题</label>
                        <input
                          value={slide.title}
                          onChange={(e) => {
                            const newSlides = [...heroSlides];
                            newSlides[index].title = e.target.value;
                            setHeroSlides(newSlides);
                          }}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">副标题</label>
                        <textarea
                          value={slide.subtitle}
                          onChange={(e) => {
                            const newSlides = [...heroSlides];
                            newSlides[index].subtitle = e.target.value;
                            setHeroSlides(newSlides);
                          }}
                          rows={3}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">标签</label>
                          <input
                            value={slide.tag}
                            onChange={(e) => {
                              const newSlides = [...heroSlides];
                              newSlides[index].tag = e.target.value;
                              setHeroSlides(newSlides);
                            }}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">按钮文字</label>
                          <input
                            value={slide.cta}
                            onChange={(e) => {
                              const newSlides = [...heroSlides];
                              newSlides[index].cta = e.target.value;
                              setHeroSlides(newSlides);
                            }}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">图片链接</label>
                        <div className="flex gap-2">
                          <input
                            value={slide.image}
                            onChange={(e) => {
                              const newSlides = [...heroSlides];
                              newSlides[index].image = e.target.value;
                              setHeroSlides(newSlides);
                            }}
                            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                          />
                          <button className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200">
                            <Upload className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="relative aspect-video bg-gray-100 rounded-xl overflow-hidden">
                        <img src={slide.image} alt="" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* 服务卡片配置 */}
        {activeTab === 'services' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">8宫格服务卡片</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {serviceCards.map((card, index) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
                >
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">卡片 {index + 1}</span>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">标题</label>
                        <input
                          value={card.title}
                          onChange={(e) => {
                            const newCards = [...serviceCards];
                            newCards[index].title = e.target.value;
                            setServiceCards(newCards);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">副标题</label>
                        <input
                          value={card.subtitle}
                          onChange={(e) => {
                            const newCards = [...serviceCards];
                            newCards[index].subtitle = e.target.value;
                            setServiceCards(newCards);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">详细描述</label>
                      <input
                        value={card.description}
                        onChange={(e) => {
                          const newCards = [...serviceCards];
                          newCards[index].description = e.target.value;
                          setServiceCards(newCards);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">图片链接</label>
                      <input
                        value={card.image}
                        onChange={(e) => {
                          const newCards = [...serviceCards];
                          newCards[index].image = e.target.value;
                          setServiceCards(newCards);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                      <img src={card.image} alt="" className="w-full h-full object-cover" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* 学员故事配置 */}
        {activeTab === 'stories' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">学员录取故事墙</h2>
              <button
                onClick={() => setStudentStories([...studentStories, { ...studentStories[0], id: `story-${Date.now()}` }])}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800"
              >
                <Plus className="w-4 h-4" /> 新增故事
              </button>
            </div>

            <div className="space-y-6">
              {studentStories.map((story, index) => (
                <motion.div
                  key={story.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-primary-500 text-white rounded-lg flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </span>
                      <span className="text-gray-500 text-sm">故事 {index + 1}</span>
                    </div>
                    <button
                      onClick={() => setDeleteConfirm({ type: 'story', index: index })}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">学员姓名</label>
                          <input
                            value={story.studentName}
                            onChange={(e) => {
                              const newStories = [...studentStories];
                              newStories[index].studentName = e.target.value;
                              setStudentStories(newStories);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">背景</label>
                          <input
                            value={story.background}
                            onChange={(e) => {
                              const newStories = [...studentStories];
                              newStories[index].background = e.target.value;
                              setStudentStories(newStories);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">录取结果</label>
                          <input
                            value={story.result}
                            onChange={(e) => {
                              const newStories = [...studentStories];
                              newStories[index].result = e.target.value;
                              setStudentStories(newStories);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">金句</label>
                        <input
                          value={story.quote}
                          onChange={(e) => {
                            const newStories = [...studentStories];
                            newStories[index].quote = e.target.value;
                            setStudentStories(newStories);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">完整故事</label>
                        <textarea
                          value={story.story}
                          onChange={(e) => {
                            const newStories = [...studentStories];
                            newStories[index].story = e.target.value;
                            setStudentStories(newStories);
                          }}
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">标签 (逗号分隔)</label>
                          <input
                            value={story.tags.join(', ')}
                            onChange={(e) => {
                              const newStories = [...studentStories];
                              newStories[index].tags = e.target.value.split(',').map(s => s.trim());
                              setStudentStories(newStories);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">点赞数</label>
                            <input
                              type="number"
                              value={story.likes}
                              onChange={(e) => {
                                const newStories = [...studentStories];
                                newStories[index].likes = Number(e.target.value);
                                setStudentStories(newStories);
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">浏览数</label>
                            <input
                              type="number"
                              value={story.views}
                              onChange={(e) => {
                                const newStories = [...studentStories];
                                newStories[index].views = Number(e.target.value);
                                setStudentStories(newStories);
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">照片</label>
                        <input
                          value={story.image}
                          onChange={(e) => {
                            const newStories = [...studentStories];
                            newStories[index].image = e.target.value;
                            setStudentStories(newStories);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-3"
                        />
                      </div>
                      <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden">
                        <img src={story.image} alt="" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* 新人寄语配置 */}
        {activeTab === 'quotes' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">新人寄语轮播</h2>
              <button
                onClick={() => setNewcomerQuotes([...newcomerQuotes, { ...newcomerQuotes[0], id: `quote-${Date.now()}` }])}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800"
              >
                <Plus className="w-4 h-4" /> 新增寄语
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {newcomerQuotes.map((quote, index) => (
                <motion.div
                  key={quote.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
                >
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">寄语 {index + 1}</span>
                    <button
                      onClick={() => setDeleteConfirm({ type: 'quote', index: index })}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">语录</label>
                      <textarea
                        value={quote.quote}
                        onChange={(e) => {
                          const newQuotes = [...newcomerQuotes];
                          newQuotes[index].quote = e.target.value;
                          setNewcomerQuotes(newQuotes);
                        }}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">作者</label>
                        <input
                          value={quote.author}
                          onChange={(e) => {
                            const newQuotes = [...newcomerQuotes];
                            newQuotes[index].author = e.target.value;
                            setNewcomerQuotes(newQuotes);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">背景介绍</label>
                        <input
                          value={quote.background}
                          onChange={(e) => {
                            const newQuotes = [...newcomerQuotes];
                            newQuotes[index].background = e.target.value;
                            setNewcomerQuotes(newQuotes);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">背景图链接</label>
                      <input
                        value={quote.image}
                        onChange={(e) => {
                          const newQuotes = [...newcomerQuotes];
                          newQuotes[index].image = e.target.value;
                          setNewcomerQuotes(newQuotes);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-3"
                      />
                    </div>
                    <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                      <img src={quote.image} alt="" className="w-full h-full object-cover" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
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
                  } else if (deleteConfirm.type === 'story') {
                    setStudentStories(studentStories.filter((_, i) => i !== deleteConfirm.index));
                  } else if (deleteConfirm.type === 'quote') {
                    setNewcomerQuotes(newcomerQuotes.filter((_, i) => i !== deleteConfirm.index));
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
