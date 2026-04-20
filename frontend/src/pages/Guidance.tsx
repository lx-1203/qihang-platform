import { Briefcase, Target, FileText, Users, ChevronRight, CheckCircle2, ArrowRight, Eye, Clock, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import http from '@/api/http';

// 服务卡片配置（前端常量，服务描述无需频繁变动，未来可迁移至后端配置化）
const GUIDANCE_SERVICES_CONFIG = [
  {
    id: 1,
    title: '1v1 简历精修',
    desc: 'BAT大厂资深HR/业务主管亲自操刀，深挖个人亮点，打造高转化率简历。',
    icon: FileText,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    features: ['逐字逐句精修', '匹配目标岗位', '突出核心竞争力', '不限次修改直至满意'],
    link: '/mentors',
  },
  {
    id: 2,
    title: '全真模拟面试',
    desc: '还原大厂真实面试场景，涵盖群面、单面、专业面、HR面，全方位提升面试技巧。',
    icon: Users,
    color: 'text-primary-500',
    bgColor: 'bg-primary-50',
    features: ['真实题库抽取', '现场录像复盘', '深入点评弱项', '面试礼仪指导'],
    link: '/mentors',
  },
  {
    id: 3,
    title: '职业生涯规划',
    desc: '通过专业的测评工具结合导师经验，帮你理清职业发展方向，少走弯路。',
    icon: Target,
    color: 'text-primary-500',
    bgColor: 'bg-primary-50',
    features: ['MBTI/霍兰德测评', '行业前景分析', '个人优劣势挖掘', '制定3-5年发展路径'],
    link: '/courses',
  }
];

interface ArticleItem {
  id: number;
  title: string;
  cover?: string;
  created_at: string;
  view_count: number;
}

export default function Guidance() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(true);

  // 加载最新4篇文章
  useEffect(() => {
    http.get('/articles', { params: { pageSize: 4 } })
      .then(res => {
        if (res.data?.code === 200) {
          setArticles(res.data.data.articles || []);
        }
      })
      .catch(() => {})
      .finally(() => setArticlesLoading(false));
  }, []);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-8 pb-16">
      <div className="container-main">
        
        {/* Header */}
        <div className="mb-12 text-center max-w-2xl mx-auto">
          <h1 className="text-[36px] font-bold text-gray-900 flex items-center justify-center gap-3 mb-4">
            <Briefcase className="w-10 h-10 text-primary-500" />
            就业指导服务
          </h1>
          <p className="text-[16px] text-gray-600 leading-relaxed">
            为您提供从职业规划、简历制作到面试通关的一站式护航服务。<br/>
            让求职不再迷茫，斩获心仪Offer。
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {GUIDANCE_SERVICES_CONFIG.map((service) => {
            const Icon = service.icon;
            return (
              <div key={service.id} className="bg-white rounded-[20px] p-8 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
                <div className={`w-14 h-14 rounded-2xl ${service.bgColor} flex items-center justify-center mb-6`}>
                  <Icon className={`w-7 h-7 ${service.color}`} />
                </div>
                
                <h3 className="text-[22px] font-bold text-gray-900 mb-3">{service.title}</h3>
                <p className="text-[15px] text-gray-500 mb-8 leading-relaxed min-h-[66px]">
                  {service.desc}
                </p>
                
                <ul className="space-y-3 mb-8">
                  {service.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-[14px] text-gray-600">
                      <CheckCircle2 className={`w-5 h-5 ${service.color} shrink-0`} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <button
                  onClick={() => navigate(service.link)}
                  className="w-full py-3.5 rounded-xl border-2 border-primary-500 text-primary-500 font-semibold text-[15px] group-hover:bg-primary-500 group-hover:text-white transition-colors"
                >
                  立即预约
                </button>
              </div>
            );
          })}
        </div>

        {/* 精选就业文章 */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary-600" />
              精选就业文章
            </h2>
            <Link
              to="/guidance/articles"
              className="text-sm text-primary-600 font-medium hover:underline flex items-center gap-1"
            >
              查看更多 <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {articlesLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
            </div>
          ) : articles.length === 0 ? (
            <p className="text-center text-gray-400 py-8">暂无文章</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {articles.map((article) => (
                <Link
                  key={article.id}
                  to={`/guidance/articles/${article.id}`}
                  className="block bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md hover:border-primary-200 transition-all group"
                >
                  {article.cover ? (
                    <div className="h-36 overflow-hidden">
                      <img
                        src={article.cover}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="h-36 bg-gradient-to-br from-primary-100 to-primary-50 flex items-center justify-center">
                      <FileText className="w-10 h-10 text-primary-300" />
                    </div>
                  )}
                  <div className="p-4">
                    <h4 className="text-sm font-bold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-2 mb-2">
                      {article.title}
                    </h4>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(article.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {article.view_count}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Banner */}
        <div className="bg-gray-900 rounded-[24px] overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-transparent"></div>
          <div className="relative z-10 p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-white max-w-xl">
              <h2 className="text-[28px] md:text-[32px] font-bold mb-4">不确定适合什么岗位？</h2>
              <p className="text-[16px] text-gray-300 mb-0">
                完成专业的职业性格测试，只需 15 分钟，获取专属你的职业发展建议报告。
              </p>
            </div>
            <button
              onClick={() => navigate('/courses')}
              className="shrink-0 bg-primary-500 hover:bg-primary-700 text-white px-8 py-4 rounded-full font-bold text-[16px] transition-colors flex items-center gap-2"
            >
              开始免费测试 <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}