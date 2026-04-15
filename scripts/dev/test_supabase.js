
const { createClient } = require('@supabase/supabase-js');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Using URL:', url ? url.substring(0, 25) + '...' : 'NONE');

const supabase = createClient(url, key, {
    auth: { persistSession: false },
    global: {
        fetch: async (...args) => {
            console.log('\n[FETCH INTERCEPTED]', args[0]);
            const start = Date.now();
            try {
                const res = await fetch(...args);
                console.log('[FETCH SUCCESS]', res.status, Date.now() - start, 'ms');
                return res;
            } catch (e) {
                console.error('[FETCH FAILED]', e.message, Date.now() - start, 'ms');
                throw e;
            }
        }
    }
});

async function testFetch() {
    console.log('Testing single query with fetch interceptor...');
    const start = Date.now();
    try {
        const { data: m, error: e1 } = await supabase.from('pronosticos').select('id').limit(1);
        console.log('Pronosticos result:', !!e1 ? e1.message : 'OK', 'Total Time:', Date.now() - start, 'ms');
    } catch (e) {
        console.error('Unhandled Crash!', e);
    }
}

testFetch().catch(console.error).finally(() => process.exit(0));
