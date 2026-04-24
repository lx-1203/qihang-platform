import { Link } from 'react-router-dom';
import { MapPin, Clock, Star, Globe, TrendingUp, Award, GraduationCap, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import Tag from '@/components/ui/Tag';

interface ProgramData {
  id: number;
  name: string;
  nameEn: string;
  duration: string;
  tuition: string;
  tuitionCNY: string;
  deadline: string;
  intake: string;
  language: string;
  gpaReq: string;
  classSize: number;
  employRate: string;
  avgSalary: string;
  tags: string[];
  admittedCount: number;
  applicantCount: number;
}

interface UniversityInfo {
  id: number;
  school: string;
  schoolEn: string;
  country: string;
  ranking: number;
  logo: string;
}

interface ProgramCardProps {
  program: ProgramData;
  university: UniversityInfo;
  mode: 'compact' | 'detailed';
}

/** Country code to flag emoji helper */
function countryFlag(country: string): string {
  const flags: Record<string, string> = {
    UK: '\uD83C\uDDEC\uD83C\uDDE7',
    US: '\uD83C\uDDFA\uD83C\uDDF8',
    AU: '\uD83C\uDDE6\uD83C\uDDFA',
    CA: '\uD83C\uDDE8\uD83C\uDDE6',
    JP: '\uD83C\uDDEF\uD83C\uDDF5',
    SG: '\uD83C\uDDF8\uD83C\uDDEC',
    HK: '\uD83C\uDDED\uD83C\uDDF0',
    DE: '\uD83C\uDDE9\uD83C\uDDEA',
    FR: '\uD83C\uDDEB\uD83C\uDDF7',
    NZ: '\uD83C\uDDF3\uD83C\uDDFF',
  };
  return flags[country] || '\uD83C\uDF0D';
}

export default function ProgramCard({ program, university, mode }: ProgramCardProps) {
  const admissionRate =
    program.applicantCount > 0
      ? Math.min((program.admittedCount / program.applicantCount) * 100 * 8, 100)
      : 0;

  if (mode === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <Link
          to={`/study-abroad/programs/${program.id}`}
          className="block bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-5 group"
        >
          {/* School header: logo + name + QS badge */}
          <div className="flex items-start gap-3 mb-3">
            <img
              src={university.logo}
              alt={university.school}
              className="w-12 h-12 rounded-xl object-cover shrink-0 border border-gray-100"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect fill="%2314b8a6" width="48" height="48" rx="12"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="18">U</text></svg>';
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h4 className="text-sm font-semibold text-gray-900 truncate">
                  {university.school}
                </h4>
                <Tag variant="primary" size="xs" className="shrink-0 rounded">
                  QS {university.ranking}
                </Tag>
              </div>
              <p className="text-xs text-gray-400 truncate">{university.schoolEn}</p>
            </div>
          </div>

          {/* Program name */}
          <h5 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-1">
            {program.name}
          </h5>

          {/* Country flag + deadline */}
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <span className="text-base leading-none">{countryFlag(university.country)}</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-gray-400" size={12} />
              截止 {program.deadline}
            </span>
          </div>

          {/* Tuition */}
          <p className="text-base font-bold text-primary-500 mb-3">
            {program.tuitionCNY}
          </p>

          {/* First tag badge */}
          {program.tags.length > 0 && (
            <Tag variant="orange" size="xs" className="font-semibold mb-3">
              <Sparkles className="w-3 h-3 mr-1" size={12} />
              {program.tags[0]}
            </Tag>
          )}

          {/* Admission rate bar */}
          <div className="mt-auto pt-3 border-t border-gray-50">
            <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1.5">
              <span>
                平台录取{' '}
                <span className="font-semibold text-primary-500">{program.admittedCount}</span> 人
              </span>
              <span>
                申请{' '}
                <span className="font-medium text-gray-500">{program.applicantCount}</span> 人
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-700"
                initial={{ width: 0 }}
                whileInView={{ width: `${admissionRate}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, ease: 'easeOut', delay: 0.15 }}
              />
            </div>
          </div>
        </Link>
      </motion.div>
    );
  }

  // detailed mode - horizontal layout
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      <Link
        to={`/study-abroad/programs/${program.id}`}
        className="block bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden group"
      >
        <div className="flex flex-col md:flex-row">
          {/* Left section */}
          <div className="flex-1 p-5 md:p-6">
            {/* Logo + school info */}
            <div className="flex items-start gap-4 mb-4">
              <img
                src={university.logo}
                alt={university.school}
                className="w-16 h-16 rounded-xl object-cover shrink-0 border border-gray-100"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect fill="%2314b8a6" width="64" height="64" rx="12"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="24">U</text></svg>';
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-base font-bold text-gray-900 truncate">
                    {university.school}
                  </h4>
                  <Tag variant="primary" size="sm" className="shrink-0 rounded-md font-bold">
                    QS {university.ranking}
                  </Tag>
                </div>
                <p className="text-xs text-gray-400 mb-2">{university.schoolEn}</p>
                <h5 className="text-sm font-semibold text-gray-900">{program.name}</h5>
                <p className="text-xs text-gray-400 mt-0.5">{program.nameEn}</p>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {program.tags.map((tag) => (
                <Tag key={tag} variant="primary" size="xs">
                  {tag}
                </Tag>
              ))}
            </div>

            {/* Language + GPA info */}
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-gray-400" size={14} />
                {program.language}
              </span>
              <span className="flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-gray-400" size={14} />
                GPA {program.gpaReq}
              </span>
            </div>
          </div>

          {/* Right section - key metrics */}
          <div className="w-full md:w-56 shrink-0 border-t md:border-t-0 md:border-l border-gray-100 bg-gray-50/50 p-5 md:p-6 flex flex-col justify-center gap-3">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <MapPin className="w-3.5 h-3.5 text-gray-400" size={14} />
              <span>{countryFlag(university.country)} {university.country}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock className="w-3.5 h-3.5 text-gray-400" size={14} />
              <span>{program.duration}</span>
            </div>
            <div>
              <p className="text-lg font-bold text-primary-500">{program.tuitionCNY}</p>
              <p className="text-[10px] text-gray-400">{program.tuition}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-orange-400" size={14} />
              <span className="text-xs font-medium text-orange-500">
                截止 {program.deadline}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <TrendingUp className="w-3.5 h-3.5 text-gray-400" size={14} />
              <span>就业率 {program.employRate}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Award className="w-3.5 h-3.5 text-gray-400" size={14} />
              <span>平均年薪 {program.avgSalary}</span>
            </div>
          </div>
        </div>

        {/* Bottom stats bar */}
        <div className="border-t border-gray-100 px-5 md:px-6 py-3 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary-500/10 flex items-center justify-center">
              <Star className="w-3.5 h-3.5 text-primary-500" size={14} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400">GPA 要求</p>
              <p className="text-xs font-semibold text-gray-900">{program.gpaReq}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary-500/10 flex items-center justify-center">
              <Globe className="w-3.5 h-3.5 text-primary-500" size={14} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400">授课语言</p>
              <p className="text-xs font-semibold text-gray-900">{program.language}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary-500/10 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-primary-500" size={14} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400">就业率</p>
              <p className="text-xs font-semibold text-gray-900">{program.employRate}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary-500/10 flex items-center justify-center">
              <Award className="w-3.5 h-3.5 text-primary-500" size={14} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400">平均年薪</p>
              <p className="text-xs font-semibold text-gray-900">{program.avgSalary}</p>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
