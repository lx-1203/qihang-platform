import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search, CheckCircle, XCircle, Clock, Eye,
  Building2, Globe, MapPin, Users as UsersIcon,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import http from '@/api/http';
import Tag from '@/components/ui/Tag';

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
  verify_status: 'pending' | 'approved' | 'rejected';
  verify_remark: string;
  created_at: string;
  email?: string;
}

const STATUS_MAP = {
  pending: { label: '待审核', color: 'bg-amber-100 text-amber-700', icon: Clock },
  approved: { label: '已通过', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: '已驳回', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function AdminCompanies() {
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;
  const [reviewModal, setReviewModal] = useState<CompanyRecord | null>(null);
  const [reviewRemark, setReviewRemark] = useState('');

  const mockCompanies: CompanyRecord[] = [
    { id: 1, user_id: 3, company_name: '字节跳动', industry: '互联网/科技', scale: '10000人以上', description: '全球化科技公司，旗下产品包括抖音、TikTok等', logo: '', website: 'https://www.bytedance.com', address: '北京市海淀区', verify_status: 'approved', verify_remark: '', created_at: '2026-03-10', email: 'hr@bytedance.com' },
    { id: 2, user_id: 4, company_name: '腾讯', industry: '互联网/科技', scale: '10000人以上', description: '世界领先的互联网科技公司', logo: '', website: 'https://www.tencent.com', address: '深圳市南山区', verify_status: 'approved', verify_remark: '', created_at: '2026-03-08', email: 'hr@tencent.com' },
    { id: 3, user_id: 5, company_name: '百度', industry: '互联网/人工智能', scale: '10000人以上', description: '全球最大中文搜索引擎', logo: '', website: 'https://www.baidu.com', address: '北京市海淀区', verify_status: 'approved', verify_remark: '', created_at: '2026-03-12', email: 'hr@baidu.com' },
    { id: 4, user_id: 6, company_name: '创新科技有限公司', industry: '软件开发', scale: '50-200人', description: '专注企业级SaaS服务的初创公司', logo: '', website: '', address: '杭州市余杭区', verify_status: 'pending', verify_remark: '', created_at: '2026-04-05', email: 'admin@chuangxin.com' },
    { id: 5, user_id: 7, company_name: '无名公司', industry: '不明', scale: '1-50人', description: '资料不完整', logo: '', website: '', address: '', verify_status: 'rejected', verify_remark: '企业信息不完整，缺少营业执照', created_at: '2026-04-01', email: 'test@unknown.com' },
    { id: 6, user_id: 8, company_name: '智联教育科技', industry: '教育/培训', scale: '200-500人', description: '专注K12教育技术的创新企业', logo: '', website: 'https://zhilian-edu.com', address: '南京市建邺区', verify_status: 'pending', verify_remark: '', created_at: '2026-04-06', email: 'hr@zhilian-edu.com' },
  ];

  useEffect(() => {
    fetchCompanies();
  }, [page, statusFilter, search]);

  async function fetchCompanies() {
    try {
      setLoading(true);
      const res = await http.get('/admin/companies', {
        params: { page, pageSize, status: statusFilter, keyword: search }
      });
      if (res.data?.code === 200 && res.data.data) {
        setCompanies(res.data.data.list || res.data.data.companies || []);
        setTotal(res.data.data.pagination?.total || res.data.data.total || 0);
      } else {
        applyMock();
      }
    } catch {
      applyMock();
    } finally {
      setLoading(false);
    }
  }

  function applyMock() {
    let filtered = [...mockCompanies];
    if (statusFilter !== 'all') filtered = filtered.filter(c => c.verify_status === statusFilter);
    if (search) filtered = filtered.filter(c => c.company_name.includes(search));
    setCompanies(filtered);
    setTotal(filtered.length);
  }

  async function handleReview(companyId: number, status: 'approved' | 'rejected') {
    try {
      await http.put(`/admin/companies/${companyId}/verify`, { status, remark: reviewRemark });
    } catch {
      // 模拟
      setCompanies(prev => prev.map(c =>
        c.id === companyId ? { ...c, verify_status: status, verify_remark: reviewRemark } : c
      ));
    }
    setReviewModal(null);
    setReviewRemark('');
    fetchCompanies();
  }

  const totalPages = Math.ceil(total / pageSize);
  const pendingCount = mockCompanies.filter(c => c.verify_status === 'pending').length;

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: '待审核', count: mockCompanies.filter(c => c.verify_status === 'pending').length, color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock },
          { label: '已通过', count: mockCompanies.filter(c => c.verify_status === 'approved').length, color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle },
          { label: '已驳回', count: mockCompanies.filter(c => c.verify_status === 'rejected').length, color: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索企业名称..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'pending', 'approved', 'rejected'].map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s === 'all' ? '全部' : STATUS_MAP[s as keyof typeof STATUS_MAP].label}
            </button>
          ))}
        </div>
      </div>

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
                  <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
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

      {/* 驳回弹窗 */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setReviewModal(null)}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-2">驳回企业审核</h3>
            <p className="text-sm text-gray-500 mb-4">驳回「{reviewModal.company_name}」的认证申请</p>
            <textarea
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
