# Money Tracker Website

Aplikasi pelacak keuangan sederhana dan powerful untuk mengelola pemasukan, pengeluaran, tabungan, dan anggaran Anda. Dibuat dengan Next.js dan Supabase.

## Fitur

- **Pelacakan Transaksi:** Catat pemasukan dan pengeluaran harian dengan mudah.
- **Manajemen Dompet:** Kelola berbagai sumber dana (Bank, E-Wallet, Tunai).
- **Target Keuangan (Goals):** Tetapkan dan pantau progres tabungan untuk impian Anda.
- **Anggaran (Budgeting):** Buat batas anggaran per kategori agar pengeluaran terkendali.
- **Analitik Visual:** Grafik interaktif untuk memvisualisasikan tren keuangan Anda.
- **Format Rupiah & Tanggal:** Disesuaikan dengan format lokal Indonesia.

## Teknologi

- [Next.js](https://nextjs.org/) (React Framework)
- [Supabase](https://supabase.com/) (Backend as a Service - Database & Auth)
- [Tailwind CSS](https://tailwindcss.com/) (Styling)
- [Recharts](https://recharts.org/) (Charting)
- [Lucide React](https://lucide.dev/) (Icons)
- [Sonner](https://sonner.emilkowal.ski/) (Toast Notifications)

## Prasyarat

Sebelum memulai, pastikan Anda telah menginstal:

- [Node.js](https://nodejs.org/) (Versi 18 atau lebih baru)
- Akun [Supabase](https://supabase.com/)

## Cara Install dan Menjalankan

### 1. Install Dependencies

```bash
npm install
```

### 2. Konfigurasi Environment Variables

Isi `.env.local` dengan: (bisa dilihat di bagian connect di supabase)

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Setup Database

Jalankan query SQL berikut di SQL Editor Supabase Anda untuk membuat tabel dan kebijakan keamanan (RLS). Anda dapat menemukannya di folder `sql/` atau gunakan skema gabungan di bawah ini (pastikan urutannya benar):

1.  **Jalankan `sql/schema-1.sql`** (Membuat tabel dasar: transactions, budgets, goals).
2.  **Jalankan `sql/schema-2.sql`** (Membuat tabel wallets dan relasi ke transactions).

### 5. Menjalankan Aplikasi

Jalankan server development:

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

## Struktur Project

- `app/`: Pages dan routing Next.js App Router.
- `components/`: Komponen UI reusable (Dashboard, TransactionTracker, GoalsManager, dll).
- `lib/`: Utility functions dan konfigurasi Supabase client.
- `sql/`: File skema database SQL.

## Lisensi

[MIT](LICENSE)
"# hujenext.js" 
