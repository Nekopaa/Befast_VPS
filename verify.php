<?php
require_once 'db.php';
$token = $_GET['token'] ?? '';

if (empty($token)) {
    die("Token verifikasi tidak valid.");
}

$stmt = $conn->prepare("SELECT id, username, email, phone_number FROM users WHERE verification_token = ? AND is_verified = 0");
$stmt->bind_param("s", $token);
$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {
    // Ubah status jadi aktif dan kosongkan token
    $update = $conn->prepare("UPDATE users SET is_verified = 1, verification_token = NULL WHERE verification_token = ?");
    $update->bind_param("s", $token);
    $update->execute();
    
    $user_json = json_encode($row);
    
    // Auto-login dengan menyuntikkan ke localStorage lalu redirect ke beranda
    echo "<script>
        localStorage.setItem('bf_user', JSON.stringify($user_json));
        window.location.href = 'https://befast.my.id/';
    </script>";
} else {
    echo "<script>
        alert('Link verifikasi tidak valid atau kedaluwarsa.');
        window.location.href = 'https://befast.my.id/';
    </script>";
}

$stmt->close();
$conn->close();
?>