import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { btnPrimary } from './lib/styles';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Report from './pages/Report';
import Detail from './pages/Detail';
import Compare from './pages/Compare';
import Upload from './pages/Upload';
import ExternalData from './pages/ExternalData';
import SalesData from './pages/SalesData';
import FinancierMapping from './pages/FinancierMapping';
import VehicleRegistration from './pages/VehicleRegistration';
import Settings from './pages/Settings';

const ACCENT = '#3b5bdb';

const rootVars = {
  '--ac': ACCENT,
  '--side-bg': '#ffffff',
  '--side-bd': '#e9edf3',
  '--side-hd': '#1a2233',
  '--side-mut': '#98a2b3',
  '--side-mut-strong': '#5a6473',
  '--side-active-bg': 'rgba(59,91,219,0.10)',
};

function CenteredMessage({ children }) {
  return (
    <div className="flex-1 min-w-0 flex items-center justify-center px-[34px] py-[60px]">
      <div className="text-center max-w-sm">{children}</div>
    </div>
  );
}

function AppShell() {
  const [page, setPage] = useState('dash');
  const { status, error, reload, hasMonths } = useData();

  return (
    <div className="min-h-screen flex bg-[#eef1f5] text-[#1a2233]" style={rootVars}>
      <Sidebar page={page} setPage={setPage} />

      {status === 'loading' && (
        <CenteredMessage>
          <div className="text-[#6b7686] text-[14px]">กำลังโหลดข้อมูล...</div>
        </CenteredMessage>
      )}

      {status === 'error' && (
        <CenteredMessage>
          <div className="text-[#dc2626] text-[14px] font-semibold mb-3">โหลดข้อมูลไม่สำเร็จ</div>
          <div className="text-[#6b7686] text-[13px] mb-4">{error}</div>
          <button onClick={reload} className={btnPrimary}>
            ลองใหม่
          </button>
        </CenteredMessage>
      )}

      {status === 'ready' && !hasMonths && !['upload', 'external', 'salesData', 'financierMap', 'vehicleReg', 'settings'].includes(page) && (
        <CenteredMessage>
          <div className="font-bold text-[16px] mb-2">ยังไม่มีข้อมูลในระบบ</div>
          <div className="text-[#6b7686] text-[13.5px] mb-4">เริ่มต้นโดยอัปโหลดไฟล์ Excel รายคันของแบรนด์แรก</div>
          <button onClick={() => setPage('upload')} className={btnPrimary}>
            ไปหน้าอัปโหลดไฟล์
          </button>
        </CenteredMessage>
      )}

      {status === 'ready' && (hasMonths || ['upload', 'external', 'salesData', 'financierMap', 'vehicleReg', 'settings'].includes(page)) && (
        <main data-main className="flex-1 min-w-0 px-[34px] pt-[30px] pb-[60px] overflow-x-hidden">
          {page === 'dash' && <Dashboard />}
          {page === 'report' && <Report />}
          {page === 'detail' && <Detail />}
          {page === 'compare' && <Compare />}
          {page === 'upload' && <Upload setPage={setPage} />}
          {page === 'external' && <ExternalData />}
          {page === 'salesData' && <SalesData />}
          {page === 'financierMap' && <FinancierMapping />}
          {page === 'vehicleReg' && <VehicleRegistration />}
          {page === 'settings' && <Settings />}
        </main>
      )}
    </div>
  );
}

function Gate() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#eef1f5]">
        <div className="text-[#6b7686] text-[14px]">กำลังโหลด...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Login />;
  }

  return (
    <DataProvider>
      <AppShell />
    </DataProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
