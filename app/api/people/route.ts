import {actor,admin,fail} from '@/lib/server';
import {peopleProfiles} from '@/lib/profile-server';

export async function GET(request: Request) {
  try {
    admin(await actor(request));
    return Response.json({people: await peopleProfiles()}, {headers: {'Cache-Control': 'no-store'}});
  } catch (error) { return fail(error); }
}
