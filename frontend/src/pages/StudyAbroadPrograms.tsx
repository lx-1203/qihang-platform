import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  ChevronRight,
  ChevronLeft,
  GraduationCap,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  Building2,
  Users,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProgramCard from '../components/study-abroad/ProgramCard';
import countriesData from '../data/study-abroad-countries.json';
import universitiesData from '../data/study-abroad-universities.json';
import majorsData from '../data/study-abroad-majors.json';
import http from '../api/http';

// ====== 类型定义 ======

interface ProgramItem {
  id: number;
  name: string;
  nameEn: string;
  duration: string;
  tuition: string;
  tuitionCNY: string;
  deadline: string;
  intake: string;
  language: string;
  gpaReq: string;
  classSize: number;
  employRate: string;
  avgSalary: string;
  tags: string[];
  admittedCount: number;
  applicantCount: number;
}

interface UniversityItem {
  id: number;
  school: string;
  schoolEn: string;
  country: string;
  countryName: string;
  city: string;
  ranking: number;
  logo: string;
  programs: ProgramItem[];
}

interface CountryItem {
  id: string;
  name: string;
  flag: string;
  hot: boolean;
  projectCount: number;
}

interface MajorCategory {
  category: string;
  majors: { id: string; name: string; nameEn: string }[];
}

/** 展平后的项目（含大学信息 + 筛选用字段） */
interface FlatProgram {
  program: ProgramItem;
  university: {
    id: number;
    school: string;
    schoolEn: string;
    country: string;
    ranking: number;
    logo: string;
  };
  countryId: string;
  majorCategory: string;
}

// ====== 常量 ======

const PAGE_SIZE = 12;

const RANKINGS = ['不限排名', 'QS Top 10', 'QS Top 30', 'QS Top 50', 'QS Top 100', 'QS Top 200'];

const DEGREE_TYPES = ['全部学位', '硕士', '博士', 'MBA'];

/** 专业分类关键字映射：将项目名称/标签匹配到 majors.json 的 6 大分类 */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  '计算机与数据': [
    '计算机', 'computer', 'computing', '数据', 'data', 'ai', '人工智能',
    'artificial intelligence', '信息', 'information', 'informatics', '统计', 'statistic',
  ],
  '商科与金融': [
    '金融', 'finance', 'financial', '商', 'business', 'mba', '管理', 'management',
    '会计', 'accounting', '市场', 'marketing', '经济', 'econom',
  ],
  '工程与技术': [
    '工程', 'engineering', '机械', 'mechanical', '电气', 'electrical', '电子', 'electronic',
    '建筑', 'architect', '能源', 'energy', '机器人', 'robot', '材料', 'material',
    '物理', 'physics', '化学', 'chemistry',
  ],
  '人文社科': [
    '教育', 'education', 'tesol', '法学', 'law', 'juris', '传媒', 'media',
    'communication', 'journalism', '国际', 'international', '文学', 'literature',
    '哲学', 'philosophy', '心理', 'psychology', '文化', 'cultural', '写作', 'writing',
  ],
  '医学与健康': [
    '医', 'medic', '健康', 'health', '公共卫生', 'public health', '生物', 'bio',
    '护理', 'nursing', '药', 'pharm',
  ],
  '艺术与设计': [
    '设计', 'design', '艺术', 'art', '时尚', 'fashion', '游戏', 'game', '创意', 'creative',
  ],
};

// ====== 工具函数 ======

/** 将项目名/标签匹配到专业分类 */
function matchMajorCategory(program: ProgramItem): string {
  const text = `${program.name} ${program.nameEn} ${program.tags.join(' ')}`.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (text.includes(kw.toLowerCase())) return category;
    }
  }
  return '其他';
}

/** 从项目名推断学位类型 */
function matchDegreeType(program: ProgramItem): string {
  const name = `${program.name} ${program.nameEn}`.toLowerCase();
  if (name.includes('mba')) return 'MBA';
  if (name.includes('phd') || name.includes('dphil') || name.includes('博士')) return '博士';
  return '硕士';
}

/** URL ?major= 参数 → 专业分类名（支持传入分类名或具体专业名） */
function resolveInitialMajor(param: string | null): string {
  if (!param) return '全部专业';
  const categories = (majorsData as MajorCategory[]).map((c) => c.category);
  if (categories.includes(param)) return param;
  for (const cat of majorsData as MajorCategory[]) {
    for (const m of cat.majors) {
      if (m.name === param || m.nameEn === param || m.id === param) {
        return cat.category;
      }
    }
  }
  return '全部专业';
}

/** 数据库 region（中文）→ 前端 countryId 映射 */
const REGION_TO_COUNTRY_ID: Record<string, string> = {
  '美国': 'us', '英国': 'uk', '中国香港': 'hk', '新加坡': 'sg',
  '澳大利亚': 'au', '加拿大': 'ca', '日本': 'jp', '德国': 'de',
  '法国': 'fr', '韩国': 'kr', '新西兰': 'nz', '爱尔兰': 'ie',
  '瑞士': 'ch', '意大利': 'it',
};

/** 将 API 返回的 programs 行映射为 FlatProgram */
function mapApiProgram(row: any): FlatProgram {
  const countryId = REGION_TO_COUNTRY_ID[row.region] || row.country?.toLowerCase() || '';
  return {
    program: {
      id: row.id,
      name: row.name_zh || '',
      nameEn: row.name_en || '',
      duration: row.duration || '',
      tuition: row.tuition_total || '',
      tuitionCNY: '',
      deadline: row.deadline || '',
      intake: '',
      language: row.language || '英语',
      gpaReq: row.gpa_min ? `${row.gpa_min}+` : '',
      classSize: 0,
      employRate: row.employment_rate ? `${row.employment_rate}%` : '',
      avgSalary: row.avg_salary || '',
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags || []),
      admittedCount: 0,
      applicantCount: 0,
    },
    university: {
      id: row.university_id,
      school: row.university_name || '',
      schoolEn: row.university_name_en || '',
      country: countryId.toUpperCase(),
      ranking: row.qs_ranking || 0,
      logo: row.university_logo || '',
    },
    countryId,
    majorCategory: row.category || '其他',
  };
}

// ====== 组件 ======

export default function StudyAbroadPrograms() {
  const [searchParams] = useSearchParams();

  // 从 URL 参数初始化筛选状态
  const initialCountry = searchParams.get('country') || 'all';
  const initialMajor = resolveInitialMajor(searchParams.get('major'));

  // ---------- 筛选状态 ----------
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(initialCountry);
  const [selectedMajor, setSelectedMajor] = useState(initialMajor);
  const [selectedRanking, setSelectedRanking] = useState('不限排名');
  const [selectedDegree, setSelectedDegree] = useState('全部学位');
  const [showFilters, setShowFilters] = useState(
    initialCountry !== 'all' || initialMajor !== '全部专业',
  );
  const [sortBy, setSortBy] = useState<'ranking' | 'deadline' | 'applicants' | 'admitRate'>(
    'ranking',
  );
  const [currentPage, setCurrentPage] = useState(1);

  // 搜索 300ms 防抖
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // 筛选条件变化时重置页码
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCountry, selectedMajor, selectedRanking, selectedDegree, debouncedSearch, sortBy]);

  // ---------- 筛选选项 ----------

  /** 国家筛选按钮（14 国 + 全部） */
  const countryFilters = useMemo(() => {
    const countries = countriesData as CountryItem[];
    return [
      { id: 'all', name: '全部地区', flag: '🌍', count: 0 },
      ...countries.map((c) => ({ id: c.id, name: c.name, flag: c.flag, count: c.projectCount })),
    ];
  }, []);

  /** 专业方向筛选按钮（6 大类 + 全部） */
  const majorFilters = useMemo(
    () => ['全部专业', ...(majorsData as MajorCategory[]).map((c) => c.category)],
    [],
  );

  // ---------- 数据展平 ----------

  /** 将所有大学的项目展平为扁平列表（JSON 兜底数据） */
  const jsonPrograms = useMemo(() => {
    const universities = universitiesData as UniversityItem[];
    const flat: FlatProgram[] = [];
    universities.forEach((uni) => {
      uni.programs.forEach((prog) => {
        flat.push({
          program: prog,
          university: {
            id: uni.id,
            school: uni.school,
            schoolEn: uni.schoolEn,
            country: uni.country.toUpperCase(), // ProgramCard countryFlag() 需要大写
            ranking: uni.ranking,
            logo: uni.logo,
          },
          countryId: uni.country, // 小写用于筛选
          majorCategory: matchMajorCategory(prog),
        });
      });
    });
    return flat;
  }, []);

  const [allPrograms, setAllPrograms] = useState<FlatProgram[]>(jsonPrograms);

  // 尝试从 API 加载数据，失败则保持 JSON 数据
  useEffect(() => {
    http.get('/study-abroad/programs', { params: { pageSize: 200 } })
      .then(res => {
        const apiList = res.data.data?.list;
        if (Array.isArray(apiList) && apiList.length > 0) {
          setAllPrograms(apiList.map(mapApiProgram));
        }
      })
      .catch(() => {
        // API 不可用时静默使用 JSON 数据
      });
  }, []);

  // ---------- 统计 ----------

  const totalUniversities = useMemo(
    () => new Set(allPrograms.map((p) => p.university.id)).size,
    [allPrograms],
  );

  const totalAdmitted = useMemo(
    () => allPrograms.reduce((sum, p) => sum + p.program.admittedCount, 0),
    [allPrograms],
  );

  // ---------- 组合筛选 + 排序 ----------

  const filtered = useMemo(() => {
    let result = allPrograms;

    // 国家筛选
    if (selectedCountry !== 'all') {
      result = result.filter((p) => p.countryId === selectedCountry);
    }
    // 专业分类筛选
    if (selectedMajor !== '全部专业') {
      result = result.filter((p) => p.majorCategory === selectedMajor);
    }
    // QS 排名筛选
    if (selectedRanking !== '不限排名') {
      const top = parseInt(selectedRanking.replace(/\D/g, ''));
      result = result.filter((p) => p.university.ranking > 0 && p.university.ranking <= top);
    }
    // 学位类型筛选
    if (selectedDegree !== '全部学位') {
      result = result.filter((p) => matchDegreeType(p.program) === selectedDegree);
    }
    // 搜索关键字过滤（已防抖）
    if (debouncedSearch) {
      const kw = debouncedSearch.toLowerCase();
      result = result.filter((p) => {
        const text = `${p.program.name} ${p.program.nameEn} ${p.university.school} ${p.university.schoolEn} ${p.program.tags.join(' ')}`.toLowerCase();
        return text.includes(kw);
      });
    }

    // 排序
    return [...result].sort((a, b) => {
      switch (sortBy) {
        case 'ranking':
          return (a.university.ranking || 999) - (b.university.ranking || 999);
        case 'deadline':
          return (
            new Date(a.program.deadline).getTime() - new Date(b.program.deadline).getTime()
          );
        case 'applicants':
          return b.program.applicantCount - a.program.applicantCount;
        case 'admitRate': {
          const ra =
            a.program.applicantCount > 0
              ? a.program.admittedCount / a.program.applicantCount
              : 0;
          const rb =
            b.program.applicantCount > 0
              ? b.program.admittedCount / b.program.applicantCount
              : 0;
          return ra - rb; // 越低越竞争 → 排前
        }
        default:
          return 0;
      }
    });
  }, [
    allPrograms,
    selectedCountry,
    selectedMajor,
    selectedRanking,
    selectedDegree,
    debouncedSearch,
    sortBy,
  ]);

  // ---------- 分页 ----------

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const paginatedPrograms = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  );

  // 活跃筛选数量（高级筛选按钮角标）
  const activeFiltersCount = [
    selectedCountry !== 'all',
    selectedMajor !== '全部专业',
    selectedRanking !== '不限排名',
    selectedDegree !== '全部学位',
  ].filter(Boolean).length;

  // 分页页码生成
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1) as (number | '...')[];
    }
    const pages: (number | '...')[] = [1];
    if (currentPage > 3) pages.push('...');
    for (
      let i = Math.max(2, currentPage - 1);
      i <= Math.min(totalPages - 1, currentPage + 1);
      i++
    ) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push('...');
    if (totalPages > 1) pages.push(totalPages);
    return pages;
  }, [currentPage, totalPages]);

  /** 清除全部筛选 */
  const clearAllFilters = () => {
    setSelectedCountry('all');
    setSelectedMajor('全部专业');
    setSelectedRanking('不限排名');
    setSelectedDegree('全部学位');
    setSearchInput('');
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-6 pb-16">
      <div className="container-main">
        {/* ====== 页面头部 ====== */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-[13px] text-gray-400 mb-4">
            <Link to="/study-abroad" className="hover:text-primary-500 transition-colors">
              留学
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-gray-600">选校</span>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-[30px] font-bold text-gray-900 flex items-center gap-3 mb-2">
                <GraduationCap className="w-8 h-8 text-primary-500" /> 院校与项目库
              </h1>
              <p className="text-[15px] text-gray-500">
                覆盖全球{' '}
                <span className="font-bold text-gray-900">{countryFilters.length - 1}</span>{' '}
                个热门留学国家/地区，
                <span className="font-bold text-gray-900">{allPrograms.length}</span> 精选硕博项目
              </p>
            </div>
            {/* 快捷统计 */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-[13px] text-gray-500">
                <Building2 className="w-4 h-4 text-primary-500" />
                <span className="font-bold text-gray-900">{totalUniversities}</span> 合作院校
              </div>
              <div className="flex items-center gap-1.5 text-[13px] text-gray-500">
                <Users className="w-4 h-4 text-primary-500" />
                <span className="font-bold text-gray-900">
                  {totalAdmitted.toLocaleString()}
                </span>{' '}
                录取案例
              </div>
            </div>
          </div>
        </div>

        {/* ====== 搜索栏 ====== */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            {/* 搜索框（300ms 防抖） */}
            <div className="flex-grow relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索院校、项目名称（如 Imperial、计算机、商业分析）..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white placeholder-gray-400 transition-all"
              />
            </div>
            {/* 筛选按钮 */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium text-[14px] transition-colors shrink-0 ${
                showFilters || activeFiltersCount > 0
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              高级筛选
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 bg-white text-primary-500 rounded-full text-[11px] font-bold flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* 筛选面板（展开/折叠） */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pt-4 mt-4 border-t border-gray-100 space-y-4">
                  {/* 国家/地区（14 国 + 全部） */}
                  <div>
                    <label className="text-[13px] font-medium text-gray-500 mb-2 block">
                      国家/地区
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {countryFilters.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setSelectedCountry(c.id)}
                          className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                            selectedCountry === c.id
                              ? 'bg-primary-500 text-white shadow-sm'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {c.flag} {c.name}
                          {c.count > 0 && (
                            <span className="ml-1 opacity-60">({c.count})</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 专业方向（6 大分类 + 全部） */}
                  <div>
                    <label className="text-[13px] font-medium text-gray-500 mb-2 block">
                      专业方向
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {majorFilters.map((m) => (
                        <button
                          key={m}
                          onClick={() => setSelectedMajor(m)}
                          className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                            selectedMajor === m
                              ? 'bg-primary-500 text-white shadow-sm'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* QS 排名范围 */}
                  <div>
                    <label className="text-[13px] font-medium text-gray-500 mb-2 block">
                      QS 世界排名
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {RANKINGS.map((r) => (
                        <button
                          key={r}
                          onClick={() => setSelectedRanking(r)}
                          className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                            selectedRanking === r
                              ? 'bg-primary-500 text-white shadow-sm'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 学位类型 */}
                  <div>
                    <label className="text-[13px] font-medium text-gray-500 mb-2 block">
                      学位类型
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {DEGREE_TYPES.map((d) => (
                        <button
                          key={d}
                          onClick={() => setSelectedDegree(d)}
                          className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                            selectedDegree === d
                              ? 'bg-primary-500 text-white shadow-sm'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 清除筛选 */}
                  {activeFiltersCount > 0 && (
                    <button
                      onClick={clearAllFilters}
                      className="text-[13px] text-red-500 hover:text-red-700 font-medium flex items-center gap-1 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" /> 清除所有筛选
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ====== 排序 + 结果计数 ====== */}
        <div className="flex items-center justify-between mb-5">
          <span className="text-[14px] text-gray-500">
            共找到 <span className="font-bold text-gray-900">{filtered.length}</span> 个项目
            {activeFiltersCount > 0 && (
              <span className="text-primary-500 ml-2">({activeFiltersCount} 个筛选条件)</span>
            )}
          </span>
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="text-[13px] text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
            >
              <option value="ranking">按 QS 排名</option>
              <option value="deadline">按截止日期</option>
              <option value="applicants">按申请热度</option>
              <option value="admitRate">按竞争激烈度</option>
            </select>
          </div>
        </div>

        {/* ====== 项目列表（ProgramCard 详细模式） ====== */}
        <div className="space-y-4">
          {paginatedPrograms.map((item) => (
            <ProgramCard
              key={`${item.university.id}-${item.program.id}`}
              program={item.program}
              university={item.university}
              mode="detailed"
            />
          ))}
        </div>

        {/* 空状态 */}
        {filtered.length === 0 && (
          <div className="text-center py-20">
            <Search className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-[18px] font-bold text-gray-500 mb-2">没有找到匹配的项目</h3>
            <p className="text-[14px] text-gray-400 mb-4">尝试调整筛选条件或搜索关键词</p>
            <button
              onClick={clearAllFilters}
              className="text-[14px] text-primary-500 font-medium hover:underline"
            >
              清除所有筛选条件
            </button>
          </div>
        )}

        {/* ====== 分页 ====== */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-10">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 h-10 rounded-xl bg-white text-gray-500 border border-gray-200 hover:border-primary-500 hover:text-primary-500 text-[14px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> 上一页
              </button>

              {pageNumbers.map((page, idx) =>
                page === '...' ? (
                  <span key={`dots-${idx}`} className="text-gray-400 px-2">
                    ...
                  </span>
                ) : (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page as number)}
                    className={`w-10 h-10 rounded-xl text-[14px] font-medium transition-colors ${
                      currentPage === page
                        ? 'bg-primary-500 text-white shadow-sm'
                        : 'bg-white text-gray-500 border border-gray-200 hover:border-primary-500 hover:text-primary-500'
                    }`}
                  >
                    {page}
                  </button>
                ),
              )}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 h-10 rounded-xl bg-white text-gray-500 border border-gray-200 hover:border-primary-500 hover:text-primary-500 text-[14px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                下一页 <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ====== CTA 底部引导 ====== */}
        <div className="mt-12 bg-gradient-to-r from-gray-900 to-slate-800 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-[20px] font-bold text-white mb-2">不确定如何选校？</h3>
            <p className="text-[14px] text-gray-400">
              资深留学顾问根据你的背景，一对一定制选校方案
            </p>
          </div>
          <button className="bg-primary-500 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/20 flex items-center gap-2 shrink-0">
            <Sparkles className="w-4 h-4" /> 免费选校评估
          </button>
        </div>
      </div>
    </div>
  );
}
