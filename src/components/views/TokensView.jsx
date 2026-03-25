import React from 'react';
import {
  Plus, Trash2, UploadCloud, List, RefreshCcw, CheckCircle2, XCircle,
  ChevronLeft, ChevronRight, Settings, Zap, ExternalLink, Smartphone,
  School, RefreshCw
} from 'lucide-react';
import { SUBTESTS, VIOLATION_SCORING } from '../../constants/config';

const TokensView = ({
  tokenList,
  activeTokens,
  usedTokens,
  expiredTokens,
  filterStatus,
  onSetFilter,
  currentPage,
  isNextAvailable,
  onFetchPage,
  isSending,
  newTokenName, setNewTokenName,
  newTokenSchool, setNewTokenSchool,
  newTokenPhone, setNewTokenPhone,
  autoSendMode, setAutoSendMode,
  onCreateToken,
  onImportExcel,
  onDownloadExcel,
  onDeleteAll,
  getFilteredList,
  isExpiredFn,
  onSendFonnte,
  onSendManualWeb,
  onSendJsDirect,
  onResetScore,
  onDeleteToken,
}) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    {/* Sidebar: Create Token */}
    <div className="bg-white p-6 rounded-xl shadow h-fit">
      <h2 className="font-bold mb-4 flex items-center gap-2"><Plus size={18}/> Buat Token</h2>

      <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
        <p className="text-xs font-bold text-gray-500 mb-2 uppercase flex items-center gap-1"><Settings size={12}/> Metode Kirim Default:</p>
        <div className="flex flex-col gap-2">
          {[
            { val: 'fonnte', icon: <Zap size={14}/>, label: '1. Auto (Fonnte API)', cls: 'green' },
            { val: 'manual_web', icon: <ExternalLink size={14}/>, label: '2. Manual (WA Web)', cls: 'blue' },
            { val: 'js_app', icon: <Smartphone size={14}/>, label: '3. JS Direct (App)', cls: 'purple' },
          ].map(({ val, icon, label, cls }) => (
            <label key={val} className={`cursor-pointer p-2 rounded text-xs font-bold flex items-center gap-2 border ${autoSendMode === val ? `bg-${cls}-100 border-${cls}-400 text-${cls}-700 ring-1 ring-${cls}-400` : 'bg-white border-gray-300 text-gray-500'}`}>
              <input type="radio" name="sendMode" value={val} checked={autoSendMode === val} onChange={() => setAutoSendMode(val)} className="hidden"/>
              {icon} {label}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <input value={newTokenName} onChange={(e) => setNewTokenName(e.target.value)} className="w-full p-2 border rounded" placeholder="Nama Siswa"/>
        <input value={newTokenSchool} onChange={(e) => setNewTokenSchool(e.target.value)} className="w-full p-2 border rounded" placeholder="Asal Sekolah"/>
        <input value={newTokenPhone} onChange={(e) => setNewTokenPhone(e.target.value)} className="w-full p-2 border rounded" placeholder="No WhatsApp (08xxx)"/>
        <button
          onClick={onCreateToken}
          disabled={isSending}
          className={`w-full py-2 rounded transition text-white font-bold flex items-center justify-center gap-2 ${
            isSending ? 'bg-gray-400' :
            autoSendMode === 'fonnte' ? 'bg-green-600 hover:bg-green-700' :
            autoSendMode === 'js_app' ? 'bg-purple-600 hover:bg-purple-700' :
            'bg-blue-600 hover:bg-blue-700'}`}
        >
          {isSending ? 'Mengirim...' : 'Generate & Kirim'}
        </button>
      </div>

      <div className="relative flex py-2 items-center">
        <div className="flex-grow border-t border-gray-200"/>
        <span className="flex-shrink-0 mx-4 text-gray-400 text-xs">ATAU IMPORT EXCEL</span>
        <div className="flex-grow border-t border-gray-200"/>
      </div>
      <div className="relative">
        <input type="file" accept=".xlsx, .xls, .csv" onChange={onImportExcel} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" disabled={isSending}/>
        <button className="w-full py-2 rounded border-2 border-dashed border-indigo-300 text-indigo-600 font-bold hover:bg-indigo-50 flex items-center justify-center gap-2 transition">
          <UploadCloud size={18}/> Upload Data Siswa (.xlsx)
        </button>
      </div>
      <p className="text-[10px] text-gray-400 text-center mt-1">Format Kolom: Nama, Sekolah, HP</p>
    </div>

    {/* Main: Token List */}
    <div className="md:col-span-2 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { key: 'all',     label: 'Total',    count: tokenList.length,     color: 'indigo' },
          { key: 'active',  label: 'Aktif',    count: activeTokens.length,  color: 'green' },
          { key: 'used',    label: 'Terpakai', count: usedTokens.length,    color: 'gray' },
          { key: 'expired', label: 'Expired',  count: expiredTokens.length, color: 'red' },
        ].map(({ key, label, count, color }) => (
          <button key={key} onClick={() => onSetFilter(key)} className={`p-3 rounded-lg border text-center transition ${filterStatus === key ? `bg-${color}-50 border-${color}-500 ring-2 ring-${color}-200` : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
            <p className={`text-xs text-${color}-600 uppercase font-bold`}>{label}</p>
            <p className={`text-2xl font-bold text-${color}-700`}>{count}</p>
          </button>
        ))}
      </div>

      <div className="bg-white p-6 rounded-xl shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg">List Token</h2>
          <div className="flex gap-2">
            <button onClick={onDownloadExcel} className="flex items-center gap-1 text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded text-sm font-bold hover:bg-green-100 transition">
              <List size={14}/> Export Excel
            </button>
            <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1 border border-gray-200">
              <button onClick={() => onFetchPage('prev')} disabled={currentPage === 1} className="p-1.5 hover:bg-white rounded disabled:opacity-30 transition shadow-sm text-gray-600"><ChevronLeft size={16}/></button>
              <span className="text-xs font-bold px-2 text-gray-600 min-w-[30px] text-center">{currentPage}</span>
              <button onClick={() => onFetchPage('next')} disabled={!isNextAvailable} className="p-1.5 hover:bg-white rounded disabled:opacity-30 transition shadow-sm text-gray-600"><ChevronRight size={16}/></button>
            </div>
            <button onClick={() => onFetchPage('first')} className="text-indigo-600 hover:bg-indigo-50 p-2 rounded transition" title="Refresh"><RefreshCcw size={16}/></button>
            {tokenList.length > 0 && <button onClick={onDeleteAll} className="text-red-600 bg-red-50 hover:bg-red-100 p-2 rounded transition ml-1"><Trash2 size={16}/></button>}
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
                <th className="p-2 text-center">⚠️ Pnl</th>
                <th className="p-2 text-center">Kirim Ulang</th>
                <th className="p-2 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredList().map((t) => {
                const expired = isExpiredFn(t.createdAt);
                const statusLabel = expired ? 'EXPIRED' : t.status === 'used' ? 'USED' : 'ACTIVE';
                const statusColor = expired ? 'bg-red-100 text-red-700' : t.status === 'used' ? 'bg-gray-200 text-gray-700' : 'bg-green-100 text-green-700';
                const vScore = t.violationScore || 0;
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
                        <div className="flex flex-col"><span className="flex items-center gap-1 text-green-600 font-bold text-xs"><CheckCircle2 size={12}/> Terkirim</span><span className="text-[10px] text-gray-400">{t.sentMethod}</span></div>
                      ) : (
                        <span className="flex items-center gap-1 text-gray-400 text-xs"><XCircle size={12}/> Belum</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {t.score !== undefined && t.score !== null ? (
                        <div className="flex flex-col gap-1 items-center">
                          <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded w-fit border border-blue-200">SELESAI</span>
                          <span className="text-sm font-bold text-gray-800 flex items-center gap-1">🏆 Skor: {t.score}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs font-bold bg-gray-100 px-2 py-1 rounded w-fit">-</span>
                      )}
                    </td>
                    <td className="p-2 text-center">
                      <span className={`text-xs font-bold px-2 py-1 rounded ${vScore === 0 ? 'text-gray-300' : vScore >= VIOLATION_SCORING.warningThreshold ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                        {vScore}
                      </span>
                    </td>
                    <td className="p-2 flex gap-1 justify-center">
                      <button onClick={() => onSendFonnte(t.studentName, t.studentPhone, t.tokenCode)} className="bg-green-50 text-green-700 p-1.5 rounded hover:bg-green-100"><Zap size={14}/></button>
                      <button onClick={() => onSendManualWeb(t.studentName, t.studentPhone, t.tokenCode)} className="bg-blue-50 text-blue-700 p-1.5 rounded hover:bg-blue-100"><ExternalLink size={14}/></button>
                      <button onClick={() => onSendJsDirect(t.studentName, t.studentPhone, t.tokenCode)} className="bg-purple-50 text-purple-700 p-1.5 rounded hover:bg-purple-100"><Smartphone size={14}/></button>
                    </td>
                    <td className="p-2 text-center">
                      <div className="flex gap-2 justify-center">
                        {t.status === 'used' && !expired && (
                          <button onClick={() => onResetScore(t.tokenCode)} className="text-orange-500 hover:text-orange-700 bg-orange-50 p-2 rounded border border-orange-200" title="Reset Ujian"><RefreshCw size={16}/></button>
                        )}
                        <button onClick={() => onDeleteToken(t.tokenCode)} className="text-red-500 hover:text-red-700 bg-red-50 p-2 rounded border border-red-200"><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
);

export default TokensView;
