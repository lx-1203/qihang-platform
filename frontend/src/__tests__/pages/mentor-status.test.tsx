import { describe, expect, it } from 'vitest';
import { getMentorQualificationStatus } from '../../pages/mentor/lib/status';

describe('mentor qualification status mapping', () => {
  it('returns not_submitted for an empty profile', () => {
    expect(getMentorQualificationStatus(null)).toBe('not_submitted');
  });

  it('returns pending when a mentor has draft qualification content', () => {
    expect(
      getMentorQualificationStatus({
        verify_status: 'pending',
        title: '求职导师',
        bio: '有一些资质说明',
        expertise: ['简历优化'],
      })
    ).toBe('pending');
  });

  it('returns approved when verify_status is approved', () => {
    expect(
      getMentorQualificationStatus({
        verify_status: 'approved',
      })
    ).toBe('approved');
  });

  it('returns rejected when verify_status is rejected', () => {
    expect(
      getMentorQualificationStatus({
        verify_status: 'rejected',
        verify_remark: '请补充资质证明',
      })
    ).toBe('rejected');
  });
});
