import type { Profile } from '@/modules/profile/types/Profile';

export class ProfileService {
  createEmptyProfile(): Profile {
    return { fullName: '', email: '', organization: 'ROBOVILL', role: 'Developer' };
  }

  canSaveProfile(profile: Profile): boolean {
    return profile.fullName.trim().length > 0 && profile.email.trim().length > 0;
  }
}
