import React from 'react';
import { Eye, X, CheckCircle2, XCircle } from 'lucide-react';

const PreviewUploadModal = ({
  previewData,
  selectedRows,
  isSending,
  onToggleRow,
  onToggleAll,
  onExecute,
  onClose,
}) => {
  const validCount = previewData.filter((r) => r.valid).length;
  const invalidCount = previewData.length - validCount;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-2xl text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2"><Eye size={24}/> Preview Data Excel (Siswa)</h2>
              <p className="text-sm text-indigo-100 mt-1">Periksa dan pilih data siswa yang akan di-generate tokennya</p>
            </div>
            <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition"><X size={20}/></button>
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-b grid grid-cols-3 gap-4">
          <div className="text-center"><div className="text-2xl font-bold text-gray-800">{previewData.length}</div><div className="text-xs text-gray-500 uppercase">Total Baris</div></div>
          <div className="text-center"><div className="text-2xl font-bold text-green-600">{validCount}</div><div className="text-xs text-gray-500 uppercase">Valid</div></div>
          <div className="text-center"><div className="text-2xl font-bold text-red-600">{invalidCount}</div><div className="text-xs text-gray-500 uppercase">Invalid</div></div>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="mb-4 flex justify-between items-center">
            <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
              <input
                type="checkbox"
                checked={selectedRows.length === validCount && validCount > 0}
                onChange={onToggleAll}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm font-bold text-gray-700">Pilih Semua Valid ({selectedRows.length} dipilih)</span>
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
                    <td className="p-3 text-center text-gray-500 font-mono text-xs">{index + 1}</td>
                    <td className="p-3"><div className={`font-bold ${row.nama ? 'text-gray-800' : 'text-red-500 italic'}`}>{row.nama || '(Kosong)'}</div></td>
                    <td className="p-3 text-gray-600">{row.sekolah}</td>
                    <td className="p-3 font-mono text-gray-600">{row.hp}</td>
                    <td className="p-3 text-center">
                      {row.valid
                        ? <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">VALID</span>
                        : <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">INVALID</span>}
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(row.id)}
                        onChange={() => onToggleRow(row.id)}
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

        <div className="p-6 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2 border rounded">Batal</button>
          <button
            onClick={onExecute}
            disabled={isSending}
            className="px-6 py-2 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700 disabled:bg-gray-400"
          >
            {isSending ? 'Proses...' : 'Import Token'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreviewUploadModal;
