import { useState, useEffect } from 'react';
import { GraduationCap, Globe, Clock, ChevronRight, Award, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useConfigStore } from '@/store/config';
import http from '@/api/http';

// 默认文案配置（从配置中心读取，不含动态数据）
const DEFAULT_POSTGRAD_CONFIG = {
  timelines: [
    { month: '3月-5月', title: '基础复习阶段', desc: '确定目标院校和专业，搜集考研大纲和真题，开始英语和专业课基础轮复习。' },
    { month: '6月-8月', title: '强化提高阶段', desc: '暑期黄金复习期，各科全面展开，参加辅导班或集中刷题，攻克重难点。' },
    { month: '9月-10月', title: '报名与冲刺阶段', desc: '关注招生简章，完成网上报名。政治开始复习，进行全真模拟训练。' },
    { month: '11月-12月', title: '考前押题与心态调整', desc: '背诵核心考点，查漏补缺，调整作息规律，保持良好心态迎接初试。' }
  ],
  heroTitle: '考研 / 保研 / 留学',
  heroDesc: '汇集全网最全的升学资讯、学长学姐真实经验贴、院校专业分析报告，助你顺利迈向人生的下一个台阶。'
};

interface ArticleItem {
  id: number;
  title: string;
  category: string;
}

export default function Postgrad() {
  const postgradConfig = useConfigStore(s => s.getJson('postgrad_page_config', DEFAULT_POSTGRAD_CONFIG));
  const TIMELINES = postgradConfig.timelines || DEFAULT_POSTGRAD_CONFIG.timelines;
  const heroTitle = postgradConfig.heroTitle || DEFAULT_POSTGRAD_CONFIG.heroTitle;
  const heroDesc = postgradConfig.heroDesc || DEFAULT_POSTGRAD_CONFIG.heroDesc;

  // 保研文章
  const [postgradArticles, setPostgradArticles] = useState<ArticleItem[]>([]);
  const [postgradLoading, setPostgradLoading] = useState(true);

  // 留学文章
  const [abroadArticles, setAbroadArticles] = useState<ArticleItem[]>([]);
  const [abroadLoading, setAbroadLoading] = useState(true);

  useEffect(() => {
    http.get('/articles', { params: { category: '保研资讯', pageSize: 5 } })
      .then(res => {
        if (res.data?.code === 200) {
          setPostgradArticles(res.data.data.articles || []);
        }
      })
      .catch(() => {})
      .finally(() => setPostgradLoading(false));

    http.get('/articles', { params: { category: '留学指南', pageSize: 5 } })
      .then(res => {
        if (res.data?.code === 200) {
          setAbroadArticles(res.data.data.articles || []);
        }
      })
      .catch(() => {})
      .finally(() => setAbroadLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pt-8 pb-16">
      <div className="container-main">

        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between bg-white rounded-[24px] p-8 md:p-12 mb-12 shadow-sm border border-gray-100">
          <div className="max-w-xl mb-8 md:mb-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 text-primary-500 text-[14px] font-medium mb-4 border border-primary-100">
              <GraduationCap className="w-4 h-4" /> 升学深造指南
            </div>
            <h1 className="text-[36px] font-bold text-gray-900 mb-4">{heroTitle}</h1>
            <p className="text-[16px] text-gray-600 leading-relaxed mb-6">
              {heroDesc}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/guidance/articles" className="bg-primary-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-700 transition-colors inline-block text-center">
                获取备考资料
              </Link>
              <Link to="/mentors" className="bg-white text-gray-900 border border-gray-200 px-6 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors inline-block text-center">
                咨询上岸学长
              </Link>
            </div>
          </div>
          <div className="hidden md:block w-[320px]">
            <img
              src="https://images.unsplash.com/photo-1523050854058-8df90110c8f1?w=640&q=80&auto=format"
              onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-cover.svg'; }}
              alt="升学深造"
              className="w-full h-auto rounded-2xl object-cover shadow-md rotate-2"
            />
          </div>
        </div>

        {/* Section: Timeline */}
        <div className="mb-16">
          <h2 className="text-[24px] font-bold text-gray-900 mb-8 flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary-500" /> 2025考研全年规划时间轴
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {TIMELINES.map((item, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group hover:border-primary-500 transition-colors">
                <div className="text-[14px] font-bold text-primary-500 mb-2">{item.month}</div>
                <h3 className="text-[18px] font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-[14px] text-gray-500 leading-relaxed">{item.desc}</p>
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-primary-500/10 to-transparent rounded-bl-3xl"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Section: Channels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Baoyan */}
          <div className="bg-gradient-to-br from-primary-50 to-white p-8 rounded-[24px] border border-primary-100 relative">
            <Award className="w-10 h-10 text-primary-500 mb-4" />
            <h3 className="text-[24px] font-bold text-gray-900 mb-2">保研专区 (推免)</h3>
            <p className="text-gray-600 mb-6">夏令营通知、九推捡漏、导师套磁信模板、专业笔面试面经汇总。</p>
            <ul className="space-y-3 mb-8">
              {postgradLoading ? (
                <li className="flex items-center justify-center py-2">
                  <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />
                </li>
              ) : postgradArticles.length === 0 ? (
                <li className="text-[14px] text-gray-400">暂无相关文章</li>
              ) : (
                postgradArticles.map(article => (
                  <li key={article.id}>
                    <Link
                      to={`/guidance/articles/${article.id}`}
                      className="flex items-center text-[14px] text-gray-600 hover:text-primary-600 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4 mr-1" /> {article.title}
                    </Link>
                  </li>
                ))
              )}
            </ul>
            <Link to="/guidance/articles" className="text-primary-600 font-medium text-[15px] flex items-center gap-1 hover:gap-2 transition-all">
              进入保研社区 <ChevronRight className="w-5 h-5" />
            </Link>
          </div>

          {/* Study Abroad */}
          <div className="bg-gradient-to-br from-sky-50 to-white p-8 rounded-[24px] border border-sky-100 relative">
            <Globe className="w-10 h-10 text-sky-500 mb-4" />
            <h3 className="text-[24px] font-bold text-gray-900 mb-2">留学专区</h3>
            <p className="text-gray-600 mb-6">QS前100院校申请要求、雅思/托福备考、文书写作指南、签证办理流程。</p>
            <ul className="space-y-3 mb-8">
              {abroadLoading ? (
                <li className="flex items-center justify-center py-2">
                  <Loader2 className="w-4 h-4 text-sky-500 animate-spin" />
                </li>
              ) : abroadArticles.length === 0 ? (
                <li className="text-[14px] text-gray-400">暂无相关文章</li>
              ) : (
                abroadArticles.map(article => (
                  <li key={article.id}>
                    <Link
                      to={`/guidance/articles/${article.id}`}
                      className="flex items-center text-[14px] text-gray-600 hover:text-sky-600 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4 mr-1" /> {article.title}
                    </Link>
                  </li>
                ))
              )}
            </ul>
            <Link to="/study-abroad" className="text-sky-600 font-medium text-[15px] flex items-center gap-1 hover:gap-2 transition-all">
              进入留学社区 <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
