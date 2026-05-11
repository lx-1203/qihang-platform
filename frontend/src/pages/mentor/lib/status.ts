export type MentorQualificationStatus =
  | 'not_submitted'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'draft';

type MentorQualificationProfile = {
  verify_status?: 'draft' | 'pending' | 'approved' | 'rejected';
  verify_remark?: string;
  title?: string;
  bio?: string;
  expertise?: string[] | string | null;
} | null | undefined;

function normalizeExpertise(expertise: MentorQualificationProfile extends { expertise?: infer T } ? T : never) {
  if (Array.isArray(expertise)) return expertise.filter(Boolean);

  if (typeof expertise === 'string' && expertise.trim()) {
    try {
      const parsed = JSON.parse(expertise);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }

  return [];
}

export function getMentorQualificationStatus(
  profile: MentorQualificationProfile
): MentorQualificationStatus {
  if (!profile) return 'not_submitted';

  if (profile.verify_status === 'approved') return 'approved';
  if (profile.verify_status === 'rejected') return 'rejected';
  if (profile.verify_status === 'draft') return 'draft';

  const expertise = normalizeExpertise(profile.expertise);
  const hasSubmission = Boolean(
    profile.title?.trim() ||
    profile.bio?.trim() ||
    expertise.length ||
    profile.verify_remark?.trim()
  );

  return hasSubmission ? 'pending' : 'not_submitted';
}
