import { Link } from 'react-router-dom';
import { DollarSign, Globe, Shield, Home, ChevronRight, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import Tag from '@/components/ui/Tag';

interface CountryData {
  id: string;
  name: string;
  flag: string;
  hot: boolean;
  projectCount: number;
  desc: string;
  tuitionRange: string;
  livingCost: string;
  totalBudget: string;
  language: string;
  visaType: string;
  advantages: string[];
  topUniversities: string[];
  popularMajors: string[];
}

interface CountryCardProps {
  country: CountryData;
  variant: 'featured' | 'compact';
}

const infoItems = [
  { key: 'tuitionRange' as const, label: '学费范围', icon: DollarSign },
  { key: 'livingCost' as const, label: '生活费用', icon: Home },
  { key: 'language' as const, label: '授课语言', icon: Globe },
  { key: 'visaType' as const, label: '签证类型', icon: Shield },
];

export default function CountryCard({ country, variant }: CountryCardProps) {
  if (variant === 'featured') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <Link
          to={`/study-abroad/programs?country=${country.id}`}
          className="block bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-primary-200 transition-all overflow-hidden group"
        >
        {/* Gradient left border accent */}
        <div className="flex">
          <div className="w-1.5 shrink-0 bg-gradient-to-b from-primary-500 to-primary-700" />

          <div className="flex-1 p-6 md:p-8">
            {/* Header: flag + name + HOT badge + desc */}
            <div className="flex items-start gap-4 mb-6">
              <span className="text-5xl leading-none shrink-0">{country.flag}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-bold text-gray-900">{country.name}</h3>
                  {country.hot && (
                    <Tag variant="red" size="sm" className="font-semibold">
                      HOT
                    </Tag>
                  )}
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">{country.desc}</p>
              </div>
            </div>

            {/* 4-column info grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {infoItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.key}
                    className="flex items-start gap-3 p-3 rounded-xl bg-gray-50"
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary-500/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4.5 h-4.5 text-primary-500" size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-400 mb-0.5">{item.label}</p>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {country[item.key]}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom: top universities + link */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400 shrink-0" size={16} />
                {country.topUniversities.slice(0, 5).map((uni) => (
                  <Tag
                    key={uni}
                    variant="gray"
                    size="md"
                  >
                    {uni}
                  </Tag>
                ))}
              </div>

              <span
                className="inline-flex items-center gap-1 text-sm font-medium text-primary-500 group-hover:text-primary-700 transition-colors shrink-0"
              >
                查看全部 {country.projectCount} 个项目
                <ChevronRight
                  className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                  size={16}
                />
              </span>
            </div>
          </div>
        </div>
        </Link>
      </motion.div>
    );
  }

  // compact variant
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <Link
        to={`/study-abroad/programs?country=${country.id}`}
        className="block bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-5 group"
      >
        {/* Flag + name + HOT badge */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl leading-none shrink-0">{country.flag}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-base font-semibold text-gray-900 truncate">
                {country.name}
              </h4>
              {country.hot && (
                <Tag variant="red" size="xs" className="font-semibold">
                  HOT
                </Tag>
              )}
            </div>
          </div>
        </div>

        {/* Project count */}
        <p className="text-sm font-medium text-primary-500 mb-2">
          {country.projectCount} 个硕士项目
        </p>

        {/* Description */}
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3">
          {country.desc}
        </p>

        {/* Tuition range */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <DollarSign className="w-3.5 h-3.5" size={14} />
          <span>{country.tuitionRange}</span>
        </div>
      </Link>
    </motion.div>
  );
}
