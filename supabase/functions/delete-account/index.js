import { createClient } from 'npm:@supabase/supabase-js@2.109.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

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

  const { data: avatarObjects, error: avatarListError } = await service.storage
    .from('avatars')
    .list(user.id, { limit: 1000 });
  if (avatarListError) {
    console.error('Avatar listing failed', avatarListError.message);
    return Response.json({ error: 'Unable to delete account files' }, { status: 500, headers: corsHeaders });
  }

  const avatarPaths = (avatarObjects ?? []).map((object) => `${user.id}/${object.name}`);
  if (avatarPaths.length > 0) {
    const { error: avatarDeleteError } = await service.storage.from('avatars').remove(avatarPaths);
    if (avatarDeleteError) {
      console.error('Avatar deletion failed', avatarDeleteError.message);
      return Response.json({ error: 'Unable to delete account files' }, { status: 500, headers: corsHeaders });
    }
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
