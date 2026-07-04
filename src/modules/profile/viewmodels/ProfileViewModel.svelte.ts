import type { ProfileService } from '@/modules/profile/services/ProfileService';
import type { Profile, ProfileRole } from '@/modules/profile/types/Profile';

export class ProfileViewModel {
  profile: Profile | null = $state(null);
  draft: Profile = $state({ fullName: '', email: '', organization: 'ROBOVILL', role: 'Developer' });
  isEditing = $state(false);

  constructor(private readonly profileService: ProfileService) {}

  startEditing(): void {
    this.draft = this.profile ? { ...this.profile } : this.profileService.createEmptyProfile();
    this.isEditing = true;
  }

  cancelEditing(): void {
    this.isEditing = false;
  }

  setRole(role: ProfileRole): void {
    this.draft = { ...this.draft, role };
  }

  saveProfile(): void {
    if (!this.profileService.canSaveProfile(this.draft)) return;
    this.profile = { ...this.draft };
    this.isEditing = false;
  }
}
