import React, { useState, useEffect } from 'react';
import { Edit, Plus, Trash2, LogOut, Key, BarChart3, Filter, Copyright } from 'lucide-react';
import { db, auth } from './firebase';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
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

const UTBKAdminApp = () => {
  const [screen, setScreen] = useState('admin_login'); 
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [viewMode, setViewMode] = useState('tokens');
  const [tokenList, setTokenList] = useState([]);
  const [bankSoal, setBankSoal] = useState({});
  const [filterStatus, setFilterStatus] = useState('all');
  
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenPhone, setNewTokenPhone] = useState('');
  const [selectedSubtest, setSelectedSubtest] = useState('pu');
  const [questionText, setQuestionText] = useState('');
  const [questionImage, setQuestionImage] = useState('');
  const [options, setOptions] = useState(['', '', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState('A');
  const [editingId, setEditingId] = useState(null);

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

  const handleLogin = async (e) => { e.preventDefault(); try { await signInWithEmailAndPassword(auth, adminEmail, adminPassword); setScreen('dashboard'); loadTokens(); } catch (error) { alert('Login Gagal.'); } };
  const handleLogout = async () => { await signOut(auth); setScreen('admin_login'); };

  const createToken = async () => {
    if (!newTokenName || !newTokenPhone) { alert('Isi Nama & HP!'); return; }
    const tokenCode = `UTBK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    try { await setDoc(doc(db, 'tokens', tokenCode), { tokenCode, studentName: newTokenName, studentPhone: newTokenPhone, status: 'active', createdAt: new Date().toISOString(), }); alert(`Token: ${tokenCode}`); setNewTokenName(''); setNewTokenPhone(''); loadTokens(); } catch (error) { alert('Gagal.'); }
  };

  const loadTokens = async () => { const s = await getDocs(collection(db, 'tokens')); const t = []; s.forEach((d) => t.push(d.data())); t.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); setTokenList(t); };
  const deleteToken = async (code) => { if(confirm('Hapus token ini?')) { await deleteDoc(doc(db, 'tokens', code)); loadTokens(); }};
  const deleteAllTokens = async () => { if (!confirm("⚠️ PERINGATAN: Hapus SEMUA data?")) return; try { await Promise.all(tokenList.map(t => deleteDoc(doc(db, "tokens", t.tokenCode)))); alert("Semua terhapus."); loadTokens(); } catch (error) { alert("Gagal."); } };

  const isExpired = (createdAt) => (Date.now() - new Date(createdAt).getTime()) > 24 * 60 * 60 * 1000;
  const activeTokens = tokenList.filter(t => t.status === 'active' && !isExpired(t.createdAt));
  const usedTokens = tokenList.filter(t => t.status === 'used');
  const expiredTokens = tokenList.filter(t => isExpired(t.createdAt));
  const getFilteredList = () => { switch (filterStatus) { case 'active': return activeTokens; case 'used': return usedTokens; case 'expired': return expiredTokens; default: return tokenList; } };

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
          {/* Copyright Login */}
          <div className="mt-8 text-center text-xs text-gray-400 font-mono">© {new Date().getFullYear()} Liezira</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="sticky top-0 z-40 bg-white shadow px-6 py-4 flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-indigo-900">Admin Panel</h1>
        <div className="flex gap-2">
          <button onClick={() => setViewMode('tokens')} className={`px-4 py-2 rounded ${viewMode==='tokens'?'bg-indigo-100 text-indigo-700':'text-gray-600'}`}>Token</button>
          <button onClick={() => setViewMode('soal')} className={`px-4 py-2 rounded ${viewMode==='soal'?'bg-indigo-100 text-indigo-700':'text-gray-600'}`}>Bank Soal</button>
          <button onClick={handleLogout} className="text-red-600 px-3"><LogOut size={18}/></button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 flex-1 w-full">
        {viewMode === 'tokens' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow h-fit">
              <h2 className="font-bold mb-4 flex items-center gap-2"><Plus size={18}/> Buat Token</h2>
              <div className="space-y-4"><input value={newTokenName} onChange={e=>setNewTokenName(e.target.value)} className="w-full p-2 border rounded" placeholder="Nama Siswa"/><input value={newTokenPhone} onChange={e=>setNewTokenPhone(e.target.value)} className="w-full p-2 border rounded" placeholder="No HP"/><button onClick={createToken} className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 transition">Generate</button></div>
            </div>
            <div className="md:col-span-2 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <button onClick={() => setFilterStatus('all')} className={`p-3 rounded-lg border text-center ${filterStatus==='all'?'bg-indigo-50 border-indigo-500':'bg-white'}`}><p className="text-xs text-gray-500 font-bold">Total</p><p className="text-2xl font-bold">{tokenList.length}</p></button>
                <button onClick={() => setFilterStatus('active')} className={`p-3 rounded-lg border text-center ${filterStatus==='active'?'bg-green-50 border-green-500':'bg-white'}`}><p className="text-xs text-green-600 font-bold">Aktif</p><p className="text-2xl font-bold">{activeTokens.length}</p></button>
                <button onClick={() => setFilterStatus('used')} className={`p-3 rounded-lg border text-center ${filterStatus==='used'?'bg-gray-100 border-gray-500':'bg-white'}`}><p className="text-xs text-gray-600 font-bold">Terpakai</p><p className="text-2xl font-bold">{usedTokens.length}</p></button>
                <button onClick={() => setFilterStatus('expired')} className={`p-3 rounded-lg border text-center ${filterStatus==='expired'?'bg-red-50 border-red-500':'bg-white'}`}><p className="text-xs text-red-600 font-bold">Expired</p><p className="text-2xl font-bold">{expiredTokens.length}</p></button>
              </div>
              <div className="bg-white p-6 rounded-xl shadow">
                <div className="flex justify-between items-center mb-4"><h2 className="font-bold text-lg">List Token</h2><div className="flex gap-2"><button onClick={loadTokens} className="text-indigo-600 text-sm">Refresh</button>{tokenList.length>0&&<button onClick={deleteAllTokens} className="text-red-600 text-sm font-bold ml-2">Hapus Semua</button>}</div></div>
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-sm text-left"><thead className="bg-gray-50 sticky top-0"><tr><th className="p-2">Kode</th><th className="p-2">Nama</th><th className="p-2">Status</th><th className="p-2">Aksi</th></tr></thead>
                    <tbody>{getFilteredList().map(t=>(<tr key={t.tokenCode} className="border-b"><td className="p-2 font-mono text-indigo-600 font-bold">{t.tokenCode}</td><td className="p-2">{t.studentName}<div className="text-xs text-gray-400">{t.studentPhone}</div></td><td className="p-2">{isExpired(t.createdAt)?<span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">EXPIRED</span>:<span className={`px-2 py-1 rounded text-xs font-bold ${t.status==='active'?'bg-green-100 text-green-700':'bg-gray-200'}`}>{t.status.toUpperCase()}</span>}</td><td className="p-2"><button onClick={()=>deleteToken(t.tokenCode)} className="text-red-500"><Trash2 size={16}/></button></td></tr>))}</tbody></table>
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
      
      {/* COPYRIGHT FOOTER LIEZIRA */}
      <div className="py-6 bg-white border-t border-gray-200 w-full text-center">
        <p className="text-gray-400 text-xs font-mono flex items-center justify-center gap-1">
          <Copyright size={12} /> {new Date().getFullYear()} Created by <span className="font-bold text-indigo-500">Liezira</span>
        </p>
      </div>
    </div>
  );
};

export default UTBKAdminApp;
