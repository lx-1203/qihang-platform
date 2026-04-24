import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Building2, Globe, MapPin, Phone, Mail,
  Save, Loader2, CheckCircle, Shield,
  Camera, Users, FileText, ExternalLink
} from 'lucide-react';
import http from '@/api/http';
import CityPicker from '@/components/ui/CityPicker';
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
  contactPerson: string;
  contactPhone: string;
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
    contactPerson: String(data.contactPerson || data.contact_person || ''),
    contactPhone: String(data.contactPhone || data.contact_phone || ''),
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
      };
      const res = await http.post('/company/profile', payload);
      setProfile(normalizeCompanyProfile((res.data?.data?.company || payload) as Record<string, unknown>));
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
          <div className="relative group">
            <img
              src={profile.logoUrl}
              alt="企业Logo"
              className="w-24 h-24 rounded-xl object-cover border-2 border-gray-200"
            />
            <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
              <Camera className="w-6 h-6 text-white" />
              <input
                type="file"
                accept="image/*"
                className="absolute inset-0 opacity-0 cursor-pointer"
                title="点击上传企业Logo"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const formData = new FormData();
                  formData.append('file', file);
                  formData.append('category', 'avatar');
                  try {
                    const res = await http.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
                    if (res.data?.code === 200) {
                       updateField('logoUrl', res.data.data.url);
                       showToast({ type: 'success', title: '上传成功' });
                    } else {
                       showToast({ type: 'error', title: '上传失败', message: res.data?.message || '未知错误' });
                    }
                  } catch {
                     showToast({ type: 'error', title: '上传失败', message: '网络错误' });
                  }
                  // clear input
                  e.target.value = '';
                }}
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
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Logo 链接</label>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 联系人 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">联系人</label>
            <input
              type="text"
              value={profile.contactPerson}
              readOnly
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
              placeholder="当前后端暂未提供联系人字段"
            />
          </div>

          {/* 联系电话 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">联系电话</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="tel"
                value={profile.contactPhone}
                readOnly
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                placeholder="当前后端暂未提供联系电话字段"
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
                readOnly
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                placeholder="当前后端暂未提供联系邮箱字段"
              />
            </div>
          </div>
        </div>
        <p className="mt-4 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          当前仅支持保存企业名称、行业、规模、简介、Logo、官网和地址；联系人信息暂为只读展示，避免出现“可编辑但无法保存”的误导。
        </p>
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
