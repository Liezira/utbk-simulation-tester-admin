import React, { useState } from 'react';
import { Coins, X, Search, Loader2, Send } from 'lucide-react';

const BulkCreditModal = ({
  userList,
  selectedUserIds,
  bulkCreditAmount,
  isProcessing,
  onToggleUser,
  onSetAmount,
  onSelectAll,
  onExecute,
  onClose,
}) => {
  const [localSearch, setLocalSearch] = useState('');

  const visibleUsers = userList.filter((u) =>
    (u.displayName?.toLowerCase().includes(localSearch.toLowerCase())) ||
    (u.email?.toLowerCase().includes(localSearch.toLowerCase())) ||
    (u.school?.toLowerCase().includes(localSearch.toLowerCase()))
  );
  const isAllSelected = visibleUsers.length > 0 && selectedUserIds.length === visibleUsers.length;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b flex justify-between items-center bg-gradient-to-r from-green-600 to-emerald-600 rounded-t-2xl text-white">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2"><Coins size={24} className="text-yellow-300"/> Distribusi Credits Massal</h2>
            <p className="text-green-100 text-sm mt-1">Pilih user dan tentukan jumlah credit.</p>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition"><X size={20}/></button>
        </div>

        <div className="p-4 bg-gray-50 border-b">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input
              type="text"
              placeholder="Ketik Nama, Email, atau Sekolah..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-green-200 outline-none"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-100 sticky top-0 text-gray-600 font-bold uppercase text-xs">
              <tr>
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={() => onSelectAll(visibleUsers)}
                    className="w-4 h-4 rounded cursor-pointer"
                  />
                </th>
                <th className="p-4">User Detail</th>
                <th className="p-4">Sekolah</th>
                <th className="p-4 text-center">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visibleUsers.map((u) => (
                <tr
                  key={u.id}
                  className={`hover:bg-green-50 transition cursor-pointer ${selectedUserIds.includes(u.id) ? 'bg-green-50' : ''}`}
                  onClick={() => onToggleUser(u.id)}
                >
                  <td className="p-4 text-center"><input type="checkbox" checked={selectedUserIds.includes(u.id)} onChange={() => {}} className="w-4 h-4 rounded cursor-pointer"/></td>
                  <td className="p-4"><div className="font-bold text-gray-800">{u.displayName || 'No Name'}</div><div className="text-xs text-gray-500">{u.email}</div></td>
                  <td className="p-4 text-gray-600">{u.school || '-'}</td>
                  <td className="p-4 text-center"><span className="bg-gray-100 text-gray-600 px-2 py-1 rounded font-mono font-bold">{u.credits || 0}</span></td>
                </tr>
              ))}
              {visibleUsers.length === 0 && <tr><td colSpan="4" className="p-8 text-center text-gray-400">Tidak ditemukan.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="p-6 border-t bg-gray-50 rounded-b-2xl flex items-center justify-between gap-4">
          <div className="text-sm font-bold text-gray-600">Terpilih: <span className="text-green-600 text-lg">{selectedUserIds.length}</span> User</div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
              <span className="text-gray-500 text-sm font-bold">Jumlah:</span>
              <input
                type="number"
                min="1"
                value={bulkCreditAmount}
                onChange={(e) => onSetAmount(e.target.value)}
                className="w-20 font-bold text-center outline-none border-b-2 border-green-500 focus:border-green-700"
              />
            </div>
            <button
              onClick={onExecute}
              disabled={isProcessing || selectedUserIds.length === 0}
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2 shadow-lg transition"
            >
              {isProcessing ? <Loader2 className="animate-spin"/> : <Send size={18}/>} Kirim
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkCreditModal;
