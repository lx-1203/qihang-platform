import { Rocket, Lightbulb, Users, Trophy } from 'lucide-react';
import Breadcrumb from '@/components/ui/Breadcrumb';

/**
 * 创新创业板块 - 占位页面
 *
 * 当前为占位状态，未来扩展功能包括：
 * - 竞赛列表（热门赛事推荐）
 * - 组队大厅（合伙人招募）
 * - 创业资料库
 * - 创业指导与资源对接
 *
 * 数据结构预留：
 * - Competition: 竞赛信息（id, title, level, status, deadline, tags, registration_url, image, link）
 * - Resource: 创业资料（id, title, description）
 * - TeamRecruitment: 组队招募信息
 */

// 未来扩展时使用的接口定义（预留）
export interface Competition {
  id: number;
  title?: string;
  name?: string;
  level: string;
  status: string;
  deadline: string;
  tags?: string[];
  registration_url?: string;
  image?: string;
  link?: string;
}

export interface Resource {
  id: number;
  title: string;
  description: string;
}

export interface TeamRecruitment {
  id: number;
  title: string;
  description: string;
  author: string;
  tags?: string[];
}

/** 即将上线的功能模块 */
const UPCOMING_FEATURES = [
  {
    icon: Trophy,
    title: '热门赛事',
    desc: '汇聚各类创新创业大赛，从校级到国家级，一站式获取赛事信息与报名入口',
  },
  {
    icon: Users,
    title: '组队大厅',
    desc: '寻找志同道合的创业伙伴，快速组建你的初创团队',
  },
  {
    icon: Lightbulb,
    title: '创业资料库',
    desc: '商业计划书模板、融资指南、政策解读等实用资料一应俱全',
  },
  {
    icon: Rocket,
    title: '创业指导',
    desc: '对接行业导师与天使投资，让每一个好想法都有机会落地',
  },
];

export default function Entrepreneurship() {
  return (
    <div className="min-h-screen bg-gray-50 pt-8 pb-16">
      <div className="container-main">
        {/* 面包屑导航 */}
        <Breadcrumb items={[{ label: '首页', path: '/' }, { label: '创业' }]} />

        {/* 页面标题区域 */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 text-orange-600 border border-orange-100 text-sm font-medium mb-6">
            <Rocket className="w-4 h-4" />
            创业板块
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            创业
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
            创新创业板块正在建设中，敬请期待更多功能。我们将为你提供赛事资讯、团队组建、创业资源等全方位支持。
          </p>
        </div>

        {/* 功能预告卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {UPCOMING_FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md hover:border-orange-500/30 transition-all"
              >
                <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-orange-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* 建设中提示 */}
        <div className="bg-gradient-to-b from-orange-50 to-white rounded-2xl border border-orange-100 p-8 text-center">
          <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/20">
            <Rocket className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            正在建设中
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto">
            我们正在精心打造创新创业板块，未来将为你带来更丰富的创业资源与更便捷的团队组建体验。敬请期待！
          </p>
        </div>
      </div>
    </div>
  );
}
