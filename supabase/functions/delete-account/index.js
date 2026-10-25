import { createClient } from 'npm:@supabase/supabase-js@2.109.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

async function removeUserStorage(service, bucket, userId) {
  const storage = service.storage.from(bucket);
  const root = userId;
  const folders = [root];
  const paths = [];

  while (folders.length) {
    const folder = folders.pop();
    let offset = 0;
    const limit = 1000;
    while (true) {
      const { data, error } = await storage.list(folder, {
        limit,
        offset,
        sortBy: { column: 'name', order: 'asc' }
      });
      if (error) throw new Error(`Could not list ${bucket} files: ${error.message}`);
      for (const entry of data ?? []) {
        if (!entry.name || entry.name === '.' || entry.name === '..' || entry.name.includes('/')) {
          throw new Error(`Unexpected ${bucket} file name`);
        }
        const path = `${folder}/${entry.name}`;
        if (!path.startsWith(`${root}/`)) throw new Error(`Unexpected ${bucket} file path`);
        if (entry.id === null) folders.push(path);
        else if (entry.id) paths.push(path);
        else throw new Error(`Unknown ${bucket} file entry`);
      }
      if ((data ?? []).length < limit) break;
      offset += limit;
    }
  }

  for (let index = 0; index < paths.length; index += 1000) {
    const { error } = await storage.remove(paths.slice(index, index + 1000));
    if (error) throw new Error(`Could not remove ${bucket} files: ${error.message}`);
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return Response.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
  }

  let payload;
  try { payload = await request.json(); } catch { payload = null; }
  if (payload?.confirmed !== true) {
    return Response.json({ error: 'Explicit confirmation required' }, { status: 400, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json({ error: 'Server configuration error' }, { status: 500, headers: corsHeaders });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authHeader } }
  });

  const token = authHeader.replace(/^Bearer\s+/i, '');
  const { data: { user }, error: userError } = await admin.auth.getUser(token);
  if (userError || !user) {
    return Response.json({ error: 'Invalid or expired session' }, { status: 401, headers: corsHeaders });
  }

  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    await removeUserStorage(service, 'avatars', user.id);
    await removeUserStorage(service, 'animal-photos', user.id);
    await removeUserStorage(service, 'report-photos', user.id);
    await removeUserStorage(service, 'sighting-photos', user.id);
    const { data: linkedPaths, error: linkedError } = await service.rpc(
      'account_sighting_photo_paths', { target_user_id: user.id }
    );
    if (linkedError) throw new Error(`Could not list linked sighting photos: ${linkedError.message}`);
    const otherPaths = [...new Set((linkedPaths ?? []).filter((path) =>
      typeof path === 'string' && !path.startsWith(`${user.id}/`)))];
    for (let index = 0; index < otherPaths.length; index += 1000) {
      const { error } = await service.storage.from('sighting-photos')
        .remove(otherPaths.slice(index, index + 1000));
      if (error) throw new Error(`Could not remove linked sighting photos: ${error.message}`);
    }
  } catch (storageError) {
    console.error('Account file deletion failed', storageError.message);
    return Response.json({ error: 'Unable to delete account files. Please try again or contact support.' }, { status: 500, headers: corsHeaders });
  }

  const { error: dataError } = await service.rpc('delete_member_data', { target_user_id: user.id });
  if (dataError) {
    console.error('delete_member_data failed', dataError.message);
    return Response.json({ error: 'Unable to delete account data' }, { status: 500, headers: corsHeaders });
  }

  const { error: authError } = await service.auth.admin.deleteUser(user.id);
  if (authError) {
    console.error('Auth deletion failed', authError.message);
    return Response.json({ error: 'Account data removed, but sign-in removal needs support' }, { status: 500, headers: corsHeaders });
  }

  return Response.json({ deleted: true }, { headers: corsHeaders });
});
