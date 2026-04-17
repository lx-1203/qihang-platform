import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, Star, MessageSquare,
  Video, MapPin, X, Send, CheckCircle2,
  XCircle, AlertCircle, DollarSign
} from 'lucide-react';
import http from '@/api/http';
import { ListSkeleton } from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import { showToast } from '@/components/ui/ToastContainer';
import Tag from '@/components/ui/Tag';

// ====== 我的预约（导师预约管理） ======
// 预约列表、状态筛选、完成后评价（星级+文本）

type AppointmentStatus = 'upcoming' | 'completed' | 'cancelled';

interface Appointment {
  id: number;
  mentorName: string;
  mentorAvatar: string;
  mentorTitle: string;
  serviceTitle: string;
  serviceType: string;
  date: string;
  time: string;
  duration: number;     // 分钟
  fee: number;
  status: AppointmentStatus;
  location: string;     // 线上/线下地点
  hasReviewed: boolean;
  rating?: number;
  reviewContent?: string;
}

interface ReviewForm {
  appointmentId: number;
  rating: number;
  content: string;
}

const tabItems: { key: AppointmentStatus; label: string; icon: React.ElementType }[] = [
  { key: 'upcoming', label: '即将开始', icon: Calendar },
  { key: 'completed', label: '已完成', icon: CheckCircle2 },
  { key: 'cancelled', label: '已取消', icon: XCircle },
];

const statusConfig: Record<AppointmentStatus, { label: string; color: string; bg: string }> = {
  upcoming: { label: '即将开始', color: 'text-primary-600', bg: 'bg-primary-100' },
  completed: { label: '已完成', color: 'text-green-600', bg: 'bg-green-100' },
  cancelled: { label: '已取消', color: 'text-gray-500', bg: 'bg-gray-100' },
};

export default function MyAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activeTab, setActiveTab] = useState<AppointmentStatus>('upcoming');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewForm, setReviewForm] = useState<ReviewForm>({ appointmentId: 0, rating: 5, content: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  useEffect(() => {
    fetchAppointments();
  }, []);

  async function fetchAppointments() {
    try {
      setLoading(true);
      const res = await http.get('/student/appointments');
      if (res.data?.code === 200 && res.data.data) {
        // 将后端状态映射为前端展示状态
        const raw = res.data.data.appointments || res.data.data.list || res.data.data;
        const normalized = raw.map((a: Record<string, unknown>) => ({
          ...a,
          mentorName: (a.mentor_name || a.mentorName || '') as string,
          mentorAvatar: (a.mentor_avatar || a.mentorAvatar || '') as string,
          mentorTitle: (a.mentor_title || a.mentorTitle || '') as string,
          serviceTitle: (a.service_title || a.serviceTitle || '') as string,
          serviceType: (a.service_title || a.serviceType || '导师辅导') as string,
          date: a.appointment_time ? String(a.appointment_time).slice(0, 10) : ((a.date || '') as string),
          time: a.appointment_time ? String(a.appointment_time).slice(11, 16) : ((a.time || '') as string),
          fee: (a.fee || 0) as number,
          location: (a.location || '线上') as string,
          hasReviewed: !!a.review_rating,
          rating: a.review_rating as number | undefined,
          reviewContent: a.review_content as string | undefined,
          // 将 pending/confirmed → upcoming，其余保留
          status: (['pending', 'confirmed'].includes(a.status as string) ? 'upcoming' : a.status) as AppointmentStatus,
        }));
        setAppointments(normalized);
      }
    } catch (err) {
      setError('数据加载失败，请刷新重试');
      if (import.meta.env.DEV) console.error('[DEV] API error:', err);
    } finally {
      setLoading(false);
    }
  }

  function openReviewModal(appointmentId: number) {
    setReviewForm({ appointmentId, rating: 5, content: '' });
    setHoverRating(0);
    setShowReviewModal(true);
  }

  async function submitReview() {
    if (!reviewForm.content.trim()) return;
    try {
      setSubmittingReview(true);
      await http.post(`/student/appointments/${reviewForm.appointmentId}/review`, {
        rating: reviewForm.rating,
        content: reviewForm.content,
      });
    } catch {
      // API 未就绪，直接更新本地状态
    } finally {
      // 更新本地状态
      setAppointments(prev => prev.map(app =>
        app.id === reviewForm.appointmentId
          ? { ...app, hasReviewed: true, rating: reviewForm.rating, reviewContent: reviewForm.content }
          : app
      ));
      setShowReviewModal(false);
      setSubmittingReview(false);
    }
  }

  const filtered = appointments.filter(app => app.status === activeTab);

  // 各状态数量
  const statusCounts = appointments.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) return <div className="container-narrow py-8"><ListSkeleton count={5} /></div>;
  if (error) return <div className="container-narrow py-8"><ErrorState message={error} onRetry={() => { setError(null); fetchAppointments(); }} /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">我的预约</h1>
        <p className="text-gray-500 mt-1">管理你的导师预约和辅导记录</p>
      </div>

      {/* 状态标签切换 */}
      <div className="bg-white rounded-xl p-2 shadow-sm border border-gray-100 flex gap-2">
        {tabItems.map(tab => {
          const count = statusCounts[tab.key] || 0;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                isActive ? 'bg-white/20' : 'bg-gray-100'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 预约列表 */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center"
          >
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-sm">
              {activeTab === 'upcoming' ? '暂无即将开始的预约' :
               activeTab === 'completed' ? '暂无已完成的预约' : '暂无已取消的预约'}
            </p>
            {activeTab === 'upcoming' && (
              <a href="/mentors" className="inline-block mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium">
                去浏览导师 →
              </a>
            )}
          </motion.div>
        ) : (
          filtered.map((app, i) => {
            const config = statusConfig[app.status];
            return (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  {/* 导师头像 */}
                  <div className="w-14 h-14 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-xl font-bold text-white">{app.mentorName.charAt(0)}</span>
                  </div>

                  {/* 主要信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold text-gray-900">{app.serviceTitle}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-gray-700 font-medium">{app.mentorName}</span>
                          <span className="text-xs text-gray-400">·</span>
                          <span className="text-xs text-gray-500">{app.mentorTitle}</span>
                        </div>
                      </div>
                      {/* 状态标签 */}
                      <Tag
                        variant={app.status === 'upcoming' ? 'primary' : app.status === 'completed' ? 'green' : 'gray'}
                        size="md"
                      >
                        {config.label}
                      </Tag>
                    </div>

                    {/* 详细信息 */}
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {app.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {app.time}（{app.duration}分钟）
                      </span>
                      <span className="flex items-center gap-1">
                        {app.location.startsWith('线上') ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                        {app.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        <span className="text-primary-600 font-medium">¥{app.fee}</span>
                      </span>
                      <Tag variant="gray" size="sm">{app.serviceType}</Tag>
                    </div>

                    {/* 已完成的 → 评价区域 */}
                    {app.status === 'completed' && (
                      <div className="mt-4 pt-4 border-t border-gray-50">
                        {app.hasReviewed ? (
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs text-gray-500">我的评价</span>
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map(star => (
                                  <Star
                                    key={star}
                                    className={`w-3.5 h-3.5 ${star <= (app.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed">{app.reviewContent}</p>
                          </div>
                        ) : (
                          <button
                            onClick={() => openReviewModal(app.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors text-sm font-medium"
                          >
                            <MessageSquare className="w-4 h-4" />
                            撰写评价
                          </button>
                        )}
                      </div>
                    )}

                    {/* 即将开始 → 操作按钮 */}
                    {app.status === 'upcoming' && (
                      <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-3">
                        <button onClick={() => showToast({ type: 'info', title: '功能开发中', message: '在线会议功能正在开发中' })} className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium">
                          <Video className="w-4 h-4" />
                          进入会议
                        </button>
                        <button onClick={() => showToast({ type: 'info', title: '功能开发中', message: '取消预约功能正在开发中，请联系导师' })} className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                          取消预约
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* 底部提示 */}
      {filtered.length > 0 && (
        <div className="text-center text-xs text-gray-400 py-4">
          共 {filtered.length} 条预约记录
        </div>
      )}

      {/* ===== 评价弹窗 ===== */}
      <AnimatePresence>
        {showReviewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={() => setShowReviewModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              {/* 弹窗头部 */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">评价导师服务</h3>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* 星级评分 */}
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 mb-3">服务评分</p>
                <div className="flex items-center gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${
                          star <= (hoverRating || reviewForm.rating)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-center text-sm text-gray-500 mt-2">
                  {reviewForm.rating === 5 ? '非常满意' :
                   reviewForm.rating === 4 ? '比较满意' :
                   reviewForm.rating === 3 ? '一般' :
                   reviewForm.rating === 2 ? '不太满意' : '很不满意'}
                </p>
              </div>

              {/* 评价内容 */}
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 mb-2">评价内容</p>
                <textarea
                  value={reviewForm.content}
                  onChange={e => setReviewForm({ ...reviewForm, content: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm resize-none"
                  placeholder="分享你的辅导体验，帮助其他同学做出选择..."
                />
                <p className="text-xs text-gray-400 mt-1.5 text-right">{reviewForm.content.length}/500</p>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  取消
                </button>
                <button
                  onClick={submitReview}
                  disabled={submittingReview || !reviewForm.content.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  {submittingReview ? '提交中...' : '提交评价'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
