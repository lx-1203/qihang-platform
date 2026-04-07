import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, MapPin, Clock, ChevronRight,
  GraduationCap, Star, Globe, X, SlidersHorizontal,
  ArrowUpDown, Heart, Building2, Award, Users,
  TrendingUp, Sparkles, BookOpen, DollarSign, Filter, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ====== Mock 数据（后续全部由后台接口提供，禁止前端写死） ======

const COUNTRIES = [
  { id: 'all', name: '全部地区', flag: '🌍' },
  { id: 'uk', name: '英国', flag: '🇬🇧', count: 156 },
  { id: 'us', name: '美国', flag: '🇺🇸', count: 203 },
  { id: 'hk', name: '中国香港', flag: '🇭🇰', count: 89 },
  { id: 'sg', name: '新加坡', flag: '🇸🇬', count: 42 },
  { id: 'au', name: '澳大利亚', flag: '🇦🇺', count: 78 },
  { id: 'ca', name: '加拿大', flag: '🇨🇦', count: 65 },
  { id: 'eu', name: '欧洲', flag: '🇪🇺', count: 47 },
  { id: 'jp', name: '日本', flag: '🇯🇵', count: 38 },
];

const MAJORS = ['全部专业', '计算机科学', '商业分析', '金融学', '电子工程', '数据科学', '人工智能', '传媒', '教育学', '机械工程', '法学', '建筑学', '公共卫生', '统计学'];

const RANKINGS = ['不限排名', 'QS Top 10', 'QS Top 30', 'QS Top 50', 'QS Top 100', 'QS Top 200'];

const DEGREE_TYPES = ['全部学位', '硕士 (MSc/MA)', '博士 (PhD)', 'MBA'];

const PROGRAMS = [
  {
    id: 1, school: '帝国理工学院', schoolEn: 'Imperial College London', program: '计算机科学 MSc',
    country: 'uk', countryName: '英国', ranking: 2, deadline: '2026-01-15', tuition: '£38,900/年',
    duration: '1年', language: 'IELTS 7.0 (6.5)', gpa: '均分85+ / GPA 3.5',
    logo: 'https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?w=80&q=80',
    tags: ['STEM', '热门', 'QS Top 10'], major: '计算机科学', offers: 156,
    admitRate: 12, avgGpa: '3.72', description: '帝国理工CS硕士项目，全英排名第一，涵盖AI、机器学习、软件工程等方向，毕业生遍布Google、Meta、Amazon等顶尖科技公司。',
    features: ['毕业起薪£55k+', '与工业界深度合作', 'PSW签证2年'],
  },
  {
    id: 2, school: '斯坦福大学', schoolEn: 'Stanford University', program: '计算机科学 MSCS',
    country: 'us', countryName: '美国', ranking: 3, deadline: '2025-12-01', tuition: '$62,373/年',
    duration: '1.5-2年', language: 'TOEFL 100+', gpa: '均分90+ / GPA 3.7',
    logo: 'https://images.unsplash.com/photo-1564981797816-1043664bf78d?w=80&q=80',
    tags: ['STEM', '常春藤级', 'AI强校'], major: '计算机科学', offers: 28,
    admitRate: 5, avgGpa: '3.89', description: '斯坦福CS硕士项目是全球最负盛名的计算机科学研究生项目之一，位于硅谷核心地带，创业氛围浓厚。',
    features: ['硅谷核心地带', '创业生态世界第一', 'OPT 3年'],
  },
  {
    id: 3, school: '新加坡国立大学', schoolEn: 'National University of Singapore', program: '商业分析 MSc',
    country: 'sg', countryName: '新加坡', ranking: 8, deadline: '2026-01-31', tuition: 'S$58,000/年',
    duration: '1.5年', language: 'TOEFL 100 / IELTS 7.0', gpa: '均分80+ / GPA 3.3',
    logo: 'https://images.unsplash.com/photo-1562774053-701939374585?w=80&q=80',
    tags: ['商科', '就业率高', '亚洲第一'], major: '商业分析', offers: 234,
    admitRate: 18, avgGpa: '3.56', description: 'NUS商业分析项目全球排名第三，与McKinsey、BCG等顶级咨询公司深度合作，毕业生就业率高达97%。',
    features: ['就业率97%', '毗邻金融中心', '华人友好'],
  },
  {
    id: 4, school: '香港大学', schoolEn: 'The University of Hong Kong', program: '金融学 MFin',
    country: 'hk', countryName: '中国香港', ranking: 17, deadline: '2025-12-20', tuition: 'HK$396,000/年',
    duration: '1年', language: 'IELTS 7.0 (6.0) / TOEFL 90', gpa: '均分80+ / GPA 3.0',
    logo: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=80&q=80',
    tags: ['金融', '港三', '性价比高'], major: '金融学', offers: 312,
    admitRate: 22, avgGpa: '3.48', description: '港大金融学硕士毗邻中环金融核心区，CFA通过率远超全球平均水平，实习与就业资源极为丰富。',
    features: ['CFA合作课程', '中环实习机会', 'IANG签证'],
  },
  {
    id: 5, school: '墨尔本大学', schoolEn: 'University of Melbourne', program: '信息技术 MIT',
    country: 'au', countryName: '澳大利亚', ranking: 14, deadline: '2026-03-31', tuition: 'A$47,636/年',
    duration: '2年', language: 'IELTS 6.5 (6.0)', gpa: '均分78+ / GPA 3.0',
    logo: 'https://images.unsplash.com/photo-1580537659466-0a9bfa916a54?w=80&q=80',
    tags: ['IT', '可移民', '接受转专业'], major: '计算机科学', offers: 423,
    admitRate: 35, avgGpa: '3.31', description: '墨大MIT项目接受跨专业申请，毕业即可走澳洲189/190技术移民通道，性价比极高。',
    features: ['接受转专业', '移民加分', '2年PSW签证'],
  },
  {
    id: 6, school: '伦敦大学学院', schoolEn: 'University College London', program: '教育学 MA Education',
    country: 'uk', countryName: '英国', ranking: 9, deadline: '2026-03-01', tuition: '£30,800/年',
    duration: '1年', language: 'IELTS 7.0 (6.5)', gpa: '均分80+ / GPA 3.3',
    logo: 'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=80&q=80',
    tags: ['教育', '文科友好', '全球第一'], major: '教育学', offers: 567,
    admitRate: 28, avgGpa: '3.42', description: 'UCL教育学院（IOE）全球排名第一，已连续9年蝉联QS教育学科世界第一，是教育学申请者的首选。',
    features: ['教育学全球第1', '实习资源丰富', 'PGCE可选'],
  },
  {
    id: 7, school: '多伦多大学', schoolEn: 'University of Toronto', program: '电子与计算机工程 MEng',
    country: 'ca', countryName: '加拿大', ranking: 21, deadline: '2026-02-01', tuition: 'C$62,250/年',
    duration: '1.5年', language: 'TOEFL 93 / IELTS 7.0', gpa: '均分82+ / GPA 3.3',
    logo: 'https://images.unsplash.com/photo-1569447891824-7a1758aa73a2?w=80&q=80',
    tags: ['工科', 'STEM', '移民友好'], major: '电子工程', offers: 189,
    admitRate: 20, avgGpa: '3.51', description: '多大ECE硕士，北美工程名校TOP3，毕业可申请加拿大PGWP 3年工签，移民路径清晰。',
    features: ['PGWP 3年工签', '北美工程TOP3', 'Co-op可选'],
  },
  {
    id: 8, school: '香港科技大学', schoolEn: 'HKUST', program: '数据科学与技术 MSc',
    country: 'hk', countryName: '中国香港', ranking: 47, deadline: '2026-02-01', tuition: 'HK$210,000/年',
    duration: '1年', language: 'TOEFL 80 / IELTS 6.5', gpa: '均分78+ / GPA 3.0',
    logo: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=80&q=80',
    tags: ['数据科学', '性价比', '港三'], major: '数据科学', offers: 384,
    admitRate: 25, avgGpa: '3.38', description: '港科大数据科学项目课程紧凑实用，一年即可毕业，学费性价比极高，毕业可留港工作。',
    features: ['一年制高效', '学费最低港三', 'IANG签证'],
  },
  {
    id: 9, school: '爱丁堡大学', schoolEn: 'University of Edinburgh', program: '人工智能 MSc',
    country: 'uk', countryName: '英国', ranking: 22, deadline: '2026-01-10', tuition: '£37,500/年',
    duration: '1年', language: 'IELTS 7.0 (6.5)', gpa: '均分85+ / GPA 3.5',
    logo: 'https://images.unsplash.com/photo-1526129318478-62ed807ebdf9?w=80&q=80',
    tags: ['AI', '竞争激烈', '历史名校'], major: '人工智能', offers: 98,
    admitRate: 8, avgGpa: '3.76', description: '爱大AI专业全英顶尖，信息学院是欧洲最大的AI研究中心之一，图灵奖得主Geoffrey Hinton曾在此任教。',
    features: ['欧洲最大AI中心', 'Turing研究所合作', 'PSW 2年'],
  },
  {
    id: 10, school: '哥伦比亚大学', schoolEn: 'Columbia University', program: '商业分析 MSBA',
    country: 'us', countryName: '美国', ranking: 12, deadline: '2026-01-05', tuition: '$80,256/年',
    duration: '1年', language: 'TOEFL 105+ / IELTS 7.5', gpa: '均分88+ / GPA 3.6',
    logo: 'https://images.unsplash.com/photo-1568792923760-d70635a89fdc?w=80&q=80',
    tags: ['常春藤', '纽约', '商科强校'], major: '商业分析', offers: 67,
    admitRate: 10, avgGpa: '3.78', description: '哥大MSBA项目位于纽约曼哈顿，与华尔街、硅巷深度融合，毕业生平均年薪超$120,000。',
    features: ['纽约核心地段', '华尔街资源', '校友网络强大'],
  },
  {
    id: 11, school: '苏黎世联邦理工学院', schoolEn: 'ETH Zurich', program: '计算机科学 MSc',
    country: 'eu', countryName: '瑞士', ranking: 7, deadline: '2025-12-15', tuition: 'CHF 1,460/年',
    duration: '2年', language: 'TOEFL 100 / IELTS 7.0', gpa: '均分88+ / GPA 3.6',
    logo: 'https://images.unsplash.com/photo-1504805572947-34fad45aed93?w=80&q=80',
    tags: ['学费极低', 'STEM', '欧洲第一'], major: '计算机科学', offers: 45,
    admitRate: 7, avgGpa: '3.82', description: 'ETH Zurich CS项目学费极低（仅约1万人民币/年），但录取门槛极高，爱因斯坦母校，欧洲理工第一。',
    features: ['学费近乎免费', '爱因斯坦母校', '瑞士高薪就业'],
  },
  {
    id: 12, school: '东京大学', schoolEn: 'The University of Tokyo', program: '情报理工学 修士',
    country: 'jp', countryName: '日本', ranking: 28, deadline: '2026-04-30', tuition: '¥535,800/年',
    duration: '2年', language: 'TOEFL 90+ / N1', gpa: '均分80+ / GPA 3.2',
    logo: 'https://images.unsplash.com/photo-1551641506-ee5bf4cb45f1?w=80&q=80',
    tags: ['日本第一', '研究型', '学费低'], major: '计算机科学', offers: 78,
    admitRate: 15, avgGpa: '3.45', description: '东大情报理工学研究科（CS方向）是日本最顶尖的计算机研究院，提供英文授课项目（GSGC），可直接用英语完成学位。',
    features: ['学费约2.6万/年', '英文授课可选', '日本就业前景好'],
  },
];

// ====== 组件 ======

export default function StudyAbroadPrograms() {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [selectedMajor, setSelectedMajor] = useState('全部专业');
  const [selectedRanking, setSelectedRanking] = useState('不限排名');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'ranking' | 'deadline' | 'offers' | 'admitRate'>('ranking');
  const [savedPrograms, setSavedPrograms] = useState<number[]>([]);

  // 筛选逻辑
  const filtered = PROGRAMS.filter((p) => {
    if (selectedCountry !== 'all' && p.country !== selectedCountry) return false;
    if (selectedMajor !== '全部专业' && p.major !== selectedMajor) return false;
    if (searchKeyword) {
      const kw = searchKeyword.toLowerCase();
      if (!p.school.toLowerCase().includes(kw) && !p.schoolEn.toLowerCase().includes(kw) && !p.program.toLowerCase().includes(kw) && !p.description.toLowerCase().includes(kw)) return false;
    }
    if (selectedRanking !== '不限排名') {
      const top = parseInt(selectedRanking.replace(/\D/g, ''));
      if (p.ranking > top) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'ranking') return a.ranking - b.ranking;
    if (sortBy === 'deadline') return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    if (sortBy === 'offers') return b.offers - a.offers;
    if (sortBy === 'admitRate') return a.admitRate - b.admitRate;
    return 0;
  });

  const activeFiltersCount = [
    selectedCountry !== 'all',
    selectedMajor !== '全部专业',
    selectedRanking !== '不限排名',
  ].filter(Boolean).length;

  const toggleSave = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSavedPrograms(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="min-h-screen bg-[#f9fafb] pt-6 pb-16">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">

        {/* ====== 页面头部 ====== */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-[13px] text-[#9ca3af] mb-4">
            <Link to="/study-abroad" className="hover:text-[#14b8a6] transition-colors">留学</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#4b5563]">选校</span>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-[30px] font-bold text-[#111827] flex items-center gap-3 mb-2">
                <GraduationCap className="w-8 h-8 text-[#14b8a6]" /> 院校与项目库
              </h1>
              <p className="text-[15px] text-[#6b7280]">覆盖全球 <span className="font-bold text-[#111827]">8</span> 个热门留学国家/地区，<span className="font-bold text-[#111827]">{PROGRAMS.length}+</span> 精选硕博项目</p>
            </div>
            {/* 快捷统计 */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-[13px] text-[#6b7280]">
                <Building2 className="w-4 h-4 text-[#14b8a6]" />
                <span className="font-bold text-[#111827]">200+</span> 合作院校
              </div>
              <div className="flex items-center gap-1.5 text-[13px] text-[#6b7280]">
                <Users className="w-4 h-4 text-[#14b8a6]" />
                <span className="font-bold text-[#111827]">2,800+</span> 录取案例
              </div>
            </div>
          </div>
        </div>

        {/* ====== 搜索栏 ====== */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            {/* 搜索框 */}
            <div className="flex-grow relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9ca3af]" />
              <input
                type="text"
                placeholder="搜索院校、项目名称（如 Imperial、计算机、商业分析）..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-[#f9fafb] border border-gray-200 rounded-xl text-[14px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent focus:bg-white placeholder-[#9ca3af] transition-all"
              />
            </div>
            {/* 筛选按钮 */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium text-[14px] transition-colors shrink-0 ${
                showFilters || activeFiltersCount > 0
                  ? 'bg-[#14b8a6] text-white'
                  : 'bg-[#f3f4f6] text-[#4b5563] hover:bg-gray-200'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              高级筛选
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 bg-white text-[#14b8a6] rounded-full text-[11px] font-bold flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* 筛选面板 */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pt-4 mt-4 border-t border-gray-100 space-y-4">
                  {/* 国家/地区 */}
                  <div>
                    <label className="text-[13px] font-medium text-[#6b7280] mb-2 block">国家/地区</label>
                    <div className="flex flex-wrap gap-2">
                      {COUNTRIES.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setSelectedCountry(c.id)}
                          className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                            selectedCountry === c.id
                              ? 'bg-[#14b8a6] text-white shadow-sm'
                              : 'bg-[#f3f4f6] text-[#4b5563] hover:bg-gray-200'
                          }`}
                        >
                          {c.flag} {c.name}
                          {'count' in c && <span className="ml-1 opacity-60">({c.count})</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 专业方向 */}
                  <div>
                    <label className="text-[13px] font-medium text-[#6b7280] mb-2 block">专业方向</label>
                    <div className="flex flex-wrap gap-2">
                      {MAJORS.map((m) => (
                        <button
                          key={m}
                          onClick={() => setSelectedMajor(m)}
                          className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                            selectedMajor === m
                              ? 'bg-[#14b8a6] text-white shadow-sm'
                              : 'bg-[#f3f4f6] text-[#4b5563] hover:bg-gray-200'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 排名范围 */}
                  <div>
                    <label className="text-[13px] font-medium text-[#6b7280] mb-2 block">QS 世界排名</label>
                    <div className="flex flex-wrap gap-2">
                      {RANKINGS.map((r) => (
                        <button
                          key={r}
                          onClick={() => setSelectedRanking(r)}
                          className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                            selectedRanking === r
                              ? 'bg-[#14b8a6] text-white shadow-sm'
                              : 'bg-[#f3f4f6] text-[#4b5563] hover:bg-gray-200'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 清除筛选 */}
                  {activeFiltersCount > 0 && (
                    <button
                      onClick={() => { setSelectedCountry('all'); setSelectedMajor('全部专业'); setSelectedRanking('不限排名'); }}
                      className="text-[13px] text-[#ef4444] hover:text-red-700 font-medium flex items-center gap-1 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" /> 清除所有筛选
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ====== 排序 + 结果计数 ====== */}
        <div className="flex items-center justify-between mb-5">
          <span className="text-[14px] text-[#6b7280]">
            共找到 <span className="font-bold text-[#111827]">{filtered.length}</span> 个项目
            {activeFiltersCount > 0 && <span className="text-[#14b8a6] ml-2">({activeFiltersCount} 个筛选条件)</span>}
          </span>
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-[#9ca3af]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="text-[13px] text-[#4b5563] bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#14b8a6] cursor-pointer"
            >
              <option value="ranking">按 QS 排名</option>
              <option value="deadline">按截止日期</option>
              <option value="offers">按录取数量</option>
              <option value="admitRate">按竞争激烈度</option>
            </select>
          </div>
        </div>

        {/* ====== 项目列表 ====== */}
        <div className="space-y-4">
          {filtered.map((prog, idx) => (
            <motion.div
              key={prog.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
            >
              <Link
                to={`/study-abroad/programs/${prog.id}`}
                className="block bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#14b8a6]/30 transition-all group"
              >
                <div className="flex flex-col md:flex-row md:items-start gap-5">
                  {/* 左侧：Logo + 信息 */}
                  <div className="flex items-start gap-4 flex-grow">
                    <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden shrink-0 ring-2 ring-gray-50">
                      <img src={prog.logo} alt={prog.school} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-[17px] font-bold text-[#111827] group-hover:text-[#14b8a6] transition-colors">{prog.school}</h3>
                        <span className="bg-[#f0fdfa] text-[#14b8a6] text-[11px] font-bold px-2 py-0.5 rounded border border-[#ccfbf1]">
                          QS #{prog.ranking}
                        </span>
                        {prog.tags.map(tag => (
                          <span key={tag} className="bg-gray-50 text-[#6b7280] text-[11px] px-2 py-0.5 rounded border border-gray-100">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <p className="text-[13px] text-[#9ca3af] mb-1.5">{prog.schoolEn}</p>
                      <h4 className="text-[16px] font-semibold text-[#374151] mb-2">{prog.program}</h4>
                      <p className="text-[13px] text-[#6b7280] line-clamp-2 mb-3">{prog.description}</p>

                      {/* 特色标签 */}
                      <div className="flex flex-wrap gap-2">
                        {prog.features.map((f, fIdx) => (
                          <span key={fIdx} className="inline-flex items-center gap-1 bg-[#f0fdfa] text-[#0d9488] text-[11px] px-2 py-0.5 rounded-full border border-[#ccfbf1]">
                            <Sparkles className="w-3 h-3" /> {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 右侧：关键信息 */}
                  <div className="flex md:flex-col items-center md:items-end gap-3 md:gap-2.5 shrink-0 md:min-w-[180px] md:text-right">
                    <button
                      onClick={(e) => toggleSave(prog.id, e)}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                        savedPrograms.includes(prog.id) ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-300 hover:text-red-400'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${savedPrograms.includes(prog.id) ? 'fill-current' : ''}`} />
                    </button>
                    <div className="flex items-center gap-1.5 text-[13px] text-[#6b7280]">
                      <MapPin className="w-3.5 h-3.5" /> {prog.countryName}
                    </div>
                    <div className="flex items-center gap-1.5 text-[13px] text-[#6b7280]">
                      <Clock className="w-3.5 h-3.5" /> {prog.duration}
                    </div>
                    <div className="text-[15px] font-bold text-[#14b8a6]">{prog.tuition}</div>
                    <div className="flex items-center gap-1.5 text-[12px] text-[#9ca3af]">
                      <GraduationCap className="w-3.5 h-3.5" /> {prog.offers} 条录取
                    </div>
                    <div className="text-[12px] text-orange-500 font-medium">
                      截止 {prog.deadline}
                    </div>
                  </div>
                </div>

                {/* 底部：申请要求速览 + 录取率 */}
                <div className="mt-4 pt-4 border-t border-gray-50 flex flex-wrap items-center gap-4 text-[12px] text-[#6b7280]">
                  <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-400" /> GPA: {prog.gpa}</span>
                  <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5 text-sky-400" /> 语言: {prog.language}</span>
                  <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5 text-green-400" /> 录取率: ~{prog.admitRate}%</span>
                  <span className="flex items-center gap-1"><Award className="w-3.5 h-3.5 text-purple-400" /> 录取均GPA: {prog.avgGpa}</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* 空状态 */}
        {filtered.length === 0 && (
          <div className="text-center py-20">
            <Search className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-[18px] font-bold text-[#6b7280] mb-2">没有找到匹配的项目</h3>
            <p className="text-[14px] text-[#9ca3af] mb-4">尝试调整筛选条件或搜索关键词</p>
            <button
              onClick={() => { setSelectedCountry('all'); setSelectedMajor('全部专业'); setSelectedRanking('不限排名'); setSearchKeyword(''); }}
              className="text-[14px] text-[#14b8a6] font-medium hover:underline"
            >
              清除所有筛选条件
            </button>
          </div>
        )}

        {/* 分页 */}
        {filtered.length > 0 && (
          <div className="flex justify-center mt-10">
            <div className="flex items-center gap-2">
              <button className="px-4 h-10 rounded-xl bg-white text-[#6b7280] border border-gray-200 hover:border-[#14b8a6] hover:text-[#14b8a6] text-[14px] font-medium transition-colors">
                上一页
              </button>
              {[1, 2, 3].map((page) => (
                <button
                  key={page}
                  className={`w-10 h-10 rounded-xl text-[14px] font-medium transition-colors ${
                    page === 1
                      ? 'bg-[#14b8a6] text-white shadow-sm'
                      : 'bg-white text-[#6b7280] border border-gray-200 hover:border-[#14b8a6] hover:text-[#14b8a6]'
                  }`}
                >
                  {page}
                </button>
              ))}
              <span className="text-[#9ca3af] px-2">...</span>
              <button className="w-10 h-10 rounded-xl bg-white text-[#6b7280] border border-gray-200 hover:border-[#14b8a6] hover:text-[#14b8a6] text-[14px] font-medium transition-colors">
                18
              </button>
              <button className="px-4 h-10 rounded-xl bg-white text-[#6b7280] border border-gray-200 hover:border-[#14b8a6] hover:text-[#14b8a6] text-[14px] font-medium transition-colors">
                下一页
              </button>
            </div>
          </div>
        )}

        {/* CTA 底部引导 */}
        <div className="mt-12 bg-gradient-to-r from-[#111827] to-[#1e293b] rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-[20px] font-bold text-white mb-2">不确定如何选校？</h3>
            <p className="text-[14px] text-gray-400">资深留学顾问根据你的背景，一对一定制选校方案</p>
          </div>
          <button className="bg-[#14b8a6] text-white px-8 py-3.5 rounded-xl font-bold hover:bg-[#0f766e] transition-colors shadow-lg shadow-[#14b8a6]/20 flex items-center gap-2 shrink-0">
            <Sparkles className="w-4 h-4" /> 免费选校评估
          </button>
        </div>

      </div>
    </div>
  );
}
