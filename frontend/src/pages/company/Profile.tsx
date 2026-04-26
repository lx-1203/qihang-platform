import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Building2, Globe, MapPin, Phone, Mail,
  Save, Loader2, CheckCircle, Shield,
  Users, FileText, ExternalLink, MessageSquareText
} from 'lucide-react';
import http from '@/api/http';
import { useAuthStore } from '@/store/auth';
import CityPicker from '@/components/ui/CityPicker';
import FileUpload from '@/components/ui/FileUpload';
import { DetailSkeleton } from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import { showToast } from '../../components/ui/ToastContainer';

// ====== 企业资料编辑 ======
// 商业级要求：完整企业信息管理、认证状态展示、双区域表单

interface CompanyProfile {
  id: number;
  companyName: string;
  industry: string;
  scale: string;
  description: string;
  logoUrl: string;
  website: string;
  address: string;
  phone: string;
  wechat: string;
  contactEmail: string;
  verifyStatus: 'pending' | 'verified' | 'rejected';
  createdAt: string;
}

function normalizeCompanyProfile(data: Record<string, unknown> | null | undefined): CompanyProfile | null {
  if (!data) return null;
  return {
    id: Number(data.id || 0),
    companyName: String(data.companyName || data.company_name || ''),
    industry: String(data.industry || ''),
    scale: String(data.scale || ''),
    description: String(data.description || ''),
    logoUrl: String(data.logoUrl || data.logo || ''),
    website: String(data.website || ''),
    address: String(data.address || ''),
    phone: String(data.phone || ''),
    wechat: String(data.wechat || ''),
    contactEmail: String(data.contactEmail || data.contact_email || ''),
    verifyStatus: (data.verifyStatus === 'verified' ? 'verified' : data.verify_status === 'approved' ? 'verified' : data.verifyStatus === 'rejected' || data.verify_status === 'rejected' ? 'rejected' : 'pending') as CompanyProfile['verifyStatus'],
    createdAt: String(data.createdAt || data.created_at || ''),
  };
}

const INDUSTRY_OPTIONS = [
  '互联网/IT', '金融/银行', '教育培训', '医疗健康', '制造业',
  '电商/零售', '文化传媒', '房地产/建筑', '汽车/交通', '能源/环保',
  '政府/事业单位', '咨询/法律', '其他'
];

const SCALE_OPTIONS = [
  '1-50人', '51-150人', '151-500人', '501-1000人',
  '1001-5000人', '5001-10000人', '10000人以上'
];

const VERIFY_MAP: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  pending: { label: '审核中', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Shield },
  verified: { label: '已认证', color: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle },
  rejected: { label: '未通过', color: 'bg-red-50 text-red-700 border-red-200', icon: Shield },
};

export default function CompanyProfile() {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user: authUser, setUser } = useAuthStore();

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      setLoading(true);
      setError(null);
      const res = await http.get('/company/profile');
      if (res.data?.code === 200) {
        const normalized = normalizeCompanyProfile((res.data.data?.company || res.data.data) as Record<string, unknown> | null | undefined);
        setProfile(normalized);
      } else {
        setError('获取企业资料失败，服务器返回异常');
      }
    } catch {
      setError('网络请求失败，请检查网络连接后重试');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!profile) return;
    try {
      setSaving(true);
      const payload = {
        company_name: profile.companyName,
        industry: profile.industry,
        scale: profile.scale,
        description: profile.description,
        logo: profile.logoUrl,
        website: profile.website,
        address: profile.address,
        phone: profile.phone || '',
        wechat: profile.wechat || '',
        contact_email: profile.contactEmail || '',
      };
      const res = await http.post('/company/profile', payload);
      setProfile(normalizeCompanyProfile((res.data?.data?.company || payload) as Record<string, unknown>));
      // 同步更新 auth store 中的头像（企业 Logo 作为头像显示）
      if (authUser) {
        setUser({
          ...authUser,
          avatar: profile.logoUrl || authUser.avatar,
        } as typeof authUser);
      }
      setSaved(true);
      showToast({ type: 'success', title: '保存成功' });
      setTimeout(() => setSaved(false), 2000);
    } catch {
      showToast({ type: 'error', title: '保存失败', message: '请检查网络连接后重试' });
    } finally {
      setSaving(false);
    }
  }

  function updateField(field: keyof CompanyProfile, value: string) {
    setProfile(prev => prev ? { ...prev, [field]: value } : prev);
  }

  const verifyInfo = VERIFY_MAP[profile?.verifyStatus || 'pending'] || VERIFY_MAP.pending;
  const VerifyIcon = verifyInfo.icon;

  if (loading) {
    return (
      <div className="space-y-6">
        <DetailSkeleton />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="space-y-6">
        <ErrorState
          message={error || '企业资料加载失败'}
          onRetry={fetchProfile}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">企业资料</h1>
          <p className="text-gray-500 mt-1">完善企业信息，提升招聘效果和企业形象</p>
        </div>
        <div className="flex items-center gap-3">
          {/* 认证状态 */}
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border ${verifyInfo.color}`}>
            <VerifyIcon className="w-4 h-4" />
            {verifyInfo.label}
          </span>
          {/* 保存按钮 */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium shadow-sm disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? '保存中...' : saved ? '已保存' : '保存修改'}
          </button>
        </div>
      </div>

      {/* 企业 Logo + 名片预览 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
      >
        <div className="flex items-start gap-6">
          <div className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-gray-200">
              {profile.logoUrl ? (
                <img src={profile.logoUrl} alt="企业Logo" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <Building2 className="w-10 h-10 text-gray-300" />
              )}
            </div>
            <div className="w-48">
              <FileUpload
                category="avatar"
                accept="image/*"
                placeholder="点击或拖拽上传Logo（JPG/PNG，最大5MB）"
                onSuccess={(result) => updateField('logoUrl', result.url)}
              />
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{profile.companyName}</h2>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Building2 className="w-4 h-4" /> {profile.industry}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" /> {profile.scale}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" /> {profile.address}
              </span>
            </div>
            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 mt-2"
              >
                <ExternalLink className="w-3.5 h-3.5" /> {profile.website}
              </a>
            )}
          </div>
        </div>
      </motion.div>

      {/* 基本信息 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
      >
        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary-500" />
          基本信息
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 企业名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">企业名称 <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={profile.companyName}
              onChange={e => updateField('companyName', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              placeholder="请输入企业全称"
            />
          </div>

          {/* 所属行业 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">所属行业 <span className="text-red-500">*</span></label>
            <select
              id="company-industry"
              name="industry"
              value={profile.industry}
              onChange={e => updateField('industry', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white"
            >
              {INDUSTRY_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* 企业规模 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">企业规模 <span className="text-red-500">*</span></label>
            <select
              id="company-scale"
              name="scale"
              value={profile.scale}
              onChange={e => updateField('scale', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white"
            >
              {SCALE_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* Logo URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">或输入 Logo URL</label>
            <input
              type="text"
              value={profile.logoUrl}
              onChange={e => updateField('logoUrl', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              placeholder="https://example.com/logo.png"
            />
          </div>

          {/* 企业官网 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">企业官网</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="url"
                value={profile.website}
                onChange={e => updateField('website', e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                placeholder="https://www.example.com"
              />
            </div>
          </div>

          {/* 企业地址 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">企业地址 <span className="text-red-500">*</span></label>
            <CityPicker
              value={profile.address}
              onChange={val => updateField('address', val)}
              placeholder="选择城市"
            />
          </div>

          {/* 企业简介 - 跨两列 */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">企业简介 <span className="text-red-500">*</span></label>
            <textarea
              id="company-description"
              name="description"
              value={profile.description}
              onChange={e => updateField('description', e.target.value)}
              rows={4}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
              placeholder="请简要介绍企业情况、主营业务、发展前景等"
            />
            <p className="text-xs text-gray-400 mt-1">{profile.description.length}/500 字</p>
          </div>
        </div>
      </motion.div>

      {/* 联系信息 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
      >
        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary-500" />
          联系信息
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 联系电话 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">联系电话</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="tel"
                value={profile.phone}
                onChange={e => updateField('phone', e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                placeholder="请输入联系电话"
              />
            </div>
          </div>

          {/* 微信号 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">微信号</label>
            <div className="relative">
              <MessageSquareText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={profile.wechat}
                onChange={e => updateField('wechat', e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                placeholder="请输入微信号"
              />
            </div>
          </div>

          {/* 联系邮箱 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">联系邮箱</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={profile.contactEmail}
                onChange={e => updateField('contactEmail', e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                placeholder="请输入联系邮箱"
              />
            </div>
          </div>
        </div>
        <p className="mt-4 text-xs text-gray-400">联系方式将在职位详情页展示，方便求职者与您取得联系</p>
      </motion.div>

      {/* 底部保存提示 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-center justify-between bg-gray-50 rounded-xl p-4 border border-gray-200"
      >
        <p className="text-sm text-gray-500">
          账号创建时间：{profile.createdAt} · 请确保信息真实有效，虚假信息将影响企业认证
        </p>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? '保存中...' : '保存修改'}
        </button>
      </motion.div>
    </div>
  );
}
