import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Filter, MapPin, Clock, ChevronRight, ChevronDown,
  GraduationCap, Star, DollarSign, Globe, X, SlidersHorizontal,
  ArrowUpDown, Heart, Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ====== Mock 数据（后续全部由后台接口提供） ======

const COUNTRIES = [
  { id: 'all', name: '全部地区', flag: '🌍' },
  { id: 'uk', name: '英国', flag: '🇬🇧' },
  { id: 'us', name: '美国', flag: '🇺🇸' },
  { id: 'hk', name: '中国香港', flag: '🇭🇰' },
  { id: 'sg', name: '新加坡', flag: '🇸🇬' },
  { id: 'au', name: '澳大利亚', flag: '🇦🇺' },
  { id: 'ca', name: '加拿大', flag: '🇨🇦' },
  { id: 'eu', name: '欧洲', flag: '🇪🇺' },
  { id: 'jp', name: '日本', flag: '🇯🇵' },
];

const MAJORS = ['全部专业', '计算机科学', '商业分析', '金融学', '电子工程', '数据科学', '人工智能', '传媒', '教育学', '机械工程', '法学', '建筑学'];

const RANKINGS = ['不限排名', 'QS Top 10', 'QS Top 30', 'QS Top 50', 'QS Top 100', 'QS Top 200'];

const PROGRAMS = [
  {
    id: 1, school: '帝国理工学院', schoolEn: 'Imperial College London', program: '计算机科学 MSc',
    country: 'uk', countryName: '英国', ranking: 6, deadline: '2026-01-15', tuition: '£38,900/年',
    duration: '1年', language: 'IELTS 7.0 (6.5)', gpa: '3.5/4.0 或 均分85+',
    logo: 'https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?w=80&q=80',
    tags: ['STEM', '热门'], major: '计算机科学', offers: 23, description: '帝国理工计算机科学硕士项目，涵盖人工智能、机器学习、软件工程等方向。'
  },
  {
    id: 2, school: '新加坡国立大学', schoolEn: 'National University of Singapore', program: '商业分析 MSc',
    country: 'sg', countryName: '新加坡', ranking: 8, deadline: '2026-01-31', tuition: 'S$58,000/年',
    duration: '1.5年', language: 'TOEFL 100 / IELTS 7.0', gpa: '3.3/4.0 或 均分80+',
    logo: 'https://images.unsplash.com/photo-1562774053-701939374585?w=80&q=80',
    tags: ['商科', '就业率高'], major: '商业分析', offers: 18, description: '新加坡国立大学商业分析项目，注重实践，就业率极高。'
  },
  {
    id: 3, school: '香港大学', schoolEn: 'The University of Hong Kong', program: '金融学 MFin',
    country: 'hk', countryName: '中国香港', ranking: 17, deadline: '2025-12-20', tuition: 'HK$396,000/年',
    duration: '1年', language: 'IELTS 7.0 (6.0) / TOEFL 90', gpa: '3.0/4.0 或 均分80+',
    logo: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=80&q=80',
    tags: ['金融', '港三'], major: '金融学', offers: 31, description: '港大金融学硕士，毗邻中环金融核心区，实习与就业资源丰富。'
  },
  {
    id: 4, school: '墨尔本大学', schoolEn: 'University of Melbourne', program: '信息技术 MIT',
    country: 'au', countryName: '澳大利亚', ranking: 14, deadline: '2026-03-31', tuition: 'A$47,636/年',
    duration: '2年', language: 'IELTS 6.5 (6.0)', gpa: '3.0/4.0 或 均分78+',
    logo: 'https://images.unsplash.com/photo-1580537659466-0a9bfa916a54?w=80&q=80',
    tags: ['IT', '可移民'], major: '计算机科学', offers: 42, description: '墨大MIT项目接受转专业申请，毕业可走澳洲技术移民通道。'
  },
  {
    id: 5, school: '伦敦大学学院', schoolEn: 'University College London', program: '教育学 MA Education',
    country: 'uk', countryName: '英国', ranking: 9, deadline: '2026-03-01', tuition: '£30,800/年',
    duration: '1年', language: 'IELTS 7.0 (6.5)', gpa: '3.3/4.0 或 均分80+',
    logo: 'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=80&q=80',
    tags: ['教育', '文科友好'], major: '教育学', offers: 56, description: 'UCL教育学院全球排名第一，教育学专业首选。'
  },
  {
    id: 6, school: '多伦多大学', schoolEn: 'University of Toronto', program: '电子与计算机工程 MEng',
    country: 'ca', countryName: '加拿大', ranking: 21, deadline: '2026-02-01', tuition: 'C$62,250/年',
    duration: '1.5年', language: 'TOEFL 93 / IELTS 7.0', gpa: '3.3/4.0 或 均分82+',
    logo: 'https://images.unsplash.com/photo-1569447891824-7a1758aa73a2?w=80&q=80',
    tags: ['工科', 'STEM'], major: '电子工程', offers: 15, description: '多大ECE硕士，北美工程名校，毕业可申请加拿大PGWP工签。'
  },
  {
    id: 7, school: '香港科技大学', schoolEn: 'HKUST', program: '数据科学与技术 MSc',
    country: 'hk', countryName: '中国香港', ranking: 47, deadline: '2026-02-01', tuition: 'HK$210,000/年',
    duration: '1年', language: 'TOEFL 80 / IELTS 6.5', gpa: '3.0/4.0 或 均分78+',
    logo: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=80&q=80',
    tags: ['数据科学', '性价比'], major: '数据科学', offers: 38, description: '港科大数据科学项目，课程紧凑实用，一年即可毕业。'
  },
  {
    id: 8, school: '爱丁堡大学', schoolEn: 'University of Edinburgh', program: '人工智能 MSc',
    country: 'uk', countryName: '英国', ranking: 22, deadline: '2026-01-10', tuition: '£37,500/年',
    duration: '1年', language: 'IELTS 7.0 (6.5)', gpa: '3.5/4.0 或 均分85+',
    logo: 'https://images.unsplash.com/photo-1526129318478-62ed807ebdf9?w=80&q=80',
    tags: ['AI', '竞争激烈'], major: '人工智能', offers: 12, description: '爱大AI专业全英顶尖，申请难度较高，适合强背景申请者。'
  },
];

// ====== 组件 ======

export default function StudyAbroadPrograms() {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [selectedMajor, setSelectedMajor] = useState('全部专业');
  const [selectedRanking, setSelectedRanking] = useState('不限排名');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'ranking' | 'deadline' | 'offers'>('ranking');

  // 筛选逻辑
  const filtered = PROGRAMS.filter((p) => {
    if (selectedCountry !== 'all' && p.country !== selectedCountry) return false;
    if (selectedMajor !== '全部专业' && p.major !== selectedMajor) return false;
    if (searchKeyword) {
      const kw = searchKeyword.toLowerCase();
      if (!p.school.toLowerCase().includes(kw) && !p.schoolEn.toLowerCase().includes(kw) && !p.program.toLowerCase().includes(kw)) return false;
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
    return 0;
  });

  const activeFiltersCount = [
    selectedCountry !== 'all',
    selectedMajor !== '全部专业',
    selectedRanking !== '不限排名',
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-[#f9fafb] pt-6 pb-16">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">

        {/* ====== 页面头部 ====== */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-[13px] text-[#9ca3af] mb-4">
            <Link to="/study-abroad" className="hover:text-[#14b8a6] transition-colors">留学</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#4b5563]">选校</span>
          </div>
          <h1 className="text-[30px] font-bold text-[#111827] flex items-center gap-3 mb-2">
            <GraduationCap className="w-8 h-8 text-[#14b8a6]" /> 院校与项目库
          </h1>
          <p className="text-[15px] text-[#6b7280]">分国家、分专业浏览全球硕士项目，支持智能筛选与排序</p>
        </div>

        {/* ====== 搜索栏 ====== */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            {/* 搜索框 */}
            <div className="flex-grow relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9ca3af]" />
              <input
                type="text"
                placeholder="搜索院校名称、项目名称..."
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
              筛选
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
                          className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                            selectedCountry === c.id
                              ? 'bg-[#14b8a6] text-white'
                              : 'bg-[#f3f4f6] text-[#4b5563] hover:bg-gray-200'
                          }`}
                        >
                          {c.flag} {c.name}
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
                          className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                            selectedMajor === m
                              ? 'bg-[#14b8a6] text-white'
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
                    <label className="text-[13px] font-medium text-[#6b7280] mb-2 block">QS 排名</label>
                    <div className="flex flex-wrap gap-2">
                      {RANKINGS.map((r) => (
                        <button
                          key={r}
                          onClick={() => setSelectedRanking(r)}
                          className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                            selectedRanking === r
                              ? 'bg-[#14b8a6] text-white'
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
          </span>
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-[#9ca3af]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'ranking' | 'deadline' | 'offers')}
              className="text-[13px] text-[#4b5563] bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#14b8a6]"
            >
              <option value="ranking">按排名</option>
              <option value="deadline">按截止日期</option>
              <option value="offers">按录取数</option>
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
                <div className="flex flex-col md:flex-row md:items-center gap-5">
                  {/* 左侧：Logo + 信息 */}
                  <div className="flex items-start gap-4 flex-grow">
                    <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden shrink-0">
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
                      <p className="text-[13px] text-[#9ca3af] mb-2">{prog.schoolEn}</p>
                      <h4 className="text-[16px] font-semibold text-[#374151] mb-2">{prog.program}</h4>
                      <p className="text-[13px] text-[#6b7280] line-clamp-1">{prog.description}</p>
                    </div>
                  </div>

                  {/* 右侧：关键信息 */}
                  <div className="flex md:flex-col items-center md:items-end gap-3 md:gap-2 shrink-0 md:min-w-[180px] md:text-right">
                    <div className="flex items-center gap-1.5 text-[13px] text-[#6b7280]">
                      <MapPin className="w-3.5 h-3.5" /> {prog.countryName}
                    </div>
                    <div className="flex items-center gap-1.5 text-[13px] text-[#6b7280]">
                      <Clock className="w-3.5 h-3.5" /> {prog.duration}
                    </div>
                    <div className="text-[14px] font-bold text-[#14b8a6]">{prog.tuition}</div>
                    <div className="flex items-center gap-1.5 text-[12px] text-[#9ca3af]">
                      <GraduationCap className="w-3.5 h-3.5" /> {prog.offers} 条录取
                    </div>
                    <div className="text-[12px] text-orange-500 font-medium">
                      截止 {prog.deadline}
                    </div>
                  </div>
                </div>

                {/* 底部：申请要求速览 */}
                <div className="mt-4 pt-4 border-t border-gray-50 flex flex-wrap gap-4 text-[12px] text-[#6b7280]">
                  <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-400" /> GPA: {prog.gpa}</span>
                  <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5 text-sky-400" /> 语言: {prog.language}</span>
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
            <p className="text-[14px] text-[#9ca3af]">尝试调整筛选条件或搜索关键词</p>
          </div>
        )}

        {/* 分页占位（后续对接API后使用真实分页） */}
        {filtered.length > 0 && (
          <div className="flex justify-center mt-10">
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((page) => (
                <button
                  key={page}
                  className={`w-10 h-10 rounded-xl text-[14px] font-medium transition-colors ${
                    page === 1
                      ? 'bg-[#14b8a6] text-white'
                      : 'bg-white text-[#6b7280] border border-gray-200 hover:border-[#14b8a6] hover:text-[#14b8a6]'
                  }`}
                >
                  {page}
                </button>
              ))}
              <span className="text-[#9ca3af] px-2">...</span>
              <button className="w-10 h-10 rounded-xl bg-white text-[#6b7280] border border-gray-200 hover:border-[#14b8a6] hover:text-[#14b8a6] text-[14px] font-medium transition-colors">
                12
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
