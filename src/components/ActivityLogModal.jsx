import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { card } from '../lib/styles';
import { formatDateTime } from '../lib/format';

const ACTION_LABELS = {
  insert: { label: 'เพิ่ม', className: 'bg-[#ecfdf3] text-[#15803d]' },
  update: { label: 'แก้ไข', className: 'bg-[#eff6ff] text-[#1d4ed8]' },
  delete: { label: 'ลบ', className: 'bg-[#fef2f2] text-[#b91c1c]' },
};

export default function ActivityLogModal({ open, onClose, fetchFn }) {
  const [status, setStatus] = useState('loading');
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setStatus('loading');
    setError('');
    fetchFn()
      .then((data) => {
        setEntries(data);
        setStatus('ready');
      })
      .catch((err) => {
        setError(err.message || 'โหลดประวัติไม่สำเร็จ');
        setStatus('error');
      });
  }, [open, fetchFn]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8"
      onClick={onClose}
    >
      <div className={card + ' w-full max-w-[640px] my-auto'} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="font-bold text-[16px]">ประวัติการเปลี่ยนแปลง</div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-[8px] text-[#98a2b3] text-[18px] leading-none hover:bg-[#f4f6fa]"
          >
            ×
          </button>
        </div>

        {status === 'loading' && <div className="text-[#6b7686] text-[14px]">กำลังโหลด...</div>}
        {status === 'error' && (
          <div className="px-4 py-[12px] bg-[#fef2f2] border border-[#fecaca] rounded-xl text-[#b91c1c] text-[13.5px]">
            {error}
          </div>
        )}
        {status === 'ready' && (
          <div className="max-h-[60vh] overflow-y-auto flex flex-col gap-1">
            {entries.map((e) => {
              const a = ACTION_LABELS[e.action] || { label: e.action, className: 'bg-[#f4f6fa] text-[#5a6473]' };
              return (
                <div key={e.id} className="flex items-start gap-3 border-b border-[#f1f3f6] py-[10px]">
                  <span className={'shrink-0 px-[9px] py-[3px] rounded-full text-[11.5px] font-semibold ' + a.className}>
                    {a.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-semibold truncate">{e.summary || '-'}</div>
                    <div className="text-[12px] text-[#8a94a3] mt-[2px]">
                      {e.username || 'ไม่ทราบผู้ใช้'} · {formatDateTime(e.createdAt)}
                    </div>
                  </div>
                </div>
              );
            })}
            {!entries.length && (
              <div className="text-center p-8 text-[#98a2b3] text-sm">ยังไม่มีประวัติการเปลี่ยนแปลง</div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
