import React from 'react';
import { Shield, AlertTriangle, Info, X } from 'lucide-react';
import { VIOLATION_SCORING } from '../../constants/config';

const ViolationRulesModal = ({ onClose }) => (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
      <div className="p-6 border-b bg-gradient-to-r from-orange-500 to-red-600 rounded-t-2xl text-white flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Shield size={24}/> Sistem Pengamanan Ujian
        </h2>
        <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full"><X size={20}/></button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="font-bold text-blue-800 flex items-center gap-2 mb-2">
            <Info size={16}/> Prinsip Sistem
          </h3>
          <p className="text-sm text-blue-700">
            Sistem ini menggunakan <b>skoring adaptif</b>, bukan langsung diskualifikasi.
            Peserta tetap bisa melanjutkan ujian, namun setiap pelanggaran akan <b>mengurangi skor akhir</b>.
            Terdapat toleransi (grace period) untuk pelanggaran tidak disengaja.
          </p>
        </div>

        <div>
          <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-orange-500"/> Tabel Pengurangan Poin
          </h3>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left font-bold text-gray-600">Tipe Pelanggaran</th>
                  <th className="p-3 text-center font-bold text-gray-600">Toleransi</th>
                  <th className="p-3 text-center font-bold text-orange-600">-Poin/Kejadian</th>
                  <th className="p-3 text-center font-bold text-red-600">Maks Kejadian</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {Object.entries(VIOLATION_SCORING.types).map(([key, v]) => (
                  <tr key={key} className="hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-800">{v.label}</td>
                    <td className="p-3 text-center">
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold">{v.grace}x gratis</span>
                    </td>
                    <td className="p-3 text-center font-bold text-orange-600">
                      {v.deduction > 0 ? `-${v.deduction} poin` : <span className="text-gray-400 text-xs">Tidak ada</span>}
                    </td>
                    <td className="p-3 text-center font-bold text-red-600">{v.maxCount}x</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-yellow-600">{VIOLATION_SCORING.warningThreshold}</div>
            <div className="text-xs font-bold text-yellow-700 uppercase">Poin → Peringatan Keras</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-red-600">{VIOLATION_SCORING.maxTotalDeduction}</div>
            <div className="text-xs font-bold text-red-700 uppercase">Poin → Auto Submit</div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 border">
          <h4 className="font-bold text-gray-700 mb-2 text-sm">💡 Contoh Skenario</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Pindah tab 1x (dalam toleransi 1x) → <b>0 pengurangan</b></li>
            <li>• Pindah tab 2x → <b>-2 poin</b></li>
            <li>• Keluar fullscreen 3x (toleransi 2x) → <b>-1 poin</b></li>
            <li>• Copy/paste langsung (toleransi 0) → <b>-3 poin per kejadian</b></li>
            <li>• Total &gt;= 8 poin → Peringatan pop-up muncul</li>
            <li>• Total &gt;= 15 poin → Ujian di-submit otomatis</li>
          </ul>
        </div>
      </div>

      <div className="p-4 border-t flex justify-end">
        <button onClick={onClose} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700">
          Tutup
        </button>
      </div>
    </div>
  </div>
);

export default ViolationRulesModal;
