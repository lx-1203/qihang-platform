import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Palette, Globe, Mail,
  Search as SearchIcon, Shield, Clock,
  ChevronDown, ChevronUp, Edit3, Check, X,
  AlertTriangle, FileText, AlertCircle
} from 'lucide-react';
import http from '@/api/http';
import { useToast } from '@/components/ui';
import { useConfigStore } from '@/store/config';
import Tag from '@/components/ui/Tag';
import { Skeleton, CardSkeleton, ListSkeleton } from '@/components/ui/Skeleton';

// ====== 平台设置（站点配置管理 + 审计日志） ======
// 商业级要求：
// 1. 前端所有展示内容100%后台可视化配置
// 2. 修改后实时生效，无需前端发版
// 3. 操作日志全程留痕，不可删改

type Tab = 'configs' | 'audit';

interface SiteConfig {
  id: number;
  config_key: string;
  config_value: string;
  config_type: 'string' | 'number' | 'boolean' | 'json' | 'image' | 'color';
  config_group: string;
  label: string;
  description: string;
  is_public: number;
  is_editable: number;
  sort_order: number;
}

interface AuditLog {
  id: number;
  operator_name: string;
  operator_role: string;
  action: string;
  target_type: string;
  target_id: number | null;
  before_data: string | null;
  after_data: string | null;
  ip_address: string;
  created_at: string;
}

const GROUP_LABELS: Record<string, { label: string; icon: typeof Palette }> = {
  brand: { label: '品牌设置', icon: Palette },
  homepage: { label: '首页配置', icon: Globe },
  contact: { label: '联系方式', icon: Mail },
  seo: { label: 'SEO优化', icon: SearchIcon },
  studyabroad: { label: '留学板块', icon: Globe },
  general: { label: '通用配置', icon: Shield },
};

export default function AdminSettings() {
  const toast = useToast();
  const refreshConfig = useConfigStore((s) => s.fetchConfigs);
  const [tab, setTab] = useState<Tab>('configs');
  const [configs, setConfigs] = useState<SiteConfig[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['brand', 'homepage']));
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (tab === 'configs') fetchConfigs();
    else fetchAuditLogs();
  }, [tab]);

  async function fetchConfigs() {
    try {
      setLoading(true);
      setFetchError(null);
      const res = await http.get('/config/all');
      if (res.data?.code === 200 && res.data.data) {
        setConfigs(res.data.data);
      } else {
        setFetchError('获取配置失败：响应格式异常');
      }
    } catch {
      setFetchError('获取配置失败，请检查后端服务是否运行');
    } finally {
      setLoading(false);
    }
  }

  async function fetchAuditLogs() {
    try {
      setLoading(true);
      setFetchError(null);
      const res = await http.get('/admin/audit-logs', { params: { page: 1, pageSize: 50 } });
      if (res.data?.code === 200 && res.data.data) {
        setAuditLogs(res.data.data.list || res.data.data);
      } else {
        setFetchError('获取审计日志失败：响应格式异常');
      }
    } catch {
      setFetchError('获取审计日志失败，请检查后端服务是否运行');
    } finally {
      setLoading(false);
    }
  }

  async function saveConfig(key: string, value: string) {
    // JSON 类型校验
    const cfg = configs.find(c => c.config_key === key);
    if (cfg?.config_type === 'json') {
      try {
        JSON.parse(value);
      } catch {
        setJsonError('JSON 格式不合法，请检查语法');
        toast.error('格式错误', 'JSON 格式不合法，请检查语法');
        return;
      }
    }

    try {
      setSaving(true);
      setSaveError(null);
      setJsonError(null);
      const res = await http.put(`/config/${key}`, { value });
      if (res.data?.code === 200) {
        setConfigs(prev => prev.map(c => c.config_key === key ? { ...c, config_value: value } : c));
        setSaveSuccess(key);
        toast.success('保存成功', `${cfg?.label || key} 已更新`);
        // 刷新配置 store 使前端页面生效
        await refreshConfig();
        setTimeout(() => setSaveSuccess(null), 2000);
        setEditingKey(null);
      } else {
        setSaveError(res.data?.message || '保存失败');
        toast.error('保存失败', res.data?.message || '请稍后重试');
      }
    } catch (err: unknown) {
      const msg = (err && typeof err === 'object' && 'message' in err) ? (err as { message: string }).message : '保存失败，请检查后端服务';
      setSaveError(msg);
      toast.error('网络错误', msg);
    } finally {
      setSaving(false);
    }
  }

  function toggleGroup(group: string) {
    const next = new Set(expandedGroups);
    if (next.has(group)) next.delete(group);
    else next.add(group);
    setExpandedGroups(next);
  }

  // 按分组整理配置
  const groupedConfigs: Record<string, SiteConfig[]> = {};
  for (const cfg of configs) {
    if (!groupedConfigs[cfg.config_group]) groupedConfigs[cfg.config_group] = [];
    groupedConfigs[cfg.config_group].push(cfg);
  }

  const ACTION_MAP: Record<string, string> = {
    create: '创建',
    update: '更新',
    delete: '删除',
    login: '登录',
    export: '导出',
  };

  const TARGET_MAP: Record<string, string> = {
    config: '站点配置',
    user: '用户',
    company: '企业',
    mentor: '导师',
    job: '职位',
    course: '课程',
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">平台设置</h1>
        <p className="text-gray-500 mt-1">站点配置管理与操作审计日志</p>
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <ListSkeleton count={3} />
        </div>
      )}

      {/* 主内容 */}
      {!loading && (
      <div className="space-y-6">

      {/* Tab切换 */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab('configs')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            tab === 'configs' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Palette className="w-4 h-4" />
          站点配置
        </button>
        <button
          onClick={() => setTab('audit')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            tab === 'audit' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          审计日志
        </button>
      </div>

      {/* 站点配置 */}
      {tab === 'configs' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">配置修改后实时生效</p>
              <p className="text-xs text-amber-600 mt-0.5">所有修改将被记录在审计日志中，请谨慎操作。前端页面将在刷新后显示最新配置。</p>
            </div>
          </div>

          {/* 保存错误提示 */}
          {saveError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">保存失败</p>
                <p className="text-xs text-red-600 mt-0.5">{saveError}</p>
              </div>
              <button onClick={() => setSaveError(null)} className="ml-auto p-1 hover:bg-red-100 rounded">
                <X className="w-4 h-4 text-red-600" />
              </button>
            </div>
          )}

          {/* 数据加载错误 */}
          {fetchError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-800 flex-1">{fetchError}</p>
              <button onClick={fetchConfigs} className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700">重试</button>
            </div>
          )}

          {Object.entries(groupedConfigs).map(([group, items]) => {
            const groupInfo = GROUP_LABELS[group] || { label: group, icon: Shield };
            const GroupIcon = groupInfo.icon;
            const isExpanded = expandedGroups.has(group);

            return (
              <div key={group} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <button
                  onClick={() => toggleGroup(group)}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center">
                      <GroupIcon className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-sm font-bold text-gray-900">{groupInfo.label}</h3>
                      <p className="text-xs text-gray-500">{items.length} 项配置</p>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100">
                    {items.map((cfg) => (
                      <div key={cfg.config_key} className="px-6 py-4 border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0 mr-4">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-900">{cfg.label}</p>
                              <Tag variant="gray" size="xs" className="font-mono">{cfg.config_key}</Tag>
                              {cfg.config_type === 'color' && (
                                <span className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: cfg.config_value }} />
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{cfg.description}</p>

                            {editingKey === cfg.config_key ? (
                              <div className="mt-2 space-y-2">
                                {cfg.config_type === 'boolean' ? (
                                  <select
                                    value={editValue}
                                    onChange={e => setEditValue(e.target.value)}
                                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                  >
                                    <option value="true">开启</option>
                                    <option value="false">关闭</option>
                                  </select>
                                ) : cfg.config_type === 'color' ? (
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="color"
                                      value={editValue}
                                      onChange={e => setEditValue(e.target.value)}
                                      className="w-10 h-10 p-0 border-0 cursor-pointer"
                                    />
                                    <input
                                      type="text"
                                      value={editValue}
                                      onChange={e => setEditValue(e.target.value)}
                                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-32 font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                  </div>
                                ) : cfg.config_type === 'json' ? (
                                  <div className="space-y-1">
                                    <textarea
                                      value={editValue}
                                      onChange={e => { setEditValue(e.target.value); setJsonError(null); }}
                                      rows={6}
                                      className={`w-full border rounded-lg px-3 py-2 text-sm font-mono resize-y focus:ring-2 focus:ring-indigo-500 outline-none max-w-lg ${
                                        jsonError ? 'border-red-300 bg-red-50' : 'border-gray-200'
                                      }`}
                                      placeholder='{"key": "value"}'
                                    />
                                    {jsonError && <p className="text-xs text-red-600">{jsonError}</p>}
                                  </div>
                                ) : cfg.config_type === 'image' ? (
                                  <div className="space-y-2">
                                    <input
                                      type="url"
                                      value={editValue}
                                      onChange={e => setEditValue(e.target.value)}
                                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none max-w-lg w-full"
                                      placeholder="输入图片URL"
                                    />
                                    {editValue && (
                                      <div className="w-32 h-16 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                        <img src={editValue} alt="预览" className="w-full h-full object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <input
                                    type="text"
                                    value={editValue}
                                    onChange={e => setEditValue(e.target.value)}
                                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none max-w-lg w-full"
                                  />
                                )}
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => saveConfig(cfg.config_key, editValue)}
                                    disabled={saving}
                                    className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => { setEditingKey(null); setJsonError(null); setSaveError(null); }}
                                    className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="text-sm text-gray-700 mt-1 truncate max-w-lg">
                                  {cfg.config_type === 'boolean'
                                    ? (cfg.config_value === 'true' ? '开启' : '关闭')
                                    : cfg.config_type === 'json'
                                      ? (cfg.config_value ? '(JSON 数据)' : '（未设置）')
                                      : cfg.config_type === 'image'
                                        ? (cfg.config_value ? '(图片已设置)' : '（未设置）')
                                        : (cfg.config_value || '（未设置）')}
                                </p>
                                {cfg.config_type === 'image' && cfg.config_value && (
                                  <div className="mt-1 w-20 h-10 bg-gray-100 rounded overflow-hidden border border-gray-200">
                                    <img src={cfg.config_value} alt={cfg.label} className="w-full h-full object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          {editingKey !== cfg.config_key && cfg.is_editable === 1 && (
                            <div className="flex items-center gap-2">
                              {saveSuccess === cfg.config_key && (
                                <span className="text-xs text-green-600 flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" /> 已保存
                                </span>
                              )}
                              <button
                                onClick={() => { setEditingKey(cfg.config_key); setEditValue(cfg.config_value); }}
                                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-colors"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 审计日志 */}
      {tab === 'audit' && (
        <div className="space-y-4">
          {fetchError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-800 flex-1">{fetchError}</p>
              <button onClick={fetchAuditLogs} className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700">重试</button>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">操作审计日志</h3>
              <p className="text-xs text-gray-500 mt-0.5">所有后台操作全程留痕，日志不可删除、不可篡改，保留180天</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Shield className="w-4 h-4" />
              不可删改
            </div>
          </div>

          <div className="divide-y divide-gray-50">
            {auditLogs.map((log, i) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="px-6 py-4 hover:bg-gray-50/50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                      log.action === 'create' ? 'bg-green-100 text-green-700' :
                      log.action === 'update' ? 'bg-blue-100 text-blue-700' :
                      log.action === 'delete' ? 'bg-red-100 text-red-700' :
                      log.action === 'login' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {ACTION_MAP[log.action]?.charAt(0) || log.action.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{log.operator_name}</span>
                        <span className="text-gray-500"> {ACTION_MAP[log.action] || log.action}了 </span>
                        <span className="font-medium">{TARGET_MAP[log.target_type] || log.target_type}</span>
                        {log.target_id && <span className="text-gray-500"> #{log.target_id}</span>}
                      </p>
                      {log.before_data && (
                        <p className="text-xs text-gray-400 mt-1 font-mono truncate max-w-lg">
                          变更: {log.before_data} → {log.after_data}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(log.created_at).toLocaleString('zh-CN')}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">IP: {log.ip_address}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          </div>

          {auditLogs.length === 0 && !fetchError && !loading && (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">暂无审计日志</p>
            </div>
          )}
        </div>
      )}
      </div>
      )}
    </div>
  );
}
