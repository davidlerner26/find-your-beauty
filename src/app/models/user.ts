import { isValidCpf } from '../utils/cpf';

export type UserProfile = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  // 160.490.697-94
  cpf?: string;
  address?: string;
  // Where the address chosen in the search is on the map
  addressPosition?: { lat: number; lng: number };
  // Admins have true (set by hand in the Firestore console). Gives access to /admin and the right to approve professionals.
  admin?: boolean;
};

// What a client has to fill in on the profile before booking (empty when everything is filled in)
export const missingProfileData = (profile: UserProfile | null | undefined) => {
  const missing: string[] = [];
  if (!profile?.firstName?.trim()) missing.push($localize`nome`);
  if (!profile?.lastName?.trim()) missing.push($localize`sobrenome`);
  if ((profile?.phone ?? '').replace(/\D/g, '').length < 10) missing.push($localize`celular`);
  if (!isValidCpf(profile?.cpf ?? '')) missing.push('CPF');
  if (!profile?.address?.trim()) missing.push($localize`endereço`);
  return missing;
};
