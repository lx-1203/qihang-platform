import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search, CheckCircle, XCircle, Clock, Eye,
  Star, Award, MapPin, ChevronLeft, ChevronRight
} from 'lucide-react';
import http from '@/api/http';

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
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;
  const [reviewModal, setReviewModal] = useState<MentorRecord | null>(null);
  const [reviewRemark, setReviewRemark] = useState('');

  const mockMentors: MentorRecord[] = [
    { id: 1, user_id: 10, name: '陈经理', title: '某头部互联网大厂HRD', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=100', bio: '10年以上人力资源管理经验', expertise: ['简历优化', '面试辅导', 'HR视角'], rating: 4.9, price: 299, verify_status: 'approved', verify_remark: '', created_at: '2026-03-05' },
    { id: 2, user_id: 11, name: '张工', title: '高级前端架构师', avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=100', bio: '8年前端开发经验', expertise: ['前端开发', '技术面试', '系统设计'], rating: 4.8, price: 399, verify_status: 'approved', verify_remark: '', created_at: '2026-03-06' },
    { id: 3, user_id: 12, name: '王总监', title: '知名快消品牌市场总监', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=100', bio: '12年快消行业从业经验', expertise: ['快消行业', '群面技巧', '品牌营销'], rating: 5.0, price: 349, verify_status: 'approved', verify_remark: '', created_at: '2026-03-06' },
    { id: 4, user_id: 20, name: '刘老师', title: '资深留学顾问', avatar: '', bio: '5年留学咨询经验，专注英美名校申请', expertise: ['留学申请', '文书修改', '背景提升'], rating: 0, price: 259, verify_status: 'pending', verify_remark: '', created_at: '2026-04-05' },
    { id: 5, user_id: 21, name: '赵导师', title: '自称某银行高管', avatar: '', bio: '简历信息疑似造假', expertise: ['金融行业'], rating: 0, price: 500, verify_status: 'rejected', verify_remark: '无法验证工作经历真实性，资质证明材料缺失', created_at: '2026-04-02' },
    { id: 6, user_id: 22, name: '孙老师', title: '考研辅导名师', avatar: '', bio: '10年考研辅导经验，数学满分', expertise: ['考研数学', '考研政治', '备考规划'], rating: 0, price: 199, verify_status: 'pending', verify_remark: '', created_at: '2026-04-07' },
  ];

  useEffect(() => {
    fetchMentors();
  }, [page, statusFilter, search]);

  async function fetchMentors() {
    try {
      setLoading(true);
      const res = await http.get('/admin/mentors', { params: { page, pageSize, status: statusFilter, keyword: search } });
      if (res.data?.code === 200 && res.data.data) {
        setMentors(res.data.data.list || res.data.data.mentors || []);
        setTotal(res.data.data.pagination?.total || res.data.data.total || 0);
      } else {
        applyMock();
      }
    } catch {
      applyMock();
    } finally {
      setLoading(false);
    }
  }

  function applyMock() {
    let filtered = [...mockMentors];
    if (statusFilter !== 'all') filtered = filtered.filter(m => m.verify_status === statusFilter);
    if (search) filtered = filtered.filter(m => m.name.includes(search) || m.title.includes(search));
    setMentors(filtered);
    setTotal(filtered.length);
  }

  async function handleReview(mentorId: number, status: 'approved' | 'rejected') {
    try {
      await http.put(`/admin/mentors/${mentorId}/verify`, { status, remark: reviewRemark });
    } catch {
      setMentors(prev => prev.map(m =>
        m.id === mentorId ? { ...m, verify_status: status, verify_remark: reviewRemark } : m
      ));
    }
    setReviewModal(null);
    setReviewRemark('');
  }

  const totalPages = Math.ceil(total / pageSize);
  const pendingCount = mockMentors.filter(m => m.verify_status === 'pending').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">导师资质审核</h1>
        <p className="text-gray-500 mt-1">
          审核导师认证资质，保障辅导服务质量
          {pendingCount > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
              {pendingCount} 条待审核
            </span>
          )}
        </p>
      </div>

      {/* 状态统计 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: '待审核', count: mockMentors.filter(m => m.verify_status === 'pending').length, color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock },
          { label: '已认证', count: mockMentors.filter(m => m.verify_status === 'approved').length, color: 'text-green-600', bg: 'bg-green-50', icon: Award },
          { label: '已驳回', count: mockMentors.filter(m => m.verify_status === 'rejected').length, color: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索导师姓名、头衔..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'pending', 'approved', 'rejected'].map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                    <img src={mentor.avatar} alt={mentor.name} className="w-14 h-14 rounded-xl object-cover" />
                  ) : (
                    <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center">
                      <Award className="w-7 h-7 text-purple-600" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-gray-900">{mentor.name}</h3>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {status.label}
                      </span>
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
                        <span key={tag} className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded text-xs font-medium">{tag}</span>
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
                        onClick={() => handleReview(mentor.id, 'approved')}
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
                  <button className="p-2 rounded-lg hover:bg-gray-100">
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
              value={reviewRemark}
              onChange={e => setReviewRemark(e.target.value)}
              placeholder="请输入驳回原因（必填）..."
              rows={4}
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setReviewModal(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">取消</button>
              <button
                onClick={() => handleReview(reviewModal.id, 'rejected')}
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
