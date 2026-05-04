# PRD — Web Pencatatan Pengeluaran Bulanan (Versi Dirapikan untuk UI/UX)

## 1. Ringkasan Produk
Aplikasi web untuk mencatat dan memantau keuangan pribadi dengan fokus pada 3 jenis transaksi: pengeluaran, pemasukan, dan transfer. Wishlist dan tagihan terintegrasi sebagai sumber pengeluaran agar alur data lebih konsisten dan mudah dipahami di UI.

---

## 2. Prinsip Struktur (Penting untuk UI)
Agar UI tidak membingungkan, struktur dibagi menjadi 3 layer:

1. **Ringkasan (Dashboard)** → hanya tampilan
2. **Aktivitas (Transaksi & History)** → semua pergerakan uang
3. **Pengaturan Data (Kategori, Wishlist, Tagihan, Metode)** → sumber & referensi data

---

## 3. Struktur Menu (Sidebar Final)
Urutan disusun berdasarkan frekuensi penggunaan:

1. Dashboard
2. Transaksi
3. History
4. 
5. Kategori
6. Wishlist
7. Tagihan
8. Metode Pembayaran

Catatan UI:
- Pisahkan dengan divider antara “Aktivitas” dan “Manajemen”
- Gunakan icon berbeda agar cepat dikenali

---

## 4. Model Data Utama (Disederhanakan untuk UI)

### 4.1 Transaksi (Core)
Semua data berpusat di sini.

Atribut:
- jenis: pengeluaran | pemasukan | transfer
- nominal
- tanggal
- kategori
- metode pembayaran
- catatan
- sumber (optional): wishlist | tagihan | manual


### 4.2 Relasi Penting
- Wishlist → bisa menjadi **pengeluaran**
- Tagihan → saat dibayar menjadi **pengeluaran**
- Transfer → tidak masuk kategori pengeluaran


---

## 5. Alur Data (Penting untuk Desain UI)

### 5.1 Pengeluaran Normal
User input → pilih kategori → simpan → masuk transaksi → tampil di dashboard

### 5.2 Dari Wishlist
Wishlist → klik "beli" → otomatis jadi pengeluaran → status wishlist berubah

### 5.3 Dari Tagihan
Tagihan → klik "bayar" → otomatis jadi pengeluaran → status jadi lunas

### 5.4 Transfer
Input transfer → tidak mempengaruhi kategori → hanya perpindahan saldo


---

## 6. Desain Halaman (Lebih Detail untuk UI)

### 6.1 Dashboard (HIGH PRIORITY UI)
Harus paling menarik dan informatif.

Komponen:
- Total pengeluaran bulan ini (highlight utama)
- Total pemasukan
- Selisih / sisa uang
- Grafik ringkas (tren)
- Top kategori
- Transaksi terbaru

Layout:
- Atas: ringkasan (card besar)
- Tengah: grafik
- Bawah: list transaksi

Catatan UI:
- Gunakan card besar + spacing lega
- Angka harus paling menonjol


---

### 6.2 Transaksi (Action Page)
Fokus: input cepat

Struktur UI:
- Toggle: [Pengeluaran | Pemasukan | Transfer]
- Form dinamis (berubah sesuai jenis)

Perilaku:
- Pengeluaran → tampil kategori
- Pemasukan → kategori optional
- Transfer → ganti ke rekening tujuan

Catatan UX:
- Minim field
- Default tanggal hari ini


---

### 6.3 History (Data Exploration)
Fokus: membaca data

Komponen:
- List transaksi
- Filter (jenis, tanggal, kategori)
- Search

UI:
- Table / list compact
- Highlight warna beda tiap jenis


---

### 6.4 Kategori
Fokus: pengelompokan pengeluaran

UI:
- Grid / list
- Icon + nama

Fungsi:
- Tambah / edit / hapus


---

### 6.5 Wishlist (Terintegrasi)
Fokus: planning → eksekusi

UI:
- Card list
- Status: belum / tercapai

Aksi utama:
- Tombol "Beli"

Efek:
- Membuat transaksi pengeluaran otomatis


---

### 6.6 Tagihan (Terintegrasi)
Fokus: kewajiban rutin

UI:
- List dengan due date
- Highlight jika mendekati jatuh tempo

Aksi utama:
- Tombol "Bayar"

Efek:
- Membuat transaksi pengeluaran


---

### 6.7 Metode Pembayaran
Fokus: sumber dana

UI:
- List sederhana

Data:
- Cash
- E-wallet
- Bank

Optional:
- saldo awal


---

## 7. State UI (Penting untuk Konsistensi)

Setiap halaman harus punya:
- Empty state (belum ada data)
- Loading state
- Error state

Contoh:
- "Belum ada transaksi"
- "Tambahkan transaksi pertama"


---

## 8. Prioritas UX

1. Input transaksi harus super cepat
2. Dashboard harus langsung informatif
3. Tidak boleh ada kebingungan antara:
   - pengeluaran vs transfer
4. Wishlist & tagihan harus terasa “terhubung”, bukan fitur terpisah


---

## 9. Pola Interaksi Penting

- 1 klik → tambah transaksi
- 1 klik → bayar tagihan
- 1 klik → realisasikan wishlist

Minim navigasi berulang.


---

## 10. Catatan Desain Penting

- Jangan terlalu banyak warna
- Gunakan warna berbeda hanya untuk:
  - pengeluaran
  - pemasukan
  - transfer
- Gunakan whitespace agar terlihat modern
- Hindari tampilan penuh teks


---

## 11. Kesimpulan

Struktur ini memastikan:
- Data terpusat di transaksi
- UI lebih simpel
- Alur user jelas
- Wishlist & tagihan tidak membingungkan

PRD ini sudah siap dijadikan acuan langsung untuk desain UI/UX maupun implementasi sistem.

