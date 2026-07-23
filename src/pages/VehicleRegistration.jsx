import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { card, thL, thC, thR, tdL, tdC, tdR, btnPrimary, btnGhost, selectStyle } from '../lib/styles';
import { f2, fi, formatDateTime } from '../lib/format';
import {
  fetchVehicleRegistrations,
  createVehicleRegistration,
  updateVehicleRegistration,
  deleteVehicleRegistration,
  importVehicleRegistrations,
  fetchVehicleRegistrationActivity,
} from '../lib/api';
import { readVehicleRegistrationExcelFile, downloadVehicleRegistrationTemplate } from '../lib/vehicleRegistrationExcel';
import ActivityLogModal from '../components/ActivityLogModal';
import SortTh from '../components/SortTh';

const VEHICLE_TYPES = ['EV', 'น้ำมัน', 'EV+น้ำมัน'];

const EMPTY_FORM = { brand: '', importType: 'EV', model: '', year: '', weight: '', registrationFee: '', customerFee: '' };

const inputCls = 'px-3 py-[9px] border border-[#d7dce4] rounded-[10px] text-[13.5px]';

function getSortValue(r, key) {
  switch (key) {
    case 'brand':
      return (r.brand || '').toLowerCase();
    case 'importType':
      return (r.importType || '').toLowerCase();
    case 'model':
      return (r.model || '').toLowerCase();
    case 'year':
      return (r.year || '').toLowerCase();
    case 'weight':
      return Number(r.weight) || 0;
    case 'registrationFee':
      return Number(r.registrationFee) || 0;
    case 'customerFee':
      return Number(r.customerFee) || 0;
    case 'diff':
      return Number(r.diff) || 0;
    case 'updatedBy':
      return (r.updatedBy || '').toLowerCase();
    default:
      return '';
  }
}

export default function VehicleRegistration() {
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

  const fileInputRef = useRef(null);
  const [importDraft, setImportDraft] = useState(null); // array of { include, brand, importType, model, year, registrationFee, customerFee } | null
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);

  const [filterSearch, setFilterSearch] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterImportType, setFilterImportType] = useState('');
  const [filterYear, setFilterYear] = useState('');

  const brandOptions = useMemo(() => [...new Set(rows.map((r) => r.brand))].sort(), [rows]);
  const yearOptions = useMemo(() => [...new Set(rows.map((r) => r.year).filter(Boolean))].sort(), [rows]);

  const filteredRows = useMemo(() => {
    const q = filterSearch.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (filterBrand && r.brand !== filterBrand) return false;
        if (filterImportType && r.importType !== filterImportType) return false;
        if (filterYear && r.year !== filterYear) return false;
        if (q && !(r.brand.toLowerCase().includes(q) || r.model.toLowerCase().includes(q))) return false;
        return true;
      })
      .sort((a, b) => {
        const av = getSortValue(a, sortKey);
        const bv = getSortValue(b, sortKey);
        const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [rows, filterSearch, filterBrand, filterImportType, filterYear, sortKey, sortDir]);

  const hasActiveFilters = !!(filterSearch || filterBrand || filterImportType || filterYear);

  const onClearFilters = () => {
    setFilterSearch('');
    setFilterBrand('');
    setFilterImportType('');
    setFilterYear('');
  };

  const load = async () => {
    setStatus('loading');
    setError('');
    try {
      setRows(await fetchVehicleRegistrations());
      setStatus('ready');
    } catch (err) {
      setError(err.message || 'โหลดข้อมูลไม่สำเร็จ');
      setStatus('error');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onCreate = async () => {
    if (!form.brand.trim() || !form.model.trim()) return;
    setCreating(true);
    setError('');
    try {
      const created = await createVehicleRegistration(form);
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
    setEditForm({
      brand: row.brand,
      importType: row.importType,
      model: row.model,
      year: row.year,
      weight: row.weight,
      registrationFee: row.registrationFee,
      customerFee: row.customerFee,
    });
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
      const updated = await updateVehicleRegistration(editItem.id, editForm);
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
      await deleteVehicleRegistration(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
      setDeleteTarget(null);
    } catch (err) {
      setError(err.message || 'ลบไม่สำเร็จ');
    } finally {
      setBusyId(null);
    }
  };

  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  const onDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      await downloadVehicleRegistrationTemplate();
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const onPickExcelFile = () => fileInputRef.current?.click();

  const onExcelFileSelected = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setImportError('');
    try {
      const parsed = await readVehicleRegistrationExcelFile(file);
      setImportDraft(parsed.map((r) => ({ ...r, include: true })));
    } catch (err) {
      setImportDraft(null);
      setImportError(err.message || 'อ่านไฟล์ไม่สำเร็จ');
    }
  };

  const updateDraftRow = (i, patch) => {
    setImportDraft((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  const onCancelImport = () => {
    setImportDraft(null);
    setImportError('');
  };

  const onConfirmImport = async () => {
    const toImport = importDraft.filter((r) => r.include);
    if (!toImport.length) return;
    setImporting(true);
    setImportError('');
    try {
      const inserted = await importVehicleRegistrations(toImport);
      setRows((prev) => [...prev, ...inserted]);
      setImportDraft(null);
    } catch (err) {
      setImportError(err.message || 'นำเข้าไม่สำเร็จ');
    } finally {
      setImporting(false);
    }
  };

  return (
    <section className="appfade">
      <div className="mb-[22px] flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs font-semibold tracking-[0.06em] uppercase text-[var(--ac)] mb-[6px]">ข้อมูลหลัก</div>
          <h1 className="m-0 text-[27px] font-bold tracking-[-0.01em]">ตารางค่าทะเบียนรถ</h1>
          <div className="text-[#6b7686] text-[13.5px] mt-[6px]">
            ข้อมูลค่าจดทะเบียนแต่ละรุ่น — แบรนด์ ประเภท รุ่นรถ ประจำปี ค่าจดทะเบียน และยอดเก็บลูกค้า
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowActivity(true)} className={btnGhost}>
            ประวัติการเปลี่ยนแปลง
          </button>
          <button onClick={onDownloadTemplate} disabled={downloadingTemplate} className={btnGhost + ' disabled:opacity-60 disabled:cursor-not-allowed'}>
            ดาวน์โหลดเทมเพลต
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={onExcelFileSelected} className="hidden" />
          <button onClick={onPickExcelFile} className={btnPrimary}>
            นำเข้าจาก Excel
          </button>
          <button onClick={() => setShowAddModal(true)} className={btnPrimary}>
            + เพิ่มรายการ
          </button>
        </div>
      </div>

      {importError && !importDraft && (
        <div className="mb-5 px-4 py-[14px] bg-[#fef2f2] border border-[#fecaca] rounded-xl text-[#b91c1c] text-[13.5px]">
          {importError}
        </div>
      )}

      {importDraft && (
        <div className={'mb-6 ' + card}>
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div>
              <div className="font-bold text-[15px]">ตรวจสอบข้อมูลก่อนนำเข้า ({importDraft.length} รายการ)</div>
              <div className="text-[12.5px] text-[#8a94a3] mt-1">ตรวจสอบ/แก้ไขข้อมูล แล้วเลือกรายการที่ต้องการนำเข้าจริง</div>
            </div>
          </div>

          {importDraft.some((r) => r.diffMismatch) && (
            <div className="mb-4 px-4 py-[12px] bg-[#fffbeb] border border-[#fde68a] rounded-xl text-[#92400e] text-[13.5px]">
              พบ {importDraft.filter((r) => r.diffMismatch).length} รายการที่ค่า "ส่วนต่าง" ในไฟล์ไม่ตรงกับค่าที่คำนวณจาก
              เก็บลูกค้า − ค่าจดทะเบียน (ไฮไลต์สีส้มด้านล่าง) — ระบบจะบันทึกส่วนต่างตามค่าที่คำนวณได้เสมอ กรุณาตรวจสอบตัวเลขให้ถูกต้อง
            </div>
          )}

          {importError && (
            <div className="mb-4 px-4 py-[12px] bg-[#fef2f2] border border-[#fecaca] rounded-xl text-[#b91c1c] text-[13.5px]">
              {importError}
            </div>
          )}

          <div className="overflow-x-auto mb-5 border border-[#eef1f5] rounded-xl">
            <div className="overflow-auto max-h-[420px]">
              <table className="w-full border-collapse text-[13px]">
                <thead className="sticky top-0">
                  <tr className="bg-[#f4f6fa]">
                    <th className={thC}></th>
                    <th className={thL}>แบรนด์</th>
                    <th className={thC}>ประเภท</th>
                    <th className={thL}>รุ่นรถ</th>
                    <th className={thC}>ประจำปี</th>
                    <th className={thR}>น้ำหนัก</th>
                    <th className={thR}>ค่าจดทะเบียน</th>
                    <th className={thR}>เก็บลูกค้า</th>
                    <th className={thR}>ส่วนต่าง</th>
                  </tr>
                </thead>
                <tbody>
                  {importDraft.map((r, i) => {
                    const computedDiff = (Number(r.customerFee) || 0) - (Number(r.registrationFee) || 0);
                    return (
                    <tr key={i} className={'border-b border-[#eef1f5] bg-white' + (r.include ? '' : ' opacity-40')}>
                      <td className={tdC}>
                        <input
                          type="checkbox"
                          checked={r.include}
                          onChange={(e) => updateDraftRow(i, { include: e.target.checked })}
                        />
                      </td>
                      <td className={tdL}>
                        <input
                          value={r.brand}
                          onChange={(e) => updateDraftRow(i, { brand: e.target.value })}
                          className={inputCls + ' w-[100px]'}
                        />
                      </td>
                      <td className={tdC}>
                        <select
                          value={r.importType}
                          onChange={(e) => updateDraftRow(i, { importType: e.target.value })}
                          className={inputCls + ' w-[90px]'}
                        >
                          <option value="">-</option>
                          {VEHICLE_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className={tdL}>
                        <input
                          value={r.model}
                          onChange={(e) => updateDraftRow(i, { model: e.target.value })}
                          className={inputCls + ' w-[220px]'}
                        />
                      </td>
                      <td className={tdC}>
                        <input
                          value={r.year}
                          onChange={(e) => updateDraftRow(i, { year: e.target.value })}
                          className={inputCls + ' w-[80px] text-center'}
                        />
                      </td>
                      <td className={tdR}>
                        <input
                          value={r.weight}
                          onChange={(e) => updateDraftRow(i, { weight: e.target.value })}
                          inputMode="decimal"
                          className={inputCls + ' w-[90px] text-right'}
                        />
                      </td>
                      <td className={tdR}>
                        <input
                          value={r.registrationFee}
                          onChange={(e) => updateDraftRow(i, { registrationFee: e.target.value })}
                          inputMode="decimal"
                          className={inputCls + ' w-[100px] text-right'}
                        />
                      </td>
                      <td className={tdR}>
                        <input
                          value={r.customerFee}
                          onChange={(e) => updateDraftRow(i, { customerFee: e.target.value })}
                          inputMode="decimal"
                          className={inputCls + ' w-[100px] text-right'}
                        />
                      </td>
                      <td
                        className={tdR + ' font-semibold' + (r.diffMismatch ? ' bg-[#fff7ed] text-[#c2410c]' : ' text-[#98a2b3]')}
                        title={r.diffMismatch ? `ค่าในไฟล์: ${f2(r.importedDiff)}` : undefined}
                      >
                        {f2(computedDiff)}
                        {r.diffMismatch && (
                          <div className="text-[11px] font-normal">ไฟล์: {f2(r.importedDiff)}</div>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-[10px] justify-end">
            <button onClick={onCancelImport} className={btnGhost}>
              ยกเลิก
            </button>
            <button
              onClick={onConfirmImport}
              disabled={importing || !importDraft.some((r) => r.include)}
              className={btnPrimary + ' disabled:opacity-60 disabled:cursor-not-allowed'}
            >
              {importing ? 'กำลังนำเข้า...' : `นำเข้า ${importDraft.filter((r) => r.include).length} รายการ`}
            </button>
          </div>
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
            <label className="flex flex-col gap-[6px] text-[12.5px] text-[#6b7686] font-semibold">
              ประเภท
              <select
                value={filterImportType}
                onChange={(e) => setFilterImportType(e.target.value)}
                className={selectStyle + ' min-w-[120px]!'}
              >
                <option value="">ทั้งหมด</option>
                {VEHICLE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-[6px] text-[12.5px] text-[#6b7686] font-semibold">
              ประจำปี
              <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className={selectStyle + ' min-w-[110px]!'}>
                <option value="">ทั้งหมด</option>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
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
                  <SortTh label="ประเภท" col="importType" align="center" className={thC} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortTh label="รุ่นรถ" col="model" className={thL} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortTh label="ประจำปี" col="year" align="center" className={thC} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortTh label="น้ำหนัก" col="weight" align="right" className={thR} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortTh
                    label="ค่าจดทะเบียน"
                    col="registrationFee"
                    align="right"
                    className={thR}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                  />
                  <SortTh
                    label="เก็บลูกค้า"
                    col="customerFee"
                    align="right"
                    className={thR}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                  />
                  <SortTh label="ส่วนต่าง" col="diff" align="right" className={thR} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
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
                    <td className={tdC}>{r.importType}</td>
                    <td className={tdL}>{r.model}</td>
                    <td className={tdC}>{r.year}</td>
                    <td className={tdR}>{f2(r.weight)}</td>
                    <td className={tdR}>{f2(r.registrationFee)}</td>
                    <td className={tdR}>{f2(r.customerFee)}</td>
                    <td className={tdR + ' font-bold text-[var(--ac)]'}>{f2(r.diff)}</td>
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
                    <td colSpan={10} className="text-center p-11 text-[#98a2b3] text-sm">
                      ยังไม่มีข้อมูลตารางค่าทะเบียนรถ — กดปุ่ม "+ เพิ่มรายการ" ด้านบนเพื่อเริ่มต้น
                    </td>
                  </tr>
                )}
                {rows.length > 0 && !filteredRows.length && (
                  <tr>
                    <td colSpan={10} className="text-center p-11 text-[#98a2b3] text-sm">
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
          <div
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8"
            onClick={onCloseAddModal}
          >
            <div className={card + ' w-full max-w-[560px] my-auto'} onClick={(e) => e.stopPropagation()}>
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

              <div className="grid grid-cols-2 gap-4">
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
                  ประเภท
                  <select
                    value={form.importType}
                    onChange={(e) => setForm((f) => ({ ...f, importType: e.target.value }))}
                    className={inputCls}
                  >
                    {VEHICLE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-[6px] text-[12.5px] text-[#6b7686] font-semibold col-span-2">
                  รุ่นรถ
                  <input
                    value={form.model}
                    onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                    className={inputCls}
                  />
                </label>
                <label className="flex flex-col gap-[6px] text-[12.5px] text-[#6b7686] font-semibold">
                  ประจำปี
                  <input
                    value={form.year}
                    onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
                    placeholder="2569"
                    className={inputCls}
                  />
                </label>
                <label className="flex flex-col gap-[6px] text-[12.5px] text-[#6b7686] font-semibold">
                  น้ำหนัก
                  <input
                    value={form.weight}
                    onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
                    inputMode="decimal"
                    placeholder="0.00"
                    className={inputCls + ' text-right'}
                  />
                </label>
                <label className="flex flex-col gap-[6px] text-[12.5px] text-[#6b7686] font-semibold">
                  ค่าจดทะเบียน
                  <input
                    value={form.registrationFee}
                    onChange={(e) => setForm((f) => ({ ...f, registrationFee: e.target.value }))}
                    inputMode="decimal"
                    placeholder="0.00"
                    className={inputCls + ' text-right'}
                  />
                </label>
                <label className="flex flex-col gap-[6px] text-[12.5px] text-[#6b7686] font-semibold">
                  เก็บลูกค้า
                  <input
                    value={form.customerFee}
                    onChange={(e) => setForm((f) => ({ ...f, customerFee: e.target.value }))}
                    inputMode="decimal"
                    placeholder="0.00"
                    className={inputCls + ' text-right'}
                  />
                </label>
                <label className="flex flex-col gap-[6px] text-[12.5px] text-[#6b7686] font-semibold">
                  ส่วนต่าง
                  <div className={inputCls + ' text-right text-[#98a2b3] bg-[#f4f6fa]'}>
                    {f2((Number(form.customerFee) || 0) - (Number(form.registrationFee) || 0))}
                  </div>
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
            <div className={card + ' w-full max-w-[560px] my-auto'} onClick={(e) => e.stopPropagation()}>
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

              <div className="grid grid-cols-2 gap-4">
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
                  ประเภท
                  <select
                    value={editForm.importType}
                    onChange={(e) => setEditForm((f) => ({ ...f, importType: e.target.value }))}
                    className={inputCls}
                  >
                    {VEHICLE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-[6px] text-[12.5px] text-[#6b7686] font-semibold col-span-2">
                  รุ่นรถ
                  <input
                    value={editForm.model}
                    onChange={(e) => setEditForm((f) => ({ ...f, model: e.target.value }))}
                    className={inputCls}
                  />
                </label>
                <label className="flex flex-col gap-[6px] text-[12.5px] text-[#6b7686] font-semibold">
                  ประจำปี
                  <input
                    value={editForm.year}
                    onChange={(e) => setEditForm((f) => ({ ...f, year: e.target.value }))}
                    placeholder="2569"
                    className={inputCls}
                  />
                </label>
                <label className="flex flex-col gap-[6px] text-[12.5px] text-[#6b7686] font-semibold">
                  น้ำหนัก
                  <input
                    value={editForm.weight}
                    onChange={(e) => setEditForm((f) => ({ ...f, weight: e.target.value }))}
                    inputMode="decimal"
                    placeholder="0.00"
                    className={inputCls + ' text-right'}
                  />
                </label>
                <label className="flex flex-col gap-[6px] text-[12.5px] text-[#6b7686] font-semibold">
                  ค่าจดทะเบียน
                  <input
                    value={editForm.registrationFee}
                    onChange={(e) => setEditForm((f) => ({ ...f, registrationFee: e.target.value }))}
                    inputMode="decimal"
                    placeholder="0.00"
                    className={inputCls + ' text-right'}
                  />
                </label>
                <label className="flex flex-col gap-[6px] text-[12.5px] text-[#6b7686] font-semibold">
                  เก็บลูกค้า
                  <input
                    value={editForm.customerFee}
                    onChange={(e) => setEditForm((f) => ({ ...f, customerFee: e.target.value }))}
                    inputMode="decimal"
                    placeholder="0.00"
                    className={inputCls + ' text-right'}
                  />
                </label>
                <label className="flex flex-col gap-[6px] text-[12.5px] text-[#6b7686] font-semibold">
                  ส่วนต่าง
                  <div className={inputCls + ' text-right text-[#98a2b3] bg-[#f4f6fa]'}>
                    {f2((Number(editForm.customerFee) || 0) - (Number(editForm.registrationFee) || 0))}
                  </div>
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

      <ActivityLogModal open={showActivity} onClose={() => setShowActivity(false)} fetchFn={fetchVehicleRegistrationActivity} />
    </section>
  );
}
