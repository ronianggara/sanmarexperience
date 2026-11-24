# SANMAR EXPERIENCE 2026 — Situs, Database & Panel Admin

Rekonstruksi situs **https://sanmarexperience.fun** (SMP Katolik Santa Maria Kediri) sebagai situs statis siap GitHub Pages, dengan database **Google Apps Script + Google Sheets** dan **panel admin** untuk panitia.

- Tanpa build tooling — cukup HTML, CSS, dan JavaScript.
- Data lomba, tim basket, skor, juara, sponsor, kontak, dan testimoni tersimpan di Google Sheets.
- Jika backend belum dihubungkan, situs tetap tampil memakai data contoh (`data/seed.json`).
- Panel admin: verifikasi pendaftaran, input skor (klasemen otomatis), juara, konten, sponsor, pengaturan, ganti password.

## Struktur

```
.
├── index.html                 # Beranda
├── lomba.html                 # Detail lomba (?s=reading-champ, ?s=bola-basket, …)
├── register.html              # Formulir pendaftaran
├── cek-status.html            # Cek status pendaftaran
├── pemenang.html              # Semua juara
├── download.html              # Unduh juknis & logo
├── sponsor.html               # Paket sponsor + form kerja sama
├── referral.html              # Duta referral
├── kesan-pesan.html           # Testimoni pengunjung
├── juknis-*.html              # Juknis resmi (bisa dicetak ke PDF)
├── admin/index.html           # Panel panitia
├── assets/
│   ├── style.css              # Gaya situs publik
│   ├── css/admin.css          # Gaya panel admin
│   ├── js/                    # config, api, core, site, seed + skrip per halaman
│   └── img/                   # Logo acara, logo tim, favicon, logo-tim.zip
├── data/seed.json             # Data awal (juga dipakai saat offline)
└── apps-script/
    ├── Code.gs                # Seluruh backend Apps Script
    └── SETUP.md               # Panduan setup backend
```

## Menjalankan lokal

Butuh Node.js (atau server statis apa pun).

```bash
npx serve .
# buka http://localhost:3000
```

Bisa juga memakai ekstensi Live Server di VS Code. Jangan membuka `index.html` lewat `file://` karena pemuatan data memakai `fetch`.

## Deploy ke GitHub Pages

1. Buat repositori baru, lalu unggah **isi folder ini** sebagai root repositori (bukan folder pembungkusnya).
2. Buka **Settings → Pages**.
3. Source: **Deploy from a branch**, branch `main`, folder `/ (root)`. Simpan.
4. Situs tersedia di `https://<username>.github.io/<repo>/` dan panel admin di `/admin/`.

Tidak ada langkah build. Setelah backend dihubungkan (lihat bawah), cukup edit `assets/js/config.js`.

## Menghubungkan database (Apps Script + Sheets)

Panduan rinci: [`apps-script/SETUP.md`](apps-script/SETUP.md). Ringkasnya:

1. Buka <https://script.new>, hapus isi default, tempel seluruh isi `apps-script/Code.gs`.
2. **Simpan**, pilih fungsi `setupDatabase`, lalu **Run**. Izinkan akses saat diminta.
   - Script membuat spreadsheet **SANMAR EXPERIENCE 2026 — Database** berisi sheet: Pengaturan, Lomba, Kategori, Tim, Pertandingan, Juara, Sponsor, Paket, Kontak, Rangkaian, Pendaftaran, Kesan, Bantuan, Referral, Admin, Sesi.
   - Data awal dimasukkan otomatis; akun admin dibuat.
3. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Deploy, lalu salin URL yang berakhiran **`/exec`**.
4. Buka `assets/js/config.js` dan isi:

```js
window.SANMAR_CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycb.../exec",
  CACHE_MINUTES: 3
};
```

5. Muat ulang situs. Jika `API_URL` kosong, situs memakai `data/seed.json`.

> Setiap kali `Code.gs` diubah: **Deploy → Manage deployments → Edit → New version → Deploy**. URL `/exec` tetap sama.

## Akun admin

- URL: `/admin/`
- Username: `admin`
- Password bawaan: `Sanmar#2026`

**Segera ganti password** melalui tab **Akun** setelah login pertama. Password disimpan sebagai hash SHA-256 + salt; sesi berlaku 8 jam; login dibatasi 8 percobaan gagal / 10 menit per username.

### Tab panel admin

| Tab | Fungsi |
| --- | --- |
| Ringkasan | Statistik pendaftaran, testimoni, pengajuan sponsor, pintasan |
| Pendaftaran | Cari/filter, setujui, tolak (dengan catatan), hapus, lihat bukti bayar & chat WhatsApp |
| Basket & Skor | Tambah/edit pertandingan dan skor; klasemen Putra/Putri dihitung otomatis |
| Juara | Kelola juara per lomba (tampil di beranda, detail lomba, halaman Juara) |
| Lomba & Kategori | Edit 5 lomba, kuota, biaya, CP, tautan juknis |
| Tim Basket | Tim putra/putri, grup, path logo |
| Sponsor & Paket | Sponsor, paket kemitraan (benefit), contact person |
| Rangkaian | Linimasa acara |
| Kesan & Pesan | Moderasi: Tampilkan / Sembunyikan / Hapus |
| Duta Referral | Kode guru/karyawan + jumlah perolehan |
| Bantuan Sponsor | Pengajuan dari formulir sponsor |
| Pengaturan | Identitas acara, jadwal, status pendaftaran (buka/tutup), aset logo, papan referral publik |
| Akun | Ganti password, keluar |

## Alur data

- **Publik** membaca data lewat `GET ?action=bootstrap` (disimpan sementara di browser, `CACHE_MINUTES`).
- **Pendaftaran** mengirim `POST` JSON (`action: daftar`) berisi data peserta + bukti bayar (base64). Bukti disimpan ke folder Drive **SANMAR EXPERIENCE 2026 — Bukti Pendaftaran** (dibuat otomatis) dan tautannya dicatat di sheet.
- **Kesan** dan **Bantuan** masuk berstatus `Menunggu` / sesuai formulir; testimoni hanya tampil setelah disetujui panitia.
- **Admin** memakai token sesi (localStorage) untuk `admin_data`, `save`, `delete`, `save_settings`, `change_password`.
- **Klasemen basket** dihitung dari pertandingan babak *Penyisihan* berstatus *Selesai*: menang 2 poin, kalah 1 poin; tiebreak selisih skor, lalu poin memasukkan, lalu nama. Dua teratas tiap grup ditandai lolos.
- Kuota kategori = `terisi_awal` + jumlah pendaftar **Disetujui**.

## Kustomisasi cepat

- **Buka pendaftaran:** Pengaturan → Status pendaftaran = `buka`, sesuaikan tanggal buka/tutup.
- **Ganti nomor WhatsApp bantuan:** Pengaturan → WhatsApp bantuan (format `62…`).
- **Data contoh / reset:** ubah `data/seed.json` lalu jalankan `node -e "const fs=require('fs');fs.writeFileSync('assets/js/seed.js','window.SEED='+JSON.stringify(require('./data/seed.json'))+';')"` agar fallback ikut berubah. Database Sheets tidak otomatis berubah — gunakan panel admin atau jalankan ulang `setupDatabase` di spreadsheet baru.
- **Logo tim:** unggah file ke `assets/img/logos/`, perbarui path lewat tab Tim Basket, lalu perbarui `assets/img/logo-tim.zip` bila perlu.

## Keamanan & operasional

- Ganti password bawaan; jangan bagikan akun admin.
- Web App harus dapat diakses **Anyone** agar formulir publik berfungsi; data sensitif tetap di balik token admin.
- Input dibersihkan dan dibatasi panjangnya; sel yang diawali `=`, `+`, `-`, `@` dinetralkan untuk mencegah formula injection.
- Unggahan bukti: JPG/PNG/WebP/PDF, maksimal 2 MB.
- Jangan mengubah urutan/nama kolom sheet secara manual; gunakan panel admin.
- Kuota Apps Script gratis berlaku (eksekusi & waktu); untuk acara besar, pantau kuota Drive/Sheets.

## Pemecahan masalah

| Gejala | Penyebab & solusi |
| --- | --- |
| Situs menampilkan data lama | Cache browser `CACHE_MINUTES`; muat ulang paksa (Ctrl+F5) atau kecilkan nilai cache |
| Formulir bilang backend belum terhubung | `API_URL` di `assets/js/config.js` masih kosong |
| "Database belum disiapkan" | Jalankan `setupDatabase()` di editor Apps Script |
| Login gagal setelah mengganti password | Gunakan password baru; tunggu 10 menit bila terkena batas percobaan |
| Perubahan `Code.gs` tidak berlaku | Deploy ulang versi baru (Manage deployments → Edit → New version) |
| Bukti bayar tidak dapat dibuka | Kebijakan Drive organisasi dapat memblokir sharing; buka file dari Drive panitia |
| POST gagal di beberapa jaringan | `api.js` otomatis mengulang muatan kecil lewat GET `?payload=` |

Data dan teks mengikuti situs referensi; penyesuaian resmi (harga, jadwal, juara) dapat dilakukan kapan saja dari panel admin.
