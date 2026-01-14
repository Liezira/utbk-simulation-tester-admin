import React, { useState, useEffect } from 'react';
import { Edit, Plus, Trash2, LogOut, Key, BarChart3, Filter, Copyright, MessageCircle, Send, ExternalLink, Zap, Settings, Radio, Smartphone, CheckCircle2, XCircle, RefreshCw, List, CheckSquare, Type } from 'lucide-react';
import { db, auth } from './firebase';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, deleteDoc, deleteField } from 'firebase/firestore'; 
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';

// Konfigurasi Subtest (Sesuai UTBK Asli)
const SUBTESTS = [
  { id: 'pu', name: 'Penalaran Umum', questions: 30 },
  { id: 'ppu', name: 'Pengetahuan & Pemahaman Umum', questions: 20 },
  { id: 'pbm', name: 'Pemahaman Bacaan & Menulis', questions: 20 },
  { id: 'pk', name: 'Pengetahuan Kuantitatif', questions: 15 },
  { id: 'lbi', name: 'Literasi Bahasa Indonesia', questions: 30 },
  { id: 'lbe', name: 'Literasi Bahasa Inggris', questions: 20 },
  { id: 'pm', name: 'Penalaran Matematika', questions: 20 },
];

// Konfigurasi Link & Token Fonnte (Opsional)
const STUDENT_APP_URL = "https://utbk-simulation-tester-student.vercel.app"; 
const FONNTE_TOKEN = import.meta.env.VITE_FONNTE_TOKEN; 
const SEND_DELAY = 3; 

const UTBKAdminApp = () => {
  // --- STATE MANAGEMENT ---
  const [screen, setScreen] = useState('admin_login'); 
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [viewMode, setViewMode] = useState('tokens'); // 'tokens' or 'soal'
  
  // Data State
  const [tokenList, setTokenList] = useState([]);
  const [bankSoal, setBankSoal] = useState({});
  const [filterStatus, setFilterStatus] = useState('all');
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenPhone, setNewTokenPhone] = useState('');
  const [autoSendMode, setAutoSendMode] = useState('fonnte'); 

  // --- STATE EDITOR SOAL (BARU) ---
  const [selectedSubtest, setSelectedSubtest] = useState('pu');
  const [questionType, setQuestionType] = useState('pilihan_ganda'); // 'pilihan_ganda' | 'pilihan_majemuk' | 'isian'
  const [questionText, setQuestionText] = useState('');
  const [questionImage, setQuestionImage] = useState('');
  const [options, setOptions] = useState(['', '', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState('A'); // Bisa 'A' (string) atau ['A','B'] (array) atau 'Jawabannya' (string)
  const [editingId, setEditingId] = useState(null);
  const [isSending, setIsSending] = useState(false); 

  // Load Bank Soal saat Login Sukses
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
    if (screen === 'dashboard') {
        loadBankSoal();
    }
  }, [screen]);

  // --- AUTH FUNCTIONS ---
  const handleLogin = async (e) => { 
      e.preventDefault(); 
      try { 
          await signInWithEmailAndPassword(auth, adminEmail, adminPassword); 
          setScreen('dashboard'); 
          loadTokens(); 
      } catch (error) { alert('Login Gagal. Cek email/password.'); } 
  };
  
  const handleLogout = async () => { 
      await signOut(auth); 
      setScreen('admin_login'); 
  };

  // --- TOKEN MANAGEMENT FUNCTIONS ---
  const loadTokens = async () => { 
      const s = await getDocs(collection(db, 'tokens')); 
      const t = []; 
      s.forEach((d) => t.push(d.data())); 
      t.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); 
      setTokenList(t); 
  };

  const createToken = async () => {
    if (!newTokenName || !newTokenPhone) { alert('Isi Nama & No WA!'); return; }
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
        
        if(confirm(`Token Dibuat: ${tokenCode}\nKirim sekarang?`)) {
            if (autoSendMode === 'fonnte') await sendFonnteMessage(newTokenName, newTokenPhone, tokenCode);
            else if (autoSendMode === 'manual_web') await sendManualWeb(newTokenName, newTokenPhone, tokenCode);
        } else { 
            loadTokens(); 
        }
        setNewTokenName(''); 
        setNewTokenPhone(''); 
    } catch (error) { alert('Gagal membuat token.'); }
  };

  const deleteToken = async (code) => { 
      if(confirm('Yakin hapus token ini?')) { 
          await deleteDoc(doc(db, 'tokens', code)); 
          loadTokens(); 
      }
  };

  const deleteAllTokens = async () => { 
      if (!confirm("⚠️ BAHAYA: Hapus SEMUA token? Data tidak bisa kembali!")) return; 
      await Promise.all(tokenList.map(t => deleteDoc(doc(db, "tokens", t.tokenCode)))); 
      loadTokens(); 
  };

  const resetLeaderboard = async () => {
    if (!confirm("⚠️ Reset Score siswa? Token tetap aktif, tapi nilai jadi 0.")) return;
    try {
        const querySnapshot = await getDocs(collection(db, 'tokens'));
        const updates = [];
        querySnapshot.forEach((docSnap) => {
             if (docSnap.data().score !== undefined) {
                 updates.push(updateDoc(docSnap.ref, { 
                     score: deleteField(), 
                     finalTimeLeft: deleteField(), 
                     finishedAt: deleteField() 
                 }));
             }
        });
        await Promise.all(updates); 
        alert("✅ Leaderboard Berhasil Direset!"); 
        loadTokens();
    } catch (error) { console.error(error); alert("Gagal reset leaderboard."); }
  };

  // --- WHATSAPP SENDING ---
  const markAsSent = async (tokenCode, method) => { 
      try { 
          const tokenRef = doc(db, 'tokens', tokenCode); 
          await updateDoc(tokenRef, { isSent: true, sentMethod: method, sentAt: new Date().toISOString() }); 
          loadTokens(); 
      } catch (error) { console.error(error); } 
  };
  
  const sendFonnteMessage = async (name, phone, token) => {
    if (!FONNTE_TOKEN) { alert("Token Fonnte belum dipasang di .env!"); return; }
    setIsSending(true);
    let formattedPhone = phone.toString().replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.slice(1);
    
    const message = `Halo *${name}*,\n\nBerikut akses ujian simulasi kamu:\n🔑 Token: *${token}*\n🔗 Link: ${STUDENT_APP_URL}\n\nSelamat mengerjakan dan semoga sukses!`;
    
    try {
        const params = new URLSearchParams({ token: FONNTE_TOKEN, target: formattedPhone, message: message, delay: SEND_DELAY, countryCode: '62' });
        await fetch(`https://api.fonnte.com/send?${params.toString()}`, { method: 'GET', mode: 'no-cors' });
        await markAsSent(token, 'Fonnte (Auto)'); 
        alert(`✅ Pesan terkirim ke ${name}`);
    } catch (error) { alert("❌ Gagal mengirim via Fonnte."); } 
    finally { setIsSending(false); }
  };

  const sendManualWeb = async (name, phone, token) => { 
      let p = phone.replace(/\D/g, ''); 
      if (p.startsWith('0')) p = '62' + p.slice(1); 
      window.open(`https://wa.me/${p}?text=${encodeURIComponent(`Halo *${name}*, Token: *${token}*, Link: ${STUDENT_APP_URL}`)}`, '_blank'); 
      await markAsSent(token, 'WA Web'); 
  };

  const isExpired = (c) => (Date.now() - new Date(c).getTime()) > 24 * 60 * 60 * 1000;
  
  const getFilteredList = () => { 
      switch (filterStatus) { 
          case 'active': return tokenList.filter(t => t.status==='active' && !isExpired(t.createdAt)); 
          case 'used': return tokenList.filter(t => t.status==='used'); 
          case 'expired': return tokenList.filter(t => isExpired(t.createdAt)); 
          default: return tokenList; 
      } 
  };

  // ==========================================
  // --- LOGIC BANK SOAL (FITUR BARU) ---
  // ==========================================

  // Simpan ke Firebase
  const saveSoal = async (sid, q) => { 
      await setDoc(doc(db, 'bank_soal', sid), { questions: q }); 
      setBankSoal(p => ({ ...p, [sid]: q })); 
  };
  
  // Fungsi Tambah / Update Soal
  const addOrUpdate = async () => {
    // Validasi Dasar
    if (!questionText.trim()) { alert('Pertanyaan wajib diisi!'); return; }
    
    // Validasi Opsi (Kecuali Isian)
    if (questionType !== 'isian' && options.some(o => !o.trim())) { 
        alert('Semua opsi A-E wajib diisi!'); return; 
    }
    
    // Validasi Kunci Jawaban
    if (questionType === 'pilihan_majemuk' && (!Array.isArray(correctAnswer) || correctAnswer.length === 0)) {
        alert('Pilih minimal 1 kunci jawaban benar!'); return;
    }
    if (questionType === 'isian' && (!correctAnswer || correctAnswer.toString().trim() === '')) {
        alert('Isi kunci jawaban yang benar!'); return;
    }

    const q = { 
        id: editingId || Date.now().toString(), 
        type: questionType, // Menyimpan tipe soal
        question: questionText, 
        image: questionImage, 
        options: questionType === 'isian' ? [] : options, // Isian tidak punya opsi
        correct: correctAnswer 
    };

    const cur = bankSoal[selectedSubtest] || [];
    const upd = editingId ? cur.map(x => x.id === editingId ? q : x) : [...cur, q];
    
    await saveSoal(selectedSubtest, upd); 
    alert('Soal Berhasil Disimpan!'); 
    resetForm();
  };

  const deleteSoal = async (id) => { 
      if(confirm('Yakin hapus soal ini?')) {
          await saveSoal(selectedSubtest, (bankSoal[selectedSubtest]||[]).filter(x => x.id !== id)); 
      }
  };
  
  const resetForm = () => { 
      setQuestionText(''); 
      setQuestionImage(''); 
      setOptions(['','','','','']); 
      setEditingId(null); 
      // Reset ke default
      handleTypeChange('pilihan_ganda');
  };

  // Handle Perubahan Tipe Soal & Reset Kunci Jawaban
  const handleTypeChange = (type) => {
      setQuestionType(type);
      if (type === 'pilihan_ganda') setCorrectAnswer('A');
      else if (type === 'pilihan_majemuk') setCorrectAnswer([]); // Array kosong
      else if (type === 'isian') setCorrectAnswer(''); // String kosong
  };

  // Logic Toggle Jawaban Majemuk (Checkbox Style)
  const toggleMajemukAnswer = (opt) => {
      let current = Array.isArray(correctAnswer) ? [...correctAnswer] : [];
      if (current.includes(opt)) current = current.filter(x => x !== opt);
      else current.push(opt);
      setCorrectAnswer(current);
  };

  // Load Data Soal ke Form Editor
  const loadSoalForEdit = (q) => {
      setQuestionText(q.question); 
      setQuestionImage(q.image||''); 
      setQuestionType(q.type || 'pilihan_ganda'); // Default backward compatibility
      
      if (q.type === 'isian') {
          setOptions(['','','','','']);
          setCorrectAnswer(q.correct);
      } else {
          setOptions([...q.options]); 
          setCorrectAnswer(q.correct);
      }
      setEditingId(q.id); 
      window.scrollTo({top:0, behavior:'smooth'});
  };

  // --- RENDER LOGIN ---
  if (screen === 'admin_login') {
      return (
          <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
              <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
                  <h2 className="text-2xl font-bold mb-6 text-center text-indigo-900">Admin Portal</h2>
                  <form onSubmit={handleLogin} className="space-y-4">
                      <input type="email" value={adminEmail} onChange={e=>setAdminEmail(e.target.value)} className="w-full p-3 border rounded-lg focus:ring focus:ring-indigo-200" placeholder="Email Admin"/>
                      <input type="password" value={adminPassword} onChange={e=>setAdminPassword(e.target.value)} className="w-full p-3 border rounded-lg focus:ring focus:ring-indigo-200" placeholder="Password"/>
                      <button className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition">Masuk</button>
                  </form>
              </div>
          </div>
      );
  }

  // --- RENDER DASHBOARD ---
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* NAVBAR */}
      <div className="sticky top-0 z-40 bg-white shadow-sm px-6 py-4 flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-indigo-900 flex items-center gap-2"><Settings size={20}/> Admin Panel</h1>
        <div className="flex gap-2">
          <button onClick={() => setViewMode('tokens')} className={`px-4 py-2 rounded-lg font-medium transition ${viewMode==='tokens'?'bg-indigo-100 text-indigo-700':'text-gray-600 hover:bg-gray-100'}`}>Token Manager</button>
          <button onClick={() => setViewMode('soal')} className={`px-4 py-2 rounded-lg font-medium transition ${viewMode==='soal'?'bg-indigo-100 text-indigo-700':'text-gray-600 hover:bg-gray-100'}`}>Bank Soal</button>
          <button onClick={handleLogout} className="text-red-600 px-3 hover:bg-red-50 rounded-lg"><LogOut size={20}/></button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 flex-1 w-full">
        {viewMode === 'tokens' ? (
          /* --- TAB TOKEN MANAGER --- */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {/* Form Buat Token */}
             <div className="bg-white p-6 rounded-xl shadow-sm h-fit border border-gray-100">
                <h2 className="font-bold mb-4 flex items-center gap-2 text-gray-800"><Plus size={18}/> Buat Token Baru</h2>
                
                {/* Opsi Kirim */}
                <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <p className="text-xs font-bold text-gray-500 mb-2 uppercase flex items-center gap-1"><Zap size={12}/> Metode Kirim:</p>
                    <div className="flex flex-col gap-2">
                        <label className={`cursor-pointer p-2 rounded text-xs font-bold flex items-center gap-2 border ${autoSendMode === 'fonnte' ? 'bg-green-100 border-green-400 text-green-700' : 'bg-white border-gray-300'}`}>
                            <input type="radio" name="sendMode" value="fonnte" checked={autoSendMode === 'fonnte'} onChange={() => setAutoSendMode('fonnte')} className="hidden" />
                            <Smartphone size={14}/> Auto WhatsApp (Fonnte API)
                        </label>
                        <label className={`cursor-pointer p-2 rounded text-xs font-bold flex items-center gap-2 border ${autoSendMode === 'manual_web' ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-white border-gray-300'}`}>
                            <input type="radio" name="sendMode" value="manual_web" checked={autoSendMode === 'manual_web'} onChange={() => setAutoSendMode('manual_web')} className="hidden" />
                            <ExternalLink size={14}/> Manual (WhatsApp Web)
                        </label>
                    </div>
                </div>

                <div className="space-y-3">
                    <input value={newTokenName} onChange={e=>setNewTokenName(e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-100" placeholder="Nama Siswa"/>
                    <input value={newTokenPhone} onChange={e=>setNewTokenPhone(e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-100" placeholder="No WhatsApp (08xxx)"/>
                    <button onClick={createToken} disabled={isSending} className={`w-full py-2 rounded text-white font-bold transition ${isSending ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                        {isSending ? 'Mengirim...' : 'Generate & Kirim'}
                    </button>
                </div>
             </div>

             {/* List Token */}
             <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-bold text-lg text-gray-800">Daftar Token</h2>
                    <div className="flex gap-2">
                        <button onClick={resetLeaderboard} className="text-orange-600 text-xs border border-orange-200 px-3 py-1.5 rounded-lg bg-orange-50 font-bold hover:bg-orange-100 flex items-center gap-1"><RefreshCw size={12}/> Reset Score</button>
                        <button onClick={loadTokens} className="text-indigo-600 text-xs font-bold hover:bg-indigo-50 px-3 py-1.5 rounded-lg">Refresh</button>
                        <button onClick={deleteAllTokens} className="text-red-600 text-xs font-bold hover:bg-red-50 px-3 py-1.5 rounded-lg">Hapus Semua</button>
                    </div>
                </div>
                
                {/* Filter */}
                <div className="flex gap-2 mb-4">
                    {['all', 'active', 'used', 'expired'].map(status => (
                        <button key={status} onClick={() => setFilterStatus(status)} className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${filterStatus === status ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                            {status}
                        </button>
                    ))}
                </div>

                <div className="overflow-auto max-h-[500px]">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr><th className="p-3 rounded-tl-lg">Kode</th><th className="p-3">Nama</th><th className="p-3">Status</th><th className="p-3">Score</th><th className="p-3 text-center rounded-tr-lg">Aksi</th></tr>
                        </thead>
                        <tbody className="divide-y">
                            {getFilteredList().map(t=>(
                                <tr key={t.tokenCode} className="hover:bg-gray-50">
                                    <td className="p-3 font-mono font-bold text-indigo-600">{t.tokenCode}</td>
                                    <td className="p-3 font-medium">{t.studentName}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${t.status==='active'?'bg-green-100 text-green-700': t.status==='used'?'bg-blue-100 text-blue-700':'bg-gray-200 text-gray-600'}`}>
                                            {t.status}
                                        </span>
                                    </td>
                                    <td className="p-3 font-bold text-gray-600">{t.score !== undefined ? t.score : '-'}</td>
                                    <td className="p-3 text-center"><button onClick={()=>deleteToken(t.tokenCode)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {getFilteredList().length === 0 && <p className="text-center text-gray-400 py-8 italic">Tidak ada data token.</p>}
                </div>
             </div>
          </div>
        ) : (
          /* --- TAB BANK SOAL (EDITOR) --- */
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
             <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-bold text-gray-800">Editor Bank Soal</h2>
             </div>
             
             {/* FORM INPUT SOAL */}
             <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-8">
               
               {/* Pilih Subtest */}
               <select value={selectedSubtest} onChange={e => { setSelectedSubtest(e.target.value); resetForm(); }} className="w-full p-3 border rounded-lg mb-6 bg-white font-medium text-gray-700 shadow-sm focus:ring-2 focus:ring-indigo-200 outline-none">
                   {SUBTESTS.map(s => <option key={s.id} value={s.id}>{s.name} ({bankSoal[s.id]?.length || 0} / {s.questions})</option>)}
               </select>
               
               {/* TOGGLE TIPE SOAL (FITUR BARU YANG KAMU CARI) */}
               <div className="mb-6">
                 <label className="text-xs font-bold text-gray-500 uppercase mb-2 block tracking-wider">Format Soal:</label>
                 <div className="flex flex-wrap gap-2">
                    <label className={`cursor-pointer px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 border-2 transition ${questionType === 'pilihan_ganda' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}>
                        <input type="radio" name="qType" className="hidden" checked={questionType === 'pilihan_ganda'} onChange={() => handleTypeChange('pilihan_ganda')} />
                        <List size={18}/> Pilihan Ganda
                    </label>
                    <label className={`cursor-pointer px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 border-2 transition ${questionType === 'pilihan_majemuk' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}>
                        <input type="radio" name="qType" className="hidden" checked={questionType === 'pilihan_majemuk'} onChange={() => handleTypeChange('pilihan_majemuk')} />
                        <CheckSquare size={18}/> Pilihan Majemuk
                    </label>
                    <label className={`cursor-pointer px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 border-2 transition ${questionType === 'isian' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}>
                        <input type="radio" name="qType" className="hidden" checked={questionType === 'isian'} onChange={() => handleTypeChange('isian')} />
                        <Type size={18}/> Isian Singkat
                    </label>
                 </div>
               </div>

               {/* Input Pertanyaan */}
               <textarea value={questionText} onChange={e => setQuestionText(e.target.value)} className="w-full p-4 border rounded-lg mb-4 focus:ring-2 focus:ring-indigo-100 outline-none" rows="3" placeholder="Ketik Pertanyaan di sini (Support LaTeX dengan $...$)..." />
               <input value={questionImage} onChange={e => setQuestionImage(e.target.value)} className="w-full p-3 border rounded-lg mb-6 text-sm" placeholder="URL Gambar (Opsional)..." />
               
               {/* LOGIKA INPUT OPSI & KUNCI JAWABAN */}
               {questionType !== 'isian' ? (
                   <>
                     <div className="space-y-3 mb-6">
                        {options.map((o, i) => (
                            <div key={i} className="flex gap-3 items-center">
                                <span className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-indigo-100 font-bold rounded-lg text-indigo-700">{['A','B','C','D','E'][i]}</span>
                                <input value={o} onChange={e => {const n=[...options];n[i]=e.target.value;setOptions(n)}} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none" placeholder={`Pilihan Jawaban ${['A','B','C','D','E'][i]}`} />
                            </div>
                        ))}
                     </div>
                     
                     <div className="mb-4">
                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block tracking-wider">Kunci Jawaban Benar ({questionType === 'pilihan_ganda' ? 'Pilih Satu' : 'Pilih Banyak'}):</label>
                        <div className="flex gap-3">
                            {['A','B','C','D','E'].map(l => {
                                const isSelected = questionType === 'pilihan_ganda' ? correctAnswer === l : correctAnswer.includes(l);
                                return (
                                    <button key={l} 
                                        onClick={() => {
                                            if (questionType === 'pilihan_ganda') setCorrectAnswer(l);
                                            else toggleMajemukAnswer(l);
                                        }} 
                                        className={`flex-1 py-3 border-2 rounded-lg font-bold transition text-lg ${isSelected ? 'bg-green-500 text-white border-green-500 shadow-md' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'}`}
                                    >
                                        {l}
                                    </button>
                                );
                            })}
                        </div>
                     </div>
                   </>
               ) : (
                   /* INPUT KHUSUS TIPE ISIAN */
                   <div className="mb-6 bg-green-50 p-4 rounded-lg border border-green-200">
                       <label className="text-xs font-bold text-green-700 uppercase mb-2 block tracking-wider flex items-center gap-1"><Key size={14}/> Kunci Jawaban (Teks/Angka):</label>
                       <input value={correctAnswer} onChange={e => setCorrectAnswer(e.target.value)} className="w-full p-4 border-2 border-green-400 rounded-lg bg-white font-bold text-xl text-gray-800 focus:outline-none focus:ring-4 focus:ring-green-100" placeholder="Contoh: 25 atau Jakarta" />
                       <p className="text-xs text-green-600 mt-2 font-medium">*Sistem tidak membedakan huruf besar/kecil (case-insensitive).</p>
                   </div>
               )}

               <div className="flex gap-3 pt-4 border-t border-gray-200">
                   <button onClick={addOrUpdate} className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 shadow-lg transition transform hover:-translate-y-0.5">
                       {editingId ? 'Simpan Perubahan' : 'Tambah Soal Baru'}
                   </button>
                   {editingId && <button onClick={resetForm} className="px-6 border-2 border-gray-300 py-3 rounded-lg font-bold text-gray-500 hover:bg-gray-100">Batal Edit</button>}
               </div>
             </div>

             {/* PREVIEW LIST SOAL */}
             <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                 {(bankSoal[selectedSubtest]||[]).map((q, i) => (
                     <div key={q.id} className="p-4 border rounded-xl flex justify-between items-start bg-white hover:shadow-md transition group">
                        <div className="flex-1 pr-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded text-sm">#{i+1}</span>
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${q.type==='isian'?'bg-green-50 text-green-600 border-green-100':q.type==='pilihan_majemuk'?'bg-orange-50 text-orange-600 border-orange-100':'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                    {q.type ? q.type.replace('_', ' ') : 'PILIHAN GANDA'}
                                </span>
                            </div>
                            <p className="line-clamp-2 text-gray-700 text-sm font-medium">{q.question}</p>
                            <div className="mt-2 text-xs text-gray-400">
                                Kunci: <span className="font-bold text-gray-600">{Array.isArray(q.correct) ? q.correct.join(', ') : q.correct}</span>
                            </div>
                        </div>
                        <div className="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition">
                            <button onClick={() => loadSoalForEdit(q)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded"><Edit size={18}/></button>
                            <button onClick={() => deleteSoal(q.id)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={18}/></button>
                        </div>
                     </div>
                 ))}
                 {(bankSoal[selectedSubtest]||[]).length === 0 && <p className="text-center text-gray-400 py-10 italic border-2 border-dashed rounded-xl">Belum ada soal di subtest ini.</p>}
             </div>
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