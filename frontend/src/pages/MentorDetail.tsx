import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Star, Clock, Video, ChevronRight, MessageCircle, Calendar, Loader2, AlertCircle, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import http from '@/api/http';
import { DEFAULT_AVATAR } from '@/constants';
import { useAuthStore } from '@/store/auth';
import { useToast } from '@/components/ui/ToastContainer';
import { useChatStore } from '@/store/chat';

// 导师详情数据结构（匹配后端 mentor_profiles 表）
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
  status: number;
}

// 导师课程（从 courses 表关联查询）
interface MentorCourse {
  id: number;
  title: string;
  category: string;
  duration: string;
  views: string;
  rating: string;
  price: number;
  cover: string;
}

export default function MentorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const toast = useToast();
  const { createConversation, selectConversation } = useChatStore();

  const [mentor, setMentor] = useState<MentorDetailData | null>(null);
  const [courses, setCourses] = useState<MentorCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingNote, setBookingNote] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  // 获取导师详情
  useEffect(() => {
    const fetchMentor = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await http.get(`/mentors/${id}`);
        setMentor(res.data.data);
      } catch (err: unknown) {
        const error = err as { code?: number; response?: { status?: number } };
        console.error('获取导师详情失败:', err);
        if (error?.code === 404 || error?.response?.status === 404) {
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
    }
  }, [id]);

  // 获取导师的课程
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        // 用导师名称作为关键词搜索其课程
        if (mentor?.name) {
          const res = await http.get('/courses', { params: { keyword: mentor.name, pageSize: 10 } });
          const data = res.data?.data || res.data;
          setCourses(data.courses || []);
        }
      } catch (err) {
        console.error('获取导师课程失败:', err);
      }
    };

    if (mentor) {
      fetchCourses();
    }
  }, [mentor]);

  // 预约导师
  const handleBookAppointment = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { returnUrl: `/mentors/${id}` } });
      return;
    }
    setShowBookingModal(true);
    setBookingNote(`我想预约${mentor?.name}老师的1v1辅导服务`);
    setSelectedTime('');
  };

  const submitBooking = async () => {
    if (!bookingNote.trim()) {
      toast.error('表单不完整', '请填写留言内容');
      return;
    }

    try {
      setBookingLoading(true);
      const note = selectedTime
        ? `【意向时间段：${selectedTime}】 ${bookingNote}`
        : bookingNote;
      await http.post('/student/appointments', {
        mentor_id: mentor?.id,
        service_title: '1v1辅导',
        note,
        ...(selectedTime ? { appointment_time: selectedTime } : {}),
        fee: mentor?.price || 0,
      });
      toast.success('预约已提交', selectedTime ? '您的预约申请已提交，请等待导师确认' : '您的留言已提交，导师将尽快回复');
      setShowBookingModal(false);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = axiosErr?.response?.data?.message || axiosErr?.message || '请稍后重试';
      toast.error('预约失败', msg);
    } finally {
      setBookingLoading(false);
    }
  };

  // 加载状态
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

  // 错误状态
  if (error || !mentor) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">{error || '导师不存在'}</h2>
          <p className="text-gray-500 mb-6">可能该导师已下架或链接有误</p>
          <Link to="/mentors" className="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium">
            ← 返回导师列表
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* 导师头部信息 */}
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
              onError={(e) => {
                (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
              }}
            />
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 mb-3">
                <h1 className="text-3xl font-bold text-gray-900">{mentor.name}</h1>
                <span className="bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-sm font-medium">
                  认证导师
                </span>
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
                {mentor.price > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-orange-500">¥{mentor.price}</span>
                    <span>/次</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${mentor.status === 1 ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <span>{mentor.status === 1 ? '在线' : '离线'}</span>
                </div>
              </div>
            </div>
            <div className="w-full md:w-auto mt-6 md:mt-0 flex gap-4">
               <button
                 onClick={async () => {
                   if (!isAuthenticated) {
                     navigate('/login', { state: { returnUrl: `/mentors/${id}` } });
                     return;
                   }
                   if (chatLoading) return;
                   setChatLoading(true);
                   try {
                     const convId = await createConversation('user_service', mentor.user_id, `与${mentor.name}的对话`);
                     if (convId) {
                       await selectConversation(convId);
                       navigate('/chat');
                     }
                   } catch {
                     toast.error('创建会话失败', '请稍后重试');
                   } finally {
                     setChatLoading(false);
                   }
                 }}
                 disabled={chatLoading}
                 className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
               >
                 {chatLoading ? <Loader2 size={18} className="animate-spin" /> : <MessageCircle size={18} />}
                 {chatLoading ? '创建中...' : '私信咨询'}
               </button>
               <div className="flex-1 md:flex-none">
                 <button
                   onClick={handleBookAppointment}
                   disabled={bookingLoading}
                   className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                 >
                   {bookingLoading ? <Loader2 size={18} className="animate-spin" /> : <Calendar size={18} />}
                   {bookingLoading ? '提交中...' : '立即预约'}
                 </button>
                 {!mentor.available_time || mentor.available_time.length === 0 ? (
                   <p className="text-xs text-amber-600 mt-1.5 text-center">导师暂未设置时间，可留言沟通</p>
                 ) : null}
               </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
        {/* 左侧主内容 */}
        <div className="flex-1 space-y-8">
          {/* 擅长领域 */}
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

          {/* 标签 */}
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

          {/* 导师介绍 */}
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

          {/* 可预约时间 */}
          {mentor.available_time && mentor.available_time.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
            >
              <h2 className="text-lg font-bold text-gray-900 mb-4">可预约时间</h2>
              <div className="flex flex-wrap gap-2">
                {mentor.available_time.map((time, index) => (
                  <span key={index} className="flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-sm">
                    <Clock size={14} />
                    {time}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          {/* 主讲课程 */}
          {courses.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-900">主讲课程</h2>
                <Link to="/courses" className="text-sm text-primary-600 hover:text-primary-700 font-medium">查看全部</Link>
              </div>
              <div className="space-y-4">
                {courses.map((course) => (
                  <Link key={course.id} to={`/courses/${course.id}`} className="group block border border-gray-100 rounded-lg p-4 hover:border-primary-200 hover:bg-primary-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-4">
                        {course.cover ? (
                          <img src={course.cover} alt={course.title} className="w-12 h-12 rounded-lg object-cover" />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:text-primary-500 transition-colors">
                            <Video size={24} />
                          </div>
                        )}
                        <div>
                          <h3 className="font-bold text-gray-900 group-hover:text-primary-700 transition-colors">{course.title}</h3>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            {course.duration && (
                              <span className="flex items-center gap-1"><Clock size={14} /> {course.duration}</span>
                            )}
                            <span className="flex items-center gap-1"><Users size={14} /> {course.views} 人学过</span>
                            <span className="flex items-center gap-1">
                              <Star size={14} className="text-yellow-400" fill="currentColor" /> {course.rating}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className={`font-bold ${course.price === 0 ? 'text-green-500' : 'text-orange-500'}`}>
                        {course.price === 0 ? '免费' : `¥${course.price}`}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* 右侧预约信息 */}
        <div className="w-full lg:w-80">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 sticky top-24"
          >
            <h2 className="text-lg font-bold text-gray-900 mb-6">1v1 辅导服务</h2>

            <div className="space-y-4">
              {/* 辅导服务卡片 */}
              <div
                onClick={handleBookAppointment}
                className="border border-gray-200 hover:border-primary-500 rounded-lg p-4 transition-colors group cursor-pointer"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-gray-900 group-hover:text-primary-600 transition-colors">预约1V1辅导</h3>
                  <span className={`font-bold ${mentor.price > 0 ? 'text-orange-500' : 'text-green-500'}`}>
                    {mentor.price > 0 ? `¥${mentor.price}` : '免费'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                  与{mentor.name}老师进行一对一深度交流，获取个性化职业指导与建议。
                </p>
                <div className="flex justify-between items-center text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Clock size={14} /> 约60分钟</span>
                  <span className="flex items-center text-primary-600 font-medium group-hover:translate-x-1 transition-transform">
                    预约 <ChevronRight size={14} />
                  </span>
                </div>
              </div>

              {/* 导师信息统计 */}
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
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">当前状态</span>
                  <span className={`flex items-center gap-1 font-medium ${mentor.status === 1 ? 'text-green-600' : 'text-gray-400'}`}>
                    <div className={`w-2 h-2 rounded-full ${mentor.status === 1 ? 'bg-green-500' : 'bg-gray-400'}`} />
                    {mentor.status === 1 ? '在线接单' : '暂不接单'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400">平台保障 · 不满意退款 · 隐私保护</p>
            </div>
          </motion.div>
        </div>
      </div>
      {/* 预约弹窗 */}
      {showBookingModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={() => setShowBookingModal(false)}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl"
          >
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">预约 1v1 辅导</h3>
              <button onClick={() => setShowBookingModal(false)} className="text-gray-400 hover:text-gray-600">
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">选择预约时间（选填）</label>
                {mentor.available_time && mentor.available_time.length > 0 ? (
                  <select
                    value={selectedTime}
                    onChange={e => setSelectedTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    <option value="">不限时间（待协商）</option>
                    {mentor.available_time.map((time, idx) => (
                      <option key={idx} value={time}>{time}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 flex items-center gap-2">
                    <AlertCircle size={16} className="flex-shrink-0" />
                    <span>该导师暂未设置可预约时间，您可以先留言沟通</span>
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">留言/备注</label>
                <textarea
                  value={bookingNote}
                  onChange={e => setBookingNote(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                  placeholder="请简要描述您的辅导需求..."
                />
              </div>
              <button
                onClick={submitBooking}
                disabled={bookingLoading || !bookingNote.trim()}
                className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {bookingLoading && <Loader2 size={16} className="animate-spin" />}
                提交预约
              </button>
              {!mentor.available_time || mentor.available_time.length === 0 ? (
                <button
                  onClick={async () => {
                    if (chatLoading) return;
                    setChatLoading(true);
                    try {
                      setShowBookingModal(false);
                      const convId = await createConversation('user_service', mentor.user_id, `与${mentor.name}的对话`);
                      if (convId) {
                        await selectConversation(convId);
                        navigate('/chat');
                      }
                    } catch {
                      toast.error('创建会话失败', '请稍后重试');
                    } finally {
                      setChatLoading(false);
                    }
                  }}
                  disabled={chatLoading}
                  className="w-full bg-white border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {chatLoading ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />}
                  {chatLoading ? '创建中...' : '直接私信咨询导师'}
                </button>
              ) : null}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
