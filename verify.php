<?php
require_once 'db.php';
$token = $_GET['token'] ?? '';

if (empty($token)) {
    die("Token tidak valid.");
}

// Cari token di database
$stmt = $conn->prepare("SELECT id FROM users WHERE verification_token = ? AND is_verified = 0");
$stmt->bind_param("s", $token);
$stmt->execute();
$stmt->store_result();

if ($stmt->num_rows > 0) {
    // Aktifkan akun dan hapus token
    $update = $conn->prepare("UPDATE users SET is_verified = 1, verification_token = NULL WHERE verification_token = ?");
    $update->bind_param("s", $token);
    $update->execute();
    
    echo "<h1>Verifikasi Berhasil!</h1><p>Akun BeFAST kamu sudah aktif. <a href='https://befast.my.id'>Klik di sini untuk Login</a>.</p>";
} else {
    echo "<h1>Gagal!</h1><p>Link verifikasi tidak valid atau akun sudah pernah diverifikasi.</p>";
}
$stmt->close();
$conn->close();
?>