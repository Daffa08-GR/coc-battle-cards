# CoC Battle Calculator (PWA)

Kalkulator simulasi serangan Clash of Clans berbasis HTML, CSS, dan JavaScript. Versi pertama menggunakan mode **pasukan gabungan** dan input manual. Tidak ada pengenalan gambar, pemilihan target otomatis, pathfinding, akun, database server, atau API berbayar.

## Fitur versi pertama

- Kalkulator dua fase: perjalanan dan menyerang.
- Simulasi HP kontinu dengan batas 0 dan HP maksimum.
- Damage pertahanan dan regenerasi kotor dilaporkan terpisah. Regenerasi yang terbuang saat HP penuh juga dihitung.
- Deteksi waktu gugur dan sisa HP bangunan.
- Riwayat simulasi dan database statistik disimpan di `localStorage`.
- Ekspor riwayat + database ke JSON.
- Analisis bantuan berbasis aturan lokal (bukan AI generatif).
- PWA dengan manifest, ikon, dan service worker untuk cache offline.

## Menjalankan di komputer

1. Ekstrak ZIP proyek.
2. Jalankan server web lokal dari folder proyek, misalnya dengan Python:
   ```bash
   python -m http.server 8000
   ```
3. Buka `http://localhost:8000` di browser.

Service worker membutuhkan secure context: HTTPS atau localhost. Membuka `index.html` langsung melalui `file://` tetap bisa menampilkan kalkulator, tetapi instalasi PWA dan cache offline tidak akan aktif.

## Memasang di Android

PWA perlu di-host di alamat **HTTPS**. Pilihan hosting static antara lain GitHub Pages, Netlify, atau Cloudflare Pages.

1. Buat repositori baru di GitHub, lalu unggah seluruh isi folder proyek (jangan hanya ZIP-nya).
2. Aktifkan GitHub Pages pada pengaturan repositori, pilih branch/folder publikasi yang sesuai.
3. Tunggu sampai situs memperoleh alamat HTTPS.
4. Buka alamat itu di Google Chrome Android.
5. Buka menu titik tiga Chrome, pilih **Install app** atau **Add to Home screen** (nama menu dapat berbeda menurut versi Chrome).
6. Ikuti konfirmasi pemasangan. Ikon Battle Calc akan muncul di layar utama.
7. Buka aplikasi sekali saat online agar service worker menyimpan app shell. Setelah itu halaman inti dapat dibuka offline.

Netlify/Cloudflare Pages juga dapat digunakan: unggah folder proyek sebagai static site dan pastikan alamat akhirnya HTTPS.

## Penyimpanan dan cadangan

Data disimpan pada `localStorage` browser yang sama. Data tidak otomatis tersinkron ke perangkat lain. Menghapus data situs/browser dapat menghapus riwayat dan database, jadi gunakan tombol **Ekspor JSON** secara berkala untuk membuat cadangan.

## Model matematika

- Damage mentah = DPS pertahanan × durasi aktual.
- Regenerasi kotor = regenerasi per detik × durasi aktual.
- HP aktual dijaga pada rentang 0 sampai HP maksimum.
- Ketika HP sudah maksimum, regenerasi tambahan tidak menaikkan HP dan dicatat sebagai regenerasi terbuang.
- Jika DPS pertahanan melebihi regenerasi, waktu sampai gugur dihitung dari HP saat ini dibagi selisih DPS pertahanan dan regenerasi.
- Serangan berhenti saat target hancur atau HP pasukan mencapai nol.
- HP awal yang melebihi maksimum otomatis dibatasi ke HP maksimum.

**Catatan interpretasi:** laporan menampilkan regenerasi kotor, bukan hanya regenerasi efektif. Karena itu pada contoh Queen (regen 192, defense DPS 155, HP awal penuh), regenerasi kotor sekitar 2.612,78 dan damage sekitar 2.109,27 selama 13,608 detik; HP tetap 1.730. Selisih regenerasi yang tidak dapat ditampung dicatat sebagai regenerasi terbuang.

## Pengujian

`app.js` menjalankan pemeriksaan regresi melalui `console.assert` saat aplikasi dimuat, termasuk contoh Queen dan sembilan kasus tepi yang diminta. Buka DevTools browser dan lihat Console untuk hasil pemeriksaan.

## Pengembangan berikutnya

- Mode multi-unit dapat ditambahkan sebagai modul simulasi terpisah yang menghitung HP dan DPS per jenis unit. Mode gabungan saat ini tetap menjadi mesin utama dan tidak bergantung pada modul tersebut.
- Integrasi model bahasa/API di masa depan harus dilakukan melalui backend. Jangan pernah menaruh API key rahasia di `app.js` atau file frontend.

## Struktur file

```text
coc-battle-calculator/
├── index.html
├── styles.css
├── app.js
├── simulation.js
├── manifest.webmanifest
├── service-worker.js
├── README.md
└── icons/
    ├── icon.svg
    ├── icon-192.png
    ├── icon-512.png
    └── icon-maskable-512.png
```
