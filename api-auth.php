<?php
header('Content-Type: application/json');
require_once 'db.php';

$action = $_GET['action'] ?? '';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
require 'vendor/autoload.php';

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

    // Cek duplikasi email/username
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
    $token = bin2hex(random_bytes(32)); // Token verifikasi unik

    // Masukkan ke database dengan status is_verified = 0
    $insert = $conn->prepare("INSERT INTO users (id, username, email, phone_number, password, verification_token, is_verified) VALUES (UUID(), ?, ?, ?, ?, ?, 0)");
    $insert->bind_param("sssss", $username, $email, $phone_number, $hashed_password, $token);

    if ($insert->execute()) {
        // Kirim email via PHPMailer (Gunakan email dan App Password Gmail kamu)
        $mail = new PHPMailer(true);
        try {
            $mail->isSMTP();
            $mail->Host       = 'smtp.gmail.com';
            $mail->SMTPAuth   = true;
            $mail->Username   = 'befast.id@gmail.com';     // Ganti email pengirim
            $mail->Password   = 'qtbb bdzi mons pibm';     // Ganti App Password Gmail
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port       = 587;

            $mail->setFrom('befast.id@gmail.com', 'BeFAST App');
            $mail->addAddress($email, $username);

            $verify_link = "https://befast.my.id/verify.php?token=" . $token;
            $mail->isHTML(true);
            $mail->Subject = 'Verifikasi Akun BeFAST';
            $mail->Body    = "Halo <b>$username</b>,<br><br>Terima kasih sudah mendaftar di BeFAST. Klik link di bawah ini untuk mengaktifkan akunmu:<br><br><a href='$verify_link'>$verify_link</a><br><br>Jika ini bukan kamu, abaikan saja email ini.";

            $mail->send();
            echo json_encode(["success" => true, "message" => "Registrasi berhasil! Silakan cek email."]);
        } catch (Exception $e) {
            echo json_encode(["success" => false, "message" => "Gagal mengirim email verifikasi."]);
        }
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

// --- 3. PROSES LUPA SANDI (KIRIM EMAIL RESET) ---
elseif ($action === 'forgot-password') {
    $data = json_decode(file_get_contents("php://input"), true);
    $email = trim($data['email'] ?? '');

    if (empty($email)) {
        echo json_encode(["success" => false, "message" => "Email wajib diisi!"]);
        exit;
    }

    $stmt = $conn->prepare("SELECT id, username FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($row = $result->fetch_assoc()) {
        $token = bin2hex(random_bytes(32));
        
        // Simpan token reset ke database
        $update = $conn->prepare("UPDATE users SET verification_token = ? WHERE email = ?");
        $update->bind_param("ss", $token, $email);
        $update->execute();

        // Kirim email via PHPMailer
        $mail = new PHPMailer(true);
        try {
            $mail->isSMTP();
            $mail->Host       = 'smtp.gmail.com';
            $mail->SMTPAuth   = true;
            $mail->Username   = 'befast.id@gmail.com';
            $mail->Password   = 'qtbb bdzi mons pibm';
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port       = 587;

            $mail->setFrom('befast.id@gmail.com', 'BeFAST App');
            $mail->addAddress($email, $row['username']);

            // Mengarah ke file reset.php di VPS
            $reset_link = "https://befast.my.id/reset-pass.php?token=" . $token;
            $mail->isHTML(true);
            $mail->Subject = 'Reset Kata Sandi BeFAST';
            $mail->Body    = "Halo <b>{$row['username']}</b>,<br><br>Kami menerima permintaan untuk mereset kata sandi akun BeFAST kamu. Klik tautan di bawah ini untuk membuat sandi baru:<br><br><a href='$reset_link'>$reset_link</a><br><br>Jika kamu tidak merasa meminta ini, abaikan saja email ini.";

            $mail->send();
            echo json_encode(["success" => true, "message" => "Tautan reset password telah dikirim ke email."]);
        } catch (Exception $e) {
            echo json_encode(["success" => false, "message" => "Gagal mengirim email reset."]);
        }
    } else {
        echo json_encode(["success" => false, "message" => "Email tidak terdaftar di database kami."]);
    }
    $stmt->close();
}

// --- 4. PROSES UPDATE SANDI BARU ---
elseif ($action === 'update-password') {
    $data = json_decode(file_get_contents("php://input"), true);
    $token = trim($data['token'] ?? '');
    $new_password = $data['password'] ?? '';

    if (empty($token) || empty($new_password)) {
        echo json_encode(["success" => false, "message" => "Data tidak lengkap!"]);
        exit;
    }

    $hashed_password = password_hash($new_password, PASSWORD_DEFAULT);

    $stmt = $conn->prepare("UPDATE users SET password = ?, verification_token = NULL WHERE verification_token = ?");
    $stmt->bind_param("ss", $hashed_password, $token);
    $stmt->execute();

    if ($stmt->affected_rows > 0) {
        echo json_encode(["success" => true, "message" => "Kata sandi berhasil diperbarui!"]);
    } else {
        echo json_encode(["success" => false, "message" => "Token tidak valid atau kedaluwarsa."]);
    }
    $stmt->close();
}

$conn->close();
?>