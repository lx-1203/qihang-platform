import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Search, Play, Users, Star, ChevronRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import http from '@/api/http';
import ErrorState from '../components/ui/ErrorState';
import EmptyState from '../components/ui/EmptyState';
import { ListSkeleton } from '../components/ui/Skeleton';
import Tag from '@/components/ui/Tag';
import coursesConfig from '@/data/courses-config.json';

// ====== 课程列表页 ======
// 数据从 /api/courses 获取，分类和文案从 courses-config.json 配置文件读取

const {
  categories: CATEGORIES,
  pageMeta,
  emptyState: emptyStateConfig,
  errorMessages,
  ui,
} = coursesConfig;

interface CourseItem {
  id: number;
  title: string;
  cover?: string;
  tags?: string[];
  mentor?: string;
  mentor_name?: string;
  duration?: string;
  rating?: string;
  views?: number;
}

export default function Courses() {
  const [activeCategory, setActiveCategory] = useState('全部');
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageSize = ui.pageSize || 20;

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, pageSize };
      if (activeCategory !== '全部') params.category = activeCategory;
      if (keyword) params.keyword = keyword;

      const res = await http.get('/courses', { params });
      if (res.data?.code === 200) {
        const data = res.data.data;
        const newCourses = data.courses || [];
        setCourses(prev => page === 1 ? newCourses : [...prev, ...newCourses]);
        setTotal(data.total || 0);
        setError(null);
      } else {
        setError(errorMessages.fetchFailed);
      }
    } catch {
      setError(errorMessages.networkError);
    } finally {
      setLoading(false);
    }
  }, [page, activeCategory, keyword]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleSearch = () => {
    setPage(1);
    setKeyword(searchInput);
  };

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setPage(1);
  };

  const handleClearFilters = () => {
    setActiveCategory('全部');
    setKeyword('');
    setSearchInput('');
    setPage(1);
  };

  const hasMore = total > page * pageSize;

  return (
    <div className="min-h-screen bg-gray-50 pt-8 pb-12">
      <div className="container-main">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <h1 className="text-[32px] font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-8 h-8 text-primary-500" />
              {pageMeta.title}
            </h1>
            <p className="text-[16px] text-gray-600 mt-2">{pageMeta.subtitle}</p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-[320px]">
            <input
              type="text"
              placeholder={pageMeta.searchPlaceholder}
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900
                focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
                transition-all duration-200 shadow-sm"
            />
            <button onClick={handleSearch} className="absolute right-3 top-1/2 -translate-y-1/2">
              <Search className="w-5 h-5 text-gray-400 hover:text-primary-600 transition-colors" />
            </button>
          </div>
        </div>

        {/* Categories */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-8">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={`px-5 py-2 rounded-full text-[14px] font-bold transition-all duration-200 ${
                activeCategory === cat
                  ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30'
                  : 'bg-gray-100 text-gray-600 hover:bg-violet-50 hover:text-violet-700 border-2 border-transparent hover:border-violet-200 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-violet-400/30 focus-visible:outline-none'
              }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Course Grid */}
        {loading && page === 1 ? (
          <ListSkeleton count={8} />
        ) : !loading && error && courses.length === 0 ? (
          <ErrorState
            message={error}
            onRetry={() => { setPage(1); fetchCourses(); }}
          />
        ) : courses.length === 0 && !loading ? (
          <EmptyState
            icon={BookOpen}
            variant="noData"
            title={emptyStateConfig.title}
            description={emptyStateConfig.description}
            actionText={emptyStateConfig.actionText}
            onAction={handleClearFilters}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {courses.map((course) => (
              <Link key={course.id} to={`/courses/${course.id}`} className="group block">
                <div className="bg-white rounded-[16px] overflow-hidden border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.1)] hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col h-full">

                  {/* Cover Image */}
                  <div className="relative aspect-video overflow-hidden">
                    {course.cover ? (
                      <img
                        src={course.cover}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-600 flex items-center justify-center">
                        <BookOpen className="w-12 h-12 text-white/60" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-primary-500 shadow-lg pl-1">
                        <Play size={24} fill="currentColor" />
                      </div>
                    </div>
                    {course.duration && (
                      <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[12px] px-2 py-0.5 rounded backdrop-blur-sm">
                        {course.duration}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4 flex-grow flex flex-col">
                    <h3 className="text-[16px] font-bold text-gray-900 line-clamp-2 leading-snug group-hover:text-primary-500 transition-colors mb-2">
                      {course.title}
                    </h3>

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {(Array.isArray(course.tags) ? course.tags : []).slice(0, 3).map((tag: string, idx: number) => (
                        <Tag key={idx} variant="gray" size="xs">
                          {tag}
                        </Tag>
                      ))}
                    </div>

                    <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between text-[13px] text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-primary-500 text-white flex items-center justify-center text-[10px] font-bold">
                          {(course.mentor || course.mentor_name || '导')[0]}
                        </div>
                        <span className="font-medium text-gray-600 truncate max-w-[100px]">
                          {(course.mentor || course.mentor_name || '').split(' ')[0]}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        {course.rating && (
                          <div className="flex items-center gap-1">
                            <Star size={13} className="text-orange-500" fill="currentColor" />
                            <span className="text-orange-500 font-medium">{course.rating}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Users size={13} />
                          <span>{course.views || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Load More */}
        {!loading && hasMore && (
          <div className="mt-12 flex justify-center">
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={loading}
              className="px-6 py-2.5 border border-gray-300 text-gray-600 font-medium rounded-full
                hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center gap-2
                disabled:opacity-50 disabled:cursor-not-allowed
                active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-primary-400/30 focus-visible:outline-none"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {ui.loadMoreText} <ChevronRight size={16} />
            </button>
          </div>
        )}
        {loading && page > 1 && (
          <div className="mt-12 flex justify-center">
            <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
          </div>
        )}

        {/* 总数提示 */}
        {!loading && courses.length > 0 && (
          <p className="text-center text-gray-400 text-sm mt-6">
            {ui.totalTemplate.replace('{total}', String(total))}
          </p>
        )}
      </div>
    </div>
  );
}
