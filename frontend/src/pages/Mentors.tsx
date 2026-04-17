import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search, Star, Users, Award, MessageCircle
} from 'lucide-react';
import http from '@/api/http';
import { CardSkeleton } from '../components/ui/Skeleton';
import ErrorState from '../components/ui/ErrorState';
import EmptyState from '../components/ui/EmptyState';
import Tag from '@/components/ui/Tag';
import mentorsConfig from '@/data/mentors-config.json';

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

  useEffect(() => {
    fetchMentors();
  }, []);

  async function fetchMentors() {
    try {
      setLoading(true);
      setError(null);
      const res = await http.get('/mentors');
      if (res.data?.code === 200 && res.data.data) {
        const list = res.data.data.list || res.data.data;
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
  });

  const handleClearFilters = () => {
    setSearch('');
    setExpertiseFilter('全部');
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={pageMeta.searchPlaceholder}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl text-sm
              focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
              outline-none bg-white transition-all duration-200"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {expertiseOptions.map(opt => (
            <button
                onClick={() => setExpertiseFilter(opt)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                  expertiseFilter === opt
                    ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30'
                    : 'bg-white border-2 border-gray-200 text-gray-600 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-violet-400/30 focus-visible:outline-none'
                }`}
              >
              {opt}
            </button>
          ))}
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
                  src={mentor.avatar}
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
                  <span className="text-xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">{mentor.price}</span>
                  <span className="text-gray-500 text-xs">元/次</span>
                </div>
                <span className="flex items-center gap-1 text-sm font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent group-hover:translate-x-1 transition-transform">
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
