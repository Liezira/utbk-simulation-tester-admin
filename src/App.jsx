import React, { useState, useEffect } from 'react';
import { Edit, Plus, Trash2, LogOut, Key, BarChart3, Filter, Copyright, MessageCircle, Send, ExternalLink, Zap, Settings, Radio, Smartphone, CheckCircle2, XCircle, School, RefreshCcw, Trophy, X } from 'lucide-react';
import { db, auth } from './firebase';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';

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
  const [screen, setScreen] = useState('admin_login'); 
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [viewMode, setViewMode] = useState('tokens');
  
  const [tokenList, setTokenList] = useState([]);
  const [bankSoal, setBankSoal] = useState({});
  const [filterStatus, setFilterStatus] = useState('all');
  
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenSchool, setNewTokenSchool] = useState(''); // NEW: Input Sekolah
  const [newTokenPhone, setNewTokenPhone] = useState('');
  
  const [autoSendMode, setAutoSendMode] = useState('fonnte'); 

  // Leaderboard Modal State
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const [selectedSubtest, setSelectedSubtest] = useState('pu');
  const [questionText, setQuestionText] = useState('');
  const [questionImage, setQuestionImage] = useState('');
  const [options, setOptions] = useState(['', '', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState('A');
  const [editingId, setEditingId] = useState(null);
  const [isSending, setIsSending] = useState(false); 

  // --- LOAD DATA REALTIME ---
  useEffect(() => {
    const q = query(collection(db, 'tokens'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const t = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTokenList(t);
    });
    return () => unsubscribe();
  }, []);

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

  const handleLogin = async (e) => { e.preventDefault(); try { await signInWithEmailAndPassword(auth, adminEmail, adminPassword); setScreen('dashboard'); } catch (error) { alert('Login Gagal.'); } };
  const handleLogout = async () => { await signOut(auth); setScreen('admin_login'); };

  // --- HELPER STATUS ---
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

  const markAsSent = async (tokenCode, method) => {
    try {
        const tokenRef = doc(db, 'tokens', tokenCode);
        await updateDoc(tokenRef, { isSent: true, sentMethod: method, sentAt: new Date().toISOString() });
    } catch (error) { console.error("Gagal update status:", error); }
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
    if (!newTokenName || !newTokenPhone || !newTokenSchool) { alert('Isi Nama, Sekolah & HP!'); return; } // Validasi Sekolah
    const tokenCode = `UTBK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    try { 
        await setDoc(doc(db, 'tokens', tokenCode), { 
            tokenCode, studentName: newTokenName, studentSchool: newTokenSchool, studentPhone: newTokenPhone, status: 'active', createdAt: new Date().toISOString(), isSent: false, sentMethod: '-', score: null 
        });
        
        if(confirm(`Token Berhasil: ${tokenCode}\n\nKirim via Jalur Default?`)) {
            if (autoSendMode === 'fonnte') await sendFonnteMessage(newTokenName, newTokenPhone, tokenCode);
            else if (autoSendMode === 'js_app') await sendJsDirect(newTokenName, newTokenPhone, tokenCode);
            else await sendManualWeb(newTokenName, newTokenPhone, tokenCode);
        }
        setNewTokenName(''); setNewTokenPhone(''); setNewTokenSchool('');
    } catch (error) { alert('Gagal generate token.'); }
  };

  const deleteToken = async (code) => { if(confirm('Hapus token ini?')) { await deleteDoc(doc(db, 'tokens', code)); }};
  const deleteAllTokens = async () => { if (!confirm("⚠️ PERINGATAN: Hapus SEMUA data?")) return; try { await Promise.all(tokenList.map(t => deleteDoc(doc(db, "tokens", t.tokenCode)))); alert("Semua terhapus."); } catch (error) { alert("Gagal."); } };
  
  // --- RESET SEMUA SCORE (LEADERBOARD) ---
  const resetLeaderboard = async () => {
      if(!confirm("⚠️ Yakin ingin MERESET SEMUA SKOR di Leaderboard?\nStatus siswa akan kembali menjadi ACTIVE.")) return;
      try {
          const used = tokenList.filter(t => t.score !== null);
          await Promise.all(used.map(t => updateDoc(doc(db, 'tokens', t.tokenCode), {
              score: null, status: 'active', answers: {}, finishedAt: null
          })));
          alert("Leaderboard berhasil di-reset!");
      } catch (e) { alert("Gagal reset."); }
  };

  const saveSoal = async (sid, q) => { await setDoc(doc(db, 'bank_soal', sid), { questions: q }); setBankSoal(p => ({ ...p, [sid]: q })); };
  const addOrUpdate = async () => {
    if (!questionText.trim() || options.some(o => !o.trim())) { alert('Lengkapi!'); return; }
    const q = { id: editingId || Date.now().toString(), question: questionText, image: questionImage, options, correct: correctAnswer };
    const cur = bankSoal[selectedSubtest] || [];
    const upd = editingId ? cur.map(x => x.id === editingId ? q : x) : [...cur, q];
    await saveSoal(selectedSubtest, upd); alert('Disimpan!'); resetForm();
  };
  const deleteSoal = async (id) => { if(confirm('Hapus?')) await saveSoal(selectedSubtest, (bankSoal[selectedSubtest]||[]).filter(x => x.id !== id)); };
  const resetForm = () => { setQuestionText(''); setQuestionImage(''); setOptions(['','','','','']); setCorrectAnswer('A'); setEditingId(null); };
  const generateDummy = async () => { if (!confirm('Isi Dummy?')) return; const n = { ...bankSoal }; for (const s of SUBTESTS) { const cur = bankSoal[s.id] || []; const need = s.questions - cur.length; if (need > 0) { const d = []; for (let i = 0; i < need; i++) d.push({ id: `d_${s.id}_${i}`, question: `Dummy ${s.name} ${i+1}`, image: '', options: ['A','B','C','D','E'], correct: 'A' }); const fin = [...cur, ...d]; await setDoc(doc(db, 'bank_soal', s.id), { questions: fin }); n[s.id] = fin; } } setBankSoal(n); alert('Dummy Done!'); };

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
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* HEADER */}
      <div className="sticky top-0 z-40 bg-white shadow px-6 py-4 flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-indigo-900">Admin Panel</h1>
        <div className="flex gap-2">
          <button onClick={() => setViewMode('tokens')} className={`px-4 py-2 rounded ${viewMode==='tokens'?'bg-indigo-100 text-indigo-700':'text-gray-600'}`}>Token</button>
          <button onClick={() => setViewMode('soal')} className={`px-4 py-2 rounded ${viewMode==='soal'?'bg-indigo-100 text-indigo-700':'text-gray-600'}`}>Bank Soal</button>
          <button onClick={() => setShowLeaderboard(true)} className="px-4 py-2 rounded bg-yellow-100 text-yellow-700 font-bold flex items-center gap-2"><Trophy size={16}/> Leaderboard</button>
          <button onClick={handleLogout} className="text-red-600 px-3"><LogOut size={18}/></button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 flex-1 w-full">
        {viewMode === 'tokens' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* --- KIRI: FORM BUAT TOKEN --- */}
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
                <input value={newTokenSchool} onChange={e=>setNewTokenSchool(e.target.value)} className="w-full p-2 border rounded" placeholder="Asal Sekolah"/> {/* INPUT SEKOLAH */}
                <input value={newTokenPhone} onChange={e=>setNewTokenPhone(e.target.value)} className="w-full p-2 border rounded" placeholder="No WhatsApp (08xxx)"/>
                <button onClick={createToken} disabled={isSending} className={`w-full py-2 rounded transition text-white font-bold flex items-center justify-center gap-2 ${isSending ? 'bg-gray-400' : autoSendMode === 'fonnte' ? 'bg-green-600 hover:bg-green-700' : autoSendMode === 'js_app' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                    {isSending ? 'Mengirim...' : 'Generate & Kirim'}
                </button>
              </div>
            </div>

            {/* --- KANAN: STATISTIK & TABEL --- */}
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
                <div className="flex justify-between items-center mb-4"><h2 className="font-bold text-lg">List Token</h2><div className="flex gap-2"><button onClick={() => location.reload()} className="text-indigo-600 text-sm">Refresh</button>{tokenList.length>0&&<button onClick={deleteAllTokens} className="text-red-600 text-sm font-bold ml-2">Hapus Semua</button>}</div></div>
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 sticky top-0">
                        <tr>
                            <th className="p-2">Kode</th>
                            <th className="p-2">Nama & Sekolah</th>
                            <th className="p-2">Status</th>
                            <th className="p-2">Kirim Ulang</th> 
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
                        
                        <td className="p-2 flex gap-1">
                            <button onClick={() => sendFonnteMessage(t.studentName, t.studentPhone, t.tokenCode)} className="bg-green-50 text-green-700 p-1.5 rounded hover:bg-green-100"><Zap size={14}/></button>
                            <button onClick={() => sendManualWeb(t.studentName, t.studentPhone, t.tokenCode)} className="bg-blue-50 text-blue-700 p-1.5 rounded hover:bg-blue-100"><ExternalLink size={14}/></button>
                            <button onClick={() => sendJsDirect(t.studentName, t.studentPhone, t.tokenCode)} className="bg-purple-50 text-purple-700 p-1.5 rounded hover:bg-purple-100"><Smartphone size={14}/></button>
                        </td>

                        <td className="p-2 text-center">
                            <button onClick={()=>deleteToken(t.tokenCode)} className="text-red-500 hover:text-red-700 bg-red-50 p-2 rounded border border-red-200"><Trash2 size={16}/></button>
                        </td>
                    </tr>)})}</tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow">
             <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold">Editor Soal</h2><button onClick={generateDummy} className="text-sm bg-green-100 text-green-700 px-4 py-2 rounded hover:bg-green-200">+ Auto Fill</button></div>
             <div className="bg-gray-50 p-6 rounded-xl border mb-8">
               <select value={selectedSubtest} onChange={e => { setSelectedSubtest(e.target.value); resetForm(); }} className="w-full p-3 border rounded mb-4 bg-white font-medium">{SUBTESTS.map(s => <option key={s.id} value={s.id}>{s.name} ({bankSoal[s.id]?.length || 0} / {s.questions})</option>)}</select>
               <textarea value={questionText} onChange={e => setQuestionText(e.target.value)} className="w-full p-3 border rounded mb-4" rows="3" placeholder="Pertanyaan..." /><input value={questionImage} onChange={e => setQuestionImage(e.target.value)} className="w-full p-3 border rounded mb-4" placeholder="URL Gambar" />
               <div className="space-y-2 mb-4">{options.map((o, i) => (<div key={i} className="flex gap-2 items-center"><span className="w-8 h-8 flex items-center justify-center bg-indigo-100 font-bold rounded">{['A','B','C','D','E'][i]}</span><input value={o} onChange={e => {const n=[...options];n[i]=e.target.value;setOptions(n)}} className="w-full p-2 border rounded" /></div>))}</div>
               <div className="flex gap-2 mb-4">{['A','B','C','D','E'].map(l => (<button key={l} onClick={() => setCorrectAnswer(l)} className={`flex-1 py-2 border rounded font-bold ${correctAnswer===l?'bg-green-600 text-white':'bg-white'}`}>{l}</button>))}</div>
               <div className="flex gap-2"><button onClick={addOrUpdate} className="flex-1 bg-indigo-600 text-white py-3 rounded font-bold">{editingId ? 'Simpan' : 'Tambah'}</button>{editingId && <button onClick={resetForm} className="px-6 border py-3 rounded">Batal</button>}</div>
             </div>
             <div className="space-y-2 max-h-[500px] overflow-y-auto">{(bankSoal[selectedSubtest]||[]).map((q, i) => (<div key={q.id} className="p-4 border rounded flex justify-between items-start"><div className="flex-1 pr-4"><span className="font-bold text-indigo-600 mr-2">#{i+1}</span> {q.question}</div><div className="flex gap-2"><button onClick={() => { setQuestionText(q.question); setQuestionImage(q.image||''); setOptions([...q.options]); setCorrectAnswer(q.correct); setEditingId(q.id); window.scrollTo({top:0, behavior:'smooth'}); }} className="text-indigo-600"><Edit size={18}/></button><button onClick={() => deleteSoal(q.id)} className="text-red-600"><Trash2 size={18}/></button></div></div>))}</div>
          </div>
        )}
      </div>

      {/* --- LEADERBOARD POPUP MODAL --- */}
      {showLeaderboard && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden relative">
                  <div className="bg-indigo-600 p-4 flex justify-between items-center">
                      <h2 className="text-white font-bold text-xl flex items-center gap-2"><Trophy className="text-yellow-400"/> Global Leaderboard</h2>
                      <button onClick={()=>setShowLeaderboard(false)} className="text-white hover:bg-indigo-700 p-2 rounded-lg"><X size={24}/></button>
                  </div>
                  
                  <div className="p-6">
                      <div className="flex justify-end mb-4">
                          <button onClick={resetLeaderboard} className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-100 transition border border-red-200">
                              <Trash2 size={16}/> Reset Semua Data Peringkat
                          </button>
                      </div>

                      <div className="overflow-x-auto rounded-lg border border-indigo-100 max-h-[60vh] overflow-y-auto">
                           <table className="w-full text-left border-collapse">
                               <thead className="bg-indigo-50 text-indigo-700 sticky top-0 z-10">
                                   <tr>
                                       <th className="p-4">Peringkat</th>
                                       <th className="p-4">Nama Siswa</th>
                                       <th className="p-4">Asal Sekolah</th>
                                       <th className="p-4 text-center">Skor Akhir</th>
                                   </tr>
                               </thead>
                               <tbody className="divide-y divide-gray-100 text-sm">
                                   {tokenList
                                       .filter(t => t.score !== null && t.score !== undefined)
                                       .sort((a,b) => b.score - a.score)
                                       .map((t, idx) => (
                                       <tr key={t.tokenCode} className="hover:bg-gray-50">
                                           <td className="p-4 font-bold text-gray-600">
                                               {idx===0 ? '🥇 1' : idx===1 ? '🥈 2' : idx===2 ? '🥉 3' : idx+1}
                                           </td>
                                           <td className="p-4 font-medium text-gray-800">{t.studentName}</td>
                                           <td className="p-4 text-gray-600">{t.studentSchool || '-'}</td>
                                           <td className="p-4 text-center font-bold text-indigo-600 text-lg">{t.score}</td>
                                       </tr>
                                   ))}
                                   {tokenList.filter(t => t.score !== null).length === 0 && (
                                       <tr><td colSpan="4" className="p-8 text-center text-gray-400 italic">Belum ada data nilai masuk.</td></tr>
                                   )}
                               </tbody>
                           </table>
                       </div>
                  </div>
              </div>
          </div>
      )}
      
      <div className="py-6 bg-white border-t border-gray-200 w-full text-center">
        <p className="text-gray-400 text-xs font-mono flex items-center justify-center gap-1">
          <Copyright size={12} /> {new Date().getFullYear()} Created by <span className="font-bold text-indigo-500">Liezira</span>
        </p>
      </div>
    </div>
  );
};

export default UTBKAdminApp;