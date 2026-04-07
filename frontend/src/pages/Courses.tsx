import { BookOpen, Search, Play, Users, Star, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const COURSES = [
  {
    id: 1,
    title: '2024秋招互联网产品经理全攻略：从简历到面试',
    mentor: '张产品 (腾讯高级产品经理)',
    views: '12.5w',
    rating: '4.9',
    cover: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&q=80',
    tags: ['产品经理', '秋招', '面试技巧']
  },
  {
    id: 2,
    title: '前端开发面试高频手写题解析（附源码）',
    mentor: '李前端 (字节跳动前端专家)',
    views: '8.3w',
    rating: '4.8',
    cover: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=500&q=80',
    tags: ['前端开发', '算法', '源码解析']
  },
  {
    id: 3,
    title: '四大八大审计实习生笔面试指南',
    mentor: '王审计 (普华永道高级审计师)',
    views: '5.6w',
    rating: '4.7',
    cover: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500&q=80',
    tags: ['四大', '审计', '实习']
  },
  {
    id: 4,
    title: '如何写出一份让HR眼前一亮的简历？',
    mentor: '赵HR (阿里资深HRBP)',
    views: '15.8w',
    rating: '4.9',
    cover: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=500&q=80',
    tags: ['简历制作', '求职技巧', 'HR视角']
  },
  {
    id: 5,
    title: '金融应届生求职指南：投行/行研/固收',
    mentor: '刘分析 (中金公司副总裁)',
    views: '7.2w',
    rating: '4.8',
    cover: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=500&q=80',
    tags: ['金融', '投行', '行业研究']
  },
  {
    id: 6,
    title: '算法岗校招面经分享：如何准备LeetCode',
    mentor: '陈算法 (美团资深算法工程师)',
    views: '9.1w',
    rating: '4.8',
    cover: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=500&q=80',
    tags: ['算法工程师', 'LeetCode', '校招']
  },
  {
    id: 7,
    title: '快消行业MT(管培生)群面/单面通关秘籍',
    mentor: '林快消 (宝洁资深品牌经理)',
    views: '6.4w',
    rating: '4.7',
    cover: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=500&q=80',
    tags: ['快消', '管培生', '群面']
  },
  {
    id: 8,
    title: '从0到1拿捏体制内：公务员/事业编备考规划',
    mentor: '周公考 (知名公考辅导专家)',
    views: '11.3w',
    rating: '4.9',
    cover: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=500&q=80',
    tags: ['体制内', '公务员', '备考规划']
  }
];

export default function Courses() {
  return (
    <div className="min-h-screen bg-[#f9fafb] pt-8 pb-12">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <h1 className="text-[32px] font-bold text-[#111827] flex items-center gap-2">
              <BookOpen className="w-8 h-8 text-[#14b8a6]" />
              干货资料库
            </h1>
            <p className="text-[16px] text-[#4b5563] mt-2">海量免费干货视频，系统性提升你的求职硬实力</p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-[320px]">
            <input
              type="text"
              placeholder="搜索干货资料..."
              className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent transition-all shadow-sm"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          </div>
        </div>

        {/* Categories */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-8">
          <div className="flex flex-wrap gap-2">
            {['全部', '求职指导', '面试技巧', '简历制作', '行业解析', '考研保研', '体制内备考', '技能提升'].map((cat, idx) => (
              <button
                key={idx}
                className={`px-4 py-1.5 rounded-full text-[14px] font-medium transition-colors ${
                  idx === 0 
                    ? 'bg-[#14b8a6] text-white' 
                    : 'bg-gray-100 text-[#4b5563] hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Course Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {COURSES.map((course) => (
            <Link key={course.id} to={`/courses/${course.id}`} className="group block">
              <div className="bg-white rounded-[16px] overflow-hidden border border-[#e5e7eb] shadow-[0_1px_3px_rgba(0,0,0,0.1)] hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col h-full">
                
                {/* Cover Image */}
                <div className="relative aspect-video overflow-hidden">
                  <img 
                    src={course.cover} 
                    alt={course.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-[#14b8a6] shadow-lg pl-1">
                      <Play size={24} fill="currentColor" />
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[12px] px-2 py-0.5 rounded backdrop-blur-sm">
                    45:00
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex-grow flex flex-col">
                  <h3 className="text-[16px] font-bold text-[#111827] line-clamp-2 leading-snug group-hover:text-[#14b8a6] transition-colors mb-2">
                    {course.title}
                  </h3>
                  
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {course.tags.map((tag, idx) => (
                      <span key={idx} className="bg-[#f3f4f6] text-[#6b7280] px-1.5 py-0.5 rounded text-[11px]">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between text-[13px] text-[#9ca3af]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-[#14b8a6] text-white flex items-center justify-center text-[10px] font-bold">
                        {course.mentor[0]}
                      </div>
                      <span className="font-medium text-[#4b5563] truncate max-w-[100px]">
                        {course.mentor.split(' ')[0]}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Star size={13} className="text-[#f97316]" fill="currentColor" />
                        <span className="text-[#f97316] font-medium">{course.rating}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users size={13} />
                        <span>{course.views}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Load More */}
        <div className="mt-12 flex justify-center">
          <button className="px-6 py-2.5 border border-gray-300 text-[#4b5563] font-medium rounded-full hover:bg-gray-50 transition-colors flex items-center gap-2">
            加载更多干货 <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}