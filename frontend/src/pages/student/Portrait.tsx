import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  User, Target, Briefcase, BookOpen, Star, Plus, X,
  Save, Sparkles, TrendingUp, Heart, Code, Globe,
  Megaphone,
  GraduationCap, Lightbulb, ChevronRight
} from 'lucide-react';
import { useToast } from '../../components/ui';
import http from '../../api/http';
import ErrorState from '../../components/ui/ErrorState';

// ====== 预设标签库 ======

const SKILL_PRESETS = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'Go', 'Rust',
  'React', 'Vue', 'Angular', 'Node.js', 'Spring Boot', 'Django',
  'MySQL', 'PostgreSQL', 'MongoDB', 'Redis',
  'Docker', 'Kubernetes', 'AWS', 'Git',
  'UI/UX 设计', 'Figma', 'Photoshop',
  '数据分析', 'Excel', 'Tableau', 'Power BI',
  '机器学习', 'TensorFlow', 'PyTorch',
  '英语 CET-6', '日语 N2', '雅思 7+',
  '项目管理', '团队协作', '公众演讲', '文案写作',
];

const INTEREST_PRESETS = [
  '人工智能', '前端开发', '后端开发', '全栈开发', '移动开发',
  '数据科学', '云计算', '网络安全', '区块链', '物联网',
  '产品设计', '用户体验', '数字营销', '内容运营',
  '金融科技', '教育科技', '医疗健康', '新能源',
  '游戏开发', '音视频技术', '嵌入式系统',
];

const INDUSTRY_PRESETS = [
  '互联网/科技', '金融/银行', '咨询/管理', '教育/培训',
  '医疗/健康', '制造/工业', '零售/电商', '传媒/广告',
  '房地产', '能源/环保', '政府/公共事业', '法律/合规',
  '物流/供应链', '汽车/交通', '文化/娱乐', '农业/食品',
];

const CAREER_GOALS = [
  { label: '求职就业', icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
  { label: '考研深造', icon: GraduationCap, color: 'text-primary-600', bg: 'bg-primary-50' },
  { label: '出国留学', icon: Globe, color: 'text-primary-600', bg: 'bg-primary-50' },
  { label: '考公考编', icon: BookOpen, color: 'text-amber-600', bg: 'bg-amber-50' },
  { label: '创业创新', icon: Lightbulb, color: 'text-rose-600', bg: 'bg-rose-50' },
  { label: '自由职业', icon: Star, color: 'text-green-600', bg: 'bg-green-50' },
];

// ====== 维度图标映射 ======
const DIMENSION_ICONS: Record<string, typeof Code> = {
  '技术能力': Code,
  '沟通表达': Megaphone,
  '创新思维': Lightbulb,
  '团队协作': Heart,
  '学习能力': TrendingUp,
  '专业知识': BookOpen,
};

// ====== 标签选择器组件 ======
function TagSelector({
  label,
  presets,
  selected,
  onChange,
  maxTags = 15,
}: {
  label: string;
  presets: string[];
  selected: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
}) {
  const [customInput, setCustomInput] = useState('');

  const toggleTag = (tag: string) => {
    if (selected.includes(tag)) {
      onChange(selected.filter(t => t !== tag));
    } else if (selected.length < maxTags) {
      onChange([...selected, tag]);
    }
  };

  const addCustom = () => {
    const trimmed = customInput.trim();
    if (trimmed && !selected.includes(trimmed) && selected.length < maxTags) {
      onChange([...selected, trimmed]);
      setCustomInput('');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">{label}</h3>
        <span className="text-xs text-gray-400">{selected.length}/{maxTags}</span>
      </div>

      {/* 已选标签 */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-50 text-primary-700 text-xs font-medium rounded-full"
            >
              {tag}
              <button onClick={() => toggleTag(tag)} className="hover:text-primary-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* 自定义输入 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustom())}
          placeholder="输入自定义标签，回车添加"
          className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
        />
        <button
          onClick={addCustom}
          disabled={!customInput.trim() || selected.length >= maxTags}
          className="px-3 py-1.5 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* 预设标签 */}
      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
        {presets.filter(p => !selected.includes(p)).map(tag => (
          <button
            key={tag}
            onClick={() => toggleTag(tag)}
            disabled={selected.length >= maxTags}
            className="px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded-full hover:bg-primary-50 hover:text-primary-600 disabled:opacity-40 transition-colors"
          >
            + {tag}
          </button>
        ))}
      </div>
    </div>
  );
}

// ====== 简易雷达图（纯 SVG） ======
function RadarChart({ dimensions }: { dimensions: { name: string; value: number }[] }) {
  const size = 200;
  const center = size / 2;
  const radius = 70;
  const n = dimensions.length;

  const getPoint = (i: number, r: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  // 背景网格
  const gridLevels = [0.25, 0.5, 0.75, 1];
  const gridPaths = gridLevels.map(level => {
    const points = Array.from({ length: n }, (_, i) => getPoint(i, radius * level));
    return points.map(p => `${p.x},${p.y}`).join(' ');
  });

  // 数据多边形
  const dataPoints = dimensions.map((d, i) => getPoint(i, radius * (d.value / 100)));
  const dataPath = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[240px] mx-auto">
      {/* 网格 */}
      {gridPaths.map((points, i) => (
        <polygon
          key={i}
          points={points}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="0.5"
        />
      ))}
      {/* 轴线 */}
      {Array.from({ length: n }, (_, i) => {
        const p = getPoint(i, radius);
        return (
          <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="#e5e7eb" strokeWidth="0.5" />
        );
      })}
      {/* 数据区域 */}
      <polygon
        points={dataPath}
        fill="rgba(20, 184, 166, 0.2)"
        stroke="#14b8a6"
        strokeWidth="2"
      />
      {/* 数据点 */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#14b8a6" />
      ))}
      {/* 标签 */}
      {dimensions.map((d, i) => {
        const p = getPoint(i, radius + 20);
        return (
          <text
            key={i}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-[10px] fill-gray-600 font-medium"
          >
            {d.name}
          </text>
        );
      })}
    </svg>
  );
}

// ====== 主组件 ======
export default function StudentPortrait() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // 画像数据
  const [skills, setSkills] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [careerGoals, setCareerGoals] = useState<string[]>([]);
  const [selfIntro, setSelfIntro] = useState('');

  // 能力维度（自评 0-100）
  const [dimensions, setDimensions] = useState([
    { name: '技术能力', value: 60 },
    { name: '沟通表达', value: 50 },
    { name: '创新思维', value: 55 },
    { name: '团队协作', value: 70 },
    { name: '学习能力', value: 75 },
    { name: '专业知识', value: 65 },
  ]);

  // 加载画像数据
  useEffect(() => {
    const fetchPortrait = async () => {
      try {
        const res = await http.get('/student/portrait');
        if (res.data?.data) {
          const d = res.data.data;
          if (d.skills) setSkills(d.skills);
          if (d.interests) setInterests(d.interests);
          if (d.industries) setIndustries(d.industries);
          if (d.career_goals) setCareerGoals(d.career_goals);
          if (d.self_intro) setSelfIntro(d.self_intro);
          if (d.dimensions) setDimensions(d.dimensions);
        }
      } catch {
        setError('画像数据加载失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };
    fetchPortrait();
  }, []);

  // 保存画像
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await http.put('/student/portrait', {
        skills,
        interests,
        industries,
        career_goals: careerGoals,
        self_intro: selfIntro,
        dimensions,
      });
      toast.success('画像已保存', '系统将根据你的画像推荐更匹配的内容');
    } catch {
      toast.error('保存失败', '请稍后重试');
    } finally {
      setSaving(false);
    }
  }, [skills, interests, industries, careerGoals, selfIntro, dimensions, toast]);

  const toggleCareerGoal = (label: string) => {
    setCareerGoals(prev =>
      prev.includes(label) ? prev.filter(g => g !== label) : [...prev, label]
    );
  };

  if (loading) {
    return (
      <div className="container-narrow py-8 space-y-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-32 mb-4" />
            <div className="h-4 bg-gray-100 rounded w-full mb-2" />
            <div className="h-4 bg-gray-100 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-narrow py-8">
        <ErrorState
          message={error}
          onRetry={() => {
            setError(null);
            setLoading(true);
            // Re-trigger the useEffect by calling fetch directly
            const retryFetch = async () => {
              try {
                const res = await http.get('/student/portrait');
                if (res.data?.data) {
                  const d = res.data.data;
                  if (d.skills) setSkills(d.skills);
                  if (d.interests) setInterests(d.interests);
                  if (d.industries) setIndustries(d.industries);
                  if (d.career_goals) setCareerGoals(d.career_goals);
                  if (d.self_intro) setSelfIntro(d.self_intro);
                  if (d.dimensions) setDimensions(d.dimensions);
                }
              } catch {
                setError('画像数据加载失败，请稍后重试');
              } finally {
                setLoading(false);
              }
            };
            retryFetch();
          }}
        />
      </div>
    );
  }

  return (
    <div className="container-narrow py-8 space-y-6">
      {/* 页头 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary-500" />
            我的画像
          </h1>
          <p className="text-gray-500 mt-1">完善你的个人画像，获得更精准的岗位和课程推荐</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-60 transition-colors text-sm font-medium shadow-lg shadow-primary-500/20"
        >
          <Save className="w-4 h-4" />
          {saving ? '保存中...' : '保存画像'}
        </button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：编辑区 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 职业目标 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white rounded-xl border border-gray-200 p-6"
          >
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary-500" />
              职业目标
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CAREER_GOALS.map(goal => {
                const isSelected = careerGoals.includes(goal.label);
                return (
                  <button
                    key={goal.label}
                    onClick={() => toggleCareerGoal(goal.label)}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${goal.bg}`}>
                      <goal.icon className={`w-4 h-4 ${goal.color}`} />
                    </div>
                    <span className={`text-sm font-medium ${isSelected ? 'text-primary-700' : 'text-gray-700'}`}>
                      {goal.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* 技能标签 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl border border-gray-200 p-6"
          >
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Code className="w-5 h-5 text-primary-500" />
              技能标签
            </h2>
            <TagSelector
              label="选择或输入你掌握的技能"
              presets={SKILL_PRESETS}
              selected={skills}
              onChange={setSkills}
            />
          </motion.div>

          {/* 兴趣方向 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-xl border border-gray-200 p-6"
          >
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary-500" />
              兴趣方向
            </h2>
            <TagSelector
              label="选择你感兴趣的技术/领域方向"
              presets={INTEREST_PRESETS}
              selected={interests}
              onChange={setInterests}
              maxTags={10}
            />
          </motion.div>

          {/* 目标行业 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl border border-gray-200 p-6"
          >
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary-500" />
              目标行业
            </h2>
            <TagSelector
              label="选择你期望进入的行业"
              presets={INDUSTRY_PRESETS}
              selected={industries}
              onChange={setIndustries}
              maxTags={5}
            />
          </motion.div>

          {/* 自我介绍 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white rounded-xl border border-gray-200 p-6"
          >
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary-500" />
              一句话介绍自己
            </h2>
            <textarea
              value={selfIntro}
              onChange={(e) => setSelfIntro(e.target.value)}
              placeholder="例如：计算机专业大三学生，热爱前端开发，正在寻找暑期实习机会..."
              maxLength={200}
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{selfIntro.length}/200</p>
          </motion.div>
        </div>

        {/* 右侧：能力雷达 + 画像预览 */}
        <div className="space-y-6">
          {/* 能力自评雷达图 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl border border-gray-200 p-6"
          >
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-500" />
              能力自评
            </h2>
            <RadarChart dimensions={dimensions} />
            <div className="mt-4 space-y-3">
              {dimensions.map((dim, idx) => {
                const DimIcon = DIMENSION_ICONS[dim.name] || Star;
                return (
                  <div key={dim.name} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600 flex items-center gap-1.5">
                        <DimIcon className="w-3.5 h-3.5 text-gray-400" />
                        {dim.name}
                      </span>
                      <span className="text-xs font-medium text-primary-600">{dim.value}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={dim.value}
                      onChange={(e) => {
                        const newDims = [...dimensions];
                        newDims[idx] = { ...dim, value: parseInt(e.target.value, 10) || 0 };
                        setDimensions(newDims);
                      }}
                      className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-primary-500"
                    />
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* 画像完成度 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl p-6 text-white"
          >
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              画像完成度
            </h3>
            {(() => {
              const items = [
                { label: '职业目标', done: careerGoals.length > 0 },
                { label: '技能标签', done: skills.length >= 3 },
                { label: '兴趣方向', done: interests.length >= 2 },
                { label: '目标行业', done: industries.length >= 1 },
                { label: '自我介绍', done: selfIntro.length >= 10 },
                { label: '能力自评', done: true },
              ];
              const doneCount = items.filter(i => i.done).length;
              const pct = Math.round((doneCount / items.length) * 100);
              return (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="text-3xl font-bold">{pct}%</div>
                    <div className="flex-1">
                      <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-white rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.4, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {items.map(item => (
                      <li key={item.label} className="flex items-center gap-2 text-sm">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                          item.done ? 'bg-white text-primary-600' : 'bg-white/20'
                        }`}>
                          {item.done && <ChevronRight className="w-3 h-3" />}
                        </div>
                        <span className={item.done ? 'text-white' : 'text-white/60'}>{item.label}</span>
                      </li>
                    ))}
                  </ul>
                </>
              );
            })()}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
