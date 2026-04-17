import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  Search,
  MapPin,
  Briefcase,
  Clock,
  Filter,
  Sparkles,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import http from "@/api/http";
import { addSearchHistory } from "@/utils/searchHistory";
import ErrorState from "@/components/ui/ErrorState";
import Tag from "@/components/ui/Tag";

// ====== 岗位列表页 ======
// 数据全部从 /api/jobs 获取，筛选项由接口返回

interface JobItem {
  id: number;
  title: string;
  company_name: string;
  logo?: string;
  location: string;
  salary: string;
  type: string;
  time?: string;
  tags?: string[];
  urgent?: boolean;
}

export default function Jobs() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeCategory, setActiveCategory] = useState("全部");
  const [activeType, setActiveType] = useState("全部");
  const [activeLocation, setActiveLocation] = useState("全国");
  const [keyword, setKeyword] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // API 数据
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 20;

  // 筛选选项（从 API filters 获取）
  const [categories, setCategories] = useState<string[]>(["全部"]);
  const [types, setTypes] = useState<string[]>(["全部"]);
  const [locations, setLocations] = useState<string[]>(["全国"]);

  // 搜索联想
  const [suggestions, setSuggestions] = useState<{ type: string; text: string; company?: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // 从 URL 参数读取 keyword（由 Navbar / Home 搜索跳转而来）
  useEffect(() => {
    const urlKeyword = searchParams.get('keyword');
    if (urlKeyword) {
      setKeyword(urlKeyword);
      setSearchInput(urlKeyword);
      setPage(1);
    }
  }, [searchParams]);

  // 搜索联想防抖（300ms）
  useEffect(() => {
    if (suggestTimer.current) clearTimeout(suggestTimer.current);

    if (!searchInput.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    suggestTimer.current = setTimeout(async () => {
      try {
        const res = await http.get('/jobs/suggest', { params: { keyword: searchInput.trim() } });
        if (res.data?.code === 200 && Array.isArray(res.data.data)) {
          setSuggestions(res.data.data);
          setShowSuggestions(res.data.data.length > 0);
        }
      } catch {
        setSuggestions([]);
      }
    }, 300);

    return () => {
      if (suggestTimer.current) clearTimeout(suggestTimer.current);
    };
  }, [searchInput]);

  // 点击外部关闭联想下拉
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 获取岗位列表
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = { page, pageSize };
      if (activeType !== "全部") params.type = activeType;
      if (activeLocation !== "全国") params.location = activeLocation;
      if (activeCategory !== "全部") params.category = activeCategory;
      if (keyword) params.keyword = keyword;

      const res = await http.get("/jobs", { params });
      if (res.data?.code === 200) {
        const data = res.data.data;
        setJobs(data.jobs || []);
        setTotal(data.total || 0);
        // 首次加载时初始化筛选选项
        if (data.filters) {
          if (data.filters.categories) setCategories(data.filters.categories);
          if (data.filters.types) setTypes(data.filters.types);
          if (data.filters.locations) setLocations(data.filters.locations);
        }
      }
    } catch {
      setError('职位数据加载失败，请稍后重试');
      if (import.meta.env.DEV) console.error('[DEV] Jobs API 失败');
    } finally {
      setLoading(false);
    }
  }, [page, activeType, activeLocation, activeCategory, keyword]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // 搜索按钮
  const handleSearch = () => {
    setPage(1);
    setKeyword(searchInput);
    if (searchInput.trim()) {
      addSearchHistory(searchInput.trim());
    }
    if (locationInput) {
      // 尝试匹配已有地点选项
      const match = locations.find(l => locationInput.includes(l) || l.includes(locationInput));
      if (match) setActiveLocation(match);
    }
  };

  // 切换筛选时重置页码
  const handleFilterChange = (setter: (v: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* 1. 顶部搜索区域 */}
      <section className="bg-gray-900 text-white py-16 lg:py-24 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
          <svg className="absolute w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0,100 L100,0 L100,100 Z" fill="url(#gradJob)" />
            <defs>
              <linearGradient id="gradJob" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: "#14b8a6", stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: "#0f766e", stopOpacity: 0 }} />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
              发现你的下一个心仪岗位
            </h1>
            <p className="text-primary-100 text-lg sm:text-xl">
              精选名企校招、高质量实习机会，开启职场新篇章。
            </p>
          </div>

          <div ref={searchContainerRef} className="max-w-4xl mx-auto bg-white rounded-2xl p-2 sm:p-3 shadow-2xl flex flex-col sm:flex-row gap-2 relative">
            <div className="flex-1 flex items-center bg-gray-50 rounded-xl px-4 py-3 sm:py-0 border border-transparent focus-within:border-primary-500 focus-within:bg-white transition-colors relative">
              <Search className="text-gray-400 w-5 h-5 shrink-0" />
              <input
                type="text"
                placeholder="搜索职位、公司或关键词 (例如：前端、字节跳动)"
                value={searchInput}
                onChange={e => { setSearchInput(e.target.value); setShowSuggestions(true); }}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                onKeyDown={e => { if (e.key === 'Enter') { handleSearch(); setShowSuggestions(false); } }}
                className="w-full bg-transparent border-none focus:ring-0 text-gray-900 placeholder:text-gray-400 ml-3 text-base"
              />
              {/* 搜索联想下拉 */}
              <AnimatePresence>
                {showSuggestions && suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden"
                  >
                    {suggestions.map((item, index) => (
                      <button
                        key={`${item.type}-${item.text}-${index}`}
                        onClick={() => {
                          setSearchInput(item.text);
                          setKeyword(item.text);
                          setPage(1);
                          setShowSuggestions(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0"
                      >
                        <Search className="w-4 h-4 text-gray-300 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-gray-900 text-sm">{item.text}</span>
                          {item.company && (
                            <span className="text-gray-400 text-xs ml-2">· {item.company}</span>
                          )}
                        </div>
                        {item.type === 'company' && (
                          <Tag variant="primary" size="sm">企业</Tag>
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="sm:w-48 flex items-center bg-gray-50 rounded-xl px-4 py-3 sm:py-0 border border-transparent focus-within:border-primary-500 focus-within:bg-white transition-colors border-t sm:border-t-0 sm:border-l border-gray-200">
              <MapPin className="text-gray-400 w-5 h-5 shrink-0" />
              <input
                type="text"
                placeholder="工作城市"
                value={locationInput}
                onChange={e => setLocationInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="w-full bg-transparent border-none focus:ring-0 text-gray-900 placeholder:text-gray-400 ml-3 text-base"
              />
            </div>
            <button
              onClick={handleSearch}
              className="bg-primary-600 hover:bg-primary-500 text-white px-8 py-3.5 rounded-xl font-bold transition-colors w-full sm:w-auto shrink-0 shadow-md"
            >
              搜索岗位
            </button>
          </div>

          <div className="max-w-4xl mx-auto mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="text-primary-200">热门搜索：</span>
            {["产品经理", "Java", "数据分析", "运营实习", "校招"].map(tag => (
              <button
                key={tag}
                onClick={() => { setSearchInput(tag); setKeyword(tag); setPage(1); }}
                className="text-white hover:text-primary-300 hover:underline transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 2. 岗位列表与筛选区 */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col lg:flex-row gap-8">
        {/* 左侧筛选 */}
        <div className="w-full lg:w-64 shrink-0 space-y-8">
          <div className="lg:hidden flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <span className="font-bold text-gray-900">
              全部职位 ({total})
            </span>
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center gap-2 text-gray-600 hover:text-primary-600 transition-colors bg-gray-50 px-3 py-1.5 rounded-lg"
            >
              <Filter size={18} /> 筛选
            </button>
          </div>

          <div className={`space-y-8 lg:block ${isFilterOpen ? "block" : "hidden"}`}>
            {/* 招聘类型 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary-600" /> 招聘类型
              </h3>
              <div className="flex flex-wrap gap-2">
                {types.map(type => (
                  <button
                    key={type}
                    onClick={() => handleFilterChange(setActiveType, type)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeType === type
                        ? "bg-primary-50 text-primary-700 border border-primary-200"
                        : "bg-gray-50 text-gray-600 border border-transparent hover:bg-gray-100"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* 工作地点 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary-600" /> 工作地点
              </h3>
              <div className="flex flex-wrap gap-2">
                {locations.map(loc => (
                  <button
                    key={loc}
                    onClick={() => handleFilterChange(setActiveLocation, loc)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeLocation === loc
                        ? "bg-primary-50 text-primary-700 border border-primary-200"
                        : "bg-gray-50 text-gray-600 border border-transparent hover:bg-gray-100"
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>

            {/* 职能分类 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Filter className="w-5 h-5 text-primary-600" /> 职能分类
              </h3>
              <ul className="space-y-2">
                {categories.map(cat => (
                  <li key={cat}>
                    <button
                      onClick={() => handleFilterChange(setActiveCategory, cat)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${
                        activeCategory === cat
                          ? "bg-primary-50 text-primary-700 font-bold"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {cat}
                      {activeCategory === cat && (
                        <ChevronDown className="w-4 h-4 -rotate-90" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* 广告位 */}
            <div className="bg-gradient-to-br from-primary-50 to-blue-50 p-6 rounded-2xl border border-primary-100 relative overflow-hidden">
              <div className="relative z-10">
                <h4 className="font-bold text-primary-900 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary-600" /> 简历诊断服务
                </h4>
                <p className="text-xs text-primary-700 mb-4 leading-relaxed">
                  投递没回音？让资深HR为你1v1修改简历，提升面试邀约率。
                </p>
                <Link
                  to="/mentors"
                  className="inline-block bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm"
                >
                  立即预约
                </Link>
              </div>
              <Sparkles className="absolute -bottom-4 -right-4 w-24 h-24 text-primary-200 opacity-50" />
            </div>
          </div>
        </div>

        {/* 右侧职位列表 */}
        <div className="flex-1 space-y-6">
          <div className="hidden lg:flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              为您找到{" "}
              <span className="text-primary-600">{total}</span>{" "}
              个在招岗位
            </h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
            </div>
          ) : error ? (
            <ErrorState
              message={error}
              onRetry={() => { setError(null); fetchJobs(); }}
            />
          ) : (
          <AnimatePresence mode="popLayout">
            {jobs.length > 0 ? (
              jobs.map((job) => (
                <motion.div
                  key={job.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => navigate(`/jobs/${job.id}`)}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-primary-200 transition-all group cursor-pointer"
                >
                  <div className="flex flex-col sm:flex-row gap-6">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <Link
                          to={`/jobs/${job.id}`}
                          className="text-xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors flex items-center gap-2"
                        >
                          {job.title}
                          {job.urgent ? (
                            <Tag variant="red" size="xs">
                              急招
                            </Tag>
                          ) : null}
                        </Link>
                        <span className="text-xl font-bold text-orange-500 whitespace-nowrap ml-4">
                          {job.salary}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
                        <span className="flex items-center gap-1">
                          <MapPin size={16} className="text-gray-400" />{" "}
                          {job.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Briefcase size={16} className="text-gray-400" />{" "}
                          {job.type}
                        </span>
                        {job.time && (
                          <span className="flex items-center gap-1">
                            <Clock size={16} className="text-gray-400" />{" "}
                            {job.time}发布
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {(Array.isArray(job.tags) ? job.tags : []).map((tag: string, idx: number) => (
                          <Tag
                            key={idx}
                            variant="gray"
                            size="md"
                          >
                            {tag}
                          </Tag>
                        ))}
                      </div>
                    </div>

                    <div className="sm:w-48 shrink-0 flex flex-row sm:flex-col justify-between items-center sm:items-end border-t sm:border-t-0 sm:border-l border-gray-100 pt-4 sm:pt-0 sm:pl-6">
                      <div className="flex items-center gap-3 w-full justify-start sm:justify-end">
                        <div className="text-right hidden sm:block">
                          <div className="font-bold text-gray-900">
                            {job.company_name}
                          </div>
                        </div>
                        {job.logo ? (
                          <img
                            src={job.logo}
                            alt={job.company_name}
                            className="w-12 h-12 rounded-xl object-cover border border-gray-100 shadow-sm"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 font-bold">
                            {(job.company_name || '企')[0]}
                          </div>
                        )}
                        <div className="sm:hidden font-bold text-gray-900">
                          {job.company_name}
                        </div>
                      </div>

                      <Link
                        to={`/jobs/${job.id}`}
                        className="bg-primary-50 text-primary-700 hover:bg-primary-600 hover:text-white px-6 py-2 rounded-lg text-sm font-bold transition-colors w-auto sm:w-full mt-0 sm:mt-4 border border-primary-200 hover:border-transparent text-center"
                      >
                        查看详情
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm"
              >
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                  <Search size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  未找到匹配的职位
                </h3>
                <p className="text-gray-500 mb-6">
                  尝试减少筛选条件或更换搜索关键词
                </p>
                <button
                  onClick={() => {
                    setActiveType("全部");
                    setActiveLocation("全国");
                    setActiveCategory("全部");
                    setKeyword("");
                    setSearchInput("");
                    setPage(1);
                  }}
                  className="bg-primary-50 text-primary-700 px-6 py-2 rounded-lg font-medium hover:bg-primary-100 transition-colors"
                >
                  清除所有筛选条件
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          )}

          {/* 分页 */}
          {!loading && total > 0 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <button
                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                上一页
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pNum: number;
                if (totalPages <= 5) {
                  pNum = i + 1;
                } else if (page <= 3) {
                  pNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pNum = totalPages - 4 + i;
                } else {
                  pNum = page - 2 + i;
                }
                return (
                  <button
                    key={pNum}
                    onClick={() => setPage(pNum)}
                    className={`w-10 h-10 rounded-lg font-medium ${
                      page === pNum
                        ? "bg-primary-600 text-white shadow-sm"
                        : "border border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {pNum}
                  </button>
                );
              })}
              {totalPages > 5 && page < totalPages - 2 && (
                <span className="text-gray-400 mx-2">...</span>
              )}
              <button
                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                下一页
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
