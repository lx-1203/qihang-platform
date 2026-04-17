import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Filter, Phone, Mail, Calendar,
  ChevronRight, GripVertical, User, GraduationCap,
  Briefcase, CheckCircle, XCircle,
  MessageSquare, ArrowRight, RefreshCw
} from 'lucide-react';
import http from '@/api/http';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import FeatureStatus from '@/components/FeatureStatus';
import { CardSkeleton } from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import Tag from '@/components/ui/Tag';

// ====== 企业端简历筛选池 (Kanban) ======
// 商业级要求：五列看板、简历卡片、状态变更

type ResumeStatus = 'pending' | 'viewed' | 'interview' | 'offered' | 'rejected';

interface ResumeCard {
  id: number;
  studentName: string;
  university: string;
  major: string;
  degree: '本科' | '硕士' | '博士';
  jobTitle: string;
  status: ResumeStatus;
  appliedAt: string;
  phone: string;
  email: string;
  avatar: string;
}

const STATUS_CONFIG: Record<ResumeStatus, { label: string; color: string; bgCard: string; borderColor: string; headerBg: string; count_bg: string; tagVariant: 'yellow' | 'blue' | 'purple' | 'green' | 'gray' }> = {
  pending:    { label: '待筛选', color: 'text-amber-700',  bgCard: 'bg-amber-50/50',  borderColor: 'border-amber-200', headerBg: 'bg-amber-50', count_bg: 'bg-amber-100 text-amber-700', tagVariant: 'yellow' },
  viewed:     { label: '已查看', color: 'text-blue-700',   bgCard: 'bg-blue-50/50',   borderColor: 'border-blue-200',  headerBg: 'bg-blue-50',  count_bg: 'bg-blue-100 text-blue-700', tagVariant: 'blue' },
  interview:  { label: '面试中', color: 'text-purple-700', bgCard: 'bg-purple-50/50', borderColor: 'border-purple-200', headerBg: 'bg-purple-50', count_bg: 'bg-purple-100 text-purple-700', tagVariant: 'purple' },
  offered:    { label: '已录用', color: 'text-green-700',  bgCard: 'bg-green-50/50',  borderColor: 'border-green-200', headerBg: 'bg-green-50', count_bg: 'bg-green-100 text-green-700', tagVariant: 'green' },
  rejected:   { label: '已淘汰', color: 'text-gray-500',   bgCard: 'bg-gray-50/50',   borderColor: 'border-gray-200',  headerBg: 'bg-gray-50',  count_bg: 'bg-gray-200 text-gray-600', tagVariant: 'gray' },
};

const COLUMN_ORDER: ResumeStatus[] = ['pending', 'viewed', 'interview', 'offered', 'rejected'];

// 状态流转选项：每个状态可以流转到哪些状态
const STATUS_TRANSITIONS: Record<ResumeStatus, ResumeStatus[]> = {
  pending:   ['viewed', 'rejected'],
  viewed:    ['interview', 'rejected'],
  interview: ['offered', 'rejected'],
  offered:   [],
  rejected:  ['pending'],
};

export default function CompanyResumePool() {
  const [resumes, setResumes] = useState<ResumeCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [jobFilter, setJobFilter] = useState<string>('all');
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  // 淘汰确认弹窗
  const [rejectTarget, setRejectTarget] = useState<{ id: number; name: string } | null>(null);
  const [rejectLoading, setRejectLoading] = useState(false);

  // 模拟简历数据
  const mockResumes: ResumeCard[] = [
    { id: 1, studentName: '张明远', university: '清华大学', major: '计算机科学与技术', degree: '硕士', jobTitle: '前端开发工程师', status: 'pending', appliedAt: '2026-04-07 10:30', phone: '138****1234', email: 'zhang@example.com', avatar: '' },
    { id: 2, studentName: '李思涵', university: '北京大学', major: '软件工程', degree: '本科', jobTitle: 'Java后端开发工程师', status: 'pending', appliedAt: '2026-04-07 09:15', phone: '139****5678', email: 'li@example.com', avatar: '' },
    { id: 3, studentName: '王子豪', university: '浙江大学', major: '人工智能', degree: '硕士', jobTitle: 'AIGC算法研究员', status: 'pending', appliedAt: '2026-04-06 16:40', phone: '137****9012', email: 'wang@example.com', avatar: '' },
    { id: 4, studentName: '陈雨欣', university: '复旦大学', major: '数据科学', degree: '本科', jobTitle: '数据分析实习生', status: 'pending', appliedAt: '2026-04-06 14:20', phone: '136****3456', email: 'chen@example.com', avatar: '' },
    { id: 5, studentName: '刘博文', university: '上海交通大学', major: '电子信息', degree: '硕士', jobTitle: '前端开发工程师', status: 'viewed', appliedAt: '2026-04-05 11:00', phone: '135****7890', email: 'liu@example.com', avatar: '' },
    { id: 6, studentName: '赵思琪', university: '南京大学', major: '计算机科学', degree: '本科', jobTitle: 'Java后端开发工程师', status: 'viewed', appliedAt: '2026-04-05 09:30', phone: '133****2345', email: 'zhao@example.com', avatar: '' },
    { id: 7, studentName: '黄子涵', university: '中国科技大学', major: '人工智能', degree: '博士', jobTitle: 'AIGC算法研究员', status: 'viewed', appliedAt: '2026-04-04 15:20', phone: '131****6789', email: 'huang@example.com', avatar: '' },
    { id: 8, studentName: '周文静', university: '同济大学', major: '设计学', degree: '本科', jobTitle: 'UI/UX设计师实习', status: 'interview', appliedAt: '2026-04-03 10:00', phone: '130****0123', email: 'zhou@example.com', avatar: '' },
    { id: 9, studentName: '吴昊天', university: '武汉大学', major: '软件工程', degree: '硕士', jobTitle: '前端开发工程师', status: 'interview', appliedAt: '2026-04-02 14:30', phone: '132****4567', email: 'wu@example.com', avatar: '' },
    { id: 10, studentName: '杨鑫磊', university: '哈尔滨工业大学', major: '计算机科学', degree: '硕士', jobTitle: 'Java后端开发工程师', status: 'offered', appliedAt: '2026-03-28 09:00', phone: '134****8901', email: 'yang@example.com', avatar: '' },
    { id: 11, studentName: '孙婉婷', university: '西安交通大学', major: '市场营销', degree: '本科', jobTitle: '管培生 (2026届)', status: 'offered', appliedAt: '2026-03-25 11:20', phone: '136****2345', email: 'sun@example.com', avatar: '' },
    { id: 12, studentName: '马天宇', university: '中山大学', major: '信息管理', degree: '本科', jobTitle: '产品经理实习生', status: 'rejected', appliedAt: '2026-04-01 08:45', phone: '138****6789', email: 'ma@example.com', avatar: '' },
    { id: 13, studentName: '林小雅', university: '厦门大学', major: '新闻传播', degree: '本科', jobTitle: '市场运营专员', status: 'rejected', appliedAt: '2026-03-30 16:00', phone: '139****0123', email: 'lin@example.com', avatar: '' },
  ];

  // 可用的职位列表（从当前简历数据中提取）
  const jobTitles = Array.from(new Set((resumes.length > 0 ? resumes : mockResumes).map(r => r.jobTitle)));

  useEffect(() => {
    fetchResumes();
  }, []);

  async function fetchResumes() {
    try {
      setLoading(true);
      setError(null);
      const res = await http.get('/company/resumes', { params: { pageSize: 100 } });
      if (res.data?.code === 200 && res.data.data?.resumes) {
        // 将后端字段映射为前端字段
        const normalized = res.data.data.resumes.map((r: Record<string, unknown>) => ({
          id: r.id as number,
          studentName: (r.student_name || r.studentName || '') as string,
          university: (r.school || r.university || '') as string,
          major: (r.major || '') as string,
          degree: (r.degree || '本科') as ResumeCard['degree'],
          jobTitle: (r.job_title || r.jobTitle || '') as string,
          status: r.status as ResumeStatus,
          appliedAt: r.created_at ? String(r.created_at).slice(0, 16) : '',
          phone: (r.phone || '') as string,
          email: (r.student_email || r.email || '') as string,
          avatar: (r.student_avatar || r.avatar || '') as string,
        }));
        setResumes(normalized);
      } else {
        setError('获取简历数据失败，服务器返回异常');
      }
    } catch {
      setError('网络请求失败，请检查网络连接后重试');
    } finally {
      setLoading(false);
    }
  }

  function changeStatus(id: number, newStatus: ResumeStatus) {
    // 淘汰操作需要二次确认
    if (newStatus === 'rejected') {
      const resume = resumes.find(r => r.id === id);
      setRejectTarget({ id, name: resume?.studentName || '' });
      return;
    }
    applyStatusChange(id, newStatus);
  }

  function applyStatusChange(id: number, newStatus: ResumeStatus) {
    setResumes(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    // 尝试调用API
    http.put(`/company/resumes/${id}/status`, { status: newStatus }).catch(() => {});
  }

  async function handleConfirmReject() {
    if (!rejectTarget) return;
    try {
      setRejectLoading(true);
      applyStatusChange(rejectTarget.id, 'rejected');
    } finally {
      setRejectLoading(false);
      setRejectTarget(null);
    }
  }

  // 筛选后的简历
  const filteredResumes = resumes.filter(r => {
    const matchSearch = !search || r.studentName.includes(search) || r.university.includes(search) || r.major.includes(search);
    const matchJob = jobFilter === 'all' || r.jobTitle === jobFilter;
    return matchSearch && matchJob;
  });

  // 按状态分组
  const columnData: Record<ResumeStatus, ResumeCard[]> = {
    pending: filteredResumes.filter(r => r.status === 'pending'),
    viewed: filteredResumes.filter(r => r.status === 'viewed'),
    interview: filteredResumes.filter(r => r.status === 'interview'),
    offered: filteredResumes.filter(r => r.status === 'offered'),
    rejected: filteredResumes.filter(r => r.status === 'rejected'),
  };

  const totalCount = filteredResumes.length;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">简历筛选池</h1>
          <p className="text-gray-500 mt-1">看板模式管理候选人，高效推进招聘流程</p>
        </div>
        <button
          onClick={fetchResumes}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          刷新数据
        </button>
      </div>

      {/* 搜索和筛选 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索候选人姓名、学校、专业..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={jobFilter}
              onChange={e => setJobFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value="all">全部职位</option>
              {jobTitles.map(title => (
                <option key={title} value={title}>{title}</option>
              ))}
            </select>
          </div>
          <span className="text-sm text-gray-500">
            共 <span className="font-medium text-gray-900">{totalCount}</span> 份简历
          </span>
        </div>
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* 错误状态 */}
      {!loading && error && (
        <ErrorState
          message={error}
          onRetry={fetchResumes}
          onLoadMockData={() => { setResumes(mockResumes); setError(null); }}
        />
      )}

      {/* Kanban 看板 */}
      {!loading && !error && (<>
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '60vh' }}>
        {COLUMN_ORDER.map((status) => {
          const config = STATUS_CONFIG[status];
          const cards = columnData[status];
          return (
            <motion.div
              key={status}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-shrink-0 w-[280px] flex flex-col"
            >
              {/* 列标题 */}
              <div className={`rounded-t-xl px-4 py-3 ${config.headerBg} border ${config.borderColor} border-b-0`}>
                <div className="flex items-center justify-between">
                  <h3 className={`text-sm font-bold ${config.color}`}>{config.label}</h3>
                  <Tag variant={config.tagVariant} size="sm" className="font-bold">
                    {cards.length}
                  </Tag>
                </div>
              </div>

              {/* 列内容区 */}
              <div className={`flex-1 rounded-b-xl border ${config.borderColor} border-t-0 ${config.bgCard} p-2 space-y-2 min-h-[200px]`}>
                {cards.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                    <Briefcase className="w-8 h-8 mb-2 opacity-30" />
                    <p className="text-xs">暂无简历</p>
                  </div>
                )}

                {cards.map((card, i) => (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer group"
                    onClick={() => setExpandedCard(expandedCard === card.id ? null : card.id)}
                  >
                    {/* 拖拽指示 */}
                    <div className="flex items-center gap-1 mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <GripVertical className="w-3.5 h-3.5 text-gray-300" />
                      <FeatureStatus status="dev" label="拖拽排序" />
                    </div>

                    {/* 候选人基本信息 */}
                    <div className="flex items-start gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-sm shrink-0 border border-primary-200">
                        {card.studentName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-gray-900 truncate">{card.studentName}</h4>
                        <p className="text-xs text-gray-500 truncate flex items-center gap-1 mt-0.5">
                          <GraduationCap className="w-3 h-3" />
                          {card.university} · {card.major}
                        </p>
                      </div>
                      <Tag variant={
                        card.degree === '博士' ? 'red' :
                        card.degree === '硕士' ? 'purple' :
                        'blue'
                      } size="xs">
                        {card.degree}
                      </Tag>
                    </div>

                    {/* 投递职位 */}
                    <div className="mt-2 px-2 py-1.5 bg-gray-50 rounded text-xs text-gray-600 flex items-center gap-1 truncate">
                      <Briefcase className="w-3 h-3 text-gray-400 shrink-0" />
                      {card.jobTitle}
                    </div>

                    {/* 投递时间 */}
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {card.appliedAt.split(' ')[0]}
                      </span>
                      {STATUS_TRANSITIONS[card.status].length > 0 && (
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-primary-500 transition-colors" />
                      )}
                    </div>

                    {/* 展开详情 + 操作按钮 */}
                    {expandedCard === card.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-3 pt-3 border-t border-gray-100 space-y-2"
                      >
                        {/* 联系方式 */}
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500 flex items-center gap-1.5">
                            <Phone className="w-3 h-3" /> {card.phone}
                          </p>
                          <p className="text-xs text-gray-500 flex items-center gap-1.5">
                            <Mail className="w-3 h-3" /> {card.email}
                          </p>
                        </div>

                        {/* 状态变更按钮 */}
                        {STATUS_TRANSITIONS[card.status].length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {STATUS_TRANSITIONS[card.status].map((nextStatus) => {
                              const nextConfig = STATUS_CONFIG[nextStatus];
                              const isReject = nextStatus === 'rejected';
                              const isRestore = nextStatus === 'pending';
                              return (
                                <button
                                  key={nextStatus}
                                  onClick={(e) => { e.stopPropagation(); changeStatus(card.id, nextStatus); }}
                                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                    isReject
                                      ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                                      : isRestore
                                        ? 'bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200'
                                        : 'bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200'
                                  }`}
                                >
                                  {isReject ? <XCircle className="w-3 h-3" /> :
                                   isRestore ? <RefreshCw className="w-3 h-3" /> :
                                   nextStatus === 'interview' ? <MessageSquare className="w-3 h-3" /> :
                                   nextStatus === 'offered' ? <CheckCircle className="w-3 h-3" /> :
                                   <ArrowRight className="w-3 h-3" />}
                                  {isRestore ? '重新筛选' : `移至${nextConfig.label}`}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* 底部统计 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-6">
            {COLUMN_ORDER.map((status) => {
              const config = STATUS_CONFIG[status];
              const count = columnData[status].length;
              return (
                <div key={status} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${config.headerBg} border ${config.borderColor}`} />
                  <span className="text-sm text-gray-600">{config.label}</span>
                  <span className="text-sm font-bold text-gray-900">{count}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <User className="w-4 h-4" />
            <span>通过率：</span>
            <span className="font-bold text-green-600">
              {totalCount > 0 ? Math.round((columnData.offered.length / totalCount) * 100) : 0}%
            </span>
          </div>
        </div>
      </motion.div>
      </>)}

      {/* 淘汰确认弹窗 */}
      <ConfirmDialog
        open={!!rejectTarget}
        variant="danger"
        title="确定淘汰该候选人？"
        description="淘汰后对方将收到通知，且无法恢复。"
        confirmText="确认淘汰"
        loading={rejectLoading}
        onConfirm={handleConfirmReject}
        onCancel={() => setRejectTarget(null)}
      />
    </div>
  );
}
