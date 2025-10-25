// tests/setup/jest-dom.ts
import '@testing-library/jest-dom';
import 'whatwg-fetch';

// Supabase 환경 변수를 테스트에서 기본값으로 지정
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

