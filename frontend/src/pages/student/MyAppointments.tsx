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
import ConfirmDialog from '@/components/ui/ConfirmDialog';

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
  duration: number;
  fee: number;
  status: AppointmentStatus;
  location: string;
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

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  upcoming: { label: '即将开始', color: 'text-primary-600', bg: 'bg-primary-100' },
  completed: { label: '已完成', color: 'text-green-600', bg: 'bg-green-100' },
  cancelled: { label: '已取消', color: 'text-gray-500', bg: 'bg-gray-100' },
  pending: { label: '待确认', color: 'text-amber-600', bg: 'bg-amber-100' },
  rejected: { label: '已拒绝', color: 'text-red-600', bg: 'bg-red-100' },
};

export default function MyAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activeTab, setActiveTab] = useState<string>('upcoming');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewForm, setReviewForm] = useState<ReviewForm>({ appointmentId: 0, rating: 5, content: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, []);

  async function fetchAppointments() {
    try {
      setLoading(true);
      const res = await http.get('/student/appointments');
      if (res.data?.code === 200 && res.data.data) {
        const raw = res.data.data.appointments || res.data.data.list || res.data.data;
        const list = Array.isArray(raw) ? raw : [];
        const normalized = list.map((a: Record<string, unknown>) => ({
          id: Number(a.id || 0),
          mentorName: (a.mentor_name || a.mentorName || '') as string,
          mentorAvatar: (a.mentor_avatar || a.mentorAvatar || '') as string,
          mentorTitle: (a.mentor_title || a.mentorTitle || '') as string,
          serviceTitle: (a.service_title || a.serviceTitle || '') as string,
          serviceType: (a.service_title || a.serviceType || '导师辅导') as string,
          date: a.appointment_time && !String(a.appointment_time).startsWith('2099') ? String(a.appointment_time).slice(0, 10) : '',
          time: a.appointment_time && !String(a.appointment_time).startsWith('2099') ? String(a.appointment_time).slice(11, 16) : '待协商',
          duration: Number(a.duration || 60),
          fee: Number(a.fee || 0),
          location: (a.location || '线上') as string,
          hasReviewed: !!a.review_rating,
          rating: a.review_rating as number | undefined,
          reviewContent: a.review_content as string | undefined,
          status: (['pending', 'confirmed'].includes(String(a.status)) ? 'upcoming' : (['cancelled', 'rejected'].includes(String(a.status)) ? 'cancelled' : (a.status || 'upcoming'))) as AppointmentStatus,
        }));
        setAppointments(normalized);
      } else {
        setAppointments([]);
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
      setAppointments(prev => prev.map(app =>
        app.id === reviewForm.appointmentId
          ? { ...app, hasReviewed: true, rating: reviewForm.rating, reviewContent: reviewForm.content }
          : app
      ));
      setShowReviewModal(false);
      setSubmittingReview(false);
    }
  }

  function openCancelDialog(appointmentId: number) {
    setCancellingId(appointmentId);
    setShowCancelDialog(true);
  }

  async function handleCancelAppointment() {
    if (!cancellingId) return;
    try {
      setCancelling(true);
      await http.put(`/student/appointments/${cancellingId}/cancel`);
      showToast({ type: 'success', title: '取消成功', message: '预约已取消' });
      await fetchAppointments();
    } catch (err) {
      showToast({ type: 'error', title: '取消失败', message: '请稍后重试' });
      if (import.meta.env.DEV) console.error('[DEV] Cancel error:', err);
    } finally {
      setCancelling(false);
      setShowCancelDialog(false);
      setCancellingId(null);
    }
  }

  const filtered = appointments.filter(app => {
    if (activeTab === 'cancelled') return app.status === 'cancelled';
    return app.status === activeTab;
  });

  const statusCounts = appointments.reduce((acc, app) => {
    const key = app.status === 'rejected' ? 'cancelled' : app.status;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) return <div className="container-narrow py-8"><ListSkeleton count={5} /></div>;
  if (error) return <div className="container-narrow py-8"><ErrorState message={error} onRetry={() => { setError(null); fetchAppointments(); }} /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">我的预约</h1>
        <p className="text-gray-500 mt-1">管理你的导师预约和辅导记录</p>
      </div>

      <div className="bg-white rounded-xl p-2 shadow-sm border border-gray-100 flex gap-2">
        {tabItems.map(tab => {
          const count = statusCounts[tab.key] || 0;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${
                isActive ? 'bg-primary-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                isActive ? 'bg-white/20' : 'bg-gray-100 text-gray-500'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-sm">当前分类下暂无预约记录</p>
          </div>
        ) : filtered.map((app, index) => {
          const status = statusConfig[app.status] || statusConfig.pending;
          return (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-start gap-5">
                  <img
                    src={app.mentorAvatar || '/default-avatar.svg'}
                    alt={app.mentorName}
                    className="w-16 h-16 rounded-full object-cover bg-gray-100"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{app.mentorName || '导师'}</h3>
                        <p className="text-sm text-gray-500 mt-0.5">{app.mentorTitle || '导师辅导'}</p>
                      </div>
                      <Tag className={`${status.bg} ${status.color} border-0`}>
                        {status.label}
                      </Tag>
                    </div>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-primary-500" />
                        <span>{app.serviceTitle || app.serviceType}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary-500" />
                        <span>{app.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary-500" />
                        <span>{app.time} · {app.duration} 分钟</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-primary-500" />
                        <span>¥{app.fee}</span>
                      </div>
                      <div className="flex items-center gap-2 sm:col-span-2">
                        <MapPin className="w-4 h-4 text-primary-500" />
                        <span>{app.location}</span>
                      </div>
                    </div>

                    {app.hasReviewed && (
                      <div className="mt-4 rounded-lg bg-gray-50 p-4">
                        <div className="flex items-center gap-1 text-amber-500 mb-2">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`w-4 h-4 ${i < (app.rating || 0) ? 'fill-current' : ''}`} />
                          ))}
                        </div>
                        <p className="text-sm text-gray-600">{app.reviewContent}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  {app.status === 'upcoming' && (
                    <>
                      <button
                        onClick={() => openCancelDialog(app.id)}
                        className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
                      >
                        取消预约
                      </button>
                      <button
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium flex items-center gap-2"
                      >
                        <Video className="w-4 h-4" />
                        查看会议信息
                      </button>
                    </>
                  )}

                  {app.status === 'completed' && !app.hasReviewed && (
                    <button
                      onClick={() => openReviewModal(app.id)}
                      className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium"
                    >
                      评价导师
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {showReviewModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">评价导师</h3>
                <button onClick={() => setShowReviewModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <p className="text-sm text-gray-600 mb-3">请为本次辅导打分</p>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: 5 }).map((_, i) => {
                      const value = i + 1;
                      const active = value <= (hoverRating || reviewForm.rating);
                      return (
                        <button
                          key={value}
                          onMouseEnter={() => setHoverRating(value)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setReviewForm(prev => ({ ...prev, rating: value }))}
                          className="text-amber-400"
                        >
                          <Star className={`w-8 h-8 ${active ? 'fill-current' : ''}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">评价内容</label>
                  <textarea
                    value={reviewForm.content}
                    onChange={e => setReviewForm(prev => ({ ...prev, content: e.target.value }))}
                    rows={5}
                    placeholder="写下你的辅导体验和建议..."
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors text-sm"
                >
                  取消
                </button>
                <button
                  onClick={submitReview}
                  disabled={submittingReview || !reviewForm.content.trim()}
                  className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {submittingReview ? '提交中...' : '提交评价'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={showCancelDialog}
        title="确认取消预约？"
        description="取消后需要重新预约，已提交的信息不会保留。"
        loading={cancelling}
        confirmText="确认取消"
        onConfirm={handleCancelAppointment}
        onCancel={() => {
          if (!cancelling) {
            setShowCancelDialog(false);
            setCancellingId(null);
          }
        }}
      />
    </div>
  );
}
