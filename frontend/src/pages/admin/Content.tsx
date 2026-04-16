import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Briefcase, Video, Eye, EyeOff,
  MoreVertical, Trash2, Loader2
} from 'lucide-react';
import http from '@/api/http';
import Tag from '@/components/ui/Tag';

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

  // 加载职位列表
  async function fetchJobs(keyword = '') {
    setJobsLoading(true);
    setError('');
    try {
      const res = await http.get('/admin/jobs', { params: { keyword } });
      if (res.data?.code === 200) {
        setJobs(res.data.data?.jobs || []);
      }
    } catch {
      setError('加载职位数据失败');
      setJobs([]);
    } finally {
      setJobsLoading(false);
    }
  }

  // 加载课程列表
  async function fetchCourses(keyword = '') {
    setCoursesLoading(true);
    setError('');
    try {
      const res = await http.get('/admin/courses', { params: { keyword } });
      if (res.data?.code === 200) {
        setCourses(res.data.data?.courses || []);
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

  // 搜索触发
  useEffect(() => {
    const timer = setTimeout(() => {
      if (tab === 'jobs') fetchJobs(search);
      else fetchCourses(search);
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
    } catch {
      setError('操作失败，请重试');
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
    } catch {
      setError('操作失败，请重试');
    }
    setActionMenu(null);
  }

  const isLoading = tab === 'jobs' ? jobsLoading : coursesLoading;
  const currentList = tab === 'jobs' ? jobs : courses;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">内容管理</h1>
        <p className="text-gray-500 mt-1">管理平台职位和课程内容，支持上下架和违规处理</p>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
          <button onClick={() => setError('')} className="ml-2 text-red-500 hover:text-red-700">×</button>
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
          职位管理 ({jobs.length})
        </button>
        <button
          onClick={() => { setTab('courses'); setSearch(''); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            tab === 'courses' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Video className="w-4 h-4" />
          课程管理 ({courses.length})
        </button>
      </div>

      {/* 搜索 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={tab === 'jobs' ? '搜索职位名称、公司...' : '搜索课程名称、讲师...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
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
      {!isLoading && currentList.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg">暂无{tab === 'jobs' ? '职位' : '课程'}数据</p>
          <p className="text-sm mt-1">数据将在有内容发布后显示</p>
        </div>
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
                <motion.tr key={job.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="hover:bg-gray-50">
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
                <motion.tr key={course.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="hover:bg-gray-50">
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
    </div>
  );
}
