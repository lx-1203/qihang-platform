import { useState } from "react";
import {
  BarChart,
  Users,
  Play,
  Clock,
  TrendingUp,
  MoreVertical,
  Plus,
} from "lucide-react";

const STATS = [
  {
    label: "总浏览量",
    value: "45.2w",
    change: "+12%",
    icon: Play,
    color: "text-blue-500",
    bg: "bg-blue-50",
  },
  {
    label: "累计学员",
    value: "1,250",
    change: "+5.4%",
    icon: Users,
    color: "text-green-500",
    bg: "bg-green-50",
  },
  {
    label: "本周辅导",
    value: "15",
    change: "-2",
    icon: Clock,
    color: "text-purple-500",
    bg: "bg-purple-50",
  },
  {
    label: "综合评分",
    value: "4.9",
    change: "+0.1",
    icon: TrendingUp,
    color: "text-orange-500",
    bg: "bg-orange-50",
  },
];

const RECENT_COURSES = [
  {
    id: 1,
    title: "校招简历怎么写才能过海选？",
    views: "12k",
    students: 850,
    status: "已发布",
  },
  {
    id: 2,
    title: "大厂群面通关秘籍",
    views: "8.5k",
    students: 400,
    status: "审核中",
  },
  {
    id: 3,
    title: "1V1 模拟面试录像回放 (案例分析)",
    views: "3.2k",
    students: 150,
    status: "草稿",
  },
];

export default function MentorDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">早安，陈经理</h1>
          <p className="text-gray-500 mt-1">
            这里是你最近的数据总览，看看大家都在学习什么吧。
          </p>
        </div>
        <button className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm">
          <Plus size={20} />
          发布新课程
        </button>
      </div>

      {/* 数据概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {STATS.map((stat, idx) => (
          <div
            key={idx}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-start justify-between"
          >
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">
                {stat.label}
              </p>
              <h3 className="text-3xl font-bold text-gray-900">{stat.value}</h3>
              <div className="flex items-center gap-1 mt-2 text-sm">
                <span
                  className={
                    stat.change.startsWith("+")
                      ? "text-green-500"
                      : "text-red-500"
                  }
                >
                  {stat.change}
                </span>
                <span className="text-gray-400">较上周</span>
              </div>
            </div>
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}
            >
              <stat.icon size={24} />
            </div>
          </div>
        ))}
      </div>

      {/* 下方内容区 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        {/* 近期课程 (占 2/3) */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900">近期课程管理</h3>
            <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              查看全部
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {RECENT_COURSES.map((course) => (
              <div
                key={course.id}
                className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Video size={24} className="text-gray-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">
                      {course.title}
                    </h4>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>播放: {course.views}</span>
                      <span>学员: {course.students}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <span
                    className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                      course.status === "已发布"
                        ? "bg-green-50 text-green-600"
                        : course.status === "审核中"
                          ? "bg-orange-50 text-orange-600"
                          : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {course.status}
                  </span>
                  <button className="text-gray-400 hover:text-gray-600">
                    <MoreVertical size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 待办事项 (占 1/3) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="px-6 py-5 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">
              近期辅导预约 (待确认)
            </h3>
          </div>
          <div className="p-6 space-y-4">
            {[1, 2, 3].map((_, idx) => (
              <div
                key={idx}
                className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 hover:border-primary-200 transition-colors cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center shrink-0">
                  李
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-gray-900 text-sm">
                      李同学 (清华大学)
                    </h4>
                    <span className="text-xs text-orange-500 font-medium whitespace-nowrap">
                      今天 19:00
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    预约服务：简历精修与诊断
                  </p>
                  <div className="flex gap-2">
                    <button className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors">
                      接受
                    </button>
                    <button className="flex-1 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 px-3 py-1.5 rounded-md text-xs font-medium transition-colors">
                      调整时间
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
