import type { MentorQualificationStatus } from '../lib/status';

const STATUS_COPY: Record<
  MentorQualificationStatus,
  { title: string; body: string; tone: string }
> = {
  not_submitted: {
    title: '未提交资质',
    body: '提交导师资质后，平台才会显示官方认证并开放咨询管理。',
    tone: 'border-gray-200 bg-gray-50 text-gray-700',
  },
  draft: {
    title: '未提交资质',
    body: '请完善个人资料并提交资质证明，审核通过后将开放咨询管理功能。',
    tone: 'border-gray-200 bg-gray-50 text-gray-700',
  },
  pending: {
    title: '资质审核中',
    body: '你仍可维护个人主页和资料库，咨询管理会在审核通过后开放。',
    tone: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  approved: {
    title: '资质已通过',
    body: '官方认证标识已生效，咨询管理已解锁。',
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  rejected: {
    title: '资质未通过',
    body: '请根据驳回原因调整资料后重新提交。',
    tone: 'border-red-200 bg-red-50 text-red-800',
  },
};

export default function MentorStatusBanner({
  status,
  remark,
}: {
  status: MentorQualificationStatus;
  remark?: string;
}) {
  const copy = STATUS_COPY[status];

  return (
    <section className={`rounded-xl border p-4 ${copy.tone}`}>
      <h2 className="text-sm font-semibold">{copy.title}</h2>
      <p className="mt-1 text-sm">{status === 'rejected' && remark ? remark : copy.body}</p>
    </section>
  );
}
