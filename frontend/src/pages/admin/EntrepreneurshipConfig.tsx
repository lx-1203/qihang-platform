import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Eye, CheckCircle2, Loader2, AlertTriangle, Rocket } from 'lucide-react';
import { motion } from 'framer-motion';
import http from '@/api/http';
import { useToast } from '@/components/ui';
import { handleApiFailure } from '@/utils/connectionStatus';
import { useConfigStore } from '@/store/config';
import { Skeleton, CardSkeleton } from '@/components/ui/Skeleton';

// 默认配置
const DEFAULT_ENTREPRENEURSHIP_CONFIG = {
  competitions: [
    { id: 1, name: '"挑战杯"全国大学生课外学术科技作品竞赛', level: '国家级', status: '报名中', deadline: '2024-05-30', tags: ['学术研究', '科技创新'] },
    { id: 2, name: '中国国际"互联网+"大学生创新创业大赛', level: '国家级', status: '即将开始', deadline: '2024-06-15', tags: ['创业项目', '商业计划'] },
    { id: 3, name: '全国大学生电子商务"创新、创意及创业"挑战赛', level: '国家级', status: '进行中', deadline: '2024-04-20', tags: ['电商', '三创'] },
    { id: 4, name: '全国大学生数学建模竞赛', level: '国家级', status: '报名中', deadline: '2024-09-01', tags: ['算法', '数据分析'] }
  ],
  heroTitle: '点燃你的创业梦',
  heroDesc: '寻找志同道合的合伙人，获取专业的创业指导，参与顶级赛事，对接天使投资。让每一个疯狂的想法都有机会改变世界。'
};

type CompetitionItem = typeof DEFAULT_ENTREPRENEURSHIP_CONFIG.competitions[0];

export default function EntrepreneurshipConfig() {
  const toast = useToast();
  const refreshConfig = useConfigStore((s) => s.fetchConfigs);
  const [competitions, setCompetitions] = useState<CompetitionItem[]>(DEFAULT_ENTREPRENEURSHIP_CONFIG.competitions);
  const [heroTitle, setHeroTitle] = useState(DEFAULT_ENTREPRENEURSHIP_CONFIG.heroTitle);
  const [heroDesc, setHeroDesc] = useState(DEFAULT_ENTREPRENEURSHIP_CONFIG.heroDesc);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // 从后端加载配置
  useEffect(() => {
    async function loadConfig() {
      try {
        setLoading(true);
        const res = await http.get('/config/public');
        if (res.data?.code === 200 && res.data.data?.entrepreneurship_page_config) {
          try {
            const config = res.data.data.entrepreneurship_page_config;
            if (config.competitions) setCompetitions(config.competitions);
            if (config.heroTitle) setHeroTitle(config.heroTitle);
            if (config.heroDesc) setHeroDesc(config.heroDesc);
          } catch {
            toast.warning('配置解析失败', '使用默认配置');
          }
        }
      } catch {
        await handleApiFailure('创业配置');
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, [toast]);

  const handleSave = async () => {
    if (saving) return;

    // 表单验证
    if (competitions.length === 0) {
      toast.error('验证失败', '至少需要保留一个比赛项目');
      return;
    }

    for (let i = 0; i < competitions.length; i++) {
      if (!competitions[i].name.trim()) {
        toast.error('验证失败', `比赛 第${i + 1}项 的名称不能为空`);
        return;
      }
    }

    setSaving(true);

    const newConfig = {
      ...DEFAULT_ENTREPRENEURSHIP_CONFIG,
      competitions,
      heroTitle,
      heroDesc,
    };

    try {
      const res = await http.post('/config/batch', {
        configs: {
          'entrepreneurship_page_config': JSON.stringify(newConfig),
        },
      });

      if (res.data?.code === 200) {
        toast.success('保存成功', '创业页面配置已更新，刷新页面后可见变更');
        setSaved(true);
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

  // 添加新比赛
  const addCompetition = () => {
    const newId = Math.max(0, ...competitions.map(c => c.id)) + 1;
    setCompetitions([...competitions, {
      id: newId,
      name: '',
      level: '国家级',
      status: '报名中',
      deadline: '',
      tags: []
    }]);
  };

  // 更新比赛的标签
  const updateTags = (idx: number, tagStr: string) => {
    const tags = tagStr.split(',').map(t => t.trim()).filter(Boolean);
    const arr = [...competitions];
    arr[idx] = { ...arr[idx], tags };
    setCompetitions(arr);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 加载状态 */}
      {loading && (
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <div className="grid gap-4 mt-6">
            {[1, 2, 3, 4].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      )}

      {/* 主内容 */}
      {!loading && (
      <>
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">创业页面配置</h1>
              <p className="text-gray-500 text-sm mt-1">管理创业页面的比赛列表、标题和描述内容</p>
            </div>
            <div className="flex items-center gap-3">
              <a href="/entrepreneurship" target="_blank" rel="noopener noreferrer"
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
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Hero 区域配置 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Rocket className="w-4 h-4 text-primary-500" /> 页面头部信息
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">主标题</label>
              <input value={heroTitle} onChange={e => setHeroTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="点燃你的创业梦" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">副标题/描述</label>
              <input value={heroDesc} onChange={e => setHeroDesc(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="寻找志同道合的合伙人..." />
            </div>
          </div>
        </div>

        {/* 比赛列表编辑 */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary-500" /> 热门赛事列表 ({competitions.length} 个)
          </h3>

          {competitions.map((comp, idx) => (
            <motion.div key={comp.id || idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* 折叠头部 */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-primary-500 text-white rounded-lg flex items-center justify-center font-bold text-sm shrink-0">
                    {idx + 1}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{comp.name || '未命名赛事'}</h3>
                    <p className="text-xs text-gray-500">{comp.level} · {comp.status} · 截止 {comp.deadline || '未设置'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {comp.tags.length > 0 && (
                    <span className="text-xs text-gray-400">{comp.tags.join(', ')}</span>
                  )}
                  {competitions.length > 1 && (
                    <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(idx); }}
                      className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              </div>

              {/* 展开的编辑区域 */}
              {expandedIndex === idx && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  className="border-t border-gray-100 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">赛事名称</label>
                  <input value={comp.name}
                    onChange={e => { const arr = [...competitions]; arr[idx] = { ...arr[idx], name: e.target.value }; setCompetitions(arr); }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="如：挑战杯全国大学生..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">级别</label>
                  <select
                    id={`competition-level-${idx}`}
                    name={`level-${idx}`}
                    value={comp.level}
                    onChange={e => { const arr = [...competitions]; arr[idx] = { ...arr[idx], level: e.target.value }; setCompetitions(arr); }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                    <option value="国家级">国家级</option>
                    <option value="省级">省级</option>
                    <option value="校级">校级</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">状态</label>
                  <select
                    id={`competition-status-${idx}`}
                    name={`status-${idx}`}
                    value={comp.status}
                    onChange={e => { const arr = [...competitions]; arr[idx] = { ...arr[idx], status: e.target.value }; setCompetitions(arr); }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                    <option value="报名中">报名中</option>
                    <option value="进行中">进行中</option>
                    <option value="即将开始">即将开始</option>
                    <option value="已结束">已结束</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">截止日期</label>
                  <input value={comp.deadline}
                    onChange={e => { const arr = [...competitions]; arr[idx] = { ...arr[idx], deadline: e.target.value }; setCompetitions(arr); }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="2024-06-15" />
                </div>
                <div className="lg:col-span-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">标签（逗号分隔）</label>
                  <input value={comp.tags.join(', ')}
                    onChange={e => updateTags(idx, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="学术研究, 科技创新" />
                </div>
              </div>
                </motion.div>
              )}
            </motion.div>
          ))}

          <button onClick={addCompetition}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> 添加赛事
          </button>
        </div>

      </div>

      {/* 删除确认对话框 */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">确认删除</h3>
                <p className="text-sm text-gray-500 mt-1">确定要删除此赛事吗？此操作无法撤销。</p>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">取消</button>
              <button onClick={() => {
                setCompetitions(competitions.filter((_, i) => i !== deleteConfirm));
                toast.success('已删除', '赛事已被移除');
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
