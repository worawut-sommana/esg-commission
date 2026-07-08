import { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { card, thL, thC, thR, thRhi, tdL, tdC, tdR, tdRhi, tdMono, btnPrimary, btnGhost, selectStyle } from '../lib/styles';
import { f2, fi, PALETTE } from '../lib/format';
import { readVehicleExcelFile } from '../lib/excel';
import { matchExternalSalesByVin, fetchFinancierMapping } from '../lib/api';

const BRAND_OPTIONS = Object.keys(PALETTE);

export default function Upload({ setPage }) {
  const { months, addMonth, addBrandToMonth, deleteMonth } = useData();

  const [filePreview, setFilePreview] = useState(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const [brandChoice, setBrandChoice] = useState(BRAND_OPTIONS[0]);
  const [customBrand, setCustomBrand] = useState('');
  const [chunk2Input, setChunk2Input] = useState('0');
  const [targetMode, setTargetMode] = useState('new'); // 'new' | 'existing'
  const [targetMonthId, setTargetMonthId] = useState('');

  const [draftBrands, setDraftBrands] = useState([]);
  const [monthLabel, setMonthLabel] = useState('');
  const [monthBilling, setMonthBilling] = useState('');
  const [monthDeduct, setMonthDeduct] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [showPreviewTable, setShowPreviewTable] = useState(true);

  const [verifyStatus, setVerifyStatus] = useState('idle'); // 'idle' | 'loading' | 'ready' | 'error'
  const [matches, setMatches] = useState({});
  const [financierMappings, setFinancierMappings] = useState({});

  const verifyAgainstDatabase = async (records) => {
    const vins = records.map((r) => r.vin).filter(Boolean);
    if (!vins.length) {
      setMatches({});
      setFinancierMappings({});
      setVerifyStatus('idle');
      return;
    }
    setVerifyStatus('loading');
    try {
      const [matchRes, mappingRes] = await Promise.all([matchExternalSalesByVin(vins), fetchFinancierMapping()]);
      setMatches(matchRes.matches || {});
      setFinancierMappings(mappingRes.mappings || {});
      setVerifyStatus('ready');
    } catch {
      setMatches({});
      setFinancierMappings({});
      setVerifyStatus('error');
    }
  };

  const handleFile = async (file) => {
    if (!file) return;
    try {
      const result = await readVehicleExcelFile(file);
      setFilePreview(result);
      setError('');
      if (result.detectedBrand && BRAND_OPTIONS.includes(result.detectedBrand)) {
        setBrandChoice(result.detectedBrand);
        setCustomBrand('');
      } else if (result.detectedBrand) {
        setBrandChoice('__other__');
        setCustomBrand(result.detectedBrand);
      } else {
        setBrandChoice(BRAND_OPTIONS[0]);
        setCustomBrand('');
      }
      setChunk2Input('0');
      setTargetMode('new');
      setTargetMonthId(months.length ? months[months.length - 1].id : '');
      setShowPreviewTable(true);
      verifyAgainstDatabase(result.records);
    } catch (err) {
      setFilePreview(null);
      setError(err.message || 'อ่านไฟล์ไม่สำเร็จ');
    }
  };

  const onFileInput = (e) => {
    const f = e.target.files && e.target.files[0];
    handleFile(f);
    e.target.value = '';
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    handleFile(f);
  };

  const onCancelPreview = () => {
    setFilePreview(null);
    setError('');
  };

  const verifiedRecords = useMemo(() => {
    if (!filePreview) return [];
    return filePreview.records.map((r) => {
      const ext = r.vin ? matches[r.vin.trim().toUpperCase()] : null;
      if (!ext) {
        return { ...r, verify: { status: 'notfound', notes: ['ไม่พบรายการนี้ในฐานข้อมูลภายนอก'] } };
      }

      const notes = [];
      let mismatched = false;

      const priceDiff = Math.round((r.price || 0) - Number(ext.sale_price || 0));
      if (priceDiff !== 0) {
        mismatched = true;
        notes.push(`ราคาต่างกัน ${priceDiff > 0 ? '+' : ''}${f2(priceDiff)}`);
      }

      const mappedFinancier = financierMappings[ext.sale_condition];
      if (mappedFinancier) {
        if ((r.financier || '').trim().toUpperCase() !== mappedFinancier.trim().toUpperCase()) {
          mismatched = true;
          notes.push(`เงื่อนไขไม่ตรง (ไฟล์: ${r.financier || '-'} / ภายนอก: ${mappedFinancier})`);
        }
      } else if (ext.sale_condition) {
        notes.push('ยังไม่ได้จับคู่เงื่อนไขนี้ (ไปที่หน้า "จับคู่เงื่อนไขการขาย")');
      }

      if (ext.registration_total_paid != null) {
        const extReg = Number(ext.registration_total_paid);
        const regDiffDelta = Math.round((r.regDiff || 0) - extReg);
        if (Math.abs(regDiffDelta) > 1) {
          mismatched = true;
          notes.push(`ค่าทะเบียนต่างกัน (ไฟล์: ${f2(r.regDiff || 0)} / ภายนอก: ${f2(extReg)})`);
        }
      } else if (r.regDiff) {
        notes.push(`ภายนอกยังไม่มีข้อมูลค่าทะเบียนที่ชำระ (ไฟล์ระบุ ${f2(r.regDiff)})`);
      }

      return { ...r, verify: { status: mismatched ? 'mismatch' : 'match', notes, ext } };
    });
  }, [filePreview, matches, financierMappings]);

  const verifySummary = useMemo(
    () =>
      verifiedRecords.reduce(
        (acc, r) => {
          acc[r.verify.status] = (acc[r.verify.status] || 0) + 1;
          return acc;
        },
        { match: 0, mismatch: 0, notfound: 0 }
      ),
    [verifiedRecords]
  );

  const onAddBrand = async () => {
    if (!filePreview) return;
    const brand = brandChoice === '__other__' ? customBrand.trim().toUpperCase() : brandChoice;
    if (!brand) {
      setError('กรุณาระบุชื่อแบรนด์');
      return;
    }
    const chunk2 = Number(String(chunk2Input).replace(/[^0-9.-]/g, '')) || 0;
    const { summary, records, file, sourceFileBase64 } = filePreview;
    const entry = {
      brand,
      units: summary.units,
      value: summary.value,
      com1: summary.com1,
      chunk2,
      regDiff: summary.regDiff,
      total: summary.com1 + chunk2 + summary.regDiff,
      records: records.map((r) => ({ ...r, brand })),
      sourceFilename: file,
      sourceFileBase64,
    };

    if (targetMode === 'existing') {
      if (!targetMonthId) {
        setError('กรุณาเลือกรอบวางบิลที่จะเพิ่มแบรนด์เข้าไป');
        return;
      }
      setSaving(true);
      setError('');
      try {
        await addBrandToMonth(targetMonthId, entry);
        setFilePreview(null);
        setPage('dash');
      } catch (err) {
        setError(err.message || 'เพิ่มแบรนด์เข้ารอบไม่สำเร็จ กรุณาลองใหม่');
      } finally {
        setSaving(false);
      }
      return;
    }

    setDraftBrands((prev) => [...prev.filter((b) => b.brand !== brand), entry]);
    setFilePreview(null);
    setError('');
  };

  const targetMonth = months.find((m) => m.id === targetMonthId);
  const brandForPreview = brandChoice === '__other__' ? customBrand.trim().toUpperCase() : brandChoice;
  const willReplace = targetMode === 'existing' && targetMonth && targetMonth.brands.some((b) => b.brand === brandForPreview);

  const onRemoveDraftBrand = (brand) => {
    setDraftBrands((prev) => prev.filter((b) => b.brand !== brand));
  };

  const onConfirmSaveMonth = async () => {
    if (!draftBrands.length || saving) return;
    const deductNum = Number(String(monthDeduct).replace(/[^0-9.-]/g, '')) || 0;
    const brands = draftBrands.map(({ records, ...b }) => b);
    const combinedRecords = draftBrands.flatMap((b) => b.records);
    const payload = {
      label: monthLabel.trim() || '-',
      billing: monthBilling.trim() || '-',
      brands,
      deduct: deductNum,
      records: combinedRecords,
    };
    setSaving(true);
    setError('');
    try {
      await addMonth(payload);
      setDraftBrands([]);
      setMonthLabel('');
      setMonthBilling('');
      setMonthDeduct('');
      setPage('dash');
    } catch (err) {
      setError(err.message || 'บันทึกไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setSaving(false);
    }
  };

  const onDeleteMonth = async (id) => {
    setDeletingId(id);
    setError('');
    try {
      await deleteMonth(id);
    } catch (err) {
      setError(err.message || 'ลบไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="appfade">
      <div className="mb-[22px]">
        <div className="text-xs font-semibold tracking-[0.06em] uppercase text-[var(--ac)] mb-[6px]">นำเข้าข้อมูล</div>
        <h1 className="m-0 text-[27px] font-bold tracking-[-0.01em]">อัปโหลดไฟล์ Excel</h1>
        <div className="text-[#6b7686] text-[13.5px] mt-[6px]">
          อัปโหลดไฟล์รายคันทีละแบรนด์ (.xlsx) แล้วเลือกได้ว่าจะสร้างรอบวางบิลใหม่ หรือเพิ่มเข้ารอบที่บันทึกไว้แล้ว (เช่น อัปโหลดคนละวันกัน)
        </div>
      </div>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className="flex flex-col items-center justify-center py-12 px-5 border-2 border-dashed rounded-[18px] cursor-pointer text-center transition-all"
        style={{
          borderColor: dragOver ? 'var(--ac)' : 'rgba(59,91,219,0.4)',
          background: dragOver ? 'rgba(59,91,219,0.07)' : 'rgba(59,91,219,0.03)',
        }}
      >
        <input type="file" accept=".xlsx,.xls" onChange={onFileInput} className="hidden" />
        <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="var(--ac)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 15V3M8 7l4-4 4 4M20 17v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3" />
        </svg>
        <div className="text-[15.5px] font-bold mt-[14px]">คลิกเพื่อเลือกไฟล์ Excel รายคัน</div>
        <div className="text-[12.5px] text-[#8a94a3] mt-[5px]">หรือลากไฟล์มาวางที่นี่ · .xlsx / .xls (1 ไฟล์ = 1 แบรนด์)</div>
      </label>

      {error && (
        <div className="mt-4 px-4 py-[14px] bg-[#fef2f2] border border-[#fecaca] rounded-xl text-[#b91c1c] text-[13.5px]">
          {error}
        </div>
      )}

      {filePreview && (
        <div className={'mt-5 ' + card}>
          <div className="flex items-center justify-between flex-wrap gap-3 mb-[18px]">
            <div>
              <div className="font-bold text-[15px] flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                อ่านไฟล์สำเร็จ — พบ {fi(filePreview.summary.units)} คัน
              </div>
              <div className="text-[12.5px] text-[#8a94a3] mt-1">
                จากไฟล์ {filePreview.file} · ชีต "{filePreview.sheet}"
              </div>
            </div>
            <button
              onClick={() => setShowPreviewTable((v) => !v)}
              className="text-[12.5px] font-semibold text-[var(--ac)] cursor-pointer bg-transparent border-none"
            >
              {showPreviewTable ? 'ซ่อนตัวอย่างข้อมูล' : `ดูตัวอย่างข้อมูล (${fi(filePreview.records.length)} รายการ)`}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-[18px]">
            <div className="px-4 py-3 bg-[#f4f6fa] rounded-xl">
              <div className="text-[11.5px] text-[#6b7686] font-semibold">มูลค่ารวม</div>
              <div className="text-[15px] font-bold mt-1">{f2(filePreview.summary.value)}</div>
            </div>
            <div className="px-4 py-3 bg-[#f4f6fa] rounded-xl">
              <div className="text-[11.5px] text-[#6b7686] font-semibold">ค่าคอม ESG 1%</div>
              <div className="text-[15px] font-bold mt-1">{f2(filePreview.summary.com1)}</div>
            </div>
            <div className="px-4 py-3 bg-[#f4f6fa] rounded-xl">
              <div className="text-[11.5px] text-[#6b7686] font-semibold">ส่วนต่างค่าทะเบียน</div>
              <div className="text-[15px] font-bold mt-1">{f2(filePreview.summary.regDiff)}</div>
            </div>
          </div>

          <div className="mb-[18px] px-4 py-3 bg-[#f4f6fa] rounded-xl text-[13px]">
            {verifyStatus === 'loading' && <span className="text-[#6b7686]">กำลังตรวจสอบข้อมูลกับฐานข้อมูลภายนอก...</span>}
            {verifyStatus === 'error' && <span className="text-[#b91c1c]">ตรวจสอบกับฐานข้อมูลภายนอกไม่สำเร็จ</span>}
            {verifyStatus === 'ready' && (
              <span className="font-semibold">
                ผลตรวจสอบกับฐานข้อมูลภายนอก:{' '}
                <span className="text-[#15803d]">ตรงกัน {fi(verifySummary.match)}</span> ·{' '}
                <span className="text-[#b91c1c]">ไม่ตรงกัน {fi(verifySummary.mismatch)}</span> ·{' '}
                <span className="text-[#8a94a3]">ไม่พบข้อมูล {fi(verifySummary.notfound)}</span>
              </span>
            )}
          </div>

          {showPreviewTable && (
            <div className="mb-5 border border-[#eef1f5] rounded-xl overflow-hidden">
              <div className="overflow-auto max-h-[420px]">
                <table className="w-full border-collapse text-[12.5px] min-w-[1180px]">
                  <thead className="sticky top-0">
                    <tr className="bg-[#f4f6fa]">
                      <th className={thC}>#</th>
                      <th className={thL}>ชื่อลูกค้า</th>
                      <th className={thL}>รุ่นรถ</th>
                      <th className={thL}>เลข VIN</th>
                      <th className={thL}>สาขา</th>
                      <th className={thL}>เงื่อนไข</th>
                      <th className={thL}>วันที่ส่งมอบ</th>
                      <th className={thR}>ราคาขาย</th>
                      <th className={thRhi}>ค่าคอม 1%</th>
                      <th className={thL}>ตรวจสอบกับฐานข้อมูลภายนอก</th>
                    </tr>
                  </thead>
                  <tbody>
                    {verifiedRecords.map((r, i) => (
                      <tr key={r.vin || i} className="border-b border-[#eef1f5] bg-white">
                        <td className={tdC}>{i + 1}</td>
                        <td className={tdL}>{r.name}</td>
                        <td className={tdL}>
                          <span className="inline-block px-[9px] py-[3px] bg-[#eef2fb] text-[var(--ac)] rounded-full text-[11.5px] font-semibold">
                            {r.model}
                          </span>
                        </td>
                        <td className={tdMono}>{r.vin}</td>
                        <td className={tdL}>{r.branch || '-'}</td>
                        <td className={tdL}>{r.financier || '-'}</td>
                        <td className={tdL}>{r.deliveryDate || '-'}</td>
                        <td className={tdR}>{f2(r.price)}</td>
                        <td className={tdRhi}>{f2(r.com)}</td>
                        <td className={tdL}>
                          {verifyStatus === 'loading' ? (
                            <span className="inline-block px-[9px] py-[3px] bg-[#f4f6fa] text-[#8a94a3] rounded-full text-[11.5px] font-semibold">
                              กำลังตรวจสอบ...
                            </span>
                          ) : (
                            <>
                              {r.verify.status === 'match' && (
                                <span className="inline-block px-[9px] py-[3px] bg-[#ecfdf3] text-[#15803d] rounded-full text-[11.5px] font-semibold">
                                  ตรงกัน
                                </span>
                              )}
                              {r.verify.status === 'mismatch' && (
                                <span className="inline-block px-[9px] py-[3px] bg-[#fef2f2] text-[#b91c1c] rounded-full text-[11.5px] font-semibold">
                                  ไม่ตรงกัน
                                </span>
                              )}
                              {r.verify.status === 'notfound' && (
                                <span className="inline-block px-[9px] py-[3px] bg-[#f4f6fa] text-[#8a94a3] rounded-full text-[11.5px] font-semibold">
                                  ไม่พบข้อมูล
                                </span>
                              )}
                              {r.verify.notes.length > 0 && (
                                <div className="mt-1 text-[11px] text-[#8a94a3] leading-[1.5]">
                                  {r.verify.notes.map((n, ni) => (
                                    <div key={ni}>{n}</div>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-3 flex-wrap mb-5">
            <label className="flex flex-col gap-[5px] text-[11.5px] text-[#6b7686] font-semibold flex-1 min-w-[160px]">
              แบรนด์
              <select value={brandChoice} onChange={(e) => setBrandChoice(e.target.value)} className={selectStyle + ' min-w-0!'}>
                {BRAND_OPTIONS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
                <option value="__other__">อื่นๆ (ระบุเอง)</option>
              </select>
            </label>
            {brandChoice === '__other__' && (
              <label className="flex flex-col gap-[5px] text-[11.5px] text-[#6b7686] font-semibold flex-1 min-w-[160px]">
                ชื่อแบรนด์
                <input
                  value={customBrand}
                  onChange={(e) => setCustomBrand(e.target.value)}
                  placeholder="เช่น BYD"
                  className="px-3 py-[10px] border border-[#d7dce4] rounded-[10px] text-[13.5px]"
                />
              </label>
            )}
            <label className="flex flex-col gap-[5px] text-[11.5px] text-[#6b7686] font-semibold flex-1 min-w-[160px]">
              ก้อน 2 สัดส่วน 30%
              <input
                value={chunk2Input}
                onChange={(e) => setChunk2Input(e.target.value)}
                placeholder="0"
                className="px-3 py-[10px] border border-[#d7dce4] rounded-[10px] text-[13.5px]"
              />
            </label>
          </div>

          {months.length > 0 && (
            <div className="flex gap-3 flex-wrap mb-5">
              <label className="flex flex-col gap-[5px] text-[11.5px] text-[#6b7686] font-semibold flex-1 min-w-[200px]">
                นำแบรนด์นี้ไปไว้ที่
                <select
                  value={targetMode}
                  onChange={(e) => setTargetMode(e.target.value)}
                  className={selectStyle + ' min-w-0!'}
                >
                  <option value="new">สร้างรอบวางบิลใหม่</option>
                  <option value="existing">เพิ่มเข้ารอบที่มีอยู่แล้ว</option>
                </select>
              </label>
              {targetMode === 'existing' && (
                <label className="flex flex-col gap-[5px] text-[11.5px] text-[#6b7686] font-semibold flex-1 min-w-[200px]">
                  รอบวางบิล
                  <select
                    value={targetMonthId}
                    onChange={(e) => setTargetMonthId(e.target.value)}
                    className={selectStyle + ' min-w-0!'}
                  >
                    {months.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}

          {willReplace && (
            <div className="mb-5 px-4 py-[12px] bg-[#fffbeb] border border-[#fde68a] rounded-xl text-[#92400e] text-[13px]">
              แบรนด์ "{brandForPreview}" มีอยู่ในรอบนี้แล้ว การเพิ่มจะแทนที่ข้อมูลเดิมของแบรนด์นี้ทั้งหมด
            </div>
          )}

          <div className="flex gap-[10px] justify-end">
            <button onClick={onCancelPreview} className={btnGhost}>
              ยกเลิก
            </button>
            <button onClick={onAddBrand} disabled={saving} className={btnPrimary + ' disabled:opacity-60 disabled:cursor-not-allowed'}>
              {saving ? 'กำลังบันทึก...' : targetMode === 'existing' ? 'เพิ่มแบรนด์นี้เข้ารอบที่เลือก' : 'เพิ่มแบรนด์นี้เข้ารอบ'}
            </button>
          </div>
        </div>
      )}

      {draftBrands.length > 0 && (
        <div className={'mt-5 ' + card}>
          <div className="font-bold text-[15px] mb-4">แบรนด์ในรอบนี้ ({draftBrands.length})</div>
          <div className="overflow-x-auto border border-[#eef1f5] rounded-xl mb-5">
            <table className="w-full border-collapse text-[12.5px] min-w-[600px]">
              <thead>
                <tr className="bg-[#f4f6fa]">
                  <th className={thL}>แบรนด์</th>
                  <th className={thR}>คัน</th>
                  <th className={thR}>รายได้รวม</th>
                  <th className={thR}></th>
                </tr>
              </thead>
              <tbody>
                {draftBrands.map((b) => (
                  <tr key={b.brand} className="border-b border-[#eef1f5]">
                    <td className={tdL + ' font-bold'}>{b.brand}</td>
                    <td className={tdR}>{fi(b.units)}</td>
                    <td className={tdR}>{f2(b.total)}</td>
                    <td className={tdR}>
                      <button
                        onClick={() => onRemoveDraftBrand(b.brand)}
                        className="border border-[#fecaca] bg-white text-[#dc2626] px-3 py-1 rounded-[9px] text-[12px] font-semibold cursor-pointer"
                      >
                        ลบ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3 flex-wrap mb-5">
            <label className="flex flex-col gap-[5px] text-[11.5px] text-[#6b7686] font-semibold flex-1 min-w-[180px]">
              ชื่อรอบ / เดือน
              <input
                value={monthLabel}
                onChange={(e) => setMonthLabel(e.target.value)}
                placeholder="เช่น ตุลาคม 2569"
                className="px-3 py-[10px] border border-[#d7dce4] rounded-[10px] text-[13.5px]"
              />
            </label>
            <label className="flex flex-col gap-[5px] text-[11.5px] text-[#6b7686] font-semibold flex-1 min-w-[180px]">
              วันที่วางบิล
              <input
                value={monthBilling}
                onChange={(e) => setMonthBilling(e.target.value)}
                placeholder="เช่น 29 กรกฎาคม 2569"
                className="px-3 py-[10px] border border-[#d7dce4] rounded-[10px] text-[13.5px]"
              />
            </label>
            <label className="flex flex-col gap-[5px] text-[11.5px] text-[#6b7686] font-semibold flex-1 min-w-[160px]">
              หัก ค่าทะเบียน EV
              <input
                value={monthDeduct}
                onChange={(e) => setMonthDeduct(e.target.value)}
                placeholder="0"
                className="px-3 py-[10px] border border-[#d7dce4] rounded-[10px] text-[13.5px]"
              />
            </label>
          </div>

          <div className="flex justify-end">
            <button onClick={onConfirmSaveMonth} disabled={saving} className={btnPrimary + ' disabled:opacity-60 disabled:cursor-not-allowed'}>
              {saving ? 'กำลังบันทึก...' : 'บันทึกลงฐานข้อมูล'}
            </button>
          </div>
        </div>
      )}

      <div className={'mt-6 ' + card}>
        <div className="font-bold text-[15px] mb-4">รอบวางบิลในระบบ ({months.length})</div>
        <div className="flex flex-col gap-[10px]">
          {months.map((m) => (
            <div key={m.id} className="px-4 py-[14px] border border-[#eef1f5] rounded-xl bg-[#fafbfc]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-[14px]">{m.label}</div>
                  <div className="text-xs text-[#8a94a3] mt-[3px]">
                    วางบิล {m.billing} · {(m.brands || []).length} แบรนด์ · รายได้สุทธิ {f2(m.net)}
                  </div>
                </div>
                <button
                  onClick={() => onDeleteMonth(m.id)}
                  disabled={deletingId === m.id}
                  className="border border-[#fecaca] bg-white text-[#dc2626] px-3 py-2 rounded-[9px] text-[12.5px] font-semibold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {deletingId === m.id ? '...' : 'ลบ'}
                </button>
              </div>
              {(m.brands || []).some((b) => b.sourceFilename) && (
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-[#eef1f5]">
                  {(m.brands || [])
                    .filter((b) => b.sourceFilename)
                    .map((b) => (
                      <a
                        key={b.brand}
                        href={`/api/months/${m.id}/brands/${encodeURIComponent(b.brand)}/file`}
                        className="inline-flex items-center gap-1 px-3 py-[6px] bg-white border border-[#d7dce4] rounded-full text-[11.5px] font-semibold text-[#5a6473] hover:border-[var(--ac)] hover:text-[var(--ac)]"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 15V3M8 11l4 4 4-4M20 17v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3" />
                        </svg>
                        {b.brand}: {b.sourceFilename}
                      </a>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
