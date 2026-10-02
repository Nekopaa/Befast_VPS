// --- MESIN MEMORI AMBIGUITAS ---
window.pendingVoiceAction = null;

window.showAmbiguitySelection = function(items) {
  try {
    let htmlMobile = '';
    let htmlDesktop = `<button onclick="cancelAmbiguity()" class="mb-3 w-full py-2.5 bg-red-500/10 text-red-500 rounded-xl text-xs font-bold hover:bg-red-500/20 border border-red-500/20 transition cursor-pointer"><i class="fa-solid fa-ban"></i> Batal Edit/Hapus</button>`;
    
    items.forEach(t => { 
      htmlMobile += createAmbiguityCard(t, false); 
      htmlDesktop += createAmbiguityCard(t, true);
    });

    if (window.innerWidth < 768) {
      const list = document.getElementById('ambiguityList');
      if (list) list.innerHTML = htmlMobile;
      const modal = document.getElementById('ambiguityModal');
      if (modal) modal.classList.remove('hidden');
    } else {
      const list = document.getElementById('transactionList');
      if (list) list.innerHTML = htmlDesktop;
    }
  } catch (err) {
    console.error("Crash di UI Ambiguitas:", err);
    speak("Aduh, ada data yang formatnya rusak waktu mau ditampilin.");
  }
};

function createAmbiguityCard(t, isDesktop) {
  let color = t.type === 'pemasukan' ? 'text-green-500' : 'text-red-500';
  let sign = t.type === 'pemasukan' ? '+' : '-';
  let safeAmount = Number(t.amount) || 0; 
  let isDelete = window.pendingVoiceAction && window.pendingVoiceAction.type === 'delete';
  let actionText = isDelete ? 'Tap untuk hapus <i class="fa-solid fa-trash-can"></i>' : 'Tap untuk ubah <i class="fa-solid fa-hand-pointer"></i>';
  let actionColor = isDelete ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500';
  
  let cls = isDesktop 
    ? 'ambiguous-item shrink-0 w-full theme-glass p-4 rounded-2xl flex justify-between items-center cursor-pointer' 
    : 'theme-glass shrink-0 w-full p-4 rounded-xl flex justify-between items-center border border-gray-400/20 active:scale-95 transition cursor-pointer';
    
  return `
    <div onclick="resolveAmbiguity('${t.id}')" class="${cls} relative overflow-hidden group">
      <div class="relative z-10 min-w-0 flex-1 pr-2 pointer-events-none">
        <p class="font-bold text-sm theme-text truncate">${t.desc || 'Tanpa Keterangan'}</p>
        <p class="text-[10px] theme-text-muted mt-1 truncate"><i class="fa-regular fa-calendar"></i> ${t.date || '-'} • ${t.category || '-'}</p>
      </div>
      <div class="relative z-10 text-right shrink-0 pointer-events-none">
        <p class="font-black text-sm ${color}">${sign} Rp ${safeAmount.toLocaleString('id-ID')}</p>
        <div class="mt-1.5 inline-block ${actionColor} text-[9px] px-2 py-0.5 rounded-full font-bold">${actionText}</div>
      </div>
    </div>
  `;
}

window.resolveAmbiguity = async function(id) {
  const action = window.pendingVoiceAction;
  if(!action) return;
  if(typeof updateSyncStatusUI === 'function') updateSyncStatusUI(false, 'Memproses...');
  
  if (action.type === 'delete') {
    await fetch('api-transactions.php', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: id })
    });
    speak("Sip! Berhasil dihapus.");
  }
  
  cancelAmbiguity();
  if (typeof fetchTransactionsFromSupabase === 'function') await fetchTransactionsFromSupabase();
};

window.cancelAmbiguity = function() {
  window.pendingVoiceAction = null;
  const modal = document.getElementById('ambiguityModal');
  if (modal) modal.classList.add('hidden');
  if (typeof fetchTransactionsFromSupabase === 'function') fetchTransactionsFromSupabase(); 
};

function getLocalDateStr(dateObj = new Date()) { 
  const year = dateObj.getFullYear(); 
  const month = String(dateObj.getMonth() + 1).padStart(2, '0'); 
  const day = String(dateObj.getDate()).padStart(2, '0'); 
  return `${year}-${month}-${day}`; 
}

function getRelativeDateStr(modifier) {
  let d = new Date(); 
  if (modifier === 'kemarin') d.setDate(d.getDate() - 1); 
  else if (modifier === 'bulan_lalu') d.setMonth(d.getMonth() - 1); 
  else if (modifier === 'tahun_lalu') d.setFullYear(d.getFullYear() - 1);
  const year = d.getFullYear(); 
  const month = String(d.getMonth() + 1).padStart(2, '0'); 
  const day = String(d.getDate()).padStart(2, '0'); 
  return { full: `${year}-${month}-${day}`, ym: `${year}-${month}`, year: `${year}` };
}

document.addEventListener('DOMContentLoaded', () => { 
  const mDate = document.getElementById('manualDate'); 
  if(mDate) mDate.value = getLocalDateStr(); 
});

function speak(text) {
  if (!('speechSynthesis' in window)) return; 
  window.speechSynthesis.cancel(); 
  const utterance = new SpeechSynthesisUtterance(text); 
  utterance.lang = 'id-ID'; 
  utterance.rate = 1.05; 
  window.speechSynthesis.speak(utterance);
}

// PARSER NOMINAL CERDAS (Mendukung angka numerik, juta, milyar, dan ratusan juta)
function parseNominal(str) {
  if (!str) return 0;
  let raw = str.toLowerCase().replace(/tanggal\s*\d{1,2}/gi, '').replace(/tahun\s*\d{4}/gi, '').replace(/rp|rupiah/gi, '').trim();
  raw = raw.replace(/\b\d+\s*(porsi|bungkus|piring|orang|buah|butir)\b/gi, '');

  // 1. Tangkap angka numerik langsung jika user menyebutkan format angka (contoh: 252241 atau 2.541)
  let directMatches = raw.match(/\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+/g);
  if (directMatches && directMatches.length > 0) {
    // Jika ada angka utuh yang panjang atau ada kata "ribu/juta" di dekatnya, kita proses
    let joined = directMatches.join('');
    if (!raw.includes('juta') && !raw.includes('ribu') && !raw.includes('miliar') && plainNumberIsValid(raw, joined)) {
      return parseInt(joined, 10);
    }
  }

  // 2. Kamus slang/bahasa gaul
  const slangMap = { 'gocap': 50000, 'cepek': 100000, 'gopek': 500000, 'seceng': 1000, 'goceng': 5000, 'ceban': 10000, 'goban': 50000, 'pekgo': 150000, 'tigo': 30000 };
  for (const [slang, val] of Object.entries(slangMap)) {
    if (new RegExp(`\\b${slang}\\b`, 'gi').test(raw)) return val;
  }

  // 3. Parser Verbal Terstruktur (Mengubah kata-kata "dua juta lima ratus empat puluh satu ribu" menjadi angka pasti)
  const words = raw.replace(/[^a-z\s]/g, '').split(/\s+/);
  let total = 0;
  let currentSegment = 0;
  let currentMultiplier = 1;

  const numWords = {
    'satu': 1, 'se': 1, 'dua': 2, 'tiga': 3, 'empat': 4, 'lima': 5, 
    'enam': 6, 'tujuh': 7, 'delapan': 8, 'sembilan': 9, 'sepuluh': 10, 'sebelas': 11
  };

  for (let i = 0; i < words.length; i++) {
    let w = words[i];
    if (w === 'belas') {
      currentSegment += 10;
    } else if (w === 'puluh') {
      currentSegment = (currentSegment === 0 ? 1 : currentSegment) * 10;
    } else if (w === 'ratus') {
      currentSegment = (currentSegment === 0 ? 1 : currentSegment) * 100;
    } else if (w === 'ribu' || w === 'rb' || w === 'k') {
      currentSegment = (currentSegment === 0 ? 1 : currentSegment) * 1000;
      total += currentSegment;
      currentSegment = 0;
    } else if (w === 'juta' || w === 'jt') {
      currentSegment = (currentSegment === 0 ? 1 : currentSegment) * 1000000;
      total += currentSegment;
      currentSegment = 0;
    } else if (w === 'miliar' || w === 'milyar') {
      currentSegment = (currentSegment === 0 ? 1 : currentSegment) * 1000000000;
      total += currentSegment;
      currentSegment = 0;
    } else if (numWords[w] !== undefined) {
      currentSegment += numWords[w];
    } else if (!isNaN(parseInt(w))) {
      currentSegment += parseInt(w, 10);
    }
  }

  total += currentSegment;
  return total > 0 ? total : 0;
}

function plainNumberIsValid(raw, joined) {
  // Hanya ambil sebagai angka langsung jika tidak ada kata ribuan verbal yang rancu
  return joined.length <= 8 && !raw.includes('ribu') && !raw.includes('juta');
}

function extractTransactionDetails(cmd, type) {
  let amount = parseNominal(cmd); 
  let transactionDate = getLocalDateStr();
  
  if (cmd.includes('kemarin') || cmd.includes('kemaren')) { 
    transactionDate = getRelativeDateStr('kemarin').full; 
  } else { 
    let dateMatch = cmd.match(/tanggal\s*(\d{1,2})/i); 
    if (dateMatch) { 
      let dayNum = parseInt(dateMatch[1], 10); 
      if (dayNum >= 1 && dayNum <= 31) { 
        let target = new Date(); 
        target.setDate(dayNum); 
        transactionDate = getLocalDateStr(target); 
      } 
    } 
  }
  
  let desc = cmd
    .replace(/\b(pemasukan|pengeluaran|masuk|keluar|beli|bayar|dapet|dapat|catat|tambah|tolong)\b/gi, '')
    .replace(/\b(kemarin|kemaren|hari ini|tanggal\s*\d{1,2})\b/gi, '')
    .replace(/rp\s*\d+([.,]\d+)?/gi, '')
    .replace(/\b\d{1,3}(\.\d{3})+(,\d+)?\b|\b\d{1,3}(,\d{3})+(\.\d+)?\b/g, '')
    .replace(/\b\d+\b/g, '') // Bersihkan sisa angka tunggal
    .replace(/\b\d+\s*(ribu|rb|k|juta|jt|miliar|milyar)\b/gi, '')
    .replace(/\b(gocap|cepek|gopek|seceng|goceng|ceban|goban|pekgo|tigo)\b/gi, '')
    .replace(/[.,]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
    
  if (!desc) { desc = type === 'pemasukan' ? 'Pemasukan Lain' : 'Pengeluaran Lain'; } 
  else { desc = desc.charAt(0).toUpperCase() + desc.slice(1); }
  
  return { amount, desc, date: transactionDate };
}

function parseDateScopeFromCommand(cmd) {
  let periodLabel = "keseluruhan"; let filterFunc = () => true;
  if (cmd.includes('bulan lalu') || cmd.includes('bulan kemarin')) return { label: "bulan lalu", func: t => t.date.startsWith(getRelativeDateStr('bulan_lalu').ym) };
  if (cmd.includes('hari ini')) return { label: "hari ini", func: t => t.date === getLocalDateStr() };
  if (cmd.includes('kemarin')) return { label: "kemarin", func: t => t.date === getRelativeDateStr('kemarin').full };
  return { label: periodLabel, func: filterFunc };
}

async function executeVoiceDelete(cmd) {
  let isIncome = cmd.includes('pemasukan') || cmd.includes('masuk'); 
  let isExpense = cmd.includes('pengeluaran') || cmd.includes('keluar') || cmd.includes('beli') || cmd.includes('bayar');
  let isBulkDelete = cmd.includes('semua') || cmd.includes('semuanya'); 
  
  // Ekstrak keyword nama barang (contoh: "bebek") dari perintah hapus
  let keyword = cmd
    .replace(/(hapus|delete|hilangin|bersihin|buang|pemasukan|pengeluaran|masuk|keluar|dapet|dapat|beli|bayar|semua|semuanya)/gi, '')
    .replace(/(kemarin|kemaren|hari ini|bulan ini|bulan lalu|tanggal\s*\d{1,2})/gi, '')
    .trim();

  let itemsToDelete = transactions.filter(t => {
    if (isIncome && t.type !== 'pemasukan') return false; 
    if (isExpense && t.type !== 'pengeluaran') return false;
    // Jika ada keyword spesifik (seperti "bebek"), pastikan deskripsi mengandung keyword tersebut
    if (keyword && !t.desc.toLowerCase().includes(keyword.toLowerCase())) return false;
    return true;
  });

  if (itemsToDelete.length === 0) return speak(`Aduh, tidak ditemukan transaksi yang cocok untuk dihapus.`);
  
  if (itemsToDelete.length === 1 || isBulkDelete) {
    if(typeof updateSyncStatusUI === 'function') updateSyncStatusUI(false, 'Menghapus data...');
    
    for (let item of itemsToDelete) {
      await fetch('api-transactions.php', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id })
      });
    }
    
    if (typeof fetchTransactionsFromSupabase === 'function') await fetchTransactionsFromSupabase(); 
    speak(itemsToDelete.length > 1 ? `Sip! Berhasil menghapus ${itemsToDelete.length} data sekaligus.` : `Sip! Berhasil dihapus.`); 
  } else {
    window.pendingVoiceAction = { type: 'delete' };
    showAmbiguitySelection(itemsToDelete);
    speak(`Ada ${itemsToDelete.length} data yang cocok. Tolong tap mana yang mau dihapus di layar.`);
  }
}

function executeVoiceDownload(cmd) { openExportModal(); speak("Silakan download laporannya."); }

function executeVoiceReadout(cmd) {
  let scope = parseDateScopeFromCommand(cmd);
  let filtered = transactions.filter(t => scope.label === 'keseluruhan' || scope.func(t));
  if (filtered.length === 0) return speak("Tidak ada catatan transaksi.");
  let inTotal = filtered.filter(t => t.type === 'pemasukan').reduce((s, t) => s + t.amount, 0);
  let exTotal = filtered.filter(t => t.type === 'pengeluaran').reduce((s, t) => s + t.amount, 0);
  speak(`Total pemasukan ${inTotal.toLocaleString('id-ID')} rupiah, total pengeluaran ${exTotal.toLocaleString('id-ID')} rupiah.`);
}

async function processVoiceCommand(cmd) {
  const user = getCurrentUser(); 
  if (!user) { openLoginModal(); return; }
  
  if (cmd.includes('hapus') || cmd.includes('delete') || cmd.includes('buang')) { executeVoiceDelete(cmd); return; }
  if (cmd.includes('download') || cmd.includes('unduh') || cmd.includes('ekspor')) { executeVoiceDownload(cmd); return; }
  if (cmd.includes('grafik') || cmd.includes('chart')) { showChartModal(cmd); return; }
  if (cmd.includes('baca') || cmd.includes('cek') || cmd.includes('spill') || cmd.includes('total')) { executeVoiceReadout(cmd); return; }

  let subCommands = cmd.split(/\s+(?:dan|terus|lalu|serta)\s+|,+/g);
  let successCount = 0;

  updateSyncStatusUI(false, 'Memproses banyak data...');

  for (let subCmd of subCommands) {
    subCmd = subCmd.trim();
    if (!subCmd) continue;

    const nominal = parseNominal(subCmd);
    if (nominal > 0) {
      let type = 'pengeluaran'; 
      if (/(pemasukan|masuk|dapet|dapat|gaji|thr|transferan)/i.test(subCmd)) type = 'pemasukan';
      
      let { amount, desc, date } = extractTransactionDetails(subCmd, type);

      if (amount > 0) {
        const category = detectCategory(desc, type); 
        
        const response = await fetch('api-transactions.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            date: date,
            type: type,
            category: category,
            amount: amount,
            desc: desc
          })
        });
        const result = await response.json();

        if (result.success) {
          successCount++;
        }
      }
    }
  }

  if (successCount > 0) {
    await fetchTransactionsFromSupabase();
    speak(`Siap! Berhasil mencatat ${successCount} transaksi.`);
  } else {
    speak("Nominal angkanya belum ketangkap nih. Coba sebutkan nominalnya dengan jelas.");
  }
}

// --- KAMUS KOREKSI SUARA (AUTO-CORRECT) ---
function applyVoiceCorrections(text) {
  let corrected = text.toLowerCase();
  const corrections = { 'copy': 'kopi', 'the': 'teh', 'project': 'gojek', 'st': 'es teh', 'grab foot': 'grabfood', 'go foot': 'gofood' };
  for (const [wrong, right] of Object.entries(corrections)) {
    corrected = corrected.replace(new RegExp(`\\b${wrong}\\b`, 'gi'), right);
  }
  return corrected;
}

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null; let isListening = false; let transcript = '';

if (SpeechRecognition) {
  recognition = new SpeechRecognition(); 
  recognition.lang = 'id-ID';
  
  recognition.onstart = () => { 
    isListening = true; 
    transcript = ''; 
    const mic = document.getElementById('btnMic');
    if(mic) { mic.classList.remove('mic-idle'); mic.classList.add('mic-listening'); }
    const status = document.getElementById('speechStatus');
    if(status) status.innerText = "Mendengarkan..."; 
  };
  
  recognition.onresult = (e) => { 
    let raw = Array.from(e.results).map(r => r[0].transcript).join(''); 
    transcript = applyVoiceCorrections(raw);
    document.getElementById('transcriptText').innerText = `"${transcript}"`; 
  };
  
  recognition.onend = () => { 
    isListening = false; 
    const mic = document.getElementById('btnMic');
    if(mic) { mic.classList.add('mic-idle'); mic.classList.remove('mic-listening'); }
    const status = document.getElementById('speechStatus');
    if(status) status.innerText = "Klik mikrofon"; 
    if (transcript.length >= 3) processVoiceCommand(transcript.toLowerCase()); 
  };
}

document.getElementById('btnMic').addEventListener('click', () => {
  if(!getCurrentUser()) { speak("Masuk dulu ya!"); openLoginModal(); return; }
  if(isListening) recognition.stop(); else recognition.start();
});