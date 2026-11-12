// The numbers of the dashboard of the admin, from what the admin can read (the professionals are public, the drafts
// are for admins). Clients and bookings are closed by the Firestore rules, so they are not here.

export type OverviewProfessional = {
  approved?: boolean;
  submitted?: boolean;
  rejected?: boolean;
  published?: boolean;
};

export type OverviewDraft = { invited: boolean; inviteExpiresAt: number | null };

export type Overview = {
  // Approved professionals (accounts from before the approval existed have no value and count as approved)
  professionals: number;
  // The ones clients can find
  published: number;
  // Approved, but hidden or incomplete: clients do not find them
  hidden: number;
  // Finished the sign up and wait for an admin
  pending: number;
  // Denied sign ups
  rejected: number;
  // Profiles made by an admin and not claimed yet, and how many of them have a link that still works
  drafts: number;
  invites: number;
};

export const overviewOf = (
  professionals: OverviewProfessional[],
  drafts: OverviewDraft[],
  now = Date.now(),
): Overview => {
  const approved = professionals.filter((p) => p.approved !== false);
  const published = approved.filter((p) => p.published === true).length;
  return {
    professionals: approved.length,
    published,
    hidden: approved.length - published,
    pending: professionals.filter(
      (p) => p.approved === false && p.submitted === true && p.rejected !== true,
    ).length,
    rejected: professionals.filter((p) => p.approved === false && p.rejected === true).length,
    drafts: drafts.length,
    invites: drafts.filter(
      (d) => d.invited && (d.inviteExpiresAt === null || d.inviteExpiresAt > now),
    ).length,
  };
};
