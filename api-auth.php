<?php
header('Content-Type: application/json');
require_once 'db.php';

$action = $_GET['action'] ?? '';

// --- 1. PROSES REGISTER ---
if ($action === 'register') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    $username     = trim($data['username'] ?? '');
    $email        = trim($data['email'] ?? '');
    $phone_number = trim($data['phone_number'] ?? '');
    $password     = $data['password'] ?? '';

    if (empty($username) || empty($email) || empty($password)) {
        echo json_encode(["success" => false, "message" => "Semua kolom wajib diisi!"]);
        exit;
    }

    // Cek apakah email/username sudah terdaftar
    $stmt = $conn->prepare("SELECT id FROM users WHERE email = ? OR username = ?");
    $stmt->bind_param("ss", $email, $username);
    $stmt->execute();
    $stmt->store_result();

    if ($stmt->num_rows > 0) {
        echo json_encode(["success" => false, "message" => "Email atau Username sudah digunakan!"]);
        exit;
    }
    $stmt->close();

    // Hash password agar aman
    $hashed_password = password_hash($password, PASSWORD_DEFAULT);

    // Simpan ke database
    $insert = $conn->prepare("INSERT INTO users (username, email, phone_number, password) VALUES (?, ?, ?, ?)");
    $insert->bind_param("ssss", $username, $email, $phone_number, $hashed_password);

    if ($insert->execute()) {
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