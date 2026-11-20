// config.js: підключення до бази Supabase. Тут лише ПУБЛІЧНИЙ ключ (anon), його можна бачити всім: доступ до даних мають лише ті, хто увійшов і є в команді.
// Секретний service-ключ сюди ніколи не потрапляє. Перезаписати: python tools/central2_config.py
window.CENTRAL_CONFIG = { supabaseUrl: 'https://ctgqcoptglvuyeolftvc.supabase.co', supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0Z3Fjb3B0Z2x2dXllb2xmdHZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUxOTM4ODQsImV4cCI6MjExMDc2OTg4NH0._4DoUXsM6kZnMu5S4MH8VxHmYygD-4oN_UliCUOBKoU' };
