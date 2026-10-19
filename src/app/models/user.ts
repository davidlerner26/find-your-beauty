export type UserProfile = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  // Admins have true (set by hand in the Firestore console). Gives access to /admin and the right to approve professionals.
  admin?: boolean;
};
