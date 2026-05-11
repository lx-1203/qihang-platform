import { useEffect, useState, useCallback } from 'react';
import { GraduationCap, Award, Globe, Clock, ChevronRight, Loader2 } from 'lucide-react';
import http from '@/api/http';
import { useConfigStore } from '@/store/config';
import Breadcrumb from '@/components/ui/Breadcrumb';

// ====== 类型定义 ======
type Direction = 'postgrad' | 'recommend' | 'abroad';

interface TimelineItem {
  id: number;
  direction: Direction;
  month: string;
  title: string;
  description: string;
  sort_order: number;
}

interface CaseItem {
  id: number;
  direction: Direction;
  name: string;
  school: string;
  result: string;
  quote: string;
  avatar: string;
  sort_order: number;
}

// ====== Tab 配置 ======
const TABS: { key: Direction; name: string; icon: React.ReactNode; description: string }[] = [
  {
    key: 'postgrad',
    name: '考研',
    icon: <GraduationCap className="w-4 h-4" />,
    description: '围绕备考节奏、目标院校选择与复试准备，整理成一条连续路径。',
  },
  {
    key: 'recommend',
    name: '保研',
    icon: <Award className="w-4 h-4" />,
    description: '把绩点、科研、竞赛、夏令营和预推免放在同一条准备线上管理。',
  },
  {
    key: 'abroad',
    name: '留学',
    icon: <Globe className="w-4 h-4" />,
    description: '按国家选择、语言准备、网申递交和录取签证拆成清晰节点。',
  },
];

// ====== 配置中心 fallback 数据 ======
const FALLBACK_TIMELINES: Record<Direction, Omit<TimelineItem, 'id' | 'direction'>[]> = {
  postgrad: [
    { month: '3月-5月', title: '基础复习阶段', description: '确定目标院校和专业，搜集考研大纲和真题，开始英语和专业课基础轮复习。', sort_order: 1 },
    { month: '6月-8月', title: '强化提高阶段', description: '暑期黄金复习期，各科全面展开，参加辅导班或集中刷题，攻克重难点。', sort_order: 2 },
    { month: '9月-10月', title: '报名与冲刺阶段', description: '关注招生简章，完成网上报名。政治开始复习，进行全真模拟训练。', sort_order: 3 },
    { month: '11月-12月', title: '考前押题与心态调整', description: '背诵核心考点，查漏补缺，调整作息规律，保持良好心态迎接初试。', sort_order: 4 },
    { month: '次年1月-2月', title: '初试与成绩查询', description: '参加全国硕士研究生统一招生考试，关注初试成绩公布及国家线/院线。', sort_order: 5 },
    { month: '次年3月-4月', title: '复试与调剂', description: '准备专业课笔试与面试，关注调剂信息，及时填报调剂志愿。', sort_order: 6 },
  ],
  recommend: [
    { month: '大一-大二', title: '夯实学业基础', description: '保持高绩点（GPA 3.5+），积极参加学科竞赛和科研项目，积累学术成果。', sort_order: 1 },
    { month: '大三上学期', title: '科研与论文产出', description: '深入参与导师课题，争取发表核心期刊论文或申请专利，提升学术竞争力。', sort_order: 2 },
    { month: '大三下学期（5月-6月）', title: '夏令营信息搜集', description: '关注目标院校夏令营通知，准备申请材料：成绩单、推荐信、研究计划。', sort_order: 3 },
    { month: '大三暑假（7月-8月）', title: '参加夏令营', description: '参加各校优秀大学生夏令营，争取获得优秀营员资格，锁定预录取名额。', sort_order: 4 },
    { month: '大四上学期（9月）', title: '预推免报名', description: '未获优营的同学积极参加预推免，准备面试和笔试，争取推免名额。', sort_order: 5 },
    { month: '大四上学期（9月底-10月）', title: '九推与系统确认', description: '在推免服务系统填报志愿，确认拟录取，完成推免流程。', sort_order: 6 },
  ],
  abroad: [
    { month: '1月-3月', title: '选校定位与语言准备', description: '确定目标国家和院校，开始备考雅思/托福/GRE/GMAT，制定申请策略。', sort_order: 1 },
    { month: '4月-6月', title: '背景提升与文书准备', description: '参加实习/科研/竞赛提升软实力，开始撰写个人陈述（PS）和简历（CV）。', sort_order: 2 },
    { month: '7月-8月', title: '语言出分与推荐信', description: '取得目标语言成绩，联系推荐人撰写推荐信，完善文书终稿。', sort_order: 3 },
    { month: '9月-11月', title: '网申递交', description: '按各校截止日期分批提交申请，注意早申（EA/ED）和常规轮次（RD）区别。', sort_order: 4 },
    { month: '12月-次年2月', title: '面试与等待结果', description: '准备线上/线下面试，关注申请状态，补充学校要求的额外材料。', sort_order: 5 },
    { month: '次年3月-6月', title: '录取确认与签证办理', description: '收到录取通知后确认入读学校，缴纳留位费，办理学生签证和住宿。', sort_order: 6 },
  ],
};

const FALLBACK_CASES: Record<Direction, Omit<CaseItem, 'id' | 'direction'>[]> = {
  postgrad: [
    { name: '王同学', school: '华中科技大学 · 机械工程', result: '跨考上交计算机 初试410分', quote: '作为跨考生压力很大，但平台的考研课程体系很完整，尤其是数据结构和算法课程帮了大忙。', avatar: '', sort_order: 1 },
    { name: '郑同学', school: '西安交通大学 · 临床医学', result: '考研至协和医学院 专业课满分', quote: '医学考研复习量巨大，平台上系统的备考规划帮我合理分配时间，还有同校学长一对一辅导。', avatar: '', sort_order: 2 },
    { name: '林同学', school: '四川大学 · 数学', result: '上岸北大数学科学学院', quote: '平台上的真题库和模拟面试功能让我如虎添翼，最终顺利圆梦北大。', avatar: '', sort_order: 3 },
    { name: '何同学', school: '厦门大学 · 金融学', result: '跨考清华五道口金融 初试425分', quote: '跨考金融最大的挑战是专业课，平台上的定向辅导和学长经验分享帮我少走了很多弯路。', avatar: '', sort_order: 4 },
  ],
  recommend: [
    { name: '刘同学', school: '北京师范大学 · 心理学', result: '保研至北大心理与认知科学学院', quote: '大三暑假通过平台了解到各校夏令营信息并提前准备，导师帮我准备了研究计划书和面试答辩。', avatar: '', sort_order: 1 },
    { name: '陈同学', school: '南京大学 · 计算机', result: '保研清华计算机系 优营', quote: '平台上的保研经验帖非常详细，从材料准备到面试技巧都有覆盖，帮我拿到了清华优营。', avatar: '', sort_order: 2 },
    { name: '杨同学', school: '武汉大学 · 法学', result: '保研人大法学院', quote: '绩点排名边缘让我很焦虑，导师帮我分析了各校推免政策，最终成功上岸人大。', avatar: '', sort_order: 3 },
    { name: '赵同学', school: '中山大学 · 生物', result: '保研中科院生物物理所', quote: '科研经历是保研的关键，平台帮我匹配到了中科院的导师做暑期科研，为推免加分不少。', avatar: '', sort_order: 4 },
  ],
  abroad: [
    { name: '赵同学', school: '武汉大学 · 英语语言文学', result: 'UCL 教育学硕士录取', quote: '平台留学专区的文书写作指导课程非常实用，导师帮我反复打磨PS和推荐信。', avatar: '', sort_order: 1 },
    { name: '孙同学', school: '同济大学 · 建筑学', result: '哈佛GSD 建筑学硕士全额奖学金', quote: '平台上有很多海外名校的学长分享作品集制作经验，导师还帮我联系了在GSD就读的学姐做review。', avatar: '', sort_order: 2 },
    { name: '周同学', school: '浙江大学 · 数据科学', result: 'MIT 数据科学硕士录取', quote: '从选校定位到文书修改，平台提供了一站式服务，尤其是面试辅导非常专业。', avatar: '', sort_order: 3 },
    { name: '吴同学', school: '复旦大学 · 经济学', result: 'LSE 金融学硕士录取', quote: '平台上的留学时间线功能帮我完美规划了申请节奏，没有错过任何一个截止日期。', avatar: '', sort_order: 4 },
  ],
};

// ====== 主组件 ======
export default function FurtherEducation() {
  const [active, setActive] = useState<Direction>('postgrad');
  const [timelines, setTimelines] = useState<TimelineItem[]>([]);
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiFailed, setApiFailed] = useState(false);

  const configStore = useConfigStore();

  // 从配置中心获取 fallback 数据
  const getConfigTimelines = useCallback((): Record<Direction, Omit<TimelineItem, 'id' | 'direction'>[]> => {
    try {
      const postgradConfig = configStore.getJson<{ timelines?: Omit<TimelineItem, 'id' | 'direction'>[] }>('postgrad_page_config', {});
      if (postgradConfig.timelines && postgradConfig.timelines.length > 0) {
        return { ...FALLBACK_TIMELINES, postgrad: postgradConfig.timelines };
      }
    } catch { /* 配置解析失败，使用硬编码 fallback */ }
    return FALLBACK_TIMELINES;
  }, [configStore]);

  const getConfigCases = useCallback((): Record<Direction, Omit<CaseItem, 'id' | 'direction'>[]> => {
    try {
      const casesConfig = configStore.getJson<{ cases?: Array<{ name: string; school: string; category: string; achievement: string; quote: string; avatar?: string }> }>('success_cases_page_config', {});
      if (casesConfig.cases && casesConfig.cases.length > 0) {
        const mapped: Record<Direction, Omit<CaseItem, 'id' | 'direction'>[]> = { postgrad: [], recommend: [], abroad: [] };
        casesConfig.cases.forEach((c, idx) => {
          const item = { name: c.name, school: c.school, result: c.achievement, quote: c.quote, avatar: c.avatar || '', sort_order: idx + 1 };
          if (c.category === 'postgrad') mapped.postgrad.push(item);
          else if (c.category === 'abroad') mapped.abroad.push(item);
        });
        // 如果配置中心某方向数据不足，用 fallback 补充
        (['postgrad', 'recommend', 'abroad'] as Direction[]).forEach(dir => {
          if (mapped[dir].length === 0) {
            mapped[dir] = FALLBACK_CASES[dir];
          }
        });
        return mapped;
      }
    } catch { /* 配置解析失败，使用硬编码 fallback */ }
    return FALLBACK_CASES;
  }, [configStore]);

  // 数据加载：优先配置中心数据，无配置时回退 API
  useEffect(() => {
    setLoading(true);
    setApiFailed(false);

    // 先尝试从配置中心读取，如果当前方向有数据则直接使用
    const configTimelines = getConfigTimelines();
    const configCases = getConfigCases();
    const configHasTimelines = configTimelines[active] && configTimelines[active].length > 0;
    const configHasCases = configCases[active] && configCases[active].length > 0;

    if (configHasTimelines && configHasCases) {
      const timelineItems: TimelineItem[] = configTimelines[active].map((item, idx) => ({
        ...item,
        id: idx + 1,
        direction: active,
      }));
      const caseItems: CaseItem[] = configCases[active].map((item, idx) => ({
        ...item,
        id: idx + 1,
        direction: active,
      }));
      setTimelines(timelineItems);
      setCases(caseItems);
      setLoading(false);
      return;
    }

    Promise.all([
      http.get('/further-education/timelines', { params: { direction: active } }),
      http.get('/further-education/cases', { params: { direction: active } }),
    ])
      .then(([timelineRes, casesRes]) => {
        const timelineData = timelineRes.data?.data || [];
        const casesData = casesRes.data?.data || [];
        // API 无数据时 fallback 到配置中心
        if (timelineData.length === 0 && casesData.length === 0 && (configHasTimelines || configHasCases)) {
          setTimelines(configHasTimelines ? configTimelines[active].map((item, idx) => ({ ...item, id: idx + 1, direction: active })) : []);
          setCases(configHasCases ? configCases[active].map((item, idx) => ({ ...item, id: idx + 1, direction: active })) : []);
        } else {
          setTimelines(timelineData);
          setCases(casesData);
        }
      })
      .catch(() => {
        // API 失败，使用配置中心 fallback
        setApiFailed(true);
        const configTimelines = getConfigTimelines();
        const configCases = getConfigCases();
        const fallbackTimelineItems: TimelineItem[] = (configTimelines[active] || []).map((item, idx) => ({
          ...item,
          id: idx + 1,
          direction: active,
        }));
        const fallbackCaseItems: CaseItem[] = (configCases[active] || []).map((item, idx) => ({
          ...item,
          id: idx + 1,
          direction: active,
        }));
        setTimelines(fallbackTimelineItems);
        setCases(fallbackCaseItems);
      })
      .finally(() => setLoading(false));
  }, [active, getConfigTimelines, getConfigCases]);

  const currentTab = TABS.find((t) => t.key === active) || TABS[0];
  const currentTimelines = timelines.filter((t) => t.direction === active);
  const currentCases = cases.filter((c) => c.direction === active);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* 面包屑导航 */}
      <Breadcrumb items={[{ label: '首页', path: '/' }, { label: '升学深造' }]} />

      {/* 页面头部 */}
      <section className="rounded-3xl border border-neutral-200 bg-gradient-to-br from-primary-50 to-white p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <GraduationCap className="w-5 h-5 text-primary-500" />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-500">升学深造</p>
        </div>
        <h1 className="text-3xl font-bold text-neutral-900">升学深造</h1>
        <p className="mt-3 text-sm leading-6 text-neutral-500">
          考研、保研、留学三条路径独立收口，每个子板块都拥有自己的时间线与底部成功案例。
        </p>
        {apiFailed && (
          <p className="mt-2 text-xs text-amber-500">
            提示：接口暂未就绪，当前展示配置中心数据
          </p>
        )}
      </section>

      {/* Tab 切换 */}
      <div className="mt-8 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-200 ${
              active === tab.key
                ? 'bg-primary-500 text-white shadow-md shadow-primary-500/25 scale-105'
                : 'border border-neutral-200 bg-white text-neutral-700 hover:border-primary-300 hover:text-primary-600'
            }`}
          >
            {tab.icon}
            {tab.name}
          </button>
        ))}
      </div>

      {/* 当前 Tab 描述 */}
      <div className="mt-4 flex items-center gap-2 text-sm text-neutral-500">
        <ChevronRight className="w-4 h-4 text-primary-400" />
        <span>{currentTab.description}</span>
      </div>

      {/* 时间线 */}
      <section className="mt-8 rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-5 h-5 text-primary-500" />
          <h2 className="text-2xl font-semibold text-neutral-900">{currentTab.name}时间线</h2>
        </div>
        <p className="text-sm leading-6 text-neutral-500">{currentTab.description}</p>

        {loading ? (
          <div className="mt-6 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-neutral-200 p-5">
                <div className="h-4 w-20 rounded bg-neutral-200" />
                <div className="mt-2 h-5 w-1/2 rounded bg-neutral-200" />
                <div className="mt-2 h-4 w-3/4 rounded bg-neutral-100" />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 relative pl-8">
            {/* 竖线 */}
            {currentTimelines.length > 0 && (
              <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-primary-100" />
            )}
            <div className="space-y-4">
              {currentTimelines.map((item, index) => (
                <div
                  key={item.id}
                  className="relative grid gap-4 rounded-2xl border border-neutral-200 p-5 transition-all hover:border-primary-200 hover:shadow-sm md:grid-cols-[120px,1fr]"
                >
                  {/* 时间线圆点 */}
                  <div
                    className="absolute -left-8 top-5 w-[10px] h-[10px] rounded-full bg-primary-500 ring-2 ring-white"
                    style={{ transform: 'translateX(6px)' }}
                  />
                  <div className="text-sm font-semibold text-primary-600">{item.month}</div>
                  <div>
                    <div className="flex items-center gap-3 text-base font-medium text-neutral-900">
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary-50 px-2 text-xs font-semibold text-primary-600">
                        {index + 1}
                      </span>
                      <span>{item.title}</span>
                    </div>
                    <div className="mt-2 text-sm leading-6 text-neutral-500">{item.description}</div>
                  </div>
                </div>
              ))}
              {currentTimelines.length === 0 && (
                <div className="text-center py-8">
                  <Clock className="w-10 h-10 text-neutral-200 mx-auto mb-2" />
                  <p className="text-sm text-neutral-400">暂无时间线数据</p>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 成功案例 */}
      <section className="mt-8 rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Award className="w-5 h-5 text-primary-500" />
          <h2 className="text-xl font-semibold text-neutral-900">{currentTab.name}成功案例</h2>
        </div>

        {loading ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-neutral-200 p-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-neutral-200" />
                  <div>
                    <div className="h-4 w-24 rounded bg-neutral-200" />
                    <div className="mt-1 h-3 w-32 rounded bg-neutral-100" />
                  </div>
                </div>
                <div className="mt-3 h-4 w-full rounded bg-neutral-100" />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {currentCases.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl border border-neutral-200 p-5 transition-all hover:border-primary-200 hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-500 text-sm font-medium text-white">
                    {c.avatar || c.name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-neutral-900">{c.name}</div>
                    <div className="text-xs text-neutral-500">{c.school}</div>
                  </div>
                </div>
                {c.result && (
                  <div className="mt-3 inline-block rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">
                    {c.result}
                  </div>
                )}
                {c.quote && (
                  <p className="mt-3 text-sm leading-6 text-neutral-600">"{c.quote}"</p>
                )}
              </div>
            ))}
            {currentCases.length === 0 && (
              <div className="col-span-2 text-center py-8">
                <Award className="w-10 h-10 text-neutral-200 mx-auto mb-2" />
                <p className="text-sm text-neutral-400">暂无成功案例</p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
