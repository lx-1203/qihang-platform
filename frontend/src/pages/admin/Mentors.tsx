import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search, CheckCircle, XCircle, Clock, Eye,
  Star, Award, ChevronLeft, ChevronRight, X, MessageSquare, Loader2
} from 'lucide-react';
import http from '@/api/http';
import Tag from '@/components/ui/Tag';
import { DEFAULT_AVATAR } from '@/constants';
import { TableSkeleton } from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import { showToast } from '@/components/ui/ToastContainer';

// ====== 导师资质审核 ======
// 商业级要求：导师认证审核、资质验证

interface MentorRecord {
  id: number;
  user_id: number;
  name: string;
  title: string;
  avatar: string;
  bio: string;
  expertise: string[];
  rating: number;
  price: number;
  verify_status: 'pending' | 'approved' | 'rejected';
  verify_remark: string;
  created_at: string;
}

const STATUS_MAP = {
  pending: { label: '待审核', color: 'bg-amber-100 text-amber-700', icon: Clock },
  approved: { label: '已认证', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: '已驳回', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function AdminMentors() {
  const [mentors, setMentors] = useState<MentorRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;
  const [reviewModal, setReviewModal] = useState<MentorRecord | null>(null);
  const [reviewRemark, setReviewRemark] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailMentor, setDetailMentor] = useState<MentorRecord | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSending, setFeedbackSending] = useState(false);

  useEffect(() => {
    fetchMentors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, search]);

  async function fetchMentors() {
    try {
      setLoading(true);
      setError(null);
      const res = await http.get('/admin/mentors', { params: { page, pageSize, status: statusFilter, keyword: search } });
      if (res.data?.code === 200 && res.data.data) {
        setMentors(res.data.data.list || res.data.data.mentors || []);
        setTotal(res.data.data.pagination?.total || res.data.data.total || 0);
      } else {
        setError('数据加载失败，请稍后重试');
      }
    } catch {
      setError('数据加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  async function handleReview(mentorUserId: number, status: 'approved' | 'rejected') {
    try {
      await http.put(`/admin/mentors/${mentorUserId}/verify`, {
        status: status === 'approved' ? 1 : 0,
        remark: reviewRemark,
      });
      showToast({
        type: status === 'approved' ? 'success' : 'warning',
        title: status === 'approved' ? '导师认证已通过' : '导师认证已驳回',
        message: reviewRemark ? `备注：${reviewRemark}` : undefined
      });
    } catch {
      showToast({ type: 'error', title: '操作失败，请重试' });
    }
    setReviewModal(null);
    setReviewRemark('');
    fetchMentors();
  }

  async function sendMentorFeedback() {
    if (!detailMentor || !feedbackText.trim()) return;
    setFeedbackSending(true);
    try {
      await http.post('/admin/feedback', {
        userId: detailMentor.user_id,
        title: `关于导师「${detailMentor.name}」的审核反馈`,
        content: feedbackText,
      });
      showToast({ type: 'success', title: '反馈已发送' });
      setFeedbackText('');
    } catch {
      showToast({ type: 'error', title: '发送失败，请重试' });
    } finally {
      setFeedbackSending(false);
    }
  }

  const totalPages = Math.ceil(total / pageSize);
  const pendingCount = mentors.filter(m => m.verify_status === 'pending').length;

  if (loading) return <div className="space-y-6"><TableSkeleton rows={6} cols={4} /></div>;
  if (error) return (
    <div className="space-y-6">
      <ErrorState
        message={error}
        onRetry={() => { setError(null); fetchMentors(); }}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">导师资质审核</h1>
        <p className="text-gray-500 mt-1">
          审核导师认证资质，保障辅导服务质量
          {pendingCount > 0 && (
            <Tag variant="yellow" size="sm" className="ml-2">
              {pendingCount} 条待审核
            </Tag>
          )}
        </p>
      </div>

      {/* 状态统计 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: '待审核', count: mentors.filter(m => m.verify_status === 'pending').length, color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock },
          { label: '已认证', count: mentors.filter(m => m.verify_status === 'approved').length, color: 'text-green-600', bg: 'bg-green-50', icon: Award },
          { label: '已驳回', count: mentors.filter(m => m.verify_status === 'rejected').length, color: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
        ].map(item => (
          <div key={item.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className={`w-12 h-12 ${item.bg} rounded-xl flex items-center justify-center`}>
              <item.icon className={`w-6 h-6 ${item.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{item.count}</p>
              <p className="text-sm text-gray-500">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 筛选 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            id="mentor-search"
            name="mentor-search"
            type="text"
            placeholder="搜索导师姓名、头衔..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-base focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'pending', 'approved', 'rejected'].map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === s ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s === 'all' ? '全部' : STATUS_MAP[s as keyof typeof STATUS_MAP].label}
            </button>
          ))}
        </div>
      </div>

      {/* 导师列表 */}
      <div className="space-y-4">
        {mentors.map((mentor, i) => {
          const status = STATUS_MAP[mentor.verify_status];
          const StatusIcon = status.icon;
          return (
            <motion.div
              key={mentor.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  {mentor.avatar ? (
                    <img src={mentor.avatar || DEFAULT_AVATAR} alt={mentor.name} className="w-14 h-14 rounded-xl object-cover" />
                  ) : (
                    <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center">
                      <Award className="w-7 h-7 text-primary-600" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-gray-900">{mentor.name}</h3>
                      <Tag
                        variant={mentor.verify_status === 'pending' ? 'yellow' : mentor.verify_status === 'approved' ? 'green' : 'red'}
                        size="sm"
                        className="inline-flex items-center gap-1"
                      >
                        <StatusIcon className="w-3.5 h-3.5" />
                        {status.label}
                      </Tag>
                      {mentor.rating > 0 && (
                        <span className="flex items-center gap-1 text-amber-500 text-sm">
                          <Star className="w-4 h-4 fill-current" />
                          {mentor.rating}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">{mentor.title}</p>
                    <p className="text-sm text-gray-500 mt-1">{mentor.bio}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {(mentor.expertise || []).map(tag => (
                        <Tag key={tag} variant="purple" size="sm">{tag}</Tag>
                      ))}
                    </div>
                    <p className="text-sm text-gray-500 mt-2">辅导定价：<span className="text-primary-600 font-bold">{mentor.price}</span> 元/次</p>
                    {mentor.verify_remark && (
                      <p className="text-xs text-red-500 mt-2 bg-red-50 px-3 py-1.5 rounded-lg">
                        驳回原因：{mentor.verify_remark}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {mentor.verify_status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleReview(mentor.user_id, 'approved')}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium flex items-center gap-1"
                      >
                        <CheckCircle className="w-4 h-4" /> 通过
                      </button>
                      <button
                        onClick={() => setReviewModal(mentor)}
                        className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium flex items-center gap-1"
                      >
                        <XCircle className="w-4 h-4" /> 驳回
                      </button>
                    </>
                  )}
                  <button onClick={() => setDetailMentor(mentor)} className="p-2 rounded-lg hover:bg-gray-100" title="查看详情">
                    <Eye className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">共 {total} 条记录</p>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm text-gray-600">第 {page} / {totalPages || 1} 页</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      {/* 导师详情弹窗 */}
      {detailMentor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setDetailMentor(null); setFeedbackText(''); }}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl"
          >
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <h3 className="text-lg font-bold text-gray-900">导师详情</h3>
              <button onClick={() => { setDetailMentor(null); setFeedbackText(''); }} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="flex items-center gap-4">
                {detailMentor.avatar ? (
                  <img src={detailMentor.avatar} alt={detailMentor.name} className="w-16 h-16 rounded-xl object-cover" />
                ) : (
                  <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center">
                    <Award className="w-8 h-8 text-primary-600" />
                  </div>
                )}
                <div>
                  <h4 className="text-xl font-bold text-gray-900">{detailMentor.name}</h4>
                  <p className="text-sm text-gray-600">{detailMentor.title}</p>
                  {detailMentor.rating > 0 && (
                    <span className="flex items-center gap-1 text-amber-500 text-sm mt-1">
                      <Star className="w-4 h-4 fill-current" /> {detailMentor.rating}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">个人简介</p>
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{detailMentor.bio || '暂无简介'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">专业领域</p>
                <div className="flex flex-wrap gap-2">
                  {(detailMentor.expertise || []).map(tag => (
                    <Tag key={tag} variant="purple" size="sm">{tag}</Tag>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">辅导定价</span>
                <span className="text-primary-600 font-bold">{detailMentor.price} 元/次</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">认证状态</span>
                <Tag
                  variant={detailMentor.verify_status === 'pending' ? 'yellow' : detailMentor.verify_status === 'approved' ? 'green' : 'red'}
                  size="sm"
                >
                  {STATUS_MAP[detailMentor.verify_status].label}
                </Tag>
              </div>
              {detailMentor.verify_remark && (
                <p className="text-xs text-red-500 bg-red-50 px-3 py-1.5 rounded-lg">
                  驳回原因：{detailMentor.verify_remark}
                </p>
              )}
              <p className="text-xs text-gray-400">注册时间：{new Date(detailMentor.created_at).toLocaleString('zh-CN')}</p>
            </div>
            {/* 审核反馈 */}
            <div className="px-6 py-4 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <MessageSquare className="w-4 h-4" />
                发送审核反馈
              </p>
              <textarea
                id="mentor-feedback"
                name="mentor-feedback"
                value={feedbackText}
                onChange={e => setFeedbackText(e.target.value)}
                placeholder="输入反馈内容，将以通知形式发送给该导师..."
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none"
              />
              <button
                onClick={sendMentorFeedback}
                disabled={!feedbackText.trim() || feedbackSending}
                className="mt-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 text-sm font-medium flex items-center gap-1"
              >
                {feedbackSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                发送反馈
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 驳回弹窗 */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setReviewModal(null)}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-2">驳回导师审核</h3>
            <p className="text-sm text-gray-500 mb-4">驳回「{reviewModal.name}」的认证申请</p>
            <textarea
              id="mentor-reject-reason"
              name="reject-reason"
              value={reviewRemark}
              onChange={e => setReviewRemark(e.target.value)}
              placeholder="请输入驳回原因（必填）..."
              rows={4}
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setReviewModal(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">取消</button>
              <button
                onClick={() => handleReview(reviewModal.user_id, 'rejected')}
                disabled={!reviewRemark.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40 text-sm font-medium"
              >
                确认驳回
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
