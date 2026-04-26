import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, Briefcase, MapPin, TrendingUp, Clock, Eye, Send,
  Filter, Search, Loader2, Rocket, Target, Zap
} from 'lucide-react';
import Tag from '@/components/ui/Tag';
import http from '@/api/http';

interface Position {
  role: string;
  skills: string[];
  equity: string;
  desc: string;
}

interface PartnerPost {
  id: number;
  user_id: number;
  username: string;
  avatar_url: string;
  title: string;
  project_name: string;
  project_desc: string;
  stage: 'idea' | 'mvp' | 'early' | 'growth';
  industry: string;
  location: string;
  positions: Position[];
  equity_range: string;
  highlights: string[];
  team_size: number;
  funding_status: string;
  view_count: number;
  apply_count: number;
  application_count: number;
  created_at: string;
}

const STAGE_MAP = {
  idea: { label: '创意期', color: 'gray' },
  mvp: { label: '产品期', color: 'blue' },
  early: { label: '初创期', color: 'primary' },
  growth: { label: '成长期', color: 'green' },
};

const INDUSTRIES = ['全部', '互联网', '在线教育', '企业服务', '电商', '金融科技', '区块链', '人工智能', '医疗健康', '其他'];

export default function Partners() {
  const [posts, setPosts] = useState<PartnerPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);

  const [keyword, setKeyword] = useState('');
  const [industry, setIndustry] = useState('全部');
  const [stage, setStage] = useState('');

  useEffect(() => {
    fetchPosts();
  }, [page, industry, stage]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const params: any = { page, pageSize };
      if (industry !== '全部') params.industry = industry;
      if (stage) params.stage = stage;
      if (keyword) params.keyword = keyword;

      const res = await http.get('/partners', { params });
      setPosts(res.data?.data?.list || []);
      setTotal(res.data?.data?.total || 0);
    } catch (err) {
      console.error('获取招募列表失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchPosts();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary-500 via-primary-600 to-blue-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-sm font-medium mb-6">
              <Rocket className="w-4 h-4" /> 寻找志同道合的创业伙伴
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">合伙人招募大厅</h1>
            <p className="text-lg text-white/90 mb-8">连接创业者与合伙人，共同打造下一个伟大产品</p>

            {/* 搜索栏 */}
            <div className="max-w-2xl mx-auto">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="搜索项目名称、职位、技能..."
                    className="w-full pl-12 pr-4 py-4 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-white/50"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  className="px-8 py-4 bg-white text-primary-600 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                >
                  搜索
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 筛选栏 */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">筛选：</span>
            </div>

            {/* 行业筛选 */}
            <div className="flex flex-wrap gap-2">
              {INDUSTRIES.map((ind) => (
                <button
                  key={ind}
                  onClick={() => { setIndustry(ind); setPage(1); }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    industry === ind
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {ind}
                </button>
              ))}
            </div>

            {/* 阶段筛选 */}
            <select
              value={stage}
              onChange={(e) => { setStage(e.target.value); setPage(1); }}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">全部阶段</option>
              <option value="idea">创意期</option>
              <option value="mvp">产品期</option>
              <option value="early">初创期</option>
              <option value="growth">成长期</option>
            </select>
          </div>
        </div>

        {/* 统计 */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-600">
            找到 <span className="font-bold text-primary-600">{total}</span> 个招募项目
          </p>
          <Link
            to="/entrepreneurship"
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            返回创业专区 →
          </Link>
        </div>

        {/* 列表 */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400">暂无招募项目</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {posts.map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-primary-200 transition-all"
              >
                {/* 头部 */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={post.avatar_url || '/default-avatar.png'}
                      alt={post.username}
                      className="w-12 h-12 rounded-full"
                    />
                    <div>
                      <h3 className="font-bold text-gray-900">{post.project_name}</h3>
                      <p className="text-sm text-gray-500">{post.username}</p>
                    </div>
                  </div>
                  <Tag variant={STAGE_MAP[post.stage].color as any} size="sm">
                    {STAGE_MAP[post.stage].label}
                  </Tag>
                </div>

                {/* 标题 */}
                <h4 className="text-lg font-bold text-gray-900 mb-2">{post.title}</h4>

                {/* 描述 */}
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{post.project_desc}</p>

                {/* 标签 */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <Tag variant="gray" size="xs">
                    <Briefcase className="w-3 h-3" /> {post.industry}
                  </Tag>
                  {post.location && (
                    <Tag variant="gray" size="xs">
                      <MapPin className="w-3 h-3" /> {post.location}
                    </Tag>
                  )}
                  {post.funding_status && (
                    <Tag variant="blue" size="xs">
                      <TrendingUp className="w-3 h-3" /> {post.funding_status}
                    </Tag>
                  )}
                </div>

                {/* 招募职位 */}
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">招募职位：</p>
                  <div className="flex flex-wrap gap-2">
                    {post.positions.slice(0, 2).map((pos, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-primary-50 text-primary-700 rounded-lg text-xs font-medium"
                      >
                        {pos.role} ({pos.equity})
                      </span>
                    ))}
                    {post.positions.length > 2 && (
                      <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs">
                        +{post.positions.length - 2}
                      </span>
                    )}
                  </div>
                </div>

                {/* 底部 */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" /> {post.view_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <Send className="w-3.5 h-3.5" /> {post.application_count || 0} 申请
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {new Date(post.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <Link
                    to={`/partners/${post.id}`}
                    className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
                  >
                    查看详情
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* 分页 */}
        {!loading && total > pageSize && (
          <div className="flex justify-center gap-2 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              上一页
            </button>
            <span className="px-4 py-2 text-gray-600">
              {page} / {Math.ceil(total / pageSize)}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(Math.ceil(total / pageSize), p + 1))}
              disabled={page >= Math.ceil(total / pageSize)}
              className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              下一页
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
