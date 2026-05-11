import { useEffect, useMemo, useState } from 'react';
import {
  Building2, CheckCircle2, FileSearch, GraduationCap, Loader2, Search,
  ShieldCheck, UserRoundCheck, XCircle
} from 'lucide-react';
import http from '@/api/http';
import { showToast } from '@/components/ui/ToastContainer';
import CompanyReview from './CompanyReview';
import MentorReview from './MentorReview';

type ReviewStatus = 'pending' | 'submitted' | 'approved' | 'rejected' | 'missing';

interface ReviewRecord {
  userId: number;
  role: string;
  nickname: string;
  email: string;
  phone: string;
  createdAt: string;
  identityVerificationId: number | null;
  identityStatus: ReviewStatus;
  identityRealName: string;
  careerPlanId: number | null;
  careerPlanName: string;
  developmentDirections: string[];
  companyUserId: number | null;
  companyName: string;
  companyStatus: ReviewStatus;
  mentorUserId: number | null;
  mentorName: string;
  mentorStatus: ReviewStatus;
}

const STATUS_TEXT: Record<ReviewStatus, string> = {
  pending: '待审核',
  submitted: '待审核',
  approved: '已通过',
  rejected: '已驳回',
  missing: '未提交',
};

function statusTone(status: ReviewStatus) {
  if (status === 'approved') return 'bg-green-50 text-green-700';
  if (status === 'rejected') return 'bg-red-50 text-red-700';
  if (status === 'missing') return 'bg-gray-100 text-gray-500';
  return 'bg-amber-50 text-amber-700';
}

const TABS = [
  { key: 'identity', label: '用户与实名审核', icon: UserRoundCheck },
  { key: 'company', label: '企业资质审核', icon: Building2 },
  { key: 'mentor', label: '导师资质审核', icon: ShieldCheck },
] as const;

type ActiveTab = (typeof TABS)[number]['key'];

export default function ReviewCenter() {
  const [keyword, setKeyword] = useState('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('identity');
  const [records, setRecords] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function fetchRecords() {
    try {
      setLoading(true);
      const res = await http.get('/admin/review-center', {
        params: {
          keyword: keyword.trim(),
          scope: activeTab === 'identity' ? 'all' : activeTab,
        },
      });
      setRecords(res.data?.data?.records || []);
    } catch {
      showToast({ type: 'error', title: '审核中心加载失败' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === 'identity') {
      fetchRecords();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const summary = useMemo(() => {
    return {
      identityPending: records.filter((item) =>
        ['pending', 'submitted'].includes(item.identityStatus)
      ).length,
      careerReady: records.filter((item) => item.careerPlanId).length,
      companyPending: records.filter((item) =>
        ['pending', 'submitted'].includes(item.companyStatus)
      ).length,
      mentorPending: records.filter((item) =>
        ['pending', 'submitted'].includes(item.mentorStatus)
      ).length,
    };
  }, [records]);

  async function handleIdentityReview(
    record: ReviewRecord,
    status: 'approved' | 'rejected'
  ) {
    if (!record.identityVerificationId) return;
    const actionKey = `identity-${record.identityVerificationId}-${status}`;
    try {
      setActionLoading(actionKey);
      await http.put(
        `/admin/identity-reviews/${record.identityVerificationId}/review`,
        {
          status,
          reviewRemark:
            status === 'approved' ? '审核中心通过' : '审核中心驳回',
        }
      );
      showToast({
        type: status === 'approved' ? 'success' : 'warning',
        title: `实名认证已${status === 'approved' ? '通过' : '驳回'}`,
      });
      await fetchRecords();
    } catch {
      showToast({ type: 'error', title: '实名认证审核失败' });
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">审核中心</h1>
          <p className="mt-1 text-sm text-gray-500">
            统一处理用户查询、实名认证与生涯规划审核
          </p>
        </div>

        {activeTab === 'identity' && (
          <div className="flex w-full gap-3 lg:w-auto">
            <label className="relative flex-1 lg:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') fetchRecords();
                }}
                placeholder="搜索用户、邮箱、姓名..."
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-primary-500"
              />
            </label>
            <button
              onClick={() => fetchRecords()}
              className="rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
            >
              查询
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-amber-100 bg-white p-5">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <UserRoundCheck className="h-5 w-5" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {summary.identityPending}
          </div>
          <div className="text-sm text-gray-500">实名认证</div>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-white p-5">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {summary.careerReady}
          </div>
          <div className="text-sm text-gray-500">生涯规划</div>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-white p-5">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {summary.companyPending}
          </div>
          <div className="text-sm text-gray-500">企业资质</div>
        </div>
        <div className="rounded-2xl border border-purple-100 bg-white p-5">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {summary.mentorPending}
          </div>
          <div className="text-sm text-gray-500">咨询资质</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab !== 'identity' ? (
        <div className="mt-2">
          {activeTab === 'company' && <CompanyReview />}
          {activeTab === 'mentor' && <MentorReview />}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
          <div className="border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <FileSearch className="h-4 w-4 text-primary-600" />
              用户查询 / 实名审核 / 生涯规划
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 px-6 py-20 text-sm text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              正在加载审核数据
            </div>
          ) : records.length === 0 ? (
            <div className="px-6 py-20 text-center text-sm text-gray-500">
              暂无匹配记录
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {records.map((record) => (
                <div
                  key={record.userId}
                  className="grid gap-4 px-6 py-5 lg:grid-cols-[1.2fr,1fr,1fr,1fr,1fr]"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-gray-900">
                        {record.nickname || '未命名用户'}
                      </div>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {record.role}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {record.email || '-'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {record.phone || '未填写手机号'}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-medium text-gray-400">
                      实名认证
                    </div>
                    <div
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusTone(record.identityStatus)}`}
                    >
                      {STATUS_TEXT[record.identityStatus]}
                    </div>
                    <div className="text-sm text-gray-600">
                      {record.identityRealName || '未提交实名资料'}
                    </div>
                    {(record.identityStatus === 'pending' ||
                      record.identityStatus === 'submitted') &&
                    record.identityVerificationId ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            handleIdentityReview(record, 'approved')
                          }
                          disabled={
                            actionLoading ===
                            `identity-${record.identityVerificationId}-approved`
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          通过
                        </button>
                        <button
                          onClick={() =>
                            handleIdentityReview(record, 'rejected')
                          }
                          disabled={
                            actionLoading ===
                            `identity-${record.identityVerificationId}-rejected`
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 disabled:opacity-60"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          驳回
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-medium text-gray-400">
                      生涯规划
                    </div>
                    <div
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${record.careerPlanId ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}
                    >
                      {record.careerPlanId ? '已提交' : '未提交'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {record.careerPlanName || '暂无生涯规划'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {record.developmentDirections.join(' / ') ||
                        '未填写方向'}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-medium text-gray-400">
                      企业资质
                    </div>
                    <div
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusTone(record.companyStatus)}`}
                    >
                      {STATUS_TEXT[record.companyStatus]}
                    </div>
                    <div className="text-sm text-gray-600">
                      {record.companyName || '非企业用户'}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-medium text-gray-400">
                      咨询资质
                    </div>
                    <div
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusTone(record.mentorStatus)}`}
                    >
                      {STATUS_TEXT[record.mentorStatus]}
                    </div>
                    <div className="text-sm text-gray-600">
                      {record.mentorName || '非咨询角色用户'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}