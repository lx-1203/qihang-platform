import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Briefcase, BookOpen, User,
  MapPin, Building2, Star,
  GraduationCap,
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

const tabItems: { key: FavoriteTab; label: string; icon: React.ElementType }[] = [
  { key: 'jobs', label: '职位', icon: Briefcase },
  { key: 'courses', label: '课程', icon: BookOpen },
  { key: 'mentors', label: '导师', icon: User },
];

function normalizeStringArray(value: unknown) {
  if (Array.isArray(value)) return value.map(item => String(item)).filter(Boolean);
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(item => String(item)).filter(Boolean);
    } catch {
      return value.split(/[、,，]/).map(item => item.trim()).filter(Boolean);
    }
  }
  return [] as string[];
}

function normalizeFavoriteJob(item: Record<string, unknown>): FavoriteJob {
  return {
    id: Number(item.target_id || item.job_id || item.id || 0),
    favoriteId: Number(item.favorite_id || item.id || 0),
    title: String(item.title || item.job_title || ''),
    companyName: String(item.company_name || item.companyName || item.subtitle || ''),
    location: String(item.location || item.job_location || ''),
    salary: String(item.salary || item.job_salary || item.extra || ''),
    jobType: String(item.job_type || item.jobType || ''),
    tags: normalizeStringArray(item.tags),
    createdAt: String(item.created_at || ''),
    favoritedAt: String(item.favorited_at || item.created_at || ''),
  };
}

function normalizeFavoriteCourse(item: Record<string, unknown>): FavoriteCourse {
  return {
    id: Number(item.target_id || item.course_id || item.id || 0),
    favoriteId: Number(item.favorite_id || item.id || 0),
    title: String(item.title || item.course_title || ''),
    mentorName: String(item.mentor_name || item.mentorName || item.subtitle || ''),
    category: String(item.category || ''),
    price: Number(item.price || item.extra || 0),
    rating: Number(item.rating || 0),
    studentCount: Number(item.student_count || 0),
    coverImage: String(item.cover || item.cover_image || item.image || ''),
    favoritedAt: String(item.favorited_at || item.created_at || ''),
  };
}

function normalizeFavoriteMentor(item: Record<string, unknown>): FavoriteMentor {
  return {
    id: Number(item.target_id || item.mentor_id || item.id || 0),
    favoriteId: Number(item.favorite_id || item.id || 0),
    name: String(item.name || item.mentor_name || item.title || ''),
    title: String(item.mentor_title || item.subtitle || item.title_text || item.title || ''),
    specialty: normalizeStringArray(item.specialty || item.expertise),
    rating: Number(item.rating || item.extra || 0),
    reviewCount: Number(item.review_count || item.rating_count || 0),
    price: Number(item.price || 0),
    avatar: String(item.avatar || item.image || ''),
    favoritedAt: String(item.favorited_at || item.created_at || ''),
  };
}

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
      setError(null);
      const res = await http.get('/student/favorites');
      const data = res.data?.data;

      if (!data) {
        setJobs([]);
        setCourses([]);
        setMentors([]);
        if (res.data?.code === 200) return;
        setError('数据加载失败，请刷新重试');
        return;
      }

      if (Array.isArray(data.jobs) || Array.isArray(data.courses) || Array.isArray(data.mentors)) {
        setJobs(Array.isArray(data.jobs) ? data.jobs.map((item: Record<string, unknown>) => normalizeFavoriteJob(item)) : []);
        setCourses(Array.isArray(data.courses) ? data.courses.map((item: Record<string, unknown>) => normalizeFavoriteCourse(item)) : []);
        setMentors(Array.isArray(data.mentors) ? data.mentors.map((item: Record<string, unknown>) => normalizeFavoriteMentor(item)) : []);
        return;
      }

      const list = Array.isArray(data.list)
        ? data.list
        : Array.isArray(data.favorites)
          ? data.favorites
          : Array.isArray(data)
            ? data
            : [];

      setJobs(list
        .filter((item: Record<string, unknown>) => item.target_type === 'job')
        .map((item: Record<string, unknown>) => normalizeFavoriteJob(item)));

      setCourses(list
        .filter((item: Record<string, unknown>) => item.target_type === 'course')
        .map((item: Record<string, unknown>) => normalizeFavoriteCourse(item)));

      setMentors(list
        .filter((item: Record<string, unknown>) => item.target_type === 'mentor')
        .map((item: Record<string, unknown>) => normalizeFavoriteMentor(item)));
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
  function EmptyState({ type, isSearchResult = false }: { type: FavoriteTab; isSearchResult?: boolean }) {
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
        <p className="text-gray-500 text-sm">{isSearchResult ? '没有找到匹配的收藏内容' : msg.text}</p>
        <p className="text-xs text-gray-400 mt-1">
          {isSearchResult ? '试试更换关键词，或切换到其他分类查看' : '浏览内容时点击爱心即可收藏'}
        </p>
        {isSearchResult ? (
          <button
            onClick={() => setSearchKeyword('')}
            className="inline-block mt-4 text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            清空搜索
          </button>
        ) : (
          <Link to={msg.link} className="inline-block mt-4 text-sm text-primary-600 hover:text-primary-700 font-medium">
            {msg.linkText} →
          </Link>
        )}
      </motion.div>
    );
  }

  const hasFavorites = jobs.length + courses.length + mentors.length > 0;

  // 搜索过滤
  const keyword = searchKeyword.toLowerCase();
  const filteredJobs = jobs.filter(j => !keyword || j.title.toLowerCase().includes(keyword) || j.companyName.toLowerCase().includes(keyword));
  const filteredCourses = courses.filter(c => !keyword || c.title.toLowerCase().includes(keyword) || c.mentorName.toLowerCase().includes(keyword));
  const filteredMentors = mentors.filter(m => !keyword || m.name.toLowerCase().includes(keyword) || m.title.toLowerCase().includes(keyword));

  if (loading) return <div className="max-w-5xl mx-auto px-4 py-8"><ListSkeleton count={5} /></div>;
  if (error) return <div className="max-w-5xl mx-auto px-4 py-8"><ErrorState message={error} onRetry={() => { setError(null); fetchFavorites(); }} /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">我的收藏</h1>
          <p className="text-gray-500 mt-1">
            {hasFavorites ? `已收藏 ${jobs.length + courses.length + mentors.length} 个内容` : '还没有收藏任何内容'}
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
              <EmptyState type="jobs" isSearchResult={jobs.length > 0 && !!keyword} />
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
              <EmptyState type="courses" isSearchResult={courses.length > 0 && !!keyword} />
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
              <EmptyState type="mentors" isSearchResult={mentors.length > 0 && !!keyword} />
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
