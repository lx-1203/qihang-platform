import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Palette, Globe, Mail,
  Search as SearchIcon, Shield, Clock,
  ChevronDown, ChevronUp, Edit3, Check, X,
  AlertTriangle, FileText, AlertCircle,
  Headphones, Phone, MessageCircle, Settings as SettingsIcon,
  Users, Send, Loader2, Crown, Upload, Layers,
  ToggleLeft, ToggleRight, Image, User, FileUp,
  Briefcase, Video
} from 'lucide-react';
import http from '@/api/http';
import { useToast } from '@/components/ui/';
import { useConfigStore } from '@/store/config';
import Tag from '@/components/ui/Tag';
import { Skeleton, ListSkeleton } from '@/components/ui/Skeleton';
import FileUpload from '@/components/ui/FileUpload';

// ====== 平台设置（站点配置管理 + 系统参数 + 客服管理 + 审计日志） ======
// 商业级要求：
// 1. 前端所有展示内容100%后台可视化配置
// 2. 修改后实时生效，无需前端发版
// 3. 操作日志全程留痕，不可删改

type Tab = 'configs' | 'system' | 'service' | 'audit';

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

interface ServiceMessage {
  id: number;
  user_id: number;
  user_name: string;
  subject: string;
  content: string;
  status: 'pending' | 'resolved' | 'closed';
  reply: string;
  created_at: string;
  updated_at: string;
}

const GROUP_LABELS: Record<string, { label: string; icon: typeof Palette }> = {
  brand: { label: '品牌设置', icon: Palette },
  homepage: { label: '首页配置', icon: Globe },
  contact: { label: '联系方式', icon: Mail },
  seo: { label: 'SEO优化', icon: SearchIcon },
  studyabroad: { label: '留学板块', icon: Globe },
  general: { label: '通用配置', icon: Shield },
  privacy: { label: '隐私与合规', icon: Shield },
  payment: { label: '支付配置', icon: Crown },
};

// 系统参数快捷配置项映射
const SYSTEM_PARAMS = [
  { key: 'brand_name', label: '品牌名称', group: 'brand', icon: Palette, description: '平台显示的品牌名称' },
  { key: 'brand_subtitle', label: '品牌副标题', group: 'brand', icon: Palette, description: '首页展示的品牌副标题' },
  { key: 'brand_logo', label: '品牌Logo', group: 'brand', icon: Palette, description: '导航栏Logo图片URL' },
  { key: 'contact_email', label: '联系邮箱', group: 'contact', icon: Mail, description: '平台官方联系邮箱' },
  { key: 'service_time', label: '客服时间', group: 'contact', icon: Clock, description: '客服服务时间，如：工作日 9:00-18:00' },
  { key: 'service_phone', label: '客服电话', group: 'contact', icon: Phone, description: '客服联系电话' },
  { key: 'service_wechat', label: '客服微信', group: 'contact', icon: MessageCircle, description: '客服微信号' },
  { key: 'site_description', label: '站点描述', group: 'seo', icon: SearchIcon, description: '网站SEO描述' },
  { key: 'site_keywords', label: 'SEO关键词', group: 'seo', icon: SearchIcon, description: '逗号分隔的关键词列表' },
  { key: 'icp_number', label: 'ICP备案号', group: 'general', icon: Shield, description: '网站ICP备案号' },
  { key: 'max_file_upload_size', label: '文件上传大小(MB)', group: 'general', icon: Shield, description: '单文件最大上传大小(MB)' },
  { key: 'privacy_policy_url', label: '隐私政策链接', group: 'privacy', icon: Shield, description: '隐私政策页面URL' },
  { key: 'user_agreement_url', label: '用户协议链接', group: 'privacy', icon: Shield, description: '用户服务协议URL' },
];

// VIP会员参数
const VIP_PARAMS = [
  { key: 'vip_monthly_price', label: '月度价格', icon: Crown, description: 'VIP月度订阅价格（元）', placeholder: '如：29.9' },
  { key: 'vip_quarterly_price', label: '季度价格', icon: Crown, description: 'VIP季度订阅价格（元）', placeholder: '如：79.9' },
  { key: 'vip_yearly_price', label: '年度价格', icon: Crown, description: 'VIP年度订阅价格（元）', placeholder: '如：299' },
  { key: 'vip_features', label: 'VIP权益列表', icon: Crown, description: 'JSON数组，列出VIP会员享有的权益', placeholder: '如：["畅享全部课程","优先预约导师","独家资源下载"]' },
];

// 板块开关
const SECTION_TOGGLES = [
  { key: 'section_jobs_enabled', label: '招聘板块', icon: Briefcase, description: '控制招聘相关功能的启用/停用' },
  { key: 'section_courses_enabled', label: '课程板块', icon: Video, description: '控制课程/内容资源板块的启用/停用' },
  { key: 'section_studyabroad_enabled', label: '留学板块', icon: Globe, description: '控制留学相关功能的启用/停用' },
  { key: 'section_mentors_enabled', label: '导师板块', icon: Users, description: '控制导师咨询功能的启用/停用' },
  { key: 'section_community_enabled', label: '社区板块', icon: MessageCircle, description: '控制社区/文章功能的启用/停用' },
] as const;

// 上传限制参数
const UPLOAD_PARAMS = [
  { key: 'upload_image_max_size', label: '图片大小上限', icon: Image, description: '图片上传最大尺寸（MB）', placeholder: '如：10' },
  { key: 'upload_video_max_size', label: '视频大小上限', icon: Video, description: '视频上传最大尺寸（MB）', placeholder: '如：200' },
  { key: 'upload_doc_max_size', label: '文档大小上限', icon: FileText, description: '文档上传最大尺寸（MB）', placeholder: '如：50' },
  { key: 'upload_allowed_types', label: '允许上传类型', icon: FileUp, description: '逗号分隔的允许上传文件扩展名', placeholder: '如：jpg,png,pdf,doc,docx' },
  { key: 'upload_max_total_size', label: '总上传上限', icon: Upload, description: '用户总上传配额（MB）', placeholder: '如：500' },
] as const;

// 客服账号配置
const SERVICE_ACCOUNT_PARAMS = [
  { key: 'service_account_name', label: '客服昵称', icon: User, description: '在线客服显示的昵称', placeholder: '如：小启助手' },
  { key: 'service_account_avatar', label: '客服头像URL', icon: Image, description: '客服头像图片地址', placeholder: '如：https://example.com/avatar.png' },
  { key: 'service_welcome_message', label: '欢迎语', icon: MessageCircle, description: '用户打开客服对话时显示的欢迎消息', placeholder: '如：您好！有什么可以帮助您的？' },
  { key: 'service_online_enabled', label: '在线客服开关', icon: Headphones, description: '开启/关闭在线客服功能' },
] as const;

const SERVICE_STATUS_MAP: Record<string, { label: string; variant: 'yellow' | 'green' | 'gray' }> = {
  pending: { label: '待处理', variant: 'yellow' },
  resolved: { label: '已回复', variant: 'green' },
  closed: { label: '已关闭', variant: 'gray' },
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
  const [fetchErrorCode, setFetchErrorCode] = useState<number | null>(null);

  // 系统参数编辑
  const [systemEditingKey, setSystemEditingKey] = useState<string | null>(null);
  const [systemEditValue, setSystemEditValue] = useState('');
  const [systemSaving, setSystemSaving] = useState(false);

  // 客服管理
  const [serviceMessages, setServiceMessages] = useState<ServiceMessage[]>([]);
  const [serviceLoading, setServiceLoading] = useState(false);
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [replyingId, setReplyingId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);

  useEffect(() => {
    if (tab === 'configs' || tab === 'system') fetchConfigs();
    else if (tab === 'audit') fetchAuditLogs();
    else if (tab === 'service') fetchServiceMessages();
  }, [tab]);

  async function fetchConfigs() {
    try {
      setLoading(true);
      setFetchError(null);
      setFetchErrorCode(null);
      const res = await http.get('/config/all');
      if (res.data?.code === 200 && Array.isArray(res.data.data)) {
        setConfigs(res.data.data);
      } else {
        setConfigs([]);
        setFetchError('获取配置失败：响应格式异常');
      }
    } catch (err: unknown) {
      setConfigs([]);
      const status = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { status?: number } }).response?.status || null
        : null;
      setFetchErrorCode(status);
      setFetchError(status === 403 ? '你当前没有查看平台配置的权限' : '获取配置失败，请检查后端服务是否运行');
    } finally {
      setLoading(false);
    }
  }

  async function fetchAuditLogs() {
    try {
      setLoading(true);
      setFetchError(null);
      setFetchErrorCode(null);
      const res = await http.get('/admin/audit-logs', { params: { page: 1, pageSize: 50 } });
      if (res.data?.code === 200 && res.data.data) {
        setAuditLogs(res.data?.data?.list || res.data?.data || []);
      } else {
        setAuditLogs([]);
        setFetchError('获取审计日志失败：响应格式异常');
      }
    } catch (err: unknown) {
      setAuditLogs([]);
      const status = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { status?: number } }).response?.status || null
        : null;
      setFetchErrorCode(status);
      setFetchError(status === 403 ? '你当前没有查看审计日志的权限' : '获取审计日志失败，请检查后端服务是否运行');
    } finally {
      setLoading(false);
    }
  }

  async function fetchServiceMessages() {
    setServiceLoading(true);
    try {
      // 使用反馈/通知接口获取客服消息
      const res = await http.get('/admin/feedbacks', { params: { page: 1, pageSize: 50, status: serviceFilter } });
      if (res.data?.code === 200 && res.data.data) {
        setServiceMessages(res.data.data.list || res.data.data || []);
      } else {
        setServiceMessages([]);
      }
    } catch {
      // 接口可能不存在，使用空数据
      setServiceMessages([]);
    } finally {
      setServiceLoading(false);
    }
  }

  async function saveConfig(key: string, value: string) {
    const cfg = configs.find(c => c.config_key === key);
    if (cfg?.config_type === 'json') {
      try { JSON.parse(value); } catch {
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
        await refreshConfig(true);
        setTimeout(() => setSaveSuccess(null), 2000);
        setEditingKey(null);
      } else {
        setSaveError(res.data?.message || '保存失败');
        toast.error('保存失败', res.data?.message || '请稍后重试');
      }
    } catch (err: unknown) {
      const response = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { status?: number; data?: { message?: string } } }).response
        : undefined;
      const message = response?.data?.message
        || (response?.status === 403 ? '该配置项不可修改' : undefined)
        || (response?.status === 404 ? '配置项不存在' : undefined)
        || '保存失败，请检查后端服务';
      setSaveError(message);
      toast.error('保存失败', message);
    } finally {
      setSaving(false);
    }
  }

  // 系统参数快捷保存
  async function saveSystemParam(key: string, value: string) {
    try {
      setSystemSaving(true);
      const res = await http.put(`/config/${key}`, { value });
      if (res.data?.code === 200) {
        setConfigs(prev => prev.map(c => c.config_key === key ? { ...c, config_value: value } : c));
        toast.success('保存成功', '系统参数已更新');
        await refreshConfig(true);
        setSystemEditingKey(null);
      } else {
        toast.error('保存失败', res.data?.message || '请稍后重试');
      }
    } catch {
      toast.error('保存失败', '请检查后端服务');
    } finally {
      setSystemSaving(false);
    }
  }

  // 客服回复
  async function sendServiceReply(messageId: number) {
    if (!replyText.trim()) return;
    setReplySending(true);
    try {
      const msg = serviceMessages.find(m => m.id === messageId);
      await http.post('/admin/feedback', {
        userId: msg?.user_id,
        title: `回复：${msg?.subject || '客服咨询'}`,
        content: replyText,
      });
      // 更新本地状态
      setServiceMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, status: 'resolved' as const, reply: replyText } : m
      ));
      toast.success('回复已发送');
      setReplyText('');
      setReplyingId(null);
    } catch {
      toast.error('回复失败', '请稍后重试');
    } finally {
      setReplySending(false);
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

  // 获取系统参数的当前值
  function getSystemParamValue(key: string): string {
    const cfg = configs.find(c => c.config_key === key);
    return cfg?.config_value || '';
  }

  async function toggleSystemParam(key: string, currentValue: string) {
    const newValue = currentValue === '1' || currentValue === 'true' ? '0' : '1';
    try {
      const res = await http.put(`/config/${key}`, { value: newValue });
      if (res.data?.code === 200) {
        setConfigs(prev => prev.map(c => c.config_key === key ? { ...c, config_value: newValue } : c));
        toast.success('更新成功');
      } else {
        toast.error('更新失败', res.data?.message || '请稍后重试');
      }
    } catch {
      toast.error('更新失败', '请检查后端服务是否运行');
    }
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
    mentor: '咨询人员',
    job: '职位',
    course: '内容',
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">平台设置</h1>
        <p className="text-gray-500 mt-1">站点配置管理、系统参数、客服管理与操作审计日志</p>
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
      <div className="space-y-6 overflow-y-auto pb-12">

      {/* Tab切换 */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit overflow-x-auto">
        <button
          onClick={() => setTab('configs')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
            tab === 'configs' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Palette className="w-4 h-4" />
          站点配置
        </button>
        <button
          onClick={() => setTab('system')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
            tab === 'system' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <SettingsIcon className="w-4 h-4" />
          系统参数
        </button>
        <button
          onClick={() => setTab('service')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
            tab === 'service' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Headphones className="w-4 h-4" />
          客服管理
        </button>
        <button
          onClick={() => setTab('audit')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
            tab === 'audit' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          审计日志
        </button>
      </div>

      {/* ====== 站点配置 ====== */}
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
              <div className="flex-1">
                <p className="text-sm text-red-800">{fetchError}</p>
                <p className="text-xs text-red-600 mt-0.5">
                  {fetchErrorCode === 403 ? '请使用管理员账号访问，或检查后端权限配置。' : '可检查 /api/config/all 接口和后端服务状态。'}
                </p>
              </div>
              <button onClick={fetchConfigs} className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700">重试</button>
            </div>
          )}

          {!fetchError && configs.length === 0 && (
            <div className="bg-white border border-gray-100 rounded-xl p-10 text-center text-gray-500">
              <Palette className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium text-gray-700">暂无可展示的站点配置</p>
              <p className="text-xs text-gray-500 mt-1">接口已返回空数据，配置项创建后会显示在这里。</p>
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
                    <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center">
                      <GroupIcon className="w-5 h-5 text-primary-600" />
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
                              {cfg.config_type === 'color' && (
                                <span className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: cfg.config_value }} />
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{cfg.description}</p>

                            {editingKey === cfg.config_key ? (
                              <div className="mt-2 space-y-2">
                                {cfg.config_type === 'boolean' ? (
                                  <select
                                    id={`config-${cfg.config_key}`}
                                    name={cfg.config_key}
                                    value={editValue}
                                    onChange={e => setEditValue(e.target.value)}
                                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                  >
                                    <option value="true">开启</option>
                                    <option value="false">关闭</option>
                                  </select>
                                ) : cfg.config_type === 'color' ? (
                                  <div className="flex items-center gap-2">
                                    <input type="color" value={editValue} onChange={e => setEditValue(e.target.value)} className="w-10 h-10 p-0 border-0 cursor-pointer" />
                                    <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-32 font-mono focus:ring-2 focus:ring-primary-500 outline-none" />
                                  </div>
                                ) : cfg.config_type === 'json' ? (
                                  <div className="space-y-1">
                                    <textarea
                                      id={`config-${cfg.config_key}`}
                                      name={cfg.config_key}
                                      value={editValue}
                                      onChange={e => { setEditValue(e.target.value); setJsonError(null); }}
                                      rows={6}
                                      className={`w-full border rounded-lg px-3 py-2 text-sm font-mono resize-y focus:ring-2 focus:ring-primary-500 outline-none max-w-lg ${
                                        jsonError ? 'border-red-300 bg-red-50' : 'border-gray-200'
                                      }`}
                                      placeholder='{"key": "value"}'
                                    />
                                    {jsonError && <p className="text-xs text-red-600">{jsonError}</p>}
                                  </div>
                                ) : cfg.config_type === 'image' ? (
                                  <div className="space-y-2">
                                    <input type="url" value={editValue} onChange={e => setEditValue(e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none max-w-lg w-full" placeholder="输入图片URL" />
                                    <FileUpload category="general" accept="image/*" placeholder="点击或拖拽上传图片" onSuccess={(result) => setEditValue(result.url)} />
                                    {editValue && (
                                      <div className="w-32 h-16 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                        <img src={editValue} alt="预览" className="w-full h-full object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none max-w-lg w-full" />
                                )}
                                <div className="flex items-center gap-2">
                                  <button onClick={() => saveConfig(cfg.config_key, editValue)} disabled={saving} className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => { setEditingKey(null); setJsonError(null); setSaveError(null); }} className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
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
                              {cfg.is_editable !== 1 && (
                                <span className="text-xs text-amber-600">只读</span>
                              )}
                              <button
                                onClick={() => { setEditingKey(cfg.config_key); setEditValue(cfg.config_value); }}
                                disabled={cfg.is_editable !== 1}
                                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-primary-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400"
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

      {/* ====== 系统参数 ====== */}
      {tab === 'system' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <SettingsIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800">基础系统参数快捷配置</p>
              <p className="text-xs text-blue-600 mt-0.5">此处展示最常用的系统参数，修改后实时生效。更多配置请前往「站点配置」Tab。</p>
            </div>
          </div>

          {fetchError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-red-800">{fetchError}</p>
              </div>
              <button onClick={fetchConfigs} className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700">重试</button>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">基础系统参数</h3>
              <p className="text-xs text-gray-500 mt-0.5">品牌名称、联系方式、客服时间等核心配置</p>
            </div>
            <div className="divide-y divide-gray-50">
              {SYSTEM_PARAMS.map(param => {
                const currentValue = getSystemParamValue(param.key);
                const isEditing = systemEditingKey === param.key;
                const ParamIcon = param.icon;

                return (
                  <div key={param.key} className="px-6 py-4 hover:bg-gray-50/50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 mr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center">
                            <ParamIcon className="w-4 h-4 text-primary-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{param.label}</p>
                            <p className="text-xs text-gray-500">{param.description}</p>
                          </div>
                        </div>

                        {isEditing ? (
                          <div className="mt-3 ml-10 space-y-2">
                            <input
                              type="text"
                              value={systemEditValue}
                              onChange={e => setSystemEditValue(e.target.value)}
                              className="w-full max-w-md border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                              placeholder={`输入${param.label}...`}
                            />
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => saveSystemParam(param.key, systemEditValue)}
                                disabled={systemSaving}
                                className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                              >
                                {systemSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                保存
                              </button>
                              <button
                                onClick={() => setSystemEditingKey(null)}
                                className="px-3 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                              >
                                取消
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-700 mt-1 ml-10">
                            {currentValue || <span className="text-gray-400 italic">未设置</span>}
                          </p>
                        )}
                      </div>

                      {!isEditing && (
                        <button
                          onClick={() => { setSystemEditingKey(param.key); setSystemEditValue(currentValue); }}
                          className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-primary-600 transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 客服信息预览卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <h4 className="text-sm font-bold text-gray-900">联系邮箱</h4>
              </div>
              <p className="text-sm text-gray-700">{getSystemParamValue('contact_email') || '未设置'}</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <Phone className="w-5 h-5 text-green-600" />
                </div>
                <h4 className="text-sm font-bold text-gray-900">客服电话</h4>
              </div>
              <p className="text-sm text-gray-700">{getSystemParamValue('service_phone') || '未设置'}</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <h4 className="text-sm font-bold text-gray-900">客服时间</h4>
              </div>
              <p className="text-sm text-gray-700">{getSystemParamValue('service_time') || '未设置'}</p>
            </div>
          </div>

          {/* VIP会员参数 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-gray-900">VIP会员参数</h3>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">VIP订阅价格与权益配置</p>
            </div>
            <div className="divide-y divide-gray-50">
              {VIP_PARAMS.map(param => {
                const currentValue = getSystemParamValue(param.key);
                const isEditing = systemEditingKey === param.key;
                const ParamIcon = param.icon;
                return (
                  <div key={param.key} className="px-6 py-4 hover:bg-gray-50/50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 mr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                            <ParamIcon className="w-4 h-4 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{param.label}</p>
                            <p className="text-xs text-gray-500">{param.description}</p>
                          </div>
                        </div>
                        {isEditing ? (
                          <div className="mt-3 ml-10 space-y-2">
                            <input type="text" value={systemEditValue} onChange={e => setSystemEditValue(e.target.value)}
                              className="w-full max-w-md border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                              placeholder={param.placeholder} />
                            <div className="flex items-center gap-2">
                              <button onClick={() => saveSystemParam(param.key, systemEditValue)} disabled={systemSaving}
                                className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1">
                                {systemSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}保存
                              </button>
                              <button onClick={() => setSystemEditingKey(null)} className="px-3 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 transition-colors">取消</button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-700 mt-1 ml-10">{currentValue || <span className="text-gray-400 italic">未设置</span>}</p>
                        )}
                      </div>
                      {!isEditing && (
                        <button onClick={() => { setSystemEditingKey(param.key); setSystemEditValue(currentValue); }}
                          className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-primary-600 transition-colors">
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 板块开关 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-bold text-gray-900">板块开关</h3>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">控制各功能板块的启用/停用，停用后对应板块在前端不可见</p>
            </div>
            <div className="divide-y divide-gray-50">
              {SECTION_TOGGLES.map(section => {
                const rawValue = getSystemParamValue(section.key);
                const enabled = rawValue === '1' || rawValue === 'true';
                const SectionIcon = section.icon;
                return (
                  <div key={section.key} className="px-6 py-4 hover:bg-gray-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${enabled ? 'bg-green-50' : 'bg-gray-100'}`}>
                        <SectionIcon className={`w-4 h-4 ${enabled ? 'text-green-600' : 'text-gray-400'}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{section.label}</p>
                        <p className="text-xs text-gray-500">{section.description}</p>
                      </div>
                    </div>
                    <button onClick={() => toggleSystemParam(section.key, rawValue)} className="focus:outline-none">
                      {enabled
                        ? <ToggleRight className="w-10 h-6 text-green-500" />
                        : <ToggleLeft className="w-10 h-6 text-gray-300" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 上传限制 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-500" />
                <h3 className="text-sm font-bold text-gray-900">上传限制</h3>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">文件上传大小、类型与总配额限制</p>
            </div>
            <div className="divide-y divide-gray-50">
              {UPLOAD_PARAMS.map(param => {
                const currentValue = getSystemParamValue(param.key);
                const isEditing = systemEditingKey === param.key;
                const ParamIcon = param.icon;
                return (
                  <div key={param.key} className="px-6 py-4 hover:bg-gray-50/50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 mr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                            <ParamIcon className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{param.label}</p>
                            <p className="text-xs text-gray-500">{param.description}</p>
                          </div>
                        </div>
                        {isEditing ? (
                          <div className="mt-3 ml-10 space-y-2">
                            <input type="text" value={systemEditValue} onChange={e => setSystemEditValue(e.target.value)}
                              className="w-full max-w-md border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                              placeholder={param.placeholder} />
                            <div className="flex items-center gap-2">
                              <button onClick={() => saveSystemParam(param.key, systemEditValue)} disabled={systemSaving}
                                className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1">
                                {systemSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}保存
                              </button>
                              <button onClick={() => setSystemEditingKey(null)} className="px-3 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 transition-colors">取消</button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-700 mt-1 ml-10">{currentValue || <span className="text-gray-400 italic">未设置</span>}</p>
                        )}
                      </div>
                      {!isEditing && (
                        <button onClick={() => { setSystemEditingKey(param.key); setSystemEditValue(currentValue); }}
                          className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-primary-600 transition-colors">
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ====== 客服管理 ====== */}
      {tab === 'service' && (
        <div className="space-y-4">
          {/* 客服信息概览 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                <Headphones className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">客服管理</h3>
                <p className="text-xs text-gray-500">查看用户咨询消息，回复用户问题</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-700">{serviceMessages.length}</p>
                <p className="text-xs text-blue-600">总消息</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-amber-700">{serviceMessages.filter(m => m.status === 'pending').length}</p>
                <p className="text-xs text-amber-600">待处理</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-700">{serviceMessages.filter(m => m.status === 'resolved').length}</p>
                <p className="text-xs text-green-600">已回复</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-gray-700">{serviceMessages.filter(m => m.status === 'closed').length}</p>
                <p className="text-xs text-gray-600">已关闭</p>
              </div>
            </div>

            {/* 客服配置信息 */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">当前客服配置</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-500">邮箱：</span>
                  <span className="text-gray-900">{getSystemParamValue('contact_email') || '未设置'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-500">电话：</span>
                  <span className="text-gray-900">{getSystemParamValue('service_phone') || '未设置'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-500">时间：</span>
                  <span className="text-gray-900">{getSystemParamValue('service_time') || '未设置'}</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">在下方可直接配置客服账号信息</p>
            </div>
          </div>

          {/* 客服账号配置 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary-500" />
                <h3 className="text-sm font-bold text-gray-900">客服账号配置</h3>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">配置在线客服显示的昵称、头像、欢迎语和开关状态</p>
            </div>
            <div className="divide-y divide-gray-50">
              {SERVICE_ACCOUNT_PARAMS.map(param => {
                const currentValue = getSystemParamValue(param.key);
                const isEditing = systemEditingKey === param.key;
                const ParamIcon = param.icon;
                const isToggle = param.key === 'service_online_enabled';
                const enabled = currentValue === '1' || currentValue === 'true';

                return (
                  <div key={param.key} className="px-6 py-4 hover:bg-gray-50/50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 mr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center">
                            <ParamIcon className="w-4 h-4 text-primary-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{param.label}</p>
                            <p className="text-xs text-gray-500">{param.description}</p>
                          </div>
                        </div>
                        {isToggle ? (
                          <div className="mt-1 ml-10 flex items-center gap-2">
                            <button onClick={() => toggleSystemParam(param.key, currentValue)} className="focus:outline-none">
                              {enabled
                                ? <ToggleRight className="w-10 h-6 text-green-500" />
                                : <ToggleLeft className="w-10 h-6 text-gray-300" />}
                            </button>
                            <span className={`text-sm ${enabled ? 'text-green-600' : 'text-gray-400'}`}>
                              {enabled ? '已开启' : '已关闭'}
                            </span>
                          </div>
                        ) : (
                          isEditing ? (
                            <div className="mt-3 ml-10 space-y-2">
                              <input type="text" value={systemEditValue} onChange={e => setSystemEditValue(e.target.value)}
                                className="w-full max-w-md border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                placeholder={param.placeholder} />
                              <div className="flex items-center gap-2">
                                <button onClick={() => saveSystemParam(param.key, systemEditValue)} disabled={systemSaving}
                                  className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1">
                                  {systemSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}保存
                                </button>
                                <button onClick={() => setSystemEditingKey(null)} className="px-3 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 transition-colors">取消</button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-700 mt-1 ml-10">{currentValue || <span className="text-gray-400 italic">未设置</span>}</p>
                          )
                        )}
                      </div>
                      {!isToggle && !isEditing && (
                        <button onClick={() => { setSystemEditingKey(param.key); setSystemEditValue(currentValue); }}
                          className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-primary-600 transition-colors">
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 筛选 */}
          <div className="flex items-center gap-2">
            {['all', 'pending', 'resolved', 'closed'].map(s => (
              <button
                key={s}
                onClick={() => { setServiceFilter(s); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  serviceFilter === s ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s === 'all' ? '全部' : SERVICE_STATUS_MAP[s]?.label || s}
              </button>
            ))}
          </div>

          {/* 消息列表 */}
          {serviceLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
              <span className="ml-2 text-gray-500">加载中...</span>
            </div>
          ) : serviceMessages.length > 0 ? (
            <div className="space-y-3">
              {serviceMessages.map((msg, i) => {
                const statusInfo = SERVICE_STATUS_MAP[msg.status] || { label: msg.status, variant: 'gray' as const };
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-bold text-gray-900">{msg.subject || '用户咨询'}</h4>
                          <Tag variant={statusInfo.variant} size="sm">{statusInfo.label}</Tag>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">
                          来自：{msg.user_name || `用户#${msg.user_id}`} | {new Date(msg.created_at).toLocaleString('zh-CN')}
                        </p>
                        <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{msg.content}</p>
                        {msg.reply && (
                          <div className="mt-2 bg-green-50 rounded-lg p-3">
                            <p className="text-xs text-green-600 font-medium mb-1">管理员回复：</p>
                            <p className="text-sm text-green-800">{msg.reply}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 回复区域 */}
                    {msg.status !== 'closed' && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        {replyingId === msg.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={replyText}
                              onChange={e => setReplyText(e.target.value)}
                              placeholder="输入回复内容..."
                              rows={3}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => sendServiceReply(msg.id)}
                                disabled={!replyText.trim() || replySending}
                                className="px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-40 flex items-center gap-1"
                              >
                                {replySending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                发送回复
                              </button>
                              <button onClick={() => { setReplyingId(null); setReplyText(''); }} className="px-3 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200">
                                取消
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setReplyingId(msg.id)}
                            className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                          >
                            <MessageCircle className="w-4 h-4" />
                            回复
                          </button>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-xl p-10 text-center text-gray-500">
              <Headphones className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium text-gray-700">暂无客服消息</p>
              <p className="text-xs text-gray-500 mt-1">用户提交咨询后将在此显示</p>
            </div>
          )}
        </div>
      )}

      {/* ====== 审计日志 ====== */}
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
                      log.action === 'login' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {ACTION_MAP[log.action]?.charAt(0) || (log.action || '?').charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{log.operator_name || '未知用户'}</span>
                        <span className="text-gray-500"> {ACTION_MAP[log.action] || log.action || '操作'}了 </span>
                        <span className="font-medium">{TARGET_MAP[log.target_type] || log.target_type || '未知'}</span>
                        {log.target_id && <span className="text-gray-500"> ID{log.target_id}</span>}
                      </p>
                      {log.before_data && (
                        <p className="text-xs text-gray-400 mt-1 font-mono truncate max-w-lg">
                          变更: {log.before_data} → {log.after_data || ''}
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
