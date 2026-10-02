<?php
header('Content-Type: application/json');
require_once 'db.php';

$method =$_SERVER['REQUEST_METHOD'];

// --- 1. AMBIL TRANSAKSI (GET) ---
if ($method === 'GET') {
    $user_id =$_GET['user_id'] ?? '';
    if (empty($user_id)) {
        echo json_encode(["success" => false, "message" => "User ID tidak valid!"]);
        exit;
    }

    $stmt =$conn->prepare("SELECT id, user_id, date, type, category, amount, `desc` FROM transactions WHERE user_id = ? ORDER BY date DESC, id DESC");
    $stmt->bind_param("s", $user_id);
    $stmt->execute();$result = $stmt->get_result();$transactions = [];
    while ($row =$result->fetch_assoc()) {
        $transactions[] =$row;
    }
    
    echo json_encode(["success" => true, "data" => $transactions]);$stmt->close();
}

// --- 2. TAMBAH TRANSAKSI (POST) ---
elseif ($method === 'POST') {$data = json_decode(file_get_contents("php://input"), true);
    
    $user_id  =$data['user_id'] ?? '';
    $date     =$data['date'] ?? '';
    $type     =$data['type'] ?? '';
    $category =$data['category'] ?? '';
    $amount   =$data['amount'] ?? 0;
    $desc     =$data['desc'] ?? '';

    // PERBAIKAN: Mengganti \vert{}\vert{} dengan operator OR (||) yang valid
    if (empty($user_id) || empty($date) || empty($type) || empty($amount)) {        echo json_encode(["success" => false, "message" => "Data transaksi tidak lengkap!"]);
        exit;
    }

    $stmt =$conn->prepare("INSERT INTO transactions (user_id, date, type, category, amount, `desc`) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("ssssis", $user_id,$date, $type,$category, $amount,$desc);

    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Transaksi berhasil disimpan!"]);
    } else {
        echo json_encode(["success" => false, "message" => "Gagal menyimpan transaksi."]);
    }
    $stmt->close();
}

// --- 3. HAPUS TRANSAKSI (DELETE) ---
elseif ($method === 'DELETE') {$data = json_decode(file_get_contents("php://input"), true);
    $id =$data['id'] ?? '';

    if (empty($id)) {
        echo json_encode(["success" => false, "message" => "ID transaksi tidak valid!"]);
        exit;
    }

    $stmt =$conn->prepare("DELETE FROM transactions WHERE id = ?");
    $stmt->bind_param("s", $id);

    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Transaksi berhasil dihapus!"]);
    } else {
        echo json_encode(["success" => false, "message" => "Gagal menghapus transaksi."]);
    }
    $stmt->close();
}

$conn->close();
?>