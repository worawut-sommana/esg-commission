import { useData } from '../context/DataContext';

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
    key: 'financierMap',
    label: 'จับคู่เงื่อนไขการขาย',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 2l4 4-4 4M3 6h18M7 22l-4-4 4-4M21 18H3" />
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

  return (
    <aside
      data-noprint
      className="w-[250px] flex-none bg-[var(--side-bg)] border-r border-[var(--side-bd)] flex flex-col sticky top-0 h-screen"
    >
      <div className="px-[22px] pt-[22px] pb-[18px] flex items-center gap-3 border-b border-[var(--side-bd)]">
        <div
          className="w-10 h-10 rounded-[11px] bg-[var(--ac)] flex items-center justify-center flex-none"
          style={{ boxShadow: '0 4px 12px -2px var(--ac)' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 17h14M6 17l1.5-5.5A2 2 0 0 1 9.4 10h5.2a2 2 0 0 1 1.9 1.5L18 17M7 17v2M17 17v2" />
          </svg>
        </div>
        <div>
          <div className="font-bold text-[15px] text-[var(--side-hd)] leading-[1.1]">ระบบค่าคอม</div>
          <div className="text-[11px] text-[var(--side-mut)] mt-[2px]">รถยนต์ · Dashboard</div>
        </div>
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

      <div className="px-[18px] py-4 border-t border-[var(--side-bd)] text-[11px] text-[var(--side-mut)] leading-[1.5]">
        ข้อมูลถูกจัดเก็บในฐานข้อมูลกลาง
        <br />({months.length} รอบวางบิล)
      </div>
    </aside>
  );
}
