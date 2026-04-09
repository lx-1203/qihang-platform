import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Star, Clock, BookOpen, Users, Play, ArrowLeft, Heart, Share2, Loader2, AlertCircle, Tag, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import http from '@/api/http';
import { useAuthStore } from '@/store/auth';

// 课程详情数据结构（匹配后端 courses 表）
interface CourseDetailData {
  id: number;
  title: string;
  mentor_id: number;
  mentor_name: string;
  mentor: string; // 后端兼容字段
  description: string;
  category: string;
  cover: string;
  video_url: string;
  duration: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  views: string;
  rating: string;
  rating_count: number;
  price: number;
  status: string;
  created_at: string;
}

// 推荐课程
interface RelatedCourse {
  id: number;
  title: string;
  mentor_name: string;
  cover: string;
  views: string;
  rating: string;
  price: number;
}

// 难度标签映射
const difficultyMap: Record<string, { label: string; color: string }> = {
  beginner: { label: '入门', color: 'bg-green-100 text-green-700' },
  intermediate: { label: '进阶', color: 'bg-blue-100 text-blue-700' },
  advanced: { label: '高级', color: 'bg-purple-100 text-purple-700' },
};

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const [course, setCourse] = useState<CourseDetailData | null>(null);
  const [relatedCourses, setRelatedCourses] = useState<RelatedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFavorited, setIsFavorited] = useState(false);

  // 获取课程详情
  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await http.get(`/courses/${id}`);
        setCourse(res.data);
      } catch (err: any) {
        console.error('获取课程详情失败:', err);
        if (err?.code === 404 || err?.response?.status === 404) {
          setError('课程不存在或已下架');
        } else {
          setError('加载失败，请稍后重试');
        }
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchCourse();
    }
  }, [id]);

  // 获取相关课程（同分类）
  useEffect(() => {
    const fetchRelated = async () => {
      if (!course?.category) return;
      try {
        const res = await http.get('/courses', {
          params: { category: course.category, pageSize: 4 }
        });
        // 排除当前课程
        const filtered = (res.data.courses || []).filter((c: RelatedCourse) => c.id !== course.id);
        setRelatedCourses(filtered.slice(0, 3));
      } catch (err) {
        console.error('获取相关课程失败:', err);
      }
    };

    if (course) {
      fetchRelated();
    }
  }, [course]);

  // 收藏/取消收藏
  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/courses/${id}` } });
      return;
    }

    try {
      if (isFavorited) {
        await http.delete('/student/favorites', { data: { target_type: 'course', target_id: course?.id } });
      } else {
        await http.post('/student/favorites', { target_type: 'course', target_id: course?.id });
      }
      setIsFavorited(!isFavorited);
    } catch (err: any) {
      console.error('收藏操作失败:', err);
    }
  };

  // 加载状态
  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">加载课程信息中...</p>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error || !course) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">{error || '课程不存在'}</h2>
          <p className="text-gray-500 mb-6">可能该课程已下架或链接有误</p>
          <Link to="/courses" className="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium">
            ← 返回课程列表
          </Link>
        </div>
      </div>
    );
  }

  const difficulty = difficultyMap[course.difficulty] || difficultyMap.beginner;

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* 顶部面包屑 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link to="/courses" className="hover:text-primary-600 transition-colors flex items-center gap-1">
              <ArrowLeft size={16} />
              课程列表
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium truncate max-w-xs">{course.title}</span>
          </div>
        </div>
      </div>

      {/* 课程头部 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* 课程封面/视频 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full lg:w-[480px] flex-shrink-0"
            >
              <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-900 shadow-lg group">
                {course.cover ? (
                  <img
                    src={course.cover}
                    alt={course.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center">
                    <BookOpen size={64} className="text-white/30" />
                  </div>
                )}
                {/* 播放按钮遮罩 */}
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center text-primary-600 pl-1 shadow-lg transform group-hover:scale-110 transition-transform">
                    <Play fill="currentColor" size={28} />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* 课程信息 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col"
            >
              <div className="flex items-start gap-3 mb-4">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${difficulty.color}`}>
                  {difficulty.label}
                </span>
                {course.category && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    {course.category}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">{course.title}</h1>

              {/* 讲师信息 */}
              {(course.mentor_name || course.mentor) && (
                <Link
                  to={course.mentor_id ? `/mentors/${course.mentor_id}` : '#'}
                  className="flex items-center gap-2 mb-4 text-gray-600 hover:text-primary-600 transition-colors w-fit"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-sm font-bold">
                    {(course.mentor_name || course.mentor)?.charAt(0)}
                  </div>
                  <span className="font-medium">{course.mentor_name || course.mentor}</span>
                </Link>
              )}

              {/* 统计信息 */}
              <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 mb-6">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400" fill="currentColor" />
                  <span className="font-medium text-gray-900">{course.rating}</span>
                  {course.rating_count > 0 && <span>({course.rating_count}人评价)</span>}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{course.views} 次学习</span>
                </div>
                {course.duration && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{course.duration}</span>
                  </div>
                )}
              </div>

              {/* 标签 */}
              {course.tags && course.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {course.tags.map((tag, index) => (
                    <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-medium">
                      <Tag size={12} />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* 价格 + 操作按钮 */}
              <div className="mt-auto flex items-center gap-4">
                <div className="text-2xl font-bold">
                  {course.price === 0 ? (
                    <span className="text-green-500">免费</span>
                  ) : (
                    <span className="text-orange-500">¥{course.price}</span>
                  )}
                </div>
                <button className="bg-primary-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors shadow-sm">
                  {course.price === 0 ? '免费学习' : '立即购买'}
                </button>
                <button
                  onClick={handleToggleFavorite}
                  className={`p-3 rounded-lg border transition-colors ${
                    isFavorited
                      ? 'border-red-200 bg-red-50 text-red-500'
                      : 'border-gray-300 bg-white text-gray-500 hover:text-red-500 hover:border-red-200'
                  }`}
                >
                  <Heart size={20} fill={isFavorited ? 'currentColor' : 'none'} />
                </button>
                <button className="p-3 rounded-lg border border-gray-300 bg-white text-gray-500 hover:text-primary-600 hover:border-primary-200 transition-colors">
                  <Share2 size={20} />
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* 课程详情内容 */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
        {/* 左侧主内容 */}
        <div className="flex-1 space-y-8">
          {/* 课程简介 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
          >
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BookOpen size={20} className="text-primary-600" />
              课程简介
            </h2>
            <div className="text-gray-600 leading-relaxed whitespace-pre-line">
              {course.description || '暂无课程描述。'}
            </div>
          </motion.div>

          {/* 课程信息 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
          >
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 size={20} className="text-primary-600" />
              课程信息
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-primary-600">{course.views}</div>
                <div className="text-sm text-gray-500 mt-1">学习人次</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-500 flex items-center justify-center gap-1">
                  <Star size={18} fill="currentColor" /> {course.rating}
                </div>
                <div className="text-sm text-gray-500 mt-1">课程评分</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{course.duration || '—'}</div>
                <div className="text-sm text-gray-500 mt-1">课程时长</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className={`text-lg font-bold ${difficulty.color} inline-block px-3 py-0.5 rounded-full`}>{difficulty.label}</div>
                <div className="text-sm text-gray-500 mt-1">难度级别</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* 右侧推荐 */}
        <div className="w-full lg:w-80">
          {/* 讲师卡片 */}
          {(course.mentor_name || course.mentor) && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4">讲师信息</h3>
              <Link
                to={course.mentor_id ? `/mentors/${course.mentor_id}` : '#'}
                className="flex items-center gap-4 group"
              >
                <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xl font-bold group-hover:bg-primary-200 transition-colors">
                  {(course.mentor_name || course.mentor)?.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                    {course.mentor_name || course.mentor}
                  </div>
                  <div className="text-sm text-primary-600 mt-1">查看导师详情 →</div>
                </div>
              </Link>
            </motion.div>
          )}

          {/* 相关课程推荐 */}
          {relatedCourses.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4">相关课程推荐</h3>
              <div className="space-y-4">
                {relatedCourses.map((rc) => (
                  <Link key={rc.id} to={`/courses/${rc.id}`} className="group block">
                    <div className="flex gap-3">
                      {rc.cover ? (
                        <img src={rc.cover} alt={rc.title} className="w-20 h-14 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-20 h-14 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <BookOpen size={18} className="text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-primary-600 transition-colors">
                          {rc.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <span className="flex items-center gap-0.5">
                            <Star size={10} className="text-yellow-400" fill="currentColor" />
                            {rc.rating}
                          </span>
                          <span>{rc.views}次学习</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
