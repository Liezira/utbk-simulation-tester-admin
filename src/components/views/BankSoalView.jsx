import React, { useRef } from 'react';
import { Eye, List, UploadCloud, Image as ImageIcon, Key, Edit, Trash2, CheckCircle2, Loader2, X, CheckSquare, Type } from 'lucide-react';
import Latex from 'react-latex-next';
import { SUBTESTS } from '../../constants/config';
import RichTextToolbar from '../ui/RichTextToolbar';

const BankSoalView = ({
  bankSoal,
  selectedSubtest, setSelectedSubtest,
  questionType, questionText, setQuestionText,
  questionImage, setQuestionImage,
  options, setOptions,
  correctAnswer, setCorrectAnswer,
  editingId,
  isUploading,
  onTypeChange,
  onAddOrUpdate,
  onResetForm,
  onLoadForEdit,
  onDeleteSoal,
  onImageUpload,
  onDownloadTemplate,
  onImportSoalFile,
  onGenerateDummy,
}) => {
  const questionTextareaRef = useRef(null);
  const optionRefs = useRef([]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      {/* Editor */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">Editor Bank Soal</h2>
          <div className="flex gap-2">
            <button onClick={onDownloadTemplate} className="text-xs bg-green-50 text-green-700 px-3 py-2 rounded border border-green-200 font-bold flex items-center gap-1 hover:bg-green-100">
              <List size={14}/> Template Excel
            </button>
            <label className="text-xs bg-blue-50 text-blue-700 px-3 py-2 rounded border border-blue-200 font-bold flex items-center gap-1 hover:bg-blue-100 cursor-pointer">
              <UploadCloud size={14}/> Import Excel
              <input type="file" accept=".xlsx" className="hidden" onChange={onImportSoalFile}/>
            </label>
          </div>
        </div>

        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-8">
          <select
            value={selectedSubtest}
            onChange={(e) => { setSelectedSubtest(e.target.value); onResetForm(); }}
            className="w-full p-3 border rounded-lg mb-6 bg-white font-medium text-gray-700 shadow-sm focus:ring-2 focus:ring-indigo-200 outline-none"
          >
            {SUBTESTS.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({bankSoal[s.id]?.length || 0} / {s.questions})</option>
            ))}
          </select>

          <div className="mb-6">
            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block tracking-wider">Format Soal:</label>
            <div className="flex flex-wrap gap-2">
              {[
                { val: 'pilihan_ganda',   icon: <List size={18}/>,       label: 'Pilihan Ganda' },
                { val: 'pilihan_majemuk', icon: <CheckSquare size={18}/>, label: 'Pilihan Majemuk' },
                { val: 'isian',           icon: <Type size={18}/>,        label: 'Isian Singkat' },
              ].map(({ val, icon, label }) => (
                <label key={val} className={`cursor-pointer px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 border-2 transition ${questionType === val ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}>
                  <input type="radio" name="qType" className="hidden" checked={questionType === val} onChange={() => onTypeChange(val)}/>{icon} {label}
                </label>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <RichTextToolbar textareaRef={questionTextareaRef} value={questionText} onChange={setQuestionText}/>
            <textarea
              ref={questionTextareaRef}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              className="w-full p-4 border border-gray-200 rounded-b-lg focus:ring-2 focus:ring-indigo-100 outline-none"
              rows="3"
              placeholder="Ketik Pertanyaan di sini (Support LaTeX dengan $...$, bold **teks**, italic _teks_)..."
            />
          </div>

          <div className="mb-6">
            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block tracking-wider">Gambar Soal (Opsional):</label>
            {!questionImage ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center bg-white hover:bg-gray-50 transition cursor-pointer relative">
                <input type="file" accept="image/*" onChange={onImageUpload} disabled={isUploading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                {isUploading ? (
                  <div className="flex flex-col items-center text-indigo-600 animate-pulse"><Loader2 size={32} className="animate-spin mb-2"/><span className="text-sm font-bold">Sedang Memproses...</span></div>
                ) : (
                  <div className="flex flex-col items-center text-gray-400"><UploadCloud size={32} className="mb-2"/><span className="text-sm font-medium text-gray-500">Klik untuk Upload Gambar</span><span className="text-xs text-gray-400 mt-1">Max 1MB</span></div>
                )}
              </div>
            ) : (
              <div className="relative w-fit group">
                <img src={questionImage} alt="Preview Soal" className="max-h-48 rounded-lg border border-gray-200 shadow-sm"/>
                <button onClick={() => setQuestionImage('')} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600 transition"><X size={16}/></button>
                <div className="mt-2 text-xs text-green-600 font-bold flex items-center gap-1"><CheckCircle2 size={12}/> Gambar Siap Disimpan</div>
              </div>
            )}
          </div>

          {questionType !== 'isian' ? (
            <>
              <div className="space-y-3 mb-6">
                {options.map((o, i) => {
                  const ref = (el) => { optionRefs.current[i] = el; };
                  const label = ['A','B','C','D','E'][i];
                  return (
                    <div key={i}>
                      <RichTextToolbar
                        textareaRef={{ current: optionRefs.current[i] }}
                        value={o}
                        onChange={(newVal) => { const n = [...options]; n[i] = newVal; setOptions(n); }}
                      />
                      <div className="flex gap-3 items-center">
                        <span className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-indigo-100 font-bold rounded-lg text-indigo-700">{label}</span>
                        <input
                          ref={ref}
                          value={o}
                          onChange={(e) => { const n = [...options]; n[i] = e.target.value; setOptions(n); }}
                          className="w-full p-2.5 border rounded-b-lg focus:ring-2 focus:ring-indigo-100 outline-none"
                          placeholder={`Pilihan Jawaban ${label}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mb-4">
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block tracking-wider">
                  Kunci Jawaban Benar ({questionType === 'pilihan_ganda' ? 'Pilih Satu' : 'Pilih Banyak'}):
                </label>
                <div className="flex gap-3">
                  {['A','B','C','D','E'].map((l) => {
                    const isSelected = questionType === 'pilihan_ganda'
                      ? correctAnswer === l
                      : Array.isArray(correctAnswer) && correctAnswer.includes(l);
                    return (
                      <button key={l} onClick={() => {
                        if (questionType === 'pilihan_ganda') setCorrectAnswer(l);
                        else {
                          let cur = Array.isArray(correctAnswer) ? [...correctAnswer] : [];
                          setCorrectAnswer(cur.includes(l) ? cur.filter((x) => x !== l) : [...cur, l]);
                        }
                      }} className={`flex-1 py-3 border-2 rounded-lg font-bold transition text-lg ${isSelected ? 'bg-green-50 text-white border-green-500 shadow-md' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'}`}>{l}</button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="mb-6 bg-green-50 p-4 rounded-lg border border-green-200">
              <label className="text-xs font-bold text-green-700 uppercase mb-2 block tracking-wider flex items-center gap-1"><Key size={14}/> Kunci Jawaban (Teks/Angka):</label>
              <input value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)} className="w-full p-4 border-2 border-green-400 rounded-lg bg-white font-bold text-xl text-gray-800 focus:outline-none focus:ring-4 focus:ring-green-100" placeholder="Contoh: 25 atau Jakarta"/>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button onClick={onAddOrUpdate} className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 shadow-lg transition transform hover:-translate-y-0.5">
              {editingId ? 'Simpan Perubahan' : 'Tambah Soal Baru'}
            </button>
            {editingId && <button onClick={onResetForm} className="px-6 border-2 border-gray-300 py-3 rounded-lg font-bold text-gray-500 hover:bg-gray-100">Batal Edit</button>}
          </div>
        </div>

        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
          {(bankSoal[selectedSubtest] || []).map((q, i) => (
            <div key={q.id} className="p-4 border rounded-xl flex justify-between items-start bg-white hover:shadow-md transition group">
              <div className="flex-1 pr-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded text-sm">#{i + 1}</span>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${q.type === 'isian' ? 'bg-green-50 text-green-600 border-green-100' : q.type === 'pilihan_majemuk' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                    {q.type ? q.type.replace('_', ' ') : 'PILIHAN GANDA'}
                  </span>
                </div>
                <p className="line-clamp-2 text-gray-700 text-sm font-medium">{q.question}</p>
                {q.image && <div className="mt-2 text-xs text-blue-500 flex items-center gap-1"><ImageIcon size={12}/> Ada Gambar</div>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => onLoadForEdit(q)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded"><Edit size={18}/></button>
                <button onClick={() => onDeleteSoal(q.id)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={18}/></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="lg:sticky lg:top-24 h-fit">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
            <span className="font-bold text-gray-700 bg-white border border-gray-200 px-3 py-1 rounded text-sm flex items-center gap-2"><Eye size={16} className="text-indigo-500"/> Pratinjau Soal (Tampilan Siswa)</span>
            <span className="text-xs font-bold px-2 py-1 rounded border bg-indigo-50 text-indigo-600 border-indigo-100 uppercase">{questionType.replace('_', ' ')}</span>
          </div>
          <div className="p-5">
            <div className="text-gray-800 text-sm leading-relaxed font-medium mb-4 text-left text-justify whitespace-pre-wrap">
              <Latex>{(questionText || 'Belum ada pertanyaan...').replace(/</g, ' < ')}</Latex>
            </div>
            {questionImage && <img src={questionImage} className="w-full h-auto my-6 select-none object-contain" alt="Soal"/>}
            <div className="space-y-2 text-sm">
              {questionType === 'isian' ? (
                <div className="bg-gray-50 p-4 rounded-lg border-2 border-dashed border-gray-300 opacity-70">
                  <input disabled className="w-full p-2 bg-transparent text-xl font-mono border-b-2 border-gray-300 outline-none" placeholder="Jawaban siswa..."/>
                </div>
              ) : (
                <div className="space-y-2">
                  {options.map((opt, i) => {
                    const label = ['A','B','C','D','E'][i];
                    const isCorrect = questionType === 'pilihan_ganda'
                      ? correctAnswer === label
                      : Array.isArray(correctAnswer) && correctAnswer.includes(label);
                    return (
                      <div key={i} className={`p-3 rounded-lg border flex gap-3 items-center ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                        <div className={`w-6 h-6 flex items-center justify-center font-bold rounded text-xs ${isCorrect ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{label}</div>
                        <div className="font-medium text-gray-700"><Latex>{(opt || `Pilihan ${label}`).replace(/</g, ' < ')}</Latex></div>
                        {isCorrect && <CheckCircle2 size={16} className="text-green-500 ml-auto"/>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="mt-4 text-center text-xs text-gray-400">*Preview ini menampilkan bagaimana soal terlihat di aplikasi siswa.</div>
        <button onClick={onGenerateDummy} className="mt-4 w-full text-xs py-2 rounded border border-dashed border-gray-300 text-gray-400 hover:bg-gray-50">
          Isi Dummy Data
        </button>
      </div>
    </div>
  );
};

export default BankSoalView;
