import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, ChevronRight, Search, Clock, Eye,
  TrendingUp, FileText, MessageCircle, Sparkles,
  ThumbsUp, Star
} from 'lucide-react';
import TagComponent from '@/components/ui/Tag';
import { motion } from 'framer-motion';
import { useConfigStore } from '@/store/config';

// 默认配置（当后端不可用时使用）
const DEFAULT_STUDY_ABROAD_ARTICLES_CONFIG = {
  _meta: { version: "1.0", lastUpdated: "2026-04-14", description: "留学资讯文章数据" },
  featured: {
    id: 100,
    title: "2026 Fall 留学申请全攻略：从选校到拿Offer，一文搞定",
    category: "申请指南",
    cover: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&q=80",
    excerpt: "从确定留学目标到最终拿到Offer，这篇万字长文涵盖了选校策略、材料准备、文书写作、面试技巧、签证办理的完整流程。无论你是大一刚开始规划，还是大三即将申请，都能从中找到适合自己阶段的行动指南。",
    views: 15600, likes: 892, date: "2026-04-01",
    author: "启航留学研究院", readTime: "25 min", tags: ["精华", "必读"]
  },
  articles: [
    { id: 1, title: "2026 Fall 英国G5申请时间线与完整材料清单", category: "申请指南", cover: "https://images.unsplash.com/photo-1526129318478-62ed807ebdf9?w=400&q=80", excerpt: "详细梳理牛津、剑桥、IC、LSE、UCL五所G5院校的申请开放时间、截止日期、所需材料及注意事项，助你提前规划，从容应对。", views: 8420, likes: 456, date: "2026-03-25", author: "启航留学编辑部", readTime: "8 min", tags: ["英国", "G5"] },
    { id: 2, title: "雅思7.0到7.5的备考突破：三个月逆袭经验分享", category: "语言考试", cover: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&q=80", excerpt: "从6.5到7.5，分享听说读写四科的备考策略、高效刷题方法、核心资料推荐和考场实战技巧。三个月逆袭不是梦！", views: 6180, likes: 378, date: "2026-03-22", author: "学员 小王 · 雅思7.5", readTime: "6 min", tags: ["雅思", "经验"] },
    { id: 3, title: "港三新二 商科跨专业申请全流程分享（双非背景）", category: "就读分享", cover: "https://images.unsplash.com/photo-1536599018102-9f803c029e12?w=400&q=80", excerpt: "双非本科英语专业，如何成功跨申香港大学商业分析硕士？从GMAT备考、实习规划到文书策略，分享拿到HKU、NUS、NTU三枚Offer的完整经历。", views: 12560, likes: 723, date: "2026-03-20", author: "学员 小李 · HKU BA", readTime: "12 min", tags: ["双非", "跨专业", "港三"] },
    { id: 4, title: "留学文书PS/SOP写作万能框架与常见避坑指南", category: "文书写作", cover: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400&q=80", excerpt: "个人陈述怎么写？开头如何吸引招生官？如何展示学术热情和职业规划？附G5/港三/新国立通用的万能段落结构模板和真实案例解析。", views: 15230, likes: 891, date: "2026-03-18", author: "文书导师 Sarah · 前Oxford招生官", readTime: "10 min", tags: ["文书", "PS", "模板"] },
    { id: 5, title: "澳洲八大2026年入学最新申请要求汇总", category: "院校解析", cover: "https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=400&q=80", excerpt: "悉尼大学、墨尔本大学、UNSW、ANU等八大名校2026年最新GPA要求、语言要求、专业变化及学费调整一站汇总。", views: 4890, likes: 267, date: "2026-03-15", author: "启航留学编辑部", readTime: "7 min", tags: ["澳洲", "八大"] },
    { id: 6, title: "英国Tier 4学生签证申请全攻略（2026最新版）", category: "签证办理", cover: "https://images.unsplash.com/photo-1569154941061-e23b9475ef1?w=400&q=80", excerpt: "从拿到CAS到签证递交，TB检测预约、资金证明准备、签证中心选择、面签模拟等全流程详解，附签证材料清单下载。", views: 7340, likes: 412, date: "2026-03-12", author: "签证顾问 Jenny · 10年经验", readTime: "9 min", tags: ["签证", "英国"] },
    { id: 7, title: "CSC国家留学基金委奖学金申请指南与成功案例", category: "奖学金", cover: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&q=80", excerpt: "国家公派留学如何申请？哪些学校有CSC合作项目？申请时间线、材料准备、面试技巧和3位成功获奖学员的经验分享。", views: 9100, likes: 534, date: "2026-03-10", author: "启航留学研究院", readTime: "8 min", tags: ["CSC", "奖学金", "公派"] },
    { id: 8, title: "2026暑期海外名校夏令营项目汇总与申请建议", category: "夏令营/活动", cover: "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=400&q=80", excerpt: "牛津、剑桥、MIT、Stanford、UCLA等名校2026暑期项目开放申请！费用、时长、申请条件全汇总，提升背景的绝佳机会。", views: 5670, likes: 321, date: "2026-03-08", author: "启航留学编辑部", readTime: "6 min", tags: ["夏校", "暑期项目"] },
    { id: 9, title: "托福100+备考经验：阅读听力满分，口语突破24", category: "语言考试", cover: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&q=80", excerpt: "从首考85到二刷108，分享TPO高效刷题法、阅读速读技巧、听力笔记方法、口语模板和写作高分句型。", views: 7890, likes: 445, date: "2026-03-05", author: "学员 小张 · 托福108", readTime: "8 min", tags: ["托福", "高分"] },
    { id: 10, title: "GRE 325+备考攻略：verbal提分秘诀与数学满分技巧", category: "语言考试", cover: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&q=80", excerpt: "两个月从310到328！分享GRE verbal核心词汇记忆法、阅读理解策略、填空秒杀技巧和写作模板。", views: 5340, likes: 298, date: "2026-03-02", author: "学员 小赵 · GRE 328", readTime: "7 min", tags: ["GRE", "高分"] },
    { id: 11, title: "帝国理工 vs UCL vs 爱丁堡：CS硕士三校横评", category: "院校解析", cover: "https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?w=400&q=80", excerpt: "从课程设置、录取难度、就业前景、生活成本四个维度全面对比英国三所顶尖CS硕士项目，帮你做出最优选择。", views: 11200, likes: 678, date: "2026-02-28", author: "启航留学研究院", readTime: "15 min", tags: ["CS", "选校", "对比"] },
    { id: 12, title: "美国F1签证面签全攻略：高频问题与回答模板", category: "签证办理", cover: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=400&q=80", excerpt: "整理50+个F1签证高频面签问题，附中英文回答模板。涵盖学习计划、资金证明、回国计划等敏感问题的回答策略。", views: 6780, likes: 389, date: "2026-02-25", author: "签证顾问 David · 美签专家", readTime: "10 min", tags: ["F1签证", "美国", "面签"] }
  ],
  hotTopics: [
    { label: "2026 Fall时间线", count: 156 },
    { label: "G5申请", count: 128 },
    { label: "雅思7.0+", count: 112 },
    { label: "跨专业申请", count: 98 },
    { label: "PS文书写作", count: 87 },
    { label: "港三新二", count: 76 },
    { label: "双非逆袭", count: 65 },
    { label: "CSC奖学金", count: 54 }
  ]
};

export default function StudyAbroadArticles() {
  const studyAbroadConfig = useConfigStore(s => s.getJson('study_abroad_articles_config', DEFAULT_STUDY_ABROAD_ARTICLES_CONFIG));
  const FEATURED_ARTICLE = studyAbroadConfig.featured || DEFAULT_STUDY_ABROAD_ARTICLES_CONFIG.featured;
  const ARTICLES = studyAbroadConfig.articles || DEFAULT_STUDY_ABROAD_ARTICLES_CONFIG.articles;
  const HOT_TOPICS = studyAbroadConfig.hotTopics || DEFAULT_STUDY_ABROAD_ARTICLES_CONFIG.hotTopics;
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [sortBy, setSortBy] = useState<'latest' | 'popular'>('latest');

  // 动态生成分类列表
  const CATEGORIES = ['全部', ...Array.from(new Set(ARTICLES.map((a: { category: string }) => a.category)))];

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
