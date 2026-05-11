import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Briefcase,
  CalendarRange,
  FileText,
  MapPin,
  Filter,
  ExternalLink,
  Search,
  ChevronDown,
  Clock,
  Building2,
  ArrowRight,
} from 'lucide-react';
import http from '@/api/http';
import Breadcrumb from '@/components/ui/Breadcrumb';

// ====== 招聘时间线数据类型（与后端 recruitment_timeline_items 表对应） ======
interface TimelineItem {
  id: number;
  company_name: string;
  event_type: string;
  title: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  apply_link?: string;
  status?: string;
  sort_order?: number;
}

// ====== 岗位数据类型（与后端 jobs 表对应） ======
interface JobItem {
  id: number;
  title: string;
  company_name: string;
  location?: string;
  salary?: string;
  type?: string;
  category?: string;
  tags?: string[];
  logo?: string;
  urgent?: boolean;
  time?: string;
}

// ====== 筛选常量（与后端保持一致） ======
const JOB_TYPE_OPTIONS = ['全部', '校招', '社招', '实习'];
const LOCATION_OPTIONS = ['全部', '北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '南京', '西安'];
const INDUSTRY_OPTIONS = ['全部', '技术', '产品', '运营', '设计', '市场', '销售', '职能'];
const EVENT_TYPE_OPTIONS = ['全部', '秋招', '春招', '实习', '暑期实习', '其他'];

const SALARY_RANGE_MAP: Record<string, { min: number | null; max: number | null }> = {
  '不限': { min: null, max: null },
  '5k以下': { min: null, max: 5 },
  '5k-10k': { min: 5, max: 10 },
  '10k-20k': { min: 10, max: 20 },
  '20k-30k': { min: 20, max: 30 },
  '30k-50k': { min: 30, max: 50 },
  '50k以上': { min: 50, max: null },
};

const SORT_OPTIONS = [
  { label: '最新发布', value: 'newest' },
  { label: '薪资最高', value: 'salary_high' },
  { label: '薪资最低', value: 'salary_low' },
  { label: '最多浏览', value: 'view_count' },
  { label: '急聘优先', value: 'urgent_first' },
];

// ====== 事件类型对应的颜色标签 ======
const EVENT_TYPE_COLORS: Record<string, string> = {
  '秋招': 'bg-orange-100 text-orange-700 border-orange-200',
  '春招': 'bg-green-100 text-green-700 border-green-200',
  '实习': 'bg-blue-100 text-blue-700 border-blue-200',
  '暑期实习': 'bg-purple-100 text-purple-700 border-purple-200',
  '其他': 'bg-gray-100 text-gray-700 border-gray-200',
};

// ====== 岗位类型对应的颜色标签 ======
const JOB_TYPE_COLORS: Record<string, string> = {
  '校招': 'bg-blue-50 text-blue-700',
  '社招': 'bg-green-50 text-green-700',
  '实习': 'bg-purple-50 text-purple-700',
};

export default function JobRecruitment() {
  const [searchParams] = useSearchParams();
  // ====== 时间线状态 ======
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [activeEventType, setActiveEventType] = useState('全部');

  // ====== 岗位状态 ======
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [jobsTotal, setJobsTotal] = useState(0);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [activeJobType, setActiveJobType] = useState('全部');
  const [activeLocation, setActiveLocation] = useState('全部');
  const [activeIndustry, setActiveIndustry] = useState('全部');
  const [activeSalaryRange, setActiveSalaryRange] = useState('不限');
  const [sortBy, setSortBy] = useState('newest');
  const [jobKeyword, setJobKeyword] = useState('');
  const [jobSearchInput, setJobSearchInput] = useState('');
  const [jobsPage, setJobsPage] = useState(1);
  const jobsPageSize = 9;

  useEffect(() => {
    const keyword = searchParams.get('keyword')?.trim() ?? '';
    if (!keyword) {
      return;
    }

    setJobSearchInput(keyword);
    setJobKeyword((current) => (current === keyword ? current : keyword));
    setJobsPage(1);
  }, [searchParams]);

  // ====== 获取招聘时间线 ======
  const fetchTimeline = useCallback(async () => {
    setTimelineLoading(true);
    try {
      const params: Record<string, string> = {};
      if (activeEventType !== '全部') {
        params.event_type = activeEventType;
      }
      const res = await http.get('/recruitment-timelines', { params });
      if (res.data?.code === 200 && Array.isArray(res.data.data)) {
        setTimeline(res.data.data);
      }
    } catch {
      // 接口不可用时保持空数组
    } finally {
      setTimelineLoading(false);
    }
  }, [activeEventType]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  // ====== 获取岗位列表 ======
  const fetchJobs = useCallback(async () => {
    setJobsLoading(true);
    try {
      const params: Record<string, string | number> = {
        page: jobsPage,
        pageSize: jobsPageSize,
        sortBy,
      };
      if (activeJobType !== '全部') params.type = activeJobType;
      if (activeLocation !== '全部') params.location = activeLocation;
      if (activeIndustry !== '全部') params.category = activeIndustry;
      if (jobKeyword) params.keyword = jobKeyword;

      const salaryRange = SALARY_RANGE_MAP[activeSalaryRange];
      if (salaryRange.min !== null) params.salaryMin = salaryRange.min;
      if (salaryRange.max !== null) params.salaryMax = salaryRange.max;

      const res = await http.get('/jobs', { params });
      if (res.data?.code === 200) {
        const data = res.data.data;
        setJobs(data.jobs || []);
        setJobsTotal(data.total || 0);
      }
    } catch {
      // 接口不可用时保持空数组
    } finally {
      setJobsLoading(false);
    }
  }, [jobsPage, activeJobType, activeLocation, activeIndustry, activeSalaryRange, sortBy, jobKeyword]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // ====== 统计指标 ======
  const metrics = useMemo(
    () => [
      { label: '在招岗位', value: jobsTotal, icon: Briefcase },
      { label: '招聘节点', value: timeline.length, icon: CalendarRange },
      { label: '简历动作', value: '待集中处理', icon: FileText },
    ],
    [jobsTotal, timeline.length],
  );

  // ====== 格式化日期显示 ======
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    } catch {
      return dateStr;
    }
  };

  // ====== 岗位搜索处理 ======
  const handleJobSearch = () => {
    setJobsPage(1);
    setJobKeyword(jobSearchInput.trim());
  };

  // ====== 筛选变更时重置页码 ======
  const handleFilterChange = (setter: (v: string) => void, value: string) => {
    setter(value);
    setJobsPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(jobsTotal / jobsPageSize));

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* 面包屑导航 */}
      <div className="mx-auto max-w-6xl px-4">
        <Breadcrumb items={[{ label: '首页', path: '/' }, { label: '求职招聘' }]} />
      </div>

      {/* ====== 顶部 Hero 区域 ====== */}
      <section className="bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900 text-white py-14 lg:py-20 relative overflow-hidden">
        {/* 装饰元素 */}
        <div className="absolute -top-20 -right-20 w-[500px] h-[500px] bg-primary-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] bg-primary-300/15 rounded-full blur-3xl" />

        <div className="mx-auto max-w-6xl px-4 relative z-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-200">求职招聘</p>
          <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold">求职招聘</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-primary-100">
            大厂招聘时间线、岗位浏览筛选一站式服务，独立于能力提升板块，专注求职全流程。
          </p>

          {/* 统计指标卡片 */}
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {metrics.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 p-5">
                  <div className="flex items-center gap-2 text-sm font-medium text-primary-100">
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </div>
                  <div className="mt-3 text-2xl font-bold text-white">{item.value}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10 space-y-10">
        {/* ====== 大厂招聘时间线 ====== */}
        <section className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
              <CalendarRange className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">大厂招聘时间线</h2>
              <p className="text-sm text-gray-500">关键招聘窗口、起止日期与投递链接，由管理员后台统一维护</p>
            </div>
          </div>

          {/* 事件类型筛选 */}
          <div className="mt-6 flex flex-wrap gap-2">
            {EVENT_TYPE_OPTIONS.map((type) => (
              <button
                key={type}
                onClick={() => setActiveEventType(type)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeEventType === type
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* 时间线列表 */}
          <div className="mt-6 space-y-4">
            {timelineLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
              </div>
            ) : timeline.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 px-5 py-10 text-center">
                <CalendarRange className="mx-auto h-10 w-10 text-gray-300" />
                <p className="mt-3 text-sm text-gray-500">暂无招聘时间线，管理员可在后台动态维护</p>
              </div>
            ) : (
              timeline.map((item) => {
                const typeColor = EVENT_TYPE_COLORS[item.event_type] || EVENT_TYPE_COLORS['其他'];
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-gray-200 p-5 hover:border-primary-200 hover:shadow-sm transition-all"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-semibold text-gray-900">{item.title}</span>
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${typeColor}`}>
                            {item.event_type}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2 text-sm text-gray-500">
                          <Building2 className="h-3.5 w-3.5" />
                          {item.company_name}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-gray-500 shrink-0">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDate(item.start_date)}
                        {item.end_date ? ` - ${formatDate(item.end_date)}` : ''}
                      </div>
                    </div>
                    {item.description ? (
                      <p className="mt-3 text-sm leading-6 text-gray-600">{item.description}</p>
                    ) : null}
                    {item.apply_link ? (
                      <a
                        href={item.apply_link}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary-50 border border-primary-200 px-4 py-2 text-sm font-medium text-primary-700 transition hover:bg-primary-100 hover:border-primary-300"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        前往投递
                      </a>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* ====== 岗位浏览筛选 ====== */}
        <section className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <Briefcase className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">岗位浏览</h2>
              <p className="text-sm text-gray-500">按地区、类型、行业筛选心仪岗位，点击查看详情</p>
            </div>
          </div>

          {/* 搜索栏 */}
          <div className="mt-6 flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索岗位、公司或关键词..."
                value={jobSearchInput}
                onChange={(e) => setJobSearchInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleJobSearch(); }}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900
                  focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white
                  placeholder:text-gray-400 transition-all"
              />
            </div>
            <button
              onClick={handleJobSearch}
              className="bg-primary-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors shrink-0"
            >
              搜索
            </button>
          </div>

          {/* 筛选标签组 */}
          <div className="mt-5 space-y-3">
            {/* 招聘类型 */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-gray-400 shrink-0">类型</span>
              {JOB_TYPE_OPTIONS.map((type) => (
                <button
                  key={type}
                  onClick={() => handleFilterChange(setActiveJobType, type)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                    activeJobType === type
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* 地区筛选 */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-gray-400 shrink-0">地区</span>
              {LOCATION_OPTIONS.map((loc) => (
                <button
                  key={loc}
                  onClick={() => handleFilterChange(setActiveLocation, loc)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                    activeLocation === loc
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>

            {/* 行业筛选 */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-gray-400 shrink-0">行业</span>
              {INDUSTRY_OPTIONS.map((ind) => (
                <button
                  key={ind}
                  onClick={() => handleFilterChange(setActiveIndustry, ind)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                    activeIndustry === ind
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {ind}
                </button>
              ))}
            </div>

            {/* 薪资范围筛选 */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-gray-400 shrink-0">薪资</span>
              {Object.keys(SALARY_RANGE_MAP).map((range) => (
                <button
                  key={range}
                  onClick={() => handleFilterChange(setActiveSalaryRange, range)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                    activeSalaryRange === range
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          {/* 清除筛选 */}
          {(activeJobType !== '全部' || activeLocation !== '全部' || activeIndustry !== '全部' || activeSalaryRange !== '不限' || jobKeyword) && (
            <button
              onClick={() => {
                setActiveJobType('全部');
                setActiveLocation('全部');
                setActiveIndustry('全部');
                setActiveSalaryRange('不限');
                setJobKeyword('');
                setJobSearchInput('');
                setJobsPage(1);
              }}
              className="mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium hover:underline transition-colors"
            >
              清除所有筛选
            </button>
          )}

          {/* 排序 + 结果计数 */}
          <div className="mt-5 flex items-center justify-between pt-4 border-t border-gray-100">
            <span className="text-sm text-gray-500">
              共找到 <span className="font-medium text-gray-900">{jobsTotal}</span> 个岗位
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">排序:</span>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setJobsPage(1);
                }}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 岗位卡片列表 */}
          <div className="mt-6">
            {jobsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
              </div>
            ) : jobs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 px-5 py-10 text-center">
                <Briefcase className="mx-auto h-10 w-10 text-gray-300" />
                <p className="mt-3 text-sm text-gray-500">暂无匹配岗位，试试调整筛选条件</p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {jobs.map((job) => {
                    const typeColor = JOB_TYPE_COLORS[job.type || ''] || 'bg-gray-50 text-gray-700';
                    return (
                      <Link
                        key={job.id}
                        to={`/jobs/${job.id}`}
                        className="group rounded-2xl border border-gray-200 p-5 hover:border-primary-200 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-semibold text-gray-900 group-hover:text-primary-600 transition-colors truncate">
                              {job.title}
                            </h3>
                            <p className="mt-1 text-sm text-gray-500 truncate">{job.company_name}</p>
                          </div>
                          {job.urgent && (
                            <span className="shrink-0 rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-xs font-medium text-red-600">
                              急招
                            </span>
                          )}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {job.location ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
                              <MapPin className="h-3 w-3" />
                              {job.location}
                            </span>
                          ) : null}
                          {job.type ? (
                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${typeColor}`}>
                              {job.type}
                            </span>
                          ) : null}
                          {job.salary ? (
                            <span className="inline-flex items-center rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700">
                              {job.salary}
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-3 flex items-center text-xs text-primary-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          查看详情
                          <ArrowRight className="ml-1 h-3 w-3" />
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* 分页 */}
                {jobsTotal > jobsPageSize && (
                  <div className="mt-8 flex justify-center items-center gap-2">
                    <button
                      className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900
                        disabled:opacity-50 active:scale-[0.95] transition-all"
                      disabled={jobsPage <= 1}
                      onClick={() => setJobsPage((p) => Math.max(1, p - 1))}
                    >
                      上一页
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pNum: number;
                      if (totalPages <= 5) {
                        pNum = i + 1;
                      } else if (jobsPage <= 3) {
                        pNum = i + 1;
                      } else if (jobsPage >= totalPages - 2) {
                        pNum = totalPages - 4 + i;
                      } else {
                        pNum = jobsPage - 2 + i;
                      }
                      return (
                        <button
                          key={pNum}
                          onClick={() => setJobsPage(pNum)}
                          className={`w-10 h-10 rounded-lg font-medium transition-all ${
                            jobsPage === pNum
                              ? 'bg-primary-600 text-white shadow-sm'
                              : 'border border-gray-200 text-gray-700 hover:bg-gray-50 active:scale-[0.95]'
                          }`}
                        >
                          {pNum}
                        </button>
                      );
                    })}
                    {totalPages > 5 && jobsPage < totalPages - 2 && (
                      <span className="text-gray-400 mx-2">...</span>
                    )}
                    <button
                      className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900
                        disabled:opacity-50 active:scale-[0.95] transition-all"
                      disabled={jobsPage >= totalPages}
                      onClick={() => setJobsPage((p) => Math.min(totalPages, p + 1))}
                    >
                      下一页
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
