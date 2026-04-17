import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  ChevronRight,
  Search,
  CheckCircle2,
  Clock,
  X,
  ArrowUpDown,
  Award,
  BarChart3,
  ThumbsUp,
  Filter,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import OfferStoryCard from '../components/study-abroad/OfferStoryCard';
import offersDataJson from '../data/study-abroad-offers.json';
import countriesData from '../data/study-abroad-countries.json';
import http from '../api/http';

// ====== 类型定义 ======

interface ApiOfferRow {
  id: number | string;
  student_name: string;
  avatar?: string | null;
  background: string;
  gpa?: string;
  ielts?: number | null;
  toefl?: number | null;
  gre?: number | null;
  internship?: string | string[];
  research?: string | string[];
  result: string;
  country: string;
  school: string;
  program: string;
  scholarship?: string;
  story?: string;
  date?: string;
  tags?: string | string[];
  likes?: number;
}

interface OfferItem {
  id: string;
  studentName: string;
  avatar: string | null;
  background: string;
  gpa: string;
  ielts: number | null;
  toefl: number | null;
  gre: number | null;
  internship: string[];
  research: string[];
  result: string;
  country: string;
  school: string;
  program: string;
  scholarship: string;
  story: string;
  date: string;
  tags: string[];
  likes: number;
}

interface CountryItem {
  id: string;
  name: string;
  flag: string;
}

// ====== 常量 ======

const SEASONS = ['2026 Fall', '2026 Spring', '2025 Fall', '2025 Spring'];

// ====== 工具函数 ======

/** 从 result 文本推断录取状态（与 OfferStoryCard 内部逻辑一致） */
function getResultStatus(result: string): 'admitted' | 'rejected' | 'waitlisted' {
  if (/录取|offer|admitted|accept/i.test(result)) return 'admitted';
  if (/拒绝|reject|denied/i.test(result)) return 'rejected';
  if (/等待|waitlist|pending/i.test(result)) return 'waitlisted';
  return 'admitted'; // 默认视为录取
}

/** 从背景描述中提取院校层次（985/211/双非/海本） */
function extractBgType(background: string): string {
  if (background.includes('985')) return '985';
  if (background.includes('211')) return '211';
  if (background.includes('双非')) return '双非';
  if (background.includes('海本') || background.includes('海外')) return '海本';
  return '其他';
}

/** 将 API 返回的 snake_case 行映射为 OfferItem */
function mapApiOffer(row: ApiOfferRow): OfferItem {
  return {
    id: String(row.id),
    studentName: row.student_name,
    avatar: row.avatar || null,
    background: row.background,
    gpa: row.gpa || '',
    ielts: row.ielts ?? null,
    toefl: row.toefl ?? null,
    gre: row.gre ?? null,
    internship: typeof row.internship === 'string' ? JSON.parse(row.internship) : (row.internship || []),
    research: typeof row.research === 'string' ? JSON.parse(row.research) : (row.research || []),
    result: row.result,
    country: row.country,
    school: row.school,
    program: row.program,
    scholarship: row.scholarship || '',
    story: row.story || '',
    date: row.date?.slice?.(0, 10) || row.date,
    tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags || []),
    likes: row.likes || 0,
  };
}

// ====== 组件 ======

export default function StudyAbroadOffers() {
  const [offers, setOffers] = useState<OfferItem[]>(offersDataJson as OfferItem[]);
  const countries = countriesData as CountryItem[];

  // 尝试从 API 加载数据，失败则保持 JSON 数据
  useEffect(() => {
    http.get('/study-abroad/offers', { params: { pageSize: 100 } })
      .then(res => {
        const apiList = res.data.data?.list;
        if (Array.isArray(apiList) && apiList.length > 0) {
          setOffers(apiList.map(mapApiOffer));
        }
      })
      .catch(() => {
        // API 不可用时静默使用 JSON 数据
      });
  }, []);

  // ---------- 筛选状态 ----------
  const [selectedSeason, setSelectedSeason] = useState('2026 Fall');
  const [resultFilter, setResultFilter] = useState<'all' | 'admitted' | 'rejected' | 'waitlisted'>(
    'all',
  );
  const [bgFilter, setBgFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'likes'>('date');

  // ---------- 动态数据 ----------

  /** 14 国家 + 全部 */
  const countryFilters = useMemo(
    () => [
      { id: 'all', name: '全部地区', flag: '🌍' },
      ...countries.map((c) => ({ id: c.id, name: c.name, flag: c.flag })),
    ],
    [countries],
  );

  /** 统计卡片数据（从 JSON 动态计算） */
  const stats = useMemo(() => {
    const total = offers.length;
    const admitted = offers.filter((o) => getResultStatus(o.result) === 'admitted').length;
    const rejected = offers.filter((o) => getResultStatus(o.result) === 'rejected').length;
    const waitlisted = offers.filter((o) => getResultStatus(o.result) === 'waitlisted').length;
    const admitRate = total > 0 ? Math.round((admitted / total) * 100) : 0;
    const totalLikes = offers.reduce((sum, o) => sum + o.likes, 0);
    return { total, admitted, rejected, waitlisted, admitRate, totalLikes };
  }, [offers]);

  // ---------- 组合筛选 + 排序 ----------

  const filtered = useMemo(() => {
    let result = [...offers];

    // 录取结果筛选
    if (resultFilter !== 'all') {
      result = result.filter((o) => getResultStatus(o.result) === resultFilter);
    }
    // 背景筛选
    if (bgFilter !== 'all') {
      result = result.filter((o) => extractBgType(o.background) === bgFilter);
    }
    // 国家筛选
    if (countryFilter !== 'all') {
      result = result.filter((o) => o.country === countryFilter);
    }
    // 搜索关键字
    if (searchKeyword) {
      const kw = searchKeyword.toLowerCase();
      result = result.filter((o) => {
        const text =
          `${o.school} ${o.program} ${o.background} ${o.studentName} ${o.tags.join(' ')}`.toLowerCase();
        return text.includes(kw);
      });
    }

    // 排序
    return result.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'likes':
          return b.likes - a.likes;
        default:
          return 0;
      }
    });
  }, [offers, resultFilter, bgFilter, countryFilter, searchKeyword, sortBy]);

  /** 清除全部筛选 */
  const clearAllFilters = () => {
    setResultFilter('all');
    setBgFilter('all');
    setCountryFilter('all');
    setSearchKeyword('');
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-6 pb-16">
      <div className="container-main">
        {/* ====== 面包屑 ====== */}
        <div className="flex items-center gap-2 text-[13px] text-gray-400 mb-4">
          <Link to="/study-abroad" className="hover:text-primary-500 transition-colors">
            留学
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-gray-600">Offer 榜</span>
        </div>

        {/* ====== 页面头部 ====== */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="text-[30px] font-bold text-gray-900 flex items-center gap-3 mb-2">
              <TrendingUp className="w-8 h-8 text-primary-500" /> Offer 榜
            </h1>
            <p className="text-[15px] text-gray-500">
              来自平台{' '}
              <span className="font-bold text-gray-900">{stats.total}</span> 位用户的真实录取故事，
              累计 <span className="font-bold text-gray-900">{stats.totalLikes.toLocaleString()}</span> 次点赞
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="text-[13px] text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
            >
              <option value="date">按时间排序</option>
              <option value="likes">按热度排序</option>
            </select>
          </div>
        </div>

        {/* ====== 统计卡片 ====== */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            {
              label: '总数据量',
              value: stats.total,
              icon: BarChart3,
              color: 'text-primary-500',
              bg: 'bg-primary-50',
              border: 'border-primary-100',
            },
            {
              label: 'Offer',
              value: stats.admitted,
              icon: CheckCircle2,
              color: 'text-green-600',
              bg: 'bg-green-50',
              border: 'border-green-100',
            },
            {
              label: 'Rejected',
              value: stats.rejected,
              icon: X,
              color: 'text-red-600',
              bg: 'bg-red-50',
              border: 'border-red-100',
            },
            {
              label: 'Waitlisted',
              value: stats.waitlisted,
              icon: Clock,
              color: 'text-yellow-600',
              bg: 'bg-yellow-50',
              border: 'border-yellow-100',
            },
            {
              label: '录取率',
              value: `${stats.admitRate}%`,
              icon: Award,
              color: 'text-primary-600',
              bg: 'bg-primary-50',
              border: 'border-primary-100',
            },
          ].map((s, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`${s.bg} rounded-2xl p-5 border ${s.border}`}
            >
              <s.icon className={`w-6 h-6 ${s.color} mb-2`} />
              <div className={`text-[28px] font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[13px] text-gray-500">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* ====== 筛选栏 ====== */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            {/* 申请季 */}
            <div className="flex gap-2 shrink-0 overflow-x-auto">
              {SEASONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedSeason(s)}
                  className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all whitespace-nowrap ${
                    selectedSeason === s
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            {/* 搜索 */}
            <div className="flex-grow relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索院校、项目、本科学校、学生姓名..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder-gray-400 transition-all"
              />
            </div>
          </div>

          {/* 筛选按钮组 */}
          <div className="flex flex-wrap gap-2">
            {/* 结果筛选 */}
            {(
              [
                { key: 'all', label: '全部结果' },
                { key: 'admitted', label: 'Offer' },
                { key: 'rejected', label: 'Rejected' },
                { key: 'waitlisted', label: 'Waitlisted' },
              ] as const
            ).map((f) => (
              <button
                key={f.key}
                onClick={() => setResultFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                  resultFilter === f.key
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
                {f.key !== 'all' && (
                  <span className="ml-1 opacity-60">
                    (
                    {f.key === 'admitted'
                      ? stats.admitted
                      : f.key === 'rejected'
                        ? stats.rejected
                        : stats.waitlisted}
                    )
                  </span>
                )}
              </button>
            ))}

            <span className="w-px h-6 bg-gray-200 self-center mx-1" />

            {/* 背景筛选 */}
            {[
              { key: 'all', label: '全部背景' },
              { key: '985', label: '985' },
              { key: '211', label: '211' },
              { key: '双非', label: '双非' },
              { key: '海本', label: '海本' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setBgFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                  bgFilter === f.key
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* 国家/地区高级筛选 */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="mt-3 text-[12px] text-gray-400 hover:text-primary-500 flex items-center gap-1 transition-colors"
          >
            <Filter className="w-3 h-3" /> 国家/地区筛选{' '}
            <ChevronDown
              className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
            />
          </button>
          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-3 flex flex-wrap gap-2">
                  {countryFilters.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCountryFilter(c.id)}
                      className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                        countryFilter === c.id
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {c.flag} {c.name}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ====== 结果计数 ====== */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[14px] text-gray-500">
            共 <span className="font-bold text-gray-900">{filtered.length}</span> 条数据
          </span>
          {(resultFilter !== 'all' || bgFilter !== 'all' || countryFilter !== 'all') && (
            <button
              onClick={clearAllFilters}
              className="text-[12px] text-red-500 hover:text-red-700 font-medium flex items-center gap-1 transition-colors"
            >
              <X className="w-3 h-3" /> 清除筛选
            </button>
          )}
        </div>

        {/* ====== Offer 列表（OfferStoryCard 完整模式） ====== */}
        <div className="space-y-4">
          {filtered.map((offer) => (
            <OfferStoryCard key={offer.id} offer={offer} mode="full" />
          ))}
        </div>

        {/* 空状态 */}
        {filtered.length === 0 && (
          <div className="text-center py-20">
            <TrendingUp className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-[18px] font-bold text-gray-500 mb-2">暂无匹配的录取数据</h3>
            <p className="text-[14px] text-gray-400 mb-4">尝试切换申请季或调整筛选条件</p>
            <button
              onClick={clearAllFilters}
              className="text-[14px] text-primary-500 font-medium hover:underline"
            >
              清除所有筛选条件
            </button>
          </div>
        )}

        {/* ====== CTA ====== */}
        <div className="mt-12 bg-gradient-to-r from-gray-900 to-slate-800 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-[20px] font-bold text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary-500" /> 分享你的 Offer，帮助更多同学
            </h3>
            <p className="text-[14px] text-gray-400">
              提交你的录取数据，我们将保护你的隐私并帮助更多申请者了解录取趋势
            </p>
          </div>
          <button className="bg-primary-500 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/20 flex items-center gap-2 shrink-0">
            <ThumbsUp className="w-4 h-4" /> 提交我的 Offer
          </button>
        </div>
      </div>
    </div>
  );
}
