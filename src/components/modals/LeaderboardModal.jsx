import React from 'react';
import { Trophy, X, Loader2, List, Trash2 } from 'lucide-react';
import { VIOLATION_SCORING } from '../../constants/config';

const SUBTEST_IDS = ['pu', 'ppu', 'pk', 'pbm', 'lbi', 'lbe', 'pm'];
const SUBTEST_LABELS = ['PU', 'PPU', 'PK', 'PBM', 'Lit. Indo', 'Lit. Ing', 'PM'];

const LeaderboardModal = ({
  leaderboardData,
  isLoading,
  onClose,
  onDownload,
  onReset,
}) => (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[95%] h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
      <div className="p-4 border-b flex justify-between items-center bg-teal-700 rounded-t-2xl text-white">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Trophy size={24} className="text-yellow-300"/>
          Leaderboard Lengkap (IRT Style)
          <span className="text-sm font-normal bg-teal-600 px-2 py-0.5 rounded-full ml-2">{leaderboardData.length} peserta</span>
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={onDownload} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-bold transition shadow-lg">
            <List size={18}/> Download Excel
          </button>
          <button onClick={onClose} className="hover:bg-teal-800 p-2 rounded-full transition"><X size={20}/></button>
        </div>
      </div>

      <div className="p-4 bg-gray-50 border-b flex justify-end">
        <button onClick={onReset} className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-100 transition border border-red-200 text-sm">
          <Trash2 size={16}/> Reset Semua Data Peringkat
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 bg-gray-100">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
            <Loader2 size={40} className="animate-spin text-teal-600"/>
            <p className="font-medium">Memuat semua data leaderboard...</p>
          </div>
        ) : (
          <div className="bg-white shadow-lg border border-gray-300">
            <table className="min-w-full text-[10px] md:text-xs border-collapse font-sans">
              <thead className="sticky top-0 z-10">
                <tr className="bg-teal-700 text-white font-bold text-center uppercase tracking-wider">
                  <th rowSpan="2" className="border border-gray-400 p-2 w-10">Rank</th>
                  <th rowSpan="2" className="border border-gray-400 p-2 min-w-[150px]">Nama Siswa</th>
                  <th rowSpan="2" className="border border-gray-400 p-2 min-w-[120px]">Sekolah</th>
                  {SUBTEST_LABELS.map((s) => (
                    <th key={s} colSpan="2" className="border border-gray-400 p-1 bg-teal-800">{s}</th>
                  ))}
                  <th rowSpan="2" className="border border-gray-400 p-2 w-16 bg-yellow-600 text-white">RATA RATA</th>
                  <th rowSpan="2" className="border border-gray-400 p-2 w-16 bg-orange-600 text-white">⚠️ PNL</th>
                </tr>
                <tr className="bg-teal-600 text-white font-bold text-center text-[9px] uppercase">
                  {Array(7).fill(null).map((_, i) => (
                    <React.Fragment key={i}>
                      <th className="border border-gray-400 px-1 py-1 w-8 bg-teal-600">B</th>
                      <th className="border border-gray-400 px-1 py-1 w-10 bg-teal-500">Skor</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody className="text-gray-900 bg-white">
                {leaderboardData.length === 0 ? (
                  <tr><td colSpan="22" className="p-8 text-center text-gray-400 italic">Belum ada data nilai masuk.</td></tr>
                ) : leaderboardData.map((t, idx) => {
                  const getVal = (id, type) => {
                    const val = t.scoreDetails?.[id]?.[type];
                    return val !== undefined && val !== null ? val : '-';
                  };
                  const hasSubtestData = t.scoreDetails && Object.keys(t.scoreDetails).length > 0;
                  return (
                    <tr key={t.tokenCode} className={`text-center hover:bg-yellow-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="border border-gray-300 p-2 font-bold">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                      </td>
                      <td className="border border-gray-300 p-2 text-left font-medium truncate max-w-[200px]">{t.studentName}</td>
                      <td className="border border-gray-300 p-2 text-left truncate max-w-[150px]">{t.studentSchool || '-'}</td>
                      {SUBTEST_IDS.map((id) => (
                        <React.Fragment key={id}>
                          <td className="border border-gray-300 p-1 text-gray-500">{getVal(id, 'b')}</td>
                          <td className={`border border-gray-300 p-1 font-semibold ${hasSubtestData ? 'text-teal-700 bg-teal-50/30' : 'text-gray-300'}`}>{getVal(id, 'skor')}</td>
                        </React.Fragment>
                      ))}
                      <td className="border border-gray-300 p-2 font-black text-white bg-yellow-500 text-sm">{t.score}</td>
                      <td className={`border border-gray-300 p-2 font-bold text-sm ${(t.violationScore || 0) >= VIOLATION_SCORING.warningThreshold ? 'bg-red-100 text-red-600' : 'text-gray-400'}`}>
                        {t.violationScore || 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  </div>
);

export default LeaderboardModal;
