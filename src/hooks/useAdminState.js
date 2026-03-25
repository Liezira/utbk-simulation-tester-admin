import { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import {
  doc, getDoc, setDoc, updateDoc, collection, getDocs, deleteDoc,
  onSnapshot, query, orderBy, deleteField, increment, limit,
  writeBatch, startAfter, where, getCountFromServer
} from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import * as XLSX from 'xlsx';
import {
  SUBTESTS, STUDENT_APP_URL, FONNTE_TOKEN, SEND_DELAY, VIOLATION_SCORING
} from '../constants/config';
import { isExpired, buildWhatsAppMessage } from '../utils/helpers';

const useAdminState = () => {
  const [isCheckingRole, setIsCheckingRole] = useState(true);
  const [screen, setScreen] = useState('admin_login');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [viewMode, setViewMode] = useState('tokens');

  // Token state
  const [tokenList, setTokenList] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isNextAvailable, setIsNextAvailable] = useState(false);
  const [lastVisible, setLastVisible] = useState(null);
  const [firstVisible, setFirstVisible] = useState(null);
  const [pageHistory, setPageHistory] = useState([]);
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenSchool, setNewTokenSchool] = useState('');
  const [newTokenPhone, setNewTokenPhone] = useState('');
  const [autoSendMode, setAutoSendMode] = useState('fonnte');
  const [isSending, setIsSending] = useState(false);

  // User state
  const [userList, setUserList] = useState([]);
  const [userCurrentPage, setUserCurrentPage] = useState(1);
  const [userIsNextAvailable, setUserIsNextAvailable] = useState(false);
  const [userLastVisible, setUserLastVisible] = useState(null);
  const [userFirstVisible, setUserFirstVisible] = useState(null);
  const [userPageHistory, setUserPageHistory] = useState([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [totalTokensCount, setTotalTokensCount] = useState(0);
  const [totalCreditsCount, setTotalCreditsCount] = useState(0);

  // Leaderboard
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);
  const [showViolationRules, setShowViolationRules] = useState(false);

  // Bank soal
  const [bankSoal, setBankSoal] = useState({});
  const [selectedSubtest, setSelectedSubtest] = useState('pu');
  const [questionType, setQuestionType] = useState('pilihan_ganda');
  const [questionText, setQuestionText] = useState('');
  const [questionImage, setQuestionImage] = useState('');
  const [options, setOptions] = useState(['', '', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState('A');
  const [editingId, setEditingId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Import modals
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [bulkCreditAmount, setBulkCreditAmount] = useState(0);
  const [isProcessingCredits, setIsProcessingCredits] = useState(false);
  const [showSoalImport, setShowSoalImport] = useState(false);
  const [previewSoal, setPreviewSoal] = useState([]);

  // --- AUTH LISTENERS ---
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setIsCheckingRole(true);
        try {
          const snap = await getDoc(doc(db, 'users', currentUser.uid));
          if (snap.exists() && snap.data().role === 'admin') {
            setScreen('dashboard');
          } else {
            alert('⛔ AKSES DITOLAK: Anda bukan Admin!');
            await signOut(auth);
            setScreen('admin_login');
          }
        } catch { setScreen('admin_login'); }
      } else { setScreen('admin_login'); }
      setIsCheckingRole(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'tokens'), orderBy('createdAt', 'desc'), limit(50));
    const unsub = onSnapshot(q, (snap) => {
      setTokenList(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      if (snap.docs.length > 0) {
        setLastVisible(snap.docs[snap.docs.length - 1]);
        setFirstVisible(snap.docs[0]);
        setIsNextAvailable(snap.docs.length === 50);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(20));
    const unsub = onSnapshot(q, (snap) => {
      setUserList(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      if (snap.docs.length > 0) {
        setUserLastVisible(snap.docs[snap.docs.length - 1]);
        setUserFirstVisible(snap.docs[0]);
        setUserIsNextAvailable(snap.docs.length === 20);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const loadCounts = async () => {
      try {
        const [usersSnap, tokensSnap] = await Promise.all([
          getCountFromServer(collection(db, 'users')),
          getCountFromServer(collection(db, 'tokens')),
        ]);
        setTotalUsersCount(usersSnap.data().count);
        setTotalTokensCount(tokensSnap.data().count);
      } catch (e) { console.error(e); }
    };
    if (screen === 'dashboard') loadCounts();
  }, [screen]);

  useEffect(() => {
    setTotalCreditsCount(userList.reduce((acc, u) => acc + (u.credits || 0), 0));
  }, [userList]);

  useEffect(() => {
    const loadBankSoal = async () => {
      const loaded = {};
      await Promise.all(SUBTESTS.map(async (s) => {
        try {
          const snap = await getDoc(doc(db, 'bank_soal', s.id));
          loaded[s.id] = snap.exists() ? snap.data().questions : [];
        } catch { loaded[s.id] = []; }
      }));
      setBankSoal(loaded);
    };
    loadBankSoal();
  }, []);

  // --- COMPUTED ---
  const expiredTokens = tokenList.filter((t) => isExpired(t.createdAt));
  const usedTokens = tokenList.filter((t) => t.status === 'used' && !isExpired(t.createdAt));
  const activeTokens = tokenList.filter((t) => t.status === 'active' && !isExpired(t.createdAt));

  const getFilteredList = () => {
    switch (filterStatus) {
      case 'active':  return activeTokens;
      case 'used':    return usedTokens;
      case 'expired': return expiredTokens;
      default:        return tokenList;
    }
  };

  const filteredUserList = userList.filter((u) => {
    const term = searchEmail.toLowerCase();
    return (u.displayName || '').toLowerCase().includes(term)
      || (u.email || '').toLowerCase().includes(term)
      || (u.school || '').toLowerCase().includes(term);
  });

  // --- AUTH ---
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const cred = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      const snap = await getDoc(doc(db, 'users', cred.user.uid));
      if (snap.exists() && snap.data().role === 'admin') {
        setScreen('dashboard');
      } else {
        throw new Error('Akun ini tidak memiliki izin Admin.');
      }
    } catch (error) {
      alert('Login Gagal: ' + error.message);
      await signOut(auth);
    }
  };

  const handleLogout = async () => { await signOut(auth); setScreen('admin_login'); };

  // --- TOKEN ACTIONS ---
  const markAsSent = async (tokenCode, method) => {
    try {
      await updateDoc(doc(db, 'tokens', tokenCode), { isSent: true, sentMethod: method, sentAt: new Date().toISOString() });
    } catch (e) { console.error(e); }
  };

  const sendFonnteMessage = async (name, phone, token) => {
    if (!FONNTE_TOKEN) { alert('Token Fonnte Kosong!'); return; }
    setIsSending(true);
    let p = phone.toString().replace(/\D/g, '');
    if (p.startsWith('0')) p = '62' + p.slice(1);
    const message = buildWhatsAppMessage(name, token, STUDENT_APP_URL);
    try {
      const params = new URLSearchParams({ token: FONNTE_TOKEN, target: p, message, delay: SEND_DELAY, countryCode: '62' });
      await fetch(`https://api.fonnte.com/send?${params.toString()}`, { method: 'GET', mode: 'no-cors' });
      await markAsSent(token, 'Fonnte (Auto)');
      alert(`✅ (FONNTE) Pesan dikirim ke ${name}`);
    } catch { alert('❌ Gagal Kirim Fonnte.'); }
    finally { setIsSending(false); }
  };

  const sendJsDirect = async (name, phone, token) => {
    let p = phone.toString().replace(/\D/g, '');
    if (p.startsWith('0')) p = '62' + p.slice(1);
    window.location.href = `whatsapp://send?phone=${p}&text=${encodeURIComponent(buildWhatsAppMessage(name, token, STUDENT_APP_URL))}`;
    await markAsSent(token, 'JS App (Direct)');
  };

  const sendManualWeb = async (name, phone, token) => {
    let p = phone.toString().replace(/\D/g, '');
    if (p.startsWith('0')) p = '62' + p.slice(1);
    window.open(`https://wa.me/${p}?text=${encodeURIComponent(buildWhatsAppMessage(name, token, STUDENT_APP_URL))}`, '_blank');
    await markAsSent(token, 'WA Web (Manual)');
  };

  const createToken = async () => {
    if (!newTokenName || !newTokenPhone || !newTokenSchool) { alert('Isi Nama, Sekolah & HP!'); return; }
    const tokenCode = `UTBK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    try {
      await setDoc(doc(db, 'tokens', tokenCode), {
        tokenCode, studentName: newTokenName, studentSchool: newTokenSchool,
        studentPhone: newTokenPhone, status: 'active', createdAt: new Date().toISOString(),
        isSent: false, sentMethod: '-', score: null, createdBy: 'ADMIN', violationScore: 0
      });
      if (confirm(`Token Berhasil: ${tokenCode}\n\nKirim via Jalur Default?`)) {
        if (autoSendMode === 'fonnte') await sendFonnteMessage(newTokenName, newTokenPhone, tokenCode);
        else if (autoSendMode === 'js_app') await sendJsDirect(newTokenName, newTokenPhone, tokenCode);
        else await sendManualWeb(newTokenName, newTokenPhone, tokenCode);
      }
      setNewTokenName(''); setNewTokenPhone(''); setNewTokenSchool('');
      fetchTokens('first');
    } catch { alert('Gagal generate token.'); }
  };

  const deleteToken = async (code) => {
    if (confirm('Hapus token ini?')) { await deleteDoc(doc(db, 'tokens', code)); fetchTokens('first'); }
  };

  const resetScore = async (code) => {
    if (confirm('Reset ujian siswa ini?')) {
      await updateDoc(doc(db, 'tokens', code), {
        status: 'active', score: null, answers: {}, finalTimeLeft: null,
        createdAt: new Date().toISOString(), violationScore: 0
      });
      fetchTokens('first');
    }
  };

  const deleteAllTokens = async () => {
    if (!confirm('⚠️ PERINGATAN: Hapus SEMUA data?')) return;
    try {
      await Promise.all(tokenList.map((t) => deleteDoc(doc(db, 'tokens', t.tokenCode))));
      alert('Semua terhapus.'); fetchTokens('first');
    } catch { alert('Gagal.'); }
  };

  const fetchTokens = async (direction) => {
    try {
      let q;
      if (direction === 'first') {
        q = query(collection(db, 'tokens'), orderBy('createdAt', 'desc'), limit(50));
        setCurrentPage(1); setPageHistory([]);
      } else if (direction === 'next' && lastVisible) {
        q = query(collection(db, 'tokens'), orderBy('createdAt', 'desc'), startAfter(lastVisible), limit(50));
        setPageHistory((p) => [...p, firstVisible]);
        setCurrentPage((p) => p + 1);
      } else if (direction === 'prev' && pageHistory.length > 0) {
        const prev = pageHistory[pageHistory.length - 1];
        q = query(collection(db, 'tokens'), orderBy('createdAt', 'desc'), startAfter(prev), limit(50));
        setPageHistory((p) => p.slice(0, -1));
        setCurrentPage((p) => p - 1);
      } else return;

      const snap = await getDocs(q);
      setTokenList(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      if (snap.docs.length > 0) {
        setLastVisible(snap.docs[snap.docs.length - 1]);
        setFirstVisible(snap.docs[0]);
        setIsNextAvailable(snap.docs.length === 50);
      } else setIsNextAvailable(false);
    } catch { alert('Gagal memuat data token'); }
  };

  // --- USER ACTIONS ---
  const fetchUsers = async (direction) => {
    try {
      let q;
      if (direction === 'first') {
        q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(20));
        setUserCurrentPage(1); setUserPageHistory([]);
      } else if (direction === 'next' && userLastVisible) {
        q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), startAfter(userLastVisible), limit(20));
        setUserPageHistory((p) => [...p, userFirstVisible]);
        setUserCurrentPage((p) => p + 1);
      } else if (direction === 'prev' && userPageHistory.length > 0) {
        const prev = userPageHistory[userPageHistory.length - 1];
        q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), startAfter(prev), limit(20));
        setUserPageHistory((p) => p.slice(0, -1));
        setUserCurrentPage((p) => p - 1);
      } else return;

      const snap = await getDocs(q);
      setUserList(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      if (snap.docs.length > 0) {
        setUserLastVisible(snap.docs[snap.docs.length - 1]);
        setUserFirstVisible(snap.docs[0]);
        setUserIsNextAvailable(snap.docs.length === 20);
      } else setUserIsNextAvailable(false);
    } catch { alert('Gagal memuat data user'); }
  };

  const handleAddCredits = async (userId) => {
    const amount = prompt('Masukkan jumlah credit:');
    if (amount && !isNaN(amount)) {
      try { await updateDoc(doc(db, 'users', userId), { credits: increment(parseInt(amount)) }); alert(`Berhasil menambahkan ${amount} credits.`); }
      catch { alert('Gagal update credits.'); }
    }
  };

  const handleDeleteUser = async (userId) => {
    if (confirm('Hapus user ini?')) await deleteDoc(doc(db, 'users', userId));
  };

  const toggleUserSelection = (id) =>
    setSelectedUserIds((prev) => prev.includes(id) ? prev.filter((uid) => uid !== id) : [...prev, id]);

  const handleSelectAllUsers = (visibleUsers) => {
    if (selectedUserIds.length === visibleUsers.length && visibleUsers.length > 0) setSelectedUserIds([]);
    else setSelectedUserIds(visibleUsers.map((u) => u.id));
  };

  const executeBulkCredits = async () => {
    if (selectedUserIds.length === 0) { alert('Pilih minimal satu user!'); return; }
    if (bulkCreditAmount <= 0) { alert('Jumlah credit harus lebih dari 0!'); return; }
    if (!confirm(`Kirim ${bulkCreditAmount} Credits ke ${selectedUserIds.length} user?`)) return;
    setIsProcessingCredits(true);
    try {
      const batch = writeBatch(db);
      selectedUserIds.forEach((id) => batch.update(doc(db, 'users', id), { credits: increment(parseInt(bulkCreditAmount)) }));
      await batch.commit();
      alert('✅ Berhasil mendistribusikan credits!');
      setShowCreditModal(false); setSelectedUserIds([]); setBulkCreditAmount(0);
      fetchUsers('first');
    } catch { alert('Gagal mengirim credits.'); }
    finally { setIsProcessingCredits(false); }
  };

  // --- LEADERBOARD ---
  const fetchAllTokensForLeaderboard = async () => {
    setIsLeaderboardLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'tokens'), orderBy('score', 'desc')));
      const allTokens = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((t) => t.score !== undefined && t.score !== null)
        .sort((a, b) => b.score !== a.score ? b.score - a.score : (b.finalTimeLeft || 0) - (a.finalTimeLeft || 0));
      setLeaderboardData(allTokens);
    } catch { alert('Gagal memuat data leaderboard.'); }
    finally { setIsLeaderboardLoading(false); }
  };

  const resetLeaderboard = async () => {
    if (!confirm('⚠️ RESET SEMUA SKOR DI LEADERBOARD?')) return;
    try {
      const snap = await getDocs(collection(db, 'tokens'));
      const updates = [];
      snap.forEach((d) => {
        if (d.data().score !== undefined) {
          updates.push(updateDoc(d.ref, {
            score: deleteField(), finalTimeLeft: deleteField(), finishedAt: deleteField(),
            status: 'active', answers: {}, violationScore: 0
          }));
        }
      });
      await Promise.all(updates);
      alert('✅ Leaderboard Berhasil Direset!');
    } catch { alert('Gagal reset.'); }
  };

  // --- EXCEL EXPORT ---
  const handleDownloadExcel = async () => {
    if (!confirm('Download laporan lengkap dalam format Excel?')) return;
    try {
      const snap = await getDocs(query(collection(db, 'tokens'), orderBy('createdAt', 'desc')));
      const data = snap.docs.map((d) => {
        const dd = d.data();
        return {
          'Nama Siswa': dd.studentName, 'Asal Sekolah': dd.studentSchool || '-',
          'No WhatsApp': dd.studentPhone, 'Kode Token': dd.tokenCode,
          'Status': dd.status, 'Nilai Akhir': dd.score !== null ? dd.score : 'Belum Mengerjakan',
          'Waktu Selesai': dd.finishedAt ? new Date(dd.finishedAt).toLocaleString('id-ID') : '-',
          'Terkirim Via': dd.sentMethod || '-', 'Poin Pelanggaran': dd.violationScore || 0,
        };
      });
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Data Nilai UTBK');
      XLSX.writeFile(wb, `Laporan_UTBK_${new Date().toISOString().slice(0, 10)}.xlsx`);
      alert('✅ Download Berhasil!');
    } catch { alert('Gagal mendownload data.'); }
  };

  const handleDownloadLeaderboard = async () => {
    if (!confirm('Download data leaderboard lengkap dalam format Excel?')) return;
    try {
      const snap = await getDocs(query(collection(db, 'tokens'), orderBy('createdAt', 'desc')));
      const allTokens = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((t) => t.score !== undefined && t.score !== null)
        .sort((a, b) => { const sA = a.score ?? 0, sB = b.score ?? 0; return sB !== sA ? sB - sA : (b.finalTimeLeft||0) - (a.finalTimeLeft||0); });

      const getVal = (t, id, type) => t.scoreDetails?.[id]?.[type] || 0;
      const data = allTokens.map((t, idx) => ({
        'Rank': idx + 1, 'Nama Siswa': t.studentName, 'Asal Sekolah': t.studentSchool || '-',
        'PU - Benar': getVal(t,'pu','b'), 'PU - Skor': getVal(t,'pu','skor'),
        'PPU - Benar': getVal(t,'ppu','b'), 'PPU - Skor': getVal(t,'ppu','skor'),
        'PK - Benar': getVal(t,'pk','b'), 'PK - Skor': getVal(t,'pk','skor'),
        'PBM - Benar': getVal(t,'pbm','b'), 'PBM - Skor': getVal(t,'pbm','skor'),
        'Lit Indo - Benar': getVal(t,'lbi','b'), 'Lit Indo - Skor': getVal(t,'lbi','skor'),
        'Lit Inggris - Benar': getVal(t,'lbe','b'), 'Lit Inggris - Skor': getVal(t,'lbe','skor'),
        'PM - Benar': getVal(t,'pm','b'), 'PM - Skor': getVal(t,'pm','skor'),
        'RATA-RATA': t.score ?? 0, 'Poin Pelanggaran': t.violationScore || 0,
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Leaderboard UTBK');
      XLSX.writeFile(wb, `Leaderboard_UTBK_${new Date().toISOString().slice(0, 10)}.xlsx`);
      alert('✅ Download Berhasil!');
    } catch { alert('Gagal mendownload data leaderboard.'); }
  };

  // --- IMPORT EXCEL ---
  const handleImportExcel = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary' });
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        if (data.length === 0) { alert('File kosong!'); e.target.value = null; return; }
        const parsed = data.map((row, i) => ({
          id: i,
          nama: row['Nama'] || row['nama'] || row['Name'] || '',
          sekolah: row['Sekolah'] || row['sekolah'] || row['School'] || '-',
          hp: row['HP'] || row['hp'] || row['Phone'] || '-',
          valid: !!(row['Nama'] || row['nama'] || row['Name'])
        }));
        setPreviewData(parsed);
        setSelectedRows(parsed.filter((r) => r.valid).map((r) => r.id));
        setShowPreviewModal(true);
      } catch { alert('Gagal membaca file. Pastikan format Excel benar.'); }
      finally { e.target.value = null; }
    };
    reader.readAsBinaryString(file);
  };

  const executeBulkImport = async () => {
    if (selectedRows.length === 0) { alert('Tidak ada data yang dipilih!'); return; }
    setIsSending(true); setShowPreviewModal(false);
    try {
      const dataToImport = previewData.filter((r) => selectedRows.includes(r.id));
      const chunks = [];
      for (let i = 0; i < dataToImport.length; i += 450) chunks.push(dataToImport.slice(i, i + 450));
      let successCount = 0;
      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach((row) => {
          const code = `UTBK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
          batch.set(doc(db, 'tokens', code), {
            tokenCode: code, studentName: row.nama, studentSchool: row.sekolah, studentPhone: row.hp,
            status: 'active', createdAt: new Date().toISOString(), isSent: false, sentMethod: '-',
            score: null, createdBy: 'ADMIN_BULK', violationScore: 0
          });
          successCount++;
        });
        await batch.commit();
      }
      alert(`✅ Sukses generate ${successCount} token!`);
      fetchTokens('first');
    } catch { alert('Gagal melakukan import massal.'); }
    finally { setIsSending(false); setPreviewData([]); setSelectedRows([]); }
  };

  const togglePreviewRow = (id) => setSelectedRows((p) => p.includes(id) ? p.filter((r) => r !== id) : [...p, id]);
  const toggleAllPreviewRows = () => {
    const validCount = previewData.filter((r) => r.valid).length;
    setSelectedRows(selectedRows.length === validCount && validCount > 0 ? [] : previewData.filter((r) => r.valid).map((r) => r.id));
  };

  // --- BANK SOAL ---
  const saveSoal = async (sid, q) => {
    await setDoc(doc(db, 'bank_soal', sid), { questions: q });
    setBankSoal((p) => ({ ...p, [sid]: q }));
  };

  const handleTypeChange = (type) => {
    setQuestionType(type);
    if (type === 'pilihan_ganda') setCorrectAnswer('A');
    else if (type === 'pilihan_majemuk') setCorrectAnswer([]);
    else if (type === 'isian') setCorrectAnswer('');
  };

  const resetForm = () => { setQuestionText(''); setQuestionImage(''); setOptions(['','','','','']); setEditingId(null); handleTypeChange('pilihan_ganda'); };

  const addOrUpdate = async () => {
    if (!questionText.trim()) { alert('Pertanyaan wajib diisi!'); return; }
    if (questionType !== 'isian' && options.some((o) => !o.trim())) { alert('Semua opsi wajib diisi!'); return; }
    if (questionType === 'pilihan_majemuk' && (!Array.isArray(correctAnswer) || correctAnswer.length === 0)) { alert('Pilih minimal 1 kunci!'); return; }
    if (questionType === 'isian' && (!correctAnswer || correctAnswer.toString().trim() === '')) { alert('Isi kunci jawaban!'); return; }

    const newQ = { id: editingId || Date.now().toString(), type: questionType, question: questionText, image: questionImage, options: questionType === 'isian' ? [] : options, correct: correctAnswer };
    const current = bankSoal[selectedSubtest] || [];
    const updated = editingId ? current.map((q) => q.id === editingId ? newQ : q) : [...current, newQ];
    await saveSoal(selectedSubtest, updated);
    alert('Disimpan!'); resetForm();
  };

  const deleteSoal = async (id) => {
    if (confirm('Hapus soal ini?')) await saveSoal(selectedSubtest, (bankSoal[selectedSubtest] || []).filter((x) => x.id !== id));
  };

  const loadSoalForEdit = (q) => {
    setQuestionText(q.question); setQuestionImage(q.image || ''); setQuestionType(q.type || 'pilihan_ganda');
    setOptions(q.type === 'isian' ? ['','','','',''] : [...q.options]);
    setCorrectAnswer(q.correct); setEditingId(q.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 1024 * 1024) { alert('⚠️ File terlalu besar! Maksimal 1MB.'); return; }
    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => { setQuestionImage(reader.result); setIsUploading(false); };
    reader.readAsDataURL(file);
  };

  const handleDownloadTemplateSoal = () => {
    const data = [
      { 'Tipe (PG/ISIAN)': 'PG', 'Pertanyaan': 'Ibu kota Indonesia adalah...', 'Opsi A': 'Jakarta', 'Opsi B': 'Bandung', 'Opsi C': 'Surabaya', 'Opsi D': 'Medan', 'Opsi E': 'Bali', 'Kunci Jawaban': 'A' },
      { 'Tipe (PG/ISIAN)': 'ISIAN', 'Pertanyaan': 'Berapakah hasil 10 + 10?', 'Opsi A': '-', 'Opsi B': '-', 'Opsi C': '-', 'Opsi D': '-', 'Opsi E': '-', 'Kunci Jawaban': '20' }
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Soal');
    XLSX.writeFile(wb, 'TEMPLATE_BANK_SOAL.xlsx');
  };

  const handleImportSoalFile = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary' });
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        const parsed = data.map((row, idx) => {
          const type = row['Tipe (PG/ISIAN)']?.toUpperCase().includes('ISIAN') ? 'isian' : 'pilihan_ganda';
          return { id: Date.now() + idx, type, question: row['Pertanyaan'], options: type === 'isian' ? [] : [row['Opsi A']||'', row['Opsi B']||'', row['Opsi C']||'', row['Opsi D']||'', row['Opsi E']||''], correct: row['Kunci Jawaban']?.toString(), image: '', valid: !!(row['Pertanyaan'] && row['Kunci Jawaban']) };
        });
        setPreviewSoal(parsed);
        setShowSoalImport(true);
      } catch { alert('Gagal membaca file excel.'); }
    };
    reader.readAsBinaryString(file);
    e.target.value = null;
  };

  const saveBulkSoal = async () => {
    if (previewSoal.length === 0) return;
    if (!confirm(`Import ${previewSoal.length} soal ke ${SUBTESTS.find((s) => s.id === selectedSubtest).name}?`)) return;
    try {
      const current = bankSoal[selectedSubtest] || [];
      const newQ = previewSoal.filter((p) => p.valid).map(({ valid, ...rest }) => rest);
      await setDoc(doc(db, 'bank_soal', selectedSubtest), { questions: [...current, ...newQ] });
      setBankSoal((p) => ({ ...p, [selectedSubtest]: [...current, ...newQ] }));
      alert('✅ Berhasil import soal!');
      setShowSoalImport(false); setPreviewSoal([]);
    } catch { alert('Gagal menyimpan ke database.'); }
  };

  const generateDummy = async () => {
    if (!confirm('Isi Dummy?')) return;
    const n = { ...bankSoal };
    for (const s of SUBTESTS) {
      const cur = bankSoal[s.id] || [];
      const need = s.questions - cur.length;
      if (need > 0) {
        const d = Array.from({ length: need }, (_, i) => ({ id: `d_${s.id}_${i}`, question: `Dummy ${s.name} ${i+1}`, image: '', options: ['A','B','C','D','E'], correct: 'A' }));
        const fin = [...cur, ...d];
        await setDoc(doc(db, 'bank_soal', s.id), { questions: fin });
        n[s.id] = fin;
      }
    }
    setBankSoal(n); alert('Dummy Done!');
  };

  return {
    // Auth
    isCheckingRole, screen, adminEmail, setAdminEmail, adminPassword, setAdminPassword,
    handleLogin, handleLogout,
    // View
    viewMode, setViewMode,
    // Token
    tokenList, filterStatus, setFilterStatus: (v) => setFilterStatus(v),
    activeTokens, usedTokens, expiredTokens,
    currentPage, isNextAvailable,
    newTokenName, setNewTokenName, newTokenSchool, setNewTokenSchool,
    newTokenPhone, setNewTokenPhone, autoSendMode, setAutoSendMode,
    isSending,
    createToken, deleteToken, resetScore, deleteAllTokens, fetchTokens,
    getFilteredList, isExpiredFn: isExpired,
    sendFonnteMessage, sendManualWeb, sendJsDirect,
    handleDownloadExcel,
    // User
    filteredUserList, totalUsersCount, totalCreditsCount, totalTokensCount,
    searchEmail, setSearchEmail,
    userCurrentPage, userIsNextAvailable, fetchUsers,
    handleAddCredits, handleDeleteUser,
    selectedUserIds, bulkCreditAmount, setBulkCreditAmount, isProcessingCredits,
    toggleUserSelection, handleSelectAllUsers, executeBulkCredits,
    // Leaderboard
    showLeaderboard, setShowLeaderboard,
    leaderboardData, isLeaderboardLoading,
    fetchAllTokensForLeaderboard, resetLeaderboard,
    handleDownloadLeaderboard,
    showViolationRules, setShowViolationRules,
    // Bank Soal
    bankSoal, selectedSubtest, setSelectedSubtest,
    questionType, questionText, setQuestionText,
    questionImage, setQuestionImage,
    options, setOptions, correctAnswer, setCorrectAnswer,
    editingId, isUploading,
    handleTypeChange, resetForm, addOrUpdate, deleteSoal, loadSoalForEdit,
    handleImageUpload, handleDownloadTemplateSoal, handleImportSoalFile,
    saveBulkSoal, generateDummy,
    // Modals
    showPreviewModal, setShowPreviewModal,
    previewData, selectedRows,
    togglePreviewRow, toggleAllPreviewRows, executeBulkImport,
    showCreditModal, setShowCreditModal,
    showSoalImport, setShowSoalImport, previewSoal,
  };
};

export default useAdminState;
