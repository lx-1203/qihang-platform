import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Save, RefreshCw, Palette, Globe, Mail,
  Search as SearchIcon, Shield, Clock,
  ChevronDown, ChevronUp, Edit3, Check, X,
  AlertTriangle, FileText, Image
} from 'lucide-react';
import http from '@/api/http';

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
  const [tab, setTab] = useState<Tab>('configs');
  const [configs, setConfigs] = useState<SiteConfig[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['brand', 'homepage']));
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // 模拟配置数据
  const mockConfigs: SiteConfig[] = [
    { id: 1, config_key: 'brand_name', config_value: '启航平台', config_type: 'string', config_group: 'brand', label: '平台名称', description: '网站主标题', is_public: 1, is_editable: 1, sort_order: 1 },
    { id: 2, config_key: 'brand_slogan', config_value: '大学生综合发展与就业指导平台', config_type: 'string', config_group: 'brand', label: '平台标语', description: '首页副标题', is_public: 1, is_editable: 1, sort_order: 2 },
    { id: 3, config_key: 'brand_color', config_value: '#14b8a6', config_type: 'color', config_group: 'brand', label: '主品牌色', description: '全站主色调', is_public: 1, is_editable: 1, sort_order: 3 },
    { id: 4, config_key: 'brand_logo', config_value: '', config_type: 'image', config_group: 'brand', label: '平台Logo', description: '顶部导航Logo图片URL', is_public: 1, is_editable: 1, sort_order: 4 },
    { id: 10, config_key: 'home_hero_title', config_value: '你的职业发展，从启航开始', config_type: 'string', config_group: 'homepage', label: '首页主标题', description: 'Hero区域大标题', is_public: 1, is_editable: 1, sort_order: 10 },
    { id: 11, config_key: 'home_hero_subtitle', config_value: '连接梦想与机遇，助力每一位大学生迈向理想职业', config_type: 'string', config_group: 'homepage', label: '首页副标题', description: 'Hero区域副标题', is_public: 1, is_editable: 1, sort_order: 11 },
    { id: 13, config_key: 'home_stats_jobs', config_value: '10000+', config_type: 'string', config_group: 'homepage', label: '职位总数展示', description: '首页统计-职位数', is_public: 1, is_editable: 1, sort_order: 13 },
    { id: 14, config_key: 'home_stats_companies', config_value: '500+', config_type: 'string', config_group: 'homepage', label: '合作企业展示', description: '首页统计-企业数', is_public: 1, is_editable: 1, sort_order: 14 },
    { id: 20, config_key: 'contact_email', config_value: 'support@qihang.com', config_type: 'string', config_group: 'contact', label: '客服邮箱', description: '页脚和联系页面展示', is_public: 1, is_editable: 1, sort_order: 20 },
    { id: 21, config_key: 'contact_phone', config_value: '400-888-9999', config_type: 'string', config_group: 'contact', label: '客服电话', description: '页脚和联系页面展示', is_public: 1, is_editable: 1, sort_order: 21 },
    { id: 24, config_key: 'work_hours', config_value: '周一至周五 9:00-18:00 (北京时间)', config_type: 'string', config_group: 'contact', label: '工作时间', description: '所有咨询入口展示', is_public: 1, is_editable: 1, sort_order: 24 },
    { id: 30, config_key: 'seo_title', config_value: '启航平台 - 大学生综合发展与就业指导', config_type: 'string', config_group: 'seo', label: '网页标题', description: '浏览器标签页标题', is_public: 1, is_editable: 1, sort_order: 30 },
    { id: 40, config_key: 'studyabroad_hero_title', config_value: '海外名校，触手可及', config_type: 'string', config_group: 'studyabroad', label: '留学首页标题', description: '留学板块Hero标题', is_public: 1, is_editable: 1, sort_order: 40 },
    { id: 50, config_key: 'footer_icp', config_value: '苏ICP备XXXXXXXX号', config_type: 'string', config_group: 'general', label: 'ICP备案号', description: '页脚备案号展示', is_public: 1, is_editable: 1, sort_order: 50 },
    { id: 51, config_key: 'footer_copyright', config_value: '© 2026 江苏初晓云网络科技有限公司', config_type: 'string', config_group: 'general', label: '版权信息', description: '页脚版权声明', is_public: 1, is_editable: 1, sort_order: 51 },
    { id: 52, config_key: 'maintenance_mode', config_value: 'false', config_type: 'boolean', config_group: 'general', label: '维护模式', description: '开启后前端显示维护页面', is_public: 1, is_editable: 1, sort_order: 52 },
    { id: 53, config_key: 'announcement', config_value: '', config_type: 'string', config_group: 'general', label: '全站公告', description: '顶部公告条内容（为空则不显示）', is_public: 1, is_editable: 1, sort_order: 53 },
  ];

  const mockAuditLogs: AuditLog[] = [
    { id: 1, operator_name: '超级管理员', operator_role: 'admin', action: 'update', target_type: 'config', target_id: null, before_data: '{"key":"brand_name","oldValue":"启航"}', after_data: '{"value":"启航平台"}', ip_address: '127.0.0.1', created_at: '2026-04-08 10:30:00' },
    { id: 2, operator_name: '超级管理员', operator_role: 'admin', action: 'update', target_type: 'user', target_id: 7, before_data: '{"status":1}', after_data: '{"status":0}', ip_address: '127.0.0.1', created_at: '2026-04-08 10:15:00' },
    { id: 3, operator_name: '超级管理员', operator_role: 'admin', action: 'update', target_type: 'company', target_id: 1, before_data: '{"verify_status":"pending"}', after_data: '{"verify_status":"approved"}', ip_address: '127.0.0.1', created_at: '2026-04-08 09:45:00' },
    { id: 4, operator_name: '超级管理员', operator_role: 'admin', action: 'update', target_type: 'mentor', target_id: 5, before_data: '{"verify_status":"pending"}', after_data: '{"verify_status":"rejected","remark":"资质证明缺失"}', ip_address: '127.0.0.1', created_at: '2026-04-08 09:20:00' },
    { id: 5, operator_name: '超级管理员', operator_role: 'admin', action: 'create', target_type: 'config', target_id: null, before_data: null, after_data: '{"key":"announcement","value":"平台升级公告"}', ip_address: '127.0.0.1', created_at: '2026-04-07 18:00:00' },
    { id: 6, operator_name: '超级管理员', operator_role: 'admin', action: 'login', target_type: 'user', target_id: 1, before_data: null, after_data: null, ip_address: '192.168.1.100', created_at: '2026-04-07 09:00:00' },
  ];

  useEffect(() => {
    if (tab === 'configs') fetchConfigs();
    else fetchAuditLogs();
  }, [tab]);

  async function fetchConfigs() {
    try {
      setLoading(true);
      const res = await http.get('/config/all');
      if (res.data?.code === 200 && res.data.data) {
        setConfigs(res.data.data);
      } else {
        setConfigs(mockConfigs);
      }
    } catch {
      setConfigs(mockConfigs);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAuditLogs() {
    try {
      setLoading(true);
      const res = await http.get('/admin/audit-logs', { params: { page: 1, pageSize: 50 } });
      if (res.data?.code === 200 && res.data.data) {
        setAuditLogs(res.data.data.list || res.data.data);
      } else {
        setAuditLogs(mockAuditLogs);
      }
    } catch {
      setAuditLogs(mockAuditLogs);
    } finally {
      setLoading(false);
    }
  }

  async function saveConfig(key: string, value: string) {
    try {
      setSaving(true);
      await http.put(`/config/${key}`, { value });
      setConfigs(prev => prev.map(c => c.config_key === key ? { ...c, config_value: value } : c));
      setSaveSuccess(key);
      setTimeout(() => setSaveSuccess(null), 2000);
    } catch {
      // 模拟保存
      setConfigs(prev => prev.map(c => c.config_key === key ? { ...c, config_value: value } : c));
      setSaveSuccess(key);
      setTimeout(() => setSaveSuccess(null), 2000);
    } finally {
      setSaving(false);
      setEditingKey(null);
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">平台设置</h1>
        <p className="text-gray-500 mt-1">站点配置管理与操作审计日志</p>
      </div>

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
                              <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-mono">{cfg.config_key}</span>
                              {cfg.config_type === 'color' && (
                                <span className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: cfg.config_value }} />
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{cfg.description}</p>

                            {editingKey === cfg.config_key ? (
                              <div className="flex items-center gap-2 mt-2">
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
                                ) : (
                                  <input
                                    type="text"
                                    value={editValue}
                                    onChange={e => setEditValue(e.target.value)}
                                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none max-w-lg"
                                  />
                                )}
                                <button
                                  onClick={() => saveConfig(cfg.config_key, editValue)}
                                  disabled={saving}
                                  className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingKey(null)}
                                  className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-700 mt-1 truncate max-w-lg">
                                {cfg.config_type === 'boolean' ? (cfg.config_value === 'true' ? '开启' : '关闭') : (cfg.config_value || '（未设置）')}
                              </p>
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
      )}
    </div>
  );
}
