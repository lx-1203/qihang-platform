import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, ChevronRight, Search, Clock, Eye,
  TrendingUp, FileText, MessageCircle, Sparkles,
  ThumbsUp, Star
} from 'lucide-react';
import TagComponent from '@/components/ui/Tag';
import { motion } from 'framer-motion';

// ====== 数据导入（从 JSON 读取，管理员可通过配置页修改） ======
import articlesData from '../data/study-abroad-articles.json';

const FEATURED_ARTICLE = articlesData.featured;
const ARTICLES = articlesData.articles;
const HOT_TOPICS = articlesData.hotTopics;
const CATEGORIES = ['全部', ...Array.from(new Set(ARTICLES.map((a: { category: string }) => a.category)))];

export default function StudyAbroadArticles() {
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [sortBy, setSortBy] = useState<'latest' | 'popular'>('latest');

  const filtered = ARTICLES.filter((a) => {
    if (selectedCategory !== '全部' && a.category !== selectedCategory) return false;
    if (searchKeyword) {
      const kw = searchKeyword.toLowerCase();
      if (!a.title.toLowerCase().includes(kw) && !a.excerpt.toLowerCase().includes(kw) && !a.tags.some(t => t.toLowerCase().includes(kw))) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'popular') return b.views - a.views;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return (
    <div className="min-h-screen bg-gray-50 pt-6 pb-16">
      <div className="container-main">

        {/* 面包屑 */}
        <div className="flex items-center gap-2 text-[13px] text-gray-400 mb-4">
          <Link to="/study-abroad" className="hover:text-primary-500 transition-colors">留学</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-gray-600">资讯</span>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="text-[30px] font-bold text-gray-900 flex items-center gap-3 mb-2">
              <BookOpen className="w-8 h-8 text-primary-500" /> 留学资讯
            </h1>
            <p className="text-[15px] text-gray-500">申请攻略、就读体验、语言备考、文书写作，<span className="font-bold text-gray-900">{ARTICLES.length}+</span> 篇精选文章</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="text-[13px] text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer">
              <option value="latest">最新发布</option>
              <option value="popular">最多阅读</option>
            </select>
          </div>
        </div>

        {/* 置顶精选文章 */}
        <Link to={`/study-abroad/articles/${FEATURED_ARTICLE.id}`} className="block mb-8 group">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all overflow-hidden">
            <div className="flex flex-col md:flex-row">
              <div className="md:w-[480px] h-[240px] md:h-auto overflow-hidden shrink-0">
                <img src={FEATURED_ARTICLE.cover} alt={FEATURED_ARTICLE.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              </div>
              <div className="p-6 md:p-8 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-3">
                  <TagComponent variant="red" size="xs" className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> 编辑精选
                  </TagComponent>
                  <TagComponent variant="primary" size="xs" className="font-bold">{FEATURED_ARTICLE.category}</TagComponent>
                  {FEATURED_ARTICLE.tags.map(tag => (
                    <TagComponent key={tag} variant="gray" size="xs">{tag}</TagComponent>
                  ))}
                </div>
                <h2 className="text-[22px] md:text-[26px] font-bold text-gray-900 mb-3 group-hover:text-primary-500 transition-colors leading-tight">{FEATURED_ARTICLE.title}</h2>
                <p className="text-[14px] text-gray-500 line-clamp-3 leading-relaxed mb-4">{FEATURED_ARTICLE.excerpt}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[13px] text-gray-400">
                    <span className="font-medium text-gray-600">{FEATURED_ARTICLE.author}</span>
                    <span>{FEATURED_ARTICLE.date}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{FEATURED_ARTICLE.readTime}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[13px] text-gray-400">
                    <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{(FEATURED_ARTICLE.views / 1000).toFixed(1)}k</span>
                    <span className="flex items-center gap-1"><ThumbsUp className="w-3.5 h-3.5" />{FEATURED_ARTICLE.likes}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* 搜索 + 分类筛选 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-8">
          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="搜索文章标题、内容或标签..." value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-gray-400 transition-all" />
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${selectedCategory === cat ? 'bg-primary-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* 文章列表 - 主区域 */}
          <div className="flex-grow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[14px] text-gray-500">共 <span className="font-bold text-gray-900">{filtered.length}</span> 篇文章</span>
            </div>

            <div className="space-y-5">
              {filtered.map((article, idx) => (
                <motion.div key={article.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}>
                  <Link to={`/study-abroad/articles/${article.id}`} className="block bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-primary-500/30 transition-all overflow-hidden group">
                    <div className="flex flex-col sm:flex-row">
                      {/* 封面图 */}
                      <div className="sm:w-[240px] h-[160px] sm:h-auto overflow-hidden shrink-0">
                        <img src={article.cover} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                      {/* 内容 */}
                      <div className="p-5 flex flex-col justify-between flex-grow">
                        <div>
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <TagComponent variant="primary" size="xs" className="font-bold">{article.category}</TagComponent>
                            {article.tags.map(tag => (
                              <TagComponent key={tag} variant="gray" size="xs">{tag}</TagComponent>
                            ))}
                          </div>
                          <h3 className="text-[17px] font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary-500 transition-colors leading-snug">{article.title}</h3>
                          <p className="text-[13px] text-gray-500 line-clamp-2 leading-relaxed">{article.excerpt}</p>
                        </div>
                        <div className="flex items-center justify-between mt-3 text-[12px] text-gray-400">
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-gray-600">{article.author}</span>
                            <span>{article.date}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{article.readTime}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{article.views > 1000 ? `${(article.views / 1000).toFixed(1)}k` : article.views}</span>
                            <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{article.likes}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-20">
                <BookOpen className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                <h3 className="text-[18px] font-bold text-gray-500 mb-2">没有找到相关文章</h3>
                <p className="text-[14px] text-gray-400 mb-4">尝试调整分类或搜索关键词</p>
                <button onClick={() => { setSelectedCategory('全部'); setSearchKeyword(''); }} className="text-[14px] text-primary-500 font-medium hover:underline">清除筛选</button>
              </div>
            )}

            {/* 分页 */}
            {filtered.length > 0 && (
              <div className="flex justify-center mt-10">
                <div className="flex items-center gap-2">
                  {[1, 2, 3].map((page) => (
                    <button key={page} className={`w-10 h-10 rounded-xl text-[14px] font-medium transition-colors ${page === 1 ? 'bg-primary-500 text-white shadow-sm' : 'bg-white text-gray-500 border border-gray-200 hover:border-primary-500 hover:text-primary-500'}`}>
                      {page}
                    </button>
                  ))}
                  <span className="text-gray-400 px-2">...</span>
                  <button className="w-10 h-10 rounded-xl bg-white text-gray-500 border border-gray-200 hover:border-primary-500 hover:text-primary-500 text-[14px] font-medium transition-colors">6</button>
                </div>
              </div>
            )}
          </div>

          {/* 侧边栏 */}
          <div className="lg:w-[300px] shrink-0 space-y-6">
            {/* 热门话题 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-[16px] font-bold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary-500" /> 热门话题
              </h3>
              <div className="flex flex-wrap gap-2">
                {HOT_TOPICS.map((topic, idx) => (
                  <button key={idx} className="bg-gray-100 hover:bg-primary-50 hover:text-primary-500 text-gray-600 text-[12px] font-medium px-3 py-1.5 rounded-lg transition-colors">
                    {topic.label}
                    <span className="text-gray-400 ml-1">({topic.count})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 热门文章排行 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-[16px] font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-400" /> 阅读排行
              </h3>
              <div className="space-y-3">
                {[...ARTICLES].sort((a, b) => b.views - a.views).slice(0, 5).map((article, idx) => (
                  <Link key={article.id} to={`/study-abroad/articles/${article.id}`} className="flex items-start gap-3 group">
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[12px] font-bold shrink-0 ${
                      idx < 3 ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>{idx + 1}</span>
                    <div className="flex-grow min-w-0">
                      <h4 className="text-[13px] font-medium text-gray-700 line-clamp-2 group-hover:text-primary-500 transition-colors leading-snug">{article.title}</h4>
                      <span className="text-[11px] text-gray-400 flex items-center gap-1 mt-1"><Eye className="w-3 h-3" />{article.views > 1000 ? `${(article.views / 1000).toFixed(1)}k` : article.views}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* 投稿 CTA */}
            <div className="bg-gradient-to-br from-primary-50 to-white rounded-2xl border border-primary-100 p-5 text-center">
              <FileText className="w-8 h-8 text-primary-500 mx-auto mb-3" />
              <h3 className="text-[15px] font-bold text-gray-900 mb-2">分享你的经历</h3>
              <p className="text-[12px] text-gray-500 mb-4">写下你的留学申请经验，帮助更多同学</p>
              <button className="w-full bg-primary-500 text-white py-2.5 rounded-xl text-[13px] font-bold hover:bg-primary-700 transition-colors">
                我要投稿
              </button>
            </div>

            {/* 咨询卡片 */}
            <div className="bg-gray-900 rounded-2xl p-5 text-center">
              <MessageCircle className="w-8 h-8 text-primary-500 mx-auto mb-3" />
              <h3 className="text-[15px] font-bold text-white mb-2">有疑问？</h3>
              <p className="text-[12px] text-gray-400 mb-4">资深留学顾问在线答疑</p>
              <button className="w-full bg-primary-500 text-white py-2.5 rounded-xl text-[13px] font-bold hover:bg-primary-700 transition-colors">
                免费咨询
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
