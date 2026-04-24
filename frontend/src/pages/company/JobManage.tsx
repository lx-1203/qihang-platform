import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus, Search, Filter, MoreVertical, Edit3,
  Trash2, Eye, EyeOff, MapPin, Briefcase,
  ChevronLeft, ChevronRight,
  Clock, FileText
} from 'lucide-react';
import axios from 'axios';
import http from '@/api/http';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { TableSkeleton } from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import Tag from '@/components/ui/Tag';
import { showToast } from '@/components/ui/ToastContainer';

// ====== 企业端职位管理 ======
// 商业级要求：CRUD 操作、状态切换、模态表单、搜索筛选

interface JobRecord {
  id: number;
  title: string;
  location: string;
  salary: string;
  type: '全职' | '实习' | '兼职';
  status: 'active' | 'inactive';
  view_count: number;
  applications: number;
  description: string;
  requirements: string;
  created_at: string;
}

const JOB_TYPE_TAG_VARIANT: Record<string, 'blue' | 'green' | 'primary'> = {
  '全职': 'blue',
  '实习': 'green',
  '兼职': 'primary',
};

export default function CompanyJobManage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;
  const [actionMenu, setActionMenu] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{id: number; name: string} | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // 上下架确认弹窗
  const [toggleTarget, setToggleTarget] = useState<{ id: number; currentStatus: 'active' | 'inactive' } | null>(null);
  const [toggleLoading, setToggleLoading] = useState(false);

  // 搜索防抖 + AbortController
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, typeFilter, statusFilter]);

  // 搜索防抖 + AbortController
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      fetchJobs();
    }, 300);
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  async function fetchJobs() {
    // 取消上一次请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setLoading(true);
      setError(null);
      const res = await http.get('/company/jobs', {
        params: { page, pageSize, type: typeFilter, status: statusFilter, keyword: search },
        signal: controller.signal,
      });
      if (res.data?.code === 200 && res.data.data) {
        const list = Array.isArray(res.data.data.list) ? res.data.data.list : [];
        setJobs(list.filter((job: Record<string, unknown>) => !job.deleted_at));
        setTotal(Number(res.data.data.total || 0));
      } else {
        setError('获取职位数据失败，服务器返回异常');
      }
    } catch (err) {
      if (axios.isCancel(err)) return;
      setError('网络请求失败，请检查网络连接后重试');
    } finally {
      setLoading(false);
    }
  }

  function requestToggleJobStatus(id: number) {
    const job = jobs.find(j => j.id === id);
    if (!job) return;
    setToggleTarget({ id, currentStatus: job.status });
    setActionMenu(null);
  }

  async function handleConfirmToggle() {
    if (!toggleTarget) return;
    try {
      setToggleLoading(true);
      const newStatus = toggleTarget.currentStatus === 'active' ? 'inactive' : 'active';
      const previousStatus = toggleTarget.currentStatus;
      setJobs(prev => prev.map(j => j.id === toggleTarget.id ? { ...j, status: newStatus } : j));
      await http.put(`/company/jobs/${toggleTarget.id}/status`, { status: newStatus });
      showToast({ type: 'success', title: newStatus === 'active' ? '职位已上架' : '职位已下架' });
    } catch {
      setJobs(prev => prev.map(j => j.id === toggleTarget.id ? { ...j, status: toggleTarget.currentStatus } : j));
      showToast({ type: 'error', title: '操作失败', message: '请稍后重试' });
    } finally {
      setToggleLoading(false);
      setToggleTarget(null);
    }
  }

  async function deleteJob(id: number) {
    const previousJobs = jobs;
    const previousTotal = total;
    setJobs(prev => prev.filter(j => j.id !== id));
    setTotal(prev => Math.max(0, prev - 1));
    setActionMenu(null);

    try {
      await http.delete(`/company/jobs/${id}`);
      showToast({ type: 'success', title: '职位已删除' });
    } catch {
      setJobs(previousJobs);
      setTotal(previousTotal);
      showToast({ type: 'error', title: '删除失败', message: '请稍后重试' });
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      deleteJob(deleteTarget.id);
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  }

  function openCreateModal() {
    navigate('/company/jobs/new');
  }

  function openEditModal(job: JobRecord) {
    navigate(`/company/jobs/${job.id}/edit`, { state: { job } });
    setActionMenu(null);
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">职位管理</h1>
          <p className="text-gray-500 mt-1">管理已发布的招聘职位，支持创建、编辑和上下架操作</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium shadow-sm"
        >
          <Plus className="w-5 h-5" />
          发布新职位
        </button>
      </div>

      {/* 搜索和筛选 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索职位名称、工作地点..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={typeFilter}
              onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
              className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value="all">全部类型</option>
              <option value="校招">校招</option>
              <option value="实习">实习</option>
              <option value="社招">社招</option>
            </select>
          </div>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          >
            <option value="all">全部状态</option>
            <option value="active">招聘中</option>
            <option value="inactive">已下架</option>
          </select>
        </div>
      </div>

      {/* 加载状态 */}
      {loading && (
        <TableSkeleton rows={5} cols={6} />
      )}

      {/* 错误状态 */}
      {!loading && error && (
        <ErrorState
          message={error}
          onRetry={fetchJobs}
        />
      )}

      {/* 数据统计条 */}
      {!loading && !error && (<>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '在招职位', value: jobs.filter(j => j.status === 'active').length, icon: Briefcase, color: 'text-primary-600', bg: 'bg-primary-50' },
          { label: '总浏览量', value: jobs.reduce((a, j) => a + (j.view_count || 0), 0).toLocaleString(), icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: '总投递数', value: jobs.reduce((a, j) => a + (j.applications || 0), 0), icon: FileText, color: 'text-primary-600', bg: 'bg-primary-50' },
          { label: '已下架', value: jobs.filter(j => j.status === 'inactive').length, icon: EyeOff, color: 'text-gray-500', bg: 'bg-gray-50' },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
            <div className={`w-10 h-10 ${item.bg} rounded-lg flex items-center justify-center`}>
              <item.icon className={`w-5 h-5 ${item.color}`} />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{item.value}</p>
              <p className="text-xs text-gray-500">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 职位列表表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase tracking-wider">职位信息</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase tracking-wider">地点</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase tracking-wider">薪资</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase tracking-wider">类型</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase tracking-wider">浏览/投递</th>
                <th className="text-right px-6 py-3.5 text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {jobs.map((job, i) => (
                <motion.tr
                  key={job.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900 truncate max-w-[260px]">{job.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> 发布于 {job.created_at}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" /> {job.location}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-primary-700 font-medium">{job.salary}</span>
                  </td>
                  <td className="px-6 py-4">
                    <Tag variant={JOB_TYPE_TAG_VARIANT[job.type] || 'gray'} size="md">
                      {job.type}
                    </Tag>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => requestToggleJobStatus(job.id)}
                      className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full cursor-pointer transition-colors ${
                        job.status === 'active'
                          ? 'bg-green-50 text-green-700 hover:bg-green-100'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {job.status === 'active' ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      {job.status === 'active' ? '招聘中' : '已下架'}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-gray-500 flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" /> {(job.view_count || 0).toLocaleString()}
                      </span>
                      <span className="text-primary-600 font-medium flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" /> {job.applications || 0}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right relative">
                    <button
                      onClick={() => setActionMenu(actionMenu === job.id ? null : job.id)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </button>
                    {actionMenu === job.id && (
                      <div className="absolute right-6 top-12 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                        <button
                          onClick={() => openEditModal(job)}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Edit3 className="w-4 h-4" /> 编辑
                        </button>
                        <button
                          onClick={() => requestToggleJobStatus(job.id)}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          {job.status === 'active' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          {job.status === 'active' ? '下架' : '上架'}
                        </button>
                        <button
                          onClick={() => { setDeleteTarget({ id: job.id, name: job.title }); setActionMenu(null); }}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" /> 删除
                        </button>
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
            共 <span className="font-medium text-gray-900">{total}</span> 个职位
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
      </>)}

      {/* 删除确认弹窗 */}
      <ConfirmDialog
        open={!!deleteTarget}
        variant="danger"
        title="确认删除职位"
        description={`确定要删除职位「${deleteTarget?.name}」吗？删除后无法恢复。`}
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* 上下架确认弹窗 */}
      <ConfirmDialog
        open={!!toggleTarget}
        variant={toggleTarget?.currentStatus === 'active' ? 'warning' : 'info'}
        title={toggleTarget?.currentStatus === 'active' ? '确定下架该职位？' : '确定上架该职位？'}
        description={toggleTarget?.currentStatus === 'active' ? '下架后求职者将无法看到该职位。' : '上架后该职位将对求职者可见。'}
        confirmText={toggleTarget?.currentStatus === 'active' ? '确认下架' : '确认上架'}
        loading={toggleLoading}
        onConfirm={handleConfirmToggle}
        onCancel={() => setToggleTarget(null)}
      />
    </div>
  );
}
