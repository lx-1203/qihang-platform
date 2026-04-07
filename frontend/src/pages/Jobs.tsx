import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  MapPin,
  Briefcase,
  Clock,
  Filter,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- MOCK DATA ---
const JOB_CATEGORIES = [
  "全部",
  "技术",
  "产品",
  "运营",
  "设计",
  "市场",
  "销售",
  "职能",
];
const JOB_TYPES = ["全部", "校招", "实习", "社招"];
const LOCATIONS = ["全国", "北京", "上海", "广州", "深圳", "杭州", "成都"];

const JOBS = [
  {
    id: 1,
    title: "前端开发工程师 (2026届校招)",
    company: "字节跳动",
    logo: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=100&h=100&fit=crop",
    location: "北京/上海/杭州",
    salary: "25k-40k",
    type: "校招",
    tags: ["React", "Vue", "大前端"],
    time: "2小时前",
    urgent: true,
  },
  {
    id: 2,
    title: "产品经理实习生 - 商业化方向",
    company: "腾讯",
    logo: "https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=100&h=100&fit=crop",
    location: "深圳",
    salary: "200-300/天",
    type: "实习",
    tags: ["商业化", "数据分析", "转正机会大"],
    time: "3小时前",
    urgent: false,
  },
  {
    id: 3,
    title: "AIGC 算法研究员",
    company: "百度",
    logo: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=100&h=100&fit=crop",
    location: "北京",
    salary: "30k-60k",
    type: "校招",
    tags: ["大模型", "NLP", "顶会论文"],
    time: "5小时前",
    urgent: true,
  },
  {
    id: 4,
    title: "海外市场运营专员",
    company: "米哈游",
    logo: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=100&h=100&fit=crop",
    location: "上海",
    salary: "15k-25k",
    type: "校招",
    tags: ["英语流利", "游戏热爱者", "二次元"],
    time: "1天前",
    urgent: false,
  },
  {
    id: 5,
    title: "UI/UX 设计师实习",
    company: "小红书",
    logo: "https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?w=100&h=100&fit=crop",
    location: "上海",
    salary: "250/天",
    type: "实习",
    tags: ["Figma", "插画", "审美在线"],
    time: "1天前",
    urgent: false,
  },
  {
    id: 6,
    title: "管培生 (2026届)",
    company: "联合利华",
    logo: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&h=100&fit=crop",
    location: "全国分配",
    salary: "12k-18k",
    type: "校招",
    tags: ["快消", "轮岗", "快速晋升"],
    time: "2天前",
    urgent: false,
  },
];

export default function Jobs() {
  const [activeCategory, setActiveCategory] = useState("全部");
  const [activeType, setActiveType] = useState("全部");
  const [activeLocation, setActiveLocation] = useState("全国");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // 简单的过滤逻辑
  const filteredJobs = JOBS.filter((job) => {
    const matchType = activeType === "全部" || job.type === activeType;
    const matchLocation =
      activeLocation === "全国" || job.location.includes(activeLocation);
    // 这里省略对 activeCategory 的复杂匹配，仅作演示
    return matchType && matchLocation;
  });

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* 1. 顶部搜索区域 (Hero Search) */}
      <section className="bg-[#111827] text-white py-16 lg:py-24 relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
          <svg
            className="absolute w-full h-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <path d="M0,100 L100,0 L100,100 Z" fill="url(#gradJob)" />
            <defs>
              <linearGradient id="gradJob" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop
                  offset="0%"
                  style={{ stopColor: "#14b8a6", stopOpacity: 1 }}
                />
                <stop
                  offset="100%"
                  style={{ stopColor: "#0f766e", stopOpacity: 0 }}
                />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
              发现你的下一个心仪岗位
            </h1>
            <p className="text-primary-100 text-lg sm:text-xl">
              精选名企校招、高质量实习机会，开启职场新篇章。
            </p>
          </div>

          <div className="max-w-4xl mx-auto bg-white rounded-2xl p-2 sm:p-3 shadow-2xl flex flex-col sm:flex-row gap-2">
            <div className="flex-1 flex items-center bg-gray-50 rounded-xl px-4 py-3 sm:py-0 border border-transparent focus-within:border-primary-500 focus-within:bg-white transition-colors">
              <Search className="text-gray-400 w-5 h-5 shrink-0" />
              <input
                type="text"
                placeholder="搜索职位、公司或关键词 (例如：前端、字节跳动)"
                className="w-full bg-transparent border-none focus:ring-0 text-gray-900 placeholder:text-gray-400 ml-3 text-base"
              />
            </div>
            <div className="sm:w-48 flex items-center bg-gray-50 rounded-xl px-4 py-3 sm:py-0 border border-transparent focus-within:border-primary-500 focus-within:bg-white transition-colors border-t sm:border-t-0 sm:border-l border-gray-200">
              <MapPin className="text-gray-400 w-5 h-5 shrink-0" />
              <input
                type="text"
                placeholder="工作城市"
                className="w-full bg-transparent border-none focus:ring-0 text-gray-900 placeholder:text-gray-400 ml-3 text-base"
              />
            </div>
            <button className="bg-primary-600 hover:bg-primary-500 text-white px-8 py-3.5 rounded-xl font-bold transition-colors w-full sm:w-auto shrink-0 shadow-md">
              搜索岗位
            </button>
          </div>

          <div className="max-w-4xl mx-auto mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="text-primary-200">热门搜索：</span>
            {["产品经理", "Java", "数据分析", "运营实习", "腾讯校招"].map(
              (tag) => (
                <a
                  key={tag}
                  href="#"
                  className="text-white hover:text-primary-300 hover:underline transition-colors"
                >
                  {tag}
                </a>
              ),
            )}
          </div>
        </div>
      </section>

      {/* 2. 岗位列表与筛选区 */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col lg:flex-row gap-8">
        {/* 左侧筛选侧边栏 (PC端) / 顶部筛选 (移动端) */}
        <div className="w-full lg:w-64 shrink-0 space-y-8">
          {/* 移动端筛选按钮 */}
          <div className="lg:hidden flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <span className="font-bold text-gray-900">
              全部职位 ({filteredJobs.length})
            </span>
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center gap-2 text-gray-600 hover:text-primary-600 transition-colors bg-gray-50 px-3 py-1.5 rounded-lg"
            >
              <Filter size={18} /> 筛选
            </button>
          </div>

          <div
            className={`space-y-8 lg:block ${isFilterOpen ? "block" : "hidden"}`}
          >
            {/* 职位类型 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary-600" /> 招聘类型
              </h3>
              <div className="flex flex-wrap gap-2">
                {JOB_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => setActiveType(type)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeType === type
                        ? "bg-primary-50 text-primary-700 border border-primary-200"
                        : "bg-gray-50 text-gray-600 border border-transparent hover:bg-gray-100"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* 工作地点 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary-600" /> 工作地点
              </h3>
              <div className="flex flex-wrap gap-2">
                {LOCATIONS.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => setActiveLocation(loc)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeLocation === loc
                        ? "bg-primary-50 text-primary-700 border border-primary-200"
                        : "bg-gray-50 text-gray-600 border border-transparent hover:bg-gray-100"
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>

            {/* 职位分类 (简单展示) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Filter className="w-5 h-5 text-primary-600" /> 职能分类
              </h3>
              <ul className="space-y-2">
                {JOB_CATEGORIES.map((cat) => (
                  <li key={cat}>
                    <button
                      onClick={() => setActiveCategory(cat)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${
                        activeCategory === cat
                          ? "bg-primary-50 text-primary-700 font-bold"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {cat}
                      {activeCategory === cat && (
                        <ChevronDown className="w-4 h-4 -rotate-90" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* 广告/提示位 */}
            <div className="bg-gradient-to-br from-primary-50 to-blue-50 p-6 rounded-2xl border border-primary-100 relative overflow-hidden">
              <div className="relative z-10">
                <h4 className="font-bold text-primary-900 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary-600" /> 简历诊断服务
                </h4>
                <p className="text-xs text-primary-700 mb-4 leading-relaxed">
                  投递没回音？让资深HR为你1v1修改简历，提升面试邀约率。
                </p>
                <Link
                  to="/mentors"
                  className="inline-block bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm"
                >
                  立即预约
                </Link>
              </div>
              <Sparkles className="absolute -bottom-4 -right-4 w-24 h-24 text-primary-200 opacity-50" />
            </div>
          </div>
        </div>

        {/* 右侧职位列表 */}
        <div className="flex-1 space-y-6">
          <div className="hidden lg:flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              为您找到{" "}
              <span className="text-primary-600">{filteredJobs.length}</span>{" "}
              个在招岗位
            </h2>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="font-medium text-gray-900 cursor-pointer">
                综合排序
              </span>
              <span className="cursor-pointer hover:text-gray-900 transition-colors">
                最新发布
              </span>
              <span className="cursor-pointer hover:text-gray-900 transition-colors">
                薪资最高
              </span>
            </div>
          </div>

          <AnimatePresence mode="popLayout">
            {filteredJobs.length > 0 ? (
              filteredJobs.map((job) => (
                <motion.div
                  key={job.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-primary-200 transition-all group"
                >
                  <div className="flex flex-col sm:flex-row gap-6">
                    {/* 职位主信息 */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <Link
                          to={`/jobs/${job.id}`}
                          className="text-xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors flex items-center gap-2"
                        >
                          {job.title}
                          {job.urgent && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-600 border border-red-100">
                              急招
                            </span>
                          )}
                        </Link>
                        <span className="text-xl font-bold text-orange-500 whitespace-nowrap ml-4">
                          {job.salary}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
                        <span className="flex items-center gap-1">
                          <MapPin size={16} className="text-gray-400" />{" "}
                          {job.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Briefcase size={16} className="text-gray-400" />{" "}
                          {job.type}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={16} className="text-gray-400" />{" "}
                          {job.time}发布
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {job.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="bg-gray-50 text-gray-600 px-2.5 py-1 rounded-md text-xs border border-gray-100"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* 公司信息 & 操作区 */}
                    <div className="sm:w-48 shrink-0 flex flex-row sm:flex-col justify-between items-center sm:items-end border-t sm:border-t-0 sm:border-l border-gray-100 pt-4 sm:pt-0 sm:pl-6">
                      <div className="flex items-center gap-3 w-full justify-start sm:justify-end">
                        <div className="text-right hidden sm:block">
                          <div className="font-bold text-gray-900">
                            {job.company}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            互联网 / 已上市 / 10000人以上
                          </div>
                        </div>
                        <img
                          src={job.logo}
                          alt={job.company}
                          className="w-12 h-12 rounded-xl object-cover border border-gray-100 shadow-sm"
                        />
                        <div className="sm:hidden font-bold text-gray-900">
                          {job.company}
                        </div>
                      </div>

                      <button className="bg-primary-50 text-primary-700 hover:bg-primary-600 hover:text-white px-6 py-2 rounded-lg text-sm font-bold transition-colors w-auto sm:w-full mt-0 sm:mt-4 border border-primary-200 hover:border-transparent">
                        投递简历
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm"
              >
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                  <Search size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  未找到匹配的职位
                </h3>
                <p className="text-gray-500 mb-6">
                  尝试减少筛选条件或更换搜索关键词
                </p>
                <button
                  onClick={() => {
                    setActiveType("全部");
                    setActiveLocation("全国");
                    setActiveCategory("全部");
                  }}
                  className="bg-primary-50 text-primary-700 px-6 py-2 rounded-lg font-medium hover:bg-primary-100 transition-colors"
                >
                  清除所有筛选条件
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pagination (MOCK) */}
          {filteredJobs.length > 0 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <button
                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50"
                disabled
              >
                上一页
              </button>
              <button className="w-10 h-10 rounded-lg bg-primary-600 text-white font-bold shadow-sm">
                1
              </button>
              <button className="w-10 h-10 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium">
                2
              </button>
              <button className="w-10 h-10 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium">
                3
              </button>
              <span className="text-gray-400 mx-2">...</span>
              <button className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900">
                下一页
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
