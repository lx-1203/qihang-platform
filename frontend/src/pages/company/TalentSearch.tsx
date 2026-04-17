import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Filter, Users, GraduationCap, Briefcase,
  Mail, FileText, ChevronLeft, ChevronRight,
  Loader2, User, X, Building2, BookOpen, Star, Tag, TrendingUp
} from 'lucide-react';
import http from '@/api/http';
import { showToast } from '@/components/ui/ToastContainer';
import TagComponent from '@/components/ui/Tag';
import ErrorState from '@/components/ui/ErrorState';

// 人才数据结构（匹配后端 /api/company/talent 返回）
interface TalentItem {
  id: number;
  user_id: number;
  nickname: string;
  email: string;
  avatar: string;
  school: string;
  major: string;
  grade: string;
  skills: string | string[];
  job_intention: string;
  resume_url: string;
  bio: string;
  /** 自定义标签（企业端本地管理） */
  _tags?: string[];
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// ====== 关键词匹配度评分 ======
function calcMatchScore(talent: TalentItem, kw: string, majorKw: string): number {
  if (!kw && !majorKw) return 0;
  let score = 0;
  const kwLower = kw.toLowerCase();
  const majorLower = majorKw.toLowerCase();

  // 求职意向完全匹配 +40
  if (kwLower && talent.job_intention?.toLowerCase().includes(kwLower)) score += 40;
  // 技能匹配 +10 each (max 30)
  const skills = typeof talent.skills === 'string'
    ? (() => { try { return JSON.parse(talent.skills); } catch { return talent.skills.split(','); } })()
    : (talent.skills || []);
  if (kwLower) {
    const matched = skills.filter((s: string) => s.toLowerCase().includes(kwLower)).length;
    score += Math.min(30, matched * 10);
  }
  // 专业匹配 +20
  if (majorLower && talent.major?.toLowerCase().includes(majorLower)) score += 20;
  // 学校匹配 +10
  if (kwLower && talent.school?.toLowerCase().includes(kwLower)) score += 10;

  return Math.min(100, score);
}

export default function TalentSearch() {
  const [talents, setTalents] = useState<TalentItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, pageSize: 10, total: 0, totalPages: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 搜索条件
  const [keyword, setKeyword] = useState('');
  const [school, setSchool] = useState('');
  const [major, setMajor] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // 标签管理（本地 localStorage 持久化）
  const [talentTags, setTalentTags] = useState<Record<number, string[]>>(() => {
    try {
      return JSON.parse(localStorage.getItem('qihang_talent_tags') || '{}');
    } catch { return {}; }
  });
  const [tagInput, setTagInput] = useState<Record<number, string>>({});

  // 持久化标签
  useEffect(() => {
    localStorage.setItem('qihang_talent_tags', JSON.stringify(talentTags));
  }, [talentTags]);

  const addTag = (talentId: number) => {
    const text = (tagInput[talentId] || '').trim();
    if (!text) return;
    const current = talentTags[talentId] || [];
    if (current.includes(text)) return;
    setTalentTags(prev => ({ ...prev, [talentId]: [...current, text] }));
    setTagInput(prev => ({ ...prev, [talentId]: '' }));
  };

  const removeTag = (talentId: number, tag: string) => {
    setTalentTags(prev => ({
      ...prev,
      [talentId]: (prev[talentId] || []).filter(t => t !== tag),
    }));
  };

  // 计算匹配度
  const talentsWithScore = useMemo(() => {
    return talents.map(t => ({
      ...t,
      _matchScore: calcMatchScore(t, keyword, major),
      _tags: talentTags[t.id] || [],
    }));
  }, [talents, keyword, major, talentTags]);

  useEffect(() => {
    fetchTalents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page]);

  const fetchTalents = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string | number> = {
        page: pagination.page,
        pageSize: pagination.pageSize,
      };
      if (keyword) params.keyword = keyword;
      if (school) params.school = school;
      if (major) params.major = major;

      const res = await http.get('/company/talent', { params });
      if (res.data?.code === 200 && res.data.data) {
        const data = res.data.data;
        setTalents(data.students || []);
        setPagination((prev) => ({
          ...prev,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages,
        }));
      } else {
        setError('获取人才数据失败，服务器返回异常');
      }
    } catch {
      setError('搜索人才失败，请检查网络连接后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchTalents();
  };

  const handleClearFilters = () => {
    setKeyword('');
    setSchool('');
    setMajor('');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // 解析 skills 字段
  const parseSkills = (skills: string | string[]): string[] => {
    if (Array.isArray(skills)) return skills;
    if (typeof skills === 'string') {
      try {
        return JSON.parse(skills);
      } catch {
        return skills.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }
    return [];
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">人才搜索</h1>
          <p className="text-sm text-gray-500 mt-1">搜索平台上的优质学生人才，精准匹配岗位需求</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Users size={16} />
          <span>共 {pagination.total} 位人才</span>
        </div>
      </div>

      {/* 搜索栏 */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索姓名、求职意向..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none text-sm transition-colors"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
              showFilters ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter size={16} />
            筛选条件
          </button>
          <button
            onClick={handleSearch}
            className="px-6 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            搜索
          </button>
        </div>

        {/* 展开筛选条件 */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-3"
          >
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">学校</label>
              <div className="relative">
                <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="输入学校名称"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">专业</label>
              <div className="relative">
                <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="输入专业名称"
                  value={major}
                  onChange={(e) => setMajor(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none text-sm"
                />
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-1 px-4 py-2 text-sm text-gray-500 hover:text-red-500 transition-colors"
              >
                <X size={14} />
                清除筛选
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* 人才列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          <span className="ml-3 text-gray-500">搜索中...</span>
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchTalents} />
      ) : talents.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
          <Users className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            {keyword || school || major ? '没有找到匹配的人才' : '暂无人才信息'}
          </h3>
          <p className="text-sm text-gray-500">
            {keyword || school || major ? '请尝试调整搜索条件' : '当有学生注册并完善资料后将会出现在这里'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {talentsWithScore.map((talent, index) => (
            <motion.div
              key={talent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-primary-200 transition-all"
            >
              <div className="flex flex-col sm:flex-row gap-6">
                {/* 头像 */}
                <div className="flex-shrink-0">
                  {talent.avatar ? (
                    <img src={talent.avatar} alt={talent.nickname} className="w-16 h-16 rounded-full object-cover border-2 border-gray-100" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xl">
                      {talent.nickname?.charAt(0) || <User size={24} />}
                    </div>
                  )}
                  {/* 匹配度评分 */}
                  {talent._matchScore > 0 && (
                    <div className="mt-2 text-center">
                      <TagComponent
                        variant={talent._matchScore >= 60 ? 'green' : talent._matchScore >= 30 ? 'yellow' : 'gray'}
                        size="xs"
                      >
                        <TrendingUp size={10} className="inline mr-0.5" />
                        {talent._matchScore}%
                      </TagComponent>
                    </div>
                  )}
                </div>

                {/* 信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                    <h3 className="text-lg font-bold text-gray-900">{talent.nickname || '未设置昵称'}</h3>
                    {talent.job_intention && (
                      <TagComponent variant="primary" size="md" className="inline-flex items-center gap-1 w-fit">
                        <Briefcase size={12} />
                        {talent.job_intention}
                      </TagComponent>
                    )}
                  </div>

                  {/* 学校专业信息 */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-3">
                    {talent.school && (
                      <span className="flex items-center gap-1">
                        <GraduationCap size={14} className="text-gray-400" />
                        {talent.school}
                      </span>
                    )}
                    {talent.major && (
                      <span className="flex items-center gap-1">
                        <BookOpen size={14} className="text-gray-400" />
                        {talent.major}
                      </span>
                    )}
                    {talent.grade && (
                      <span className="flex items-center gap-1">
                        <Building2 size={14} className="text-gray-400" />
                        {talent.grade}
                      </span>
                    )}
                  </div>

                  {/* 简介 */}
                  {talent.bio && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{talent.bio}</p>
                  )}

                  {/* 技能标签 */}
                  {talent.skills && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {parseSkills(talent.skills).slice(0, 6).map((skill, idx) => (
                        <TagComponent key={idx} variant="gray" size="sm">
                          {skill}
                        </TagComponent>
                      ))}
                    </div>
                  )}

                  {/* 企业自定义标签 */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    {(talent._tags || []).map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">
                        <Tag size={10} />
                        {tag}
                        <button onClick={() => removeTag(talent.id, tag)} className="hover:text-red-500">
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                    <div className="inline-flex items-center gap-1">
                      <input
                        type="text"
                        value={tagInput[talent.id] || ''}
                        onChange={(e) => setTagInput(prev => ({ ...prev, [talent.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && addTag(talent.id)}
                        placeholder="添加标签"
                        className="w-20 px-2 py-0.5 border border-dashed border-gray-300 rounded-full text-xs focus:outline-none focus:border-primary-400"
                      />
                    </div>
                  </div>

                  {/* 联系方式 + 操作 */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      {talent.email && (
                        <span className="flex items-center gap-1">
                          <Mail size={12} />
                          {talent.email}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {talent.resume_url && (
                        <a
                          href={talent.resume_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-100 transition-colors"
                        >
                          <FileText size={12} />
                          查看简历
                        </a>
                      )}
                      <button
                        onClick={() => {
                          const tags = talentTags[talent.id] || [];
                          if (!tags.includes('⭐ 已收藏')) {
                            setTalentTags(prev => ({ ...prev, [talent.id]: [...tags, '⭐ 已收藏'] }));
                            showToast({ type: 'success', title: '已收藏该人才' });
                          } else {
                            showToast({ type: 'info', title: '已在收藏中' });
                          }
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-100 transition-colors"
                      >
                        <Star size={12} />
                        收藏
                      </button>
                      <button
                        onClick={() => showToast({ type: 'info', title: '功能开发中', message: '该功能正在开发中，敬请期待' })}
                        className="flex items-center gap-1 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg text-xs font-medium hover:bg-primary-100 transition-colors"
                      >
                        <Mail size={12} />
                        联系Ta
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}

          {/* 分页 */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                disabled={pagination.page <= 1}
                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-gray-600 px-4">
                第 {pagination.page} / {pagination.totalPages} 页
              </span>
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                disabled={pagination.page >= pagination.totalPages}
                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
