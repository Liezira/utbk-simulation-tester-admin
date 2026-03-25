import React from 'react';
import { Wallet, Search, Coins, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

const UsersView = ({
  filteredUserList,
  totalUsersCount,
  totalCreditsCount,
  totalTokensCount,
  searchEmail,
  setSearchEmail,
  userCurrentPage,
  userIsNextAvailable,
  onFetchUsers,
  onShowCreditModal,
  onAddCredits,
  onDeleteUser,
}) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white p-6 rounded-xl shadow border border-indigo-100">
        <h3 className="text-gray-500 text-xs font-bold uppercase mb-1">Total Users</h3>
        <div className="text-3xl font-black text-indigo-900">{totalUsersCount}</div>
        <p className="text-xs text-gray-400 mt-1">Ditampilkan: {filteredUserList.length} user</p>
      </div>
      <div className="bg-white p-6 rounded-xl shadow border border-green-100">
        <h3 className="text-gray-500 text-xs font-bold uppercase mb-1">Total Credits Beredar</h3>
        <div className="text-3xl font-black text-green-600">{totalCreditsCount}</div>
      </div>
      <div className="bg-white p-6 rounded-xl shadow border border-blue-100">
        <h3 className="text-gray-500 text-xs font-bold uppercase mb-1">Total Tokens</h3>
        <div className="text-3xl font-black text-blue-600">{totalTokensCount}</div>
      </div>
    </div>

    <div className="bg-white p-6 rounded-xl shadow">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
        <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Wallet size={20}/> Manajemen Saldo User</h2>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <input
              type="text"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              placeholder="Cari Nama / Email / Sekolah..."
              className="pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 outline-none w-full"
            />
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          </div>
          {searchEmail && (
            <button onClick={() => setSearchEmail('')} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold hover:bg-gray-200 transition text-xs">Reset</button>
          )}
          <button
            onClick={onShowCreditModal}
            className="bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-200 border border-green-200 flex items-center gap-1 transition whitespace-nowrap"
          >
            <Coins size={14}/> Bulk Credits
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3">Nama & Email</th>
              <th className="p-3">Sekolah</th>
              <th className="p-3">HP</th>
              <th className="p-3 text-center">Sisa Credits</th>
              <th className="p-3 text-center">Token</th>
              <th className="p-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredUserList.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 transition">
                <td className="p-3"><div className="font-bold text-gray-800">{user.displayName || 'No Name'}</div><div className="text-xs text-gray-500">{user.email}</div></td>
                <td className="p-3 text-gray-600">{user.school || '-'}</td>
                <td className="p-3 font-mono text-gray-500">{user.phone || '-'}</td>
                <td className="p-3 text-center">
                  <span className={`px-3 py-1 rounded-full font-bold ${user.credits > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {user.credits || 0}
                  </span>
                </td>
                <td className="p-3 text-center font-bold text-indigo-600">{user.generatedTokens ? user.generatedTokens.length : 0}</td>
                <td className="p-3 text-center">
                  <div className="flex justify-center gap-2">
                    <button onClick={() => onAddCredits(user.id)} className="bg-green-50 text-green-600 p-2 rounded hover:bg-green-100 border border-green-200"><Coins size={16}/></button>
                    <button onClick={() => onDeleteUser(user.id)} className="bg-red-50 text-red-600 p-2 rounded hover:bg-red-100 border border-red-200"><Trash2 size={16}/></button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredUserList.length === 0 && (
              <tr><td colSpan="6" className="p-8 text-center text-gray-400">User tidak ditemukan.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {!searchEmail && (
        <div className="flex justify-between items-center mt-4 border-t pt-4">
          <div className="text-xs text-gray-400">Menampilkan 20 user per halaman</div>
          <div className="flex items-center gap-2">
            <button onClick={() => onFetchUsers('prev')} disabled={userCurrentPage === 1} className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"><ChevronLeft size={16}/></button>
            <span className="text-xs font-bold">{userCurrentPage}</span>
            <button onClick={() => onFetchUsers('next')} disabled={!userIsNextAvailable} className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"><ChevronRight size={16}/></button>
          </div>
        </div>
      )}
    </div>
  </div>
);

export default UsersView;
