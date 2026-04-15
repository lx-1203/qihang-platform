import { Link } from 'react-router-dom';
import { MapPin, Clock, Star, Globe, TrendingUp, Award, GraduationCap, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

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
          to={`/study-abroad/programs/${university.id}`}
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
                <h4 className="text-sm font-semibold text-[#111827] truncate">
                  {university.school}
                </h4>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#14b8a6]/10 text-[#14b8a6] shrink-0">
                  QS {university.ranking}
                </span>
              </div>
              <p className="text-xs text-[#9ca3af] truncate">{university.schoolEn}</p>
            </div>
          </div>

          {/* Program name */}
          <h5 className="text-sm font-semibold text-[#111827] mb-2 line-clamp-1">
            {program.name}
          </h5>

          {/* Country flag + deadline */}
          <div className="flex items-center gap-2 text-xs text-[#6b7280] mb-2">
            <span className="text-base leading-none">{countryFlag(university.country)}</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#9ca3af]" size={12} />
              截止 {program.deadline}
            </span>
          </div>

          {/* Tuition */}
          <p className="text-base font-bold text-[#14b8a6] mb-3">
            {program.tuitionCNY}
          </p>

          {/* First tag badge */}
          {program.tags.length > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-50 text-orange-500 border border-orange-100 mb-3">
              <Sparkles className="w-3 h-3 mr-1" size={12} />
              {program.tags[0]}
            </span>
          )}

          {/* Admission rate bar */}
          <div className="mt-auto pt-3 border-t border-gray-50">
            <div className="flex items-center justify-between text-[10px] text-[#9ca3af] mb-1.5">
              <span>
                平台录取{' '}
                <span className="font-semibold text-[#14b8a6]">{program.admittedCount}</span> 人
              </span>
              <span>
                申请{' '}
                <span className="font-medium text-[#6b7280]">{program.applicantCount}</span> 人
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#14b8a6] to-[#0f766e]"
                initial={{ width: 0 }}
                whileInView={{ width: `${admissionRate}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
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
        to={`/study-abroad/programs/${university.id}`}
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
                  <h4 className="text-base font-bold text-[#111827] truncate">
                    {university.school}
                  </h4>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-[#14b8a6]/10 text-[#14b8a6] shrink-0">
                    QS {university.ranking}
                  </span>
                </div>
                <p className="text-xs text-[#9ca3af] mb-2">{university.schoolEn}</p>
                <h5 className="text-sm font-semibold text-[#111827]">{program.name}</h5>
                <p className="text-xs text-[#9ca3af] mt-0.5">{program.nameEn}</p>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {program.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#14b8a6]/5 text-[#14b8a6] border border-[#14b8a6]/10"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Language + GPA info */}
            <div className="flex items-center gap-4 text-xs text-[#6b7280]">
              <span className="flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-[#9ca3af]" size={14} />
                {program.language}
              </span>
              <span className="flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-[#9ca3af]" size={14} />
                GPA {program.gpaReq}
              </span>
            </div>
          </div>

          {/* Right section - key metrics */}
          <div className="w-full md:w-56 shrink-0 border-t md:border-t-0 md:border-l border-gray-100 bg-gray-50/50 p-5 md:p-6 flex flex-col justify-center gap-3">
            <div className="flex items-center gap-2 text-xs text-[#6b7280]">
              <MapPin className="w-3.5 h-3.5 text-[#9ca3af]" size={14} />
              <span>{countryFlag(university.country)} {university.country}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#6b7280]">
              <Clock className="w-3.5 h-3.5 text-[#9ca3af]" size={14} />
              <span>{program.duration}</span>
            </div>
            <div>
              <p className="text-lg font-bold text-[#14b8a6]">{program.tuitionCNY}</p>
              <p className="text-[10px] text-[#9ca3af]">{program.tuition}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-orange-400" size={14} />
              <span className="text-xs font-medium text-orange-500">
                截止 {program.deadline}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#6b7280]">
              <TrendingUp className="w-3.5 h-3.5 text-[#9ca3af]" size={14} />
              <span>就业率 {program.employRate}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#6b7280]">
              <Award className="w-3.5 h-3.5 text-[#9ca3af]" size={14} />
              <span>平均年薪 {program.avgSalary}</span>
            </div>
          </div>
        </div>

        {/* Bottom stats bar */}
        <div className="border-t border-gray-100 px-5 md:px-6 py-3 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#14b8a6]/10 flex items-center justify-center">
              <Star className="w-3.5 h-3.5 text-[#14b8a6]" size={14} />
            </div>
            <div>
              <p className="text-[10px] text-[#9ca3af]">GPA 要求</p>
              <p className="text-xs font-semibold text-[#111827]">{program.gpaReq}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#14b8a6]/10 flex items-center justify-center">
              <Globe className="w-3.5 h-3.5 text-[#14b8a6]" size={14} />
            </div>
            <div>
              <p className="text-[10px] text-[#9ca3af]">授课语言</p>
              <p className="text-xs font-semibold text-[#111827]">{program.language}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#14b8a6]/10 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-[#14b8a6]" size={14} />
            </div>
            <div>
              <p className="text-[10px] text-[#9ca3af]">就业率</p>
              <p className="text-xs font-semibold text-[#111827]">{program.employRate}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#14b8a6]/10 flex items-center justify-center">
              <Award className="w-3.5 h-3.5 text-[#14b8a6]" size={14} />
            </div>
            <div>
              <p className="text-[10px] text-[#9ca3af]">平均年薪</p>
              <p className="text-xs font-semibold text-[#111827]">{program.avgSalary}</p>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
