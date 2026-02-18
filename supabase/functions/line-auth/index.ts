// Edge Function: line-auth
// LIFF 액세스 토큰 수신 → LINE 프로필 조회 → profiles 조회/생성 → JWT 발급(sub=line_user_id) → 클라이언트 반환

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import * as jose from 'npm:jose'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await req.json()
    const liffAccessToken = body?.access_token ?? body?.liff_access_token ?? null
    if (!liffAccessToken || typeof liffAccessToken !== 'string') {
      return new Response(
        JSON.stringify({ error: 'access_token required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1) LINE 프로필 API로 사용자 정보 획득 (토큰 검증 겸함)
    const lineRes = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${liffAccessToken}` },
    })
    if (!lineRes.ok) {
      const errText = await lineRes.text()
      console.error('[line-auth] LINE profile error', lineRes.status, errText)
      return new Response(
        JSON.stringify({ error: 'Invalid or expired LINE access token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const lineProfile = await lineRes.json()
    const lineUserId = lineProfile.userId
    const displayName = lineProfile.displayName ?? ''
    const pictureUrl = lineProfile.pictureUrl ?? null
    if (!lineUserId) {
      return new Response(
        JSON.stringify({ error: 'LINE profile missing userId' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const jwtSecret = Deno.env.get('JWT_SECRET') ?? ''

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[line-auth] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (!jwtSecret) {
      console.error('[line-auth] Missing JWT_SECRET (Supabase JWT Secret)')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // 2) profiles 조회 후 없으면 생성
    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('line_user_id', lineUserId)
      .maybeSingle()

    if (!existing) {
      const { error: insertError } = await supabaseAdmin.from('profiles').insert({
        line_user_id: lineUserId,
        display_name: displayName,
        picture_url: pictureUrl,
        nickname: null,
        use_default_name: true,
        cash: 0,
        reward_points: 0,
        tickets: 0,
      })
      if (insertError) {
        console.error('[line-auth] profiles insert error', insertError)
        return new Response(
          JSON.stringify({ error: 'Failed to create profile' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // 3) JWT 발급 (sub = line_user_id)
    const secret = new TextEncoder().encode(jwtSecret)
    const iat = Math.floor(Date.now() / 1000)
    const exp = iat + 60 * 60 // 1시간

    const token = await new jose.SignJWT({ role: 'authenticated' })
      .setSubject(lineUserId)
      .setIssuer(supabaseUrl + '/auth/v1')
      .setIssuedAt(iat)
      .setExpirationTime(exp)
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .sign(secret)

    return new Response(
      JSON.stringify({
        access_token: token,
        refresh_token: '',
        expires_in: 3600,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (e) {
    console.error('[line-auth]', e)
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
