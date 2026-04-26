import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Briefcase, MapPin, TrendingUp, Users, Clock, Eye, Send,
  Target, Zap, CheckCircle, Mail, Phone, MessageSquare, Loader2
} from 'lucide-react';
import Tag from '@/components/ui/Tag';
import http from '@/api/http';
import { useAuthStore } from '@/store/auth';
import { useToast } from '@/components/ui/ToastContainer';

interface Position {
  role: string;
  skills: string[];
  equity: string;
  desc: string;
}

interface PartnerPost {
  id: number;
  user_id: number;
  username: string;
  avatar_url: string;
  email: string;
  title: string;
  project_name: string;
  project_desc: string;
  stage: 'idea' | 'mvp' | 'early' | 'growth';
  industry: string;
  location: string;
  positions: Position[];
  equity_range: string;
  highlights: string[];
  team_size: number;
  funding_status: string;
  contact_method: 'platform' | 'wechat' | 'email' | 'phone';
  contact_info: string;
  view_count: number;
  apply_count: number;
  application_stats: Record<string, number>;
  created_at: string;
}

const STAGE_MAP = {
  idea: { label: '创意期', color: 'gray' },
  mvp: { label: '产品期', color: 'blue' },
  early: { label: '初创期', color: 'primary' },
  growth: { label: '成长期', color: 'green' },
};

const CONTACT_METHOD_MAP = {
  platform: '站内消息',
  wechat: '微信',
  email: '邮箱',
  phone: '电话',
};

export default function PartnerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const toast = useToast();

  const [post, setPost] = useState<PartnerPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applying, setApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);

  const [formData, setFormData] = useState({
    position: '',
    introduction: '',
    skills: '',
    experience: '',
    why_join: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPost();
  }, [id]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      const res = await http.get(`/partners/${id}`);
      setPost(res.data.data);

      // 检查是否已申请
      if (isAuthenticated) {
        try {
          const myAppsRes = await http.get('/partners/my/applications');
          const applied = myAppsRes.data.data.some((app: any) => app.post_id === Number(id));
          setHasApplied(applied);
        } catch (err) {
          console.error('检查申请状态失败:', err);
        }
      }
    } catch (err: any) {
      console.error('获取招募详情失败:', err);
      if (err.response?.status === 404) {
        navigate('/partners');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    // 表单验证
    const errors: Record<string, string> = {};
    if (!formData.position) {
      errors.position = '请选择申请职位';
    }
    if (!formData.introduction || formData.introduction.trim().length < 20) {
      errors.introduction = '请填写自我介绍（至少20字）';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setApplying(true);
      setFormErrors({});
      await http.post(`/partners/${id}/apply`, {
        ...formData,
        skills: formData.skills ? formData.skills.split(',').map(s => s.trim()) : [],
      });
      toast.success('申请成功', '您的申请已提交，请等待发布者回复');
      setShowApplyModal(false);
      setHasApplied(true);
      fetchPost(); // 刷新申请统计
    } catch (err: any) {
      toast.error('申请失败', err.response?.data?.message || '请稍后重试');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!post) {
    return null;
  }

  const isOwner = user?.id === post.user_id;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 返回按钮 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate('/partners')}
            className="flex items-center gap-2 text-gray-600 hover:text-primary-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            返回列表
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 主内容 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 项目概览 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <img
                    src={post.avatar_url || '/default-avatar.png'}
                    alt={post.username}
                    className="w-14 h-14 rounded-full"
                  />
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{post.project_name}</h1>
                    <p className="text-sm text-gray-500">发起人：{post.username}</p>
                  </div>
                </div>
                <Tag variant={STAGE_MAP[post.stage].color as any}>
                  {STAGE_MAP[post.stage].label}
                </Tag>
              </div>

              <h2 className="text-xl font-bold text-gray-900 mb-3">{post.title}</h2>

              <div className="flex flex-wrap gap-2 mb-4">
                <Tag variant="gray" size="sm">
                  <Briefcase className="w-3.5 h-3.5" /> {post.industry}
                </Tag>
                {post.location && (
                  <Tag variant="gray" size="sm">
                    <MapPin className="w-3.5 h-3.5" /> {post.location}
                  </Tag>
                )}
                {post.funding_status && (
                  <Tag variant="blue" size="sm">
                    <TrendingUp className="w-3.5 h-3.5" /> {post.funding_status}
                  </Tag>
                )}
                <Tag variant="gray" size="sm">
                  <Users className="w-3.5 h-3.5" /> 团队 {post.team_size} 人
                </Tag>
              </div>

              <div className="prose max-w-none">
                <h3 className="text-lg font-bold text-gray-900 mb-2">项目介绍</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{post.project_desc}</p>
              </div>
            </motion.div>

            {/* 招募职位 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-primary-500" />
                招募职位
              </h3>
              <div className="space-y-4">
                {post.positions.map((pos, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-bold text-gray-900">{pos.role}</h4>
                      <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-lg text-sm font-medium">
                        {pos.equity}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{pos.desc}</p>
                    <div className="flex flex-wrap gap-2">
                      {pos.skills.map((skill, sidx) => (
                        <span
                          key={sidx}
                          className="px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-700"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* 项目亮点 */}
            {post.highlights && post.highlights.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
              >
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  项目亮点
                </h3>
                <ul className="space-y-2">
                  {post.highlights.map((highlight, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-700">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </div>

          {/* 侧边栏 */}
          <div className="space-y-6">
            {/* 申请按钮 */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 sticky top-4"
            >
              {isOwner ? (
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-4">这是您发布的招募</p>
                  <Link
                    to="/student/profile"
                    className="block w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    管理我的招募
                  </Link>
                </div>
              ) : hasApplied ? (
                <div className="text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 mb-4">您已申请该职位</p>
                  <Link
                    to="/student/profile"
                    className="block w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    查看申请状态
                  </Link>
                </div>
              ) : (
                <>
                  {isAuthenticated ? (
                    <button
                      onClick={() => setShowApplyModal(true)}
                      className="w-full px-4 py-3 bg-primary-500 text-white rounded-lg font-bold hover:bg-primary-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <Send className="w-5 h-5" />
                      申请加入
                    </button>
                  ) : (
                    <Link
                      to="/login"
                      className="block w-full px-4 py-3 bg-primary-500 text-white rounded-lg font-bold hover:bg-primary-600 transition-colors text-center"
                    >
                      登录后申请
                    </Link>
                  )}
                </>
              )}

              {/* 统计信息 */}
              <div className="mt-6 pt-6 border-t border-gray-100 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Eye className="w-4 h-4" /> 浏览量
                  </span>
                  <span className="font-medium text-gray-900">{post.view_count}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Send className="w-4 h-4" /> 申请人数
                  </span>
                  <span className="font-medium text-gray-900">
                    {post.application_stats?.pending || 0} 待处理
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Clock className="w-4 h-4" /> 发布时间
                  </span>
                  <span className="font-medium text-gray-900">
                    {new Date(post.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* 联系方式 */}
              {post.contact_method !== 'platform' && post.contact_info && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">联系方式</h4>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    {post.contact_method === 'email' && <Mail className="w-4 h-4" />}
                    {post.contact_method === 'phone' && <Phone className="w-4 h-4" />}
                    {post.contact_method === 'wechat' && <MessageSquare className="w-4 h-4" />}
                    <span>{CONTACT_METHOD_MAP[post.contact_method]}</span>
                  </div>
                  <p className="text-sm text-gray-900 mt-1 font-mono">{post.contact_info}</p>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* 申请弹窗 */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4">申请加入</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  申请职位 <span className="text-red-500">*</span>
                </label>
                <select
                  id="apply-position"
                  name="position"
                  value={formData.position}
                  onChange={(e) => {
                    setFormData({ ...formData, position: e.target.value });
                    setFormErrors({ ...formErrors, position: '' });
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    formErrors.position ? 'border-red-300' : 'border-gray-200'
                  }`}
                >
                  <option value="">请选择职位</option>
                  {post.positions.map((pos, idx) => (
                    <option key={idx} value={pos.role}>
                      {pos.role} ({pos.equity})
                    </option>
                  ))}
                </select>
                {formErrors.position && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.position}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  自我介绍 <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="apply-introduction"
                  name="introduction"
                  value={formData.introduction}
                  onChange={(e) => {
                    setFormData({ ...formData, introduction: e.target.value });
                    setFormErrors({ ...formErrors, introduction: '' });
                  }}
                  rows={4}
                  placeholder="请简要介绍您的背景和经验（至少20字）..."
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    formErrors.introduction ? 'border-red-300' : 'border-gray-200'
                  }`}
                />
                {formErrors.introduction && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.introduction}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  技能标签（逗号分隔）
                </label>
                <input
                  id="apply-skills"
                  name="skills"
                  type="text"
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  placeholder="如: Python, React, 产品设计"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  相关经验
                </label>
                <textarea
                  id="apply-experience"
                  name="experience"
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  rows={3}
                  placeholder="请描述您的相关项目经验..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  为什么想加入
                </label>
                <textarea
                  id="apply-why-join"
                  name="why_join"
                  value={formData.why_join}
                  onChange={(e) => setFormData({ ...formData, why_join: e.target.value })}
                  rows={3}
                  placeholder="请说明您为什么对这个项目感兴趣..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowApplyModal(false)}
                disabled={applying}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleApply}
                disabled={applying}
                className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {applying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    提交中...
                  </>
                ) : (
                  '提交申请'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
