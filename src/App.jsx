import React, { useState, useEffect } from 'react';
import { 
  Edit, Plus, Trash2, LogOut, Key, BarChart3, Filter, Copyright, 
  MessageCircle, Send, ExternalLink, Zap, Settings, Radio, Smartphone, 
  CheckCircle2, XCircle, RefreshCcw, Trophy, X, Eye, Loader2, UploadCloud, 
  Image as ImageIcon, List, CheckSquare, Type, School, Users, Wallet, Coins,
  ChevronLeft, ChevronRight, Search 
} from 'lucide-react';
import { db, auth } from './firebase';
import { 
  doc, getDoc, setDoc, updateDoc, collection, getDocs, deleteDoc, 
  onSnapshot, query, orderBy, deleteField, increment, limit, 
  writeBatch, startAfter, where, getCountFromServer 
} from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';
import * as XLSX from 'xlsx';

const SUBTESTS = [
  { id: 'pu', name: 'Penalaran Umum', questions: 30 },
  { id: 'ppu', name: 'Pengetahuan & Pemahaman Umum', questions: 20 },
  { id: 'pbm', name: 'Pemahaman Bacaan & Menulis', questions: 20 },
  { id: 'pk', name: 'Pengetahuan Kuantitatif', questions: 15 },
  { id: 'lbi', name: 'Literasi Bahasa Indonesia', questions: 30 },
  { id: 'lbe', name: 'Literasi Bahasa Inggris', questions: 20 },
  { id: 'pm', name: 'Penalaran Matematika', questions: 20 },
];

// --- KONFIGURASI ENV ---
const STUDENT_APP_URL = "https://utbk-simulation-tester-student.vercel.app"; 
const FONNTE_TOKEN = import.meta.env.VITE_FONNTE_TOKEN; 
const SEND_DELAY = 3; 

const UTBKAdminApp = () => {
  const [isCheckingRole, setIsCheckingRole] = useState(true);
  const [screen, setScreen] = useState('admin_login'); 
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  
  const [viewMode, setViewMode] = useState('tokens');
  
  const [tokenList, setTokenList] = useState([]);
  const [userList, setUserList] = useState([]);
  const [bankSoal, setBankSoal] = useState({});
  const [filterStatus, setFilterStatus] = useState('all');
  
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenSchool, setNewTokenSchool] = useState('');
  const [newTokenPhone, setNewTokenPhone] = useState('');
  
  const [autoSendMode, setAutoSendMode] = useState('fonnte'); 

  const [currentPage, setCurrentPage] = useState(1);
  const [isNextAvailable, setIsNextAvailable] = useState(false);
  const [lastVisible, setLastVisible] = useState(null);
  const [firstVisible, setFirstVisible] = useState(null);
  const [pageHistory, setPageHistory] = useState([]);

  // ✅ DITAMBAHKAN: State untuk User Pagination & Search
  const [userCurrentPage, setUserCurrentPage] = useState(1);
  const [userIsNextAvailable, setUserIsNextAvailable] = useState(false);
  const [userLastVisible, setUserLastVisible] = useState(null);
  const [userFirstVisible, setUserFirstVisible] = useState(null);
  const [userPageHistory, setUserPageHistory] = useState([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  // ✅ DITAMBAHKAN: State untuk Total Count
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [totalTokensCount, setTotalTokensCount] = useState(0);
  const [totalCreditsCount, setTotalCreditsCount] = useState(0);

  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const [selectedSubtest, setSelectedSubtest] = useState('pu');
  const [questionType, setQuestionType] = useState('pilihan_ganda'); 
  const [questionText, setQuestionText] = useState('');
  const [questionImage, setQuestionImage] = useState(''); 
  const [isUploading, setIsUploading] = useState(false);
  const [options, setOptions] = useState(['', '', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState('A');
  const [editingId, setEditingId] = useState(null);
  const [isSending, setIsSending] = useState(false);
  
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]); 
  // STATE UNTUK IMPORT SOAL
  const [showSoalImport, setShowSoalImport] = useState(false);
  const [previewSoal, setPreviewSoal] = useState([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setIsCheckingRole(true);
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userDocRef);

          if (userSnap.exists() && userSnap.data().role === 'admin') {
            setScreen('dashboard');
          } else {
            alert("⛔ AKSES DITOLAK: Anda bukan Admin!");
            await signOut(auth);
            setScreen('admin_login');
          }
        } catch (error) {
          console.error("Error verifikasi admin:", error);
          setScreen('admin_login');
        }
      } else {
        setScreen('admin_login');
      }
      setIsCheckingRole(false);
    });

    return () => unsubscribe();
  }, []);

  // --- LOAD DATA REALTIME (TOKENS) ---
  useEffect(() => {
    const q = query(
        collection(db, 'tokens'), 
        orderBy('createdAt', 'desc'), 
        limit(50) 
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const t = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTokenList(t);
      
      if (snapshot.docs.length > 0) {
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setFirstVisible(snapshot.docs[0]);
        setIsNextAvailable(snapshot.docs.length === 50);
      }
    });
    return () => unsubscribe();
  }, []);

  
  // ✅ DIUBAH: Load Users dengan Pagination (LIMIT 20)
  useEffect(() => {
    const q = query(
        collection(db, 'users'), 
        orderBy('createdAt', 'desc'),
        limit(20) // ✅ HEMAT: Hanya ambil 20 user
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const u = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUserList(u);
      
      // Update pagination info untuk users
      if (snapshot.docs.length > 0) {
        setUserLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setUserFirstVisible(snapshot.docs[0]);
        setUserIsNextAvailable(snapshot.docs.length === 20);
      }
    });
    return () => unsubscribe();
  }, []);

  // ✅ DITAMBAHKAN: Load Total Counts (Aggregation)
  useEffect(() => {
    const loadCounts = async () => {
      try {
        // Total Users
        const usersCountSnap = await getCountFromServer(collection(db, 'users'));
        setTotalUsersCount(usersCountSnap.data().count);
        
        // Total Tokens
        const tokensCountSnap = await getCountFromServer(collection(db, 'tokens'));
        setTotalTokensCount(tokensCountSnap.data().count);
        
      } catch (error) {
        console.error("Error loading counts:", error);
      }
    };
    
    if (screen === 'dashboard') {
      loadCounts();
    }
  }, [screen]);

  // ✅ DITAMBAHKAN: Hitung Total Credits dari userList yang sudah di-load
  useEffect(() => {
    const total = userList.reduce((acc, u) => acc + (u.credits || 0), 0);
    setTotalCreditsCount(total);
  }, [userList]);

  // --- LOAD BANK SOAL ---
  useEffect(() => {
    const loadBankSoal = async () => {
      const loaded = {};
      for (const subtest of SUBTESTS) {
        try {
          const docRef = doc(db, 'bank_soal', subtest.id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) loaded[subtest.id] = docSnap.data().questions;
          else loaded[subtest.id] = [];
        } catch (error) { loaded[subtest.id] = []; }
      }
      setBankSoal(loaded);
    };
    loadBankSoal();
  }, []);

  // --- LOGIC IMPORT SOAL ---
  
  const handleDownloadTemplateSoal = () => {
    const data = [
      {
        "Tipe (PG/ISIAN)": "PG",
        "Pertanyaan": "Ibu kota Indonesia adalah...",
        "Opsi A": "Jakarta", "Opsi B": "Bandung", "Opsi C": "Surabaya", "Opsi D": "Medan", "Opsi E": "Bali",
        "Kunci Jawaban": "A"
      },
      {
        "Tipe (PG/ISIAN)": "ISIAN",
        "Pertanyaan": "Berapakah hasil 10 + 10?",
        "Opsi A": "-", "Opsi B": "-", "Opsi C": "-", "Opsi D": "-", "Opsi E": "-",
        "Kunci Jawaban": "20"
      }
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Soal");
    XLSX.writeFile(wb, "TEMPLATE_BANK_SOAL.xlsx");
  };

  const handleImportSoalFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary' });
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        
        const parsed = data.map((row, idx) => {
          const type = row["Tipe (PG/ISIAN)"]?.toUpperCase().includes("ISIAN") ? 'isian' : 'pilihan_ganda';
          const valid = row["Pertanyaan"] && row["Kunci Jawaban"];
          return {
            id: Date.now() + idx,
            type,
            question: row["Pertanyaan"],
            options: type === 'isian' ? [] : [
              row["Opsi A"] || "", row["Opsi B"] || "", row["Opsi C"] || "", row["Opsi D"] || "", row["Opsi E"] || ""
            ],
            correct: row["Kunci Jawaban"]?.toString(),
            image: "", // Import Excel jarang support gambar langsung
            valid
          };
        });
        setPreviewSoal(parsed);
        setShowSoalImport(true);
      } catch (err) {
        alert("Gagal membaca file excel.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = null; // Reset input
  };

  const saveBulkSoal = async () => {
    if (previewSoal.length === 0) return;
    if (!confirm(`Import ${previewSoal.length} soal ke ${SUBTESTS.find(s=>s.id===selectedSubtest).name}?`)) return;

    try {
      const currentQuestions = bankSoal[selectedSubtest] || [];
      // Filter hanya data valid dan hapus properti 'valid' sebelum simpan
      const newQuestions = previewSoal.filter(p => p.valid).map(({ valid, ...rest }) => rest);
      
      const combined = [...currentQuestions, ...newQuestions];
      await setDoc(doc(db, 'bank_soal', selectedSubtest), { questions: combined });
      
      setBankSoal(prev => ({ ...prev, [selectedSubtest]: combined }));
      alert("✅ Berhasil import soal!");
      setShowSoalImport(false);
      setPreviewSoal([]);
    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan ke database.");
    }
  };

  const handleLogin = async (e) => { 
    e.preventDefault(); 
    try { 
      const userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword); 
      const user = userCredential.user;

      const userDocRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists() && userSnap.data().role === 'admin') {
        setScreen('dashboard');
      } else {
        throw new Error("Akun ini tidak memiliki izin Admin.");
      }
    } catch (error) { 
      alert('Login Gagal: ' + error.message);
      await signOut(auth);
    } 
  };
  
  const handleLogout = async () => { 
    await signOut(auth); 
    setScreen('admin_login'); 
  };

  const isExpired = (createdAt) => {
      if (!createdAt) return false;
      const createdTime = new Date(createdAt).getTime();
      const oneDay = 24 * 60 * 60 * 1000;
      return (Date.now() - createdTime) > oneDay;
  };
  
  const expiredTokens = tokenList.filter(t => isExpired(t.createdAt));
  const usedTokens = tokenList.filter(t => t.status === 'used' && !isExpired(t.createdAt));
  const activeTokens = tokenList.filter(t => t.status === 'active' && !isExpired(t.createdAt));

  const getFilteredList = () => { 
      switch (filterStatus) { 
          case 'active': return activeTokens; 
          case 'used': return usedTokens; 
          case 'expired': return expiredTokens; 
          default: return tokenList; 
      } 
  };

  const getLeaderboardData = () => {
      const rankedTokens = tokenList.filter(t => t.score !== undefined && t.score !== null);
      rankedTokens.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return b.finalTimeLeft - a.finalTimeLeft;
      });
      return rankedTokens;
  };

  const fetchTokens = async (direction) => {
    try {
      let q;
      
      if (direction === 'first') {
        q = query(
          collection(db, 'tokens'),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
        setCurrentPage(1);
        setPageHistory([]);
      } else if (direction === 'next' && lastVisible) {
        q = query(
          collection(db, 'tokens'),
          orderBy('createdAt', 'desc'),
          startAfter(lastVisible),
          limit(50)
        );
        setPageHistory([...pageHistory, firstVisible]);
        setCurrentPage(currentPage + 1);
      } else if (direction === 'prev' && pageHistory.length > 0) {
        const previousFirst = pageHistory[pageHistory.length - 1];
        q = query(
          collection(db, 'tokens'),
          orderBy('createdAt', 'desc'),
          startAfter(previousFirst),
          limit(50)
        );
        setPageHistory(pageHistory.slice(0, -1));
        setCurrentPage(currentPage - 1);
      } else {
        return;
      }

      const snapshot = await getDocs(q);
      const t = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTokenList(t);
      
      if (snapshot.docs.length > 0) {
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setFirstVisible(snapshot.docs[0]);
        setIsNextAvailable(snapshot.docs.length === 50);
      } else {
        setIsNextAvailable(false);
      }
    } catch (error) {
      console.error("Error fetching tokens:", error);
      alert("Gagal memuat data token");
    }
  };

  // ✅ DITAMBAHKAN: Fetch Users dengan Pagination
  const fetchUsers = async (direction) => {
    try {
      let q;
      
      if (direction === 'first') {
        q = query(
          collection(db, 'users'),
          orderBy('createdAt', 'desc'),
          limit(20)
        );
        setUserCurrentPage(1);
        setUserPageHistory([]);
      } else if (direction === 'next' && userLastVisible) {
        q = query(
          collection(db, 'users'),
          orderBy('createdAt', 'desc'),
          startAfter(userLastVisible),
          limit(20)
        );
        setUserPageHistory([...userPageHistory, userFirstVisible]);
        setUserCurrentPage(userCurrentPage + 1);
      } else if (direction === 'prev' && userPageHistory.length > 0) {
        const previousFirst = userPageHistory[userPageHistory.length - 1];
        q = query(
          collection(db, 'users'),
          orderBy('createdAt', 'desc'),
          startAfter(previousFirst),
          limit(20)
        );
        setUserPageHistory(userPageHistory.slice(0, -1));
        setUserCurrentPage(userCurrentPage - 1);
      } else {
        return;
      }

      const snapshot = await getDocs(q);
      const u = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUserList(u);
      
      if (snapshot.docs.length > 0) {
        setUserLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setUserFirstVisible(snapshot.docs[0]);
        setUserIsNextAvailable(snapshot.docs.length === 20);
      } else {
        setUserIsNextAvailable(false);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      alert("Gagal memuat data user");
    }
  };

  // ✅ DITAMBAHKAN: Search User by Email
  const handleSearchUser = async () => {
    if (!searchEmail.trim()) {
      fetchUsers('first');
      return;
    }
    
    setIsSearching(true);
    try {
      const q = query(
        collection(db, 'users'),
        where('email', '==', searchEmail.trim().toLowerCase()),
        limit(10)
      );
      
      const snapshot = await getDocs(q);
      const u = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUserList(u);
      
      if (u.length === 0) {
        alert("Tidak ada user dengan email tersebut.");
      }
    } catch (error) {
      console.error("Error searching user:", error);
      alert("Gagal mencari user");
    } finally {
      setIsSearching(false);
    }
  };

  // ✅ DITAMBAHKAN: Clear Search
  const handleClearSearch = () => {
    setSearchEmail('');
    fetchUsers('first');
  };

  // --- ACTIONS: TOKENS ---

  const handleDownloadExcel = async () => {
    if (!confirm("Download laporan lengkap dalam format Excel?")) return;
    try {
        const q = query(collection(db, 'tokens'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const dataToExport = querySnapshot.docs.map(doc => {
            const d = doc.data();
            return {
                "Nama Siswa": d.studentName,
                "Asal Sekolah": d.studentSchool || '-',
                "No WhatsApp": d.studentPhone,
                "Kode Token": d.tokenCode,
                "Status": d.status,
                "Nilai Akhir": d.score !== null ? d.score : "Belum Mengerjakan",
                "Waktu Selesai": d.finishedAt ? new Date(d.finishedAt).toLocaleString('id-ID') : '-',
                "Terkirim Via": d.sentMethod || '-'
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Data Nilai UTBK");

        const wscols = [{wch: 25}, {wch: 20}, {wch: 15}, {wch: 15}, {wch: 10}, {wch: 10}, {wch: 20}, {wch: 15}];
        worksheet['!cols'] = wscols;

        XLSX.writeFile(workbook, `Laporan_UTBK_${new Date().toISOString().slice(0,10)}.xlsx`);
        alert("✅ Download Berhasil!");
    } catch (error) {
        console.error("Gagal export:", error);
        alert("Gagal mendownload data.");
    }
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = async (evt) => {
        try {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);

            if (data.length === 0) { 
                alert("File kosong!"); 
                e.target.value = null;
                return; 
            }

            const parsedData = data.map((row, index) => ({
                id: index,
                nama: row['Nama'] || row['nama'] || row['Name'] || '',
                sekolah: row['Sekolah'] || row['sekolah'] || row['School'] || '-',
                hp: row['HP'] || row['hp'] || row['Phone'] || '-',
                valid: !!(row['Nama'] || row['nama'] || row['Name'])
            }));

            setPreviewData(parsedData);
            setSelectedRows(parsedData.filter(r => r.valid).map(r => r.id));
            setShowPreviewModal(true);
            
        } catch (error) {
            console.error("Import Error:", error); 
            alert("Gagal membaca file. Pastikan format Excel benar.");
        } finally {
            e.target.value = null;
        }
    };
    reader.readAsBinaryString(file);
  };

  const executeBulkImport = async () => {
    if (selectedRows.length === 0) {
        alert("Tidak ada data yang dipilih!");
        return;
    }

    setIsSending(true);
    setShowPreviewModal(false);

    try {
        const dataToImport = previewData.filter(row => selectedRows.includes(row.id));
        const batchSize = 450;
        const chunks = [];
        
        for (let i = 0; i < dataToImport.length; i += batchSize) {
            chunks.push(dataToImport.slice(i, i + batchSize));
        }

        let successCount = 0;
        for (const chunk of chunks) {
            const batchOp = writeBatch(db);
            
            chunk.forEach((row) => {
                const tokenCode = `UTBK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
                const docRef = doc(db, 'tokens', tokenCode);
                batchOp.set(docRef, {
                    tokenCode,
                    studentName: row.nama,
                    studentSchool: row.sekolah,
                    studentPhone: row.hp,
                    status: 'active',
                    createdAt: new Date().toISOString(),
                    isSent: false,
                    sentMethod: '-',
                    score: null,
                    createdBy: 'ADMIN_BULK'
                });
                successCount++;
            });
            
            await batchOp.commit();
        }
        
        alert(`✅ Sukses generate ${successCount} token!`);
        fetchTokens('first');
        
    } catch (error) {
        console.error("Bulk Import Error:", error);
        alert("Gagal melakukan import massal.");
    } finally {
        setIsSending(false);
        setPreviewData([]);
        setSelectedRows([]);
    }
  };

  const markAsSent = async (tokenCode, method) => {
    try { const tokenRef = doc(db, 'tokens', tokenCode); await updateDoc(tokenRef, { isSent: true, sentMethod: method, sentAt: new Date().toISOString() }); } catch (error) { console.error(error); }
  };

  const sendFonnteMessage = async (name, phone, token) => {
    if (!FONNTE_TOKEN) { alert("Token Fonnte Kosong!"); return; }
    setIsSending(true);
    let formattedPhone = phone.toString().replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.slice(1);
    const message = `Halo *${name}*,\n\nBerikut adalah akses ujian kamu:\n🔑 Token: *${token}*\n🔗 Link: ${STUDENT_APP_URL}\n\n⚠️ *Penting:* Token ini hanya berlaku 1x24 jam.\n\nSelamat mengerjakan!`;
    try {
        const params = new URLSearchParams({ token: FONNTE_TOKEN, target: formattedPhone, message: message, delay: SEND_DELAY, countryCode: '62' });
        await fetch(`https://api.fonnte.com/send?${params.toString()}`, { method: 'GET', mode: 'no-cors' });
        await markAsSent(token, 'Fonnte (Auto)');
        alert(`✅ (FONNTE) Pesan dikirim ke ${name}`);
    } catch (error) { console.error(error); alert("❌ Gagal Kirim Fonnte."); } finally { setIsSending(false); }
  };

  const sendJsDirect = async (name, phone, token) => {
    let formattedPhone = phone.toString().replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.slice(1);
    const message = `Halo *${name}*,\n\nBerikut adalah akses ujian kamu:\n🔑 Token: *${token}*\n🔗 Link: ${STUDENT_APP_URL}\n\n⚠️ *Penting:* Token ini hanya berlaku 1x24 jam.\n\nSelamat mengerjakan!`;
    window.location.href = `whatsapp://send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
    await markAsSent(token, 'JS App (Direct)');
  };

  const sendManualWeb = async (name, phone, token) => {
    let formattedPhone = phone.toString().replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.slice(1);
    const message = `Halo *${name}*,\n\nBerikut adalah akses ujian kamu:\n🔑 Token: *${token}*\n🔗 Link: ${STUDENT_APP_URL}\n\n⚠️ *Penting:* Token ini hanya berlaku 1x24 jam.\n\nSelamat mengerjakan!`;
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank');
    await markAsSent(token, 'WA Web (Manual)');
  };

  const createToken = async () => {
    if (!newTokenName || !newTokenPhone || !newTokenSchool) { alert('Isi Nama, Sekolah & HP!'); return; } 
    const tokenCode = `UTBK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    try { 
        await setDoc(doc(db, 'tokens', tokenCode), { 
            tokenCode, studentName: newTokenName, studentSchool: newTokenSchool, studentPhone: newTokenPhone, status: 'active', createdAt: new Date().toISOString(), isSent: false, sentMethod: '-', score: null, createdBy: 'ADMIN' 
        });
        
        if(confirm(`Token Berhasil: ${tokenCode}\n\nKirim via Jalur Default?`)) {
            if (autoSendMode === 'fonnte') await sendFonnteMessage(newTokenName, newTokenPhone, tokenCode);
            else if (autoSendMode === 'js_app') await sendJsDirect(newTokenName, newTokenPhone, tokenCode);
            else await sendManualWeb(newTokenName, newTokenPhone, tokenCode);
        }
        setNewTokenName(''); setNewTokenPhone(''); setNewTokenSchool('');
        fetchTokens('first');
    } catch (error) { alert('Gagal generate token.'); }
  };

  const deleteToken = async (code) => { if(confirm('Hapus token ini?')) { await deleteDoc(doc(db, 'tokens', code)); fetchTokens('first'); }};
  
  const resetScore = async (code) => {
      if(confirm('Reset ujian siswa ini? Status akan kembali AKTIF dan nilai dihapus.')) {
          await updateDoc(doc(db, 'tokens', code), {
              status: 'active', score: null, answers: {}, finalTimeLeft: null, createdAt: new Date().toISOString()
          });
          fetchTokens('first');
      }
  };

  const deleteAllTokens = async () => { if (!confirm("⚠️ PERINGATAN: Hapus SEMUA data?")) return; try { await Promise.all(tokenList.map(t => deleteDoc(doc(db, "tokens", t.tokenCode)))); alert("Semua terhapus."); fetchTokens('first'); } catch (error) { alert("Gagal."); } };
  
  // --- ACTIONS: USER MANAGEMENT ---
  const handleAddCredits = async (userId) => {
      const amount = prompt("Masukkan jumlah credit yang ingin ditambahkan (cth: 5):");
      if(amount && !isNaN(amount)) {
          try {
              const userRef = doc(db, 'users', userId);
              await updateDoc(userRef, { credits: increment(parseInt(amount)) });
              alert(`Berhasil menambahkan ${amount} credits.`);
          } catch(e) { alert("Gagal update credits."); }
      }
  };

  const handleDeleteUser = async (userId) => {
      if(confirm("Hapus user ini? Data credit akan hilang.")) {
          await deleteDoc(doc(db, 'users', userId));
      }
  };

  // --- ACTIONS: LEADERBOARD & BANK SOAL ---
  const resetLeaderboard = async () => {
    if (!confirm("⚠️ RESET SEMUA SKOR DI LEADERBOARD?\nToken akan tetap aktif, tapi nilai akan hilang.")) return;
    try {
        const querySnapshot = await getDocs(collection(db, 'tokens'));
        const updates = [];
        querySnapshot.forEach((docSnap) => {
             if (docSnap.data().score !== undefined) {
                 updates.push(updateDoc(docSnap.ref, { score: deleteField(), finalTimeLeft: deleteField(), finishedAt: deleteField(), status: 'active', answers: {} }));
             }
        });
        await Promise.all(updates); alert("✅ Leaderboard Berhasil Direset!"); 
    } catch (error) { alert("Gagal reset."); }
  };

  const saveSoal = async (sid, q) => { await setDoc(doc(db, 'bank_soal', sid), { questions: q }); setBankSoal(p => ({ ...p, [sid]: q })); };
  
  const addOrUpdate = async () => {
    if (!questionText.trim()) { alert('Pertanyaan wajib diisi!'); return; }
    if (questionType !== 'isian' && options.some(o => !o.trim())) { alert('Semua opsi wajib diisi!'); return; }
    if (questionType === 'pilihan_majemuk' && (!Array.isArray(correctAnswer) || correctAnswer.length === 0)) { alert('Pilih minimal 1 kunci!'); return; }
    if (questionType === 'isian' && (!correctAnswer || correctAnswer.toString().trim() === '')) { alert('Isi kunci jawaban!'); return; }

    const newQuestion = { 
        id: editingId || Date.now().toString(), 
        type: questionType, question: questionText, image: questionImage, 
        options: questionType === 'isian' ? [] : options, 
        correct: correctAnswer 
    };
    const currentQuestions = bankSoal[selectedSubtest] || [];
    const updatedQuestions = editingId ? currentQuestions.map(q => q.id === editingId ? newQuestion : q) : [...currentQuestions, newQuestion];
    await saveSoal(selectedSubtest, updatedQuestions); alert('Disimpan!'); resetForm();
  };

  const deleteSoal = async (id) => { 
      if(confirm('Hapus soal ini?')) {
          const currentQuestions = bankSoal[selectedSubtest] || [];
          const filteredQuestions = currentQuestions.filter(x => x.id !== id);
          await saveSoal(selectedSubtest, filteredQuestions); 
      }
  };
  
  const resetForm = () => { setQuestionText(''); setQuestionImage(''); setOptions(['', '', '', '', '']); setEditingId(null); handleTypeChange('pilihan_ganda'); };
  const handleTypeChange = (type) => {
      setQuestionType(type);
      if (type === 'pilihan_ganda') setCorrectAnswer('A');
      else if (type === 'pilihan_majemuk') setCorrectAnswer([]); 
      else if (type === 'isian') setCorrectAnswer(''); 
  };
  
  const loadSoalForEdit = (q) => {
      setQuestionText(q.question); setQuestionImage(q.image || ''); setQuestionType(q.type || 'pilihan_ganda'); 
      if (q.type === 'isian') { setOptions(['', '', '', '', '']); setCorrectAnswer(q.correct); } 
      else { setOptions([...q.options]); setCorrectAnswer(q.correct); }
      setEditingId(q.id); window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { alert("⚠️ File terlalu besar! Maksimal 1MB."); return; }
    setIsUploading(true); const reader = new FileReader();
    reader.onloadend = () => { setQuestionImage(reader.result); setIsUploading(false); };
    reader.readAsDataURL(file);
  };
  const removeImage = () => { setQuestionImage(''); };
  const generateDummy = async () => { if (!confirm('Isi Dummy?')) return; const n = { ...bankSoal }; for (const s of SUBTESTS) { const cur = bankSoal[s.id] || []; const need = s.questions - cur.length; if (need > 0) { const d = []; for (let i = 0; i < need; i++) d.push({ id: `d_${s.id}_${i}`, question: `Dummy ${s.name} ${i+1}`, image: '', options: ['A','B','C','D','E'], correct: 'A' }); const fin = [...cur, ...d]; await setDoc(doc(db, 'bank_soal', s.id), { questions: fin }); n[s.id] = fin; } } setBankSoal(n); alert('Dummy Done!'); };

  // --- UI COMPONENTS ---

  const PreviewUploadModal = () => {
    const toggleRowSelection = (id) => {
        if (selectedRows.includes(id)) {
            setSelectedRows(selectedRows.filter(rowId => rowId !== id));
        } else {
            setSelectedRows([...selectedRows, id]);
        }
    };

    const toggleSelectAll = () => {
        if (selectedRows.length === previewData.filter(r => r.valid).length) {
            setSelectedRows([]);
        } else {
            setSelectedRows(previewData.filter(r => r.valid).map(r => r.id));
        }
    };

    const validCount = previewData.filter(r => r.valid).length;
    const invalidCount = previewData.length - validCount;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-2xl text-white">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Eye size={24}/> Preview Data Excel
                            </h2>
                            <p className="text-sm text-indigo-100 mt-1">
                                Periksa dan pilih data yang akan di-import
                            </p>
                        </div>
                        <button 
                            onClick={() => {
                                setShowPreviewModal(false);
                                setPreviewData([]);
                                setSelectedRows([]);
                            }} 
                            className="hover:bg-white/20 p-2 rounded-full transition"
                        >
                            <X size={20}/>
                        </button>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 border-b grid grid-cols-3 gap-4">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-gray-800">{previewData.length}</div>
                        <div className="text-xs text-gray-500 uppercase">Total Baris</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{validCount}</div>
                        <div className="text-xs text-gray-500 uppercase">Valid</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{invalidCount}</div>
                        <div className="text-xs text-gray-500 uppercase">Invalid</div>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    <div className="mb-4 flex justify-between items-center">
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                            <input
                                type="checkbox"
                                checked={selectedRows.length === validCount && validCount > 0}
                                onChange={toggleSelectAll}
                                className="w-4 h-4 rounded border-gray-300"
                            />
                            <span className="text-sm font-bold text-gray-700">
                                Pilih Semua Valid ({selectedRows.length} dipilih)
                            </span>
                        </label>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-xs sticky top-0">
                                <tr>
                                    <th className="p-3 text-center w-12">#</th>
                                    <th className="p-3 text-left">Nama Siswa</th>
                                    <th className="p-3 text-left">Asal Sekolah</th>
                                    <th className="p-3 text-left">No. WhatsApp</th>
                                    <th className="p-3 text-center">Status</th>
                                    <th className="p-3 text-center w-16">Pilih</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {previewData.map((row, index) => (
                                    <tr 
                                        key={row.id} 
                                        className={`hover:bg-gray-50 ${!row.valid ? 'bg-red-50' : ''} ${selectedRows.includes(row.id) ? 'bg-indigo-50' : ''}`}
                                    >
                                        <td className="p-3 text-center text-gray-500 font-mono text-xs">
                                            {index + 1}
                                        </td>
                                        <td className="p-3">
                                            <div className={`font-bold ${row.nama ? 'text-gray-800' : 'text-red-500 italic'}`}>
                                                {row.nama || '(Kosong)'}
                                            </div>
                                        </td>
                                        <td className="p-3 text-gray-600">
                                            {row.sekolah}
                                        </td>
                                        <td className="p-3 font-mono text-gray-600">
                                            {row.hp}
                                        </td>
                                        <td className="p-3 text-center">
                                            {row.valid ? (
                                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">
                                                    VALID
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">
                                                    INVALID
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3 text-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedRows.includes(row.id)}
                                                onChange={() => toggleRowSelection(row.id)}
                                                disabled={!row.valid}
                                                className="w-4 h-4 rounded border-gray-300 disabled:opacity-30"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {showSoalImport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b bg-indigo-600 text-white rounded-t-2xl flex justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2"><UploadCloud/> Preview Import Soal</h2>
              <button onClick={() => setShowSoalImport(false)}><X/></button>
            </div>
            
            <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
               <div>Target: <span className="font-bold text-indigo-600">{SUBTESTS.find(s=>s.id===selectedSubtest)?.name}</span></div>
               <div className="text-sm">Total: <b>{previewSoal.length}</b> | Valid: <b className="text-green-600">{previewSoal.filter(s=>s.valid).length}</b></div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>   
                    <th className="p-2 border">Tipe</th>
                    <th className="p-2 border">Pertanyaan</th>
                    <th className="p-2 border">Opsi (A/B/C/D/E)</th>
                    <th className="p-2 border">Kunci</th>
                    <th className="p-2 border">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {previewSoal.map((s, i) => (
                    <tr key={i} className={s.valid ? "bg-white" : "bg-red-50"}>
                      <td className="p-2 border text-center">{i+1}</td>
                      <td className="p-2 border text-center uppercase text-xs font-bold">{s.type}</td>
                      <td className="p-2 border truncate max-w-xs">{s.question}</td>
                      <td className="p-2 border text-xs text-gray-500">
                        {s.type === 'isian' ? '-' : s.options.join(' | ')}
                      </td>
                      <td className="p-2 border text-center font-bold">{s.correct}</td>
                      <td className="p-2 border text-center">
                        {s.valid ? <CheckCircle2 className="text-green-500 w-5 h-5 mx-auto"/> : <XCircle className="text-red-500 w-5 h-5 mx-auto"/>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setShowSoalImport(false)} className="px-6 py-2 border rounded">Batal</button>
              <button onClick={saveBulkSoal} className="px-6 py-2 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700">Import Sekarang</button>
            </div>
          </div>
        </div>
      )}
    );
  };

  const LeaderboardModal = () => (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b flex justify-between items-center bg-indigo-600 rounded-t-2xl text-white">
                  <h2 className="text-xl font-bold flex items-center gap-2"><Trophy size={24} className="text-yellow-300"/> Leaderboard Peserta</h2>
                  <button onClick={()=>setShowLeaderboard(false)} className="hover:bg-indigo-700 p-2 rounded-full transition"><X size={20}/></button>
              </div>
              <div className="p-6 overflow-y-auto">
                  <div className="flex justify-end mb-4">
                      <button onClick={resetLeaderboard} className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-100 transition border border-red-200">
                          <Trash2 size={16}/> Reset Semua Data Peringkat
                      </button>
                  </div>
                  <table className="w-full text-sm text-left">
                      <thead className="bg-indigo-50 text-indigo-800 font-bold uppercase text-xs">
                          <tr>
                              <th className="p-3 text-center">#</th>
                              <th className="p-3">Nama Siswa</th>
                              <th className="p-3">Asal Sekolah</th>
                              <th className="p-3">Kode Token</th>
                              <th className="p-3">No. WhatsApp</th>
                              <th className="p-3 text-center">Score</th>
                              <th className="p-3 text-center">Sisa Waktu</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y">
                          {getLeaderboardData().map((t, idx) => (
                              <tr key={t.tokenCode} className="hover:bg-gray-50">
                                  <td className="p-3 text-center font-bold">
                                      {idx===0 ? '🥇' : idx===1 ? '🥈' : idx===2 ? '🥉' : idx+1}
                                  </td>
                                  <td className="p-3 font-medium text-gray-800">{t.studentName}</td>
                                  <td className="p-3 text-gray-600">{t.studentSchool || '-'}</td>
                                  <td className="p-3 font-mono text-indigo-600 font-bold">{t.tokenCode}</td>
                                  <td className="p-3 font-mono text-gray-600">{t.studentPhone}</td>
                                  <td className="p-3 text-center font-bold text-indigo-600 text-lg">{t.score}</td>
                                  <td className="p-3 text-center font-mono text-gray-500">
                                      {Math.floor(t.finalTimeLeft/60)}m {t.finalTimeLeft%60}s
                                  </td>
                              </tr>
                          ))}
                          {getLeaderboardData().length === 0 && (
                              <tr><td colSpan="7" className="p-8 text-center text-gray-400 italic">Belum ada data nilai peserta.</td></tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>
  );

  if (isCheckingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
          <p className="text-gray-500 font-bold">Memverifikasi Hak Akses...</p>
        </div>
      </div>
    );
  }

  if (screen === 'admin_login') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Admin Portal</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} className="w-full p-3 border rounded" placeholder="Email" required />
            <input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className="w-full p-3 border rounded" placeholder="Password" required />
            <button className="w-full bg-indigo-600 text-white py-3 rounded font-bold hover:bg-indigo-700">Masuk</button>
          </form>
          <div className="mt-8 text-center text-xs text-gray-400 font-mono">© {new Date().getFullYear()} Liezira</div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col"> 
        {showPreviewModal && <PreviewUploadModal />}
        {showLeaderboard && <LeaderboardModal />}

      {showSoalImport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b bg-indigo-600 text-white rounded-t-2xl flex justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2"><UploadCloud/> Preview Import Soal</h2>
              <button onClick={() => setShowSoalImport(false)}><X/></button>
            </div>
            
            <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
               <div>Target: <span className="font-bold text-indigo-600">{SUBTESTS.find(s=>s.id===selectedSubtest)?.name}</span></div>
               <div className="text-sm">Total: <b>{previewSoal.length}</b> | Valid: <b className="text-green-600">{previewSoal.filter(s=>s.valid).length}</b></div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="p-2 border">Tipe</th>
                    <th className="p-2 border">Pertanyaan</th>
                    <th className="p-2 border">Opsi (A/B/C/D/E)</th>
                    <th className="p-2 border">Kunci</th>
                    <th className="p-2 border">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {previewSoal.map((s, i) => (
                    <tr key={i} className={s.valid ? "bg-white" : "bg-red-50"}>
                      <td className="p-2 border text-center uppercase text-xs font-bold">{s.type}</td>
                      <td className="p-2 border truncate max-w-xs">{s.question}</td>
                      <td className="p-2 border text-xs text-gray-500">
                        {s.type === 'isian' ? '-' : s.options.join(' | ')}
                      </td>
                      <td className="p-2 border text-center font-bold">{s.correct}</td>
                      <td className="p-2 border text-center">
                        {s.valid ? <CheckCircle2 className="text-green-500 w-5 h-5 mx-auto"/> : <XCircle className="text-red-500 w-5 h-5 mx-auto"/>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setShowSoalImport(false)} className="px-6 py-2 border rounded">Batal</button>
              <button onClick={saveBulkSoal} className="px-6 py-2 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700">Import Sekarang</button>
            </div>
          </div>
        </div>
      )}

      {/* --- NAVBAR --- */}
      <div className="sticky top-0 z-40 bg-white shadow px-6 py-4 flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-indigo-900">Admin Panel</h1>
        <div className="flex gap-2">
          <button onClick={() => setViewMode('tokens')} className={`px-4 py-2 rounded ${viewMode==='tokens'?'bg-indigo-100 text-indigo-700':'text-gray-600'}`}>Token</button>
          <button onClick={() => setViewMode('users')} className={`px-4 py-2 rounded flex items-center gap-2 ${viewMode==='users'?'bg-indigo-100 text-indigo-700':'text-gray-600'}`}><Users size={16}/> Users & Credits</button>
          <button onClick={() => setViewMode('soal')} className={`px-4 py-2 rounded ${viewMode==='soal'?'bg-indigo-100 text-indigo-700':'text-gray-600'}`}>Bank Soal</button>
          <button onClick={() => setShowLeaderboard(true)} className="px-4 py-2 rounded bg-yellow-100 text-yellow-700 font-bold flex items-center gap-2 hover:bg-yellow-200 transition"><Trophy size={16}/> Leaderboard</button>
          <button onClick={handleLogout} className="text-red-600 px-3"><LogOut size={18}/></button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 flex-1 w-full">
        {viewMode === 'tokens' ? (
          // --- VIEW MODE: TOKENS ---
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow h-fit">
              <h2 className="font-bold mb-4 flex items-center gap-2"><Plus size={18}/> Buat Token</h2>
              
              <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                <p className="text-xs font-bold text-gray-500 mb-2 uppercase flex items-center gap-1"><Settings size={12}/> Metode Kirim Default:</p>
                <div className="flex flex-col gap-2">
                    <label className={`cursor-pointer p-2 rounded text-xs font-bold flex items-center gap-2 border ${autoSendMode === 'fonnte' ? 'bg-green-100 border-green-400 text-green-700 ring-1 ring-green-400' : 'bg-white border-gray-300 text-gray-500'}`}>
                        <input type="radio" name="sendMode" value="fonnte" checked={autoSendMode === 'fonnte'} onChange={() => setAutoSendMode('fonnte')} className="hidden" />
                        <Zap size={14} className={autoSendMode==='fonnte' ? "fill-green-600" : ""}/> 1. Auto (Fonnte API)
                    </label>
                    <label className={`cursor-pointer p-2 rounded text-xs font-bold flex items-center gap-2 border ${autoSendMode === 'manual_web' ? 'bg-blue-100 border-blue-400 text-blue-700 ring-1 ring-blue-400' : 'bg-white border-gray-300 text-gray-500'}`}>
                        <input type="radio" name="sendMode" value="manual_web" checked={autoSendMode === 'manual_web'} onChange={() => setAutoSendMode('manual_web')} className="hidden" />
                        <ExternalLink size={14}/> 2. Manual (WA Web)
                    </label>
                    <label className={`cursor-pointer p-2 rounded text-xs font-bold flex items-center gap-2 border ${autoSendMode === 'js_app' ? 'bg-purple-100 border-purple-400 text-purple-700 ring-1 ring-purple-400' : 'bg-white border-gray-300 text-gray-500'}`}>
                        <input type="radio" name="sendMode" value="js_app" checked={autoSendMode === 'js_app'} onChange={() => setAutoSendMode('js_app')} className="hidden" />
                        <Smartphone size={14}/> 3. JS Direct (App)
                    </label>
                </div>
              </div>

              <div className="space-y-4">
                <input value={newTokenName} onChange={e=>setNewTokenName(e.target.value)} className="w-full p-2 border rounded" placeholder="Nama Siswa"/>
                <input value={newTokenSchool} onChange={e=>setNewTokenSchool(e.target.value)} className="w-full p-2 border rounded" placeholder="Asal Sekolah"/>
                <input value={newTokenPhone} onChange={e=>setNewTokenPhone(e.target.value)} className="w-full p-2 border rounded" placeholder="No WhatsApp (08xxx)"/>
                <button onClick={createToken} disabled={isSending} className={`w-full py-2 rounded transition text-white font-bold flex items-center justify-center gap-2 ${isSending ? 'bg-gray-400' : autoSendMode === 'fonnte' ? 'bg-green-600 hover:bg-green-700' : autoSendMode === 'js_app' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                    {isSending ? 'Mengirim...' : 'Generate & Kirim'}
                </button>
              </div>
              
              <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-gray-200"></div>
                  <span className="flex-shrink-0 mx-4 text-gray-400 text-xs">ATAU IMPORT EXCEL</span>
                  <div className="flex-grow border-t border-gray-200"></div>
              </div>

              <div className="relative">
                  <input 
                      type="file" 
                      accept=".xlsx, .xls, .csv" 
                      onChange={handleImportExcel} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      disabled={isSending}
                  />
                  <button className="w-full py-2 rounded border-2 border-dashed border-indigo-300 text-indigo-600 font-bold hover:bg-indigo-50 flex items-center justify-center gap-2 transition">
                      <UploadCloud size={18}/> Upload Data Siswa (.xlsx)
                  </button>
              </div>
              <p className="text-[10px] text-gray-400 text-center">Format Kolom: Nama, Sekolah, HP</p>
            </div>

            <div className="md:col-span-2 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <button onClick={() => setFilterStatus('all')} className={`p-3 rounded-lg border text-center transition ${filterStatus === 'all' ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                  <p className="text-xs text-gray-500 uppercase font-bold">Total</p>
                  <p className="text-2xl font-bold text-gray-800">{tokenList.length}</p>
                </button>
                <button onClick={() => setFilterStatus('active')} className={`p-3 rounded-lg border text-center transition ${filterStatus === 'active' ? 'bg-green-50 border-green-500 ring-2 ring-green-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                  <p className="text-xs text-green-600 uppercase font-bold">Aktif</p>
                  <p className="text-2xl font-bold text-green-700">{activeTokens.length}</p>
                </button>
                <button onClick={() => setFilterStatus('used')} className={`p-3 rounded-lg border text-center transition ${filterStatus === 'used' ? 'bg-gray-100 border-gray-500 ring-2 ring-gray-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                  <p className="text-xs text-gray-600 uppercase font-bold">Terpakai</p>
                  <p className="text-2xl font-bold text-gray-700">{usedTokens.length}</p>
                </button>
                <button onClick={() => setFilterStatus('expired')} className={`p-3 rounded-lg border text-center transition ${filterStatus === 'expired' ? 'bg-red-50 border-red-500 ring-2 ring-red-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                  <p className="text-xs text-red-600 uppercase font-bold">Expired</p>
                  <p className="text-2xl font-bold text-red-700">{expiredTokens.length}</p>
                </button>
              </div>

              <div className="bg-white p-6 rounded-xl shadow">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-bold text-lg">List Token</h2>
                    <div className="flex gap-2">
                        <button onClick={handleDownloadExcel} className="flex items-center gap-1 text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded text-sm font-bold hover:bg-green-100 transition">
                            <List size={14}/> Export Excel
                        </button>            
                        <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1 border border-gray-200">
                            <button 
                                onClick={() => fetchTokens('prev')} 
                                disabled={currentPage === 1}
                                className="p-1.5 hover:bg-white rounded disabled:opacity-30 transition shadow-sm text-gray-600"
                                title="Halaman Sebelumnya"
                            >
                                <ChevronLeft size={16}/>
                            </button>
                            <span className="text-xs font-bold px-2 text-gray-600 min-w-[30px] text-center">{currentPage}</span>
                            <button 
                                onClick={() => fetchTokens('next')} 
                                disabled={!isNextAvailable}
                                className="p-1.5 hover:bg-white rounded disabled:opacity-30 transition shadow-sm text-gray-600"
                                title="Halaman Selanjutnya"
                            >
                                <ChevronRight size={16}/>
                            </button>
                        </div>

                        <button onClick={() => fetchTokens('first')} className="text-indigo-600 hover:bg-indigo-50 p-2 rounded transition" title="Refresh Data (Reset ke Page 1)">
                            <RefreshCcw size={16}/>
                        </button>

                        {tokenList.length > 0 && (
                            <button onClick={deleteAllTokens} className="text-red-600 bg-red-50 hover:bg-red-100 p-2 rounded transition ml-1" title="Hapus Semua Data">
                                <Trash2 size={16}/>
                            </button>
                        )}
                    </div>
                </div>
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 sticky top-0">
                        <tr>
                            <th className="p-2">Kode</th>
                            <th className="p-2">Nama & Sekolah</th>
                            <th className="p-2">Status Token</th>
                            <th className="p-2">Status Kirim</th> 
                            <th className="p-2 text-center">Progres & Skor</th>
                            <th className="p-2 text-center">Kirim Ulang</th> 
                            <th className="p-2 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>{getFilteredList().map(t => {
                        const expired = isExpired(t.createdAt);
                        const statusLabel = expired ? 'EXPIRED' : (t.status === 'used' ? 'USED' : 'ACTIVE');
                        const statusColor = expired ? 'bg-red-100 text-red-700' : (t.status === 'used' ? 'bg-gray-200 text-gray-700' : 'bg-green-100 text-green-700');

                        return (
                        <tr key={t.tokenCode} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-mono text-indigo-600 font-bold">{t.tokenCode}</td>
                        <td className="p-2">
                            <div className="font-bold text-gray-800">{t.studentName}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-1"><School size={10}/> {t.studentSchool || '-'}</div>
                            <div className="text-[10px] text-gray-400">{t.studentPhone}</div>
                        </td>
                        <td className="p-2"><span className={`px-2 py-1 rounded text-xs font-bold ${statusColor}`}>{statusLabel}</span></td>
                        
                        <td className="p-2">
                            {t.isSent ? (
                                <div className="flex flex-col">
                                    <span className="flex items-center gap-1 text-green-600 font-bold text-xs"><CheckCircle2 size={12}/> Terkirim</span>
                                    <span className="text-[10px] text-gray-400">{t.sentMethod}</span>
                                </div>
                            ) : (
                                <span className="flex items-center gap-1 text-gray-400 text-xs"><XCircle size={12}/> Belum</span>
                            )}
                        </td>

                        <td className="p-4 text-center">
                            <div className="flex flex-col gap-1 items-center">
                                {t.score !== undefined && t.score !== null ? (
                                    <>
                                        <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded w-fit border border-blue-200">SELESAI</span>
                                        <span className="text-sm font-bold text-gray-800 flex items-center gap-1">🏆 Skor: {t.score}</span>
                                    </>
                                ) : (
                                    <span className="text-gray-400 text-xs font-bold bg-gray-100 px-2 py-1 rounded w-fit">-</span>
                                )}
                            </div>
                        </td>
                        
                        <td className="p-2 flex gap-1 justify-center">
                            <button onClick={() => sendFonnteMessage(t.studentName, t.studentPhone, t.tokenCode)} className="bg-green-50 text-green-700 p-1.5 rounded hover:bg-green-100"><Zap size={14}/></button>
                            <button onClick={() => sendManualWeb(t.studentName, t.studentPhone, t.tokenCode)} className="bg-blue-50 text-blue-700 p-1.5 rounded hover:bg-blue-100"><ExternalLink size={14}/></button>
                            <button onClick={() => sendJsDirect(t.studentName, t.studentPhone, t.tokenCode)} className="bg-purple-50 text-purple-700 p-1.5 rounded hover:bg-purple-100"><Smartphone size={14}/></button>
                        </td>

                        <td className="p-2 text-center">
                            <div className="flex gap-2 justify-center">
                                {t.status === 'used' && !expired && (
                                    <button onClick={()=>resetScore(t.tokenCode)} className="text-orange-500 hover:text-orange-700 bg-orange-50 p-2 rounded border border-orange-200" title="Reset Ujian"><RefreshCcw size={16}/></button>
                                )}
                                <button onClick={()=>deleteToken(t.tokenCode)} className="text-red-500 hover:text-red-700 bg-red-50 p-2 rounded border border-red-200" title="Hapus"><Trash2 size={16}/></button>
                            </div>
                        </td>
                    </tr>)})}</tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : viewMode === 'users' ? (
          // --- VIEW MODE: USERS ---
          <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-6 rounded-xl shadow border border-indigo-100">
                      <h3 className="text-gray-500 text-xs font-bold uppercase mb-1">Total Users</h3>
                      <div className="text-3xl font-black text-indigo-900">{totalUsersCount}</div>
                      <p className="text-xs text-gray-400 mt-1">Ditampilkan: {userList.length} user</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow border border-green-100">
                      <h3 className="text-gray-500 text-xs font-bold uppercase mb-1">Total Credits Beredar</h3>
                      <div className="text-3xl font-black text-green-600">{totalCreditsCount}</div>
                      <p className="text-xs text-gray-400 mt-1">Dari halaman ini</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow border border-blue-100">
                      <h3 className="text-gray-500 text-xs font-bold uppercase mb-1">Total Tokens</h3>
                      <div className="text-3xl font-black text-blue-600">{totalTokensCount}</div>
                  </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow">
                  <div className="flex justify-between items-center mb-4">
                      <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                          <Wallet size={20}/> Manajemen Saldo User
                      </h2>
                      
                      <div className="flex gap-2">
                          <div className="relative">
                              <input 
                                  type="email" 
                                  value={searchEmail} 
                                  onChange={e => setSearchEmail(e.target.value)}
                                  onKeyPress={e => e.key === 'Enter' && handleSearchUser()}
                                  placeholder="Cari email..." 
                                  className="pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 outline-none w-64"
                              />
                              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                          </div>
                          <button 
                              onClick={handleSearchUser} 
                              disabled={isSearching}
                              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition disabled:bg-gray-400"
                          >
                              {isSearching ? 'Mencari...' : 'Cari'}
                          </button>
                          {searchEmail && (
                              <button 
                                  onClick={handleClearSearch}
                                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition"
                              >
                                  Reset
                              </button>
                          )}
                      </div>
                  </div>

                  {!searchEmail && (
                      <div className="flex justify-end mb-4">
                          <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1 border border-gray-200">
                              <button 
                                  onClick={() => fetchUsers('prev')} 
                                  disabled={userCurrentPage === 1}
                                  className="p-1.5 hover:bg-white rounded disabled:opacity-30 transition shadow-sm text-gray-600"
                                  title="Halaman Sebelumnya"
                              >
                                  <ChevronLeft size={16}/>
                              </button>
                              <span className="text-xs font-bold px-2 text-gray-600 min-w-[30px] text-center">{userCurrentPage}</span>
                              <button 
                                  onClick={() => fetchUsers('next')} 
                                  disabled={!userIsNextAvailable}
                                  className="p-1.5 hover:bg-white rounded disabled:opacity-30 transition shadow-sm text-gray-600"
                                  title="Halaman Selanjutnya"
                              >
                                  <ChevronRight size={16}/>
                              </button>
                          </div>
                      </div>
                  )}

                  <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                          <thead className="bg-gray-50">
                              <tr>
                                  <th className="p-3">Nama & Email</th>
                                  <th className="p-3">Sekolah</th>
                                  <th className="p-3">HP</th>
                                  <th className="p-3 text-center">Sisa Credits</th>
                                  <th className="p-3 text-center">Token Dibuat</th>
                                  <th className="p-3 text-center">Aksi</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y">
                              {userList.map(user => (
                                  <tr key={user.id} className="hover:bg-gray-50">
                                      <td className="p-3">
                                          <div className="font-bold text-gray-800">{user.displayName || 'No Name'}</div>
                                          <div className="text-xs text-gray-500">{user.email}</div>
                                      </td>
                                      <td className="p-3 text-gray-600">{user.school || '-'}</td>
                                      <td className="p-3 font-mono text-gray-500">{user.phone || '-'}</td>
                                      <td className="p-3 text-center">
                                          <span className={`px-3 py-1 rounded-full font-bold ${user.credits > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                              {user.credits || 0}
                                          </span>
                                      </td>
                                      <td className="p-3 text-center font-bold text-indigo-600">
                                          {user.generatedTokens ? user.generatedTokens.length : 0}
                                      </td>
                                      <td className="p-3 text-center">
                                          <div className="flex justify-center gap-2">
                                              <button onClick={() => handleAddCredits(user.id)} className="bg-green-50 text-green-600 p-2 rounded hover:bg-green-100 border border-green-200" title="Top Up Manual">
                                                  <Coins size={16}/> +
                                              </button>
                                              <button onClick={() => handleDeleteUser(user.id)} className="bg-red-50 text-red-600 p-2 rounded hover:bg-red-100 border border-red-200" title="Hapus User">
                                                  <Trash2 size={16}/>
                                              </button>
                                          </div>
                                      </td>
                                  </tr>
                              ))}
                              {userList.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-gray-400">Belum ada user yang mendaftar.</td></tr>}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
        ) : (
          // --- VIEW MODE: BANK SOAL ---
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-800">Editor Bank Soal</h2>
                  <div className="flex gap-2">
                    <button onClick={handleDownloadTemplateSoal} className="text-xs bg-green-50 text-green-700 px-3 py-2 rounded border border-green-200 font-bold flex items-center gap-1 hover:bg-green-100">
                      <List size={14}/> Template Excel
                    </button>
                    <label className="text-xs bg-blue-50 text-blue-700 px-3 py-2 rounded border border-blue-200 font-bold flex items-center gap-1 hover:bg-blue-100 cursor-pointer">
                      <UploadCloud size={14}/> Import Excel
                      <input type="file" accept=".xlsx" className="hidden" onChange={handleImportSoalFile}/>
                    </label>
                  </div>
               </div>
               <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-8">
                 <select value={selectedSubtest} onChange={e => { setSelectedSubtest(e.target.value); resetForm(); }} className="w-full p-3 border rounded-lg mb-6 bg-white font-medium text-gray-700 shadow-sm focus:ring-2 focus:ring-indigo-200 outline-none">
                     {SUBTESTS.map(s => (<option key={s.id} value={s.id}>{s.name} ({bankSoal[s.id]?.length || 0} / {s.questions})</option>))}
                 </select>
                 
                 <div className="mb-6"><label className="text-xs font-bold text-gray-500 uppercase mb-2 block tracking-wider">Format Soal:</label><div className="flex flex-wrap gap-2">
                      <label className={`cursor-pointer px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 border-2 transition ${questionType === 'pilihan_ganda' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}><input type="radio" name="qType" className="hidden" checked={questionType === 'pilihan_ganda'} onChange={() => setQuestionType('pilihan_ganda')} /><List size={18}/> Pilihan Ganda</label>
                      <label className={`cursor-pointer px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 border-2 transition ${questionType === 'pilihan_majemuk' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}><input type="radio" name="qType" className="hidden" checked={questionType === 'pilihan_majemuk'} onChange={() => setQuestionType('pilihan_majemuk')} /><CheckSquare size={18}/> Pilihan Majemuk</label>
                      <label className={`cursor-pointer px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 border-2 transition ${questionType === 'isian' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}><input type="radio" name="qType" className="hidden" checked={questionType === 'isian'} onChange={() => setQuestionType('isian')} /><Type size={18}/> Isian Singkat</label>
                 </div></div>

                 <textarea value={questionText} onChange={e => setQuestionText(e.target.value)} className="w-full p-4 border rounded-lg mb-4 focus:ring-2 focus:ring-indigo-100 outline-none" rows="3" placeholder="Ketik Pertanyaan di sini (Support LaTeX dengan $...$)..." />
                 
                 <div className="mb-6">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block tracking-wider">Gambar Soal (Opsional):</label>
                    
                    {!questionImage ? (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center bg-white hover:bg-gray-50 transition cursor-pointer relative">
                            <input type="file" accept="image/*" onChange={handleImageUpload} disabled={isUploading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                            {isUploading ? (
                                <div className="flex flex-col items-center text-indigo-600 animate-pulse"><Loader2 size={32} className="animate-spin mb-2"/><span className="text-sm font-bold">Sedang Memproses...</span></div>
                            ) : (
                                <div className="flex flex-col items-center text-gray-400"><UploadCloud size={32} className="mb-2"/><span className="text-sm font-medium text-gray-500">Klik untuk Upload Gambar</span><span className="text-xs text-gray-400 mt-1">Max 1MB (Langsung Simpan)</span></div>
                            )}
                        </div>
                    ) : (
                        <div className="relative w-fit group">
                            <img src={questionImage} alt="Preview Soal" className="max-h-48 rounded-lg border border-gray-200 shadow-sm" />
                            <button onClick={() => setQuestionImage('')} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600 transition transform hover:scale-110" title="Hapus Gambar"><X size={16} /></button>
                            <div className="mt-2 text-xs text-green-600 font-bold flex items-center gap-1"><CheckCircle2 size={12}/> Gambar Siap Disimpan</div>
                        </div>
                    )}
                 </div>

                 {questionType !== 'isian' ? (<>
                       <div className="space-y-3 mb-6">{options.map((o, i) => (<div key={i} className="flex gap-3 items-center"><span className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-indigo-100 font-bold rounded-lg text-indigo-700">{['A','B','C','D','E'][i]}</span><input value={o} onChange={e => {const n=[...options];n[i]=e.target.value;setOptions(n)}} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none" placeholder={`Pilihan Jawaban ${['A','B','C','D','E'][i]}`} /></div>))}</div>
                       <div className="mb-4"><label className="text-xs font-bold text-gray-500 uppercase mb-2 block tracking-wider">Kunci Jawaban Benar ({questionType === 'pilihan_ganda' ? 'Pilih Satu' : 'Pilih Banyak'}):</label><div className="flex gap-3">{['A','B','C','D','E'].map(l => {const isSelected = questionType === 'pilihan_ganda' ? correctAnswer === l : (Array.isArray(correctAnswer) && correctAnswer.includes(l)); return (<button key={l} onClick={() => { if (questionType === 'pilihan_ganda') setCorrectAnswer(l); else { let current = Array.isArray(correctAnswer) ? [...correctAnswer] : []; if(current.includes(l)) current = current.filter(x=>x!==l); else current.push(l); setCorrectAnswer(current); } }} className={`flex-1 py-3 border-2 rounded-lg font-bold transition text-lg ${isSelected ? 'bg-green-50 text-white border-green-500 shadow-md' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'}`}>{l}</button>);})}</div></div></>) : (<div className="mb-6 bg-green-50 p-4 rounded-lg border border-green-200"><label className="text-xs font-bold text-green-700 uppercase mb-2 block tracking-wider flex items-center gap-1"><Key size={14}/> Kunci Jawaban (Teks/Angka):</label><input value={correctAnswer} onChange={e => setCorrectAnswer(e.target.value)} className="w-full p-4 border-2 border-green-400 rounded-lg bg-white font-bold text-xl text-gray-800 focus:outline-none focus:ring-4 focus:ring-green-100" placeholder="Contoh: 25 atau Jakarta" /></div>)}
                 
                 <div className="flex gap-3 pt-4 border-t border-gray-200"><button onClick={addOrUpdate} className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 shadow-lg transition transform hover:-translate-y-0.5">{editingId ? 'Simpan Perubahan' : 'Tambah Soal Baru'}</button>{editingId && <button onClick={resetForm} className="px-6 border-2 border-gray-300 py-3 rounded-lg font-bold text-gray-500 hover:bg-gray-100">Batal Edit</button>}</div>
               </div>
               
               <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">{(bankSoal[selectedSubtest]||[]).map((q, i) => (<div key={q.id} className="p-4 border rounded-xl flex justify-between items-start bg-white hover:shadow-md transition group"><div className="flex-1 pr-4"><div className="flex items-center gap-2 mb-2"><span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded text-sm">#{i+1}</span><span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${q.type==='isian'?'bg-green-50 text-green-600 border-green-100':q.type==='pilihan_majemuk'?'bg-orange-50 text-orange-600 border-orange-100':'bg-gray-100 text-gray-500 border-gray-200'}`}>{q.type ? q.type.replace('_', ' ') : 'PILIHAN GANDA'}</span></div><p className="line-clamp-2 text-gray-700 text-sm font-medium">{q.question}</p>{q.image && <div className="mt-2 text-xs text-blue-500 flex items-center gap-1"><ImageIcon size={12}/> Ada Gambar</div>}</div><div className="flex gap-2"><button onClick={() => loadSoalForEdit(q)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded"><Edit size={18}/></button><button onClick={() => deleteSoal(q.id)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={18}/></button></div></div>))}</div>
             </div>

             <div className="lg:sticky lg:top-24 h-fit">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                        <span className="font-bold text-gray-700 bg-white border border-gray-200 px-3 py-1 rounded text-sm flex items-center gap-2">
                            <Eye size={16} className="text-indigo-500"/> Pratinjau Soal (Tampilan Siswa)
                        </span>
                        <span className="text-xs font-bold px-2 py-1 rounded border bg-indigo-50 text-indigo-600 border-indigo-100 uppercase">
                            {questionType.replace('_', ' ')}
                        </span>
                    </div>
                    
                    <div className="p-5">
                        <div className="text-gray-800 text-sm leading-relaxed font-medium mb-4 text-left text-justify whitespace-pre-wrap">
                            <Latex>{(questionText || 'Belum ada pertanyaan...').replace(/</g, ' < ')}</Latex>
                        </div>
                        {questionImage && <img src={questionImage} className="w-full h-auto my-6 select-none object-contain" alt="Soal" />}
                        
                        <div className="space-y-2 text-sm">
                            {questionType === 'isian' ? (
                                <div className="bg-gray-50 p-4 rounded-lg border-2 border-dashed border-gray-300 opacity-70">
                                    <input disabled className="w-full p-2 bg-transparent text-xl font-mono border-b-2 border-gray-300 outline-none" placeholder="Jawaban siswa..." />
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {options.map((opt, i) => {
                                        const label = ['A','B','C','D','E'][i];
                                        const isCorrect = questionType === 'pilihan_ganda' ? correctAnswer === label : (Array.isArray(correctAnswer) && correctAnswer.includes(label));
                                        return (
                                            <div key={i} className={`p-3 rounded-lg border flex gap-3 items-center ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                                                <div className={`w-6 h-6 flex items-center justify-center font-bold rounded text-xs ${isCorrect ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                                    {label}
                                                </div>
                                                <div className="font-medium text-gray-700">
                                                    <Latex>{(opt || `Pilihan ${label}`).replace(/</g, ' < ')}</Latex>
                                                </div>
                                                {isCorrect && <CheckCircle2 size={16} className="text-green-500 ml-auto"/>}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="mt-4 text-center text-xs text-gray-400">
                    *Preview ini menampilkan bagaimana soal terlihat di aplikasi siswa.
                </div>
             </div>
          </div>
        )}
      </div>
      
      <div className="py-6 bg-white border-t border-gray-200 w-full text-center">
        <p className="text-gray-400 text-xs font-mono flex items-center justify-center gap-1">
          <Copyright size={12} /> {new Date().getFullYear()} Created by <span className="font-bold text-indigo-500">Liezira.Tech</span>
        </p>
      </div>
    </div>
  );

export default UTBKAdminApp;