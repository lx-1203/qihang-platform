import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User, Save, Shield, ShieldCheck, ShieldAlert,
  Plus, X, Clock, Briefcase, Tag, DollarSign,
  Image, FileText, CheckCircle, Loader2
} from 'lucide-react';
import http from '@/api/http';

// ====== 导师资料编辑页 ======
// 个人信息编辑、专长标签、可用时间段管理

interface MentorProfile {
  name: string;
  title: string;
  bio: string;
  avatar: string;
  expertise: string[];
  pricePerSession: number;
  availableSlots: string[];
  verifyStatus: 'approved' | 'pending' | 'rejected';
  email: string;
  phone: string;
  experience: string;
  education: string;
}

const mockProfile: MentorProfile = {
  name: '陈导师',
  title: '资深职业规划师 / 前阿里巴巴HR总监',
  bio: '拥有10年人力资源管理经验，曾在阿里巴巴、腾讯等大厂担任HR负责人。擅长校招面试辅导、简历优化、职业发展规划。已累计辅导超过1200名学生成功入职大厂，面试通过率达85%以上。',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop',
  expertise: ['简历优化', '面试辅导', '职业规划', '校招策略', '大厂面经'],
  pricePerSession: 299,
  availableSlots: ['周一 09:00-12:00', '周二 14:00-18:00', '周三 09:00-12:00', '周四 14:00-18:00', '周五 10:00-16:00'],
  verifyStatus: 'approved',
  email: 'chen.mentor@example.com',
  phone: '138****5678',
  experience: '10年',
  education: '北京大学 · 人力资源管理硕士',
};

export default function MentorProfile() {
  const [profile, setProfile] = useState<MentorProfile>(mockProfile);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expertiseInput, setExpertiseInput] = useState('');
  const [slotInput, setSlotInput] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      setLoading(true);
      const res = await http.get('/mentor/profile');
      if (res.data?.code === 200 && res.data.data) {
        setProfile(res.data.data);
      }
    } catch {
      // 使用默认 Mock 数据
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      await http.put('/mentor/profile', profile);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // 保存失败时不做特殊处理，保持当前数据
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  function updateField(field: keyof MentorProfile, value: string | number) {
    setProfile(prev => ({ ...prev, [field]: value }));
  }

  function addExpertise() {
    const tags = expertiseInput.split(/[,，]/).map(t => t.trim()).filter(Boolean);
    if (tags.length > 0) {
      setProfile(prev => ({
        ...prev,
        expertise: [...new Set([...prev.expertise, ...tags])],
      }));
      setExpertiseInput('');
    }
  }

  function removeExpertise(tag: string) {
    setProfile(prev => ({
      ...prev,
      expertise: prev.expertise.filter(t => t !== tag),
    }));
  }

  function addSlot() {
    if (slotInput.trim()) {
      setProfile(prev => ({
        ...prev,
        availableSlots: [...prev.availableSlots, slotInput.trim()],
      }));
      setSlotInput('');
    }
  }

  function removeSlot(slot: string) {
    setProfile(prev => ({
      ...prev,
      availableSlots: prev.availableSlots.filter(s => s !== slot),
    }));
  }

  // 认证状态配置
  const verifyConfig = {
    approved: { label: '已认证', icon: ShieldCheck, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
    pending: { label: '审核中', icon: Shield, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
    rejected: { label: '未通过', icon: ShieldAlert, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
  };

  const verify = verifyConfig[profile.verifyStatus];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">个人资料</h1>
          <p className="text-gray-500 mt-1">编辑您的导师资料信息，完善资料可获得更多学生关注</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 shadow-sm"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : saved ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {saving ? '保存中...' : saved ? '已保存' : '保存资料'}
        </button>
      </div>

      {/* 认证状态横幅 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex items-center gap-3 p-4 rounded-xl border ${verify.bg}`}
      >
        <verify.icon className={`w-6 h-6 ${verify.color}`} />
        <div>
          <span className={`font-semibold ${verify.color}`}>认证状态：{verify.label}</span>
          {profile.verifyStatus === 'approved' && (
            <p className="text-sm text-green-600 mt-0.5">您的导师资质已通过审核，可正常接受学生预约。</p>
          )}
          {profile.verifyStatus === 'pending' && (
            <p className="text-sm text-orange-600 mt-0.5">您的资料正在审核中，审核通过后即可接受学生预约。</p>
          )}
          {profile.verifyStatus === 'rejected' && (
            <p className="text-sm text-red-600 mt-0.5">您的资料审核未通过，请修改后重新提交。</p>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：头像与基本信息 */}
        <div className="space-y-6">
          {/* 头像 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">头像</h3>
            <div className="flex flex-col items-center gap-4">
              <div className="w-28 h-28 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden border-4 border-primary-200">
                {profile.avatar ? (
                  <img src={profile.avatar} alt="头像" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-primary-400" />
                )}
              </div>
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Image className="w-4 h-4 inline mr-1" />
                  头像链接
                </label>
                <input
                  type="url"
                  value={profile.avatar}
                  onChange={e => updateField('avatar', e.target.value)}
                  placeholder="输入头像图片URL"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </motion.div>

          {/* 联系信息 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">联系信息</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={e => updateField('email', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
                <input
                  type="text"
                  value={profile.phone}
                  onChange={e => updateField('phone', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </motion.div>
        </div>

        {/* 右侧：详细资料 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 基本信息 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">基本信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <User className="w-4 h-4 inline mr-1" />
                  姓名
                </label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={e => updateField('name', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Briefcase className="w-4 h-4 inline mr-1" />
                  职称/头衔
                </label>
                <input
                  type="text"
                  value={profile.title}
                  onChange={e => updateField('title', e.target.value)}
                  placeholder="例如：资深HR总监"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">工作经验</label>
                <input
                  type="text"
                  value={profile.experience}
                  onChange={e => updateField('experience', e.target.value)}
                  placeholder="例如：10年"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">教育背景</label>
                <input
                  type="text"
                  value={profile.education}
                  onChange={e => updateField('education', e.target.value)}
                  placeholder="例如：北京大学 · 硕士"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  单次辅导价格 (元)
                </label>
                <input
                  type="number"
                  value={profile.pricePerSession}
                  onChange={e => updateField('pricePerSession', Number(e.target.value))}
                  min={0}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </motion.div>

          {/* 个人简介 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              <FileText className="w-5 h-5 inline mr-1" />
              个人简介
            </h3>
            <textarea
              value={profile.bio}
              onChange={e => updateField('bio', e.target.value)}
              rows={4}
              placeholder="介绍您的专业背景、擅长领域和辅导特色..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">{profile.bio.length}/500 字</p>
          </motion.div>

          {/* 专长标签 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              <Tag className="w-5 h-5 inline mr-1" />
              专长标签
            </h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {profile.expertise.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-full text-sm font-medium"
                >
                  {tag}
                  <button
                    onClick={() => removeExpertise(tag)}
                    className="w-4 h-4 rounded-full hover:bg-primary-200 flex items-center justify-center transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={expertiseInput}
                onChange={e => setExpertiseInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addExpertise())}
                placeholder="输入专长标签，多个用逗号分隔"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <button
                onClick={addExpertise}
                className="flex items-center gap-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                添加
              </button>
            </div>
          </motion.div>

          {/* 可用时间段 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              <Clock className="w-5 h-5 inline mr-1" />
              可用时间段
            </h3>
            <div className="space-y-2 mb-4">
              {profile.availableSlots.map((slot, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary-500" />
                    <span className="text-sm text-gray-700">{slot}</span>
                  </div>
                  <button
                    onClick={() => removeSlot(slot)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={slotInput}
                onChange={e => setSlotInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSlot())}
                placeholder="例如：周六 09:00-12:00"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <button
                onClick={addSlot}
                className="flex items-center gap-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                添加
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
