import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Eye, CheckCircle2, Loader2, AlertTriangle, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import http from '@/api/http';
import { useToast } from '@/components/ui';
import { useConfigStore } from '@/store/config';
import { Skeleton, CardSkeleton } from '@/components/ui/Skeleton';

// 默认配置
const DEFAULT_BG_BOOST_CONFIG = {
  services: [
    {
      id: 1, title: '实习内推', icon: 'Briefcase', color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100',
      gradientFrom: 'from-blue-500', gradientTo: 'to-blue-600',
      description: '大厂/外企/券商核心岗位实习机会，助力留学申请与职业发展',
      features: ['字节跳动、腾讯、阿里、美团等头部互联网', '四大会计师事务所核心岗位'],
      link: '/jobs', linkLabel: '查看实习岗位',
      stats: { count: '500+', label: '可选岗位' },
      cases: [{ name: '小王', school: '双非大三', result: '通过平台内推入职字节跳动后端实习', highlight: '双非逆袭' }]
    }
  ],
  processSteps: [
    { step: 1, title: '免费评估', desc: '专业顾问一对一评估你的背景，找出短板', icon: 'Target' },
    { step: 2, title: '定制方案', desc: '根据目标院校和专业，定制专属提升方案', icon: 'FileText' }
  ],
  guarantees: [
    { title: '效果保障', desc: '签约服务，未达效果可退费', icon: 'Shield' },
    { title: '导师资源', desc: '全球500+名校导师资源库', icon: 'Users' }
  ]
};

type ServiceItem = typeof DEFAULT_BG_BOOST_CONFIG.services[0];
type ProcessStep = typeof DEFAULT_BG_BOOST_CONFIG.processSteps[0];
type GuaranteeItem = typeof DEFAULT_BG_BOOST_CONFIG.guarantees[0];

export default function BackgroundBoostConfig() {
  const toast = useToast();
  const refreshConfig = useConfigStore((s) => s.fetchConfigs);
  const [services, setServices] = useState<ServiceItem[]>(DEFAULT_BG_BOOST_CONFIG.services);
  const [processSteps, setProcessSteps] = useState<ProcessStep[]>(DEFAULT_BG_BOOST_CONFIG.processSteps);
  const [guarantees, setGuarantees] = useState<GuaranteeItem[]>(DEFAULT_BG_BOOST_CONFIG.guarantees);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'services' | 'process' | 'guarantees'>('services');
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; index: number } | null>(null);

  useEffect(() => {
    async function loadConfig() {
      try {
        setLoading(true);
        const res = await http.get('/config/public');
        if (res.data?.code === 200 && res.data.data?.background_boost_page_config) {
          try {
            const config = res.data.data.background_boost_page_config;
            if (config.services) setServices(config.services);
            if (config.processSteps) setProcessSteps(config.processSteps);
            if (config.guarantees) setGuarantees(config.guarantees);
          } catch {
            toast.warning('配置解析失败', '使用默认配置');
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

    if (services.length === 0) {
      toast.error('验证失败', '至少需要保留一个服务项');
      return;
    }

    for (let i = 0; i < services.length; i++) {
      if (!services[i].title.trim()) {
        toast.error('验证失败', `服务 #${i + 1} 的标题不能为空`);
        setActiveTab('services');
        return;
      }
    }

    setSaving(true);

    const newConfig = {
      ...DEFAULT_BG_BOOST_CONFIG,
      services,
      processSteps,
      guarantees,
    };

    try {
      const res = await http.post('/config/batch', {
        configs: { 'background_boost_page_config': JSON.stringify(newConfig) },
      });

      if (res.data?.code === 200) {
        toast.success('保存成功', '背景提升页面配置已更新');
        setSaved(true);
        await refreshConfig();
        setTimeout(() => setSaved(false), 2000);
      } else {
        toast.error('保存失败', res.data?.message || '请稍后重试');
      }
    } catch {
      toast.error('网络错误', '无法连接到服务器');
    } finally {
      setSaving(false);
    }
  };

  // 更新服务特性列表
  const updateFeatures = (idx: number, featureStr: string) => {
    const features = featureStr.split('\n').filter(f => f.trim());
    const arr = [...services];
    arr[idx] = { ...arr[idx], features };
    setServices(arr);
  };

  const tabs = [
    { key: 'services' as const, label: '服务项目' },
    { key: 'process' as const, label: '服务流程' },
    { key: 'guarantees' as const, label: '服务保障' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {loading && (
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8 space-y-4">
          <Skeleton className="h-8 w-64" />
          <div className="flex gap-2 mt-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-24" />)}</div>
          {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
        </div>
      )}

      {!loading && (
      <>
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">背景提升页面配置</h1>
              <p className="text-gray-500 text-sm mt-1">管理背景提升页面的服务项、流程和保障信息</p>
            </div>
            <div className="flex items-center gap-3">
              <a href="/study-abroad/background" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                <Eye className="w-4 h-4" /> 预览页面
              </a>
              <button onClick={handleSave} disabled={saving}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                  saved ? 'bg-green-500 text-white' : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}>
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> 保存中...</> :
                 saved ? <><CheckCircle2 className="w-4 h-4" /> 已保存</> :
                 <><Save className="w-4 h-4" /> 保存配置</>}
              </button>
            </div>
          </div>

          {/* Tab 导航 */}
          <div className="flex gap-1 mt-4 border-t border-gray-100 pt-3">
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.key ? 'bg-primary-50 text-primary-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}>{tab.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">

        {/* ====== 服务项目编辑 ====== */}
        {activeTab === 'services' && (
          <div className="space-y-4">
            {services.map((svc, idx) => (
              <motion.div key={svc.id || idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }} className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-900">服务 #{idx + 1}: {svc.title || '未命名'}</h3>
                  {services.length > 1 && (
                    <button onClick={() => setDeleteConfirm({ type: 'service', index: idx })}
                      className="text-red-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">服务名称</label>
                    <input value={svc.title}
                      onChange={e => { const arr = [...services]; arr[idx] = { ...arr[idx], title: e.target.value }; setServices(arr); }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="如：实习内推" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">图标名 (Lucide)</label>
                    <input value={svc.icon}
                      onChange={e => { const arr = [...services]; arr[idx] = { ...arr[idx], icon: e.target.value }; setServices(arr); }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Briefcase" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">颜色类</label>
                    <input value={svc.color}
                      onChange={e => { const arr = [...services]; arr[idx] = { ...arr[idx], color: e.target.value }; setServices(arr); }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="text-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">跳转链接</label>
                    <input value={svc.link}
                      onChange={e => { const arr = [...services]; arr[idx] = { ...arr[idx], link: e.target.value }; setServices(arr); }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="/jobs" />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-500 mb-1">描述</label>
                  <input value={svc.description}
                    onChange={e => { const arr = [...services]; arr[idx] = { ...arr[idx], description: e.target.value }; setServices(arr); }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="服务简介..." />
                </div>
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-500 mb-1">特性列表（每行一条）</label>
                  <textarea value={svc.features.join('\n')} rows={3}
                    onChange={e => updateFeatures(idx, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder={'每行一个特性\n如：字节跳动、腾讯、阿里'} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">统计数据</label>
                    <input value={svc.stats.count}
                      onChange={e => { const arr = [...services]; arr[idx] = { ...arr[idx], stats: { ...arr[idx].stats, count: e.target.value } }; setServices(arr); }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="500+" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">统计标签</label>
                    <input value={svc.stats.label}
                      onChange={e => { const arr = [...services]; arr[idx] = { ...arr[idx], stats: { ...arr[idx].stats, label: e.target.value } }; setServices(arr); }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="可选岗位" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">按钮文字</label>
                    <input value={svc.linkLabel}
                      onChange={e => { const arr = [...services]; arr[idx] = { ...arr[idx], linkLabel: e.target.value }; setServices(arr); }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="查看详情" />
                  </div>
                </div>
              </motion.div>
            ))}
            <button onClick={() => setServices([...services, {
              id: Date.now(), title: '', icon: 'Star', color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-100',
              gradientFrom: 'from-gray-500', gradientTo: 'to-gray-600',
              description: '', features: [], link: '/', linkLabel: '查看详情',
              stats: { count: '0', label: '' }, cases: []
            }])}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> 添加服务项
            </button>
          </div>
        )}

        {/* ====== 服务流程编辑 ====== */}
        {activeTab === 'process' && (
          <div className="space-y-4">
            {processSteps.map((step, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }} className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-900">步骤 #{step.step}</h3>
                  {processSteps.length > 1 && (
                    <button onClick={() => setDeleteConfirm({ type: 'process', index: idx })}
                      className="text-red-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">步骤标题</label>
                    <input value={step.title}
                      onChange={e => { const arr = [...processSteps]; arr[idx] = { ...arr[idx], title: e.target.value }; setProcessSteps(arr); }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">步骤描述</label>
                    <input value={step.desc}
                      onChange={e => { const arr = [...processSteps]; arr[idx] = { ...arr[idx], desc: e.target.value }; setProcessSteps(arr); }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">图标名</label>
                    <input value={step.icon}
                      onChange={e => { const arr = [...processSteps]; arr[idx] = { ...arr[idx], icon: e.target.value }; setProcessSteps(arr); }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                  </div>
                </div>
              </motion.div>
            ))}
            <button onClick={() => setProcessSteps([...processSteps, {
              step: processSteps.length + 1, title: '', desc: '', icon: 'Target'
            }])}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> 添加流程步骤
            </button>
          </div>
        )}

        {/* ====== 服务保障编辑 ====== */}
        {activeTab === 'guarantees' && (
          <div className="space-y-4">
            {guarantees.map((g, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }} className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-900">保障 #{idx + 1}</h3>
                  {guarantees.length > 1 && (
                    <button onClick={() => setDeleteConfirm({ type: 'guarantee', index: idx })}
                      className="text-red-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">保障标题</label>
                    <input value={g.title}
                      onChange={e => { const arr = [...guarantees]; arr[idx] = { ...arr[idx], title: e.target.value }; setGuarantees(arr); }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">保障描述</label>
                    <input value={g.desc}
                      onChange={e => { const arr = [...guarantees]; arr[idx] = { ...arr[idx], desc: e.target.value }; setGuarantees(arr); }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">图标名</label>
                    <input value={g.icon}
                      onChange={e => { const arr = [...guarantees]; arr[idx] = { ...arr[idx], icon: e.target.value }; setGuarantees(arr); }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                  </div>
                </div>
              </motion.div>
            ))}
            <button onClick={() => setGuarantees([...guarantees, { title: '', desc: '', icon: 'Shield' }])}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> 添加保障项
            </button>
          </div>
        )}

      </div>

      {/* 删除确认对话框 */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">确认删除</h3>
                <p className="text-sm text-gray-500 mt-1">确定要删除此项吗？此操作无法撤销。</p>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">取消</button>
              <button onClick={() => {
                if (deleteConfirm.type === 'service') {
                  setServices(services.filter((_, i) => i !== deleteConfirm.index));
                } else if (deleteConfirm.type === 'process') {
                  setProcessSteps(processSteps.filter((_, i) => i !== deleteConfirm.index));
                } else if (deleteConfirm.type === 'guarantee') {
                  setGuarantees(guarantees.filter((_, i) => i !== deleteConfirm.index));
                }
                toast.success('已删除', '项目已被移除');
                setDeleteConfirm(null);
              }} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">确认删除</button>
            </div>
          </motion.div>
        </div>
      )}
      </>
      )}
    </div>
  );
}
