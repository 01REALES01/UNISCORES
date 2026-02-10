import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn(),
        prefetch: jest.fn(),
        back: jest.fn(),
        forward: jest.fn(),
        refresh: jest.fn(),
    }),
    usePathname: () => '/admin',
    useSearchParams: () => new URLSearchParams(),
}));

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
    supabase: {
        from: jest.fn(() => ({
            select: jest.fn(() => ({
                eq: jest.fn(() => ({
                    single: jest.fn(() => Promise.resolve({ data: null, error: null })),
                    order: jest.fn(() => Promise.resolve({ data: [], error: null })),
                })),
                order: jest.fn(() => Promise.resolve({ data: [], error: null })),
            })),
            insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
            update: jest.fn(() => Promise.resolve({ data: null, error: null })),
            delete: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        channel: jest.fn(() => ({
            on: jest.fn(() => ({
                subscribe: jest.fn(),
            })),
        })),
        removeChannel: jest.fn(),
        auth: {
            getSession: jest.fn(() => Promise.resolve({ data: { session: null } })),
            onAuthStateChange: jest.fn(() => ({
                data: { subscription: { unsubscribe: jest.fn() } },
            })),
            signOut: jest.fn(() => Promise.resolve()),
            signInWithPassword: jest.fn(() => Promise.resolve({ data: null, error: null })),
        },
    },
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});
