import React from 'react';
import { Loader2, LogOut, Trophy, Shield, Users } from 'lucide-react';
import useAdminState from './hooks/useAdminState';
import TokensView from './components/views/TokensView';
import UsersView from './components/views/UsersView';
import BankSoalView from './components/views/BankSoalView';
import PreviewUploadModal from './components/modals/PreviewUploadModal';
import LeaderboardModal from './components/modals/LeaderboardModal';
import BulkCreditModal from './components/modals/BulkCreditModal';
import SoalImportModal from './components/modals/SoalImportModal';
import ViolationRulesModal from './components/modals/ViolationRulesModal';
import 'katex/dist/katex.min.css';

// ─── Loading Screen ────────────────────────────────────────────────────────
const RoleCheckScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="flex flex-col items-center">
      <Loader2 className="animate-spin text-indigo-600 mb-4" size={40}/>
      <p className="text-gray-500 font-bold">Memverifikasi Hak Akses...</p>
    </div>
  </div>
);

// ─── Login Screen ──────────────────────────────────────────────────────────
const LoginScreen = ({ adminEmail, setAdminEmail, adminPassword, setAdminPassword, handleLogin }) => (
  <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
    <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Admin Portal</h2>
      <form onSubmit={handleLogin} className="space-y-4">
        <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} className="w-full p-3 border rounded" placeholder="Email" required/>
        <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} className="w-full p-3 border rounded" placeholder="Password" required/>
        <button className="w-full bg-indigo-600 text-white py-3 rounded font-bold hover:bg-indigo-700">Masuk</button>
      </form>
      <div className="mt-8 text-center text-xs text-gray-400 font-mono">© {new Date().getFullYear()} Liezira</div>
    </div>
  </div>
);

// ─── Navbar ────────────────────────────────────────────────────────────────
const AdminNavbar = ({ viewMode, setViewMode, onLeaderboard, onViolationRules, onLogout }) => (
  <div className="sticky top-0 z-40 bg-white shadow px-6 py-4 flex justify-between items-center mb-6">
    <h1 className="text-xl font-bold text-indigo-900">Admin Panel</h1>
    <div className="flex gap-2 flex-wrap justify-end">
      <button onClick={() => setViewMode('tokens')} className={`px-4 py-2 rounded ${viewMode === 'tokens' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600'}`}>Token</button>
      <button onClick={() => setViewMode('users')} className={`px-4 py-2 rounded flex items-center gap-2 ${viewMode === 'users' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600'}`}>
        <Users size={16}/> Users & Credits
      </button>
      <button onClick={() => setViewMode('soal')} className={`px-4 py-2 rounded ${viewMode === 'soal' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600'}`}>Bank Soal</button>
      <button onClick={onLeaderboard} className="px-4 py-2 rounded bg-yellow-100 text-yellow-700 font-bold flex items-center gap-2 hover:bg-yellow-200 transition">
        <Trophy size={16}/> Leaderboard
      </button>
      <button onClick={onViolationRules} className="px-4 py-2 rounded bg-orange-100 text-orange-700 font-bold flex items-center gap-2 hover:bg-orange-200 transition">
        <Shield size={16}/> Aturan Ujian
      </button>
      <button onClick={onLogout} className="text-red-600 px-3"><LogOut size={18}/></button>
    </div>
  </div>
);

// ─── App Orchestrator ─────────────────────────────────────────────────────
const UTBKAdminApp = () => {
  const a = useAdminState();

  if (a.isCheckingRole) return <RoleCheckScreen/>;
  if (a.screen === 'admin_login') {
    return (
      <LoginScreen
        adminEmail={a.adminEmail} setAdminEmail={a.setAdminEmail}
        adminPassword={a.adminPassword} setAdminPassword={a.setAdminPassword}
        handleLogin={a.handleLogin}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Modals */}
      {a.showPreviewModal && (
        <PreviewUploadModal
          previewData={a.previewData}
          selectedRows={a.selectedRows}
          isSending={a.isSending}
          onToggleRow={a.togglePreviewRow}
          onToggleAll={a.toggleAllPreviewRows}
          onExecute={a.executeBulkImport}
          onClose={() => { a.setShowPreviewModal(false); }}
        />
      )}
      {a.showLeaderboard && (
        <LeaderboardModal
          leaderboardData={a.leaderboardData}
          isLoading={a.isLeaderboardLoading}
          onClose={() => a.setShowLeaderboard(false)}
          onDownload={a.handleDownloadLeaderboard}
          onReset={a.resetLeaderboard}
        />
      )}
      {a.showCreditModal && (
        <BulkCreditModal
          userList={a.filteredUserList}
          selectedUserIds={a.selectedUserIds}
          bulkCreditAmount={a.bulkCreditAmount}
          isProcessing={a.isProcessingCredits}
          onToggleUser={a.toggleUserSelection}
          onSetAmount={a.setBulkCreditAmount}
          onSelectAll={a.handleSelectAllUsers}
          onExecute={a.executeBulkCredits}
          onClose={() => a.setShowCreditModal(false)}
        />
      )}
      {a.showViolationRules && <ViolationRulesModal onClose={() => a.setShowViolationRules(false)}/>}
      {a.showSoalImport && (
        <SoalImportModal
          previewSoal={a.previewSoal}
          selectedSubtest={a.selectedSubtest}
          onSave={a.saveBulkSoal}
          onClose={() => a.setShowSoalImport(false)}
        />
      )}

      {/* Navbar */}
      <AdminNavbar
        viewMode={a.viewMode}
        setViewMode={a.setViewMode}
        onLeaderboard={() => { a.setShowLeaderboard(true); a.fetchAllTokensForLeaderboard(); }}
        onViolationRules={() => a.setShowViolationRules(true)}
        onLogout={a.handleLogout}
      />

      {/* Views */}
      <div className="max-w-7xl mx-auto p-4 flex-1 w-full">
        {a.viewMode === 'tokens' ? (
          <TokensView
            tokenList={a.tokenList}
            activeTokens={a.activeTokens}
            usedTokens={a.usedTokens}
            expiredTokens={a.expiredTokens}
            filterStatus={a.filterStatus}
            onSetFilter={a.setFilterStatus}
            currentPage={a.currentPage}
            isNextAvailable={a.isNextAvailable}
            onFetchPage={a.fetchTokens}
            isSending={a.isSending}
            newTokenName={a.newTokenName} setNewTokenName={a.setNewTokenName}
            newTokenSchool={a.newTokenSchool} setNewTokenSchool={a.setNewTokenSchool}
            newTokenPhone={a.newTokenPhone} setNewTokenPhone={a.setNewTokenPhone}
            autoSendMode={a.autoSendMode} setAutoSendMode={a.setAutoSendMode}
            onCreateToken={a.createToken}
            onImportExcel={a.handleImportExcel}
            onDownloadExcel={a.handleDownloadExcel}
            onDeleteAll={a.deleteAllTokens}
            getFilteredList={a.getFilteredList}
            isExpiredFn={a.isExpiredFn}
            onSendFonnte={a.sendFonnteMessage}
            onSendManualWeb={a.sendManualWeb}
            onSendJsDirect={a.sendJsDirect}
            onResetScore={a.resetScore}
            onDeleteToken={a.deleteToken}
          />
        ) : a.viewMode === 'users' ? (
          <UsersView
            filteredUserList={a.filteredUserList}
            totalUsersCount={a.totalUsersCount}
            totalCreditsCount={a.totalCreditsCount}
            totalTokensCount={a.totalTokensCount}
            searchEmail={a.searchEmail}
            setSearchEmail={a.setSearchEmail}
            userCurrentPage={a.userCurrentPage}
            userIsNextAvailable={a.userIsNextAvailable}
            onFetchUsers={a.fetchUsers}
            onShowCreditModal={() => { a.setShowCreditModal(true); }}
            onAddCredits={a.handleAddCredits}
            onDeleteUser={a.handleDeleteUser}
          />
        ) : (
          <BankSoalView
            bankSoal={a.bankSoal}
            selectedSubtest={a.selectedSubtest} setSelectedSubtest={a.setSelectedSubtest}
            questionType={a.questionType}
            questionText={a.questionText} setQuestionText={a.setQuestionText}
            questionImage={a.questionImage} setQuestionImage={a.setQuestionImage}
            options={a.options} setOptions={a.setOptions}
            correctAnswer={a.correctAnswer} setCorrectAnswer={a.setCorrectAnswer}
            editingId={a.editingId}
            isUploading={a.isUploading}
            onTypeChange={a.handleTypeChange}
            onAddOrUpdate={a.addOrUpdate}
            onResetForm={a.resetForm}
            onLoadForEdit={a.loadSoalForEdit}
            onDeleteSoal={a.deleteSoal}
            onImageUpload={a.handleImageUpload}
            onDownloadTemplate={a.handleDownloadTemplateSoal}
            onImportSoalFile={a.handleImportSoalFile}
            onGenerateDummy={a.generateDummy}
          />
        )}
      </div>

      <div className="py-6 bg-white border-t border-gray-200 w-full text-center text-xs text-gray-400 font-mono">
        © {new Date().getFullYear()} Liezira Admin Panel
      </div>
    </div>
  );
};

export default UTBKAdminApp;