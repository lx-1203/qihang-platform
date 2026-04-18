import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Eye, CheckCircle2, Loader2, AlertTriangle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import http from '@/api/http';
import { useToast } from '@/components/ui';
import { useConfigStore } from '@/store/config';
import { Skeleton, CardSkeleton } from '@/components/ui/Skeleton';
import { handleApiFailure } from '@/utils/connectionStatus';

// 默认配置
const DEFAULT_POSTGRAD_CONFIG = {
  timelines: [
    { month: '3月-5月', title: '基础复习阶段', desc: '确定目标院校和专业，搜集考研大纲和真题，开始英语和专业课基础轮复习。' },
    { month: '6月-8月', title: '强化提高阶段', desc: '暑期黄金复习期，各科全面展开，参加辅导班或集中刷题，攻克重难点。' },
    { month: '9月-10月', title: '报名与冲刺阶段', desc: '关注招生简章，完成网上报名。政治开始复习，进行全真模拟训练。' },
    { month: '11月-12月', title: '考前押题与心态调整', desc: '背诵核心考点，查漏补缺，调整作息规律，保持良好心态迎接初试。' }
  ],
  heroTitle: '考研 / 保研 / 留学',
  heroDesc: '汇集全网最全的升学资讯、学长学姐真实经验贴、院校专业分析报告，助你顺利迈向人生的下一个台阶。'
};

type TimelineItem = typeof DEFAULT_POSTGRAD_CONFIG.timelines[0];

export default function PostgradConfig() {
  const toast = useToast();
  const refreshConfig = useConfigStore((s) => s.fetchConfigs);
  const [timelines, setTimelines] = useState<TimelineItem[]>(DEFAULT_POSTGRAD_CONFIG.timelines);
  const [heroTitle, setHeroTitle] = useState(DEFAULT_POSTGRAD_CONFIG.heroTitle);
  const [heroDesc, setHeroDesc] = useState(DEFAULT_POSTGRAD_CONFIG.heroDesc);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // 从后端加载配置
  useEffect(() => {
    async function loadConfig() {
      try {
        setLoading(true);
        const res = await http.get('/config/public');
        if (res.data?.code === 200 && res.data.data?.postgrad_page_config) {
          try {
            const config = res.data.data.postgrad_page_config;
            if (config.timelines) setTimelines(config.timelines);
            if (config.heroTitle) setHeroTitle(config.heroTitle);
            if (config.heroDesc) setHeroDesc(config.heroDesc);
          } catch {
            toast.warning('配置解析失败', '使用默认配置');
          }
        }
      } catch {
        await handleApiFailure('考研配置');
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, [toast]);

  const handleSave = async () => {
    if (saving) return;

    // 表单验证
    if (timelines.length === 0) {
      toast.error('验证失败', '至少需要保留一个时间线节点');
      return;
    }

    for (let i = 0; i < timelines.length; i++) {
      if (!timelines[i].month.trim()) {
        toast.error('验证失败', `时间线 #${i + 1} 的月份不能为空`);
        return;
      }
      if (!timelines[i].title.trim()) {
        toast.error('验证失败', `时间线 #${i + 1} 的标题不能为空`);
        return;
      }
    }

    if (!heroTitle.trim()) {
      toast.error('验证失败', '主标题不能为空');
      return;
    }

    setSaving(true);

    const newConfig = {
      ...DEFAULT_POSTGRAD_CONFIG,
      timelines,
      heroTitle,
      heroDesc,
    };

    try {
      const res = await http.post('/config/batch', {
        configs: {
          'postgrad_page_config': JSON.stringify(newConfig),
        },
      });

      if (res.data?.code === 200) {
        toast.success('保存成功', '考研页面配置已更新，刷新页面后可见变更');
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
      {/* 顶部工具栏 */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">考研页面配置</h1>
              <p className="text-gray-500 text-sm mt-1">管理考研页面的时间线、标题和描述内容</p>
            </div>
            <div className="flex items-center gap-3">
              <a href="/postgrad" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                <Eye className="w-4 h-4" /> 预览页面
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
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ====== Hero 区域配置 ====== */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary-500" /> 页面头部信息
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">主标题</label>
              <input value={heroTitle} onChange={e => setHeroTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="考研 / 保研 / 留学" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">副标题/描述</label>
              <input value={heroDesc} onChange={e => setHeroDesc(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="汇集全网最全的升学资讯..." />
            </div>
          </div>
        </div>

        {/* ====== 时间线编辑 ====== */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary-500" /> 考研时间线 ({timelines.length} 个节点)
          </h3>

          {timelines.map((item, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
              className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-900">时间线 #{idx + 1}: {item.month}</h3>
                {timelines.length > 1 && (
                  <button onClick={() => setDeleteConfirm(idx)}
                    className="text-red-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">月份区间</label>
                  <input value={item.month}
                    onChange={e => { const arr = [...timelines]; arr[idx] = { ...arr[idx], month: e.target.value }; setTimelines(arr); }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="如：3月-5月" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">阶段标题</label>
                  <input value={item.title}
                    onChange={e => { const arr = [...timelines]; arr[idx] = { ...arr[idx], title: e.target.value }; setTimelines(arr); }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="如：基础复习阶段" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">详细描述</label>
                  <input value={item.desc}
                    onChange={e => { const arr = [...timelines]; arr[idx] = { ...arr[idx], desc: e.target.value }; setTimelines(arr); }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="该阶段的详细说明..." />
                </div>
              </div>
            </motion.div>
          ))}

          <button onClick={() => setTimelines([...timelines, { month: '', title: '', desc: '' }])}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> 添加时间线节点
          </button>
        </div>

      </div>

      {/* 删除确认对话框 */}
      {deleteConfirm !== null && (
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
                  确定要删除此时间线节点吗？此操作无法撤销。
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
                  setTimelines(timelines.filter((_, i) => i !== deleteConfirm));
                  toast.success('已删除', '时间线节点已被移除');
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
