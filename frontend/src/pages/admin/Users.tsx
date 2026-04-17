import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Filter, MoreVertical,
  Shield, Ban, CheckCircle, XCircle,
  ChevronLeft, ChevronRight, Download,
  ArrowUpDown, ArrowUp, ArrowDown, Trash2
} from 'lucide-react';
import http from '@/api/http';
import { TableSkeleton } from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
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
}

const ROLE_MAP: Record<string, { label: string; color: string; tagVariant: 'blue' | 'green' | 'purple' | 'red' }> = {
  student: { label: '学生', color: 'bg-blue-100 text-blue-700', tagVariant: 'blue' },
  company: { label: '企业', color: 'bg-emerald-100 text-emerald-700', tagVariant: 'green' },
  mentor: { label: '导师', color: 'bg-purple-100 text-purple-700', tagVariant: 'purple' },
  admin: { label: '管理员', color: 'bg-red-100 text-red-700', tagVariant: 'red' },
};

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;
  const [actionMenu, setActionMenu] = useState<number | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; userId: number | null; action: string }>({ open: false, userId: null, action: '' });

  // 排序状态
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // 批量操作状态
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchAction, setBatchAction] = useState<{ open: boolean; action: string }>({ open: false, action: '' });

  // 模拟数据
  const mockUsers: UserRecord[] = [
    { id: 1, email: 'admin@qihang.com', nickname: '超级管理员', role: 'admin', avatar: '', phone: '138****8888', status: 1, created_at: '2026-01-01 00:00:00' },
    { id: 2, email: 'student@example.com', nickname: '张同学', role: 'student', avatar: '', phone: '139****1234', status: 1, created_at: '2026-03-15 10:30:00' },
    { id: 3, email: 'hr@bytedance.com', nickname: '字节跳动HR', role: 'company', avatar: '', phone: '136****5678', status: 1, created_at: '2026-03-10 14:20:00' },
    { id: 4, email: 'hr@tencent.com', nickname: '腾讯HR', role: 'company', avatar: '', phone: '137****9012', status: 1, created_at: '2026-03-08 09:15:00' },
    { id: 5, email: 'chen@mentor.com', nickname: '陈经理', role: 'mentor', avatar: '', phone: '135****3456', status: 1, created_at: '2026-03-05 16:45:00' },
    { id: 6, email: 'wang@student.com', nickname: '王小明', role: 'student', avatar: '', phone: '133****7890', status: 1, created_at: '2026-03-20 11:00:00' },
    { id: 7, email: 'li@student.com', nickname: '李小红', role: 'student', avatar: '', phone: '131****2345', status: 0, created_at: '2026-03-18 08:30:00' },
    { id: 8, email: 'hr@baidu.com', nickname: '百度HR', role: 'company', avatar: '', phone: '130****6789', status: 1, created_at: '2026-03-12 13:10:00' },
    { id: 9, email: 'zhang@mentor.com', nickname: '张工', role: 'mentor', avatar: '', phone: '132****0123', status: 1, created_at: '2026-03-06 15:30:00' },
    { id: 10, email: 'spam_user@test.com', nickname: 'spam_user123', role: 'student', avatar: '', phone: '', status: 0, created_at: '2026-04-01 02:00:00' },
  ];

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
  }, [page, roleFilter, statusFilter, debouncedSearch]);

  async function fetchUsers() {
    // 取消上一次请求
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setLoading(true);
      const res = await http.get('/admin/users', {
        params: { page, pageSize, role: roleFilter, status: statusFilter, keyword: debouncedSearch },
        signal: controller.signal,
      });
      if (res.data?.code === 200 && res.data.data) {
        setUsers(res.data.data.list || res.data.data.users || []);
        setTotal(res.data.data.pagination?.total || res.data.data.total || 0);
      } else {
        setError('数据加载失败，请刷新重试');
      }
    } catch (err: unknown) {
      // 忽略因取消请求导致的错误
      if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'CanceledError') return;
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

  async function toggleUserStatus(userId: number, currentStatus: number) {
    try {
      await http.put(`/admin/users/${userId}/status`, { status: currentStatus === 1 ? 0 : 1 });
      showToast({ type: 'success', title: currentStatus === 1 ? '用户已禁用' : '用户已启用' });
      fetchUsers();
    } catch {
      // 模拟切换
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: currentStatus === 1 ? 0 : 1 } : u));
      showToast({ type: 'success', title: currentStatus === 1 ? '用户已禁用' : '用户已启用' });
    }
    setActionMenu(null);
    setConfirmDialog({ open: false, userId: null, action: '' });
  }

  // 排序处理
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
      ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
      : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />;
  };

  // 批量选择
  const toggleSelectUser = (userId: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedUsers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedUsers.map(u => u.id)));
    }
  };

  // 批量禁用
  const handleBatchBan = async () => {
    try {
      await Promise.all(Array.from(selectedIds).map(id =>
        http.put(`/admin/users/${id}/status`, { status: 0 }).catch(() => {})
      ));
      showToast({ type: 'success', title: `已批量禁用 ${selectedIds.size} 个用户` });
      setSelectedIds(new Set());
      setBatchAction({ open: false, action: '' });
      fetchUsers();
    } catch {
      showToast({ type: 'error', title: '批量操作失败，请重试' });
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  if (loading) return <div className="space-y-6"><TableSkeleton rows={8} cols={6} /></div>;
  if (error) return (
    <div className="space-y-6">
      <ErrorState
        message={error}
        onRetry={() => { setError(null); fetchUsers(); }}
        onLoadMockData={() => { setUsers(mockUsers); setTotal(mockUsers.length); setError(null); }}
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
          onClick={() => showToast({ type: 'info', title: '功能开发中', message: '该功能正在开发中，敬请期待' })}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
        >
          <Download className="w-4 h-4" />
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
              placeholder="搜索用户名、邮箱..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>

          {/* 角色筛选 */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={roleFilter}
              onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
              className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="all">全部角色</option>
              <option value="student">学生</option>
              <option value="company">企业</option>
              <option value="mentor">导师</option>
              <option value="admin">管理员</option>
            </select>
          </div>

          {/* 状态筛选 */}
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="all">全部状态</option>
            <option value="1">正常</option>
            <option value="0">已禁用</option>
          </select>
        </div>
      </div>

      {/* 用户列表 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* 批量操作工具栏 */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between px-6 py-3 bg-indigo-50 border-b border-indigo-100">
            <span className="text-sm text-indigo-700 font-medium">
              已选择 {selectedIds.size} 个用户
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBatchAction({ open: true, action: 'ban' })}
                className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1"
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
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
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
                <th className="text-right px-6 py-3.5 text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedUsers.map((user, i) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className={`hover:bg-gray-50 transition-colors ${selectedIds.has(user.id) ? 'bg-indigo-50/50' : ''}`}
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(user.id)}
                      onChange={() => toggleSelectUser(user.id)}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                      onClick={e => e.stopPropagation()}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
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
                          onClick={() => { showToast({ type: 'info', title: '功能开发中', message: '该功能正在开发中，敬请期待' }); setActionMenu(null); }}
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
                      </div>
                    )}
                  </td>
                </motion.tr>
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
        title={`确定要批量禁用 ${selectedIds.size} 个用户吗？`}
        description="禁用后这些用户将无法登录平台，此操作不可逆。"
        variant="danger"
        confirmText={`确认禁用 ${selectedIds.size} 个用户`}
        onConfirm={handleBatchBan}
        onCancel={() => setBatchAction({ open: false, action: '' })}
      />
    </div>
  );
}
