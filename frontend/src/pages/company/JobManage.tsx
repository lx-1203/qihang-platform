import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Filter, MoreVertical, Edit3,
  Trash2, Eye, EyeOff, MapPin, Briefcase,
  ChevronLeft, ChevronRight, X, Save, Loader2,
  DollarSign, Building2, Clock, FileText
} from 'lucide-react';
import axios from 'axios';
import http from '@/api/http';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { TableSkeleton } from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';

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

const JOB_TYPE_COLORS: Record<string, string> = {
  '全职': 'bg-blue-100 text-blue-700',
  '实习': 'bg-green-100 text-green-700',
  '兼职': 'bg-purple-100 text-purple-700',
};

const EMPTY_JOB: Omit<JobRecord, 'id' | 'view_count' | 'applications' | 'created_at'> = {
  title: '',
  location: '',
  salary: '',
  type: '全职',
  status: 'active',
  description: '',
  requirements: '',
};

export default function CompanyJobManage() {
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

  // 模态框状态
  const [showModal, setShowModal] = useState(false);
  const [editingJob, setEditingJob] = useState<Partial<JobRecord>>(EMPTY_JOB);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // 模拟数据
  const mockJobs: JobRecord[] = [
    { id: 1, title: '前端开发工程师 (2026届校招)', location: '北京/上海', salary: '25k-40k', type: '全职', status: 'active', view_count: 3250, applications: 86, description: '负责公司核心产品的前端开发，使用React/Vue技术栈。', requirements: '本科及以上学历，计算机相关专业，熟悉React或Vue框架。', created_at: '2026-03-10' },
    { id: 2, title: '产品经理实习生', location: '深圳', salary: '200-300/天', type: '实习', status: 'active', view_count: 2100, applications: 45, description: '参与产品需求分析、原型设计和项目跟进。', requirements: '在校大学生，产品管理或相关专业优先。', created_at: '2026-03-08' },
    { id: 3, title: 'AIGC算法研究员', location: '北京', salary: '35k-60k', type: '全职', status: 'active', view_count: 4500, applications: 120, description: '研究并落地AIGC相关算法，包括大语言模型微调和多模态方向。', requirements: '硕士及以上学历，AI/ML相关方向，有论文发表优先。', created_at: '2026-03-12' },
    { id: 4, title: '市场运营专员', location: '上海', salary: '15k-22k', type: '全职', status: 'active', view_count: 1800, applications: 32, description: '负责品牌推广、活动策划和用户增长相关工作。', requirements: '本科及以上学历，市场营销相关专业，有实习经验优先。', created_at: '2026-03-15' },
    { id: 5, title: 'UI/UX设计师实习', location: '上海', salary: '250/天', type: '实习', status: 'inactive', view_count: 980, applications: 18, description: '参与产品UI/UX设计工作，包括界面设计、交互原型等。', requirements: '在校大学生，设计相关专业，熟悉Figma或Sketch。', created_at: '2026-03-20' },
    { id: 6, title: '管培生 (2026届)', location: '全国', salary: '12k-18k', type: '全职', status: 'active', view_count: 2800, applications: 95, description: '参加为期12个月的管培生轮岗计划，覆盖产品、运营、市场等方向。', requirements: '2026届本科及以上学历，GPA 3.5+，有学生干部经历优先。', created_at: '2026-03-22' },
    { id: 7, title: '数据分析兼职', location: '远程', salary: '150/小时', type: '兼职', status: 'active', view_count: 650, applications: 12, description: '协助数据团队进行数据清洗、分析和可视化报告撰写。', requirements: '熟悉Python/SQL，有数据分析经验，可远程办公。', created_at: '2026-04-01' },
    { id: 8, title: 'Java后端开发工程师', location: '杭州', salary: '28k-45k', type: '全职', status: 'active', view_count: 3100, applications: 78, description: '负责后端微服务架构设计与开发，保障系统高可用。', requirements: '本科及以上学历，3年以上Java开发经验，熟悉Spring Boot。', created_at: '2026-03-25' },
  ];

  useEffect(() => {
    fetchJobs();
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
        setJobs(res.data.data.list);
        setTotal(res.data.data.total);
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

  function applyMockFilter() {
    let filtered = [...mockJobs];
    if (typeFilter !== 'all') filtered = filtered.filter(j => j.type === typeFilter);
    if (statusFilter !== 'all') filtered = filtered.filter(j => j.status === statusFilter);
    if (search) filtered = filtered.filter(j =>
      j.title.includes(search) || j.location.includes(search)
    );
    setJobs(filtered);
    setTotal(filtered.length);
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
      setJobs(prev => prev.map(j => j.id === toggleTarget.id ? { ...j, status: newStatus } : j));
      http.put(`/company/jobs/${toggleTarget.id}/status`, { status: newStatus }).catch(() => {});
    } finally {
      setToggleLoading(false);
      setToggleTarget(null);
    }
  }

  function deleteJob(id: number) {
    setJobs(prev => prev.filter(j => j.id !== id));
    setTotal(prev => prev - 1);
    setActionMenu(null);
    http.delete(`/company/jobs/${id}`).catch(() => {});
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
    setEditingJob({ ...EMPTY_JOB });
    setIsEditing(false);
    setShowModal(true);
  }

  function openEditModal(job: JobRecord) {
    setEditingJob({ ...job });
    setIsEditing(true);
    setShowModal(true);
    setActionMenu(null);
  }

  async function handleSaveJob() {
    if (!editingJob.title || !editingJob.location || !editingJob.salary) return;
    try {
      setSaving(true);
      if (isEditing && editingJob.id) {
        await http.put(`/company/jobs/${editingJob.id}`, editingJob);
        setJobs(prev => prev.map(j => j.id === editingJob.id ? { ...j, ...editingJob } as JobRecord : j));
      } else {
        const res = await http.post('/company/jobs', editingJob);
        const newId = res.data?.data?.id || Date.now();
        const newJob: JobRecord = {
          ...editingJob as JobRecord,
          id: newId,
          view_count: 0,
          applications: 0,
          created_at: new Date().toISOString().split('T')[0],
        };
        setJobs(prev => [newJob, ...prev]);
        setTotal(prev => prev + 1);
      }
    } catch {
      // 模拟操作
      if (isEditing && editingJob.id) {
        setJobs(prev => prev.map(j => j.id === editingJob.id ? { ...j, ...editingJob } as JobRecord : j));
      } else {
        const newJob: JobRecord = {
          ...editingJob as JobRecord,
          id: Date.now(),
          view_count: 0,
          applications: 0,
          created_at: new Date().toISOString().split('T')[0],
        };
        setJobs(prev => [newJob, ...prev]);
        setTotal(prev => prev + 1);
      }
    } finally {
      setSaving(false);
      setShowModal(false);
    }
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
              <option value="全职">全职</option>
              <option value="实习">实习</option>
              <option value="兼职">兼职</option>
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
          onLoadMockData={() => { applyMockFilter(); setError(null); }}
        />
      )}

      {/* 数据统计条 */}
      {!loading && !error && (<>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '在招职位', value: jobs.filter(j => j.status === 'active').length, icon: Briefcase, color: 'text-primary-600', bg: 'bg-primary-50' },
          { label: '总浏览量', value: jobs.reduce((a, j) => a + j.view_count, 0).toLocaleString(), icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: '总投递数', value: jobs.reduce((a, j) => a + j.applications, 0), icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50' },
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
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${JOB_TYPE_COLORS[job.type] || 'bg-gray-100 text-gray-700'}`}>
                      {job.type}
                    </span>
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
                        <Eye className="w-3.5 h-3.5" /> {job.view_count.toLocaleString()}
                      </span>
                      <span className="text-primary-600 font-medium flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" /> {job.applications}
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

      {/* 创建/编辑模态框 */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-y-auto"
            >
              {/* 模态框头部 */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900">
                  {isEditing ? '编辑职位' : '发布新职位'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* 表单内容 */}
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* 职位名称 */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      职位名称 <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={editingJob.title || ''}
                        onChange={e => setEditingJob(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                        placeholder="如：前端开发工程师 (2026届)"
                      />
                    </div>
                  </div>

                  {/* 工作地点 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      工作地点 <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={editingJob.location || ''}
                        onChange={e => setEditingJob(prev => ({ ...prev, location: e.target.value }))}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                        placeholder="如：北京/上海"
                      />
                    </div>
                  </div>

                  {/* 薪资范围 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      薪资范围 <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={editingJob.salary || ''}
                        onChange={e => setEditingJob(prev => ({ ...prev, salary: e.target.value }))}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                        placeholder="如：25k-40k 或 200/天"
                      />
                    </div>
                  </div>

                  {/* 职位类型 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      职位类型 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editingJob.type || '全职'}
                      onChange={e => setEditingJob(prev => ({ ...prev, type: e.target.value as JobRecord['type'] }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                    >
                      <option value="全职">全职</option>
                      <option value="实习">实习</option>
                      <option value="兼职">兼职</option>
                    </select>
                  </div>

                  {/* 职位状态 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">发布状态</label>
                    <select
                      value={editingJob.status || 'active'}
                      onChange={e => setEditingJob(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                    >
                      <option value="active">立即发布</option>
                      <option value="inactive">暂不发布</option>
                    </select>
                  </div>

                  {/* 职位描述 */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">职位描述</label>
                    <textarea
                      value={editingJob.description || ''}
                      onChange={e => setEditingJob(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                      placeholder="请描述岗位职责和工作内容..."
                    />
                  </div>

                  {/* 任职要求 */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">任职要求</label>
                    <textarea
                      value={editingJob.requirements || ''}
                      onChange={e => setEditingJob(prev => ({ ...prev, requirements: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                      placeholder="请描述学历要求、技能要求等..."
                    />
                  </div>
                </div>
              </div>

              {/* 模态框底部 */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveJob}
                  disabled={saving || !editingJob.title || !editingJob.location || !editingJob.salary}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? '保存中...' : isEditing ? '保存修改' : '发布职位'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
