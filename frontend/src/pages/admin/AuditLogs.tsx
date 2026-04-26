import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Filter, ChevronLeft, ChevronRight,
  User, Building2, ShieldCheck, FileText,
  RefreshCw, Download, Clock, AlertCircle
} from 'lucide-react';
import http from '@/api/http';
import { CardSkeleton } from '@/components/ui/Skeleton';

interface AuditLog {
  id: number;
  operator_id: number;
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

interface AuditLogResponse {
  list: AuditLog[];
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
  };
  // 兼容旧格式
  total?: number;
  page?: number;
  pageSize?: number;
}

// 操作类型颜色映射
const ACTION_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  create: { bg: 'bg-green-100', text: 'text-green-700', label: '创建' },
  update: { bg: 'bg-blue-100', text: 'text-blue-700', label: '更新' },
  delete: { bg: 'bg-red-100', text: 'text-red-700', label: '删除' },
  login: { bg: 'bg-amber-100', text: 'text-amber-700', label: '登录' },
  logout: { bg: 'bg-gray-100', text: 'text-gray-700', label: '登出' },
  verify: { bg: 'bg-primary-100', text: 'text-primary-700', label: '审核' },
  status: { bg: 'bg-purple-100', text: 'text-purple-700', label: '状态变更' },
};

// 目标类型图标映射
const TARGET_ICONS: Record<string, typeof User> = {
  user: User,
  company: Building2,
  mentor: ShieldCheck,
  job: FileText,
  course: FileText,
  article: FileText,
};

const ROLE_LABELS: Record<string, string> = {
  admin: '管理员',
  company: '企业',
  mentor: '导师',
  student: '学生',
};

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [targetFilter, setTargetFilter] = useState('');
  const [keyword, setKeyword] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number> = { page, pageSize };
      if (actionFilter) params.action = actionFilter;
      if (targetFilter) params.target_type = targetFilter;

      const res = await http.get('/admin/audit-logs', { params });
      if (res.data?.code === 200) {
        const data: AuditLogResponse = res.data.data;
        // 客户端关键词过滤（操作人名称）
        let filtered = data.list;
        if (keyword) {
          const kw = keyword.toLowerCase();
          filtered = filtered.filter(
            log => log.operator_name?.toLowerCase().includes(kw) ||
                   log.action?.toLowerCase().includes(kw) ||
                   log.target_type?.toLowerCase().includes(kw)
          );
        }
        setLogs(filtered);
        setTotal(data.pagination?.total ?? data.total ?? 0);
      } else {
        setError('获取审计日志失败');
      }
    } catch (err) {
      console.error('获取审计日志失败:', err);
      setError('获取审计日志失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, actionFilter, targetFilter, keyword]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">审计日志</h1>
          <p className="text-sm text-gray-500 mt-1">查看平台所有操作记录，共 {total} 条</p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          刷新
        </button>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索操作人、操作类型..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">全部操作</option>
            <option value="create">创建</option>
            <option value="update">更新</option>
            <option value="delete">删除</option>
            <option value="login">登录</option>
            <option value="verify">审核</option>
          </select>
          <select
            value={targetFilter}
            onChange={(e) => { setTargetFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">全部类型</option>
            <option value="user">用户</option>
            <option value="company">企业</option>
            <option value="mentor">导师</option>
            <option value="job">职位</option>
            <option value="course">课程</option>
            <option value="article">文章</option>
          </select>
        </div>
      </div>

      {/* 日志列表 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
            <p className="text-gray-500">{error}</p>
            <button onClick={fetchLogs} className="mt-4 text-primary-600 hover:underline text-sm">
              重试
            </button>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500">暂无审计日志</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {logs.map((log) => {
              const actionStyle = ACTION_COLORS[log.action] || ACTION_COLORS.update;
              const TargetIcon = TARGET_ICONS[log.target_type] || FileText;
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="px-6 py-4 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* 操作类型标签 */}
                    <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${actionStyle.bg} ${actionStyle.text} shrink-0`}>
                      {actionStyle.label}
                    </div>

                    {/* 日志内容 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 text-sm">{log.operator_name || '未知用户'}</span>
                        <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                          {ROLE_LABELS[log.operator_role] || log.operator_role}
                        </span>
                        <span className="text-gray-400 text-sm">{actionStyle.label}</span>
                        <span className="flex items-center gap-1 text-gray-600 text-sm">
                          <TargetIcon className="w-3.5 h-3.5" />
                          {log.target_type}
                          {log.target_id && <span className="text-gray-400">#{log.target_id}</span>}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(log.created_at)}
                        </span>
                        {log.ip_address && (
                          <span>IP: {log.ip_address}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              第 {page} / {totalPages} 页，共 {total} 条
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                const pageNum = start + i;
                if (pageNum > totalPages) return null;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                      page === pageNum
                        ? 'bg-primary-500 text-white'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
