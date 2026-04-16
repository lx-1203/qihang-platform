import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Briefcase, BookOpen, User,
  MapPin, Building2, Clock, Star,
  DollarSign, Trash2, GraduationCap,
  Search, LayoutGrid, List, ExternalLink
} from 'lucide-react';
import http from '@/api/http';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { ListSkeleton } from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import Tag from '@/components/ui/Tag';

// ====== 我的收藏 ======
// 分 Tab 查看收藏的职位/课程/导师，支持取消收藏

type FavoriteTab = 'jobs' | 'courses' | 'mentors';

interface FavoriteJob {
  id: number;
  favoriteId: number;
  title: string;
  companyName: string;
  location: string;
  salary: string;
  jobType: string;
  tags: string[];
  createdAt: string;
  favoritedAt: string;
}

interface FavoriteCourse {
  id: number;
  favoriteId: number;
  title: string;
  mentorName: string;
  category: string;
  price: number;
  rating: number;
  studentCount: number;
  coverImage: string;
  favoritedAt: string;
}

interface FavoriteMentor {
  id: number;
  favoriteId: number;
  name: string;
  title: string;
  specialty: string[];
  rating: number;
  reviewCount: number;
  price: number;
  avatar: string;
  favoritedAt: string;
}

// 模拟数据
const mockJobs: FavoriteJob[] = [
  {
    id: 101, favoriteId: 1, title: '前端开发工程师', companyName: '字节跳动',
    location: '北京·海淀区', salary: '15K-25K', jobType: '全职',
    tags: ['React', 'TypeScript', '大厂'], createdAt: '2026-04-01', favoritedAt: '2026-04-05',
  },
  {
    id: 102, favoriteId: 2, title: 'Go后端开发（实习）', companyName: '腾讯科技',
    location: '深圳·南山区', salary: '250-350/天', jobType: '实习',
    tags: ['Go', '微服务', '实习'], createdAt: '2026-03-28', favoritedAt: '2026-04-03',
  },
  {
    id: 103, favoriteId: 3, title: '全栈开发工程师', companyName: '美团',
    location: '北京·朝阳区', salary: '18K-30K', jobType: '全职',
    tags: ['Node.js', 'React', 'MySQL'], createdAt: '2026-03-25', favoritedAt: '2026-04-01',
  },
  {
    id: 104, favoriteId: 4, title: '数据分析实习生', companyName: '网易',
    location: '杭州·滨江区', salary: '200-300/天', jobType: '实习',
    tags: ['Python', 'SQL', '数据分析'], createdAt: '2026-03-20', favoritedAt: '2026-03-28',
  },
];

const mockCourses: FavoriteCourse[] = [
  {
    id: 201, favoriteId: 5, title: 'React 19 从入门到精通', mentorName: '王教授',
    category: '前端开发', price: 199, rating: 4.8, studentCount: 1256,
    coverImage: '', favoritedAt: '2026-04-04',
  },
  {
    id: 202, favoriteId: 6, title: '大厂面试算法突击班', mentorName: '李总监',
    category: '算法面试', price: 399, rating: 4.9, studentCount: 2340,
    coverImage: '', favoritedAt: '2026-04-02',
  },
  {
    id: 203, favoriteId: 7, title: '产品经理入门：从0到1', mentorName: '张导师',
    category: '产品经理', price: 149, rating: 4.6, studentCount: 890,
    coverImage: '', favoritedAt: '2026-03-30',
  },
];

const mockMentors: FavoriteMentor[] = [
  {
    id: 301, favoriteId: 8, name: '王教授', title: '南京大学计算机学院·副教授',
    specialty: ['前端开发', 'React', '简历辅导'], rating: 4.9, reviewCount: 128,
    price: 299, avatar: '', favoritedAt: '2026-04-03',
  },
  {
    id: 302, favoriteId: 9, name: '李总监', title: '阿里巴巴·技术总监',
    specialty: ['系统设计', '职业规划', '大厂面试'], rating: 4.8, reviewCount: 95,
    price: 499, avatar: '', favoritedAt: '2026-03-29',
  },
  {
    id: 303, favoriteId: 10, name: '陈老师', title: '东南大学·就业指导中心主任',
    specialty: ['职业规划', '考研指导', '就业分析'], rating: 4.7, reviewCount: 67,
    price: 159, avatar: '', favoritedAt: '2026-03-25',
  },
];

const tabItems: { key: FavoriteTab; label: string; icon: React.ElementType }[] = [
  { key: 'jobs', label: '职位', icon: Briefcase },
  { key: 'courses', label: '课程', icon: BookOpen },
  { key: 'mentors', label: '导师', icon: User },
];

export default function Favorites() {
  const [activeTab, setActiveTab] = useState<FavoriteTab>('jobs');
  const [jobs, setJobs] = useState<FavoriteJob[]>([]);
  const [courses, setCourses] = useState<FavoriteCourse[]>([]);
  const [mentors, setMentors] = useState<FavoriteMentor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{id: number; name: string; type: FavoriteTab} | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchFavorites();
  }, []);

  async function fetchFavorites() {
    try {
      setLoading(true);
      const res = await http.get('/student/favorites');
      if (res.data?.code === 200 && res.data.data) {
        const data = res.data.data;
        if (data.jobs) setJobs(data.jobs);
        if (data.courses) setCourses(data.courses);
        if (data.mentors) setMentors(data.mentors);
      }
    } catch (err) {
      setError('数据加载失败，请刷新重试');
      if (import.meta.env.DEV) console.error('[DEV] API error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function removeFavorite(favoriteId: number, type: FavoriteTab) {
    try {
      await http.delete(`/student/favorites/${favoriteId}`);
    } catch {
      // API 未就绪，直接操作本地状态
    }
    // 更新本地状态
    if (type === 'jobs') setJobs(prev => prev.filter(j => j.favoriteId !== favoriteId));
    if (type === 'courses') setCourses(prev => prev.filter(c => c.favoriteId !== favoriteId));
    if (type === 'mentors') setMentors(prev => prev.filter(m => m.favoriteId !== favoriteId));
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      await removeFavorite(deleteTarget.id, deleteTarget.type);
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  }

  // 各 Tab 的数据量
  const tabCounts: Record<FavoriteTab, number> = {
    jobs: jobs.length,
    courses: courses.length,
    mentors: mentors.length,
  };

  // 空状态组件
  function EmptyState({ type }: { type: FavoriteTab }) {
    const messages: Record<FavoriteTab, { text: string; link: string; linkText: string }> = {
      jobs: { text: '暂无收藏的职位', link: '/jobs', linkText: '去浏览职位' },
      courses: { text: '暂无收藏的课程', link: '/courses', linkText: '去浏览课程' },
      mentors: { text: '暂无收藏的导师', link: '/mentors', linkText: '去浏览导师' },
    };
    const msg = messages[type];
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-xl p-16 shadow-sm border border-gray-100 text-center"
      >
        <Heart className="w-16 h-16 text-gray-200 mx-auto mb-4" />
        <p className="text-gray-500 text-sm">{msg.text}</p>
        <p className="text-xs text-gray-400 mt-1">浏览内容时点击爱心即可收藏</p>
        <Link to={msg.link} className="inline-block mt-4 text-sm text-primary-600 hover:text-primary-700 font-medium">
          {msg.linkText} →
        </Link>
      </motion.div>
    );
  }

  // 搜索过滤
  const keyword = searchKeyword.toLowerCase();
  const filteredJobs = jobs.filter(j => !keyword || j.title.toLowerCase().includes(keyword) || j.companyName.toLowerCase().includes(keyword));
  const filteredCourses = courses.filter(c => !keyword || c.title.toLowerCase().includes(keyword) || c.mentorName.toLowerCase().includes(keyword));
  const filteredMentors = mentors.filter(m => !keyword || m.name.toLowerCase().includes(keyword) || m.title.toLowerCase().includes(keyword));

  if (loading) return <div className="max-w-5xl mx-auto px-4 py-8"><ListSkeleton count={5} /></div>;
  if (error) return <div className="max-w-5xl mx-auto px-4 py-8"><ErrorState message={error} onRetry={() => { setError(null); fetchFavorites(); }} onLoadMockData={() => { setJobs(mockJobs); setCourses(mockCourses); setMentors(mockMentors); setError(null); }} /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">我的收藏</h1>
          <p className="text-gray-500 mt-1">
            已收藏 {jobs.length + courses.length + mentors.length} 个内容
          </p>
        </div>
        {/* 视图切换 */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tab 切换 + 搜索 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          {tabItems.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-all relative ${
                  isActive ? 'text-primary-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                <Tag
                  variant={isActive ? 'primary' : 'gray'}
                  size="sm"
                >
                  {tabCounts[tab.key]}
                </Tag>
                {isActive && (
                  <motion.div
                    layoutId="favTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500"
                  />
                )}
              </button>
            );
          })}
        </div>
        {/* 搜索栏 */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
              placeholder={`搜索收藏的${activeTab === 'jobs' ? '职位' : activeTab === 'courses' ? '课程' : '导师'}...`}
            />
          </div>
        </div>
      </div>

      {/* ===== 职位收藏 ===== */}
      <AnimatePresence mode="wait">
        {activeTab === 'jobs' && (
          <motion.div
            key="jobs"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {filteredJobs.length === 0 ? (
              <EmptyState type="jobs" />
            ) : (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}>
                {filteredJobs.map((job, i) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <Link to={`/jobs/${job.id}`} className="group/link">
                          <h3 className="text-base font-bold text-gray-900 group-hover/link:text-primary-600 transition-colors flex items-center gap-1">
                            {job.title}
                            <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                          </h3>
                        </Link>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Building2 className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-sm text-gray-600">{job.companyName}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {job.location}
                          </span>
                          <span className="text-primary-600 font-medium">{job.salary}</span>
                          <Tag variant="gray" size="sm">{job.jobType}</Tag>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {job.tags.map(tag => (
                            <Tag key={tag} variant="primary" size="sm">
                              {tag}
                            </Tag>
                          ))}
                        </div>
                      </div>
                      {/* 取消收藏 */}
                      <button
                        onClick={() => setDeleteTarget({ id: job.favoriteId, name: job.title, type: 'jobs' })}
                        className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                        title="取消收藏"
                      >
                        <Heart className="w-5 h-5 fill-current" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                      <span className="text-xs text-gray-400">收藏于 {job.favoritedAt}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ===== 课程收藏 ===== */}
        {activeTab === 'courses' && (
          <motion.div
            key="courses"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {filteredCourses.length === 0 ? (
              <EmptyState type="courses" />
            ) : (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
                {filteredCourses.map((course, i) => (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow overflow-hidden group"
                  >
                    {/* 封面占位 */}
                    <div className="h-36 bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center relative">
                      <GraduationCap className="w-12 h-12 text-white/50" />
                      <Tag variant="gray" size="sm" className="absolute top-3 left-3 bg-white/20 backdrop-blur-sm text-white border-transparent">
                        {course.category}
                      </Tag>
                      {/* 取消收藏按钮 */}
                      <button
                        onClick={() => setDeleteTarget({ id: course.favoriteId, name: course.title, type: 'courses' })}
                        className="absolute top-3 right-3 p-1.5 bg-white/20 backdrop-blur-sm text-white rounded-full hover:bg-red-500 transition-colors"
                        title="取消收藏"
                      >
                        <Heart className="w-4 h-4 fill-current" />
                      </button>
                    </div>
                    <div className="p-4">
                      <Link to={`/courses/${course.id}`}>
                        <h3 className="text-sm font-bold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-2">
                          {course.title}
                        </h3>
                      </Link>
                      <p className="text-xs text-gray-500 mt-1.5">{course.mentorName}</p>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          <span className="text-xs font-medium text-gray-700">{course.rating}</span>
                          <span className="text-xs text-gray-400 ml-1">{course.studentCount}人学习</span>
                        </div>
                        <span className="text-sm font-bold text-primary-600">
                          {course.price === 0 ? '免费' : `¥${course.price}`}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">收藏于 {course.favoritedAt}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ===== 导师收藏 ===== */}
        {activeTab === 'mentors' && (
          <motion.div
            key="mentors"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {filteredMentors.length === 0 ? (
              <EmptyState type="mentors" />
            ) : (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
                {filteredMentors.map((mentor, i) => (
                  <motion.div
                    key={mentor.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow group"
                  >
                    <div className="flex items-start gap-4">
                      {/* 导师头像 */}
                      <div className="w-14 h-14 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-xl font-bold text-white">{mentor.name.charAt(0)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <Link to={`/mentors/${mentor.id}`}>
                            <h3 className="text-base font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                              {mentor.name}
                            </h3>
                          </Link>
                          <button
                            onClick={() => setDeleteTarget({ id: mentor.favoriteId, name: mentor.name, type: 'mentors' })}
                            className="p-1.5 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                            title="取消收藏"
                          >
                            <Heart className="w-4 h-4 fill-current" />
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{mentor.title}</p>
                      </div>
                    </div>

                    {/* 专长标签 */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {mentor.specialty.map(tag => (
                        <Tag key={tag} variant="primary" size="sm">
                          {tag}
                        </Tag>
                      ))}
                    </div>

                    {/* 底部信息 */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          <span className="font-medium text-gray-700">{mentor.rating}</span>
                        </span>
                        <span>{mentor.reviewCount} 条评价</span>
                      </div>
                      <span className="text-sm font-bold text-primary-600">¥{mentor.price}/次</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">收藏于 {mentor.favoritedAt}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 取消收藏确认弹窗 */}
      <ConfirmDialog
        open={!!deleteTarget}
        variant="warning"
        title="确认取消收藏"
        description="取消收藏后可重新收藏"
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
