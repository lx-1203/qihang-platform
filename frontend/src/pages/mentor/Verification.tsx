import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, FileBadge, Loader2, Plus, Save, Upload, X } from 'lucide-react';
import http from '@/api/http';
import ErrorState from '@/components/ui/ErrorState';
import FileUpload from '@/components/ui/FileUpload';
import MentorStatusBanner from './components/MentorStatusBanner';
import { getMentorQualificationStatus } from './lib/status';

interface VerificationProfile {
  title: string;
  bio: string;
  expertise: string[];
  experience: string;
  education: string;
  verify_status: 'pending' | 'approved' | 'rejected';
  verify_remark: string;
}

const emptyProfile: VerificationProfile = {
  title: '',
  bio: '',
  expertise: [],
  experience: '',
  education: '',
  verify_status: 'pending',
  verify_remark: '',
};

export default function MentorVerification() {
  const [profile, setProfile] = useState<VerificationProfile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expertiseInput, setExpertiseInput] = useState('');
  const [uploadedEvidence, setUploadedEvidence] = useState<string[]>([]);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      setLoading(true);
      setError(null);
      const res = await http.get('/mentor/profile');
      const next = res.data?.data?.profile;
      if (res.data?.code === 200 && next) {
        setProfile({
          title: next.title || '',
          bio: next.bio || '',
          expertise: Array.isArray(next.expertise) ? next.expertise : [],
          experience: next.experience || '',
          education: next.education || '',
          verify_status: next.verify_status || 'pending',
          verify_remark: next.verify_remark || '',
        });
      } else {
        setProfile(emptyProfile);
      }
    } catch (err) {
      setError('加载认证数据失败，请稍后重试。');
      if (import.meta.env.DEV) console.error('[DEV] mentor verification fetch error', err);
    } finally {
      setLoading(false);
    }
  }

  const qualificationStatus = useMemo(
    () =>
      getMentorQualificationStatus({
        verify_status: profile.verify_status,
        verify_remark: profile.verify_remark,
        title: profile.title,
        bio: profile.bio,
        expertise: profile.expertise,
      }),
    [profile]
  );

  function addExpertise() {
    const tags = expertiseInput
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    if (!tags.length) return;

    setProfile((prev) => ({
      ...prev,
      expertise: [...new Set([...prev.expertise, ...tags])],
    }));
    setExpertiseInput('');
  }

  function removeExpertise(tag: string) {
    setProfile((prev) => ({
      ...prev,
      expertise: prev.expertise.filter((item) => item !== tag),
    }));
  }

  async function handleSubmit() {
    try {
      setSaving(true);
      setError(null);
      await http.post('/mentor/profile', {
        title: profile.title,
        bio: profile.bio,
        expertise: profile.expertise,
        experience: profile.experience,
        education: profile.education,
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
      await fetchProfile();
    } catch (err) {
      setError('保存认证信息失败，请稍后重试。');
      if (import.meta.env.DEV) console.error('[DEV] mentor verification save error', err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-24 animate-pulse rounded-xl bg-gray-200" />
        <div className="h-80 animate-pulse rounded-xl bg-gray-200" />
      </div>
    );
  }

  if (error && !saving) {
    return <ErrorState message={error} onRetry={fetchProfile} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">导师资质认证</h1>
        <p className="mt-1 text-sm text-gray-500">
          提交您的资质信息，通过审核后即可获得官方认证标识并解锁咨询管理功能。
        </p>
      </div>

      <MentorStatusBanner status={qualificationStatus} remark={profile.verify_remark} />

      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium text-gray-700">专业头衔</span>
            <input
              value={profile.title}
              onChange={(event) => setProfile((prev) => ({ ...prev, title: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-gray-700">工作经历</span>
            <input
              value={profile.experience}
              onChange={(event) => setProfile((prev) => ({ ...prev, experience: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
            />
          </label>

          <label className="space-y-1 md:col-span-2">
            <span className="text-sm font-medium text-gray-700">个人简介</span>
            <textarea
              value={profile.bio}
              onChange={(event) => setProfile((prev) => ({ ...prev, bio: event.target.value }))}
              rows={5}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
            />
          </label>

          <label className="space-y-1 md:col-span-2">
            <span className="text-sm font-medium text-gray-700">教育背景</span>
            <input
              value={profile.education}
              onChange={(event) => setProfile((prev) => ({ ...prev, education: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
            />
          </label>
        </div>

        <div className="mt-6 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">擅长领域总结</h2>
            <p className="mt-1 text-sm text-gray-500">
              以下标签将帮助审核人员了解您的辅导方向。
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {profile.expertise.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-3 py-1 text-sm font-medium text-primary-700"
              >
                {tag}
                <button onClick={() => removeExpertise(tag)} className="rounded-full p-0.5 hover:bg-primary-100">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              value={expertiseInput}
              onChange={(event) => setExpertiseInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addExpertise();
                }
              }}
              placeholder="添加擅长领域标签"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
            />
            <button
              onClick={addExpertise}
              className="inline-flex items-center gap-1 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
            >
              <Plus className="h-4 w-4" />
              添加
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary-600" />
            <h2 className="text-sm font-semibold text-gray-900">证明材料上传</h2>
          </div>
          <p className="text-sm text-gray-500">
            上传学历证书、工作证明等材料，辅助审核人员核实您的资质信息。
          </p>
          <FileUpload
            category="general"
            accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onSuccess={(result) => {
              setUploadedEvidence((prev) => [...prev, result.url]);
            }}
          />
          {uploadedEvidence.length > 0 && (
            <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-4">
              {uploadedEvidence.map((url) => (
                <div key={url} className="flex items-center gap-2 text-sm text-gray-700">
                  <FileBadge className="h-4 w-4 text-primary-600" />
                  <span className="truncate">{url}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
          {saved && (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
              <CheckCircle className="h-4 w-4" />
              已保存
            </span>
          )}
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            保存认证信息
          </button>
        </div>
      </section>
    </div>
  );
}
