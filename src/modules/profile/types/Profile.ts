export type ProfileRole = 'Developer' | 'DBA' | 'Admin';

export type Profile = {
  fullName: string;
  email: string;
  organization: string;
  role: ProfileRole;
};
