import {Buffer} from 'node:buffer';
import {actor,db,fail,AppError,textField,COMPANY_OWNER} from '@/lib/server';
import {formData} from '@/lib/request';
import {ownProfile} from '@/lib/profile-server';

const noStore = {'Cache-Control': 'no-store'};
const optionalText = (value: FormDataEntryValue | null, label: string, limit: number) => {
  if (value === null || value === '') return '';
  return textField(value, label, limit);
};

export async function GET(request: Request) {
  try {
    const profile = await ownProfile(await actor(request));
    if (!profile) throw new AppError('Account not found.', 404);
    return Response.json({profile}, {headers: noStore});
  } catch (error) { return fail(error); }
}

export async function POST(request: Request) {
  try {
    const a = await actor(request, true);
    if (Number(request.headers.get('content-length') || 0) > 600000) throw new AppError('Choose a photo smaller than 512 KB.');
    const data = await formData(request);
    if (data.has('user_id') && data.get('user_id') !== a.id) throw new AppError('You can only edit your own profile.', 403);
    const rawRevision = data.get('revision');
    if (typeof rawRevision !== 'string' || !/^\d+$/.test(rawRevision)) throw new AppError('Reload your profile before saving.', 409);
    const revision = Number(rawRevision);
    if (!Number.isSafeInteger(revision)) throw new AppError('Reload your profile before saving.', 409);
    const name = textField(data.get('name'), 'Name', 100);
    const phone = optionalText(data.get('phone'), 'Phone number', 30);
    if (phone && !/^[+\d\s().-]{5,30}$/.test(phone)) throw new AppError('Enter a valid phone number.');
    const city = optionalText(data.get('city'), 'City', 100);
    const jobTitle = optionalText(data.get('job_title'), 'Job title', 100);
    const bio = optionalText(data.get('bio'), 'About you', 500);
    let photo: string | null = null, photoType: string | null = null;
    const file = data.get('photo'), remove = data.get('remove_photo') === 'true';
    if (file instanceof File && file.size) {
      if (remove) throw new AppError('Choose either a new photo or Remove photo.');
      if (file.size > 512 * 1024) throw new AppError('Choose a photo smaller than 512 KB.');
      const bytes = Buffer.from(await file.arrayBuffer());
      const valid = file.type === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : file.type === 'image/png' ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
        : file.type === 'image/webp' && bytes.subarray(0,4).toString() === 'RIFF' && bytes.subarray(8,12).toString() === 'WEBP';
      if (!valid) throw new AppError('Use a valid JPG, PNG or WebP photo.');
      photo = bytes.toString('base64'); photoType = file.type;
    } else if (file !== null && !(file instanceof File)) throw new AppError('Choose an image file.');
    const event = crypto.randomUUID(), now = new Date().toISOString(), replacePhoto = !!photo || remove;
    const result = await db().batch([
      db().prepare(`INSERT INTO user_profiles (user_id,owner,phone,city,job_title,bio,photo_data,photo_type,revision,last_event_id,updated_at)
        SELECT ?,?,?,?,?,?,?,?,1,?,? WHERE ?=0 OR EXISTS (SELECT 1 FROM user_profiles WHERE user_id=? AND owner=? AND revision=?)
        ON CONFLICT(user_id) DO UPDATE SET phone=excluded.phone,city=excluded.city,job_title=excluded.job_title,bio=excluded.bio,
        photo_data=CASE WHEN ? THEN excluded.photo_data ELSE user_profiles.photo_data END,
        photo_type=CASE WHEN ? THEN excluded.photo_type ELSE user_profiles.photo_type END,
        revision=user_profiles.revision+1,last_event_id=excluded.last_event_id,updated_at=excluded.updated_at
        WHERE user_profiles.owner=? AND user_profiles.revision=?`)
        .bind(a.id,COMPANY_OWNER,phone,city,jobTitle,bio,photo,photoType,event,now,revision,a.id,COMPANY_OWNER,revision,replacePhoto?1:0,replacePhoto?1:0,COMPANY_OWNER,revision),
      db().prepare('UPDATE auth_users SET name=? WHERE id=? AND EXISTS (SELECT 1 FROM user_profiles WHERE user_id=? AND last_event_id=?)').bind(name,a.id,a.id,event),
      db().prepare('UPDATE team_members SET name=? WHERE owner=? AND user_id=? AND EXISTS (SELECT 1 FROM user_profiles WHERE user_id=? AND last_event_id=?)').bind(name,COMPANY_OWNER,a.id,a.id,event),
    ]);
    if (!result[0].meta.changes) throw new AppError('Your profile changed in another window. Reload before saving.', 409);
    return Response.json({profile: await ownProfile(a)}, {headers: noStore});
  } catch (error) { return fail(error); }
}
