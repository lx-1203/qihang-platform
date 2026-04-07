import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Search, Play, Briefcase, Users, Star, Compass, DollarSign, CloudLightning, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- MOCK DATA ---
const HERO_SLIDES = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=2000",
    link: "#",
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=2000",
    link: "#",
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&q=80&w=2000",
    link: "#",
  },
];

const MENTORS = [
  {
    id: 1,
    name: "陈经理",
    title: "某头部互联网大厂HRD",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400",
    tags: ["简历精修", "模拟面试"],
    rating: "4.9",
  },
  {
    id: 2,
    name: "张工",
    title: "高级前端架构师",
    avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400",
    tags: ["技术面", "职业规划"],
    rating: "4.8",
  },
  {
    id: 3,
    name: "王总监",
    title: "知名快消品牌市场总监",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=400",
    tags: ["群面技巧", "营销方向"],
    rating: "5.0",
  },
  {
    id: 4,
    name: "李行长",
    title: "国有大行资深面试官",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=400",
    tags: ["金融求职", "结构化面试"],
    rating: "4.9",
  },
  {
    id: 5,
    name: "赵博士",
    title: "常青藤海归 / 咨询顾问",
    avatar: "https://images.unsplash.com/photo-1598550874175-4d0ef436c909?auto=format&fit=crop&q=80&w=400",
    tags: ["Case Interview", "留学求职"],
    rating: "4.8",
  },
];

const COURSES = [
  {
    id: 1,
    title: "校招简历怎么写才能过海选？（大厂HR视角）",
    mentor: "陈经理",
    views: "3.5w",
    cover: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&q=80&w=600",
    rating: 4.9,
  },
  {
    id: 2,
    title: "无领导小组讨论：角色定位与高分实战",
    mentor: "王总监",
    views: "2.8w",
    cover: "https://images.unsplash.com/photo-1515169067868-5387ec356754?auto=format&fit=crop&q=80&w=600",
    rating: 4.7,
  },
  {
    id: 3,
    title: "Java 后端开发高频面试题精讲",
    mentor: "周架构",
    views: "4.1w",
    cover: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=600",
    rating: 5.0,
  },
  {
    id: 4,
    title: "2026考研：计算机专业院校分析库解读",
    mentor: "李学长",
    views: "1.2w",
    cover: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=600",
    rating: 4.8,
  },
];

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () =>
    setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
  const prevSlide = () =>
    setCurrentSlide(
      (prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length,
    );

  return (
    <div className="bg-[#f9fafb] min-h-screen pb-16">
      {/* 1. Hero Carousel (保持了原有的动画逻辑，更新了尺寸和层级设计) */}
      <section className="relative w-full h-[520px] overflow-hidden bg-[#111827]">
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/60 via-black/40 to-black/70"></div>
        <div className="absolute w-full h-full flex items-center justify-center pt-8">
          {HERO_SLIDES.map((slide, index) => {
            let position = "hidden";
            let zIndex = 0;
            let scale = 0.8;
            let x = "0%";
            let opacity = 0;
            let transitionDuration = 0.5;

            if (index === currentSlide) {
              position = "active";
              zIndex = 20;
              scale = 1;
              x = "0%";
              opacity = 1;
            } else if (index === (currentSlide - 1 + HERO_SLIDES.length) % HERO_SLIDES.length) {
              position = "prev";
              zIndex = 10;
              scale = 0.85;
              x = "-80%";
              opacity = 0.4;
            } else if (index === (currentSlide + 1) % HERO_SLIDES.length) {
              position = "next";
              zIndex = 10;
              scale = 0.85;
              x = "80%";
              opacity = 0.4;
            } else {
              // 对于既不是当前、前一个或后一个的卡片，将其置于不可见的另一侧
              // 且不使用过渡动画，以防止出现穿帮镜头
              x = "100%";
              opacity = 0;
              transitionDuration = 0; 
            }

            return (
              <motion.div
                key={slide.id}
                initial={false}
                animate={{ opacity, x, scale, zIndex }}
                transition={{ duration: transitionDuration, ease: "easeInOut" }}
                className="absolute w-[80%] max-w-[1200px] h-full flex items-center justify-center cursor-pointer"
                style={{ pointerEvents: position === "hidden" ? "none" : "auto" }}
                onClick={() => {
                  if (position === "prev") prevSlide();
                  if (position === "next") nextSlide();
                }}
              >
                <img
                  src={slide.image}
                  alt={`Banner ${index + 1}`}
                  className={`w-full ${position === "active" ? "h-[85%] shadow-2xl" : "h-[75%] shadow-lg"} object-cover rounded-[20px]`}
                />
              </motion.div>
            );
          })}
        </div>

        {/* Hero 内容：标语与搜索栏 */}
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center pt-8 pointer-events-none">
          <div className="mb-10 pointer-events-auto text-center flex flex-col items-center mt-[-40px]">
            {/* 高端标题设计：发光、渐变、文字阴影和背景模糊的混合 */}
            <div className="relative inline-block mb-8">
              <div className="absolute inset-0 bg-black/30 blur-2xl rounded-full scale-150 transform"></div>
              <h1 className="relative text-transparent bg-clip-text bg-gradient-to-br from-white via-white/95 to-white/70 text-[64px] font-extrabold tracking-tight" style={{ filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.8)) drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
                你的职业生涯，从这里启航
              </h1>
            </div>
            
            {/* 标签化副标题设计 */}
            <div className="flex items-center justify-center gap-4 text-[18px] font-medium">
              <div className="group relative px-6 py-2.5 rounded-full bg-black/40 border border-white/20 backdrop-blur-md text-white shadow-xl hover:bg-black/60 transition-all duration-300 hover:scale-105 hover:border-white/40 cursor-default">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-teal-400/20 to-emerald-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <span className="relative flex items-center gap-2">
                  <Briefcase size={18} className="text-teal-400" />
                  汇聚名企岗位
                </span>
              </div>
              
              <div className="w-1.5 h-1.5 rounded-full bg-white/40 shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
              
              <div className="group relative px-6 py-2.5 rounded-full bg-black/40 border border-white/20 backdrop-blur-md text-white shadow-xl hover:bg-black/60 transition-all duration-300 hover:scale-105 hover:border-white/40 cursor-default">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-teal-400/20 to-emerald-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <span className="relative flex items-center gap-2">
                  <Users size={18} className="text-teal-400" />
                  1v1大咖辅导
                </span>
              </div>
              
              <div className="w-1.5 h-1.5 rounded-full bg-white/40 shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
              
              <div className="group relative px-6 py-2.5 rounded-full bg-black/40 border border-white/20 backdrop-blur-md text-white shadow-xl hover:bg-black/60 transition-all duration-300 hover:scale-105 hover:border-white/40 cursor-default">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-teal-400/20 to-emerald-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <span className="relative flex items-center gap-2">
                  <Compass size={18} className="text-teal-400" />
                  升学创业全覆盖
                </span>
              </div>
            </div>
          </div>

          {/* 巨型全局搜索栏 */}
          <div className="w-[800px] h-[56px] bg-white rounded-full flex items-center p-1.5 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1)] pointer-events-auto relative z-40 transform hover:scale-[1.02] transition-transform duration-300">
            <div className="flex items-center pl-6 pr-4 border-r border-gray-200 text-gray-700 font-medium cursor-pointer hover:text-[#14b8a6] transition-colors">
              <Briefcase className="w-5 h-5 mr-2" />
              <span>找职位</span>
              <svg className="w-4 h-4 ml-1 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
            <input 
              type="text" 
              className="flex-1 bg-transparent border-none outline-none pl-6 text-[16px] text-gray-900 placeholder-gray-400 h-full"
              placeholder="搜索 校招、实习、简历辅导、或者保研夏令营..."
            />
            <button className="w-[140px] h-[46px] bg-[#14b8a6] hover:bg-[#0f766e] text-white rounded-full text-[16px] font-bold shadow-md transition-colors flex items-center justify-center gap-2">
              <Search className="w-5 h-5" />
              一键搜索
            </button>
          </div>
        </div>

        {/* Carousel Controls */}
        <button onClick={prevSlide} className="absolute left-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 flex items-center justify-center rounded-full bg-black/30 hover:bg-black/60 text-white transition-colors backdrop-blur-md border border-white/20">
          <ChevronLeft size={28} />
        </button>
        <button onClick={nextSlide} className="absolute right-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 flex items-center justify-center rounded-full bg-black/30 hover:bg-black/60 text-white transition-colors backdrop-blur-md border border-white/20">
          <ChevronRight size={28} />
        </button>
        
        {/* Indicators */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex space-x-3">
          {HERO_SLIDES.map((_, index) => (
            <button key={index} onClick={() => setCurrentSlide(index)} className={`h-3 rounded-full transition-all duration-300 ${index === currentSlide ? "bg-[#14b8a6] w-10 shadow-lg" : "bg-white/50 w-3 hover:bg-white"}`} />
    

          ))}
        </div>
      </section>

      {/* 2. 快捷金刚区 (功能入口) */}
      <section className="max-w-[1200px] mx-auto -mt-14 relative z-40 px-4 sm:px-6">
        <div className="bg-white rounded-[16px] shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] h-[120px] flex items-center justify-around px-8 divide-x divide-gray-100">
          {[
            { title: "校招季直通", desc: "名企最新网申", icon: Briefcase, color: "text-[#14b8a6]", bg: "bg-[#f0fdfa]" },
            { title: "大咖1v1", desc: "简历精修模拟面试", icon: Users, color: "text-blue-500", bg: "bg-blue-50" },
            { title: "免费真题库", desc: "行测申论无领导", icon: BookOpen, color: "text-purple-500", bg: "bg-purple-50" },
            { title: "保研情报站", desc: "夏令营预推免", icon: Compass, color: "text-emerald-500", bg: "bg-emerald-50" },
            { title: "找项目合伙人", desc: "大学生创业扶持", icon: CloudLightning, color: "text-orange-500", bg: "bg-orange-50" },
          ].map((item, idx) => (
            <Link key={idx} to="#" className="flex-1 flex flex-col items-center justify-center group py-2 hover:bg-gray-50 transition-colors rounded-xl mx-2">
              <div className={`w-12 h-12 ${item.bg} ${item.color} rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300`}>
                <item.icon size={24} />
              </div>
              <span className="text-[16px] font-bold text-gray-900 leading-tight">{item.title}</span>
              <span className="text-[12px] text-gray-500 mt-1">{item.desc}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. 大咖导师推荐 (等距横向排版) */}
      <section className="max-w-[1200px] mx-auto mt-16 px-4 sm:px-6">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-[32px] font-bold text-[#111827]">大咖导师推荐</h2>
            <p className="text-[16px] text-[#4b5563] mt-2">与行业资深前辈1v1交流，获取第一手职场/升学经验</p>
          </div>
          <Link to="/mentors" className="text-[#14b8a6] hover:text-[#0f766e] font-medium flex items-center text-[15px] transition-colors">
            查看全部导师 <ChevronRight className="w-5 h-5 ml-1" />
          </Link>
        </div>

        <div className="flex justify-between gap-[24px]">
          {MENTORS.slice(0, 4).map((mentor) => (
            <Link key={mentor.id} to={`/mentors/${mentor.id}`} className="group block flex-1 w-full max-w-[280px]">
              <div className="bg-white rounded-[16px] overflow-hidden border border-[#e5e7eb] shadow-[0_1px_3px_rgba(0,0,0,0.1)] hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] hover:-translate-y-2 transition-all duration-300">
                {/* 图片区 */}
                <div className="relative h-[220px] w-full overflow-hidden">
                  <img src={mentor.avatar} alt={mentor.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md rounded-full px-2 py-1 flex items-center gap-1">
                    <Star className="w-3 h-3 text-[#f97316]" fill="currentColor" />
                    <span className="text-white text-xs font-bold">{mentor.rating}</span>
                  </div>
                </div>
                {/* 信息区 */}
                <div className="p-4 flex flex-col min-h-[160px]">
                  <h3 className="text-[20px] font-bold text-[#111827] mb-1">{mentor.name}</h3>
                  <p className="text-[14px] text-[#4b5563] mb-3 line-clamp-2 leading-snug">{mentor.title}</p>
                  
                  <div className="flex flex-wrap gap-2 mt-auto mb-4">
                    {mentor.tags.map((tag, idx) => (
                      <span key={idx} className="bg-[#f0fdfa] text-[#14b8a6] px-2 py-1 rounded text-[12px] font-medium border border-[#ccfbf1]">
                        {tag}
                      </span>
                    ))}
                  </div>
                  
                  <div className="w-full h-[36px] flex items-center justify-center border border-[#14b8a6] text-[#14b8a6] rounded-lg text-[14px] font-medium group-hover:bg-[#14b8a6] group-hover:text-white transition-colors">
                    查看主页
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. 免费公开课精选 (网格排版) */}
      <section className="max-w-[1200px] mx-auto mt-16 px-4 sm:px-6">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-[32px] font-bold text-[#111827]">免费公开课精选</h2>
            <p className="text-[16px] text-[#4b5563] mt-2">海量免费干货视频，系统性提升你的求职硬实力</p>
          </div>
          <Link to="/courses" className="text-[#14b8a6] hover:text-[#0f766e] font-medium flex items-center text-[15px] transition-colors">
            前往干货资料库 <ChevronRight className="w-5 h-5 ml-1" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {COURSES.map((course) => (
            <Link key={course.id} to={`/courses/${course.id}`} className="group block">
              <div className="bg-white rounded-[16px] overflow-hidden border border-[#e5e7eb] shadow-[0_1px_3px_rgba(0,0,0,0.1)] hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col h-full">
                <div className="relative aspect-video overflow-hidden">
                  <img src={course.cover} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-[#14b8a6] shadow-lg pl-1">
                      <Play size={24} fill="currentColor" />
                    </div>
                  </div>
                </div>
                <div className="p-5 flex-grow flex flex-col">
                  <h3 className="text-[18px] font-bold text-[#111827] line-clamp-2 leading-snug group-hover:text-[#14b8a6] transition-colors">
                    {course.title}
                  </h3>
                  <div className="mt-auto pt-4 flex items-center justify-between text-[14px] text-[#9ca3af]">
                    <div className="flex items-center">
                      <span className="font-medium text-[#4b5563]">主讲：{course.mentor}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded text-[12px]">
                      <Users size={14} className="text-gray-400" />
                      <span>{course.views}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
