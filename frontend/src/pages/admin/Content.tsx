import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Briefcase, Video, Eye, EyeOff,
  ChevronLeft, ChevronRight, Filter,
  MoreVertical, Trash2, Edit3
} from 'lucide-react';

// ====== 职位+课程内容管理 ======
// 商业级要求：内容上下架管理、违规内容处理

type Tab = 'jobs' | 'courses';

interface JobItem {
  id: number;
  title: string;
  company_name: string;
  location: string;
  salary: string;
  type: string;
  status: 'active' | 'inactive';
  view_count: number;
  created_at: string;
}

interface CourseItem {
  id: number;
  title: string;
  mentor_name: string;
  category: string;
  status: 'active' | 'inactive';
  views: number;
  rating: number;
  created_at: string;
}

export default function AdminContent() {
  const [tab, setTab] = useState<Tab>('jobs');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [actionMenu, setActionMenu] = useState<number | null>(null);

  const mockJobs: JobItem[] = [
    { id: 1, title: '前端开发工程师 (2026届校招)', company_name: '字节跳动', location: '北京/上海/杭州', salary: '25k-40k', type: '校招', status: 'active', view_count: 3250, created_at: '2026-03-10' },
    { id: 2, title: '产品经理实习生 - 商业化方向', company_name: '腾讯', location: '深圳', salary: '200-300/天', type: '实习', status: 'active', view_count: 2100, created_at: '2026-03-08' },
    { id: 3, title: 'AIGC 算法研究员', company_name: '百度', location: '北京', salary: '30k-60k', type: '校招', status: 'active', view_count: 4500, created_at: '2026-03-12' },
    { id: 4, title: '海外市场运营专员', company_name: '米哈游', location: '上海', salary: '15k-25k', type: '校招', status: 'active', view_count: 1800, created_at: '2026-03-15' },
    { id: 5, title: 'UI/UX 设计师实习', company_name: '小红书', location: '上海', salary: '250/天', type: '实习', status: 'inactive', view_count: 980, created_at: '2026-03-20' },
    { id: 6, title: '管培生 (2026届)', company_name: '联合利华', location: '全国', salary: '12k-18k', type: '校招', status: 'active', view_count: 2800, created_at: '2026-03-22' },
  ];

  const mockCourses: CourseItem[] = [
    { id: 1, title: '2024秋招互联网产品经理全攻略', mentor_name: '张产品', category: '产品', status: 'active', views: 125000, rating: 4.9, created_at: '2026-02-15' },
    { id: 2, title: '前端开发面试高频手写题解析', mentor_name: '李前端', category: '技术', status: 'active', views: 83000, rating: 4.8, created_at: '2026-02-20' },
    { id: 3, title: '四大八大审计实习生笔面试指南', mentor_name: '王审计', category: '金融', status: 'active', views: 56000, rating: 4.7, created_at: '2026-03-01' },
    { id: 4, title: '如何写出一份让HR眼前一亮的简历', mentor_name: '赵HR', category: '求职技巧', status: 'active', views: 158000, rating: 4.9, created_at: '2026-01-10' },
    { id: 5, title: '算法岗校招面经分享', mentor_name: '陈算法', category: '技术', status: 'inactive', views: 91000, rating: 4.8, created_at: '2026-03-05' },
  ];

  const [jobs, setJobs] = useState(mockJobs);
  const [courses, setCourses] = useState(mockCourses);

  function toggleJobStatus(id: number) {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status: j.status === 'active' ? 'inactive' : 'active' } : j));
    setActionMenu(null);
  }

  function toggleCourseStatus(id: number) {
    setCourses(prev => prev.map(c => c.id === id ? { ...c, status: c.status === 'active' ? 'inactive' : 'active' } : c));
    setActionMenu(null);
  }

  const filteredJobs = search ? jobs.filter(j => j.title.includes(search) || j.company_name.includes(search)) : jobs;
  const filteredCourses = search ? courses.filter(c => c.title.includes(search) || c.mentor_name.includes(search)) : courses;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">内容管理</h1>
        <p className="text-gray-500 mt-1">管理平台职位和课程内容，支持上下架和违规处理</p>
      </div>

      {/* Tab切换 */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => { setTab('jobs'); setSearch(''); setPage(1); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            tab === 'jobs' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          职位管理 ({jobs.length})
        </button>
        <button
          onClick={() => { setTab('courses'); setSearch(''); setPage(1); }}
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
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>

      {/* 职位列表 */}
      {tab === 'jobs' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">职位</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">公司</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">类型</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">薪资</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">浏览</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="text-right px-6 py-3.5 text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredJobs.map((job, i) => (
                <motion.tr key={job.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900 truncate max-w-[250px]">{job.title}</p>
                    <p className="text-xs text-gray-500">{job.location}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{job.company_name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      job.type === '校招' ? 'bg-blue-100 text-blue-700' :
                      job.type === '实习' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>{job.type}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-medium">{job.salary}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{job.view_count.toLocaleString()}</td>
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
                        <button className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50 flex items-center gap-2">
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
      )}

      {/* 课程列表 */}
      {tab === 'courses' && (
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
              {filteredCourses.map((course, i) => (
                <motion.tr key={course.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900 truncate max-w-[300px]">{course.title}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{course.mentor_name}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">{course.category}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{(course.views / 10000).toFixed(1)}万</td>
                  <td className="px-6 py-4 text-sm text-amber-600 font-medium">{course.rating}</td>
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
                        <button className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50 flex items-center gap-2">
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
      )}
    </div>
  );
}
