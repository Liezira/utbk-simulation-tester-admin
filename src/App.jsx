import React, { useState, useEffect } from 'react';
import { 
  Edit, 
  Plus, 
  Trash2, 
  LogOut, 
  Key, 
  BarChart3, 
  Filter, 
  Copyright, 
  MessageCircle, 
  Send, 
  ExternalLink, 
  Zap, 
  Settings, 
  Radio, 
  Smartphone, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  List, 
  CheckSquare, 
  Type, 
  Trophy, 
  X, 
  Server // Icon untuk Backup Server
} from 'lucide-react';
import { db, auth } from './firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  deleteDoc, 
  deleteField 
} from 'firebase/firestore'; 
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';

// ==========================================
// KONFIGURASI CONSTANT
// ==========================================
const SUBTESTS = [
  { id: 'pu', name: 'Penalaran Umum', questions: 30 },
  { id: 'ppu', name: 'Pengetahuan & Pemahaman Umum', questions: 20 },
  { id: 'pbm', name: 'Pemahaman Bacaan & Menulis', questions: 20 },
  { id: 'pk', name: 'Pengetahuan Kuantitatif', questions: 15 },
  { id: 'lbi', name: 'Literasi Bahasa Indonesia', questions: 30 },
  { id: 'lbe', name: 'Literasi Bahasa Inggris', questions: 20 },
  { id: 'pm', name: 'Penalaran Matematika', questions: 20 },
];

const STUDENT_APP_URL = "https://utbk-simulation-tester-student.vercel.app"; 
const FONNTE_TOKEN = import.meta.env.VITE_FONNTE_TOKEN; 
const BACKUP_TOKEN = import.meta.env.VITE_BACKUP_TOKEN; 
const BACKUP_URL = import.meta.env.VITE_BACKUP_URL; 
const SEND_DELAY = 3; 

const UTBKAdminApp = () => {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const [screen, setScreen] = useState('admin_login'); 
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [viewMode, setViewMode] = useState('tokens'); 
  
  // Data Lists
  const [tokenList, setTokenList] = useState([]);
  const [bankSoal, setBankSoal] = useState({});
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Create Token State
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenPhone, setNewTokenPhone] = useState('');
  const [autoSendMode, setAutoSendMode] = useState('fonnte'); 
  const [isSending, setIsSending] = useState(false);

  // Leaderboard Modal State
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Editor Soal State
  const [selectedSubtest, setSelectedSubtest] = useState('pu');
  const [questionType, setQuestionType] = useState('pilihan_ganda'); 
  const [questionText, setQuestionText] = useState('');
  const [questionImage, setQuestionImage] = useState('');
  const [options, setOptions] = useState(['', '', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState('A'); 
  const [editingId, setEditingId] = useState(null);

  // ==========================================
  // INITIAL LOAD & AUTH
  // ==========================================
  useEffect(() => {
    const loadBankSoal = async () => {
      const loaded = {};
      for (const subtest of SUBTESTS) {
        try {
          const docRef = doc(db, 'bank_soal', subtest.id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
              loaded[subtest.id] = docSnap.data().questions;
          } else {
              loaded[subtest.id] = [];
          }
        } catch (error) { 
            loaded[subtest.id] = []; 
        }
      }
      setBankSoal(loaded);
    };

    if (screen === 'dashboard') {
        loadBankSoal();
    }
  }, [screen]);

  const handleLogin = async (e) => { 
      e.preventDefault(); 
      try { 
          await signInWithEmailAndPassword(auth, adminEmail, adminPassword); 
          setScreen('dashboard'); 
          loadTokens(); 
      } catch (error) { 
          alert('Login Gagal. Periksa email dan password.'); 
      } 
  };
  
  const handleLogout = async () => { 
      await signOut(auth); 
      setScreen('admin_login'); 
  };

  // ==========================================
  // LOGIC TOKEN & SENDING (3 METHODS)
  // ==========================================

  const loadTokens = async () => { 
      const s = await getDocs(collection(db, 'tokens')); 
      const t = []; 
      s.forEach((d) => t.push(d.data())); 
      t.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); 
      setTokenList(t); 
  };

  const markAsSent = async (tokenCode, method) => { 
      try { 
          const tokenRef = doc(db, 'tokens', tokenCode); 
          await updateDoc(tokenRef, { 
              isSent: true, 
              sentMethod: method, 
              sentAt: new Date().toISOString() 
          }); 
          loadTokens(); 
      } catch (error) { 
          console.error("Error updating status:", error); 
      } 
  };
  
  // 1. ENGINE UTAMA (FONNTE)
  const sendFonnteMessage = async (name, phone, token) => {
    if (!FONNTE_TOKEN) { alert("Token Fonnte Kosong!"); return; }
    setIsSending(true);
    
    let formattedPhone = phone.toString().replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.slice(1);
    
    const message = `Halo *${name}*,\n\nBerikut akses ujian simulasi kamu:\n🔑 Token: *${token}*\n🔗 Link: ${STUDENT_APP_URL}\n\nSelamat mengerjakan!`;
    
    try {
        const params = new URLSearchParams({ token: FONNTE_TOKEN, target: formattedPhone, message: message, delay: SEND_DELAY, countryCode: '62' });
        await fetch(`https://api.fonnte.com/send?${params.toString()}`, { method: 'GET', mode: 'no-cors' });
        await markAsSent(token, 'Fonnte (Auto)'); 
        alert(`✅ Terkirim ke ${name} (Fonnte)`);
    } catch (error) { alert("❌ Gagal Fonnte."); } 
    finally { setIsSending(false); }
  };

  // 2. ENGINE CADANGAN (BACKUP)
  const sendBackupMessage = async (name, phone, token) => {
    if (!BACKUP_TOKEN) { alert("Token Backup Kosong!"); return; }
    setIsSending(true);

    let formattedPhone = phone.toString().replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.slice(1);

    const message = `Halo *${name}*,\n\nBerikut akses ujian kamu:\n🔑 Token: *${token}*\n🔗 Link: ${STUDENT_APP_URL}\n\nSelamat mengerjakan!`;

    try {
        const params = new URLSearchParams({ token: BACKUP_TOKEN, number: formattedPhone, message: message });
        await fetch(`${BACKUP_URL}?${params.toString()}`, { method: 'GET', mode: 'no-cors' });
        await markAsSent(token, 'Backup Provider');
        alert(`🟠 Terkirim ke ${name} (Backup)`);
    } catch (error) { alert("❌ Gagal Backup."); } 
    finally { setIsSending(false); }
  };

  // 3. ENGINE MANUAL (WA APP)
  const sendManualApp = async (name, phone, token) => { 
      let p = phone.replace(/\D/g, ''); 
      if (p.startsWith('0')) p = '62' + p.slice(1); 
      
      const text = `Halo *${name}*, Token: *${token}*, Link: ${STUDENT_APP_URL}`;
      window.open(`https://api.whatsapp.com/send?phone=${p}&text=${encodeURIComponent(text)}`, '_blank'); 
      
      await markAsSent(token, 'Manual App'); 
  };

  const createToken = async () => {
    if (!newTokenName || !newTokenPhone) { alert('Isi data!'); return; }
    
    const tokenCode = `UTBK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    try { 
        await setDoc(doc(db, 'tokens', tokenCode), { 
            tokenCode, 
            studentName: newTokenName, 
            studentPhone: newTokenPhone, 
            status: 'active', 
            createdAt: new Date().toISOString(), 
            isSent: false, 
            sentMethod: '-' 
        });
        
        let modeLabel = "";
        if (autoSendMode === 'fonnte') modeLabel = "UTAMA (Fonnte)";
        else if (autoSendMode === 'backup') modeLabel = "CADANGAN (Backup)";
        else modeLabel = "MANUAL (WA App)";

        if(confirm(`Token Berhasil: ${tokenCode}\n\nKirim via ${modeLabel}?`)) {
            if (autoSendMode === 'fonnte') await sendFonnteMessage(newTokenName, newTokenPhone, tokenCode);
            else if (autoSendMode === 'backup') await sendBackupMessage(newTokenName, newTokenPhone, tokenCode);
            else await sendManualApp(newTokenName, newTokenPhone, tokenCode);
        } else { 
            loadTokens(); 
        }
        setNewTokenName(''); 
        setNewTokenPhone(''); 
    } catch (error) { alert('Gagal generate token.'); }
  };

  const deleteToken = async (code) => { 
      if(confirm('Hapus token ini?')) { 
          await deleteDoc(doc(db, 'tokens', code)); 
          loadTokens(); 
      }
  };

  const deleteAllTokens = async () => { 
      if (!confirm("⚠️ HAPUS SEMUA DATA TOKEN?")) return; 
      try {
          await Promise.all(tokenList.map(t => deleteDoc(doc(db, "tokens", t.tokenCode)))); 
          loadTokens(); 
      } catch (error) { alert("Gagal hapus semua."); }
  };

  // ==========================================
  // STATS & LEADERBOARD LOGIC
  // ==========================================
  
  const isExpired = (createdAt) => (Date.now() - new Date(createdAt).getTime()) > 24 * 60 * 60 * 1000;
  const activeTokens = tokenList.filter(t => t.status === 'active' && !isExpired(t.createdAt));
  const usedTokens = tokenList.filter(t => t.status === 'used');
  const expiredTokens = tokenList.filter(t => isExpired(t.createdAt));

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

  const resetLeaderboard = async () => {
    if (!confirm("⚠️ RESET SKOR SISWA?\nToken tetap aktif.")) return;
    try {
        const querySnapshot = await getDocs(collection(db, 'tokens'));
        const updates = [];
        querySnapshot.forEach((docSnap) => {
             if (docSnap.data().score !== undefined) {
                 updates.push(updateDoc(docSnap.ref, { score: deleteField(), finalTimeLeft: deleteField(), finishedAt: deleteField() }));
             }
        });
        await Promise.all(updates); 
        alert("✅ Leaderboard Reset!"); 
        loadTokens();
    } catch (error) { alert("Gagal reset."); }
  };

  // ==========================================
  // BANK SOAL LOGIC (TETAP 3 TIPE)
  // ==========================================

  const saveSoal = async (subtestId, questionsData) => { 
      await setDoc(doc(db, 'bank_soal', subtestId), { questions: questionsData }); 
      setBankSoal(prev => ({ ...prev, [subtestId]: questionsData })); 
  };
  
  const addOrUpdate = async () => {
    if (!questionText.trim()) { alert('Pertanyaan wajib diisi!'); return; }
    if (questionType !== 'isian' && options.some(o => !o.trim())) { alert('Semua opsi wajib diisi!'); return; }
    if (questionType === 'pilihan_majemuk' && (!Array.isArray(correctAnswer) || correctAnswer.length === 0)) { alert('Pilih minimal 1 kunci!'); return; }
    if (questionType === 'isian' && (!correctAnswer || correctAnswer.toString().trim() === '')) { alert('Isi kunci jawaban!'); return; }

    const newQuestion = { 
        id: editingId || Date.now().toString(), 
        type: questionType, 
        question: questionText, 
        image: questionImage, 
        options: questionType === 'isian' ? [] : options, 
        correct: correctAnswer 
    };

    const currentQuestions = bankSoal[selectedSubtest] || [];
    const updatedQuestions = editingId 
        ? currentQuestions.map(q => q.id === editingId ? newQuestion : q) 
        : [...currentQuestions, newQuestion];
    
    await saveSoal(selectedSubtest, updatedQuestions); 
    alert('Disimpan!'); 
    resetForm();
  };

  const deleteSoal = async (id) => { 
      if(confirm('Hapus soal ini?')) {
          const currentQuestions = bankSoal[selectedSubtest] || [];
          const filteredQuestions = currentQuestions.filter(x => x.id !== id);
          await saveSoal(selectedSubtest, filteredQuestions); 
      }
  };
  
  const resetForm = () => { 
      setQuestionText(''); setQuestionImage(''); setOptions(['', '', '', '', '']); setEditingId(null); handleTypeChange('pilihan_ganda'); 
  };

  const handleTypeChange = (type) => {
      setQuestionType(type);
      if (type === 'pilihan_ganda') setCorrectAnswer('A');
      else if (type === 'pilihan_majemuk') setCorrectAnswer([]); 
      else if (type === 'isian') setCorrectAnswer(''); 
  };

  const toggleMajemukAnswer = (opt) => {
      let current = Array.isArray(correctAnswer) ? [...correctAnswer] : [];
      if (current.includes(opt)) current = current.filter(x => x !== opt);
      else current.push(opt);
      setCorrectAnswer(current);
  };

  const loadSoalForEdit = (q) => {
      setQuestionText(q.question); 
      setQuestionImage(q.image || ''); 
      setQuestionType(q.type || 'pilihan_ganda'); 
      if (q.type === 'isian') { setOptions(['', '', '', '', '']); setCorrectAnswer(q.correct); } 
      else { setOptions([...q.options]); setCorrectAnswer(q.correct); }
      setEditingId(q.id); 
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- MODAL LEADERBOARD ---
  const LeaderboardModal = () => (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b flex justify-between items-center bg-indigo-600 rounded-t-2xl text-white">
                  <h2 className="text-xl font-bold flex items-center gap-2"><Trophy size={24} className="text-yellow-300"/> Leaderboard Peserta</h2>
                  <button onClick={()=>setShowLeaderboard(false)} className="hover:bg-indigo-700 p-2 rounded-full transition"><X size={20}/></button>
              </div>
              <div className="p-6 overflow-y-auto">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-indigo-50 text-indigo-800 font-bold uppercase text-xs">
                          <tr>
                              <th className="p-3 text-center">#</th>
                              <th className="p-3">Nama Siswa</th>
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
                                  <td className="p-3 font-mono text-indigo-600 font-bold">{t.tokenCode}</td>
                                  <td className="p-3 font-mono text-gray-600">{t.studentPhone}</td>
                                  <td className="p-3 text-center font-bold text-indigo-600 text-lg">{t.score}</td>
                                  <td className="p-3 text-center font-mono text-gray-500">
                                      {Math.floor(t.finalTimeLeft/60)}m {t.finalTimeLeft%60}s
                                  </td>
                              </tr>
                          ))}
                          {getLeaderboardData().length === 0 && (
                              <tr><td colSpan="6" className="p-8 text-center text-gray-400 italic">Belum ada data nilai peserta.</td></tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>
  );

  // ==========================================
  // RENDER UI
  // ==========================================

  if (screen === 'admin_login') {
      return (
          <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
              <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
                  <h2 className="text-2xl font-bold mb-6 text-center text-indigo-900">Admin Portal</h2>
                  <form onSubmit={handleLogin} className="space-y-4">
                      <input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} className="w-full p-3 border rounded-lg" placeholder="Email Admin"/>
                      <input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className="w-full p-3 border rounded-lg" placeholder="Password"/>
                      <button className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition">Masuk Dashboard</button>
                  </form>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {showLeaderboard && <LeaderboardModal />}
      
      <div className="sticky top-0 z-40 bg-white shadow-sm px-6 py-4 flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-indigo-900 flex items-center gap-2"><Settings size={20}/> Admin Panel</h1>
        <div className="flex gap-2">
          <button onClick={() => setViewMode('tokens')} className={`px-4 py-2 rounded-lg font-medium transition ${viewMode === 'tokens' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}>Token Manager</button>
          <button onClick={() => setViewMode('soal')} className={`px-4 py-2 rounded-lg font-medium transition ${viewMode === 'soal' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}>Bank Soal</button>
          <button onClick={handleLogout} className="text-red-600 px-3 hover:bg-red-50 rounded-lg transition"><LogOut size={20}/></button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 flex-1 w-full">
        {viewMode === 'tokens' ? (
          
          /* --- TOKEN MANAGER UI --- */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             
             {/* PANEL KIRI: BUAT TOKEN (3 OPSI) */}
             <div className="md:col-span-1">
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-24">
                 <h2 className="font-bold text-lg mb-6 flex items-center gap-2 text-gray-800"><Plus size={20} className="text-indigo-600"/> Buat Token Baru</h2>

                 {/* Metode Kirim (3 OPSI) */}
                 <div className="mb-6">
                    <p className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider flex items-center gap-1"><Zap size={12}/> Metode Kirim Default:</p>
                    <div className="flex flex-col gap-3">
                      {/* Opsi 1 */}
                      <label className={`cursor-pointer p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${autoSendMode === 'fonnte' ? 'border-green-500 bg-green-50 text-green-700 shadow-sm' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
                        <input type="radio" className="hidden" checked={autoSendMode === 'fonnte'} onChange={()=>setAutoSendMode('fonnte')} />
                        <div className="flex items-center gap-2"><Zap size={18}/> <span className="font-bold text-sm">1. UTAMA (Fonnte API)</span></div>
                      </label>
                      {/* Opsi 2 */}
                      <label className={`cursor-pointer p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${autoSendMode === 'backup' ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-sm' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
                        <input type="radio" className="hidden" checked={autoSendMode === 'backup'} onChange={()=>setAutoSendMode('backup')} />
                        <div className="flex items-center gap-2"><Server size={18}/> <span className="font-bold text-sm">2. CADANGAN (Backup)</span></div>
                      </label>
                      {/* Opsi 3 */}
                      <label className={`cursor-pointer p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${autoSendMode === 'manual' ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
                        <input type="radio" className="hidden" checked={autoSendMode === 'manual'} onChange={()=>setAutoSendMode('manual')} />
                        <div className="flex items-center gap-2"><ExternalLink size={18}/> <span className="font-bold text-sm">3. MANUAL (WA App)</span></div>
                      </label>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <input value={newTokenName} onChange={e=>setNewTokenName(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" placeholder="Nama Siswa"/>
                    <input value={newTokenPhone} onChange={e=>setNewTokenPhone(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" placeholder="No WhatsApp (08xxx)"/>
                    <button onClick={createToken} disabled={isSending} className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition-transform transform active:scale-95 flex justify-center items-center gap-2 ${isSending ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                      {isSending ? 'Mengirim...' : 'Generate & Kirim'} <Send size={16}/>
                    </button>
                 </div>
               </div>
             </div>

             {/* PANEL KANAN: STATISTIK & TABEL */}
             <div className="md:col-span-2 space-y-6">
                
                {/* 1. Dashboard Statistik Grid (Auto Filter) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button onClick={() => setFilterStatus('all')} className={`p-4 rounded-xl border text-center transition shadow-sm ${filterStatus === 'all' ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                      <p className="text-xs text-gray-500 uppercase font-bold mb-1">Total</p>
                      <p className="text-3xl font-bold text-gray-800">{tokenList.length}</p>
                    </button>
                    <button onClick={() => setFilterStatus('active')} className={`p-4 rounded-xl border text-center transition shadow-sm ${filterStatus === 'active' ? 'bg-green-50 border-green-500 ring-2 ring-green-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                      <p className="text-xs text-green-600 uppercase font-bold mb-1">Aktif</p>
                      <p className="text-3xl font-bold text-green-700">{activeTokens.length}</p>
                    </button>
                    <button onClick={() => setFilterStatus('used')} className={`p-4 rounded-xl border text-center transition shadow-sm ${filterStatus === 'used' ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                      <p className="text-xs text-blue-600 uppercase font-bold mb-1">Terpakai</p>
                      <p className="text-3xl font-bold text-blue-700">{usedTokens.length}</p>
                    </button>
                    <button onClick={() => setFilterStatus('expired')} className={`p-4 rounded-xl border text-center transition shadow-sm ${filterStatus === 'expired' ? 'bg-red-50 border-red-500 ring-2 ring-red-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                      <p className="text-xs text-red-600 uppercase font-bold mb-1">Expired</p>
                      <p className="text-3xl font-bold text-red-700">{expiredTokens.length}</p>
                    </button>
                </div>
                
                {/* 2. Container Tabel */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 min-h-[600px]">
                   <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                      <div>
                          <h2 className="text-xl font-bold text-gray-800">Daftar Token</h2>
                          <p className="text-sm text-gray-400">Kelola akses ujian siswa</p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={()=>setShowLeaderboard(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white font-bold bg-indigo-600 hover:bg-indigo-700 transition text-xs shadow-md shadow-indigo-200"><Trophy size={14}/> Lihat Leaderboard</button>
                        <button onClick={resetLeaderboard} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-orange-600 font-bold bg-orange-50 border border-orange-100 hover:bg-orange-100 transition text-xs"><RefreshCw size={14}/> Reset Score</button>
                        <button onClick={loadTokens} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-indigo-600 font-bold hover:bg-indigo-50 transition text-xs">Refresh</button>
                        <button onClick={deleteAllTokens} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-red-600 font-bold hover:bg-red-50 transition text-xs">Hapus Semua</button>
                      </div>
                   </div>

                   <div className="overflow-hidden rounded-xl border border-gray-100">
                      <table className="w-full text-sm text-left">
                         <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider font-bold">
                            <tr>
                                <th className="p-4">Kode</th>
                                <th className="p-4">Nama</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-center">Kirim Ulang</th>
                                <th className="p-4 text-center">Aksi</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-50">
                            {getFilteredList().length > 0 ? getFilteredList().map(t => (
                               <tr key={t.tokenCode} className="hover:bg-gray-50 transition">
                                  <td className="p-4 font-mono font-bold text-indigo-600">{t.tokenCode}</td>
                                  <td className="p-4">
                                      <div className="font-semibold text-gray-700">{t.studentName}</div>
                                      <div className="text-xs text-gray-400 font-mono mt-0.5">{t.studentPhone}</div>
                                  </td>
                                  <td className="p-4"><span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${t.status === 'active' ? 'bg-green-100 text-green-700' : t.status === 'used' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'}`}>{t.status}</span></td>
                                  
                                  {/* 3 Tombol Aksi Kirim */}
                                  <td className="p-4 flex gap-2 justify-center">
                                      <button onClick={() => sendFonnteMessage(t.studentName, t.studentPhone, t.tokenCode)} className="bg-green-50 text-green-700 p-2 rounded border border-green-200 hover:bg-green-100 transition" title="Auto (Fonnte)"><Zap size={16}/></button>
                                      <button onClick={() => sendBackupMessage(t.studentName, t.studentPhone, t.tokenCode)} className="bg-orange-50 text-orange-700 p-2 rounded border border-orange-200 hover:bg-orange-100 transition" title="Backup"><Server size={16}/></button>
                                      <button onClick={() => sendManualApp(t.studentName, t.studentPhone, t.tokenCode)} className="bg-blue-50 text-blue-700 p-2 rounded border border-blue-200 hover:bg-blue-100 transition" title="Manual"><ExternalLink size={16}/></button>
                                  </td>

                                  <td className="p-4 text-center">
                                    <button onClick={() => deleteToken(t.tokenCode)} className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"><Trash2 size={18}/></button>
                                  </td>
                               </tr>
                            )) : (
                                <tr><td colSpan="5" className="p-8 text-center text-gray-400 italic">Tidak ada data token ditemukan.</td></tr>
                            )}
                         </tbody>
                      </table>
                   </div>
                </div>
             </div>
          </div>
        ) : (
          
          /* --- UI BANK SOAL (TETAP SAMA 3 TIPE) --- */
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
             <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-gray-800">Editor Bank Soal</h2></div>
             <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-8">
               <select value={selectedSubtest} onChange={e => { setSelectedSubtest(e.target.value); resetForm(); }} className="w-full p-3 border rounded-lg mb-6 bg-white font-medium text-gray-700 shadow-sm focus:ring-2 focus:ring-indigo-200 outline-none">
                   {SUBTESTS.map(s => (<option key={s.id} value={s.id}>{s.name} ({bankSoal[s.id]?.length || 0} / {s.questions})</option>))}
               </select>
               <div className="mb-6"><label className="text-xs font-bold text-gray-500 uppercase mb-2 block tracking-wider">Format Soal:</label><div className="flex flex-wrap gap-2">
                    <label className={`cursor-pointer px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 border-2 transition ${questionType === 'pilihan_ganda' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}><input type="radio" name="qType" className="hidden" checked={questionType === 'pilihan_ganda'} onChange={() => handleTypeChange('pilihan_ganda')} /><List size={18}/> Pilihan Ganda</label>
                    <label className={`cursor-pointer px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 border-2 transition ${questionType === 'pilihan_majemuk' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}><input type="radio" name="qType" className="hidden" checked={questionType === 'pilihan_majemuk'} onChange={() => handleTypeChange('pilihan_majemuk')} /><CheckSquare size={18}/> Pilihan Majemuk</label>
                    <label className={`cursor-pointer px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 border-2 transition ${questionType === 'isian' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}><input type="radio" name="qType" className="hidden" checked={questionType === 'isian'} onChange={() => handleTypeChange('isian')} /><Type size={18}/> Isian Singkat</label>
               </div></div>
               <textarea value={questionText} onChange={e => setQuestionText(e.target.value)} className="w-full p-4 border rounded-lg mb-4 focus:ring-2 focus:ring-indigo-100 outline-none" rows="3" placeholder="Ketik Pertanyaan di sini (Support LaTeX dengan $...$)..." />
               <input value={questionImage} onChange={e => setQuestionImage(e.target.value)} className="w-full p-3 border rounded-lg mb-6 text-sm" placeholder="URL Gambar (Opsional)..." />
               {questionType !== 'isian' ? (<>
                     <div className="space-y-3 mb-6">{options.map((o, i) => (<div key={i} className="flex gap-3 items-center"><span className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-indigo-100 font-bold rounded-lg text-indigo-700">{['A','B','C','D','E'][i]}</span><input value={o} onChange={e => {const n=[...options];n[i]=e.target.value;setOptions(n)}} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none" placeholder={`Pilihan Jawaban ${['A','B','C','D','E'][i]}`} /></div>))}</div>
                     <div className="mb-4"><label className="text-xs font-bold text-gray-500 uppercase mb-2 block tracking-wider">Kunci Jawaban Benar ({questionType === 'pilihan_ganda' ? 'Pilih Satu' : 'Pilih Banyak'}):</label><div className="flex gap-3">{['A','B','C','D','E'].map(l => {const isSelected = questionType === 'pilihan_ganda' ? correctAnswer === l : correctAnswer.includes(l); return (<button key={l} onClick={() => { if (questionType === 'pilihan_ganda') setCorrectAnswer(l); else toggleMajemukAnswer(l); }} className={`flex-1 py-3 border-2 rounded-lg font-bold transition text-lg ${isSelected ? 'bg-green-500 text-white border-green-500 shadow-md' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'}`}>{l}</button>);})}</div></div></>) : (<div className="mb-6 bg-green-50 p-4 rounded-lg border border-green-200"><label className="text-xs font-bold text-green-700 uppercase mb-2 block tracking-wider flex items-center gap-1"><Key size={14}/> Kunci Jawaban (Teks/Angka):</label><input value={correctAnswer} onChange={e => setCorrectAnswer(e.target.value)} className="w-full p-4 border-2 border-green-400 rounded-lg bg-white font-bold text-xl text-gray-800 focus:outline-none focus:ring-4 focus:ring-green-100" placeholder="Contoh: 25 atau Jakarta" /><p className="text-xs text-green-600 mt-2 font-medium">*Sistem tidak membedakan huruf besar/kecil (case-insensitive).</p></div>)}
               <div className="flex gap-3 pt-4 border-t border-gray-200"><button onClick={addOrUpdate} className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 shadow-lg transition transform hover:-translate-y-0.5">{editingId ? 'Simpan Perubahan' : 'Tambah Soal Baru'}</button>{editingId && <button onClick={resetForm} className="px-6 border-2 border-gray-300 py-3 rounded-lg font-bold text-gray-500 hover:bg-gray-100">Batal Edit</button>}</div>
             </div>
             <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">{(bankSoal[selectedSubtest]||[]).map((q, i) => (<div key={q.id} className="p-4 border rounded-xl flex justify-between items-start bg-white hover:shadow-md transition group"><div className="flex-1 pr-4"><div className="flex items-center gap-2 mb-2"><span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded text-sm">#{i+1}</span><span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${q.type==='isian'?'bg-green-50 text-green-600 border-green-100':q.type==='pilihan_majemuk'?'bg-orange-50 text-orange-600 border-orange-100':'bg-gray-100 text-gray-500 border-gray-200'}`}>{q.type ? q.type.replace('_', ' ') : 'PILIHAN GANDA'}</span></div><p className="line-clamp-2 text-gray-700 text-sm font-medium">{q.question}</p><div className="mt-2 text-xs text-gray-400">Kunci: <span className="font-bold text-gray-600">{Array.isArray(q.correct) ? q.correct.join(', ') : q.correct}</span></div></div><div className="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition"><button onClick={() => loadSoalForEdit(q)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded"><Edit size={18}/></button><button onClick={() => deleteSoal(q.id)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={18}/></button></div></div>))}{(bankSoal[selectedSubtest]||[]).length === 0 && <p className="text-center text-gray-400 py-10 italic border-2 border-dashed rounded-xl">Belum ada soal di subtest ini.</p>}</div>
          </div>
        )}
      </div>

      <div className="py-6 bg-white border-t border-gray-200 w-full text-center mt-auto">
          <p className="text-gray-400 text-xs font-mono flex items-center justify-center gap-1">
              <Copyright size={12} /> {new Date().getFullYear()} Created by <span className="font-bold text-indigo-500">Liezira</span>
          </p>
      </div>
    </div>
  );
};

export default UTBKAdminApp;