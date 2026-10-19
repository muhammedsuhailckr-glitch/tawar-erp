import type {Role} from './cashbook';

export type PersonProfile = {
  user_id: string;
  name: string;
  email: string;
  role: Role;
  active: number;
  member_id: string | null;
  phone: string;
  city: string;
  job_title: string;
  bio: string;
  revision: number;
  photo_url: string | null;
};

export const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
