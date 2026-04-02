import { NextRequest, NextResponse } from 'next/server';
// @ts-expect-error — web-push lacks type declarations
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// Lazy initialization — avoids crashing at build time when env vars are missing
function getSupabaseAdmin() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY env var');
    return createClient(url, key);
}

function initVapid() {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!publicKey || !privateKey) throw new Error('Missing VAPID env vars');
    webpush.setVapidDetails('mailto:olimpiadas@uninorte.edu.co', publicKey, privateKey);
}

interface PushPayload {
    user_id: string;
    title: string;
    body?: string;
    url?: string;
    tag?: string;
}

export async function POST(req: NextRequest) {
    try {
        initVapid();
        const supabaseAdmin = getSupabaseAdmin();

        // Verify this is an internal call (from Supabase webhook or server-side)
        const authHeader = req.headers.get('authorization');
        const webhookSecret = process.env.PUSH_WEBHOOK_SECRET;

        if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();

        // Support both direct calls and Supabase webhook format
        let payload: PushPayload;

        if (body.type === 'INSERT' && body.table === 'notifications' && body.record) {
            // Supabase webhook format
            const record = body.record;
            const url = getUrlForNotification(record.type, record.metadata);
            payload = {
                user_id: record.user_id,
                title: record.title,
                body: record.body || undefined,
                url,
                tag: record.type,
            };
        } else {
            // Direct call format
            payload = body as PushPayload;
        }

        if (!payload.user_id) {
            return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
        }

        // Get all push subscriptions for this user
        const { data: subscriptions, error: subError } = await supabaseAdmin
            .from('push_subscriptions')
            .select('*')
            .eq('user_id', payload.user_id);

        if (subError || !subscriptions?.length) {
            return NextResponse.json({ sent: 0, reason: 'No subscriptions found' });
        }

        const pushPayload = JSON.stringify({
            title: payload.title,
            body: payload.body || '',
            url: payload.url || '/notificaciones',
            tag: payload.tag || 'default',
        });

        // Send to all subscriptions, clean up invalid ones
        const results = await Promise.allSettled(
            subscriptions.map(async (sub) => {
                try {
                    await webpush.sendNotification(
                        {
                            endpoint: sub.endpoint,
                            keys: { p256dh: sub.p256dh, auth: sub.auth },
                        },
                        pushPayload,
                    );
                    return { success: true, endpoint: sub.endpoint };
                } catch (err: any) {
                    // 410 Gone or 404 = subscription expired, clean up
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        await supabaseAdmin
                            .from('push_subscriptions')
                            .delete()
                            .eq('id', sub.id);
                    }
                    throw err;
                }
            }),
        );

        const sent = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        return NextResponse.json({ sent, failed });
    } catch (err: any) {
        console.error('[Push API] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

function getUrlForNotification(type: string, metadata: Record<string, any>): string {
    switch (type) {
        case 'match_start':
        case 'match_end':
        case 'score_update':
            return metadata?.match_id ? `/partido/${metadata.match_id}` : '/partidos';
        case 'friend_request':
        case 'friend_accepted':
            return metadata?.sender_id ? `/perfil/${metadata.sender_id}` : '/notificaciones';
        default:
            return '/notificaciones';
    }
}
