import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Search, Play, Users, Star, ChevronRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import http from '@/api/http';
import ErrorState from '../components/ui/ErrorState';

// ====== 课程列表页 ======
// 数据从 /api/courses 获取，不再使用硬编码 mock

const CATEGORIES = ['全部', '求职指导', '面试技巧', '简历制作', '行业解析', '考研保研', '体制内备考', '技能提升'];

export default function Courses() {
  const [activeCategory, setActiveCategory] = useState('全部');
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [courses, setCourses] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 20;

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
        setError('获取课程数据失败，服务器返回异常');
      }
    } catch {
      setError('网络请求失败，请检查网络连接后重试');
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

  const hasMore = total > page * pageSize;

  return (
    <div className="min-h-screen bg-[#f9fafb] pt-8 pb-12">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <h1 className="text-[32px] font-bold text-[#111827] flex items-center gap-2">
              <BookOpen className="w-8 h-8 text-[#14b8a6]" />
              干货资料库
            </h1>
            <p className="text-[16px] text-[#4b5563] mt-2">海量免费干货视频，系统性提升你的求职硬实力</p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-[320px]">
            <input
              type="text"
              placeholder="搜索干货资料..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent transition-all shadow-sm"
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
                className={`px-4 py-1.5 rounded-full text-[14px] font-medium transition-colors ${
                  activeCategory === cat
                    ? 'bg-[#14b8a6] text-white'
                    : 'bg-gray-100 text-[#4b5563] hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Course Grid */}
        {loading && page === 1 ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          </div>
        ) : !loading && error && courses.length === 0 ? (
          <ErrorState
            message={error}
            onRetry={() => { setPage(1); fetchCourses(); }}
          />
        ) : courses.length === 0 && !loading ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
              <BookOpen size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">暂无课程</h3>
            <p className="text-gray-500 mb-6">尝试更换分类或搜索关键词</p>
            <button
              onClick={() => { setActiveCategory('全部'); setKeyword(''); setSearchInput(''); setPage(1); }}
              className="bg-primary-50 text-primary-700 px-6 py-2 rounded-lg font-medium hover:bg-primary-100 transition-colors"
            >
              清除筛选
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {courses.map((course) => (
              <Link key={course.id} to={`/courses/${course.id}`} className="group block">
                <div className="bg-white rounded-[16px] overflow-hidden border border-[#e5e7eb] shadow-[0_1px_3px_rgba(0,0,0,0.1)] hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col h-full">

                  {/* Cover Image */}
                  <div className="relative aspect-video overflow-hidden">
                    {course.cover ? (
                      <img
                        src={course.cover}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                        <BookOpen className="w-12 h-12 text-white/60" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-[#14b8a6] shadow-lg pl-1">
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
                    <h3 className="text-[16px] font-bold text-[#111827] line-clamp-2 leading-snug group-hover:text-[#14b8a6] transition-colors mb-2">
                      {course.title}
                    </h3>

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {(Array.isArray(course.tags) ? course.tags : []).slice(0, 3).map((tag: string, idx: number) => (
                        <span key={idx} className="bg-[#f3f4f6] text-[#6b7280] px-1.5 py-0.5 rounded text-[11px]">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between text-[13px] text-[#9ca3af]">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-[#14b8a6] text-white flex items-center justify-center text-[10px] font-bold">
                          {(course.mentor || course.mentor_name || '导')[0]}
                        </div>
                        <span className="font-medium text-[#4b5563] truncate max-w-[100px]">
                          {(course.mentor || course.mentor_name || '').split(' ')[0]}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        {course.rating && (
                          <div className="flex items-center gap-1">
                            <Star size={13} className="text-[#f97316]" fill="currentColor" />
                            <span className="text-[#f97316] font-medium">{course.rating}</span>
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
              className="px-6 py-2.5 border border-gray-300 text-[#4b5563] font-medium rounded-full hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              加载更多干货 <ChevronRight size={16} />
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
            共 {total} 门课程
          </p>
        )}
      </div>
    </div>
  );
}
