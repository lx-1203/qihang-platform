import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Phone, School, BookOpen, GraduationCap,
  Tag, Target, FileText, Save,
  Pencil, X, Check, Link, Briefcase,
  Send, Heart, MessageCircle, Clock, ExternalLink,
  ChevronRight, BriefcaseBusiness, Trash2, Download, CircleDot
} from 'lucide-react';
import http from '@/api/http';
import { showToast } from '@/components/ui/ToastContainer';
import { useAuthStore } from '@/store/auth';
import { DetailSkeleton } from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import FileUpload from '@/components/ui/FileUpload';

// ====== 学生个人资料页 ======
// 支持查看/编辑模式切换，个人信息编辑、技能标签管理、简历上传

interface StudentProfile {
  nickname: string;
  phone: string;
  school: string;
  major: string;
  grade: string;
  skills: string[];
  jobIntention: string;
  bio: string;
  resumeUrl: string;
  resumeUploadedAt: string;
  avatar: string;
  email: string;
}

const gradeOptions = ['大一', '大二', '大三', '大四', '研一', '研二', '研三', '博士'];

// 空白初始值（新用户 / API 返回空时使用）
const emptyProfile: StudentProfile = {
  nickname: '', phone: '', school: '', major: '', grade: '大一',
  skills: [], jobIntention: '', bio: '', resumeUrl: '', resumeUploadedAt: '', avatar: '', email: '',
};

const commonSkills = [
  'React', 'Vue', 'Angular', 'TypeScript', 'JavaScript',
  'Node.js', 'Python', 'Java', 'Go', 'C++',
  'MySQL', 'MongoDB', 'Redis', 'Docker', 'Git',
  'Spring Boot', 'Django', 'Flask', 'Express', 'Tailwind CSS',
];

export default function Profile() {
  const setUser = useAuthStore(state => state.setUser);
  const authUser = useAuthStore(state => state.user);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<StudentProfile>(emptyProfile);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [newSkill, setNewSkill] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Tab 切换
  const [activeTab, setActiveTab] = useState<'profile' | 'applications' | 'favorites' | 'chat'>('profile');

  // 投递记录
  const [applications, setApplications] = useState<any[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [appsError, setAppsError] = useState<string | null>(null);

  // 收藏
  const [favorites, setFavorites] = useState<any[]>([]);
  const [favsLoading, setFavsLoading] = useState(false);
  const [favsError, setFavsError] = useState<string | null>(null);

  // 聊天记录
  const [conversations, setConversations] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, []);

  // 切换 tab 时懒加载数据
  useEffect(() => {
    if (activeTab === 'applications' && applications.length === 0) {
      fetchApplications();
    }
    if (activeTab === 'favorites' && favorites.length === 0) {
      fetchFavorites();
    }
    if (activeTab === 'chat' && conversations.length === 0) {
      fetchConversations();
    }
  }, [activeTab]);

  async function fetchProfile() {
    try {
      setLoading(true);
      const res = await http.get('/student/profile');
      if (res.data?.code === 200 && res.data.data) {
        // 后端返回 {profile: {...} | null, user: {...}}
        // 当 profile 为 null 时（新用户），用 user 数据构建空档案
        const raw = res.data.data;
        const profileData = raw.profile || raw;
        const userData = raw.user || {};
        const merged = {
          nickname: profileData.nickname || userData.nickname || userData.email || '',
          phone: profileData.phone || userData.phone || '',
          school: profileData.school || '',
          major: profileData.major || '',
          grade: profileData.grade || '大一',
          skills: typeof profileData.skills === 'string'
            ? (() => { try { return JSON.parse(profileData.skills); } catch { return []; } })()
            : Array.isArray(profileData.skills) ? profileData.skills : [],
          jobIntention: profileData.job_intention || profileData.jobIntention || '',
          bio: profileData.bio || '',
          resumeUrl: profileData.resume_url || profileData.resumeUrl || '',
          resumeUploadedAt: profileData.updated_at || '',
          avatar: profileData.avatar || userData.avatar || '',
          email: profileData.email || userData.email || '',
        };
        setProfile(merged);
        setEditData(merged);
      }
    } catch (err) {
      setError('数据加载失败，请刷新重试');
      if (import.meta.env.DEV) console.error('[DEV] API error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      await http.post('/student/profile', {
        nickname: editData.nickname,
        phone: editData.phone,
        school: editData.school,
        major: editData.major,
        grade: editData.grade,
        bio: editData.bio,
        skills: editData.skills,
        job_intention: editData.jobIntention,
        resume_url: editData.resumeUrl,
      });
      setProfile(editData);
      if (authUser) {
        setUser({
          ...authUser,
          name: editData.nickname || authUser.name,
          phone: editData.phone,
        });
      }
      setEditMode(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      // 保存失败：不更新 profile 状态，不退出编辑模式，显示错误提示
      setSaveError('保存失败，请稍后重试');
      if (import.meta.env.DEV) console.error('[DEV] Save error:', err);
      setTimeout(() => setSaveError(null), 5000);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setEditData(profile || emptyProfile);
    setEditMode(false);
    setNewSkill('');
    setSaveError(null);
  }

  function addSkill(skill: string) {
    const trimmed = skill.trim();
    if (trimmed && !editData.skills.includes(trimmed)) {
      setEditData({ ...editData, skills: [...editData.skills, trimmed] });
    }
    setNewSkill('');
  }

  function removeSkill(skill: string) {
    setEditData({ ...editData, skills: editData.skills.filter(s => s !== skill) });
  }

  // 从简历 URL 中提取原始文件名（用于显示）
  function getResumeDisplayName(url: string): string {
    if (!url) return '我的简历';
    const parts = url.split('/');
    const filename = parts[parts.length - 1] || '';
    // 文件名格式: userId_timestamp_random.ext，去掉前缀提取可读部分
    const match = filename.match(/^\d+_\d+_[a-f0-9]+(.+)$/);
    if (match) return '简历文件' + match[1];
    return decodeURIComponent(filename) || '我的简历';
  }

  // 从简历 URL 中提取文件扩展名
  function getResumeExt(url: string): string {
    if (!url) return '';
    const parts = url.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  }

  // 删除简历（将 resume_url 置空并保存）
  async function handleDeleteResume() {
    if (!confirm('确定要删除已上传的简历吗？')) return;
    try {
      const base = profile || editData;
      const updated = { ...base, resumeUrl: '' };
      await http.post('/student/profile', {
        nickname: updated.nickname,
        phone: updated.phone,
        school: updated.school,
        major: updated.major,
        grade: updated.grade,
        bio: updated.bio,
        skills: updated.skills,
        job_intention: updated.jobIntention,
        resume_url: '',
      });
      setEditData(updated);
      setProfile(updated);
      showToast('简历已删除', 'success');
    } catch {
      showToast('删除失败，请稍后重试', 'error');
    }
  }

  async function fetchApplications() {
    try {
      setAppsLoading(true);
      setAppsError(null);
      const res = await http.get('/student/resumes');
      if (res.data?.code === 200) {
        setApplications(res.data.data?.resumes || res.data.data?.list || []);
      }
    } catch (err) {
      setAppsError('投递记录加载失败');
      if (import.meta.env.DEV) console.error('[DEV] Applications error:', err);
    } finally {
      setAppsLoading(false);
    }
  }

  async function fetchFavorites() {
    try {
      setFavsLoading(true);
      setFavsError(null);
      const res = await http.get('/student/favorites');
      if (res.data?.code === 200) {
        setFavorites(res.data.data?.favorites || res.data.data?.list || []);
      }
    } catch (err) {
      setFavsError('收藏加载失败');
      if (import.meta.env.DEV) console.error('[DEV] Favorites error:', err);
    } finally {
      setFavsLoading(false);
    }
  }

  async function fetchConversations() {
    try {
      setChatLoading(true);
      setChatError(null);
      const res = await http.get('/chat/conversations');
      if (res.data?.code === 200) {
        setConversations(res.data.data?.conversations || res.data.data || []);
      }
    } catch (err) {
      setChatError('聊天记录加载失败');
      if (import.meta.env.DEV) console.error('[DEV] Conversations error:', err);
    } finally {
      setChatLoading(false);
    }
  }

  // 投递状态映射
  function getStatusLabel(status: string) {
    const map: Record<string, { text: string; color: string }> = {
      pending: { text: '待查看', color: 'bg-yellow-50 text-yellow-700' },
      reviewed: { text: '已查看', color: 'bg-blue-50 text-blue-700' },
      accepted: { text: '已通过', color: 'bg-green-50 text-green-700' },
      rejected: { text: '已拒绝', color: 'bg-red-50 text-red-700' },
    };
    return map[status] || { text: status, color: 'bg-gray-50 text-gray-700' };
  }

  // 时间格式化（友好显示）
  function formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return '刚刚';
    if (diffMin < 60) return `${diffMin}分钟前`;
    if (diffHour < 24) return `${diffHour}小时前`;
    if (diffDay < 7) return `${diffDay}天前`;
    return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
  }

  // Tab 配置
  const tabs = [
    { key: 'profile' as const, label: '个人资料', icon: User },
    { key: 'applications' as const, label: '投递记录', icon: Send },
    { key: 'favorites' as const, label: '我的收藏', icon: Heart },
    { key: 'chat' as const, label: '聊天记录', icon: MessageCircle },
  ];

  // 信息项组件
  function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
    return (
      <div className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
        <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-primary-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400">{label}</p>
          <p className="text-sm font-medium text-gray-900 truncate">{value || '未填写'}</p>
        </div>
      </div>
    );
  }

  if (loading) return <div className="container-narrow py-8"><DetailSkeleton /></div>;
  if (error) return <div className="container-narrow py-8"><ErrorState message={error} onRetry={() => { setError(null); fetchProfile(); }} /></div>;
  if (!profile) return <div className="container-narrow py-8"><DetailSkeleton /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-8 min-h-[60vh]">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">个人中心</h1>
          <p className="text-gray-500 mt-1">管理个人信息、查看投递与收藏</p>
        </div>
        {activeTab === 'profile' && (
          <div className="flex items-center gap-3">
            {saveSuccess && (
              <motion.span
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1 text-sm text-green-600 font-medium"
              >
                <Check className="w-4 h-4" /> 保存成功
              </motion.span>
            )}
            {saveError && (
              <motion.span
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1 text-sm text-red-600 font-medium"
              >
                <X className="w-4 h-4" /> {saveError}
              </motion.span>
            )}
            {!editMode ? (
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium"
              >
                <Pencil className="w-4 h-4" />
                编辑资料
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  <X className="w-4 h-4" />
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tab 导航 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-6 py-3.5 text-sm font-medium transition-colors relative ${
                activeTab === tab.key
                  ? 'text-primary-600'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {activeTab === tab.key && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 内容 */}
      <AnimatePresence mode="wait">
        {/* ===== 个人资料 Tab ===== */}
        {activeTab === 'profile' && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 左栏：头像 + 基本信息概览 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
              >
                {/* 头像区域 */}
                <div className="flex flex-col items-center mb-6">
                  <div className="w-24 h-24 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center mb-3">
                    <span className="text-3xl font-bold text-white">
                      {(profile.nickname || profile.email || '学')[0]}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{profile.nickname}</h3>
                  <p className="text-sm text-gray-500">{profile.email}</p>
                  <span className="mt-2 px-3 py-1 bg-primary-50 text-primary-700 text-xs font-medium rounded-full">
                    {profile.grade} · {profile.major}
                  </span>
                </div>

                {/* 快速信息 */}
                <div className="space-y-1">
                  <InfoRow icon={School} label="学校" value={profile.school} />
                  <InfoRow icon={BookOpen} label="专业" value={profile.major} />
                  <InfoRow icon={GraduationCap} label="年级" value={profile.grade} />
                  <InfoRow icon={Target} label="求职意向" value={profile.jobIntention} />
                  <InfoRow icon={Phone} label="手机号码" value={profile.phone} />
                </div>
              </motion.div>

              {/* 右栏：详细信息编辑 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="lg:col-span-2 space-y-6"
              >
                {/* 基本信息 */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-primary-500" />
                    基本信息
                  </h3>
                  {editMode ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">昵称</label>
                        <input
                          type="text"
                          value={editData.nickname}
                          onChange={e => setEditData({ ...editData, nickname: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
                          placeholder="请输入昵称"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">手机号码</label>
                        <input
                          type="text"
                          value={editData.phone}
                          onChange={e => setEditData({ ...editData, phone: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
                          placeholder="请输入手机号码"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">学校</label>
                        <input
                          type="text"
                          value={editData.school}
                          onChange={e => setEditData({ ...editData, school: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
                          placeholder="请输入学校名称"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">专业</label>
                        <input
                          type="text"
                          value={editData.major}
                          onChange={e => setEditData({ ...editData, major: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
                          placeholder="请输入专业"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">年级</label>
                        <select
                          value={editData.grade}
                          onChange={e => setEditData({ ...editData, grade: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
                        >
                          {gradeOptions.map(g => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">求职意向</label>
                        <input
                          type="text"
                          value={editData.jobIntention}
                          onChange={e => setEditData({ ...editData, jobIntention: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
                          placeholder="例如：前端开发工程师"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">个人简介</label>
                        <textarea
                          value={editData.bio}
                          onChange={e => setEditData({ ...editData, bio: e.target.value })}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm resize-none"
                          placeholder="简单介绍一下自己..."
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { label: '昵称', value: profile.nickname },
                          { label: '手机号码', value: profile.phone },
                          { label: '学校', value: profile.school },
                          { label: '专业', value: profile.major },
                          { label: '年级', value: profile.grade },
                          { label: '求职意向', value: profile.jobIntention },
                        ].map(item => (
                          <div key={item.label}>
                            <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                            <p className="text-sm font-medium text-gray-900">{item.value || '未填写'}</p>
                          </div>
                        ))}
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">个人简介</p>
                        <p className="text-sm text-gray-700 leading-relaxed">{profile.bio || '暂未填写个人简介'}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 技能标签 */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Tag className="w-5 h-5 text-primary-500" />
                    技能标签
                  </h3>
                  {editMode ? (
                    <div className="space-y-4">
                      {/* 已选技能 */}
                      <div className="flex flex-wrap gap-2">
                        {editData.skills.map(skill => (
                          <span
                            key={skill}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-full text-sm font-medium"
                          >
                            {skill}
                            <button
                              onClick={() => removeSkill(skill)}
                              className="ml-1 hover:text-red-500 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      {/* 添加新技能 */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newSkill}
                          onChange={e => setNewSkill(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && addSkill(newSkill)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
                          placeholder="输入技能名称，按回车添加"
                        />
                        <button
                          onClick={() => addSkill(newSkill)}
                          className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium"
                        >
                          添加
                        </button>
                      </div>
                      {/* 常用技能快选 */}
                      <div>
                        <p className="text-xs text-gray-400 mb-2">快速添加常用技能：</p>
                        <div className="flex flex-wrap gap-2">
                          {commonSkills.filter(s => !editData.skills.includes(s)).slice(0, 12).map(skill => (
                            <button
                              key={skill}
                              onClick={() => addSkill(skill)}
                              className="px-2.5 py-1 border border-gray-200 text-gray-600 rounded-full text-xs hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                            >
                              + {skill}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {(profile.skills || []).length > 0 ? (
                        profile.skills.map(skill => (
                          <span
                            key={skill}
                            className="px-3 py-1.5 bg-primary-50 text-primary-700 rounded-full text-sm font-medium"
                          >
                            {skill}
                          </span>
                        ))
                      ) : (
                        <p className="text-sm text-gray-400">暂未添加技能标签</p>
                      )}
                    </div>
                  )}
                </div>

                {/* 简历管理 */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary-500" />
                    简历管理
                  </h3>
                  {editMode ? (
                    <div className="space-y-4">
                      {/* 已有简历提示 + 删除按钮 */}
                      {editData.resumeUrl && (
                        <div className="flex items-center gap-3 p-3 bg-primary-50 border border-primary-100 rounded-lg">
                          <FileText className="w-5 h-5 text-primary-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-primary-800 truncate">
                              当前简历: {getResumeDisplayName(editData.resumeUrl)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await http.post('/student/profile', {
                                  nickname: editData.nickname,
                                  phone: editData.phone,
                                  school: editData.school,
                                  major: editData.major,
                                  grade: editData.grade,
                                  bio: editData.bio,
                                  skills: editData.skills,
                                  job_intention: editData.jobIntention,
                                  resume_url: '',
                                });
                                setEditData({ ...editData, resumeUrl: '' });
                                setProfile(prev => prev ? { ...prev, resumeUrl: '' } : prev);
                                showToast('简历已移除', 'success');
                              } catch {
                                showToast('移除失败，请稍后重试', 'error');
                              }
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors font-medium"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            移除
                          </button>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">简历链接</label>
                        <div className="flex gap-2">
                          <div className="flex-1 relative">
                            <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="url"
                              value={editData.resumeUrl}
                              onChange={e => setEditData({ ...editData, resumeUrl: e.target.value })}
                              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
                              placeholder="输入简历文件链接（如网盘地址、在线简历URL）"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-1.5">支持在线简历链接或网盘分享地址</p>
                      </div>
                      {/* 上传区域 */}
                      <FileUpload
                        category="resume"
                        accept=".pdf,.doc,.docx"
                        maxSize={10 * 1024 * 1024}
                        onSuccess={(result) => {
                          setEditData({ ...editData, resumeUrl: result.url });
                          showToast('简历上传成功', 'success');
                        }}
                      />
                    </div>
                  ) : (
                    <div>
                      {profile.resumeUrl ? (
                        <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                              <FileText className="w-6 h-6 text-primary-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">
                                {getResumeDisplayName(profile.resumeUrl)}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                {getResumeExt(profile.resumeUrl) && (
                                  <span className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-600 uppercase font-medium">
                                    {getResumeExt(profile.resumeUrl)}
                                  </span>
                                )}
                                {profile.resumeUploadedAt && (
                                  <span>上传于 {new Date(profile.resumeUploadedAt).toLocaleDateString('zh-CN')}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pt-1 border-t border-gray-200">
                            <a
                              href={profile.resumeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 transition-colors font-medium"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              查看
                            </a>
                            <a
                              href={profile.resumeUrl}
                              download
                              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-100 transition-colors font-medium"
                            >
                              <Download className="w-3.5 h-3.5" />
                              下载
                            </a>
                            <div className="flex-1" />
                            <button
                              onClick={handleDeleteResume}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg text-sm transition-colors font-medium"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              删除
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Briefcase className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                          <p className="text-sm text-gray-500">暂未上传简历</p>
                          <p className="text-xs text-gray-400 mt-1">点击下方按钮上传简历文件或添加链接</p>
                          <button
                            onClick={() => setEditMode(true)}
                            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 transition-colors font-medium"
                          >
                            上传简历
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* ===== 投递记录 Tab ===== */}
        {activeTab === 'applications' && (
          <motion.div
            key="applications"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Send className="w-5 h-5 text-primary-500" />
                投递记录
              </h3>
              <button
                onClick={fetchApplications}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                刷新
              </button>
            </div>

            {appsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse flex gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/3" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : appsError ? (
              <div className="text-center py-12">
                <p className="text-sm text-red-500">{appsError}</p>
                <button
                  onClick={fetchApplications}
                  className="mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  重试
                </button>
              </div>
            ) : applications.length === 0 ? (
              <div className="text-center py-12">
                <BriefcaseBusiness className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">暂无投递记录</p>
                <p className="text-sm text-gray-400 mt-1">去职位页面看看吧</p>
                <a
                  href="/jobs"
                  className="inline-flex items-center gap-1 mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 transition-colors"
                >
                  浏览职位 <ChevronRight className="w-4 h-4" />
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                {applications.map((app: any) => {
                  const st = getStatusLabel(app.status || 'pending');
                  return (
                    <div
                      key={app.id}
                      className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <BriefcaseBusiness className="w-6 h-6 text-primary-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {app.job_title || app.title || '职位'}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {app.company_name || app.company || ''}
                          {app.created_at ? ` · ${new Date(app.created_at).toLocaleDateString()}` : ''}
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${st.color}`}>
                        {st.text}
                      </span>
                      {app.job_id && (
                        <a
                          href={`/jobs/${app.job_id}`}
                          className="text-gray-400 hover:text-primary-500 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ===== 我的收藏 Tab ===== */}
        {activeTab === 'favorites' && (
          <motion.div
            key="favorites"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary-500" />
                我的收藏
              </h3>
              <button
                onClick={fetchFavorites}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                刷新
              </button>
            </div>

            {favsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse flex gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/3" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : favsError ? (
              <div className="text-center py-12">
                <p className="text-sm text-red-500">{favsError}</p>
                <button
                  onClick={fetchFavorites}
                  className="mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  重试
                </button>
              </div>
            ) : favorites.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">暂无收藏</p>
                <p className="text-sm text-gray-400 mt-1">浏览职位和课程时可以收藏感兴趣的内容</p>
              </div>
            ) : (
              <div className="space-y-3">
                {favorites.map((fav: any) => (
                  <div
                    key={fav.id}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Heart className="w-6 h-6 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {fav.title || fav.name || '收藏项'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {(fav.target_type || fav.type) === 'job' ? '职位' : (fav.target_type || fav.type) === 'course' ? '课程' : (fav.target_type || fav.type) === 'mentor' ? '导师' : '收藏'}
                        {fav.created_at ? ` · ${new Date(fav.created_at).toLocaleDateString()}` : ''}
                      </p>
                    </div>
                    {fav.target_id && (
                      <a
                        href={fav.target_type === 'course' ? `/courses/${fav.target_id}` : fav.target_type === 'mentor' ? `/mentors/${fav.target_id}` : `/jobs/${fav.target_id}`}
                        className="text-gray-400 hover:text-primary-500 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ===== 聊天记录 Tab ===== */}
        {activeTab === 'chat' && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary-500" />
                聊天记录
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={fetchConversations}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  刷新
                </button>
                <a
                  href="/chat"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 transition-colors font-medium"
                >
                  <MessageCircle className="w-4 h-4" />
                  进入聊天
                </a>
              </div>
            </div>

            {chatLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse flex gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-gray-200 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/3" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : chatError ? (
              <div className="text-center py-12">
                <p className="text-sm text-red-500">{chatError}</p>
                <button
                  onClick={fetchConversations}
                  className="mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  重试
                </button>
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">暂无聊天记录</p>
                <p className="text-sm text-gray-400 mt-1">与导师或企业在线聊天，获取实时指导</p>
                <a
                  href="/chat"
                  className="inline-flex items-center gap-1 mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 transition-colors"
                >
                  开始聊天 <ChevronRight className="w-4 h-4" />
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                {conversations.map((conv: any) => {
                  const isActive = conv.status === 'active';
                  const typeLabel = conv.type === 'ai_chat' ? 'AI 助手' : '客服';
                  const displayName = conv.title || typeLabel;
                  const timeStr = conv.last_message_at
                    ? formatTime(conv.last_message_at)
                    : conv.created_at
                    ? formatTime(conv.created_at)
                    : '';
                  return (
                    <div
                      key={conv.id}
                      onClick={() => navigate(`/chat?id=${conv.id}`)}
                      className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center flex-shrink-0 relative">
                        <span className="text-sm font-bold text-white">
                          {displayName[0]}
                        </span>
                        {isActive && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-white rounded-full" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
                            {conv.unread_user > 0 && (
                              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full">
                                {conv.unread_user > 99 ? '99+' : conv.unread_user}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{timeStr}</span>
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {conv.last_message || '暂无消息'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                            isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
                          }`}>
                            <CircleDot className="w-2.5 h-2.5" />
                            {isActive ? '进行中' : conv.status === 'pending' ? '待回复' : '已结束'}
                          </span>
                          <span className="text-[10px] text-gray-400">{typeLabel}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
