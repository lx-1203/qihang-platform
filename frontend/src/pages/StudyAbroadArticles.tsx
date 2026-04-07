import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, ChevronRight, Search, Clock, Eye, Tag,
  TrendingUp, FileText, MessageCircle, Globe
} from 'lucide-react';
import { motion } from 'framer-motion';

// ====== Mock 数据（后续全部由后台接口提供） ======

const CATEGORIES = ['全部', '申请指南', '就读分享', '语言考试', '文书写作', '签证办理', '奖学金', '夏令营/活动'];

const ARTICLES = [
  { id: 1, title: '2026 Fall 英国G5申请时间线与完整材料清单', category: '申请指南', cover: 'https://images.unsplash.com/photo-1526129318478-62ed807ebdf9?w=400&q=80', excerpt: '详细梳理牛津、剑桥、IC、LSE、UCL五所G5院校的申请开放时间、截止日期、所需材料及注意事项...', views: 3420, date: '2026-03-25', author: '启航留学编辑部', readTime: '8 min' },
  { id: 2, title: '雅思7.0到7.5的备考突破：三个月逆袭经验分享', category: '语言考试', cover: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&q=80', excerpt: '从6.5到7.5，分享听说读写四科的备考策略、资料推荐和考场技巧...', views: 2180, date: '2026-03-22', author: '学员 小王', readTime: '6 min' },
  { id: 3, title: '港三新二 商科跨专业申请全流程分享（双非背景）', category: '就读分享', cover: 'https://images.unsplash.com/photo-1536599018102-9f803c029e12?w=400&q=80', excerpt: '双非本科英语专业，如何成功跨申香港大学商业分析硕士，拿到NUS和NTU的offer...', views: 4560, date: '2026-03-20', author: '学员 小李', readTime: '12 min' },
  { id: 4, title: '留学文书PS/SOP写作万能框架与常见避坑指南', category: '文书写作', cover: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400&q=80', excerpt: '个人陈述怎么写？开头如何吸引招生官？如何体现学术热情和职业规划？附万能段落结构...', views: 5230, date: '2026-03-18', author: '启航留学编辑部', readTime: '10 min' },
  { id: 5, title: '澳洲八大2026年入学最新申请要求汇总', category: '申请指南', cover: 'https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=400&q=80', excerpt: '悉尼大学、墨尔本大学、UNSW、ANU等八大名校最新GPA要求、语言要求及学费变化...', views: 1890, date: '2026-03-15', author: '启航留学编辑部', readTime: '7 min' },
  { id: 6, title: '英国Tier 4学生签证申请全攻略（2026版）', category: '签证办理', cover: 'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?w=400&q=80', excerpt: '从CAS确认到签证递交，TB检测、资金证明、面签准备等全流程详解...', views: 2340, date: '2026-03-12', author: '启航留学编辑部', readTime: '9 min' },
  { id: 7, title: 'CSC国家留学基金委奖学金申请指南', category: '奖学金', cover: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&q=80', excerpt: '国家公派留学如何申请？哪些学校有合作项目？申请时间线和材料准备...', views: 3100, date: '2026-03-10', author: '启航留学编辑部', readTime: '8 min' },
  { id: 8, title: '2026暑期海外名校夏令营项目汇总', category: '夏令营/活动', cover: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&q=80', excerpt: '牛津、剑桥、MIT、Stanford等名校暑期项目开放申请，提升背景的绝佳机会...', views: 1670, date: '2026-03-08', author: '启航留学编辑部', readTime: '6 min' },
];

export default function StudyAbroadArticles() {
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [searchKeyword, setSearchKeyword] = useState('');

  const filtered = ARTICLES.filter((a) => {
    if (selectedCategory !== '全部' && a.category !== selectedCategory) return false;
    if (searchKeyword) {
      const kw = searchKeyword.toLowerCase();
      if (!a.title.toLowerCase().includes(kw) && !a.excerpt.toLowerCase().includes(kw)) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f9fafb] pt-6 pb-16">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">

        {/* 面包屑 */}
        <div className="flex items-center gap-2 text-[13px] text-[#9ca3af] mb-4">
          <Link to="/study-abroad" className="hover:text-[#14b8a6] transition-colors">留学</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-[#4b5563]">资讯</span>
        </div>

        <h1 className="text-[30px] font-bold text-[#111827] flex items-center gap-3 mb-2">
          <BookOpen className="w-8 h-8 text-[#14b8a6]" /> 留学资讯
        </h1>
        <p className="text-[15px] text-[#6b7280] mb-8">申请攻略、就读分享、语言备考、文书写作，一站搞定</p>

        {/* 搜索 + 分类筛选 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-8">
          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9ca3af]" />
            <input type="text" placeholder="搜索文章标题或内容..." value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-[#f9fafb] border border-gray-200 rounded-xl text-[14px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent placeholder-[#9ca3af] transition-all" />
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${selectedCategory === cat ? 'bg-[#14b8a6] text-white' : 'bg-[#f3f4f6] text-[#4b5563] hover:bg-gray-200'}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* 文章列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((article, idx) => (
            <motion.div key={article.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
              <Link to={`/study-abroad/articles/${article.id}`} className="block bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#14b8a6]/30 transition-all overflow-hidden group">
                {/* 封面图 */}
                <div className="h-[180px] overflow-hidden">
                  <img src={article.cover} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                {/* 内容 */}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11px] font-bold text-[#14b8a6] bg-[#f0fdfa] px-2 py-0.5 rounded border border-[#ccfbf1]">{article.category}</span>
                    <span className="text-[11px] text-[#d1d5db]">·</span>
                    <span className="text-[11px] text-[#9ca3af]">{article.readTime}</span>
                  </div>
                  <h3 className="text-[17px] font-bold text-[#111827] mb-2 line-clamp-2 group-hover:text-[#14b8a6] transition-colors leading-snug">{article.title}</h3>
                  <p className="text-[13px] text-[#6b7280] line-clamp-2 leading-relaxed mb-3">{article.excerpt}</p>
                  <div className="flex items-center justify-between text-[12px] text-[#9ca3af]">
                    <span>{article.author}</span>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{article.views}</span>
                      <span>{article.date}</span>
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
            <h3 className="text-[18px] font-bold text-[#6b7280] mb-2">没有找到相关文章</h3>
            <p className="text-[14px] text-[#9ca3af]">尝试调整分类或搜索关键词</p>
          </div>
        )}
      </div>
    </div>
  );
}
