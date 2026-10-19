import {Buffer} from 'node:buffer';
import {actor,db,fail,AppError,COMPANY_OWNER} from '@/lib/server';

export async function GET(request: Request) {
  try {
    const a = await actor(request), userId = new URL(request.url).searchParams.get('user_id') || a.id;
    if (a.role !== 'admin' && userId !== a.id) throw new AppError('Profile photos are private.', 403);
    const row = await db().prepare('SELECT photo_data,photo_type FROM user_profiles WHERE user_id=? AND owner=?')
      .bind(userId,COMPANY_OWNER).first<{photo_data: string | null; photo_type: string | null}>();
    if (!row?.photo_data || !row.photo_type) throw new AppError('Photo not found.', 404);
    return new Response(Buffer.from(row.photo_data, 'base64'), {headers: {
      'Content-Type': row.photo_type, 'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox",
    }});
  } catch (error) { return fail(error); }
}
