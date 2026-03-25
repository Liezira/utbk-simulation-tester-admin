// --- ADMIN APP CONSTANTS ---

export const SUBTESTS = [
  { id: 'pu',  name: 'Penalaran Umum',                  questions: 30 },
  { id: 'ppu', name: 'Pengetahuan & Pemahaman Umum',     questions: 20 },
  { id: 'pbm', name: 'Pemahaman Bacaan & Menulis',       questions: 20 },
  { id: 'pk',  name: 'Pengetahuan Kuantitatif',          questions: 20 },
  { id: 'lbi', name: 'Literasi Bahasa Indonesia',        questions: 30 },
  { id: 'lbe', name: 'Literasi Bahasa Inggris',          questions: 20 },
  { id: 'pm',  name: 'Penalaran Matematika',             questions: 20 },
];

export const STUDENT_APP_URL = "https://utbk-simulation-tester-student.vercel.app";
export const FONNTE_TOKEN = import.meta.env.VITE_FONNTE_TOKEN;
export const SEND_DELAY = 3;

export const VIOLATION_SCORING = {
  types: {
    tab_switch:   { label: 'Pindah Tab/Window',  deduction: 2, maxCount: 3,  grace: 1 },
    fullscreen:   { label: 'Keluar Fullscreen',  deduction: 1, maxCount: 5,  grace: 2 },
    copy_paste:   { label: 'Copy/Paste',         deduction: 3, maxCount: 2,  grace: 0 },
    devtools:     { label: 'Buka DevTools',      deduction: 5, maxCount: 1,  grace: 0 },
    idle_timeout: { label: 'Tidak Aktif >5 mnt', deduction: 0, maxCount: 10, grace: 3 },
  },
  maxTotalDeduction: 15,
  warningThreshold: 8,
};
