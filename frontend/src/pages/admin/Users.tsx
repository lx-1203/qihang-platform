import { useState, useEffect, useRef, useMemo } from 'react';
import React from 'react';
import { motion } from 'framer-motion';
import {
  Search, Filter, MoreVertical,
  Shield, Ban, CheckCircle, XCircle,
  ChevronLeft, ChevronRight, Download,
  ArrowUpDown, ArrowUp, ArrowDown, Loader2, X,
  UserCog
} from 'lucide-react';
import http from '@/api/http';
import { TableSkeleton } from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { showToast } from '@/components/ui/ToastContainer';
import Tag from '@/components/ui/Tag';

// ====== 用户管理页面 ======
// 商业级要求：RBAC四角色管控、状态管理、搜索筛选

interface UserRecord {
  id: number;
  email: string;
  nickname: string;
  role: 'student' | 'company' | 'mentor' | 'admin';
  avatar: string;
  phone: string;
  status: number;
  created_at: string;
  realNameStatus?: 'pending' | 'approved' | 'rejected' | null;
  careerPlanStatus?: 'pending' | 'completed' | null;
  developmentDirections?: string[] | null;
  // 学生注册信息（从列表 JOIN 查询返回）
  school?: string;
  major?: string;
  grade?: string;
  skills?: string | string[];
  job_intention?: string;
  // 职业规划数据（从列表 JOIN 查询返回）
  graduation_year?: string;
  target_city?: string;
  target_industry?: string;
  target_position?: string;
}

interface UserDetailData {
  user: UserRecord;
  profile: Record<string, unknown> | null;
  identityVerification?: Record<string, unknown> | null;
  careerPlan?: Record<string, unknown> | null;
}

// 发展方向选项
const DEVELOPMENT_DIRECTIONS = [
  { value: '求职就业', label: '求职就业' },
  { value: '考研', label: '考研' },
  { value: '保研', label: '保研' },
  { value: '留学', label: '留学' },
  { value: '创业', label: '创业' },
  { value: '考公考编', label: '考公考编' },
];

const ROLE_MAP: Record<string, { label: string; color: string; tagVariant: 'blue' | 'green' | 'primary' | 'red' }> = {
  student: { label: '学生', color: 'bg-blue-100 text-blue-700', tagVariant: 'blue' },
  company: { label: '企业', color: 'bg-emerald-100 text-emerald-700', tagVariant: 'green' },
  mentor: { label: '咨询人员', color: 'bg-primary-100 text-primary-700', tagVariant: 'primary' },
  admin: { label: '管理员', color: 'bg-red-100 text-red-700', tagVariant: 'red' },
};

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [directionFilter, setDirectionFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;
  const [actionMenu, setActionMenu] = useState<number | null>(null);
  const [detailUser, setDetailUser] = useState<UserDetailData | null>(null);
  const [detailUserId, setDetailUserId] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; userId: number | null; action: string }>({ open: false, userId: null, action: '' });
  const [roleChangeDialog, setRoleChangeDialog] = useState<{ open: boolean; userId: number | null; currentRole: string; nickname: string }>({ open: false, userId: null, currentRole: '', nickname: '' });
  const [selectedRole, setSelectedRole] = useState('student');
  const [roleSaving, setRoleSaving] = useState(false);

  // 排序状态
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // 批量操作状态
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchAction, setBatchAction] = useState<{ open: boolean; action: string }>({ open: false, action: '' });
  const [batchLoading, setBatchLoading] = useState(false);

  const [showAuditLog, setShowAuditLog] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLogLoading, setAuditLogLoading] = useState(false);
  const [auditLogError, setAuditLogError] = useState<string | null>(null);

  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
  const [expandedLoading, setExpandedLoading] = useState(false);
  const [expandedCareerPlan, setExpandedCareerPlan] = useState<Record<string, unknown> | null>(null);

  interface AuditLogEntry {
    id: number;
    admin_id: number;
    admin_nickname: string;
    action: string;
    target_type: string;
    target_id: number;
    details: string;
    created_at: string;
  }

  // 搜索防抖：300ms 延迟
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchUsers();
    return () => {
      // 组件卸载时取消进行中的请求
      abortControllerRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, roleFilter, statusFilter, directionFilter, debouncedSearch]);

  async function fetchUsers() {
    // 取消上一次请求
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setLoading(true);
      const res = await http.get('/admin/users', {
        params: {
          page, pageSize, role: roleFilter, status: statusFilter,
          keyword: debouncedSearch,
          developmentDirections: directionFilter !== 'all' ? directionFilter : '',
        },
        signal: controller.signal,
      });
      if (res.data?.code === 200 && res.data.data) {
        setUsers(res.data.data.list || res.data.data.users || []);
        setTotal(res.data.data.pagination?.total || res.data.data.total || 0);
      } else {
        setError('数据加载失败，请刷新重试');
      }
    } catch (err: unknown) {
      // 忽略取消请求（AbortController）
      if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'CanceledError') return;
      if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'ERR_CANCELED') return;
      // 401 由 http.ts 统一处理（弹 toast + 跳转登录），此处不重复设置 error
      if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 401) return;
      setError('数据加载失败，请刷新重试');
      if (import.meta.env.DEV) console.error('[DEV] API error:', err);
    } finally {
      setLoading(false);
    }
  }

  // 打开封禁确认弹窗（仅封禁需要确认，解封直接执行）
  function handleStatusAction(userId: number, currentStatus: number) {
    if (currentStatus === 1) {
      // 封禁操作需要确认
      setConfirmDialog({ open: true, userId, action: 'ban' });
      setActionMenu(null);
    } else {
      // 解封直接执行
      toggleUserStatus(userId, currentStatus);
    }
  }

  async function exportUsers() {
    try {
      setExporting(true);
      const res = await http.get('/admin/users/export', {
        params: { role: roleFilter, status: statusFilter, keyword: debouncedSearch },
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const disposition = res.headers?.['content-disposition'] as string | undefined;
      const matched = disposition?.match(/filename="?([^";]+)"?/i);
      link.href = url;
      link.download = matched?.[1] || `users_${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast({ type: 'success', title: '导出成功', message: '用户列表已开始下载' });
    } catch (err) {
      if (import.meta.env.DEV) console.error('[DEV] Export users error:', err);
      showToast({ type: 'error', title: '导出失败', message: '请稍后重试' });
    } finally {
      setExporting(false);
    }
  }

  async function openUserDetail(userId: number) {
    try {
      setDetailLoading(true);
      setDetailError(null);
      setDetailUser(null);
      setDetailUserId(userId);
      setActionMenu(null);
      const res = await http.get(`/admin/users/${userId}`);
      if (res.data?.code === 200 && res.data.data?.user) {
        setDetailUser({
          user: res.data.data.user as UserRecord,
          profile: (res.data.data.profile as Record<string, unknown> | null) || null,
          identityVerification: (res.data.data.identityVerification as Record<string, unknown> | null) || null,
          careerPlan: (res.data.data.careerPlan as Record<string, unknown> | null) || null,
        });
      } else {
        setDetailError('用户详情加载失败，请稍后重试');
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('[DEV] User detail error:', err);
      setDetailError('用户详情加载失败，请稍后重试');
    } finally {
      setDetailLoading(false);
    }
  }

  async function toggleUserStatus(userId: number, currentStatus: number) {
    const nextStatus = currentStatus === 1 ? 0 : 1;
    try {
      await http.put(`/admin/users/${userId}/status`, { status: nextStatus });
      setUsers(prev => prev.map(user => (
        user.id === userId ? { ...user, status: nextStatus } : user
      )));
      setDetailUser(prev => prev && prev.user.id === userId
        ? { ...prev, user: { ...prev.user, status: nextStatus } }
        : prev);
      showToast({
        type: 'success',
        title: nextStatus === 1 ? '已启用用户' : '已禁用用户',
      });
    } catch (err) {
      if (import.meta.env.DEV) console.error('[DEV] Toggle user status error:', err);
      showToast({
        type: 'error',
        title: '操作失败',
        message: '请稍后重试',
      });
    } finally {
      setConfirmDialog({ open: false, userId: null, action: '' });
      setActionMenu(null);
    }
  }

  async function fetchAuditLogs() {
    setAuditLogLoading(true);
    setAuditLogError(null);
    try {
      const res = await http.get('/admin/audit-logs', {
        params: { target_type: 'user', pageSize: 40 },
      });
      if (res.data?.code === 200) {
        setAuditLogs(res.data.data?.list || []);
      } else {
        setAuditLogs([]);
      }
    } catch {
      setAuditLogError('加载审计日志失败');
      setAuditLogs([]);
    } finally {
      setAuditLogLoading(false);
    }
  }

  function parseAuditLogDetails(details: string): Record<string, unknown> {
    try {
      return JSON.parse(details);
    } catch {
      return {};
    }
  }

  const AUDIT_ACTION_LABELS: Record<string, { label: string; color: string }> = {
    disable_user: { label: '禁用用户', color: 'text-red-600 bg-red-50' },
    enable_user: { label: '启用用户', color: 'text-green-600 bg-green-50' },
    role_change: { label: '变更角色', color: 'text-blue-600 bg-blue-50' },
    delete_user: { label: '删除用户', color: 'text-orange-600 bg-orange-50' },
  };

  async function changeUserRole() {
    const { userId } = roleChangeDialog;
    if (!userId) return;
    setRoleSaving(true);
    try {
      await http.put(`/admin/users/${userId}/role`, { role: selectedRole });
      setUsers(prev => prev.map(user => (
        user.id === userId ? { ...user, role: selectedRole as UserRecord['role'] } : user
      )));
      setDetailUser(prev => prev && prev.user.id === userId
        ? { ...prev, user: { ...prev.user, role: selectedRole as UserRecord['role'] } }
        : prev);
      showToast({ type: 'success', title: `角色已变更为「${ROLE_MAP[selectedRole]?.label || selectedRole}」` });
      setRoleChangeDialog({ open: false, userId: null, currentRole: '', nickname: '' });
    } catch (err) {
      if (import.meta.env.DEV) console.error('[DEV] Change role error:', err);
      showToast({ type: 'error', title: '角色变更失败', message: '请稍后重试' });
    } finally {
      setRoleSaving(false);
      setActionMenu(null);
    }
  }

  async function toggleUserActive(userId: number, currentStatus: number) {
    const nextStatus = currentStatus === 1 ? 0 : 1;
    try {
      await http.put(`/admin/users/${userId}`, { is_active: nextStatus });
      setUsers(prev => prev.map(user => (
        user.id === userId ? { ...user, status: nextStatus } : user
      )));
      showToast({
        type: 'success',
        title: nextStatus === 1 ? '已启用用户' : '已禁用用户',
      });
    } catch (err) {
      if (import.meta.env.DEV) console.error('[DEV] Toggle user active error:', err);
      showToast({
        type: 'error',
        title: '操作失败',
        message: '请稍后重试',
      });
    }
  }

  async function toggleExpandRow(userId: number) {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      setExpandedCareerPlan(null);
      return;
    }
    setExpandedUserId(userId);
    setExpandedLoading(true);
    setExpandedCareerPlan(null);
    try {
      const res = await http.get(`/admin/users/${userId}/career-plan`);
      if (res.data?.code === 200) {
        setExpandedCareerPlan((res.data.data as Record<string, unknown>) || null);
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('[DEV] Career plan fetch error:', err);
    } finally {
      setExpandedLoading(false);
    }
  }

  function formatProfileValue(value: unknown) {
    if (Array.isArray(value)) {
      return value.length > 0 ? value.map(item => String(item)).join('、') : '-';
    }
    if (typeof value === 'boolean') return value ? '是' : '否';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return '-';
      if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
        try {
          return formatProfileValue(JSON.parse(trimmed));
        } catch {
          return trimmed;
        }
      }
      return trimmed;
    }
    if (value && typeof value === 'object') {
      return JSON.stringify(value);
    }
    return '-';
  }

  function getProfileEntries(profile: Record<string, unknown> | null) {
    if (!profile) return [] as Array<{ key: string; label: string; value: string }>;

    const PROFILE_LABELS: Record<string, string> = {
      real_name: '真实姓名',
      gender: '性别',
      school: '学校',
      major: '专业',
      grade: '年级',
      graduation_year: '毕业年份',
      target_position: '目标岗位',
      job_intention: '求职意向',
      bio: '个人简介',
      self_intro: '自我介绍',
      skills: '技能标签',
      interests: '兴趣方向',
      industries: '意向行业',
      career_goals: '职业目标',
      dimensions: '画像维度',
      resume_url: '简历链接',
      company_name: '企业名称',
      industry: '所属行业',
      scale: '企业规模',
      website: '官网',
      address: '地址',
      description: '企业简介',
      contact_person: '联系人',
      contact_phone: '联系电话',
      audit_status: '审核状态',
      verify_status: '认证状态',
      title: '身份标签',
      expertise: '擅长领域',
      rating: '评分',
      price: '辅导价格',
      hourly_rate: '课时价格',
      available_time: '可服务时间',
      experience_years: '从业年限',
      company: '所属机构',
    };

    return Object.entries(profile)
      .filter(([, value]) => value !== null && value !== undefined && value !== '')
      .filter(([key]) => !['id', 'user_id', 'created_at', 'updated_at', 'avatar', 'logo', 'cover_image'].includes(key))
      .map(([key, value]) => ({
        key,
        label: PROFILE_LABELS[key] || key,
        value: formatProfileValue(value),
      }));
  }

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // 排序后的用户列表
  const sortedUsers = useMemo(() => {
    if (!sortField) return users;
    return [...users].sort((a, b) => {
      let aVal = a[sortField as keyof UserRecord];
      let bVal = b[sortField as keyof UserRecord];
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [users, sortField, sortOrder]);

  // 排序图标
  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />;
    return sortOrder === 'asc'
      ? <ArrowUp className="w-3.5 h-3.5 text-primary-600" />
      : <ArrowDown className="w-3.5 h-3.5 text-primary-600" />;
  };

  // 批量选择
  const toggleSelectUser = (userId: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      return next;
    });
  };

  const selectedUsers = sortedUsers.filter(user => selectedIds.has(user.id));
  const batchBanTargets = selectedUsers.filter(user => user.role !== 'admin' && user.status === 1);

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedUsers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedUsers.map(u => u.id)));
    }
  };

  // 批量禁用
  const handleBatchBan = async () => {
    if (batchBanTargets.length === 0) {
      showToast({ type: 'error', title: '没有可禁用的用户' });
      setBatchAction({ open: false, action: '' });
      return;
    }

    try {
      setBatchLoading(true);
      const results = await Promise.allSettled(
        batchBanTargets.map(user => http.put(`/admin/users/${user.id}/status`, { status: 0 }))
      );

      const successCount = results.filter(result => result.status === 'fulfilled').length;
      const failedCount = results.length - successCount;

      if (successCount > 0) {
        const successIds = new Set(
          batchBanTargets
            .filter((_, index) => results[index].status === 'fulfilled')
            .map(user => user.id)
        );

        setUsers(prev => prev.map(user => (
          successIds.has(user.id) ? { ...user, status: 0 } : user
        )));
      }

      setSelectedIds(prev => {
        const next = new Set(prev);
        batchBanTargets.forEach(user => next.delete(user.id));
        return next;
      });
      setBatchAction({ open: false, action: '' });

      if (failedCount === 0) {
        showToast({ type: 'success', title: `已批量禁用 ${successCount} 个用户` });
      } else if (successCount === 0) {
        showToast({ type: 'error', title: '批量操作失败，请重试' });
      } else {
        showToast({ type: 'warning', title: `已禁用 ${successCount} 个用户`, message: `${failedCount} 个用户处理失败` });
      }
    } catch {
      showToast({ type: 'error', title: '批量操作失败，请重试' });
    } finally {
      setBatchLoading(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  if (loading) return <div className="space-y-6"><TableSkeleton rows={8} cols={6} /></div>;
  if (error) return (
    <div className="space-y-6">
      <ErrorState
        message={error}
        onRetry={() => { setError(null); fetchUsers(); }}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
          <p className="text-gray-500 mt-1">管理平台所有用户账号，支持角色筛选和状态管控</p>
        </div>
        <button
          onClick={exportUsers}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          导出用户
        </button>
      </div>

      {/* 搜索和筛选 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-wrap items-center gap-4">
          {/* 搜索框 */}
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索姓名、邮箱、手机号..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>

          {/* 角色筛选 */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={roleFilter}
              onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
              className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value="all">全部角色</option>
              <option value="student">学生</option>
              <option value="company">企业</option>
              <option value="mentor">咨询人员</option>
              <option value="admin">管理员</option>
            </select>
          </div>

          {/* 状态筛选 */}
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          >
            <option value="all">全部状态</option>
            <option value="1">正常</option>
            <option value="0">已禁用</option>
          </select>

          {/* 发展方向筛选 */}
          <select
            value={directionFilter}
            onChange={e => { setDirectionFilter(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          >
            <option value="all">全部发展方向</option>
            {DEVELOPMENT_DIRECTIONS.map(d => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 用户列表 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* 批量操作工具栏 */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between px-6 py-3 bg-primary-50 border-b border-primary-100">
            <span className="text-sm text-primary-700 font-medium">
              已选择 {selectedIds.size} 个用户{batchBanTargets.length !== selectedIds.size ? `，其中 ${batchBanTargets.length} 个可批量禁用` : ''}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBatchAction({ open: true, action: 'ban' })}
                disabled={batchBanTargets.length === 0}
                className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Ban className="w-4 h-4" />
                批量禁用
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消选择
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3.5 w-12">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === sortedUsers.length && sortedUsers.length > 0}
                    ref={element => {
                      if (element) {
                        element.indeterminate = selectedIds.size > 0 && selectedIds.size < sortedUsers.length;
                      }
                    }}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                  />
                </th>
                <th
                  className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
                  onClick={() => handleSort('nickname')}
                >
                  <div className="flex items-center gap-1">
                    用户 <SortIcon field="nickname" />
                  </div>
                </th>
                <th
                  className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
                  onClick={() => handleSort('role')}
                >
                  <div className="flex items-center gap-1">
                    角色 <SortIcon field="role" />
                  </div>
                </th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase tracking-wider">手机号</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase tracking-wider">实名状态</th>
                <th
                  className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-1">
                    状态 <SortIcon field="status" />
                  </div>
                </th>
                <th
                  className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center gap-1">
                    注册时间 <SortIcon field="created_at" />
                  </div>
                </th>
                <th className="text-center px-6 py-3.5 text-xs font-medium text-gray-500 uppercase tracking-wider">启用</th>
                <th className="text-right px-6 py-3.5 text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedUsers.map((user, i) => (
                <React.Fragment key={user.id}>
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className={`hover:bg-gray-50 transition-colors cursor-pointer ${selectedIds.has(user.id) ? 'bg-primary-50/50' : ''} ${expandedUserId === user.id ? 'bg-blue-50/50' : ''}`}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('button, input, select')) return;
                    toggleExpandRow(user.id);
                  }}
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(user.id)}
                      onChange={() => toggleSelectUser(user.id)}
                      className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                      onClick={e => e.stopPropagation()}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-sm">
                        {user.nickname.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{user.nickname}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Tag variant={ROLE_MAP[user.role]?.tagVariant || 'gray'} size="md">
                      {ROLE_MAP[user.role]?.label || user.role}
                    </Tag>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{user.phone || '-'}</td>
                  <td className="px-6 py-4">
                    {user.realNameStatus === 'approved' ? (
                      <Tag variant="green" size="md">已认证</Tag>
                    ) : (
                      <Tag variant="gray" size="md">未认证</Tag>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                      user.status === 1 ? 'text-green-600' : 'text-red-500'
                    }`}>
                      {user.status === 1 ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {user.status === 1 ? '正常' : '已禁用'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (user.role === 'admin') {
                          showToast({ type: 'warning', title: '不能禁用管理员账号' });
                          return;
                        }
                        toggleUserActive(user.id, user.status);
                      }}
                      disabled={user.role === 'admin'}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 ${
                        user.role === 'admin' ? 'opacity-50 cursor-not-allowed' : ''
                      } ${user.status === 1 ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                        user.status === 1 ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right relative">
                    <button
                      onClick={() => setActionMenu(actionMenu === user.id ? null : user.id)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </button>
                    {actionMenu === user.id && (
                      <div className="absolute right-6 top-12 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                        <button
                          onClick={() => openUserDetail(user.id)}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Shield className="w-4 h-4" />
                          查看详情
                        </button>
                        {user.role !== 'admin' && (
                          <button
                            onClick={() => handleStatusAction(user.id, user.status)}
                            className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
                              user.status === 1 ? 'text-red-600' : 'text-green-600'
                            }`}
                          >
                            {user.status === 1 ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                            {user.status === 1 ? '禁用账号' : '解除禁用'}
                          </button>
                        )}
                        {user.role !== 'admin' && (
                          <button
                            onClick={() => {
                              setRoleChangeDialog({ open: true, userId: user.id, currentRole: user.role, nickname: user.nickname });
                              setSelectedRole(user.role);
                              setActionMenu(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <UserCog className="w-4 h-4" />
                            变更角色
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </motion.tr>
                {expandedUserId === user.id && (
                  <tr key={`expanded-${user.id}`} className="bg-blue-50/30">
                    <td colSpan={9} className="px-6 py-4">
                      {expandedLoading ? (
                        <div className="flex items-center justify-center py-4 text-gray-500 gap-2 text-sm">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          加载职业规划数据...
                        </div>
                      ) : expandedCareerPlan && user.role === 'student' ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500 mb-1">发展方向</p>
                            <div className="flex flex-wrap gap-1">
                              {user.developmentDirections && user.developmentDirections.length > 0
                                ? user.developmentDirections.map((d) => (
                                    <Tag key={d} variant="blue" size="sm">{d}</Tag>
                                  ))
                                : <span className="text-gray-400">-</span>
                              }
                            </div>
                          </div>
                          <div>
                            <p className="text-gray-500 mb-1">学校</p>
                            <p className="font-medium text-gray-900">{user.school || (expandedCareerPlan.school as string) || '-'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 mb-1">专业</p>
                            <p className="font-medium text-gray-900">{user.major || '-'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 mb-1">毕业年份</p>
                            <p className="font-medium text-gray-900">{user.grade || user.graduation_year || (expandedCareerPlan.graduation_year as string) || '-'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 mb-1">毕业去向</p>
                            <p className="font-medium text-gray-900">
                              {[user.target_industry, user.target_position].filter(Boolean).join(' / ') || (expandedCareerPlan.target_industry as string) || '-'}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 py-2">
                          {user.role !== 'student' ? '非学生用户，暂不显示职业规划数据' : '暂未填写职业规划'}
                        </p>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            共 <span className="font-medium text-gray-900">{total}</span> 条记录
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600">第 {page} / {totalPages || 1} 页</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 封禁确认弹窗 */}
      <ConfirmDialog
        open={confirmDialog.open}
        title="确定要封禁该用户吗？"
        description="封禁后该用户将无法登录平台，所有进行中的操作将被中断。"
        variant="danger"
        confirmText="确认封禁"
        onConfirm={() => {
          if (confirmDialog.userId !== null) {
            toggleUserStatus(confirmDialog.userId, 1);
          }
        }}
        onCancel={() => setConfirmDialog({ open: false, userId: null, action: '' })}
      />

      {/* 批量操作确认弹窗 */}
      <ConfirmDialog
        open={batchAction.open}
        title={`确定要批量禁用 ${batchBanTargets.length} 个用户吗？`}
        description={batchBanTargets.length === 0 ? '当前所选用户中没有可禁用账号。' : '禁用后这些用户将无法登录平台，此操作不可逆。'}
        variant="danger"
        confirmText={batchBanTargets.length === 0 ? '知道了' : `确认禁用 ${batchBanTargets.length} 个用户`}
        loading={batchLoading}
        onConfirm={handleBatchBan}
        onCancel={() => setBatchAction({ open: false, action: '' })}
      />

      {/* 用户详情弹窗 */}
      {(detailLoading || detailUser || detailError) && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">用户详情</h3>
              <button onClick={() => { setDetailUser(null); setDetailUserId(null); setDetailError(null); }} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              {detailLoading ? (
                <div className="flex items-center justify-center py-16 text-gray-500 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  加载中...
                </div>
              ) : detailError ? (
                <ErrorState
                  message={detailError}
                  onRetry={() => {
                    if (detailUserId) {
                      openUserDetail(detailUserId);
                    } else {
                      setDetailError(null);
                      setDetailUser(null);
                    }
                  }}
                />
              ) : detailUser ? (
                <>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-primary-100 text-primary-700 font-bold rounded-full flex items-center justify-center text-2xl">
                      {detailUser.user.nickname?.charAt(0) || detailUser.user.email.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-gray-900">{detailUser.user.nickname || '未设置昵称'}</h4>
                      <p className="text-sm text-gray-500">{detailUser.user.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Tag variant={ROLE_MAP[detailUser.user.role]?.tagVariant || 'gray'} size="sm">
                          {ROLE_MAP[detailUser.user.role]?.label || detailUser.user.role}
                        </Tag>
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                          detailUser.user.status === 1 ? 'text-green-600' : 'text-red-500'
                        }`}>
                          {detailUser.user.status === 1 ? '正常' : '已禁用'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 mb-1">ID</p>
                      <p className="font-medium text-gray-900">{detailUser.user.id}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">手机号</p>
                      <p className="font-medium text-gray-900">{detailUser.user.phone || '-'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-500 mb-1">注册时间</p>
                      <p className="font-medium text-gray-900">{new Date(detailUser.user.created_at).toLocaleString()}</p>
                    </div>
                  </div>

                  {/* 学生用户：完整注册信息 */}
                  {detailUser.user.role === 'student' && (
                    <div className="pt-4 border-t border-gray-100">
                      <h5 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-1">
                        <Shield className="w-4 h-4 text-blue-500" />
                        学生注册信息
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500 mb-1">姓名</p>
                          <p className="font-medium text-gray-900">{(detailUser.profile as Record<string, unknown>)?.real_name as string || detailUser.user.nickname || '-'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-1">邮箱</p>
                          <p className="font-medium text-gray-900">{detailUser.user.email || '-'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-1">手机号</p>
                          <p className="font-medium text-gray-900">{detailUser.user.phone || '-'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-1">学校</p>
                          <p className="font-medium text-gray-900">{(detailUser.profile as Record<string, unknown>)?.school as string || detailUser.user.school || '-'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-1">专业</p>
                          <p className="font-medium text-gray-900">{(detailUser.profile as Record<string, unknown>)?.major as string || detailUser.user.major || '-'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-1">年级</p>
                          <p className="font-medium text-gray-900">{(detailUser.profile as Record<string, unknown>)?.grade as string || detailUser.user.grade || '-'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-1">技能</p>
                          <p className="font-medium text-gray-900">{formatProfileValue((detailUser.profile as Record<string, unknown>)?.skills ?? detailUser.user.skills)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-1">求职意向</p>
                          <p className="font-medium text-gray-900">{(detailUser.profile as Record<string, unknown>)?.job_intention as string || detailUser.user.job_intention || '-'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 学生用户：职业规划数据 */}
                  {detailUser.user.role === 'student' && (
                    <div className="pt-4 border-t border-gray-100">
                      <h5 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-1">
                        <Shield className="w-4 h-4 text-green-500" />
                        职业规划数据
                      </h5>
                      {detailUser.careerPlan ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500 mb-1">发展方向</p>
                            <div className="flex flex-wrap gap-1">
                              {(formatProfileValue(detailUser.careerPlan.development_directions) !== '-'
                                ? (Array.isArray(detailUser.careerPlan.development_directions)
                                  ? detailUser.careerPlan.development_directions as string[]
                                  : String(detailUser.careerPlan.development_directions).split(','))
                                : []).length > 0
                                ? (Array.isArray(detailUser.careerPlan.development_directions)
                                  ? detailUser.careerPlan.development_directions as string[]
                                  : String(detailUser.careerPlan.development_directions).split(',')
                                ).map((d: string) => (
                                  <Tag key={d} variant="blue" size="sm">{d}</Tag>
                                ))
                                : <span className="text-gray-400">-</span>
                              }
                            </div>
                          </div>
                          <div>
                            <p className="text-gray-500 mb-1">毕业年份</p>
                            <p className="font-medium text-gray-900">{detailUser.careerPlan.graduation_year as string || detailUser.user.graduation_year || '-'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 mb-1">目标城市</p>
                            <p className="font-medium text-gray-900">{detailUser.careerPlan.target_city as string || detailUser.user.target_city || '-'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 mb-1">目标行业</p>
                            <p className="font-medium text-gray-900">{detailUser.careerPlan.target_industry as string || detailUser.user.target_industry || '-'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 mb-1">目标岗位</p>
                            <p className="font-medium text-gray-900">{detailUser.careerPlan.target_position as string || detailUser.user.target_position || '-'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 mb-1">规划状态</p>
                            <Tag variant={detailUser.careerPlan.status === 'completed' ? 'green' : 'yellow'} size="sm">
                              {detailUser.careerPlan.status === 'completed' ? '已完成' : '待完成'}
                            </Tag>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">暂未填写职业规划</p>
                      )}
                    </div>
                  )}

                  {/* 关联资料（非学生用户或学生用户的补充信息） */}
                  <div className="pt-4 border-t border-gray-100">
                    <h5 className="text-sm font-bold text-gray-900 mb-3">关联资料</h5>
                    {getProfileEntries(detailUser.profile).length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        {getProfileEntries(detailUser.profile).map(item => (
                          <div key={item.key}>
                            <p className="text-gray-500 mb-1">{item.label}</p>
                            <p className="font-medium text-gray-900 break-all">{item.value}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">暂无关联资料</p>
                    )}
                  </div>
                </>
              ) : null}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button onClick={() => { setDetailUser(null); setDetailUserId(null); setDetailError(null); }} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">关闭</button>
            </div>
          </div>
        </div>
      )}

      {/* 角色变更弹窗 */}
      {roleChangeDialog.open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4" onClick={() => setRoleChangeDialog({ open: false, userId: null, currentRole: '', nickname: '' })}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">变更用户角色</h3>
              <button onClick={() => setRoleChangeDialog({ open: false, userId: null, currentRole: '', nickname: '' })} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                用户 <span className="font-medium text-gray-900">{roleChangeDialog.nickname}</span>，
                当前角色：
                <Tag variant={ROLE_MAP[roleChangeDialog.currentRole]?.tagVariant || 'gray'} size="sm" className="ml-1">
                  {ROLE_MAP[roleChangeDialog.currentRole]?.label || roleChangeDialog.currentRole}
                </Tag>
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">变更为</label>
                <select
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="student">学生</option>
                  <option value="company">企业</option>
                  <option value="mentor">咨询人员</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setRoleChangeDialog({ open: false, userId: null, currentRole: '', nickname: '' })} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm">取消</button>
              <button
                onClick={changeUserRole}
                disabled={roleSaving || selectedRole === roleChangeDialog.currentRole}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 transition-colors text-sm font-medium flex items-center gap-1"
              >
                {roleSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCog className="w-4 h-4" />}
                确认变更
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 审计日志面板 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary-500" />
            管理操作日志
          </h3>
          <button
            onClick={() => {
              setShowAuditLog(!showAuditLog);
              if (!showAuditLog) fetchAuditLogs();
            }}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
          >
            {showAuditLog ? '收起' : '展开'}
          </button>
        </div>

        {showAuditLog && (
          <div className="px-6 py-4">
            {auditLogLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
              </div>
            ) : auditLogError ? (
              <ErrorState message={auditLogError} onRetry={fetchAuditLogs} />
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                <Shield className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                暂无操作日志
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {auditLogs.map((log) => {
                  const details = parseAuditLogDetails(log.details);
                  const actionInfo = AUDIT_ACTION_LABELS[log.action] || { label: log.action, color: 'text-gray-600 bg-gray-50' };
                  return (
                    <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-gray-700 shrink-0">{log.admin_nickname || `#${log.admin_id}`}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${actionInfo.color}`}>
                          {actionInfo.label}
                        </span>
                        <span className="text-gray-600 truncate">
                          {details.target_nickname ? details.target_nickname as string : `用户 #${log.target_id}`}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0 ml-3">
                        {new Date(log.created_at).toLocaleString('zh-CN')}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
