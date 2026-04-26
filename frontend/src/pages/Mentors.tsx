import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search, Star, Users, Award, MessageCircle, ChevronDown, Filter, SlidersHorizontal
} from 'lucide-react';
import http from '@/api/http';
import { CardSkeleton } from '../components/ui/Skeleton';
import ErrorState from '../components/ui/ErrorState';
import EmptyState from '../components/ui/EmptyState';
import Tag from '@/components/ui/Tag';
import mentorsConfig from '@/data/mentors-config.json';
import { DEFAULT_AVATAR } from '@/constants';

// ====== 导师列表页 ======
// 数据从 /api/mentors 获取，筛选选项和文案从 mentors-config.json 配置文件读取

const {
  pageMeta,
  expertiseOptions,
  emptyState: emptyStateConfig,
  errorMessages,
  ui,
} = mentorsConfig;

interface MentorItem {
  id: number;
  user_id: number;
  name: string;
  title: string;
  avatar: string;
  bio: string;
  expertise: string[];
  tags: string[];
  rating: number;
  rating_count: number;
  price: number;
  status: number;
}

export default function Mentors() {
  const [mentors, setMentors] = useState<MentorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expertiseFilter, setExpertiseFilter] = useState('全部');
  const [sortBy, setSortBy] = useState('default');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const SORT_OPTIONS = [
    { value: 'default', label: '默认排序' },
    { value: 'rating', label: '评分最高' },
    { value: 'rating_count', label: '评价最多' },
    { value: 'price_low', label: '价格从低到高' },
    { value: 'price_high', label: '价格从高到低' },
  ];

  useEffect(() => {
    fetchMentors();
  }, []);

  // 页面重新可见时刷新（Profile 页改头像后返回同步）
  useEffect(() => {
    const handleFocus = () => fetchMentors();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  async function fetchMentors() {
    try {
      setLoading(true);
      setError(null);
      const res = await http.get('/mentors');
      if (res.data?.code === 200 && res.data.data) {
        const list = res.data.data.list || res.data.data.mentors || (Array.isArray(res.data.data) ? res.data.data : []);
        setMentors(list);
      } else {
        setError(errorMessages.fetchFailed);
      }
    } catch {
      setError(errorMessages.networkError);
    } finally {
      setLoading(false);
    }
  }

  const filtered = mentors.filter(m => {
    if (search && !m.name.includes(search) && !m.title.includes(search) && !m.bio.includes(search)) return false;
    if (expertiseFilter !== '全部' && !(m.expertise || []).includes(expertiseFilter)) return false;
    return true;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'rating': return b.rating - a.rating;
      case 'rating_count': return b.rating_count - a.rating_count;
      case 'price_low': return a.price - b.price;
      case 'price_high': return b.price - a.price;
      default: return 0;
    }
  });

  const handleClearFilters = () => {
    setSearch('');
    setExpertiseFilter('全部');
    setSortBy('default');
  };

  return (
    <div className="container-main py-8">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <h1 className="text-3xl font-bold text-gray-900">
          {pageMeta.title}
        </h1>
        <p className="text-gray-500 mt-2 text-lg">
          {pageMeta.subtitle}
        </p>
      </motion.div>

      {/* 搜索和筛选 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 mb-8">
        {/* 搜索栏 */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="mentors-search"
              name="mentors-search"
              type="text"
              placeholder={pageMeta.searchPlaceholder}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl text-base
                focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
                outline-none bg-gray-50 focus:bg-white transition-all duration-200"
            />
          </div>
          {/* 移动端筛选折叠 */}
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="sm:hidden flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600 hover:text-primary-600 transition-colors"
          >
            <SlidersHorizontal size={16} />
            筛选条件
            <ChevronDown className={`w-4 h-4 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* 下拉筛选行 */}
        <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-3 ${isFilterOpen ? 'flex' : 'hidden sm:flex'}`}>
          {/* 专业领域下拉 */}
          <div className="relative flex-1 sm:flex-none sm:w-52">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              id="mentor-expertise"
              name="expertise"
              value={expertiseFilter}
              onChange={e => setExpertiseFilter(e.target.value)}
              className="w-full appearance-none pl-9 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700
                focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white
                outline-none transition-all duration-200 cursor-pointer"
            >
              {expertiseOptions.map(opt => (
                <option key={opt} value={opt}>{opt === '全部' ? '专业领域：全部' : opt}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* 排序方式下拉 */}
          <div className="relative flex-1 sm:flex-none sm:w-48">
            <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              id="mentor-sort"
              name="sort"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="w-full appearance-none pl-9 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700
                focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white
                outline-none transition-all duration-200 cursor-pointer"
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* 快捷专业标签（仅桌面端可见） */}
          <div className="hidden lg:flex flex-wrap gap-2 flex-1">
            {expertiseOptions.slice(0, 5).map(opt => (
              <button
                key={opt}
                onClick={() => setExpertiseFilter(opt)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  expertiseFilter === opt
                    ? 'bg-primary-50 text-primary-700 border border-primary-200'
                    : 'bg-gray-50 text-gray-500 border border-transparent hover:bg-gray-100 hover:text-gray-700'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>

          {/* 清除筛选 */}
          {(expertiseFilter !== '全部' || sortBy !== 'default' || search) && (
            <button
              onClick={handleClearFilters}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium whitespace-nowrap
                hover:underline transition-colors px-2 py-2.5"
            >
              清除筛选
            </button>
          )}
        </div>
      </div>

      {/* 统计 */}
      {!loading && !error && (
      <div className="flex items-center gap-6 mb-6 text-sm text-gray-500">
        <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {ui.statsTemplate.replace('{count}', String(filtered.length))}</span>
        <span className="flex items-center gap-1"><Award className="w-4 h-4" /> {ui.ratingTemplate.replace('{rating}', (filtered.reduce((a, b) => a + b.rating, 0) / (filtered.length || 1)).toFixed(1))}</span>
      </div>
      )}

      {/* 加载状态 */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* 错误状态 */}
      {!loading && error && (
        <ErrorState
          message={error}
          onRetry={fetchMentors}
        />
      )}

      {/* 导师列表 */}
      {!loading && !error && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((mentor, i) => (
          <motion.div
            key={mentor.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link
              to={`/mentors/${mentor.id}`}
              className="block bg-white rounded-2xl p-6 border border-gray-100
                hover:shadow-lg hover:border-primary-200 hover:-translate-y-1
                active:scale-[0.98] transition-all duration-300 group
                focus-visible:ring-2 focus-visible:ring-primary-500/30 focus-visible:outline-none"
            >
              {/* 头像 + 基本信息 */}
              <div className="flex items-start gap-4">
                <img
                  src={mentor.avatar || DEFAULT_AVATAR}
                  alt={mentor.name}
                  className="w-16 h-16 rounded-xl object-cover border-2 border-gray-100 group-hover:border-primary-200 transition-colors"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                    {mentor.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5 truncate">{mentor.title}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Star className="w-4 h-4 text-amber-500 fill-current" />
                    <span className="text-sm font-bold text-gray-900">{mentor.rating}</span>
                    <span className="text-xs text-gray-400">({mentor.rating_count}条评价)</span>
                  </div>
                </div>
              </div>

              {/* 简介 */}
              <p className="text-sm text-gray-600 mt-4 line-clamp-2 leading-relaxed">{mentor.bio}</p>

              {/* 标签 */}
              <div className="flex flex-wrap gap-2 mt-4">
                {(mentor.expertise || []).slice(0, 4).map(tag => (
                  <Tag key={tag} variant="primary" size="md">
                    {tag}
                  </Tag>
                ))}
              </div>

              {/* 底部 */}
              <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-gray-500">辅导费用</span>
                  <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-600 bg-clip-text text-transparent">{mentor.price}</span>
                  <span className="text-gray-500 text-xs">元/次</span>
                </div>
                <span className="flex items-center gap-1 text-sm font-bold bg-gradient-to-r from-primary-600 to-primary-600 bg-clip-text text-transparent group-hover:translate-x-1 transition-transform">
                  <MessageCircle className="w-4 h-4" />
                  预约咨询
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
      )}

      {/* 空状态 - 使用 EmptyState 组件 */}
      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          icon={Users}
          variant="noData"
          title={emptyStateConfig.title}
          description={emptyStateConfig.description}
          actionText={emptyStateConfig.actionText}
          onAction={handleClearFilters}
        />
      )}
    </div>
  );
}
