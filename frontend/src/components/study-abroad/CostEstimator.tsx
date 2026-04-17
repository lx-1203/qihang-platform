import { useState, useMemo } from 'react';
import {
  DollarSign,
  GraduationCap,
  Home,
  Plane,
  Award,
  Info,
  Calculator,
} from 'lucide-react';
import { motion } from 'framer-motion';
import costsData from '../../data/study-abroad-costs.json';
import countriesData from '../../data/study-abroad-countries.json';
import Tag from '@/components/ui/Tag';

// ---------- 类型定义 ----------

interface TuitionRange {
  min: number;
  max: number;
  unit: string;
}

interface LivingTier {
  city: string;
  min: number;
  max: number;
}

interface OtherCosts {
  visa: number;
  insurance: number;
  flight: number;
}

interface CostData {
  id: string;
  country: string;
  currency: string;
  currencyCode: string;
  exchangeRate: number;
  freeTuition: boolean;
  specialNotes: string | null;
  undergraduate: TuitionRange;
  master: TuitionRange;
  phd: TuitionRange;
  living: {
    tier1: LivingTier;
    tier2: LivingTier;
  };
  other: OtherCosts;
}

interface Scholarship {
  name: string;
  amount: string;
  desc: string;
}

interface CountryBasic {
  id: string;
  name: string;
  flag: string;
  scholarships: Scholarship[];
}

// ---------- 学位类型选项 ----------

type DegreeType = 'undergraduate' | 'master' | 'phd';

const degreeLabels: Record<DegreeType, string> = {
  undergraduate: '本科',
  master: '硕士',
  phd: '博士',
};

// ---------- 工具函数 ----------

/** 格式化数字为带千分位的字符串 */
function fmtNum(n: number): string {
  return Math.round(n).toLocaleString('zh-CN');
}

// ---------- 组件 ----------

export default function CostEstimator() {
  const costs = costsData as CostData[];
  const countries = countriesData as CountryBasic[];

  // 选择状态
  const [selectedCountry, setSelectedCountry] = useState('uk');
  const [degreeType, setDegreeType] = useState<DegreeType>('master');
  const [cityTier, setCityTier] = useState<'tier1' | 'tier2'>('tier1');

  // 当前国家的费用 & 基本信息
  const countryData = useMemo(
    () => costs.find((c) => c.id === selectedCountry) ?? costs[0],
    [selectedCountry, costs],
  );
  const countryBasic = useMemo(
    () => countries.find((c) => c.id === selectedCountry),
    [selectedCountry, countries],
  );

  // 计算结果
  const estimation = useMemo(() => {
    const tuition = countryData[degreeType];
    const living = countryData.living[cityTier];
    const { visa, insurance, flight } = countryData.other;
    const rate = countryData.exchangeRate;
    const curr = countryData.currency;

    const tuitionAvg = (tuition.min + tuition.max) / 2;
    const livingAvg = (living.min + living.max) / 2;

    // visa & insurance 以当地货币计，flight 以人民币计
    const otherLocal = visa + insurance;
    const otherCNY = otherLocal * rate + flight;

    const tuitionCNY = tuitionAvg * rate;
    const livingCNY = livingAvg * rate;

    const totalCNY = tuitionCNY + livingCNY + otherCNY;

    return {
      tuition,
      living,
      tuitionAvg,
      livingAvg,
      otherLocal,
      otherCNY,
      tuitionCNY,
      livingCNY,
      totalCNY,
      curr,
      rate,
      visa,
      insurance,
      flight,
    };
  }, [countryData, degreeType, cityTier]);

  const isFreeTuition = countryData.freeTuition;

  return (
    <section className="py-12">
      {/* 标题 */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-500/10">
          <DollarSign className="text-primary-500" size={22} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          <span className="mr-1">💰</span>费用估算器
        </h2>
      </div>

      <motion.div
        className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-6 sm:p-8"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.45 }}
      >
        {/* -------- 选择行 -------- */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {/* 国家 */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1.5">
              留学国家
            </label>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition"
            >
              {costs.map((c) => {
                const basic = countries.find((co) => co.id === c.id);
                return (
                  <option key={c.id} value={c.id}>
                    {basic?.flag ?? ''} {c.country}
                  </option>
                );
              })}
            </select>
          </div>

          {/* 学位类型 */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1.5">
              学位类型
            </label>
            <select
              value={degreeType}
              onChange={(e) => setDegreeType(e.target.value as DegreeType)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition"
            >
              <option value="undergraduate">本科 Undergraduate</option>
              <option value="master">硕士 Master</option>
              <option value="phd">博士 PhD</option>
            </select>
          </div>

          {/* 城市等级 */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1.5">
              城市等级
            </label>
            <select
              value={cityTier}
              onChange={(e) => setCityTier(e.target.value as 'tier1' | 'tier2')}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition"
            >
              <option value="tier1">
                一线城市 ({countryData.living.tier1.city})
              </option>
              <option value="tier2">
                二线城市 ({countryData.living.tier2.city})
              </option>
            </select>
          </div>
        </div>

        {/* -------- 免学费提示 -------- */}
        {isFreeTuition && (
          <motion.div
            className="flex items-start gap-3 rounded-xl bg-primary-500/5 border border-primary-500/20 px-4 py-3 mb-6"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <GraduationCap className="text-primary-500 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-primary-500 font-medium">
              🎓 {countryData.country}公立大学免学费，仅需支付注册费
            </p>
          </motion.div>
        )}

        {/* -------- 费用卡片 2×2 -------- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* 学费 */}
          <motion.div
            className="rounded-xl border border-gray-100 bg-gray-50/60 p-4"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: 0.05 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap size={18} className="text-primary-500" />
              <span className="text-sm font-semibold text-gray-900">学费</span>
              {isFreeTuition && (
                <Tag variant="primary" size="sm" className="ml-auto">
                  免学费
                </Tag>
              )}
            </div>
            <p className="text-lg font-bold text-gray-900">
              {estimation.curr}
              {fmtNum(estimation.tuition.min)} – {fmtNum(estimation.tuition.max)}
              <span className="text-xs font-normal text-gray-400 ml-1">
                /{estimation.tuition.unit}
              </span>
            </p>
            <p className="text-sm text-gray-500 mt-1">
              ≈ ¥{fmtNum(estimation.tuition.min * estimation.rate)} – ¥
              {fmtNum(estimation.tuition.max * estimation.rate)}
            </p>
          </motion.div>

          {/* 生活费 */}
          <motion.div
            className="rounded-xl border border-gray-100 bg-gray-50/60 p-4"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: 0.1 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Home size={18} className="text-primary-500" />
              <span className="text-sm font-semibold text-gray-900">生活费</span>
              <span className="ml-auto text-xs text-gray-400">
                {estimation.living.city}
              </span>
            </div>
            <p className="text-lg font-bold text-gray-900">
              {estimation.curr}
              {fmtNum(estimation.living.min)} – {fmtNum(estimation.living.max)}
              <span className="text-xs font-normal text-gray-400 ml-1">/年</span>
            </p>
            <p className="text-sm text-gray-500 mt-1">
              ≈ ¥{fmtNum(estimation.living.min * estimation.rate)} – ¥
              {fmtNum(estimation.living.max * estimation.rate)}
            </p>
          </motion.div>

          {/* 其他费用 */}
          <motion.div
            className="rounded-xl border border-gray-100 bg-gray-50/60 p-4"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: 0.15 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Plane size={18} className="text-primary-500" />
              <span className="text-sm font-semibold text-gray-900">其他费用</span>
            </div>
            <ul className="space-y-1 text-sm text-gray-500">
              <li className="flex justify-between">
                <span>签证费</span>
                <span>
                  {estimation.curr}
                  {fmtNum(estimation.visa)}{' '}
                  <span className="text-gray-400">
                    (≈ ¥{fmtNum(estimation.visa * estimation.rate)})
                  </span>
                </span>
              </li>
              <li className="flex justify-between">
                <span>保险</span>
                <span>
                  {estimation.curr}
                  {fmtNum(estimation.insurance)}{' '}
                  <span className="text-gray-400">
                    (≈ ¥{fmtNum(estimation.insurance * estimation.rate)})
                  </span>
                </span>
              </li>
              <li className="flex justify-between">
                <span>往返机票</span>
                <span>¥{fmtNum(estimation.flight)}</span>
              </li>
            </ul>
          </motion.div>

          {/* 年度总计 */}
          <motion.div
            className="rounded-xl border-2 border-primary-500/30 bg-primary-500/5 p-4 flex flex-col justify-center"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Calculator size={18} className="text-primary-500" />
              <span className="text-sm font-semibold text-gray-900">年度总计（估算）</span>
            </div>
            <p className="text-2xl font-extrabold text-primary-500">
              ¥{fmtNum(estimation.totalCNY)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              基于 {degreeLabels[degreeType]} · {estimation.living.city} · 汇率{' '}
              {estimation.rate} 估算
            </p>
          </motion.div>
        </div>

        {/* -------- 特殊说明 -------- */}
        {countryData.specialNotes && (
          <motion.div
            className="flex items-start gap-3 rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3 mb-6"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3 }}
          >
            <Info className="text-yellow-500 flex-shrink-0 mt-0.5" size={18} />
            <p className="text-sm text-yellow-700">{countryData.specialNotes}</p>
          </motion.div>
        )}

        {/* -------- 奖学金列表 -------- */}
        {countryBasic && countryBasic.scholarships.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Award size={18} className="text-primary-500" />
              <h3 className="text-sm font-semibold text-gray-900">
                {countryData.country}主要奖学金
              </h3>
            </div>
            <ul className="space-y-2">
              {countryBasic.scholarships.map((s, i) => (
                <motion.li
                  key={s.name}
                  className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 rounded-lg bg-gray-50 px-4 py-2.5 text-sm"
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.06 }}
                >
                  <span className="font-medium text-gray-900 min-w-0 shrink-0">
                    {s.name}
                  </span>
                  <span className="text-primary-500 font-semibold whitespace-nowrap">
                    {s.amount}
                  </span>
                  <span className="text-gray-400 text-xs sm:ml-auto">{s.desc}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        )}
      </motion.div>
    </section>
  );
}
