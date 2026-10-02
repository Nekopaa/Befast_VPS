<?php
$host = 'localhost';
$db   = 'befast_data';
$user = 'befast_admin'; // Ganti dengan username database Webuzo kamu
$pass = 'b3f4std3v3l0peR'; // Ganti dengan password database Webuzo kamu

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    die(json_encode([
        "success" => false,
        "message" => "Koneksi database gagal: " . $conn->connect_error
    ]));
}

// Set charset ke utf8mb4 agar aman untuk emoji & karakter khusus
$conn->set_charset("utf8mb4");
?>