import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Award, CheckCircle2, FileSearch, FileText, Loader2, Search, ShieldCheck, XCircle
} from 'lucide-react';
import http from '@/api/http';
import { showToast } from '@/components/ui/ToastContainer';

type ReviewStatus = 'pending' | 'submitted' | 'approved' | 'rejected' | 'missing';

interface MentorReviewRecord {
  mentorUserId: number;
  mentorName: string;
  mentorStatus: ReviewStatus;
  createdAt: string;
  credentialUrl?: string;
  email?: string;
  verifiedBadge?: string;
}

const STATUS_TEXT: Record<ReviewStatus, string> = {
  pending: '待审核',
  submitted: '待审核',
  approved: '已通过',
  rejected: '已驳回',
  missing: '未提交',
};

const STATUS_TONE: Record<ReviewStatus, string> = {
  pending: 'bg-amber-50 text-amber-700',
  submitted: 'bg-amber-50 text-amber-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
  missing: 'bg-gray-100 text-gray-500',
};

export default function MentorReview() {
  const [keyword, setKeyword] = useState('');
  const [records, setRecords] = useState<MentorReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function fetchRecords() {
    try {
      setLoading(true);
      const res = await http.get('/admin/review-center', {
        params: {
          keyword: keyword.trim(),
          scope: 'mentor',
        },
      });
      const raw = res.data?.data?.records || [];
      setRecords(raw);
    } catch {
      showToast({ type: 'error', title: '导师资质审核数据加载失败' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleReview(record: MentorReviewRecord, status: 'approved' | 'rejected') {
    if (!record.mentorUserId) return;
    const actionKey = `mentor-${record.mentorUserId}-${status}`;
    try {
      setActionLoading(actionKey);
      await http.put(`/admin/mentors/${record.mentorUserId}/verify`, {
        status: status === 'approved' ? 1 : 0,
        remark: status === 'approved' ? '审核中心通过' : '审核中心驳回',
      });
      showToast({
        type: status === 'approved' ? 'success' : 'warning',
        title: `导师资质已${status === 'approved' ? '通过' : '驳回'}`,
      });
      await fetchRecords();
    } catch {
      showToast({ type: 'error', title: '导师资质审核失败' });
    } finally {
      setActionLoading(null);
    }
  }

  const pendingCount = records.filter((item) =>
    ['pending', 'submitted'].includes(item.mentorStatus)
  ).length;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">导师审核工作台</h1>
          <p className="mt-1 text-sm text-gray-500">
            审核导师提交的资质认证申请
            {pendingCount > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                {pendingCount} 条待审核
              </span>
            )}
          </p>
        </div>

        <div className="flex w-full gap-3 lg:w-auto">
          <label className="relative flex-1 lg:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') fetchRecords();
              }}
              placeholder="搜索导师姓名..."
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
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-amber-100 bg-white p-5">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <FileSearch className="h-5 w-5" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {records.filter((item) => ['pending', 'submitted'].includes(item.mentorStatus)).length}
          </div>
          <div className="text-sm text-gray-500">待审核</div>
        </div>
        <div className="rounded-2xl border border-purple-100 bg-white p-5">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {records.filter((item) => item.mentorStatus === 'approved').length}
          </div>
          <div className="text-sm text-gray-500">已通过</div>
        </div>
        <div className="rounded-2xl border border-red-100 bg-white p-5">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <XCircle className="h-5 w-5" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {records.filter((item) => item.mentorStatus === 'rejected').length}
          </div>
          <div className="text-sm text-gray-500">已驳回</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <ShieldCheck className="h-4 w-4 text-primary-600" />
            导师资质审核记录
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 px-6 py-20 text-sm text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            正在加载导师审核数据
          </div>
        ) : records.length === 0 ? (
          <div className="px-6 py-20 text-center text-sm text-gray-500">
            暂无待审核的导师资质申请
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {records.map((record) => (
              <motion.div
                key={`mentor-${record.mentorUserId}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid gap-4 px-6 py-5 md:grid-cols-[1.4fr,1fr,1fr,1.2fr]"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50">
                      <ShieldCheck className="h-4.5 w-4.5 text-purple-600" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{record.mentorName || '未命名导师'}</span>
                      {record.mentorStatus === 'approved' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                          <Award className="h-3 w-3" />
                          {record.verifiedBadge || '已认证'}
                        </span>
                      )}
                    </div>
                  </div>
                  {record.email && (
                    <div className="text-xs text-gray-400">{record.email}</div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-medium text-gray-400">资质材料</div>
                  {record.credentialUrl ? (
                    <a
                      href={record.credentialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      查看资质证书
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400">未上传材料</span>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-medium text-gray-400">提交时间</div>
                  <div className="text-sm text-gray-600">
                    {record.createdAt
                      ? new Date(record.createdAt).toLocaleString('zh-CN')
                      : '-'}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-gray-400">审核状态</div>
                  <div
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_TONE[record.mentorStatus]}`}
                  >
                    {STATUS_TEXT[record.mentorStatus]}
                  </div>
                  {(record.mentorStatus === 'pending' ||
                    record.mentorStatus === 'submitted') &&
                  record.mentorUserId ? (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleReview(record, 'approved')}
                        disabled={
                          actionLoading ===
                          `mentor-${record.mentorUserId}-approved`
                        }
                        className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-60"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        通过
                      </button>
                      <button
                        onClick={() => handleReview(record, 'rejected')}
                        disabled={
                          actionLoading ===
                          `mentor-${record.mentorUserId}-rejected`
                        }
                        className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-60"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        驳回
                      </button>
                    </div>
                  ) : null}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}