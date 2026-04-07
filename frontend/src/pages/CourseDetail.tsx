import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Play, Users, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- MOCK DATA ---
const HERO_SLIDES = [
  {
    id: 1,
    title: "2026 春季名企大厂招聘季",
    subtitle: "提前锁定你的心仪Offer",
    image:
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=2000",
    cta: "立即查看",
  },
  {
    id: 2,
    title: "资深HR教你写出满分简历",
    subtitle: "系列公益讲座本周五晚开启",
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=2000",
    cta: "免费预约",
  },
  {
    id: 3,
    title: "从校园到职场：第一份工作怎么选？",
    subtitle: "多位名企高管在线解答你的疑惑",
    image:
      "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&q=80&w=2000",
    cta: "进入专场",
  },
];

const MENTORS = [
  {
    id: 1,
    name: "陈经理",
    title: "某互联网大厂HRD",
    avatar:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400",
    tags: ["简历指导", "模拟面试"],
  },
  {
    id: 2,
    name: "张工",
    title: "高级前端架构师",
    avatar:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400",
    tags: ["技术面", "职业规划"],
  },
  {
    id: 3,
    name: "王总监",
    title: "知名快消品牌市场总监",
    avatar:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=400",
    tags: ["群面技巧", "营销方向"],
  },
  {
    id: 4,
    name: "李行长",
    title: "国有大行资深面试官",
    avatar:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=400",
    tags: ["金融求职", "结构化面试"],
  },
  {
    id: 5,
    name: "赵博士",
    title: "常青藤海归/咨询顾问",
    avatar:
      "https://images.unsplash.com/photo-1598550874175-4d0ef436c909?auto=format&fit=crop&q=80&w=400",
    tags: ["Case Interview", "留学求职"],
  },
];

const COURSES = [
  {
    id: 1,
    title: "零基础掌握 Python 数据分析",
    mentor: "刘老师",
    views: "1.2w",
    cover:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=600",
    rating: 4.8,
  },
  {
    id: 2,
    title: "校招简历怎么写才能过海选？",
    mentor: "陈经理",
    views: "3.5w",
    cover:
      "https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&q=80&w=600",
    rating: 4.9,
  },
  {
    id: 3,
    title: "群面 (无领导小组) 角色定位与实战",
    mentor: "王总监",
    views: "2.8w",
    cover:
      "https://images.unsplash.com/photo-1515169067868-5387ec356754?auto=format&fit=crop&q=80&w=600",
    rating: 4.7,
  },
  {
    id: 4,
    title: "Java 后端开发高频面试题精讲",
    mentor: "周架构",
    views: "4.1w",
    cover:
      "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=600",
    rating: 5.0,
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
    <div className="bg-white">
      {/* 1. Hero Carousel */}
      <section className="relative h-[400px] sm:h-[500px] lg:h-[600px] w-full overflow-hidden bg-gray-900 flex items-center justify-center">
          <div className="relative w-full h-full flex items-center justify-center">
            {HERO_SLIDES.map((slide, index) => {
              // Calculate relative position based on currentSlide
              let position = "hidden";
              let zIndex = 0;
              let scale = 0.8;
              let x = "0%";
              let opacity = 0;

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
              }

              return (
                <motion.div
                  key={slide.id}
                  initial={false}
                  animate={{
                    opacity: opacity,
                    x: x,
                    scale: scale,
                    zIndex: zIndex,
                  }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  className="absolute w-[70%] h-full flex items-center justify-center cursor-pointer"
                  style={{ pointerEvents: position === "hidden" ? "none" : "auto" }}
                  onClick={() => {
                    if (position === "prev") prevSlide();
                    if (position === "next") nextSlide();
                  }}
                >
                  <div className="absolute inset-0 bg-black/40 z-10 rounded-[20px]" />
                  <img
                    src={slide.image}
                    alt={slide.title}
                    className={`w-full ${position === "active" ? "h-full shadow-2xl" : "h-[90%] shadow-lg"} object-cover rounded-[20px]`}
                  />
                  {position === "active" && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center text-center">
                      <div className="max-w-3xl px-4">
                        <motion.h1
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0.2 }}
                          className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4"
                        >
                          {slide.title}
                        </motion.h1>
                        <motion.p
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0.3 }}
                          className="text-lg sm:text-xl text-gray-200 mb-8"
                        >
                          {slide.subtitle}
                        </motion.p>
                        <motion.button
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0.4 }}
                          className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-full font-medium text-lg transition-colors shadow-md"
                        >
                          {slide.cta}
                        </motion.button>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

        {/* Carousel Controls */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
        >
          <ChevronRight size={24} />
        </button>

        {/* Indicators */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex space-x-2">
          {HERO_SLIDES.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${index === currentSlide ? "bg-white w-8" : "bg-white/50"}`}
            />
          ))}
        </div>
      </section>

      {/* 2. 推荐导师 (Featured Mentors) */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              大咖导师推荐
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              与行业资深前辈1v1交流，获取第一手职场经验
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
            {MENTORS.map((mentor) => (
              <Link
                key={mentor.id}
                to={`/mentors/${mentor.id}`}
                className="group block"
              >
                <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-2">
                  <div className="aspect-w-1 aspect-h-1 w-full">
                    <img
                      src={mentor.avatar}
                      alt={mentor.name}
                      className="h-48 w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-4 text-center">
                    <h3 className="text-lg font-bold text-gray-900">
                      {mentor.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 h-10 line-clamp-2">
                      {mentor.title}
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-1">
                      {mentor.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-block px-2 py-1 text-xs bg-primary-50 text-primary-700 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              to="/mentors"
              className="inline-flex items-center text-primary-600 font-medium hover:text-primary-700"
            >
              查看全部导师 <ChevronRight className="ml-1 h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 3. 免费公开课精选 (Free Courses) */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                免费公开课精选
              </h2>
              <p className="mt-4 text-lg text-gray-500">
                海量免费干货，提升你的求职硬实力
              </p>
            </div>
            <Link
              to="/courses"
              className="hidden sm:flex items-center text-gray-500 hover:text-primary-600 font-medium transition-colors"
            >
              更多课程 <ChevronRight className="h-5 w-5 ml-1" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {COURSES.map((course) => (
              <Link
                key={course.id}
                to={`/courses/${course.id}`}
                className="group"
              >
                <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col h-full">
                  <div className="relative aspect-video overflow-hidden">
                    <img
                      src={course.cover}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center text-primary-600 pl-1">
                        <Play fill="currentColor" size={24} />
                      </div>
                    </div>
                  </div>
                  <div className="p-5 flex-grow flex flex-col">
                    <h3 className="text-lg font-bold text-gray-900 line-clamp-2 group-hover:text-primary-600 transition-colors">
                      {course.title}
                    </h3>
                    <div className="mt-auto pt-4 flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center">
                        <Star
                          className="h-4 w-4 text-yellow-400 mr-1"
                          fill="currentColor"
                        />
                        <span>{course.rating}</span>
                        <span className="mx-2">·</span>
                        <span>{course.mentor}</span>
                      </div>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        <span>{course.views}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 4. CTA Section */}
      <section className="bg-primary-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            准备好开启你的职场生涯了吗？
          </h2>
          <p className="text-primary-100 text-xl mb-8 max-w-2xl mx-auto">
            加入我们，获取专属求职规划、免费内推机会以及更多求职资源。
          </p>
          <div className="flex justify-center gap-4">
            <Link
              to="/register?role=student"
              className="bg-white text-primary-600 px-8 py-3 rounded-full font-bold hover:bg-gray-50 transition-colors shadow-lg"
            >
              学生注册
            </Link>
            <Link
              to="/join/company"
              className="bg-primary-700 text-white border border-primary-500 px-8 py-3 rounded-full font-bold hover:bg-primary-800 transition-colors"
            >
              企业入驻
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
