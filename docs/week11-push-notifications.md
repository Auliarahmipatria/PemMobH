# Integrasi Notifikasi Week 11

## Yang sudah ada di aplikasi

- Pengguna dapat meminta izin notifikasi dan mengambil Expo Push Token dari perangkat.
- Token ditampilkan pada dashboard agar bisa dipakai saat menguji pengiriman push.
- Aplikasi mengirim token, platform, email akun demo, dan topik `auction-updates` ke backend demo jika URL backend dikonfigurasi.
- Notifikasi dengan `productId` membuka halaman detail produk saat diketuk, termasuk ketika aplikasi dibuka dari notifikasi.
- Tombol lokal membuat notifikasi di perangkat untuk mencoba alur ketuk-ke-detail. Tombol server mengirim push uji melalui backend.

## Menjalankan backend demo lokal

Project sekarang menyertakan backend Node.js kecil untuk menyimpan token dan mengirim push demo melalui Expo Push Service. Tidak ada package tambahan yang perlu dipasang.

1. Salin `.env.example` menjadi `.env.local`.
2. Ganti alamat `192.168.1.10` pada `EXPO_PUBLIC_PUSH_API_URL` dengan alamat IPv4 laptop. Di Mac, lihat alamat Wi-Fi di System Settings → Wi-Fi → Details, atau gunakan `ipconfig getifaddr en0`. Di Windows, jalankan `ipconfig`. HP dan laptop harus berada di jaringan yang sama; jangan gunakan `localhost` dari HP.
3. Di terminal pertama, jalankan `npm run server:push`.
4. Di terminal kedua, jalankan `npx expo start --dev-client`, lalu buka project memakai development build Bidly di HP.
5. Di dashboard, tekan **AKTIFKAN PUSH**. Server menyimpan token untuk email demo tersebut. Setelah pendaftaran berhasil, tekan **KIRIM PUSH DEMO VIA SERVER**. Push dikirim dari backend ke Expo Push Service, lalu tap notifikasi membuka detail produk.

Backend menyediakan:

- `GET /health` untuk status server dan jumlah token tersimpan.
- `POST /push/register` untuk menyimpan token, platform, email demo, dan topik.
- `POST /push/send-demo` untuk mengirim push ke token yang terdaftar untuk email demo.

Token disimpan lokal di `server/data/push-tokens.json`; folder data ini diabaikan Git. Server demo tidak memiliki autentikasi dan hanya untuk jaringan lokal/penilaian, jangan dipasang terbuka ke internet. Endpoint pengiriman demo menerima email dari aplikasi, jadi ini belum menjadi mekanisme autentikasi akun.

## Menghubungkan backend produksi

Untuk URL backend HTTPS, atur `EXPO_PUBLIC_PUSH_API_URL` pada environment build atau isi `expo.extra.pushApiUrl` di `app.json`. Aplikasi mengirim permintaan `POST` ke `/push/register` dengan bentuk:

```json
{
  "token": "ExponentPushToken[...]",
  "platform": "android",
  "userEmail": "akun@example.com",
  "topics": ["auction-updates"]
}
```

Backend produksi perlu mengautentikasi akun, menyimpan token per pengguna/perangkat, lalu mengirim push melalui Expo Push Service saat ada perubahan lelang. Kredensial pengiriman harus tinggal di backend, bukan di aplikasi. Backend demo lokal di atas menyimpan pendaftaran dan punya tombol untuk mengirim push uji, tetapi belum menerima atau memproses perubahan bid dari aplikasi.

Payload push harus menyertakan data produk supaya tap membuka halaman yang tepat, contohnya:

```json
{
  "title": "Bid baru di lelangmu",
  "body": "Ada tawaran baru untuk Vintage Denim Jacket.",
  "data": {
    "productId": "1",
    "source": "bidly",
    "name": "Vintage Denim Jacket",
    "price": "Rp275.000",
    "image": "https://example.com/item.jpg",
    "category": "Fashion",
    "seller": "Vintage Store",
    "condition": "Good"
  }
}
```

## Menjalankan di perangkat

Push jarak jauh membutuhkan development build/native build dan kredensial push Android FCM atau Apple APNs yang dikonfigurasi untuk EAS. Expo Go di Android tidak mendukung push jarak jauh; notifikasi lokal demo tetap dapat digunakan untuk mencoba navigasi. Lihat [dokumentasi Expo Notifications SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/notifications/) untuk kebutuhan build dan kredensial.
