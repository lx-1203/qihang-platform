import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Eye, Clock, ChevronRight, Search, Loader2 } from 'lucide-react';
import http from '@/api/http';
import Tag from '@/components/ui/Tag';

// 文章分类
const CATEGORIES = ['全部', '校招指南', '简历技巧', '面试经验', '政策解读'];

// 分类颜色映射
const categoryColors: Record<string, string> = {
  '校招指南': 'bg-blue-50 text-blue-700 border-blue-200',
  '简历技巧': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  '面试经验': 'bg-purple-50 text-purple-700 border-purple-200',
  '政策解读': 'bg-amber-50 text-amber-700 border-amber-200',
};

interface Article {
  id: number;
  title: string;
  summary: string;
  category: string;
  cover: string;
  author: string;
  view_count: number;
  created_at: string;
}

export default function GuidanceArticles() {
  const [activeCategory, setActiveCategory] = useState('全部');
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const pageSize = 9;

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, pageSize };
      if (activeCategory !== '全部') params.category = activeCategory;
      if (keyword) params.keyword = keyword;

      const res = await http.get('/articles', { params });
      if (res.data?.code === 200) {
        setArticles(res.data.data.articles || []);
        setTotal(res.data.data.total || 0);
      }
    } catch {
      // 静默处理
    } finally {
      setLoading(false);
    }
  }, [page, activeCategory, keyword]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const handleSearch = () => {
    setKeyword(searchInput);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-8 pb-16">
      <div className="container-main">
        {/* 面包屑 */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link to="/guidance" className="hover:text-primary-600 transition-colors">就业指导</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium">文章资讯</span>
        </div>

        {/* 标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3 mb-3">
            <FileText className="w-8 h-8 text-primary-600" />
            就业指导文章
          </h1>
          <p className="text-gray-500">精选行业大咖的求职经验和实用技巧，助你斩获心仪Offer。</p>
        </div>

        {/* 搜索 + 分类筛选 */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-8">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索文章标题或关键词..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
              />
            </div>
            <button
              onClick={handleSearch}
              className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-xl font-medium text-sm transition-colors"
            >
              搜索
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); setPage(1); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeCategory === cat
                    ? 'bg-primary-50 text-primary-700 border border-primary-200'
                    : 'bg-gray-50 text-gray-600 border border-transparent hover:bg-gray-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* 文章列表 */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          </div>
        ) : articles.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
              <FileText size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">暂无文章</h3>
            <p className="text-gray-500">换个分类或关键词试试吧</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article, i) => (
                <motion.div
                  key={article.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: i * 0.05 }}
                >
                  <Link
                    to={`/guidance/articles/${article.id}`}
                    className="block bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg hover:border-primary-200 transition-all group h-full"
                  >
                    {/* 封面 */}
                    {article.cover ? (
                      <div className="h-44 overflow-hidden">
                        <img
                          src={article.cover}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <div className="h-44 bg-gradient-to-br from-primary-100 to-primary-50 flex items-center justify-center">
                        <FileText className="w-12 h-12 text-primary-300" />
                      </div>
                    )}

                    {/* 内容 */}
                    <div className="p-5">
                      {/* 分类标签 */}
                      <Tag
                        variant={
                          article.category === '校招指南' ? 'blue' :
                          article.category === '简历技巧' ? 'green' :
                          article.category === '面试经验' ? 'purple' :
                          article.category === '政策解读' ? 'yellow' : 'gray'
                        }
                        size="sm"
                        className="mb-3"
                      >
                        {article.category}
                      </Tag>

                      <h3 className="text-base font-bold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-2 mb-2">
                        {article.title}
                      </h3>

                      <p className="text-sm text-gray-500 line-clamp-2 mb-4">
                        {article.summary}
                      </p>

                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDate(article.created_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" />
                          {article.view_count}
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}

        {/* 分页 */}
        {!loading && total > pageSize && (
          <div className="flex justify-center items-center gap-2 mt-10">
            <button
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 text-sm"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              上一页
            </button>
            <span className="text-sm text-gray-500 px-4">
              {page} / {totalPages}
            </span>
            <button
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 text-sm"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              下一页
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
