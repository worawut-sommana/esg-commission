import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { card, thL, thC, tdL, tdC, btnPrimary, btnGhost, selectStyle } from '../lib/styles';
import { fi, formatDateTime } from '../lib/format';
import {
  fetchVehicleModels,
  createVehicleModel,
  updateVehicleModel,
  deleteVehicleModel,
  syncVehicleModelsFromSales,
  fetchVehicleModelActivity,
} from '../lib/api';
import ActivityLogModal from '../components/ActivityLogModal';
import SortTh from '../components/SortTh';

const EMPTY_FORM = { brand: '', model: '' };

const inputCls = 'px-3 py-[9px] border border-[#d7dce4] rounded-[10px] text-[13.5px]';

function getSortValue(r, key) {
  switch (key) {
    case 'brand':
      return (r.brand || '').toLowerCase();
    case 'model':
      return (r.model || '').toLowerCase();
    case 'updatedBy':
      return (r.updatedBy || '').toLowerCase();
    default:
      return '';
  }
}

export default function VehicleModel() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [error, setError] = useState('');

  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showActivity, setShowActivity] = useState(false);

  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const [sortKey, setSortKey] = useState('brand');
  const [sortDir, setSortDir] = useState('asc');

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const [filterSearch, setFilterSearch] = useState('');
  const [filterBrand, setFilterBrand] = useState('');

  const brandOptions = useMemo(() => [...new Set(rows.map((r) => r.brand))].sort(), [rows]);

  const filteredRows = useMemo(() => {
    const q = filterSearch.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (filterBrand && r.brand !== filterBrand) return false;
        if (q && !(r.brand.toLowerCase().includes(q) || r.model.toLowerCase().includes(q))) return false;
        return true;
      })
      .sort((a, b) => {
        const av = getSortValue(a, sortKey);
        const bv = getSortValue(b, sortKey);
        const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [rows, filterSearch, filterBrand, sortKey, sortDir]);

  const hasActiveFilters = !!(filterSearch || filterBrand);

  const onClearFilters = () => {
    setFilterSearch('');
    setFilterBrand('');
  };

  const load = async () => {
    setStatus('loading');
    setError('');
    try {
      setRows(await fetchVehicleModels());
      setStatus('ready');
    } catch (err) {
      setError(err.message || 'โหลดข้อมูลไม่สำเร็จ');
      setStatus('error');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSync = async () => {
    setSyncing(true);
    setSyncMessage('');
    setError('');
    try {
      const result = await syncVehicleModelsFromSales();
      setSyncMessage(
        result.insertedCount ? `ดึงข้อมูลใหม่เพิ่ม ${fi(result.insertedCount)} รายการ` : 'ไม่มีรายการใหม่ — ทะเบียนเป็นปัจจุบันแล้ว'
      );
      await load();
    } catch (err) {
      setError(err.message || 'ดึงข้อมูลจากข้อมูลการขายไม่สำเร็จ');
    } finally {
      setSyncing(false);
    }
  };

  const onCreate = async () => {
    if (!form.brand.trim() || !form.model.trim()) return;
    setCreating(true);
    setError('');
    try {
      const created = await createVehicleModel(form);
      setRows((prev) => [...prev, created]);
      setForm(EMPTY_FORM);
      setShowAddModal(false);
    } catch (err) {
      setError(err.message || 'เพิ่มข้อมูลไม่สำเร็จ');
    } finally {
      setCreating(false);
    }
  };

  const onCloseAddModal = () => {
    setShowAddModal(false);
    setForm(EMPTY_FORM);
    setError('');
  };

  const startEdit = (row) => {
    setEditItem(row);
    setEditForm({ brand: row.brand, model: row.model });
    setError('');
  };

  const onCloseEditModal = () => {
    setEditItem(null);
    setEditForm(EMPTY_FORM);
    setError('');
  };

  const onSaveEdit = async () => {
    if (!editItem || !editForm.brand.trim() || !editForm.model.trim()) return;
    setSaving(true);
    setError('');
    try {
      const updated = await updateVehicleModel(editItem.id, editForm);
      setRows((prev) => prev.map((r) => (r.id === editItem.id ? updated : r)));
      onCloseEditModal();
    } catch (err) {
      setError(err.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const onConfirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setBusyId(id);
    setError('');
    try {
      await deleteVehicleModel(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
      setDeleteTarget(null);
    } catch (err) {
      setError(err.message || 'ลบไม่สำเร็จ');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="appfade">
      <div className="mb-[22px] flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs font-semibold tracking-[0.06em] uppercase text-[var(--ac)] mb-[6px]">ข้อมูลหลัก</div>
          <h1 className="m-0 text-[27px] font-bold tracking-[-0.01em]">ทะเบียนยี่ห้อ รุ่นรถ</h1>
          <div className="text-[#6b7686] text-[13.5px] mt-[6px]">
            รายการแบรนด์และรุ่นรถทั้งหมด — ดึงจากข้อมูลการขายอัตโนมัติ หรือเพิ่ม/แก้ไขเองได้
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowActivity(true)} className={btnGhost}>
            ประวัติการเปลี่ยนแปลง
          </button>
          <button onClick={onSync} disabled={syncing} className={btnPrimary + ' disabled:opacity-60 disabled:cursor-not-allowed'}>
            {syncing ? 'กำลังดึงข้อมูล...' : 'ดึงจากข้อมูลการขาย'}
          </button>
          <button onClick={() => setShowAddModal(true)} className={btnPrimary}>
            + เพิ่มรายการ
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className="mb-5 px-4 py-[14px] bg-[#ecfdf3] border border-[#bbf7d0] rounded-xl text-[#15803d] text-[13.5px]">
          {syncMessage}
        </div>
      )}

      {status === 'loading' && <div className="text-[#6b7686] text-[14px]">กำลังโหลด...</div>}

      {status === 'error' && (
        <div className="px-4 py-[14px] bg-[#fef2f2] border border-[#fecaca] rounded-xl text-[#b91c1c] text-[13.5px]">{error}</div>
      )}

      {status === 'ready' && (
        <div className={card}>
          {error && (
            <div className="mb-4 px-4 py-[12px] bg-[#fef2f2] border border-[#fecaca] rounded-xl text-[#b91c1c] text-[13.5px]">
              {error}
            </div>
          )}

          <div className="flex items-end gap-3 flex-wrap mb-5">
            <label className="flex flex-col gap-[6px] text-[12.5px] text-[#6b7686] font-semibold flex-1 min-w-[200px]">
              ค้นหา
              <input
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                placeholder="ค้นหาแบรนด์หรือรุ่นรถ"
                className={inputCls}
              />
            </label>
            <label className="flex flex-col gap-[6px] text-[12.5px] text-[#6b7686] font-semibold">
              แบรนด์
              <select value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)} className={selectStyle + ' min-w-[140px]!'}>
                <option value="">ทั้งหมด</option>
                {brandOptions.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>
            {hasActiveFilters && (
              <button onClick={onClearFilters} className={btnGhost}>
                ล้างตัวกรอง
              </button>
            )}
            <div className="text-[12.5px] text-[#8a94a3] ml-auto pb-[10px]">
              แสดง {fi(filteredRows.length)} จาก {fi(rows.length)} รายการ
            </div>
          </div>

          <div className="overflow-x-auto mb-6">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#f4f6fa]">
                  <SortTh label="แบรนด์" col="brand" className={thL} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortTh label="รุ่นรถ" col="model" className={thL} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortTh
                    label="แก้ไขล่าสุดโดย"
                    col="updatedBy"
                    className={thL}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                  />
                  <th className={thC}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r) => (
                  <tr key={r.id} className="border-b border-[#eef1f5]">
                    <td className={tdL + ' font-bold'}>{r.brand}</td>
                    <td className={tdL}>{r.model}</td>
                    <td className={tdL + ' text-[#8a94a3] text-[12px]'} title={`เพิ่มโดย ${r.createdBy || '-'} · ${formatDateTime(r.createdAt)}`}>
                      {r.updatedBy || '-'}
                      <div className="text-[11px]">{formatDateTime(r.updatedAt)}</div>
                    </td>
                    <td className={tdC}>
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => startEdit(r)}
                          className="px-[10px] py-[6px] bg-white border border-[#d7dce4] rounded-[8px] text-[12px] font-semibold text-[#5a6473]"
                        >
                          แก้ไข
                        </button>
                        <button
                          onClick={() => setDeleteTarget(r)}
                          disabled={busyId === r.id}
                          className="px-[10px] py-[6px] bg-white border border-[#fecaca] text-[#b91c1c] rounded-[8px] text-[12px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={4} className="text-center p-11 text-[#98a2b3] text-sm">
                      ยังไม่มีข้อมูลทะเบียนยี่ห้อ รุ่นรถ — กดปุ่ม "ดึงจากข้อมูลการขาย" หรือ "+ เพิ่มรายการ" ด้านบนเพื่อเริ่มต้น
                    </td>
                  </tr>
                )}
                {rows.length > 0 && !filteredRows.length && (
                  <tr>
                    <td colSpan={4} className="text-center p-11 text-[#98a2b3] text-sm">
                      ไม่พบรายการที่ตรงกับตัวกรอง
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAddModal &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8">
            <div className={card + ' w-full max-w-[480px] my-auto'}>
              <div className="flex items-center justify-between mb-5">
                <div className="font-bold text-[16px]">เพิ่มรายการใหม่</div>
                <button
                  onClick={onCloseAddModal}
                  className="w-8 h-8 flex items-center justify-center rounded-[8px] text-[#98a2b3] text-[18px] leading-none hover:bg-[#f4f6fa]"
                >
                  ×
                </button>
              </div>

              {error && (
                <div className="mb-4 px-4 py-[12px] bg-[#fef2f2] border border-[#fecaca] rounded-xl text-[#b91c1c] text-[13.5px]">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-[6px] text-[12.5px] text-[#6b7686] font-semibold">
                  แบรนด์
                  <input
                    value={form.brand}
                    onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                    className={inputCls}
                    autoFocus
                  />
                </label>
                <label className="flex flex-col gap-[6px] text-[12.5px] text-[#6b7686] font-semibold">
                  รุ่นรถ
                  <input
                    value={form.model}
                    onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                    className={inputCls}
                  />
                </label>
              </div>

              <div className="flex gap-[10px] justify-end mt-6">
                <button onClick={onCloseAddModal} className={btnGhost}>
                  ยกเลิก
                </button>
                <button
                  onClick={onCreate}
                  disabled={creating || !form.brand.trim() || !form.model.trim()}
                  className={btnPrimary + ' disabled:opacity-60 disabled:cursor-not-allowed'}
                >
                  {creating ? 'กำลังเพิ่ม...' : 'เพิ่มรายการ'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {editItem &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8"
            onClick={onCloseEditModal}
          >
            <div className={card + ' w-full max-w-[480px] my-auto'} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <div className="font-bold text-[16px]">แก้ไขรายการ</div>
                <button
                  onClick={onCloseEditModal}
                  className="w-8 h-8 flex items-center justify-center rounded-[8px] text-[#98a2b3] text-[18px] leading-none hover:bg-[#f4f6fa]"
                >
                  ×
                </button>
              </div>

              {error && (
                <div className="mb-4 px-4 py-[12px] bg-[#fef2f2] border border-[#fecaca] rounded-xl text-[#b91c1c] text-[13.5px]">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-[6px] text-[12.5px] text-[#6b7686] font-semibold">
                  แบรนด์
                  <input
                    value={editForm.brand}
                    onChange={(e) => setEditForm((f) => ({ ...f, brand: e.target.value }))}
                    className={inputCls}
                    autoFocus
                  />
                </label>
                <label className="flex flex-col gap-[6px] text-[12.5px] text-[#6b7686] font-semibold">
                  รุ่นรถ
                  <input
                    value={editForm.model}
                    onChange={(e) => setEditForm((f) => ({ ...f, model: e.target.value }))}
                    className={inputCls}
                  />
                </label>
              </div>

              <div className="flex gap-[10px] justify-end mt-6">
                <button onClick={onCloseEditModal} className={btnGhost}>
                  ยกเลิก
                </button>
                <button
                  onClick={onSaveEdit}
                  disabled={saving || !editForm.brand.trim() || !editForm.model.trim()}
                  className={btnPrimary + ' disabled:opacity-60 disabled:cursor-not-allowed'}
                >
                  {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {deleteTarget &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8"
            onClick={() => setDeleteTarget(null)}
          >
            <div className={card + ' w-full max-w-[420px] my-auto'} onClick={(e) => e.stopPropagation()}>
              <div className="font-bold text-[16px] mb-2">ยืนยันการลบ</div>
              <div className="text-[13.5px] text-[#5a6473] mb-5">
                ต้องการลบ <span className="font-semibold">{deleteTarget.brand} {deleteTarget.model}</span> ใช่หรือไม่?
                การลบไม่สามารถย้อนกลับได้
              </div>

              {error && (
                <div className="mb-4 px-4 py-[12px] bg-[#fef2f2] border border-[#fecaca] rounded-xl text-[#b91c1c] text-[13.5px]">
                  {error}
                </div>
              )}

              <div className="flex gap-[10px] justify-end">
                <button onClick={() => setDeleteTarget(null)} className={btnGhost}>
                  ยกเลิก
                </button>
                <button
                  onClick={onConfirmDelete}
                  disabled={busyId === deleteTarget.id}
                  className="px-[18px] py-[10px] bg-[#dc2626] text-white border-none rounded-[11px] text-[13.5px] font-semibold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {busyId === deleteTarget.id ? 'กำลังลบ...' : 'ลบ'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      <ActivityLogModal open={showActivity} onClose={() => setShowActivity(false)} fetchFn={fetchVehicleModelActivity} />
    </section>
  );
}
