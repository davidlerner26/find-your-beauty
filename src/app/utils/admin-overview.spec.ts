import { overviewOf } from './admin-overview';

describe('overviewOf', () => {
  const professionals = [
    { approved: true, published: true },
    { published: true },
    { approved: true, published: false },
    { approved: false, submitted: true },
    { approved: false, submitted: true, rejected: true },
    { approved: false, submitted: false },
  ];

  it('counts the approved professionals, the ones clients find and the ones they do not', () => {
    const overview = overviewOf(professionals, []);
    expect(overview.professionals).toBe(3);
    expect(overview.published).toBe(2);
    expect(overview.hidden).toBe(1);
  });

  it('counts the sign ups that wait for an admin, and the denied ones', () => {
    const overview = overviewOf(professionals, []);
    expect(overview.pending).toBe(1);
    expect(overview.rejected).toBe(1);
  });

  it('counts the drafts and the ones with a link that still works', () => {
    const drafts = [
      { invited: false, inviteExpiresAt: null },
      { invited: true, inviteExpiresAt: 2000 },
      { invited: true, inviteExpiresAt: 500 },
    ];
    const overview = overviewOf([], drafts, 1000);
    expect(overview.drafts).toBe(3);
    expect(overview.invites).toBe(1);
  });

  it('is all zeros for an empty site', () => {
    expect(overviewOf([], [])).toEqual({
      professionals: 0,
      published: 0,
      hidden: 0,
      pending: 0,
      rejected: 0,
      drafts: 0,
      invites: 0,
    });
  });
});
