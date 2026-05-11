import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import http from '@/api/http';
import { useAuthStore } from '@/store/auth';
import { buildAccessStatus, getDefaultRouteForRole } from '@/lib/accessControl';

function getRoleCopy(role: string) {
  switch (role) {
    case 'company':
      return {
        badge: '企业认证入口',
        title: '企业实名认证',
        description: '完成实名认证后，可继续补齐企业资质并解锁发布职位、管理简历、搜索人才等关键操作。',
        tips: ['当前阶段可先浏览企业概览页和资料页。', '实名认证和资质审核通过后恢复完整企业后台权限。'],
      };
    case 'mentor':
      return {
        badge: '导师认证入口',
        title: '导师实名认证',
        description: '完成实名认证后，可继续补齐导师资质并解锁资源管理、咨询管理、学员管理等关键操作。',
        tips: ['当前阶段可先浏览导师概览页、资料页和资源页。', '实名认证和资质审核通过后恢复完整导师工作台权限。'],
      };
    case 'student':
    default:
      return {
        badge: '可选提升项',
        title: '学生实名认证',
        description: '学生实名认证不是强制步骤，但通过后会解锁详情页、投递、收藏、通知、聊天和学生个人中心。',
        tips: ['未实名时仍可浏览首页和四大板块概览。', '通过实名认证后自动恢复完整学生访问权限。'],
      };
  }
}

export default function VerifyIdentity() {
  const navigate = useNavigate();
  const { setAccessStatus, user } = useAuthStore();
  const role = user?.role || 'student';
  const copy = useMemo(() => getRoleCopy(role), [role]);

  const [form, setForm] = useState({
    realName: '',
    idNumber: '',
    phone: '',
    documentUrl: '',
  });
  const [statusText, setStatusText] = useState('未提交');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    http
      .get('/identity/status')
      .then((response) => {
        if (!response.data?.data) return;

        const data = response.data.data;
        setForm({
          realName: data.real_name || '',
          idNumber: data.id_number || '',
          phone: data.phone || '',
          documentUrl: data.document_url || '',
        });
        setStatusText(data.status || '未提交');
      })
      .catch(() => undefined);
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await http.post('/identity/submit', form);
      const nextStatus = buildAccessStatus({
        role,
        ...(response.data.data?.accessStatus || response.data.data || {}),
      });

      setAccessStatus(nextStatus);
      setStatusText(response.data.data?.identityStatus || nextStatus.identityStatus);

      if (nextStatus.identityStatus === 'approved') {
        navigate(getDefaultRouteForRole(nextStatus.role), { replace: true });
        return;
      }

      navigate('/verify-identity', { replace: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">{copy.badge}</p>
        <h1 className="mt-3 text-3xl font-semibold text-neutral-900">{copy.title}</h1>
        <p className="mt-2 text-sm text-neutral-500">{copy.description}</p>

        <div className="mt-4 rounded-2xl bg-neutral-100 px-4 py-3 text-sm text-neutral-700">
          当前状态：{statusText}
        </div>

        <ul className="mt-4 space-y-2 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 text-sm text-neutral-600">
          {copy.tips.map((tip) => (
            <li key={tip}>• {tip}</li>
          ))}
        </ul>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <input
            value={form.realName}
            onChange={(event) => setForm((prev) => ({ ...prev, realName: event.target.value }))}
            className="w-full rounded-2xl border border-neutral-200 px-4 py-3"
            placeholder="真实姓名"
            required
          />
          <input
            value={form.idNumber}
            onChange={(event) => setForm((prev) => ({ ...prev, idNumber: event.target.value }))}
            className="w-full rounded-2xl border border-neutral-200 px-4 py-3"
            placeholder="身份证号/证件号"
            required
          />
          <input
            value={form.phone}
            onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
            className="w-full rounded-2xl border border-neutral-200 px-4 py-3"
            placeholder="手机号"
          />
          <input
            value={form.documentUrl}
            onChange={(event) => setForm((prev) => ({ ...prev, documentUrl: event.target.value }))}
            className="w-full rounded-2xl border border-neutral-200 px-4 py-3"
            placeholder="证件图片地址（可选）"
          />
          <button
            className="rounded-2xl bg-neutral-900 px-5 py-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
          >
            {loading ? '提交中...' : '提交实名认证'}
          </button>
        </form>
      </div>
    </div>
  );
}
