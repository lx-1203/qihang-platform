import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User, Phone, School, BookOpen, GraduationCap,
  Tag, Target, FileText, Upload, Save,
  Pencil, X, Check, Link, Briefcase
} from 'lucide-react';
import http from '@/api/http';
import FeatureStatus from '@/components/FeatureStatus';
import { DetailSkeleton } from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';

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
  avatar: string;
  email: string;
}

const gradeOptions = ['大一', '大二', '大三', '大四', '研一', '研二', '研三', '博士'];

// 空白初始值（新用户 / API 返回空时使用）
const emptyProfile: StudentProfile = {
  nickname: '', phone: '', school: '', major: '', grade: '大一',
  skills: [], jobIntention: '', bio: '', resumeUrl: '', avatar: '', email: '',
};

const commonSkills = [
  'React', 'Vue', 'Angular', 'TypeScript', 'JavaScript',
  'Node.js', 'Python', 'Java', 'Go', 'C++',
  'MySQL', 'MongoDB', 'Redis', 'Docker', 'Git',
  'Spring Boot', 'Django', 'Flask', 'Express', 'Tailwind CSS',
];

export default function Profile() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<StudentProfile>(emptyProfile);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [newSkill, setNewSkill] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      setLoading(true);
      const res = await http.get('/student/profile');
      if (res.data?.code === 200 && res.data.data) {
        setProfile(res.data.data);
        setEditData(res.data.data);
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
      await http.put('/student/profile', editData);
      setProfile(editData);
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">个人资料</h1>
          <p className="text-gray-500 mt-1">管理你的个人信息和求职偏好</p>
        </div>
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
      </div>

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
                {profile.nickname.charAt(0)}
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
                {profile.skills.length > 0 ? (
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
                  <p className="text-xs text-gray-400 mt-1.5">支持在线简历链接或网盘分享地址，后续将支持文件直传</p>
                </div>
                {/* 上传区域（预留） */}
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-primary-300 transition-colors">
                  <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <div className="flex justify-center mb-2"><FeatureStatus status="coming" label="文件上传即将上线" size="md" /></div>
                  <p className="text-xs text-gray-400">目前请使用简历链接方式，文件直传功能开发中</p>
                </div>
              </div>
            ) : (
              <div>
                {profile.resumeUrl ? (
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                      <FileText className="w-6 h-6 text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">我的简历</p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{profile.resumeUrl}</p>
                    </div>
                    <a
                      href={profile.resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 transition-colors"
                    >
                      查看
                    </a>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Briefcase className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">暂未上传简历</p>
                    <p className="text-xs text-gray-400 mt-1">编辑资料后可添加简历链接</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
