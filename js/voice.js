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
  } else if (action.type === 'edit') {
    await fetch('api-transactions.php', {
      method: 'POST', // atau sesuaikan endpoint update
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', id: id, ...action.payload })
    });
    speak(action.successText);
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

function parseNominal(str) {
  if (!str) return 0;
  let raw = str.toLowerCase().replace(/tanggal\s*\d{1,2}/gi, '').replace(/tahun\s*\d{4}/gi, '').replace(/rp|rupiah/gi, '').trim();
  raw = raw.replace(/\b\d+\s*(porsi|bungkus|piring|orang|buah|butir)\b/gi, '');
  raw = raw.replace(/(\d+)([a-z]+)/gi, '$1 $2');
  
  const slangMap = { 'gocap': '50 ribu', 'cepek': '100 ribu', 'gopek': '500 ribu', 'seceng': '1 ribu', 'goceng': '5 ribu', 'ceban': '10 ribu', 'goban': '50 ribu', 'pekgo': '150 ribu', 'tigo': '30 ribu' };
  for (const [slang, value] of Object.entries(slangMap)) {
    raw = raw.replace(new RegExp(`\\b${slang}\\b`, 'gi'), value);
  }

  let matches = raw.match(/\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d{1,3}(?:,\d{3})+(?:\.\d+)?/g);
  if(matches && matches.length > 0) {
    let maxVal = 0;
    for (let match of matches) { 
      let cleanNumStr = match.split(',')[0].replace(/\./g, ''); 
      let val = parseInt(cleanNumStr, 10); 
      if (!isNaN(val) && val > maxVal) maxVal = val; 
    }
    if (maxVal > 0) return maxVal;
  }
  return 0;
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
  
  // REGEX PEMBERSIH KETERANGAN YANG KUAT (MEMBUANG KATA PERINTAH & NOMINAL)
  let desc = cmd
    .replace(/\b(pemasukan|pengeluaran|masuk|keluar|beli|bayar|dapet|dapat|catat|tambah|tolong|edit|ubah|ganti|jadi|menjadi)\b/gi, '')
    .replace(/\b(kemarin|kemaren|hari ini|tanggal\s*\d{1,2})\b/gi, '')
    .replace(/rp\s*\d+([.,]\d+)?/gi, '')
    .replace(/\b\d{1,3}(\.\d{3})+(,\d+)?\b|\b\d{1,3}(,\d{3})+(\.\d+)?\b/g, '')
    .replace(/\b\d+\s*(ribu|rb|k|juta|jt)\b/gi, '')
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
  
  let itemsToDelete = transactions.filter(t => {
    if (isIncome && t.type !== 'pemasukan') return false; 
    if (isExpense && t.type !== 'pengeluaran') return false;
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

async function executeVoiceEdit(cmd) {
  let newAmount = parseNominal(cmd);
  let targetType = null; 
  if (/(pemasukan|masuk|dapat|dapet)/i.test(cmd)) targetType = 'pemasukan'; 
  if (/(pengeluaran|keluar|beli|bayar)/i.test(cmd)) targetType = 'pengeluaran';
  
  let keyword = cmd.replace(/(ubah|edit|ganti|jadi|menjadi|pemasukan|pengeluaran|masuk|keluar|beli|bayar|dapet|dapat)/gi, '').replace(/rp\s*\d+([.,]\d+)?/gi, '').trim();

  let matches = transactions.filter(t => {
    if (targetType && t.type !== targetType) return false;
    return true;
  });

  if (matches.length === 0) return speak("Aduh, data transaksi yang mau diedit gak ditemukan nih.");
  
  let payload = null;
  let speakText = "";
  if (newAmount > 0) {
    payload = { amount: newAmount };
    speakText = `Sip! Nominal diubah jadi ${newAmount.toLocaleString('id-ID')} rupiah.`;
  } else {
    let parts = cmd.split(/ (jadi|menjadi) /i);
    if (parts.length >= 3) {
      let newDesc = parts.slice(2).join(' ').trim();
      newDesc = newDesc.charAt(0).toUpperCase() + newDesc.slice(1);
      payload = { desc: newDesc, category: typeof detectCategory === 'function' ? detectCategory(newDesc, matches[0].type) : 'Lain-lain' };
      speakText = `Sip! Keterangan diubah menjadi ${newDesc}.`;
    } else {
      return speak("Sebutkan nominal baru atau nama baru. Contoh: Edit kopi jadi tiga puluh ribu.");
    }
  }

  if (matches.length === 1) {
    if(typeof updateSyncStatusUI === 'function') updateSyncStatusUI(false, 'Menyimpan...');
    // Kirim update ke API PHP VPS
    await fetch('api-transactions.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', id: matches[0].id, ...payload })
    });
    await fetchTransactionsFromSupabase(); 
    speak(speakText);
  } else {
    window.pendingVoiceAction = { type: 'edit', payload: payload, successText: speakText };
    showAmbiguitySelection(matches);
    speak(`Ada ${matches.length} data yang cocok. Tolong tap mana yang mau diedit di layar.`);
  }
}

function executeVoiceDownload(cmd) { openExportModal(); speak("Silakan download laporannya."); }

// PENGEMBALIAN FITUR CEK LAPORAN / SPILL LENGKAP SEPERTI SEMULA
function executeVoiceReadout(cmd) {
  let scope = parseDateScopeFromCommand(cmd);
  let filtered = transactions.filter(t => scope.label === 'keseluruhan' || scope.func(t));
  
  if (filtered.length === 0) {
    return speak(`Tidak ada catatan transaksi untuk ${scope.label}.`);
  }

  let incomes = filtered.filter(t => t.type === 'pemasukan');
  let expenses = filtered.filter(t => t.type === 'pengeluaran');

  let inTotal = incomes.reduce((sum, t) => sum + t.amount, 0);
  let exTotal = expenses.reduce((sum, t) => sum + t.amount, 0);
  let netBalance = inTotal - exTotal;

  let speech = `Laporan keuangan ${scope.label}. `;

  if (incomes.length > 0) {
    speech += "Rincian pemasukan: ";
    speech += incomes.map(t => `${t.desc} ${t.amount.toLocaleString('id-ID')} rupiah`).join(', ') + ". ";
  }

  if (expenses.length > 0) {
    speech += "Rincian pengeluaran: ";
    speech += expenses.map(t => `${t.desc} ${t.amount.toLocaleString('id-ID')} rupiah`).join(', ') + ". ";
  }

  speech += `Total pemasukan ${inTotal.toLocaleString('id-ID')} rupiah, total pengeluaran ${exTotal.toLocaleString('id-ID')} rupiah. Sisa saldo bersih kamu adalah ${netBalance.toLocaleString('id-ID')} rupiah.`;

  speak(speech.trim());
}

async function processVoiceCommand(cmd) {
  const user = getCurrentUser(); 
  if (!user) { openLoginModal(); return; }
  
  if (cmd.includes('edit') || cmd.includes('ubah') || cmd.includes('ganti')) { executeVoiceEdit(cmd); return; }
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