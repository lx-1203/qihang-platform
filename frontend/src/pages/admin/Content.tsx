import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Briefcase, Video, Eye, EyeOff,
  MoreVertical, Loader2, ChevronLeft, ChevronRight,
  X, MessageSquare
} from 'lucide-react';
import http from '@/api/http';
import Tag from '@/components/ui/Tag';
import { showToast } from '@/components/ui/ToastContainer';
import EmptyState from '../../components/ui/EmptyState';

// ====== 职位+课程内容管理 ======
// 数据从 /api/admin/jobs 和 /api/admin/courses 获取

type Tab = 'jobs' | 'courses';

interface JobItem {
  id: number;
  title: string;
  company_name: string;
  location: string;
  salary: string;
  type: string;
  status: string;
  view_count?: number;
  created_at: string;
}

interface CourseItem {
  id: number;
  title: string;
  mentor_name: string;
  category: string;
  status: string;
  views: number;
  rating: number;
  created_at: string;
}

export default function AdminContent() {
  const [tab, setTab] = useState<Tab>('jobs');
  const [search, setSearch] = useState('');
  const [actionMenu, setActionMenu] = useState<number | null>(null);

  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [error, setError] = useState('');

  // 分页状态
  const [jobsPage, setJobsPage] = useState(1);
  const [jobsTotal, setJobsTotal] = useState(0);
  const [jobsTotalPages, setJobsTotalPages] = useState(1);
  const [coursesPage, setCoursesPage] = useState(1);
  const [coursesTotal, setCoursesTotal] = useState(0);
  const [coursesTotalPages, setCoursesTotalPages] = useState(1);
  const pageSize = 20;

  // 详情弹窗
  const [detailItem, setDetailItem] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSending, setFeedbackSending] = useState(false);

  // 加载职位列表
  async function fetchJobs(keyword = '', page = 1) {
    setJobsLoading(true);
    setError('');
    try {
      const res = await http.get('/admin/jobs', { params: { keyword, page, pageSize } });
      if (res.data?.code === 200) {
        setJobs(res.data.data?.jobs || []);
        const pagination = res.data.data?.pagination;
        if (pagination) {
          setJobsTotal(pagination.total);
          setJobsTotalPages(pagination.totalPages);
          setJobsPage(pagination.page);
        }
      }
    } catch {
      setError('加载职位数据失败');
      setJobs([]);
    } finally {
      setJobsLoading(false);
    }
  }

  // 加载课程列表
  async function fetchCourses(keyword = '', page = 1) {
    setCoursesLoading(true);
    setError('');
    try {
      const res = await http.get('/admin/courses', { params: { keyword, page, pageSize } });
      if (res.data?.code === 200) {
        setCourses(res.data.data?.courses || []);
        const pagination = res.data.data?.pagination;
        if (pagination) {
          setCoursesTotal(pagination.total);
          setCoursesTotalPages(pagination.totalPages);
          setCoursesPage(pagination.page);
        }
      }
    } catch {
      setError('加载课程数据失败');
      setCourses([]);
    } finally {
      setCoursesLoading(false);
    }
  }

  // 初始加载
  useEffect(() => {
    fetchJobs();
    fetchCourses();
  }, []);

  // 搜索触发（重置到第1页）
  useEffect(() => {
    const timer = setTimeout(() => {
      if (tab === 'jobs') {
        setJobsPage(1);
        fetchJobs(search, 1);
      } else {
        setCoursesPage(1);
        fetchCourses(search, 1);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, tab]);

  // 上下架职位
  async function toggleJobStatus(id: number) {
    const job = jobs.find(j => j.id === id);
    if (!job) return;
    const newStatus = job.status === 'active' ? 'inactive' : 'active';
    try {
      await http.put(`/admin/jobs/${id}/status`, { status: newStatus });
      setJobs(prev => prev.map(j => j.id === id ? { ...j, status: newStatus } : j));
      showToast({ type: 'success', title: newStatus === 'active' ? '职位已上架' : '职位已下架' });
    } catch {
      setError('操作失败，请重试');
      showToast({ type: 'error', title: '操作失败，请重试' });
    }
    setActionMenu(null);
  }

  // 上下架课程
  async function toggleCourseStatus(id: number) {
    const course = courses.find(c => c.id === id);
    if (!course) return;
    const newStatus = course.status === 'active' ? 'inactive' : 'active';
    try {
      await http.put(`/admin/courses/${id}/status`, { status: newStatus });
      setCourses(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
      showToast({ type: 'success', title: newStatus === 'active' ? '课程已上架' : '课程已下架' });
    } catch {
      setError('操作失败，请重试');
      showToast({ type: 'error', title: '操作失败，请重试' });
    }
    setActionMenu(null);
  }

  const isLoading = tab === 'jobs' ? jobsLoading : coursesLoading;
  const currentList = tab === 'jobs' ? jobs : courses;
  const currentPage = tab === 'jobs' ? jobsPage : coursesPage;
  const currentTotalPages = tab === 'jobs' ? jobsTotalPages : coursesTotalPages;
  const currentTotal = tab === 'jobs' ? jobsTotal : coursesTotal;

  const handlePageChange = (newPage: number) => {
    if (tab === 'jobs') {
      setJobsPage(newPage);
      fetchJobs(search, newPage);
    } else {
      setCoursesPage(newPage);
      fetchCourses(search, newPage);
    }
  };

  // 查看详情
  async function viewDetail(type: 'job' | 'course', id: number) {
    setDetailLoading(true);
    try {
      const endpoint = type === 'job' ? `/admin/jobs/${id}` : `/admin/courses/${id}`;
      const res = await http.get(endpoint);
      if (res.data?.code === 200) {
        setDetailItem({ ...res.data.data, _type: type });
      }
    } catch {
      showToast({ type: 'error', title: '获取详情失败' });
    } finally {
      setDetailLoading(false);
    }
  }

  // 发送反馈
  async function sendFeedback() {
    if (!detailItem || !feedbackText.trim()) return;
    const userId = detailItem._type === 'job' ? detailItem.company_user_id : detailItem.mentor_user_id;
    if (!userId) {
      showToast({ type: 'error', title: '无法发送反馈：未找到用户信息' });
      return;
    }
    setFeedbackSending(true);
    try {
      // 使用 JOIN 查询返回的 user_id（companies.user_id / mentor_profiles.user_id）而非表的主键 ID
      const itemName = detailItem.title;
      await http.post('/admin/feedback', {
        userId,
        title: `关于「${itemName}」的审核反馈`,
        content: feedbackText,
      });
      showToast({ type: 'success', title: '反馈已发送' });
      setFeedbackText('');
    } catch {
      showToast({ type: 'error', title: '发送失败，请重试' });
    } finally {
      setFeedbackSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">内容管理</h1>
        <p className="text-gray-500 mt-1">管理平台职位和课程内容，支持上下架和违规处理</p>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-2 text-red-500 hover:text-red-700 font-bold">&times;</button>
        </div>
      )}

      {/* Tab切换 */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => { setTab('jobs'); setSearch(''); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            tab === 'jobs' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          职位管理 ({jobsTotal})
        </button>
        <button
          onClick={() => { setTab('courses'); setSearch(''); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            tab === 'courses' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Video className="w-4 h-4" />
          课程管理 ({coursesTotal})
        </button>
      </div>

      {/* 搜索 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="relative max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            id="content-search"
            name="content-search"
            placeholder={tab === 'jobs' ? '搜索职位名称、公司...' : '搜索课程名称、讲师...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-lg text-base focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>
      </div>

      {/* 加载状态 */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          <span className="ml-3 text-gray-500">加载中...</span>
        </div>
      )}

      {/* 空状态 */}
      {!isLoading && currentList.length === 0 && !error && (
        <EmptyState
          icon={tab === 'jobs' ? Briefcase : Video}
          title={`暂无${tab === 'jobs' ? '职位' : '课程'}数据`}
          description={tab === 'jobs' ? '企业发布职位后将在此显示' : '导师创建课程后将在此显示'}
        />
      )}

      {/* 职位列表 */}
      {tab === 'jobs' && !jobsLoading && jobs.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">职位</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">公司</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">类型</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">薪资</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="text-right px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {jobs.map((job, i) => (
                <motion.tr key={job.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.03, 0.3) }} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900 truncate max-w-[250px]">{job.title}</p>
                    <p className="text-xs text-gray-500">{job.location}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{job.company_name}</td>
                  <td className="px-6 py-4">
                    <Tag
                      variant={job.type === '校招' ? 'blue' : job.type === '实习' ? 'green' : 'gray'}
                      size="sm"
                    >{job.type}</Tag>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-medium">{job.salary}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                      job.status === 'active' ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      {job.status === 'active' ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      {job.status === 'active' ? '上架' : '下架'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right relative">
                    <button onClick={() => setActionMenu(actionMenu === job.id ? null : job.id)} className="p-1.5 rounded-lg hover:bg-gray-100">
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </button>
                    {actionMenu === job.id && (
                      <div className="absolute right-6 top-12 w-36 bg-white rounded-lg shadow-lg border py-1 z-10">
                        <button onClick={() => { viewDetail('job', job.id); setActionMenu(null); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          <Eye className="w-4 h-4" />
                          查看详情
                        </button>
                        <button onClick={() => toggleJobStatus(job.id)} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          {job.status === 'active' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          {job.status === 'active' ? '下架' : '上架'}
                        </button>
                      </div>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 课程列表 */}
      {tab === 'courses' && !coursesLoading && courses.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">课程</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">讲师</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">分类</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">浏览</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">评分</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="text-right px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {courses.map((course, i) => (
                <motion.tr key={course.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.03, 0.3) }} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900 truncate max-w-[300px]">{course.title}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{course.mentor_name}</td>
                  <td className="px-6 py-4">
                    <Tag variant="purple" size="sm">{course.category}</Tag>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{course.views >= 10000 ? `${(course.views / 10000).toFixed(1)}万` : course.views}</td>
                  <td className="px-6 py-4 text-sm text-amber-600 font-medium">{course.rating || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                      course.status === 'active' ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      {course.status === 'active' ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      {course.status === 'active' ? '上架' : '下架'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right relative">
                    <button onClick={() => setActionMenu(actionMenu === course.id + 1000 ? null : course.id + 1000)} className="p-1.5 rounded-lg hover:bg-gray-100">
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </button>
                    {actionMenu === course.id + 1000 && (
                      <div className="absolute right-6 top-12 w-36 bg-white rounded-lg shadow-lg border py-1 z-10">
                        <button onClick={() => { viewDetail('course', course.id); setActionMenu(null); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          <Eye className="w-4 h-4" />
                          查看详情
                        </button>
                        <button onClick={() => toggleCourseStatus(course.id)} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          {course.status === 'active' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          {course.status === 'active' ? '下架' : '上架'}
                        </button>
                      </div>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 分页控件 */}
      {!isLoading && currentList.length > 0 && (
        <div className="flex items-center justify-between bg-white rounded-xl px-6 py-4 shadow-sm border border-gray-100">
          <span className="text-sm text-gray-500">
            共 {currentTotal} 条记录，第 {currentPage} / {currentTotalPages} 页
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1.5 text-sm font-medium text-gray-700">{currentPage}</span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= currentTotalPages}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 详情弹窗 */}
      {(detailItem || detailLoading) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={() => { setDetailItem(null); setFeedbackText(''); }}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl"
          >
            {detailLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
              </div>
            ) : detailItem && (
              <>
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
                  <h3 className="text-lg font-bold text-gray-900">
                    {detailItem._type === 'job' ? '职位详情' : '课程详情'}
                  </h3>
                  <button onClick={() => { setDetailItem(null); setFeedbackText(''); }} className="p-1.5 rounded-lg hover:bg-gray-100">
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                <div className="px-6 py-4 space-y-4">
                  <div>
                    <h4 className="text-xl font-bold text-gray-900">{detailItem.title}</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      {detailItem._type === 'job' ? detailItem.company_name : detailItem.mentor_name}
                      {detailItem.location && ` · ${detailItem.location}`}
                    </p>
                  </div>
                  {detailItem._type === 'job' && (
                    <div className="flex flex-wrap gap-3 text-sm">
                      {detailItem.type && <Tag variant="blue" size="sm">{detailItem.type}</Tag>}
                      {detailItem.salary && <Tag variant="green" size="sm">{detailItem.salary}</Tag>}
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${detailItem.status === 'active' ? 'text-green-600' : 'text-gray-400'}`}>
                        {detailItem.status === 'active' ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        {detailItem.status === 'active' ? '上架中' : '已下架'}
                      </span>
                    </div>
                  )}
                  {detailItem._type === 'course' && (
                    <div className="flex flex-wrap gap-3 text-sm">
                      {detailItem.category && <Tag variant="purple" size="sm">{detailItem.category}</Tag>}
                      {detailItem.rating > 0 && <span className="text-amber-600 font-medium">评分: {detailItem.rating}</span>}
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${detailItem.status === 'active' ? 'text-green-600' : 'text-gray-400'}`}>
                        {detailItem.status === 'active' ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        {detailItem.status === 'active' ? '上架中' : '已下架'}
                      </span>
                    </div>
                  )}
                  {detailItem.description && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">详细描述</p>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{detailItem.description}</p>
                    </div>
                  )}
                  {detailItem.requirements && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">岗位要求</p>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{detailItem.requirements}</p>
                    </div>
                  )}
                  {detailItem.tags && detailItem.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {detailItem.tags.map((tag: string) => (
                        <Tag key={tag} variant="gray" size="sm">{tag}</Tag>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-400">创建时间：{new Date(detailItem.created_at).toLocaleString('zh-CN')}</p>
                </div>
                {/* 审核反馈 */}
                <div className="px-6 py-4 border-t border-gray-100">
                  <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <MessageSquare className="w-4 h-4" />
                    发送审核反馈
                  </p>
                  <textarea
                    id="admin-feedback"
                    name="admin-feedback"
                    value={feedbackText}
                    onChange={e => setFeedbackText(e.target.value)}
                    placeholder="输入反馈内容，将以通知形式发送给发布者..."
                    rows={3}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                  />
                  <button
                    onClick={sendFeedback}
                    disabled={!feedbackText.trim() || feedbackSending}
                    className="mt-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 text-sm font-medium flex items-center gap-1"
                  >
                    {feedbackSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                    发送反馈
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
