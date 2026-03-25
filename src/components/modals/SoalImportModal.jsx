import React from 'react';
import { UploadCloud, X, CheckCircle2, XCircle } from 'lucide-react';
import { SUBTESTS } from '../../constants/config';

const SoalImportModal = ({
  previewSoal,
  selectedSubtest,
  onSave,
  onClose,
}) => (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
      <div className="p-6 border-b bg-indigo-600 text-white rounded-t-2xl flex justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2"><UploadCloud/> Preview Import Soal</h2>
        <button onClick={onClose}><X/></button>
      </div>
      <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
        <div>Target: <span className="font-bold text-indigo-600">{SUBTESTS.find((s) => s.id === selectedSubtest)?.name}</span></div>
        <div className="text-sm">
          Total: <b>{previewSoal.length}</b> | Valid: <b className="text-green-600">{previewSoal.filter((s) => s.valid).length}</b>
        </div>
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
              <tr key={i} className={s.valid ? 'bg-white' : 'bg-red-50'}>
                <td className="p-2 border text-center uppercase text-xs font-bold">{s.type}</td>
                <td className="p-2 border truncate max-w-xs">{s.question}</td>
                <td className="p-2 border text-xs text-gray-500">{s.type === 'isian' ? '-' : s.options.join(' | ')}</td>
                <td className="p-2 border text-center font-bold">{s.correct}</td>
                <td className="p-2 border text-center">
                  {s.valid
                    ? <CheckCircle2 className="text-green-500 w-5 h-5 mx-auto"/>
                    : <XCircle className="text-red-500 w-5 h-5 mx-auto"/>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-6 border-t flex justify-end gap-3">
        <button onClick={onClose} className="px-6 py-2 border rounded">Batal</button>
        <button onClick={onSave} className="px-6 py-2 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700">Import Sekarang</button>
      </div>
    </div>
  </div>
);

export default SoalImportModal;
