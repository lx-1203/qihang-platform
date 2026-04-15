import { CheckCircle2, Clock, X, Award, Briefcase, FlaskConical, ThumbsUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

interface OfferData {
  id: string;
  studentName: string;
  avatar: string | null;
  background: string;
  gpa: string;
  ielts: number | null;
  toefl: number | null;
  gre: number | null;
  internship: string[];
  research: string[];
  result: string;
  country: string;
  school: string;
  program: string;
  scholarship: string;
  story: string;
  date: string;
  tags: string[];
  likes: number;
}

interface OfferStoryCardProps {
  offer: OfferData;
  mode: 'compact' | 'full';
}

function getResultStatus(result: string): 'admitted' | 'rejected' | 'waitlisted' {
  if (/录取|Offer|offer|admit/i.test(result)) return 'admitted';
  if (/拒绝|Rej|rej|reject/i.test(result)) return 'rejected';
  return 'waitlisted';
}

function ResultIcon({ status, size }: { status: 'admitted' | 'rejected' | 'waitlisted'; size: number }) {
  if (status === 'admitted') {
    return (
      <div
        className="flex items-center justify-center rounded-full bg-green-100 text-green-600 flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <CheckCircle2 size={size * 0.55} />
      </div>
    );
  }
  if (status === 'rejected') {
    return (
      <div
        className="flex items-center justify-center rounded-full bg-red-100 text-red-600 flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <X size={size * 0.55} />
      </div>
    );
  }
  return (
    <div
      className="flex items-center justify-center rounded-full bg-yellow-100 text-yellow-600 flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <Clock size={size * 0.55} />
    </div>
  );
}

function CompactCard({ offer }: { offer: OfferData }) {
  const status = getResultStatus(offer.result);

  return (
    <Link to={`/study-abroad/offers`} className="block">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-primary-200 transition-all px-4 py-3 flex items-center gap-3 cursor-pointer"
      >
      {/* Left: Result icon */}
      <ResultIcon status={status} size={40} />

      {/* Middle: School + program info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-[#111827] truncate">
            {offer.school}
          </span>
          <span className="inline-flex items-center gap-0.5 text-xs font-medium text-green-700 bg-green-50 rounded-full px-2 py-0.5">
            Offer <CheckCircle2 size={10} />
          </span>
        </div>
        <p className="text-xs text-[#6b7280] truncate mt-0.5">
          {offer.program} · {offer.background}
        </p>
      </div>

      {/* Right: Score badges (hidden on mobile) */}
      <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
        {offer.gpa && (
          <span className="text-xs font-medium text-[#14b8a6] bg-teal-50 rounded-full px-2 py-0.5">
            GPA {offer.gpa}
          </span>
        )}
        {offer.ielts && (
          <span className="text-xs font-medium text-blue-600 bg-blue-50 rounded-full px-2 py-0.5">
            IELTS {offer.ielts}
          </span>
        )}
        {offer.toefl && (
          <span className="text-xs font-medium text-indigo-600 bg-indigo-50 rounded-full px-2 py-0.5">
            TOEFL {offer.toefl}
          </span>
        )}
      </div>

      {/* Far right: Date */}
      <span className="text-[11px] text-[#9ca3af] flex-shrink-0 whitespace-nowrap">
        {offer.date}
      </span>
    </motion.div>
    </Link>
  );
}

function FullCard({ offer, index }: { offer: OfferData; index: number }) {
  const status = getResultStatus(offer.result);

  return (
    <Link to={`/study-abroad/offers`} className="block">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: (index ?? 0) * 0.08 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-primary-200 transition-all p-5 space-y-4 cursor-pointer"
      >
      {/* Top row: Result icon + school + badges */}
      <div className="flex items-start gap-3">
        <ResultIcon status={status} size={48} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-base text-[#111827]">{offer.school}</h3>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 rounded-full px-2 py-0.5">
              {offer.country}
            </span>
            {offer.scholarship && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">
                <Award size={12} />
                {offer.scholarship}
              </span>
            )}
          </div>
          <p className="text-sm text-[#6b7280] mt-1">{offer.program}</p>
        </div>
      </div>

      {/* Background + Tags */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-white bg-[#14b8a6] rounded-full px-2.5 py-0.5">
          {offer.background}
        </span>
        {offer.tags.map((tag) => (
          <span
            key={tag}
            className="text-xs font-medium text-[#6b7280] bg-gray-100 rounded-full px-2 py-0.5"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Score section */}
      <div className="flex items-center gap-3 flex-wrap">
        {offer.gpa && (
          <div className="flex flex-col items-center border border-gray-200 rounded-lg px-3 py-1.5 min-w-[64px]">
            <span className="text-[10px] text-[#9ca3af] uppercase tracking-wide">GPA</span>
            <span className="text-sm font-bold text-[#111827]">{offer.gpa}</span>
          </div>
        )}
        {offer.ielts && (
          <div className="flex flex-col items-center border border-gray-200 rounded-lg px-3 py-1.5 min-w-[64px]">
            <span className="text-[10px] text-[#9ca3af] uppercase tracking-wide">IELTS</span>
            <span className="text-sm font-bold text-[#111827]">{offer.ielts}</span>
          </div>
        )}
        {offer.toefl && (
          <div className="flex flex-col items-center border border-gray-200 rounded-lg px-3 py-1.5 min-w-[64px]">
            <span className="text-[10px] text-[#9ca3af] uppercase tracking-wide">TOEFL</span>
            <span className="text-sm font-bold text-[#111827]">{offer.toefl}</span>
          </div>
        )}
        {offer.gre && (
          <div className="flex flex-col items-center border border-gray-200 rounded-lg px-3 py-1.5 min-w-[64px]">
            <span className="text-[10px] text-[#9ca3af] uppercase tracking-wide">GRE</span>
            <span className="text-sm font-bold text-[#111827]">{offer.gre}</span>
          </div>
        )}
      </div>

      {/* Experience section */}
      {(offer.internship.length > 0 || offer.research.length > 0) && (
        <div className="space-y-1.5">
          {offer.internship.map((item, i) => (
            <div key={`intern-${i}`} className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-1.5">
              <Briefcase size={14} className="flex-shrink-0" />
              <span>{item}</span>
            </div>
          ))}
          {offer.research.map((item, i) => (
            <div key={`research-${i}`} className="flex items-center gap-2 text-xs text-purple-700 bg-purple-50 rounded-lg px-3 py-1.5">
              <FlaskConical size={14} className="flex-shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      )}

      {/* Story text */}
      {offer.story && (
        <p className="text-sm text-[#6b7280] italic line-clamp-2 leading-relaxed">
          "{offer.story}"
        </p>
      )}

      {/* Bottom: Date + likes */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-50">
        <span className="text-xs text-[#9ca3af]">{offer.date}</span>
        <div className="flex items-center gap-1 text-xs text-[#9ca3af]">
          <ThumbsUp size={13} />
          <span>{offer.likes}</span>
        </div>
      </div>
    </motion.div>
    </Link>
  );
}

export default function OfferStoryCard({ offer, mode }: OfferStoryCardProps) {
  if (mode === 'compact') {
    return <CompactCard offer={offer} />;
  }
  return <FullCard offer={offer} index={0} />;
}
