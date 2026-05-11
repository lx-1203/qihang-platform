import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search, CheckCircle, XCircle, Clock, Eye,
  Building2, Globe, MapPin, Users as UsersIcon,
  ChevronLeft, ChevronRight, X, MessageSquare, Loader2, FileText, FileEdit,
  Square, CheckSquare
} from 'lucide-react';
import http from '@/api/http';
import Tag from '@/components/ui/Tag';
import { TableSkeleton } from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import { showToast } from '@/components/ui/ToastContainer';

// ====== 企业资质审核 ======
// 商业级要求：企业认证审核流程、审核记录留痕

interface CompanyRecord {
  id: number;
  user_id: number;
  company_name: string;
  industry: string;
  scale: string;
  description: string;
  logo: string;
  website: string;
  address: string;
  verify_status: 'draft' | 'pending' | 'approved' | 'rejected';
  verify_remark: string;
  created_at: string;
  email?: string;
  license_url?: string;
  org_code?: string;
  business_scope?: string;
}

const STATUS_MAP = {
  draft: { label: '草稿', color: 'bg-gray-100 text-gray-600', icon: FileEdit },
  pending: { label: '待审核', color: 'bg-amber-100 text-amber-700', icon: Clock },
  approved: { label: '已通过', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: '已驳回', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function AdminCompanies() {
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;
  const [reviewModal, setReviewModal] = useState<CompanyRecord | null>(null);
  const [reviewRemark, setReviewRemark] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailCompany, setDetailCompany] = useState<CompanyRecord | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchReviewing, setBatchReviewing] = useState(false);

  useEffect(() => {
    loadCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, search]);

  async function loadCompanies() {
    try {
      setLoading(true);
      setError(null);
      const res = await http.get('/admin/companies', {
        params: { page, pageSize, status: statusFilter, keyword: search },
      });
      if (res.data?.code === 200 && res.data.data) {
        setCompanies(res.data.data.list || res.data.data.companies || []);
        setTotal(res.data.data.pagination?.total || res.data.data.total || 0);
      } else {
        setError('数据加载失败，请稍后重试');
      }
    } catch {
      setError('数据加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const pendingCompanies = companies.filter((c) => c.verify_status === 'pending' || c.verify_status === 'draft');
    if (pendingCompanies.length === 0) return;
    if (selectedIds.size === pendingCompanies.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingCompanies.map((c) => c.id)));
    }
  }

  async function handleBatchReview(status: 'approved' | 'rejected') {
    if (selectedIds.size === 0) return;
    const action = status === 'approved' ? '通过' : '驳回';
    if (!window.confirm(`确定要批量${action} ${selectedIds.size} 家企业吗？${status === 'rejected' ? '驳回后企业需重新提交审核。' : ''}`)) return;

    setBatchReviewing(true);
    try {
      for (const id of selectedIds) {
        await http.put(`/admin/companies/${id}/review`, { status });
      }
      showToast(`已${action} ${selectedIds.size} 家企业的审核`, 'success');
      setSelectedIds(new Set());
      loadCompanies();
    } catch {
      showToast('部分企业审核操作失败', 'error');
    } finally {
      setBatchReviewing(false);
    }
  }

  async function handleReview(companyId: number, status: 'approved' | 'rejected') {
    try {
      await http.put(`/admin/companies/${companyId}/verify`, { status, remark: reviewRemark });
      showToast({
        type: status === 'approved' ? 'success' : 'warning',
        title: status === 'approved' ? '企业审核已通过' : '企业审核已驳回',
        message: reviewRemark ? `备注：${reviewRemark}` : undefined
      });
    } catch {
      showToast({ type: 'error', title: '操作失败，请重试' });
    }
    setReviewModal(null);
    setReviewRemark('');
    loadCompanies();
  }

  async function sendCompanyFeedback() {
    if (!detailCompany || !feedbackText.trim()) return;
    setFeedbackSending(true);
    try {
      await http.post('/admin/feedback', {
        userId: detailCompany.user_id,
        title: `关于企业「${detailCompany.company_name}」的审核反馈`,
        content: feedbackText,
      });
      showToast({ type: 'success', title: '反馈已发送' });
      setFeedbackText('');
    } catch {
      showToast({ type: 'error', title: '发送失败，请重试' });
    } finally {
      setFeedbackSending(false);
    }
  }

  const totalPages = Math.ceil(total / pageSize);
  const pendingCount = companies.filter(c => c.verify_status === 'pending').length;

  if (loading) return <div className="space-y-6"><TableSkeleton rows={6} cols={4} /></div>;
  if (error) return (
    <div className="space-y-6">
      <ErrorState
        message={error}
        onRetry={() => { setError(null); loadCompanies(); }}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">企业资质审核</h1>
        <p className="text-gray-500 mt-1">
          审核企业注册资质，确保平台企业信息真实可靠
          {pendingCount > 0 && (
            <Tag variant="yellow" size="sm" className="ml-2">
              {pendingCount} 条待审核
            </Tag>
          )}
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: '草稿', count: companies.filter(c => c.verify_status === 'draft').length, color: 'text-gray-600', bg: 'bg-gray-50', icon: FileEdit },
          { label: '待审核', count: companies.filter(c => c.verify_status === 'pending').length, color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock },
          { label: '已通过', count: companies.filter(c => c.verify_status === 'approved').length, color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle },
          { label: '已驳回', count: companies.filter(c => c.verify_status === 'rejected').length, color: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
        ].map(item => (
          <div key={item.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className={`w-12 h-12 ${item.bg} rounded-xl flex items-center justify-center`}>
              <item.icon className={`w-6 h-6 ${item.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{item.count}</p>
              <p className="text-sm text-gray-500">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 搜索和筛选 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            id="company-search"
            name="company-search"
            type="text"
            placeholder="搜索企业名称..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-base focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'draft', 'pending', 'approved', 'rejected'].map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s === 'all' ? '全部' : STATUS_MAP[s as keyof typeof STATUS_MAP].label}
            </button>
          ))}
        </div>
      </div>

      {/* 批量操作栏 */}
      {selectedIds.size > 0 && (
        <div className="bg-primary-50 rounded-xl p-4 border border-primary-200 flex items-center justify-between">
          <span className="text-sm font-medium text-primary-700">
            已选择 {selectedIds.size} 家企业
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              取消选择
            </button>
            <button
              onClick={() => handleBatchReview('approved')}
              disabled={batchReviewing}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {batchReviewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              批量通过
            </button>
            <button
              onClick={() => handleBatchReview('rejected')}
              disabled={batchReviewing}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              <XCircle className="w-4 h-4" />
              批量驳回
            </button>
          </div>
        </div>
      )}

      {/* 全选按钮 */}
      {companies.some((c) => c.verify_status === 'pending' || c.verify_status === 'draft') && (
        <button
          onClick={toggleSelectAll}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 transition-colors"
        >
          {selectedIds.size === companies.filter((c) => c.verify_status === 'pending' || c.verify_status === 'draft').length
            ? <CheckSquare className="w-4 h-4 text-primary-500" />
            : <Square className="w-4 h-4" />
          }
          {selectedIds.size > 0 ? '取消全选' : '全选待审核企业'}
        </button>
      )}

      {/* 企业列表 */}
      <div className="space-y-4">
        {companies.map((company, i) => {
          const status = STATUS_MAP[company.verify_status];
          const StatusIcon = status.icon;
          return (
            <motion.div
              key={company.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  {(company.verify_status === 'pending' || company.verify_status === 'draft') && (
                    <button
                      onClick={() => toggleSelect(company.id)}
                      className="mt-1.5 text-gray-400 hover:text-primary-500 transition-colors"
                    >
                      {selectedIds.has(company.id)
                        ? <CheckSquare className="w-5 h-5 text-primary-500" />
                        : <Square className="w-5 h-5" />
                      }
                    </button>
                  )}
                  <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Building2 className="w-7 h-7 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-gray-900">{company.company_name}</h3>
                      <Tag
                        variant={company.verify_status === 'pending' ? 'yellow' : company.verify_status === 'approved' ? 'green' : 'red'}
                        size="sm"
                        className="inline-flex items-center gap-1"
                      >
                        <StatusIcon className="w-3.5 h-3.5" />
                        {status.label}
                      </Tag>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{company.description}</p>
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{company.industry}</span>
                      <span className="flex items-center gap-1"><UsersIcon className="w-3.5 h-3.5" />{company.scale}</span>
                      {company.address && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{company.address}</span>}
                      {company.website && <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" />{company.website}</span>}
                    </div>
                    {company.verify_remark && (
                      <p className="text-xs text-red-500 mt-2 bg-red-50 px-3 py-1.5 rounded-lg">
                        驳回原因：{company.verify_remark}
                      </p>
                    )}
                    {(company.license_url || company.org_code) && (
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                        {company.org_code && (
                          <span className="bg-gray-50 px-2 py-0.5 rounded">代码：{company.org_code}</span>
                        )}
                        {company.license_url && (
                          <span className="bg-green-50 text-green-600 px-2 py-0.5 rounded">已上传营业执照</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {company.verify_status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleReview(company.id, 'approved')}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-1"
                      >
                        <CheckCircle className="w-4 h-4" />
                        通过
                      </button>
                      <button
                        onClick={() => setReviewModal(company)}
                        className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium flex items-center gap-1"
                      >
                        <XCircle className="w-4 h-4" />
                        驳回
                      </button>
                    </>
                  )}
                  <button onClick={() => setDetailCompany(company)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" title="查看详情">
                    <Eye className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">共 {total} 条记录</p>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600">第 {page} / {totalPages || 1} 页</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 企业详情弹窗 */}
      {detailCompany && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={() => { setDetailCompany(null); setFeedbackText(''); }}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl"
          >
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <h3 className="text-lg font-bold text-gray-900">企业详情</h3>
              <button onClick={() => { setDetailCompany(null); setFeedbackText(''); }} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="flex items-center gap-4">
                {detailCompany.logo ? (
                  <img src={detailCompany.logo} alt={detailCompany.company_name} className="w-16 h-16 rounded-xl object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-blue-600" />
                  </div>
                )}
                <div>
                  <h4 className="text-xl font-bold text-gray-900">{detailCompany.company_name}</h4>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                    <span>{detailCompany.industry}</span>
                    <span>{detailCompany.scale}</span>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">企业简介</p>
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{detailCompany.description || '暂无简介'}</p>
              </div>
              {detailCompany.address && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  {detailCompany.address}
                </div>
              )}
              {detailCompany.website && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Globe className="w-4 h-4 text-gray-400" />
                  {detailCompany.website}
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">审核状态</span>
                <Tag
                  variant={detailCompany.verify_status === 'pending' ? 'yellow' : detailCompany.verify_status === 'approved' ? 'green' : 'red'}
                  size="sm"
                >
                  {STATUS_MAP[detailCompany.verify_status].label}
                </Tag>
              </div>
              {detailCompany.verify_remark && (
                <p className="text-xs text-red-500 bg-red-50 px-3 py-1.5 rounded-lg">
                  驳回原因：{detailCompany.verify_remark}
                </p>
              )}
              {/* 资质证明信息 */}
              {(detailCompany.license_url || detailCompany.org_code) && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">资质证明</p>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    {detailCompany.org_code && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">组织机构代码</span>
                        <span className="text-gray-900 font-mono">{detailCompany.org_code}</span>
                      </div>
                    )}
                    {detailCompany.license_url && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">营业执照</span>
                        <a
                          href={detailCompany.license_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-700 flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          查看营业执照
                        </a>
                      </div>
                    )}
                    {detailCompany.business_scope && (
                      <div className="text-sm">
                        <span className="text-gray-500">经营范围：</span>
                        <span className="text-gray-700">{detailCompany.business_scope}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-400">注册时间：{new Date(detailCompany.created_at).toLocaleString('zh-CN')}</p>
            </div>
            {/* 审核反馈 */}
            <div className="px-6 py-4 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <MessageSquare className="w-4 h-4" />
                发送审核反馈
              </p>
              <textarea
                id="company-feedback"
                name="company-feedback"
                value={feedbackText}
                onChange={e => setFeedbackText(e.target.value)}
                placeholder="输入反馈内容，将以通知形式发送给该企业..."
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none"
              />
              <button
                onClick={sendCompanyFeedback}
                disabled={!feedbackText.trim() || feedbackSending}
                className="mt-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 text-sm font-medium flex items-center gap-1"
              >
                {feedbackSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                发送反馈
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 驳回弹窗 */}
      {reviewModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={() => setReviewModal(null)}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-2">驳回企业审核</h3>
            <p className="text-sm text-gray-500 mb-4">驳回「{reviewModal.company_name}」的认证申请</p>
            <textarea
              id="company-reject-reason"
              name="reject-reason"
              value={reviewRemark}
              onChange={e => setReviewRemark(e.target.value)}
              placeholder="请输入驳回原因（必填）..."
              rows={4}
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setReviewModal(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                取消
              </button>
              <button
                onClick={() => handleReview(reviewModal.id, 'rejected')}
                disabled={!reviewRemark.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40 text-sm font-medium transition-colors"
              >
                确认驳回
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
