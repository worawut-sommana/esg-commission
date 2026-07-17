import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

const NAV = [
  {
    key: 'dash',
    label: 'ภาพรวม',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    ),
  },
  {
    key: 'report',
    label: 'รายงานสรุป',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M8 13h8M8 17h5" />
      </svg>
    ),
  },
  {
    key: 'detail',
    label: 'รายละเอียดรายคัน',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18M3 12h18M3 18h18" />
      </svg>
    ),
  },
  {
    key: 'compare',
    label: 'เปรียบเทียบเดือน',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="M7 14l3-3 3 3 5-6" />
      </svg>
    ),
  },
  {
    key: 'upload',
    label: 'อัปโหลดไฟล์',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 15V3M8 7l4-4 4 4M20 17v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3" />
      </svg>
    ),
  },
  {
    key: 'external',
    label: 'ข้อมูลภายนอก',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
      </svg>
    ),
  },
  {
    key: 'salesData',
    label: 'ข้อมูลการขาย',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 9h18M8 4v5" />
      </svg>
    ),
  },
  {
    key: 'financierMap',
    label: 'จับคู่เงื่อนไขการขาย',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 2l4 4-4 4M3 6h18M7 22l-4-4 4-4M21 18H3" />
      </svg>
    ),
  },
  {
    key: 'vehicleReg',
    label: 'ตารางค่าทะเบียนรถ',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="7" width="18" height="10" rx="2" />
        <path d="M7 17v2M17 17v2M3 12h18" />
      </svg>
    ),
  },
  {
    key: 'settings',
    label: 'ตั้งค่า',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

export default function Sidebar({ page, setPage }) {
  const { months } = useData();
  const { user, logout } = useAuth();

  return (
    <aside
      data-noprint
      className="w-[250px] flex-none bg-[var(--side-bg)] border-r border-[var(--side-bd)] flex flex-col sticky top-0 h-screen"
    >
      <div className="px-[22px] pt-[22px] pb-[18px] border-b border-[var(--side-bd)]">
        <img src="/logo.png" alt="EAKSAHA GROUP" className="w-full max-w-[190px] h-auto" />
        <div className="text-[11px] text-[var(--side-mut)] mt-2">ระบบค่าคอมรถยนต์ · Dashboard</div>
      </div>

      <nav className="p-3 flex flex-col gap-1 flex-1">
        {NAV.map((n) => {
          const on = page === n.key;
          return (
            <button
              key={n.key}
              onClick={() => setPage(n.key)}
              className="flex items-center gap-3 px-[13px] py-[11px] border-none rounded-[11px] text-[14px] font-semibold cursor-pointer text-left w-full transition-colors"
              style={{
                background: on ? 'var(--side-active-bg)' : 'transparent',
                color: on ? 'var(--ac)' : 'var(--side-mut-strong)',
              }}
            >
              <span className="flex items-center justify-center" style={{ color: on ? 'var(--ac)' : 'var(--side-mut)' }}>
                {n.icon}
              </span>
              <span>{n.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="px-[18px] py-3 border-t border-[var(--side-bd)] flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-[var(--side-hd)] truncate">{user?.username}</div>
          <div className="text-[11px] text-[var(--side-mut)]">{user?.isAdmin ? 'ผู้ดูแลระบบ' : 'ผู้ใช้งาน'}</div>
        </div>
        <button
          onClick={logout}
          title="ออกจากระบบ"
          className="flex-none w-8 h-8 flex items-center justify-center rounded-[9px] border border-[var(--side-bd)] text-[var(--side-mut-strong)] bg-white cursor-pointer"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
        </button>
      </div>

      <div className="px-[18px] py-4 border-t border-[var(--side-bd)] text-[11px] text-[var(--side-mut)] leading-[1.5]">
        ข้อมูลถูกจัดเก็บในฐานข้อมูลกลาง
        <br />({months.length} รอบวางบิล)
      </div>
    </aside>
  );
}
