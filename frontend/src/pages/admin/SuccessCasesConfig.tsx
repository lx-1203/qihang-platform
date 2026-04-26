import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Eye, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import http from '@/api/http';
import { useToast } from '@/components/ui';
import { useConfigStore } from '@/store/config';
import { Skeleton, CardSkeleton } from '@/components/ui/Skeleton';
import { handleApiFailure } from '@/utils/connectionStatus';
import FileUpload from '@/components/ui/FileUpload';

// 默认配置
const DEFAULT_SUCCESS_CASES_CONFIG = {
  categories: [
    { key: "all", label: "全部", icon: "Star" },
    { key: "job", label: "求职成功", icon: "Briefcase" },
    { key: "postgrad", label: "考研上岸", icon: "GraduationCap" },
    { key: "abroad", label: "留学录取", icon: "Globe" },
    { key: "startup", label: "创业成功", icon: "Rocket" }
  ],
  stats: [
    { label: "求职成功", value: 12800, suffix: "+", icon: "Briefcase" },
    { label: "考研上岸", value: 5600, suffix: "+", icon: "GraduationCap" }
  ],
  cases: [
    {
      id: 1, name: "张同学", avatar: "张",
      school: "南京大学 · 计算机科学与技术", category: "job",
      achievement: "斩获腾讯 PCG 产品经理 Offer",
      quote: "在启航平台上预约了3次模拟面试，导师的反馈非常精准。",
      tags: ["互联网大厂", "产品经理"],
      color: "from-blue-500 to-cyan-500", bgLight: "bg-blue-50", textColor: "text-blue-600"
    }
  ]
};

type CaseItem = typeof DEFAULT_SUCCESS_CASES_CONFIG.cases[0];
type CategoryItem = typeof DEFAULT_SUCCESS_CASES_CONFIG.categories[0];
type StatItem = typeof DEFAULT_SUCCESS_CASES_CONFIG.stats[0];

export default function SuccessCasesConfig() {
  const toast = useToast();
  const refreshConfig = useConfigStore((s) => s.fetchConfigs);
  const [cases, setCases] = useState<CaseItem[]>(DEFAULT_SUCCESS_CASES_CONFIG.cases);
  const [categories, setCategories] = useState<CategoryItem[]>(DEFAULT_SUCCESS_CASES_CONFIG.categories);
  const [stats, setStats] = useState<StatItem[]>(DEFAULT_SUCCESS_CASES_CONFIG.stats);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'cases' | 'categories' | 'stats'>('cases');
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [editingCase, setEditingCase] = useState<number | null>(null);

  useEffect(() => {
    async function loadConfig() {
      try {
        setLoading(true);
        const res = await http.get('/config/public');
        if (res.data?.code === 200 && res.data.data?.success_cases_page_config) {
          try {
            const config = res.data.data.success_cases_page_config;
            if (config.cases) setCases(config.cases);
            if (config.categories) setCategories(config.categories);
            if (config.stats) setStats(config.stats);
          } catch {
            toast.warning('配置解析失败', '使用默认配置');
          }
        }
      } catch {
        await handleApiFailure('成功案例');
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, [toast]);

  const handleSave = async () => {
    if (saving) return;

    if (cases.length === 0) {
      toast.error('验证失败', '至少需要保留一个案例');
      return;
    }

    for (let i = 0; i < cases.length; i++) {
      if (!cases[i].name.trim()) {
        toast.error('验证失败', `案例 第${i + 1}项 的姓名不能为空`);
        setActiveTab('cases');
        return;
      }
    }

    setSaving(true);

    const newConfig = {
      ...DEFAULT_SUCCESS_CASES_CONFIG,
      cases,
      categories,
      stats,
    };

    try {
      const res = await http.post('/config/batch', {
        configs: { 'success_cases_page_config': JSON.stringify(newConfig) },
      });

      if (res.data?.code === 200) {
        toast.success('保存成功', '成功案例配置已更新');
        setSaved(true);
        await refreshConfig(true);
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

  // 更新案例标签
  const updateCaseTags = (idx: number, tagStr: string) => {
    const tags = tagStr.split(',').map(t => t.trim()).filter(Boolean);
    const arr = [...cases];
    arr[idx] = { ...arr[idx], tags };
    setCases(arr);
  };

  // 添加新案例
  const addCase = () => {
    const newId = Math.max(0, ...cases.map(c => c.id)) + 1;
    setCases([...cases, {
      id: newId,
      name: '', avatar: '',
      school: '', category: 'job',
      achievement: '', quote: '',
      tags: [],
      color: 'from-blue-500 to-cyan-500',
      bgLight: 'bg-blue-50',
      textColor: 'text-blue-600'
    }]);
    setEditingCase(cases.length); // 自动展开新案例编辑
  };

  const tabs = [
    { key: 'cases' as const, label: `案例列表 (${cases.length})` },
    { key: 'categories' as const, label: '分类管理' },
    { key: 'stats' as const, label: '统计数据' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {loading && (
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8 space-y-4">
          <Skeleton className="h-8 w-64" />
          <div className="flex gap-2 mt-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-24" />)}</div>
          {[1, 2].map(i => <CardSkeleton key={i} />)}
        </div>
      )}

      {!loading && (
      <>
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">成功案例配置</h1>
              <p className="text-gray-500 text-sm mt-1">管理成功案例页面的案例数据、分类和统计信息</p>
            </div>
            <div className="flex items-center gap-3">
              <a href="/success-cases" target="_blank" rel="noopener noreferrer"
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

        {/* ====== 案例列表编辑 ====== */}
        {activeTab === 'cases' && (
          <div className="space-y-4">
            {cases.map((item, idx) => (
              <motion.div key={item.id || idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* 案例头部 - 可折叠 */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setEditingCase(editingCase === idx ? null : idx)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                      {item.avatar || '?'}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">{item.name || '未命名案例'} 第{idx + 1}项</h3>
                      <p className="text-xs text-gray-500">{item.school || '未设置学校'} · {item.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${item.bgLight} ${item.textColor}`}>{item.achievement?.substring(0, 20) || '无成就'}</span>
                    {cases.length > 1 && (
                      <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(idx); }}
                        className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                </div>

                {/* 展开的编辑区域 */}
                {editingCase === idx && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    className="border-t border-gray-100 p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">姓名</label>
                        <input value={item.name}
                          onChange={e => { const arr = [...cases]; arr[idx] = { ...arr[idx], name: e.target.value }; setCases(arr); }}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="如：张同学" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">头像字</label>
                        <input value={item.avatar}
                          onChange={e => { const v = e.target.value; if (v.length <= 1 && /^[\u4e00-\u9fa5a-zA-Z]?$/.test(v)) { const arr = [...cases]; arr[idx] = { ...arr[idx], avatar: v }; setCases(arr); } }}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="单字，如：张" maxLength={1} />
                        <label className="block text-xs font-medium text-gray-500 mb-1 mt-3">或上传头像图片</label>
                        <FileUpload
                          category="avatar"
                          accept="image/*"
                          placeholder="上传头像"
                          onSuccess={(result) => {
                            const arr = [...cases];
                            arr[idx] = { ...arr[idx], avatar: result.url };
                            setCases(arr);
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">学校/专业</label>
                        <input value={item.school}
                          onChange={e => { const arr = [...cases]; arr[idx] = { ...arr[idx], school: e.target.value }; setCases(arr); }}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="南京大学 · 计算机科学" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">分类</label>
                        <select value={item.category}
                          onChange={e => { const arr = [...cases]; arr[idx] = { ...arr[idx], category: e.target.value }; setCases(arr); }}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                          {categories.filter(c => c.key !== 'all').map(cat => (
                            <option key={cat.key} value={cat.key}>{cat.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">成就描述</label>
                      <input value={item.achievement}
                        onChange={e => { const arr = [...cases]; arr[idx] = { ...arr[idx], achievement: e.target.value }; setCases(arr); }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="斩获腾讯 PCG 产品经理 Offer" />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">引用语</label>
                      <textarea
                        id={`case-quote-${idx}`}
                        name={`quote-${idx}`}
                        value={item.quote}
                        rows={2}
                        onChange={e => { const arr = [...cases]; arr[idx] = { ...arr[idx], quote: e.target.value }; setCases(arr); }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="学员的真实评价..." />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">标签（逗号分隔）</label>
                      <input value={item.tags.join(', ')}
                        onChange={e => updateCaseTags(idx, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="互联网大厂, 产品经理, 校招" />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">渐变色</label>
                        <input value={item.color}
                          onChange={e => { const arr = [...cases]; arr[idx] = { ...arr[idx], color: e.target.value }; setCases(arr); }}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="from-blue-500 to-cyan-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">背景色</label>
                        <input value={item.bgLight}
                          onChange={e => { const arr = [...cases]; arr[idx] = { ...arr[idx], bgLight: e.target.value }; setCases(arr); }}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="bg-blue-50" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">文字色</label>
                        <input value={item.textColor}
                          onChange={e => { const arr = [...cases]; arr[idx] = { ...arr[idx], textColor: e.target.value }; setCases(arr); }}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="text-blue-600" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}

            <button onClick={addCase}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> 添加新案例
            </button>
          </div>
        )}

        {/* ====== 分类管理 ====== */}
        {activeTab === 'categories' && (
          <div className="space-y-4">
            {categories.map((cat, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-900">分类 第{idx + 1}项: {cat.label}</h3>
                  {categories.length > 1 && cat.key !== 'all' && (
                    <button onClick={() => { setCategories(categories.filter((_, i) => i !== idx)); toast.success('已删除'); }}
                      className="text-red-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Key（标识）</label>
                    <input value={cat.key} disabled={cat.key === 'all'}
                      onChange={e => { const arr = [...categories]; arr[idx] = { ...arr[idx], key: e.target.value }; setCategories(arr); }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">显示名称</label>
                    <input value={cat.label}
                      onChange={e => { const arr = [...categories]; arr[idx] = { ...arr[idx], label: e.target.value }; setCategories(arr); }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">图标名</label>
                    <input value={cat.icon}
                      onChange={e => { const arr = [...categories]; arr[idx] = { ...arr[idx], icon: e.target.value }; setCategories(arr); }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* ====== 统计数据编辑 ====== */}
        {activeTab === 'stats' && (
          <div className="space-y-4">
            {stats.map((stat, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-900">统计项 第{idx + 1}项</h3>
                  {stats.length > 1 && (
                    <button onClick={() => { setStats(stats.filter((_, i) => i !== idx)); toast.success('已删除'); }}
                      className="text-red-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">标签</label>
                    <input value={stat.label}
                      onChange={e => { const arr = [...stats]; arr[idx] = { ...arr[idx], label: e.target.value }; setStats(arr); }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">数值</label>
                    <input
                      id={`stat-value-${idx}`}
                      name={`value-${idx}`}
                      type="number"
                      value={stat.value}
                      onChange={e => { const arr = [...stats]; arr[idx] = { ...arr[idx], value: Number(e.target.value) || 0 }; setStats(arr); }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">后缀</label>
                    <input value={stat.suffix}
                      onChange={e => { const arr = [...stats]; arr[idx] = { ...arr[idx], suffix: e.target.value }; setStats(arr); }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">图标名</label>
                    <input value={stat.icon}
                      onChange={e => { const arr = [...stats]; arr[idx] = { ...arr[idx], icon: e.target.value }; setStats(arr); }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                  </div>
                </div>
              </motion.div>
            ))}
            <button onClick={() => setStats([...stats, { label: '', value: 0, suffix: '+', icon: 'Star' }])}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> 添加统计项
            </button>
          </div>
        )}

      </div>

      {/* 删除确认对话框 */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">确认删除</h3>
                <p className="text-sm text-gray-500 mt-1">确定要删除此案例吗？此操作无法撤销。</p>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">取消</button>
              <button onClick={() => {
                setCases(cases.filter((_, i) => i !== deleteConfirm));
                toast.success('已删除', '案例已被移除');
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
