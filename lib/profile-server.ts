import {db, COMPANY_OWNER, type Actor} from '@/lib/server';
import type {PersonProfile} from '@/lib/profile';

type ProfileRow = Omit<PersonProfile, 'photo_url'> & {has_photo: number};
const columns = `u.id AS user_id,u.name,u.email,CASE WHEN u.is_admin=1 THEN 'admin' ELSE m.role END AS role,
 CASE WHEN u.active=1 AND (u.is_admin=1 OR m.active=1) THEN 1 ELSE 0 END AS active,m.id AS member_id,
 COALESCE(p.phone,'') AS phone,COALESCE(p.city,'') AS city,COALESCE(p.job_title,'') AS job_title,
 COALESCE(p.bio,'') AS bio,COALESCE(p.revision,0) AS revision,CASE WHEN p.photo_data IS NULL THEN 0 ELSE 1 END AS has_photo`;
const joins = `FROM auth_users u LEFT JOIN team_members m ON m.user_id=u.id AND m.owner=?
 LEFT JOIN user_profiles p ON p.user_id=u.id AND p.owner=?`;
const display = ({has_photo, ...row}: ProfileRow): PersonProfile => ({
  ...row,
  photo_url: has_photo ? `/api/profile-photo?user_id=${encodeURIComponent(row.user_id)}&v=${row.revision}` : null,
});

export async function ownProfile(a: Actor) {
  const row = await db().prepare(`SELECT ${columns} ${joins} WHERE u.id=? AND (u.is_admin=1 OR m.id IS NOT NULL)`)
    .bind(COMPANY_OWNER, COMPANY_OWNER, a.id).first<ProfileRow>();
  return row ? display(row) : null;
}

export async function peopleProfiles() {
  const {results} = await db().prepare(`SELECT ${columns} ${joins} WHERE u.is_admin=1 OR m.id IS NOT NULL ORDER BY u.name,u.id`)
    .bind(COMPANY_OWNER, COMPANY_OWNER).all<ProfileRow>();
  return results.map(display);
}
