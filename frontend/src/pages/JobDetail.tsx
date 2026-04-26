import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Briefcase,
  Clock,
  DollarSign,
  Building2,
  ChevronRight,
  Loader2,
  AlertCircle,
  Send,
  Eye,
  Tag as TagIcon,
  Heart,
  MessageCircle,
  Phone,
  Mail,
  MessageSquareText,
  Globe,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/auth';
import http from '@/api/http';
import TagComponent from '@/components/ui/Tag';
import { useChatStore } from '@/store/chat';

/** 职位详情数据类型 */
interface JobData {
  id: number;
  title: string;
  company_id?: number;
  company_name: string;
  logo?: string;
  location: string;
  salary: string;
  type: string;
  category?: string;
  tags: string[];
  time: string;
  urgent: boolean;
  status?: string;
  view_count?: number;
  description?: string;
  requirements?: string;
  company_id?: number;
  created_at?: string;
  updated_at?: string;
  company_contact?: {
    phone?: string;
    wechat?: string;
    contact_email?: string;
    website?: string;
    address?: string;
  };
}

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { createConversation, selectConversation } = useChatStore();

  const [job, setJob] = useState<JobData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applyStatus, setApplyStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteId, setFavoriteId] = useState<number | null>(null);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);

  // 获取职位详情
  useEffect(() => {
    if (!id) return;
    const fetchJob = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await http.get(`/jobs/${id}`);
        if (res.data?.code === 200) {
          setJob(res.data.data);
        } else {
          setError(res.data?.message || '加载职位数据失败');
        }
      } catch (err: unknown) {
        console.error('获取职位详情失败:', err);
        const error = err as { response?: { status?: number } };
        if (error?.response?.status === 404) {
          setError('职位不存在或已下线');
        } else {
          setError('加载职位数据失败，请稍后重试');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [id]);

  // 页面重新可见时刷新（Logo 变更后同步）
  useEffect(() => {
    const handleFocus = () => { if (id) { http.get(`/jobs/${id}`).then(res => { if (res.data?.code === 200) setJob(res.data.data); }).catch(() => {}); } };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [id]);

  // 检查是否已投递 + 是否已收藏（仅学生角色）
  useEffect(() => {
    if (!id || !isAuthenticated || user?.role !== 'student') return;

    // 检查投递状态
    const checkApplyStatus = async () => {
      try {
        const res = await http.get('/student/resumes');
        if (res.data?.code === 200) {
          const applications = res.data.data?.list || res.data.data || [];
          const found = Array.isArray(applications)
            ? applications.find((r: { job_id: number | string }) => String(r.job_id) === String(id))
            : null;
          if (found) {
            setApplyStatus('done');
          }
        }
      } catch {
        // 静默失败，不影响页面展示
      }
    };

    // 检查收藏状态
    const checkFavoriteStatus = async () => {
      try {
        const res = await http.get('/student/favorites');
        if (res.data?.code === 200) {
          const favorites = res.data.data?.list || res.data.data || [];
          const found = Array.isArray(favorites)
            ? favorites.find((f: { target_type: string; target_id: number | string; id: number }) => f.target_type === 'job' && String(f.target_id) === String(id))
            : null;
          if (found) {
            setIsFavorited(true);
            setFavoriteId(found.id);
          }
        }
      } catch {
        // 静默失败
      }
    };

    checkApplyStatus();
    checkFavoriteStatus();
  }, [id, isAuthenticated, user?.role]);

  // 投递简历
  const handleApply = useCallback(async () => {
    if (!user) {
      navigate('/login', { state: { returnUrl: `/jobs/${id}` } });
      return;
    }
    if (user.role !== 'student') {
      setMessage({ type: 'error', text: '仅学生用户可以投递简历' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    if (!job) return;

    // 岗位状态前置校验
    if (job.status && job.status !== 'active') {
      setMessage({ type: 'error', text: '该岗位已结束招聘' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    try {
      setApplyStatus('loading');
      await http.post('/student/resumes', { job_id: job.id });
      setApplyStatus('done');
      setMessage({ type: 'success', text: '投递成功！企业收到后将通知你' });
    } catch (err: unknown) {
      setApplyStatus('error');
      const error = err as { message?: string; response?: { status?: number; data?: { message?: string } } };
      const errMsg = error?.message || error?.response?.data?.message || '投递失败，请重试';
      // 如果是重复投递，标记为已投递
      if (error?.response?.status === 409 || errMsg.includes('已投递')) {
        setApplyStatus('done');
        setMessage({ type: 'error', text: '你已投递过该职位' });
      } else {
        setMessage({ type: 'error', text: errMsg });
      }
    }
    setTimeout(() => setMessage(null), 4000);
  }, [user, job, id, navigate]);

  // 收藏 / 取消收藏
  const handleToggleFavorite = useCallback(async () => {
    if (!user) {
      navigate('/login', { state: { returnUrl: `/jobs/${id}` } });
      return;
    }
    if (user.role !== 'student') {
      setMessage({ type: 'error', text: '仅学生用户可以收藏' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    if (favoriteLoading) return;

    try {
      setFavoriteLoading(true);
      if (isFavorited && favoriteId) {
        await http.delete(`/student/favorites/${favoriteId}`);
        setIsFavorited(false);
        setFavoriteId(null);
        setMessage({ type: 'success', text: '已取消收藏' });
      } else {
        const res = await http.post('/student/favorites', {
          target_type: 'job',
          target_id: Number(id),
        });
        setIsFavorited(true);
        if (res.data?.data?.id) {
          setFavoriteId(res.data.data.id);
        }
        setMessage({ type: 'success', text: '收藏成功' });
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      const errMsg = error?.message || '操作失败';
      setMessage({ type: 'error', text: errMsg });
    } finally {
      setFavoriteLoading(false);
    }
    setTimeout(() => setMessage(null), 3000);
  }, [user, id, isFavorited, favoriteId, favoriteLoading, navigate]);

  // 联系企业
  const handleContactCompany = useCallback(async () => {
    if (!user) {
      navigate('/login', { state: { returnUrl: `/jobs/${id}` } });
      return;
    }
    if (chatLoading) return;
    setChatLoading(true);
    try {
      const convId = await createConversation('user_service', undefined, `咨询${job?.company_name || '企业'}`, job?.company_id);
      if (convId) {
        await selectConversation(convId);
        navigate('/chat');
      }
    } catch {
      setMessage({ type: 'error', text: '创建会话失败，请稍后重试' });
    } finally {
      setChatLoading(false);
    }
    setTimeout(() => setMessage(null), 3000);
  }, [user, job, id, chatLoading, createConversation, selectConversation, navigate]);

  // 投递按钮是否应禁用
  const isApplyDisabled =
    applyStatus === 'loading' ||
    applyStatus === 'done' ||
    (job?.status !== undefined && job.status !== 'active');

  // 投递按钮文案
  const renderApplyButtonContent = () => {
    if (job?.status && job.status !== 'active') {
      return '该岗位已结束招聘';
    }
    if (applyStatus === 'loading') {
      return (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          投递中...
        </>
      );
    }
    if (applyStatus === 'done') {
      return (
        <>
          <Send className="w-5 h-5" />
          已投递
        </>
      );
    }
    return (
      <>
        <Send className="w-5 h-5" />
        投递简历
      </>
    );
  };

  // Loading 状态
  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">加载职位信息中...</p>
        </div>
      </div>
    );
  }

  // Error 状态
  if (error || !job) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">加载失败</h2>
          <p className="text-gray-500 mb-6">{error || '未找到职位信息'}</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              返回上一页
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              重新加载
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* 全局消息提示 */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl text-sm font-medium shadow-lg ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 面包屑导航 */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center text-sm text-gray-500">
            <Link to="/" className="hover:text-primary-600 transition-colors">首页</Link>
            <ChevronRight className="w-4 h-4 mx-2" />
            <Link to="/jobs" className="hover:text-primary-600 transition-colors">职位列表</Link>
            <ChevronRight className="w-4 h-4 mx-2" />
            <span className="text-gray-900 font-medium truncate max-w-[200px]">{job.title}</span>
          </nav>
        </div>
      </div>

      {/* 职位头部信息 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white border-b border-gray-200"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* 公司 Logo */}
            <div className="w-20 h-20 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
              {job.logo ? (
                <img src={job.logo} alt={job.company_name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-cover.svg' }} />
              ) : (
                <Building2 className="w-10 h-10 text-gray-300" />
              )}
            </div>

            {/* 标题 & 元信息 */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{job.title}</h1>
                {job.urgent && (
                  <TagComponent variant="red" size="sm">
                    急聘
                  </TagComponent>
                )}
                {job.status && job.status !== 'active' && (
                  <TagComponent variant="gray" size="sm">
                    已下线
                  </TagComponent>
                )}
              </div>
              <p className="text-lg text-gray-600 mb-4">{job.company_name}</p>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-orange-400" />
                  <span className="font-semibold text-orange-500 text-base">{job.salary}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {job.location}
                </span>
                <TagComponent
                  variant={job.type === '校招' ? 'blue' : job.type === '实习' ? 'green' : 'orange'}
                  size="sm"
                  className="flex items-center gap-1.5"
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  {job.type}
                </TagComponent>
                {job.category && (
                  <span className="flex items-center gap-1.5">
                    <TagIcon className="w-4 h-4" />
                    {job.category}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {job.time}
                </span>
                {job.view_count !== undefined && (
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4" />
                    {job.view_count} 次浏览
                  </span>
                )}
              </div>
            </div>

            {/* 操作按钮区 */}
            <div className="w-full md:w-auto flex-shrink-0 flex gap-3">
              {/* 收藏按钮 */}
              <button
                onClick={handleToggleFavorite}
                disabled={favoriteLoading}
                className={`flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl font-medium text-sm transition-all border ${
                  isFavorited
                    ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Heart className={`w-5 h-5 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
                {isFavorited ? '已收藏' : '收藏'}
              </button>

              {/* 联系企业按钮 */}
              <button
                onClick={handleContactCompany}
                disabled={chatLoading}
                className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl font-medium text-sm transition-all border bg-white text-gray-600 border-gray-200 hover:bg-gray-50 disabled:opacity-50"
              >
                {chatLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageCircle className="w-5 h-5" />}
                {chatLoading ? '创建中...' : '联系企业'}
              </button>

              {/* 投递按钮 */}
              <button
                onClick={handleApply}
                disabled={isApplyDisabled}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-medium text-base transition-all shadow-sm ${
                  job.status && job.status !== 'active'
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : applyStatus === 'done'
                    ? 'bg-green-100 text-green-700 cursor-default'
                    : applyStatus === 'loading'
                    ? 'bg-primary-400 text-white cursor-wait'
                    : 'bg-primary-600 text-white hover:bg-primary-700 hover:shadow-md'
                }`}
              >
                {renderApplyButtonContent()}
              </button>
            </div>
          </div>

          {/* 标签 */}
          {job.tags && job.tags.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-6 flex flex-wrap gap-2"
            >
              {job.tags.map((tag, index) => (
                <TagComponent
                  key={index}
                  variant="primary"
                  size="md"
                >
                  {tag}
                </TagComponent>
              ))}
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* 详情内容区 */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* 左侧：职位描述 & 任职要求 */}
          <div className="flex-1 space-y-6">
            {job.description && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
              >
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary-500" />
                  职位描述
                </h2>
                <div className="text-gray-600 leading-relaxed whitespace-pre-line">
                  {job.description}
                </div>
              </motion.div>
            )}

            {job.requirements && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
              >
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-primary-500" />
                  任职要求
                </h2>
                <div className="text-gray-600 leading-relaxed whitespace-pre-line">
                  {job.requirements}
                </div>
              </motion.div>
            )}

            {/* 如果没有描述和要求，显示占位 */}
            {!job.description && !job.requirements && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center"
              >
                <p className="text-gray-400 py-8">暂无详细职位描述</p>
              </motion.div>
            )}
          </div>

          {/* 右侧：公司信息侧栏 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full lg:w-80 flex-shrink-0"
          >
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 sticky top-24">
              <h2 className="text-lg font-bold text-gray-900 mb-4">公司信息</h2>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {job.logo ? (
                    <img src={job.logo} alt={job.company_name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-cover.svg' }} />
                  ) : (
                    <Building2 className="w-7 h-7 text-gray-300" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{job.company_name}</h3>
                  {job.category && (
                    <p className="text-sm text-gray-500 mt-0.5">{job.category}</p>
                  )}
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>{job.location}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Briefcase className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>{job.type}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <DollarSign className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>{job.salary}</span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-100 space-y-3">
                <button
                  onClick={handleApply}
                  disabled={isApplyDisabled}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-colors ${
                    job.status && job.status !== 'active'
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : applyStatus === 'done'
                      ? 'bg-green-100 text-green-700 cursor-default'
                      : applyStatus === 'loading'
                      ? 'bg-primary-400 text-white cursor-wait'
                      : 'bg-primary-600 text-white hover:bg-primary-700'
                  }`}
                >
                  {applyStatus === 'loading' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      投递中...
                    </>
                  ) : applyStatus === 'done' ? (
                    '已投递'
                  ) : job.status && job.status !== 'active' ? (
                    '已结束招聘'
                  ) : (
                    '立即投递'
                  )}
                </button>
                <button
                  onClick={handleContactCompany}
                  disabled={chatLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-colors border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                  {chatLoading ? '创建中...' : '联系企业'}
                </button>
                <p className="text-xs text-gray-400 text-center mt-3">
                  平台保障 · 信息真实 · 隐私保护
                </p>
              </div>

              {/* 企业联系方式 */}
              {job.company_contact && (job.company_contact.phone || job.company_contact.wechat || job.company_contact.contact_email || job.company_contact.website) && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">联系方式</h3>
                  <div className="space-y-2.5">
                    {job.company_contact.phone && (
                      <div className="flex items-center gap-2.5 text-sm">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <Phone size={14} className="text-blue-600" />
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400">电话</p>
                          <p className="text-gray-700 font-medium">{job.company_contact.phone}</p>
                        </div>
                      </div>
                    )}
                    {job.company_contact.wechat && (
                      <div className="flex items-center gap-2.5 text-sm">
                        <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                          <MessageSquareText size={14} className="text-green-600" />
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400">微信</p>
                          <p className="text-gray-700 font-medium">{job.company_contact.wechat}</p>
                        </div>
                      </div>
                    )}
                    {job.company_contact.contact_email && (
                      <div className="flex items-center gap-2.5 text-sm">
                        <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                          <Mail size={14} className="text-amber-600" />
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400">邮箱</p>
                          <p className="text-gray-700 font-medium">{job.company_contact.contact_email}</p>
                        </div>
                      </div>
                    )}
                    {job.company_contact.website && (
                      <div className="flex items-center gap-2.5 text-sm">
                        <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                          <Globe size={14} className="text-purple-600" />
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400">官网</p>
                          <p className="text-gray-700 font-medium truncate">{job.company_contact.website}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
