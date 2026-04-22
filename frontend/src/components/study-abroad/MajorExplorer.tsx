import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Tag from '@/components/ui/Tag';
import {
  Monitor,
  TrendingUp,
  Cpu,
  BookOpen,
  Heart,
  Palette,
  Target,
  ChevronRight,
  Flame,
} from 'lucide-react';
import { useConfigStore } from '@/store/config';

// ---------- 类型定义 ----------

interface Major {
  id: string;
  name: string;
  nameEn: string;
  desc: string;
  hot: boolean;
  avgSalary: string;
  topCountries: string[];
  topSchools: string[];
  careerPaths: string[];
}

interface MajorCategory {
  category: string;
  icon: string;
  color: string;
  majors: Major[];
}

// ---------- 默认配置兜底 ----------

const DEFAULT_STUDY_ABROAD_MAJORS_CONFIG: MajorCategory[] = [
  { category: '计算机与数据', icon: 'Laptop', color: 'blue', majors: [
    { id: 'cs101', name: '计算机科学 CS', nameEn: 'Computer Science', desc: '涵盖算法、系统、AI、软件工程等核心领域', hot: true, avgSalary: '£45,000-95,000/年', topCountries: ['us','uk','sg','ca'], topSchools: ['MIT','Stanford','CMU','ETH Zurich','NUS','UCL'], careerPaths: ['Software Engineer','Data Scientist','ML Engineer','Product Manager','Tech Consultant'] },
    { id: 'ds102', name: '数据科学 DS', nameEn: 'Data Science', desc: '统计学+编程+机器学习的交叉学科', hot: true, avgSalary: '$70,000-120,000/年', topCountries: ['us','sg','uk','hk'], topSchools: ['Columbia','Imperial College','NUS','HKU','Carnegie Mellon'], careerPaths: ['Data Scientist','ML Engineer','Business Analyst','Research Scientist','Quant Analyst'] },
    { id: 'ai103', name: '人工智能 AI', nameEn: 'Artificial Intelligence', desc: '深度学习、NLP、CV等前沿技术方向', hot: true, avgSalary: '£55,000-110,000/年', topCountries: ['uk','us','sg','eu'], topSchools: ['Oxford','Cambridge','Imperial','ETHZ','NTU'], careerPaths: ['AI Researcher','ML Engineer','NLP Engineer','Computer Vision Engineer','AI Product Manager'] },
    { id: 'ba104', name: '商业分析 BA', nameEn: 'Business Analytics', desc: '商业思维+数据分析能力', hot: true, avgSalary: '$65,000-100,000/年', topCountries: ['us','hk','sg','uk'], topSchools: ['MIT Sloan','NUS BA','HKU MFin','UT Austin','Warwick'], careerPaths: ['Business Analyst','Data Analyst','Consultant','Strategy Manager','Operations Manager'] },
    { id: 'it105', name: '信息技术 IT', nameEn: 'Information Technology', desc: '偏应用的IT管理、网络安全、云计算等方向', hot: false, avgSalary: 'A$75,000-105,000/年', topCountries: ['au','ca','uk'], topSchools: ['Melbourne Uni','UBC','Manchester','Monash','Waterloo'], careerPaths: ['IT Manager','Cybersecurity Analyst','Cloud Architect','Systems Administrator','DevOps Engineer'] },
  ]},
  { category: '商科与金融', icon: 'TrendingUp', color: 'emerald', majors: [
    { id: 'fin201', name: '金融学 Finance', nameEn: 'Finance / Financial Engineering', desc: '金融理论、量化投资、风险管理等', hot: true, avgSalary: 'HK$35K-60K/月', topCountries: ['hk','us','uk','sg'], topSchools: ['HKU MFin','LBS','NYU Stern','Princeton MFin','NUS RMI'], careerPaths: ['Investment Banker','Quantitative Analyst','Portfolio Manager','Risk Manager','Financial Consultant'] },
  ]},
  { category: '工程与技术', icon: 'Cpu', color: 'indigo', majors: [
    { id: 'ee301', name: '电子电气工程 ECE', nameEn: 'Electrical and Computer Engineering', desc: '芯片设计、通信系统、嵌入式开发等', hot: false, avgSalary: 'C$72,000-98,000/年', topCountries: ['ca','us','eu','sg'], topSchools: ['MIT EECS','Stanford EE','ETHZ EE','Waterloo ECE','NTU EEE'], careerPaths: ['Hardware Engineer','Chip Design Engineer','RF Engineer','Embedded Systems Dev','Power Systems Engineer'] },
  ]},
  { category: '人文社科', icon: 'BookOpen', color: 'rose', majors: [
    { id: 'edu401', name: '教育学 Education', nameEn: 'Education / TESOL', desc: '教育政策、课程设计、英语教学等方向', hot: true, avgSalary: '£30,000-45,000/年', topCountries: ['uk','hk','au','ca'], topSchools: ['UCL IOE','Harvard GSE','HKU Education','Toronto OISE','Melbourne MGSE'], careerPaths: ['Teacher/Lecturer','Curriculum Designer','EdTech Product Manager','TESOL Instructor','Education Policy Analyst'] },
  ]},
  { category: '医学与健康', icon: 'HeartPulse', color: 'red', majors: [
    { id: 'med501', name: '公共卫生 MPH', nameEn: 'Master of Public Health', desc: '流行病学、卫生政策、全球健康等', hot: true, avgSalary: '$62,000-95,000/年', topCountries: ['us','uk','au'], topSchools: ['Johns Hopkins SPH','Harvard Chan','LSHTM London','Uni of Sydney Public Health','Emory Rollins'], careerPaths: ['Epidemiologist','Health Policy Analyst','Global Health Consultant','Biostatistician','Healthcare Administrator'] },
  ]},
  { category: '艺术与设计', icon: 'Palette', color: 'purple', majors: [
    { id: 'art601', name: '交互设计 Interaction Design', nameEn: 'Interaction Design / UX Design', desc: 'UI/UX设计、产品设计、服务设计等', hot: true, avgSalary: '£35,000-58,000/年', topCountries: ['uk','us','eu'], topSchools: ['RCA IDE','UAL LCC','MIT Media Lab','TU Delft ID','Politecnico Milano Design'], careerPaths: ['UX/UI Designer','Interaction Designer','Product Designer','Service Designer','Design Researcher'] },
  ]},
];

// ---------- 图标 & 颜色映射 ----------

const iconMap: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  Laptop: Monitor,
  TrendingUp,
  Cpu,
  BookOpen,
  HeartPulse: Heart,
  Palette,
};

const colorMap: Record<string, { text: string; bg: string }> = {
  blue: { text: 'text-blue-500', bg: 'bg-blue-50' },
  emerald: { text: 'text-emerald-500', bg: 'bg-emerald-50' },
  teal: { text: 'text-primary-500', bg: 'bg-primary-50' },
  rose: { text: 'text-rose-500', bg: 'bg-rose-50' },
  red: { text: 'text-red-500', bg: 'bg-red-50' },
  primary: { text: 'text-primary-500', bg: 'bg-primary-50' },
};

// ---------- 常量 ----------

const MAX_VISIBLE = 4;

// ---------- 组件 ----------

export default function MajorExplorer() {
  // 每个分类独立的展开状态
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (category: string) =>
    setExpanded((prev) => ({ ...prev, [category]: !prev[category] }));

  const categories = useConfigStore().getJson<MajorCategory[]>('study_abroad_majors_config', DEFAULT_STUDY_ABROAD_MAJORS_CONFIG);

  return (
    <section className="py-12">
      {/* 标题 */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-500/10">
          <Target className="text-primary-500" size={22} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          <span className="mr-1">🎯</span>探索专业方向
        </h2>
      </div>

      {/* 3×2 网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {categories.map((cat, idx) => {
          const Icon = iconMap[cat.icon] ?? Monitor;
          const colors = colorMap[cat.color] ?? colorMap.blue;
          const isExpanded = !!expanded[cat.category];
          const visibleMajors = isExpanded
            ? cat.majors
            : cat.majors.slice(0, MAX_VISIBLE);
          const hasMore = cat.majors.length > MAX_VISIBLE;

          return (
            <motion.div
              key={cat.category}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-5 flex flex-col"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
            >
              {/* 头部：图标 + 分类名 + 数量角标 */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`flex items-center justify-center w-9 h-9 rounded-lg ${colors.bg}`}
                >
                  <Icon className={colors.text} size={20} />
                </div>
                <h3 className="text-base font-bold text-gray-900">
                  {cat.category}
                </h3>
                <Tag variant="gray" size="sm" className="ml-auto">
                  {cat.majors.length} 个专业
                </Tag>
              </div>

              {/* 专业列表 */}
              <ul className="flex-1 space-y-1">
                {visibleMajors.map((major) => (
                  <li key={major.id}>
                    <Link
                      to={`/study-abroad/programs?major=${encodeURIComponent(major.name)}`}
                      className="group flex items-center justify-between rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
                    >
                      <span className="flex items-center gap-1.5 text-sm text-gray-900 group-hover:text-primary-500 transition-colors">
                        {major.name}
                        {major.hot && (
                          <Flame
                            size={14}
                            className="text-orange-500 flex-shrink-0"
                          />
                        )}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        {major.avgSalary}
                        <ChevronRight
                          size={14}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-primary-500"
                        />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>

              {/* 查看更多 / 收起 */}
              {hasMore && (
                <button
                  onClick={() => toggle(cat.category)}
                  className="mt-3 text-sm font-medium text-primary-500 hover:text-primary-700 transition-colors self-start flex items-center gap-1"
                >
                  {isExpanded ? '收起' : '查看更多'}
                  <ChevronRight
                    size={14}
                    className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  />
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
