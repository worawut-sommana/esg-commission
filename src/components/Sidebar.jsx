import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const DASH_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </svg>
);

const REPORT_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6M8 13h8M8 17h5" />
  </svg>
);

const DETAIL_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M3 12h18M3 18h18" />
  </svg>
);

const COMPARE_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18" />
    <path d="M7 14l3-3 3 3 5-6" />
  </svg>
);

const UPLOAD_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 15V3M8 7l4-4 4 4M20 17v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3" />
  </svg>
);

const EXTERNAL_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </svg>
);

const SALES_DATA_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 9h18M8 4v5" />
  </svg>
);

const FINANCIER_MAP_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 2l4 4-4 4M3 6h18M7 22l-4-4 4-4M21 18H3" />
  </svg>
);

const VEHICLE_REG_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="7" width="18" height="10" rx="2" />
    <path d="M7 17v2M17 17v2M3 12h18" />
  </svg>
);

const VEHICLE_CAMPAIGN_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41L11 3.83A2 2 0 0 0 9.59 3.17H4a1 1 0 0 0-1 1v5.59a2 2 0 0 0 .59 1.41l9.58 9.58a2 2 0 0 0 2.83 0l4.59-4.59a2 2 0 0 0 0-2.75z" />
    <circle cx="7.5" cy="7.5" r="1.5" />
  </svg>
);

const SETTINGS_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const CHEVRON_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

const NAV = [
  { key: 'dash', label: 'ภาพรวม', icon: DASH_ICON },
  {
    key: 'reports',
    label: 'รายงาน',
    icon: REPORT_ICON,
    children: [
      { key: 'report', label: 'รายงานสรุป', icon: REPORT_ICON },
      { key: 'detail', label: 'รายละเอียดรายคัน', icon: DETAIL_ICON },
      { key: 'compare', label: 'เปรียบเทียบเดือน', icon: COMPARE_ICON },
    ],
  },
  { key: 'upload', label: 'อัปโหลดไฟล์วางบิล', icon: UPLOAD_ICON },
  { key: 'financierMap', label: 'จับคู่เงื่อนไขการขาย', icon: FINANCIER_MAP_ICON },
  { key: 'external', label: 'ข้อมูลจาก L-one (API)', icon: EXTERNAL_ICON },
  { key: 'salesData', label: 'ข้อมูลการขาย', icon: SALES_DATA_ICON },
  {
    key: 'masterData',
    label: 'Master Data',
    icon: VEHICLE_REG_ICON,
    children: [
      { key: 'vehicleReg', label: 'ตารางค่าทะเบียนรถ', icon: VEHICLE_REG_ICON },
      { key: 'vehicleCampaign', label: 'ตารางแคมเปญ', icon: VEHICLE_CAMPAIGN_ICON },
    ],
  },
  { key: 'settings', label: 'ตั้งค่า', icon: SETTINGS_ICON },
];

function NavButton({ item, active, onClick, indent }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 px-[13px] py-[11px] border-none rounded-[11px] text-[14px] font-semibold cursor-pointer text-left w-full transition-colors"
      style={{
        paddingLeft: indent ? 38 : 13,
        background: active ? 'var(--side-active-bg)' : 'transparent',
        color: active ? 'var(--ac)' : 'var(--side-mut-strong)',
      }}
    >
      <span className="flex items-center justify-center" style={{ color: active ? 'var(--ac)' : 'var(--side-mut)' }}>
        {item.icon}
      </span>
      <span>{item.label}</span>
    </button>
  );
}

export default function Sidebar({ page, setPage }) {
  const { user, logout } = useAuth();
  const [openGroups, setOpenGroups] = useState(() =>
    new Set(NAV.filter((n) => n.children?.some((c) => c.key === page)).map((n) => n.key))
  );

  const toggleGroup = (key) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <aside
      data-noprint
      className="w-[250px] flex-none bg-[var(--side-bg)] border-r border-[var(--side-bd)] flex flex-col sticky top-0 h-screen"
    >
      <div className="px-[22px] pt-[22px] pb-[18px] border-b border-[var(--side-bd)]">
        <img src="/logo.png" alt="EAKSAHA GROUP" className="w-full max-w-[190px] h-auto" />
        <div className="text-[11px] text-[var(--side-mut)] mt-2">ระบบค่าคอมรถยนต์ · Dashboard</div>
      </div>

      <nav className="p-3 flex flex-col gap-1 flex-1 min-h-0 overflow-y-auto">
        {NAV.map((n) => {
          if (n.children) {
            const open = openGroups.has(n.key);
            const groupActive = n.children.some((c) => c.key === page);
            return (
              <div key={n.key}>
                <button
                  onClick={() => toggleGroup(n.key)}
                  className="flex items-center gap-3 px-[13px] py-[11px] border-none rounded-[11px] text-[14px] font-semibold cursor-pointer text-left w-full transition-colors"
                  style={{
                    background: groupActive && !open ? 'var(--side-active-bg)' : 'transparent',
                    color: groupActive ? 'var(--ac)' : 'var(--side-mut-strong)',
                  }}
                >
                  <span className="flex items-center justify-center" style={{ color: groupActive ? 'var(--ac)' : 'var(--side-mut)' }}>
                    {n.icon}
                  </span>
                  <span className="flex-1">{n.label}</span>
                  <span
                    className="flex items-center justify-center transition-transform"
                    style={{ color: 'var(--side-mut)', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
                  >
                    {CHEVRON_ICON}
                  </span>
                </button>
                {open && (
                  <div className="flex flex-col gap-1 mt-1">
                    {n.children.map((c) => (
                      <NavButton key={c.key} item={c} active={page === c.key} onClick={() => setPage(c.key)} indent />
                    ))}
                  </div>
                )}
              </div>
            );
          }
          return <NavButton key={n.key} item={n} active={page === n.key} onClick={() => setPage(n.key)} />;
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
    </aside>
  );
}
