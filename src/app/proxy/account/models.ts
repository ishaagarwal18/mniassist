/** ABP Account module — the signed-in user's own profile. */
export interface ProfileDto {
  userName?: string;
  email?: string;
  name?: string | null;
  surname?: string | null;
  phoneNumber?: string | null;
  isExternal?: boolean;
  hasPassword?: boolean;
}

export interface UpdateProfileDto {
  userName: string;
  email: string;
  name?: string | null;
  surname?: string | null;
  phoneNumber?: string | null;
}

export interface ChangePasswordInput {
  currentPassword?: string | null;
  newPassword: string;
}
