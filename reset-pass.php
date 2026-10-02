<?php
require_once 'db.php';
$token = $_GET['token'] ?? '';

if (empty($token)) {
    die("Token tidak valid.");
}

// Cek apakah token ada di database
$stmt = $conn->prepare("SELECT id FROM users WHERE verification_token = ?");
$stmt->bind_param("s", $token);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    die("Link reset password tidak valid atau sudah kedaluwarsa.");
}
$stmt->close();
$conn->close();
?>
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Sandi - BeFAST</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css">
</head>
<body class="min-h-screen flex items-center justify-center p-4">
  <div class="theme-card w-full max-w-sm p-8 rounded-3xl shadow-2xl text-center">
    <div class="w-14 h-14 mx-auto mb-3 bg-purple-500/15 text-purple-500 rounded-full flex items-center justify-center text-2xl shadow-inner">
      <i class="fa-solid fa-lock-open"></i>
    </div>
    <h3 class="font-black text-xl theme-primary mb-2">Buat Sandi Baru</h3>
    <p class="text-xs theme-text-muted mb-6">Masukkan kata sandi baru untuk akun BeFAST kamu.</p>
    
    <form id="resetForm" onsubmit="submitNewPassword(event)" class="space-y-4">
      <input type="hidden" id="resetToken" value="<?php echo htmlspecialchars($token); ?>">
      <input type="password" id="newPass" required minlength="6" placeholder="Sandi Baru (Min. 6 Karakter)" class="w-full p-3.5 rounded-full border border-gray-400/20 bg-transparent text-sm theme-text outline-none font-bold">
      <input type="password" id="confirmPass" required minlength="6" placeholder="Konfirmasi Sandi Baru" class="w-full p-3.5 rounded-full border border-gray-400/20 bg-transparent text-sm theme-text outline-none font-bold">
      <button type="submit" id="btnSubmitReset" class="w-full py-3.5 theme-bg-primary text-sm font-black rounded-full hover:opacity-80 transition shadow-lg">Simpan Sandi Baru</button>
    </form>
  </div>

  <script>
    async function submitNewPassword(e) {
      e.preventDefault();
      const token = document.getElementById('resetToken').value;
      const p1 = document.getElementById('newPass').value;
      const p2 = document.getElementById('confirmPass').value;
      const btn = document.getElementById('btnSubmitReset');

      if (p1 !== p2) {
        alert('Konfirmasi sandi tidak cocok!');
        return;
      }

      btn.disabled = true;
      btn.innerHTML = 'Menyimpan...';

      try {
        const res = await fetch('api-auth.php?action=update-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: token, password: p1 })
        });
        const result = await res.json();
        
        if (!result.success) throw new Error(result.message);

        alert('Sandi berhasil diubah! Silakan masuk dengan sandi baru.');
        window.location.href = 'index.html';
      } catch (err) {
        alert(err.message);
        btn.disabled = false;
        btn.innerHTML = 'Simpan Sandi Baru';
      }
    }
  </script>
</body>
</html>