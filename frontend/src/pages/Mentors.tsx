import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search, Star, MapPin, Clock, Filter,
  ChevronDown, Users, Award, MessageCircle, RefreshCw
} from 'lucide-react';
import http from '@/api/http';
import { CardSkeleton } from '../components/ui/Skeleton';
import ErrorState from '../components/ui/ErrorState';
import Tag from '@/components/ui/Tag';

// ====== 导师列表页 ======

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

  const expertiseOptions = ['全部', '简历优化', '面试辅导', '前端开发', '快消行业', '金融行业', 'Case Interview', '留学申请', '职业规划'];

  const mockMentors: MentorItem[] = [
    { id: 1, user_id: 10, name: '陈经理', title: '某头部互联网大厂HRD', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400', bio: '10年以上人力资源管理经验，曾就职于多家互联网大厂，对校招流程和面试评估有深入理解。', expertise: ['简历优化', '面试辅导', 'HR视角', '职业规划'], tags: ['简历精修', '模拟面试'], rating: 4.9, rating_count: 128, price: 299, status: 1 },
    { id: 2, user_id: 11, name: '张工', title: '高级前端架构师', avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400', bio: '8年前端开发经验，参与过多个大型前端项目的架构设计，对前端技术栈和行业趋势有深刻洞察。', expertise: ['前端开发', '技术面试', '系统设计', '职业发展'], tags: ['技术面', '职业规划'], rating: 4.8, rating_count: 95, price: 399, status: 1 },
    { id: 3, user_id: 12, name: '王总监', title: '知名快消品牌市场总监', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=400', bio: '12年快消行业从业经验，从管培生成长为品牌总监，深谙快消行业的招聘标准和职业发展路径。', expertise: ['快消行业', '群面技巧', '品牌营销', '管培生面试'], tags: ['群面技巧', '营销方向'], rating: 5.0, rating_count: 67, price: 349, status: 1 },
    { id: 4, user_id: 13, name: '李行长', title: '国有大行资深面试官', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=400', bio: '15年银行从业经验，长期参与校园招聘面试，熟悉银行业务条线和晋升体系。', expertise: ['金融行业', '银行面试', '结构化面试', '行业分析'], tags: ['金融求职', '结构化面试'], rating: 4.9, rating_count: 83, price: 359, status: 1 },
    { id: 5, user_id: 14, name: '赵博士', title: '常青藤海归 / 咨询顾问', avatar: 'https://images.unsplash.com/photo-1598550874175-4d0ef436c909?auto=format&fit=crop&q=80&w=400', bio: '常青藤MBA毕业，曾就职于MBB咨询公司，对Case Interview和海外求职有丰富的指导经验。', expertise: ['咨询行业', 'Case Interview', '留学申请', '海外求职'], tags: ['Case Interview', '留学求职'], rating: 4.8, rating_count: 54, price: 499, status: 1 },
    { id: 6, user_id: 15, name: '孙老师', title: '资深考研辅导名师', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400', bio: '10年考研辅导经验，帮助超过3000名学生成功上岸，擅长数学、政治等科目的高效备考策略。', expertise: ['考研辅导', '备考规划', '择校建议', '复试面试'], tags: ['考研上岸', '数学满分'], rating: 4.9, rating_count: 210, price: 199, status: 1 },
  ];

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
        setError('获取导师数据失败，服务器返回异常');
      }
    } catch {
      setError('网络请求失败，请检查网络连接后重试');
    } finally {
      setLoading(false);
    }
  }

  const filtered = mentors.filter(m => {
    if (search && !m.name.includes(search) && !m.title.includes(search) && !m.bio.includes(search)) return false;
    if (expertiseFilter !== '全部' && !(m.expertise || []).includes(expertiseFilter)) return false;
    return true;
  });

  return (
    <div className="container-main py-8">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <h1 className="text-3xl font-bold text-gray-900">
          职业导师团队
        </h1>
        <p className="text-gray-500 mt-2 text-lg">
          来自各行各业的资深导师，一对一为你规划职业发展路径
        </p>
      </motion.div>

      {/* 搜索和筛选 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="搜索导师姓名、领域、关键词..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {expertiseOptions.map(opt => (
            <button
              key={opt}
              onClick={() => setExpertiseFilter(opt)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                expertiseFilter === opt
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
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
        <span className="flex items-center gap-1"><Users className="w-4 h-4" /> 共 {filtered.length} 位导师</span>
        <span className="flex items-center gap-1"><Award className="w-4 h-4" /> 平均评分 {(filtered.reduce((a, b) => a + b.rating, 0) / (filtered.length || 1)).toFixed(1)}</span>
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
          onLoadMockData={() => { setMentors(mockMentors); setError(null); }}
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
              className="block bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg hover:border-primary-200 transition-all group"
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
                  <span className="text-xl font-bold text-primary-600">{mentor.price}</span>
                  <span className="text-gray-500 text-xs">元/次</span>
                </div>
                <span className="flex items-center gap-1 text-sm text-primary-600 font-medium group-hover:translate-x-1 transition-transform">
                  <MessageCircle className="w-4 h-4" />
                  预约咨询
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
      )}

      {/* 空状态 */}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">未找到匹配的导师</h3>
          <p className="text-gray-500 mb-6">试试调整筛选条件或更换搜索关键词</p>
          <button
            onClick={() => { setSearch(''); setExpertiseFilter('全部'); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            清除所有筛选
          </button>
        </div>
      )}
    </div>
  );
}
