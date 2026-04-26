import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Star, Clock, BookOpen, Users, Play, ArrowLeft, Heart, Share2, ThumbsUp, Loader2, AlertCircle, Tag as TagIcon, BarChart3 } from 'lucide-react';
import TagComponent from '@/components/ui/Tag';
import { motion } from 'framer-motion';
import http from '@/api/http';
import { DIFFICULTY_MAP, DEFAULT_AVATAR } from '@/constants';
import { useAuthStore } from '@/store/auth';
import { showToast } from '@/components/ui/ToastContainer';

// 课程详情数据结构（匹配后端 courses 表）
interface CourseDetailData {
  id: number;
  title: string;
  mentor_id: number;
  mentor_name: string;
  mentor: string; // 后端兼容字段
  mentor_avatar?: string; // 后端 JOIN mentor_profiles 返回的最新头像
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
  /** 后端附加：当前用户是否已收藏（登录时） */
  is_favorited?: boolean;
  /** 后端附加：收藏记录 ID（已收藏时） */
  favorite_id?: number;
  /** 后端附加：点赞数 */
  like_count?: number;
  /** 后端附加：当前用户是否已点赞（登录时） */
  is_liked?: boolean;
  /** 后端附加：点赞记录 ID（已点赞时） */
  like_id?: number;
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

// 难度标签映射（使用统一常量，CourseDetail 页使用不同色阶）
const difficultyMap: Record<string, { label: string; color: string }> = {
  beginner: { label: DIFFICULTY_MAP.beginner.label, color: 'bg-green-100 text-green-700' },
  intermediate: { label: DIFFICULTY_MAP.intermediate.label, color: 'bg-blue-100 text-blue-700' },
  advanced: { label: DIFFICULTY_MAP.advanced.label, color: 'bg-primary-100 text-primary-700' },
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
  const [favoriteId, setFavoriteId] = useState<number | null>(null);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeId, setLikeId] = useState<number | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // 获取课程详情
  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await http.get(`/courses/${id}`);
        // 后端返回 { code: 200, data: course }，需取 res.data.data
        const courseData = res.data?.data || res.data;
        setCourse(courseData);
        // 从后端附加字段初始化收藏状态
        if (courseData?.is_favorited) {
          setIsFavorited(true);
          setFavoriteId(courseData.favorite_id ?? null);
        }
        // 初始化点赞状态
        if (courseData?.is_liked) {
          setIsLiked(true);
          setLikeId(courseData.like_id ?? null);
        }
        if (typeof courseData?.like_count === 'number') {
          setLikeCount(courseData.like_count);
        }
      } catch (err: unknown) {
        console.error('获取课程详情失败:', err);
        const error = err as { code?: number; response?: { status?: number } };
        if (error?.code === 404 || error?.response?.status === 404) {
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

  // 页面重新可见时刷新（头像/Logo 变更后同步）
  useEffect(() => {
    const handleFocus = () => { if (id) { http.get(`/courses/${id}`).then(res => { const d = res.data?.data || res.data; if (d) setCourse(d); }).catch(() => {}); } };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [id]);

  // 获取相关课程（同分类）
  useEffect(() => {
    const fetchRelated = async () => {
      if (!course?.category) return;
      try {
        const res = await http.get('/courses', {
          params: { category: course.category, pageSize: 4 }
        });
        // 后端返回 { code: 200, data: { courses: [...] } }
        const courseList = res.data?.data?.courses || res.data?.courses || [];
        // 排除当前课程
        const filtered = courseList.filter((c: RelatedCourse) => c.id !== course.id);
        setRelatedCourses(filtered.slice(0, 3));
      } catch (err) {
        console.error('获取相关课程失败:', err);
      }
    };

    if (course) {
      fetchRelated();
    }
  }, [course]);

  // 检查当前课程是否已收藏（登录时通过收藏列表查询）
  useEffect(() => {
    if (!isAuthenticated || !course?.id) return;
    // 如果后端已返回 is_favorited，则跳过查询
    if (course.is_favorited !== undefined) return;

    const checkFavorite = async () => {
      try {
        const res = await http.get('/student/favorites', { params: { type: 'course' } });
        const favorites = res.data?.data?.favorites || res.data?.favorites || [];
        const found = favorites.find(
          (f: { target_type: string; target_id: number; id: number }) =>
            f.target_type === 'course' && f.target_id === course.id
        );
        if (found) {
          setIsFavorited(true);
          setFavoriteId(found.id);
        }
      } catch {
        // 未登录或查询失败，保持默认状态
      }
    };

    checkFavorite();
  }, [isAuthenticated, course?.id, course?.is_favorited]);

  // 检查当前课程是否已点赞（登录时通过收藏列表查询）
  useEffect(() => {
    if (!isAuthenticated || !course?.id) return;
    // 如果后端已返回 is_liked，则跳过查询
    if (course.is_liked !== undefined) return;

    const checkLike = async () => {
      try {
        const res = await http.get('/student/favorites', { params: { type: 'course_like' } });
        const favorites = res.data?.data?.favorites || res.data?.favorites || [];
        const found = favorites.find(
          (f: { target_type: string; target_id: number; id: number }) =>
            f.target_type === 'course_like' && f.target_id === course.id
        );
        if (found) {
          setIsLiked(true);
          setLikeId(found.id);
        }
      } catch {
        // 未登录或查询失败，保持默认状态
      }
    };

    checkLike();
  }, [isAuthenticated, course?.id, course?.is_liked]);

  // 收藏/取消收藏
  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/courses/${id}` } });
      return;
    }

    if (favoriteLoading) return; // 防止重复点击

    setFavoriteLoading(true);
    try {
      if (isFavorited && favoriteId) {
        // 取消收藏：后端 DELETE /student/favorites/:id
        await http.delete(`/student/favorites/${favoriteId}`);
        showToast({ type: 'success', title: '已取消收藏', message: '课程已从收藏列表中移除' });
        setIsFavorited(false);
        setFavoriteId(null);
      } else if (!isFavorited) {
        // 添加收藏：后端 POST /student/favorites
        const res = await http.post('/student/favorites', { target_type: 'course', target_id: course?.id });
        const newFavorite = res.data?.data || res.data;
        showToast({ type: 'success', title: '收藏成功', message: '课程已添加到收藏列表' });
        setIsFavorited(true);
        setFavoriteId(newFavorite?.id ?? null);
      } else {
        // 边界情况：isFavorited=true 但 favoriteId=null，重新同步状态
        showToast({ type: 'warning', title: '状态同步中', message: '正在重新获取收藏状态' });
        const res = await http.get('/student/favorites', { params: { type: 'course' } });
        const favorites = res.data?.data?.favorites || res.data?.favorites || [];
        const found = favorites.find(
          (f: { target_type: string; target_id: number; id: number }) =>
            f.target_type === 'course' && f.target_id === course?.id
        );
        if (found) {
          setFavoriteId(found.id);
          // 用找到的 favoriteId 执行取消收藏
          await http.delete(`/student/favorites/${found.id}`);
          showToast({ type: 'success', title: '已取消收藏', message: '课程已从收藏列表中移除' });
          setIsFavorited(false);
          setFavoriteId(null);
        } else {
          // 服务端无此收藏记录，重置本地状态
          setIsFavorited(false);
          setFavoriteId(null);
        }
      }
    } catch (err: unknown) {
      console.error('收藏操作失败:', err);
      const error = err as { response?: { status?: number }; code?: number };
      const errCode = error?.response?.status || error?.code;

      if (errCode === 409) {
        // 409 表示已收藏过，视为成功并同步 favoriteId（避免下次点击卡死）
        setIsFavorited(true);
        try {
          const syncRes = await http.get('/student/favorites', { params: { type: 'course' } });
          const favs = syncRes.data?.data?.favorites || syncRes.data?.favorites || [];
          const found = favs.find(
            (f: { target_type: string; target_id: number; id: number }) =>
              f.target_type === 'course' && f.target_id === course?.id
          );
          if (found) setFavoriteId(found.id);
        } catch { /* 同步失败不影响主流程，下次点击会走 else 分支重新同步 */ }
        showToast({ type: 'info', title: '已收藏', message: '该课程已在收藏列表中' });
      } else if (errCode === 404) {
        // 404 表示收藏记录不存在，重置本地状态保持一致（拦截器已显示通用提示）
        setIsFavorited(false);
        setFavoriteId(null);
      } else {
        // 其他错误：拦截器已对 403/500 等显示通用 Toast，此处仅兜底
        if (errCode !== 403 && errCode !== 500 && errCode !== 502 && errCode !== 503) {
          showToast({ type: 'error', title: '操作失败', message: '请稍后重试' });
        }
      }
    } finally {
      setFavoriteLoading(false);
    }
  };

  // 分享课程（复制链接到剪贴板）
  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      showToast({ type: 'success', title: '链接已复制', message: '课程链接已复制到剪贴板，快去分享给好友吧' });
    } catch {
      // 降级方案：使用 fallback（需 focus + select 才能兼容更多浏览器）
      try {
        const input = document.createElement('input');
        input.value = url;
        input.style.position = 'fixed';
        input.style.left = '-9999px';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.focus();
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        showToast({ type: 'success', title: '链接已复制', message: '课程链接已复制到剪贴板' });
      } catch {
        showToast({ type: 'error', title: '复制失败', message: '请手动复制浏览器地址栏链接' });
      }
    }
  };

  // 点赞/取消点赞
  const handleToggleLike = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/courses/${id}` } });
      return;
    }

    if (likeLoading) return; // 防止重复点击

    setLikeLoading(true);
    try {
      if (isLiked && likeId) {
        // 取消点赞：后端 DELETE /student/favorites/:id
        await http.delete(`/student/favorites/${likeId}`);
        showToast({ type: 'success', title: '已取消点赞', message: '课程已从点赞列表中移除' });
        setIsLiked(false);
        setLikeId(null);
        setLikeCount((prev) => Math.max(0, prev - 1));
      } else if (!isLiked) {
        // 添加点赞：后端 POST /student/favorites
        const res = await http.post('/student/favorites', { target_type: 'course_like', target_id: course?.id });
        const newLike = res.data?.data || res.data;
        showToast({ type: 'success', title: '点赞成功', message: '感谢您的点赞' });
        setIsLiked(true);
        setLikeId(newLike?.id ?? null);
        setLikeCount((prev) => prev + 1);
      } else {
        // 边界情况：isLiked=true 但 likeId=null，重新同步状态
        showToast({ type: 'warning', title: '状态同步中', message: '正在重新获取点赞状态' });
        const res = await http.get('/student/favorites', { params: { type: 'course_like' } });
        const favorites = res.data?.data?.favorites || res.data?.favorites || [];
        const found = favorites.find(
          (f: { target_type: string; target_id: number; id: number }) =>
            f.target_type === 'course_like' && f.target_id === course?.id
        );
        if (found) {
          setLikeId(found.id);
          await http.delete(`/student/favorites/${found.id}`);
          showToast({ type: 'success', title: '已取消点赞', message: '课程已从点赞列表中移除' });
          setIsLiked(false);
          setLikeId(null);
          setLikeCount((prev) => Math.max(0, prev - 1));
        } else {
          setIsLiked(false);
          setLikeId(null);
        }
      }
    } catch (err: unknown) {
      console.error('点赞操作失败:', err);
      const error = err as { response?: { status?: number }; code?: number };
      if (error?.response?.status === 409 || error?.code === 409) {
        setIsLiked(true);
        showToast({ type: 'info', title: '已点赞', message: '您已经点过赞了' });
      } else {
        showToast({ type: 'error', title: '操作失败', message: '请稍后重试' });
      }
    } finally {
      setLikeLoading(false);
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
                {isPlaying && course.video_url ? (
                  // 视频播放中：根据 URL 类型选择播放器
                  course.video_url.includes('youtube.com') ||
                  course.video_url.includes('youtu.be') ||
                  course.video_url.includes('bilibili.com') ||
                  course.video_url.includes('player.bilibili.com') ||
                  course.video_url.includes('v.qq.com') ||
                  course.video_url.includes('vimeo.com') ? (
                    // 外部嵌入视频（YouTube / Bilibili / 腾讯视频 / Vimeo）
                    <iframe
                      src={course.video_url}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={course.title}
                    />
                  ) : (
                    // 本地/直接视频文件（HTML5 video）
                    <video
                      ref={videoRef}
                      src={course.video_url}
                      className="w-full h-full object-contain"
                      controls
                      autoPlay
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onEnded={() => setIsPlaying(false)}
                      onError={() => {
                        setIsPlaying(false);
                        showToast({ type: 'error', title: '视频加载失败', message: '该视频暂无法播放，请稍后重试' });
                      }}
                    />
                  )
                ) : (
                  // 封面图 + 播放按钮（点击触发播放）
                  <>
                    {course.cover ? (
                      <img
                        src={course.cover}
                        alt={course.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder-cover.svg';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center">
                        <BookOpen size={64} className="text-white/30" />
                      </div>
                    )}
                    {/* 播放按钮遮罩 */}
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (course.video_url) {
                            setIsPlaying(true);
                          } else {
                            showToast({ type: 'info', title: '暂无视频', message: '该课程尚未上传视频，请查看课程简介' });
                          }
                        }}
                        className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center text-primary-600 pl-1 shadow-lg transform group-hover:scale-110 transition-transform cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-400"
                      >
                        <Play fill="currentColor" size={28} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>

            {/* 课程信息 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col"
            >
              <div className="flex items-start gap-3 mb-4">
                <TagComponent
                  variant={course.difficulty === 'beginner' ? 'green' : course.difficulty === 'intermediate' ? 'blue' : 'purple'}
                  size="md"
                >
                  {difficulty.label}
                </TagComponent>
                {course.category && (
                  <TagComponent variant="gray" size="md">
                    {course.category}
                  </TagComponent>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">{course.title}</h1>

              {/* 讲师信息 */}
              {(course.mentor_name || course.mentor) && (
                <Link
                  to={course.mentor_id ? `/mentors/${course.mentor_id}` : '#'}
                  className="flex items-center gap-2 mb-4 text-gray-600 hover:text-primary-600 transition-colors w-fit"
                >
                  <img
                    src={course.mentor_avatar || DEFAULT_AVATAR}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR; }}
                  />
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
                {typeof likeCount === 'number' && likeCount > 0 && (
                  <div className="flex items-center gap-1">
                    <ThumbsUp className="w-4 h-4" />
                    <span>{likeCount} 次点赞</span>
                  </div>
                )}
              </div>

              {/* 标签 */}
              {course.tags && course.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {course.tags.map((tag, index) => (
                    <TagComponent key={index} variant="primary" size="md" className="inline-flex items-center gap-1">
                      <TagIcon size={12} />
                      {tag}
                    </TagComponent>
                  ))}
                </div>
              )}

              {/* 价格 + 操作按钮 */}
              <div className="mt-auto flex items-center gap-4">
                <div className="text-2xl font-bold">
                  {Number(course.price) === 0 ? (
                    <span className="text-green-500">免费</span>
                  ) : (
                    <span className="text-orange-500">¥{course.price}</span>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (!isAuthenticated) {
                      navigate('/login', { state: { from: `/courses/${id}` } });
                      return;
                    }
                    if (Number(course.price) === 0) {
                      showToast({ type: 'success', title: '开始学习', message: '免费课程已解锁，您可以直接开始学习' });
                    } else {
                      showToast({ type: 'info', title: '课程购买', message: `课程「${course.title}」售价 ¥${course.price}，支付功能即将上线，敬请期待` });
                    }
                  }}
                  className="bg-primary-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors shadow-sm"
                >
                  {Number(course.price) === 0 ? '免费学习' : '¥' + course.price + ' 立即购买'}
                </button>
                <button
                  onClick={handleToggleFavorite}
                  disabled={favoriteLoading}
                  title={isFavorited ? '取消收藏' : '收藏课程'}
                  className={`p-3 rounded-lg border transition-colors ${
                    favoriteLoading
                      ? 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed'
                      : isFavorited
                        ? 'border-red-200 bg-red-50 text-red-500'
                        : 'border-gray-300 bg-white text-gray-500 hover:text-red-500 hover:border-red-200'
                  }`}
                >
                  {favoriteLoading ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <Heart size={20} fill={isFavorited ? 'currentColor' : 'none'} />
                  )}
                </button>
                <button
                  onClick={handleToggleLike}
                  disabled={likeLoading}
                  title={isLiked ? '取消点赞' : '点赞课程'}
                  className={`flex items-center gap-1.5 px-3 py-3 rounded-lg border transition-colors ${
                    likeLoading
                      ? 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed'
                      : isLiked
                        ? 'border-yellow-200 bg-yellow-50 text-yellow-500'
                        : 'border-gray-300 bg-white text-gray-500 hover:text-yellow-500 hover:border-yellow-200'
                  }`}
                >
                  {likeLoading ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <ThumbsUp size={20} fill={isLiked ? 'currentColor' : 'none'} />
                  )}
                  {likeCount > 0 && <span className="text-sm font-medium">{likeCount}</span>}
                </button>
                <button
                  onClick={handleShare}
                  title="复制课程链接"
                  className="p-3 rounded-lg border border-gray-300 bg-white text-gray-500 hover:text-primary-600 hover:border-primary-200 transition-colors"
                >
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
          {/* 课程视频 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
          >
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Play size={20} className="text-primary-600" />
              课程视频
            </h2>
            <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-900 group">
              {isPlaying && course.video_url ? (
                course.video_url.includes('youtube.com') ||
                course.video_url.includes('youtu.be') ||
                course.video_url.includes('bilibili.com') ||
                course.video_url.includes('player.bilibili.com') ||
                course.video_url.includes('v.qq.com') ||
                course.video_url.includes('vimeo.com') ? (
                  <iframe
                    src={course.video_url}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={course.title}
                  />
                ) : (
                  <video
                    ref={videoRef}
                    src={course.video_url}
                    className="w-full h-full object-contain"
                    controls
                    autoPlay
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                    onError={() => {
                      setIsPlaying(false);
                      showToast({ type: 'error', title: '视频加载失败', message: '该视频暂无法播放，请稍后重试' });
                    }}
                  />
                )
              ) : course.video_url ? (
                <>
                  {course.cover ? (
                    <img
                      src={course.cover}
                      alt={course.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder-cover.svg';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center">
                      <Play size={64} className="text-white/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => setIsPlaying(true)}
                      className="w-20 h-20 bg-white/90 rounded-full flex items-center justify-center text-primary-600 pl-1 shadow-lg transform group-hover:scale-110 transition-transform cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-400"
                    >
                      <Play fill="currentColor" size={32} />
                    </button>
                  </div>
                </>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center gap-3">
                  <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                    <Play size={32} className="text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm">该课程暂未上传视频</p>
                  <p className="text-gray-400 text-xs">请查看下方课程简介了解详情</p>
                </div>
              )}
            </div>
          </motion.div>

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
                <img
                  src={course.mentor_avatar || DEFAULT_AVATAR}
                  alt=""
                  className="w-14 h-14 rounded-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR; }}
                />
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
