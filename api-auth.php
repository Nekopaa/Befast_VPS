<?php
header('Content-Type: application/json');
require_once 'db.php';

$action = $_GET['action'] ?? '';

// --- 1. PROSES REGISTER ---
if ($action === 'register') {
    $data = json_decode(file_get_contents("php://input"), true);
    $username = trim($data['username'] ?? '');
    $email = trim($data['email'] ?? '');
    $phone_number = trim($data['phone_number'] ?? '');
    $password = $data['password'] ?? '';

    if (empty($username) || empty($email) || empty($password)) {
        echo json_encode(["success" => false, "message" => "Semua kolom wajib diisi!"]);
        exit;
    }

    $stmt = $conn->prepare("SELECT id FROM users WHERE email = ? OR username = ?");
    $stmt->bind_param("ss", $email, $username);
    $stmt->execute();
    $stmt->store_result();
    if ($stmt->num_rows > 0) {
        echo json_encode(["success" => false, "message" => "Email atau Username sudah digunakan!"]);
        exit;
    }
    $stmt->close();

    $hashed_password = password_hash($password, PASSWORD_DEFAULT);
    $token = bin2hex(random_bytes(32)); // Buat token acak 64 karakter

    $insert = $conn->prepare("INSERT INTO users (id, username, email, phone_number, password, verification_token, is_verified) VALUES (UUID(), ?, ?, ?, ?, ?, 0)");
    $insert->bind_param("sssss", $username, $email, $phone_number, $hashed_password, $token);

    if ($insert->execute()) {
        // Kirim Email Bawaan Server
        $verify_link = "https://befast.my.id/verify.php?token=" . $token;
        $subject = "Verifikasi Akun BeFAST";
        $message = "Halo $username,\n\nTerima kasih sudah mendaftar di BeFAST. Klik link di bawah ini untuk mengaktifkan akunmu:\n$verify_link\n\nJika ini bukan kamu, abaikan saja email ini.";
        $headers = "From: noreply@befast.my.id\r\n";
        
        mail($email, $subject, $message, $headers);

        echo json_encode(["success" => true, "message" => "Registrasi berhasil!"]);
    } else {
        echo json_encode(["success" => false, "message" => "Gagal mendaftarkan akun."]);
    }
    $insert->close();
}

// --- 2. PROSES LOGIN ---
elseif ($action === 'login') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    $login_input = trim($data['login'] ?? ''); // Bisa berupa No HP atau Email
    $password    = $data['password'] ?? '';

    if (empty($login_input) || empty($password)) {
        echo json_encode(["success" => false, "message" => "Masukkan nomor HP/email dan sandi!"]);
        exit;
    }

    // Cari user berdasarkan email atau nomor telepon
    $stmt = $conn->prepare("SELECT id, username, email, phone_number, password FROM users WHERE email = ? OR phone_number = ?");
    $stmt->bind_param("ss", $login_input, $login_input);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($row = $result->fetch_assoc()) {
        // Verifikasi password
        if (password_verify($password, $row['password'])) {
            // Hilangkan password dari data balasan ke frontend demi keamanan
            unset($row['password']);
            echo json_encode([
                "success" => true,
                "message" => "Login berhasil!",
                "user"    => $row
            ]);
        } else {
            echo json_encode(["success" => false, "message" => "Kata sandi salah!"]);
        }
    } else {
        echo json_encode(["success" => false, "message" => "Akun tidak ditemukan!"]);
    }
    $stmt->close();
}
$conn->close();
?>