import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, Award, DollarSign, FileText, Loader2, MessageCircle, ShieldCheck, Star, Clock, GraduationCap, Briefcase, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import http from '@/api/http';
import { DEFAULT_AVATAR } from '@/constants';
import { useAuthStore } from '@/store/auth';
import { useToast } from '@/components/ui/ToastContainer';
import { useChatStore } from '@/store/chat';

interface MentorDetailData {
  id: number;
  user_id: number;
  name: string;
  title: string;
  avatar: string;
  bio: string;
  expertise: string[];
  tags: string[];
  rating: string;
  rating_count: number;
  price: number;
  available_time: string[];
  education: string;
  experience: string;
  status: number;
  verify_status: string;
  verified_badge: string;
  cert_badge: string;
  credential_description: string;
  resources: Array<{
    id: number;
    title: string;
    description: string;
    cover_url: string;
    content_type: string;
    is_free: boolean;
    is_vip_only: boolean;
    view_count: number;
    created_at: string;
  }>;
}

interface CourseItem {
  id: number;
  title: string;
  cover?: string;
  rating?: string;
  views?: number;
  price?: number;
}

export default function MentorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const toast = useToast();
  const { createConversation, selectConversation } = useChatStore();

  const [mentor, setMentor] = useState<MentorDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);

  useEffect(() => {
    const fetchMentor = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await http.get(`/mentors/${id}`);
        const raw = res.data.data;
        const mentorData = {
          ...raw,
          name: raw.name || raw.mentor_name || raw.real_name || raw.nickname || '未知导师',
        };
        setMentor(mentorData);
      } catch (err: unknown) {
        const requestError = err as { code?: number; response?: { status?: number } };
        if (requestError?.code === 404 || requestError?.response?.status === 404) {
          setError('导师不存在或已下架');
        } else {
          setError('加载失败，请稍后重试');
        }
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchMentor();
      // 同时获取该导师的课程列表
      setCoursesLoading(true);
      http.get('/courses', { params: { mentor_id: id, pageSize: 5 } })
        .then(res => {
          if (res.data?.code === 200) {
            const data = res.data.data;
            setCourses(data.courses || data.list || []);
          }
        })
        .catch(() => {})
        .finally(() => setCoursesLoading(false));
    }
  }, [id]);

  useEffect(() => {
    const handleFocus = () => {
      if (!id) return;
      http.get(`/mentors/${id}`)
        .then((res) => {
          if (res.data?.data) setMentor(res.data.data);
        })
        .catch(() => {});
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [id]);

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">加载导师信息中...</p>
        </div>
      </div>
    );
  }

  if (error || !mentor) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">{error || '导师不存在'}</h2>
          <p className="text-gray-500 mb-6">该导师可能已下架，或链接已失效。</p>
          <Link to="/mentors" className="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium">
            返回导师列表
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row items-start md:items-center gap-8"
          >
            <img
              src={mentor.avatar || DEFAULT_AVATAR}
              alt={mentor.name}
              className="w-32 h-32 rounded-full object-cover border-4 border-primary-50 shadow-md"
              onError={(event) => {
                (event.target as HTMLImageElement).src = DEFAULT_AVATAR;
              }}
            />
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 mb-3">
                <h1 className="text-3xl font-bold text-gray-900">{mentor.name}</h1>
                {mentor.verify_status === 'approved' && (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${
                    mentor.verified_badge === '金牌导师'
                      ? 'bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 border border-amber-200'
                      : 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200'
                  }`}>
                    {mentor.verified_badge === '金牌导师' ? (
                      <Award className="w-4 h-4 text-amber-500" />
                    ) : (
                      <ShieldCheck className="w-4 h-4 text-green-500" />
                    )}
                    {mentor.verified_badge || mentor.cert_badge || '认证导师'}
                  </span>
                )}
              </div>
              <p className="text-xl text-gray-600 mb-4">{mentor.title}</p>

              <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400" fill="currentColor" />
                  <span className="font-medium text-gray-900">{mentor.rating}</span>
                  <span>学员评分</span>
                  {mentor.rating_count > 0 && (
                    <span className="text-gray-400">({mentor.rating_count}人评价)</span>
                  )}
                </div>
              </div>
            </div>

            <div className="w-full md:w-auto mt-6 md:mt-0">
              <button
                onClick={async () => {
                  if (!isAuthenticated) {
                    navigate('/login', { state: { returnUrl: `/mentors/${id}` } });
                    return;
                  }
                  if (chatLoading) return;
                  setChatLoading(true);
                  try {
                    const conversationId = await createConversation('user_service', mentor.user_id, `与${mentor.name}的对话`);
                    if (conversationId) {
                      await selectConversation(conversationId);
                      navigate('/chat');
                    }
                  } catch {
                    toast.error('创建会话失败', '请稍后重试');
                  } finally {
                    setChatLoading(false);
                  }
                }}
                disabled={chatLoading}
                className="flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
              >
                {chatLoading ? <Loader2 size={18} className="animate-spin" /> : <MessageCircle size={18} />}
                {chatLoading ? '创建中...' : '平台内沟通'}
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-8">
          {mentor.expertise && mentor.expertise.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
            >
              <h2 className="text-lg font-bold text-gray-900 mb-4">擅长领域</h2>
              <div className="flex flex-wrap gap-2">
                {mentor.expertise.map((item, index) => (
                  <span key={index} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm">
                    {item}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          {mentor.tags && mentor.tags.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
            >
              <h2 className="text-lg font-bold text-gray-900 mb-4">服务标签</h2>
              <div className="flex flex-wrap gap-2">
                {mentor.tags.map((tag, index) => (
                  <span key={index} className="bg-primary-50 text-primary-700 px-3 py-1.5 rounded-full text-sm font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
          >
            <h2 className="text-lg font-bold text-gray-900 mb-4">导师介绍</h2>
            <p className="text-gray-600 leading-relaxed whitespace-pre-line">
              {mentor.bio || '该导师暂未填写个人简介。'}
            </p>
          </motion.div>

          {mentor.available_time && mentor.available_time.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
            >
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary-500" />
                可预约时间
              </h2>
              <div className="flex flex-wrap gap-2">
                {mentor.available_time.map((slot, index) => (
                  <span key={index} className="bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-sm font-medium border border-green-100">
                    {slot}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          {(mentor.education || mentor.experience) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.24 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
            >
              <h2 className="text-lg font-bold text-gray-900 mb-4">导师背景</h2>
              <div className="space-y-4">
                {mentor.education && (
                  <div className="flex gap-3">
                    <GraduationCap className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-sm font-medium text-gray-500">教育背景</span>
                      <p className="text-gray-700 mt-0.5">{mentor.education}</p>
                    </div>
                  </div>
                )}
                {mentor.experience && (
                  <div className="flex gap-3">
                    <Briefcase className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-sm font-medium text-gray-500">工作经历</span>
                      <p className="text-gray-700 mt-0.5 whitespace-pre-line">{mentor.experience}</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {courses.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.26 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
            >
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary-500" />
                导师课程 ({courses.length})
              </h2>
              <div className="space-y-3">
                {courses.map((course) => (
                  <Link
                    key={course.id}
                    to={`/courses/${course.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-14 h-10 bg-primary-50 rounded-lg flex items-center justify-center shrink-0">
                      <BookOpen size={18} className="text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{course.title}</p>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                        {course.rating && <span>评分 {course.rating}</span>}
                        {course.views !== undefined && <span>{course.views} 次浏览</span>}
                      </div>
                    </div>
                    <span className={`text-sm font-medium shrink-0 ${course.price && course.price > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {course.price && course.price > 0 ? `¥${course.price}` : '免费'}
                    </span>
                  </Link>
                ))}
              </div>
            </motion.div>
          )}

          {mentor.resources && mentor.resources.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
            >
              <h2 className="text-lg font-bold text-gray-900 mb-4">公开资源 ({mentor.resources.length})</h2>
              <div className="space-y-3">
                {mentor.resources.map((res) => (
                  <div key={res.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                      <FileText size={18} className="text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">{res.title}</p>
                        {res.is_free ? (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium flex-shrink-0">免费</span>
                        ) : res.is_vip_only ? (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium flex-shrink-0">VIP</span>
                        ) : null}
                      </div>
                      {res.description && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{res.description}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">{res.view_count} 次浏览</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        <div className="w-full lg:w-80">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 sticky top-24"
          >
            <h2 className="text-lg font-bold text-gray-900 mb-6">导师信息</h2>
            <div className="space-y-4">
              <div className="pt-4 border-t border-gray-100 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">导师评分</span>
                  <span className="flex items-center gap-1 font-medium text-gray-900">
                    <Star size={14} className="text-yellow-400" fill="currentColor" />
                    {mentor.rating}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">评价人数</span>
                  <span className="font-medium text-gray-900">{mentor.rating_count} 人</span>
                </div>
                {mentor.price > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">咨询价格</span>
                    <span className="flex items-center gap-1 font-semibold text-primary-700">
                      <DollarSign size={14} />
                      ¥{mentor.price}/次
                    </span>
                  </div>
                )}
                {mentor.verify_status === 'approved' && mentor.credential_description && (
                  <div className="flex items-start justify-between text-sm">
                    <span className="text-gray-500 mt-0.5">资质认证</span>
                    <span className="font-medium text-gray-900 text-right max-w-[160px] leading-snug">{mentor.credential_description}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">公开状态</span>
                  <span className={`font-medium ${mentor.verify_status === 'approved' ? 'text-green-600' : 'text-gray-500'}`}>
                    {mentor.verify_status === 'approved' ? '已认证' : '审核中'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-500 leading-relaxed">
                公开页仅展示认证、擅长领域与个人简介，进一步服务需在平台内沟通。
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
