import { useEffect, useMemo, useState } from 'react';
import { card, thL, thC, tdL, tdC, btnPrimary, selectStyle } from '../lib/styles';
import { fi } from '../lib/format';
import { fetchFinancierMapping, saveFinancierMapping } from '../lib/api';

export default function FinancierMapping() {
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [externalValues, setExternalValues] = useState([]);
  const [financierCodes, setFinancierCodes] = useState([]);
  const [mappings, setMappings] = useState({});
  const [error, setError] = useState('');

  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [saveError, setSaveError] = useState('');

  const load = async () => {
    setStatus('loading');
    setError('');
    try {
      const data = await fetchFinancierMapping();
      setExternalValues(data.externalValues || []);
      setFinancierCodes(data.financierCodes || []);
      setMappings(data.mappings || {});
      setStatus('ready');
    } catch (err) {
      setError(err.message || 'โหลดข้อมูลไม่สำเร็จ');
      setStatus('error');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const mappedCount = useMemo(
    () => externalValues.filter((ev) => (mappings[ev.value] || '').trim()).length,
    [externalValues, mappings]
  );

  const onChangeMapping = (externalValue, financier) => {
    setMappings((prev) => ({ ...prev, [externalValue]: financier }));
    setSavedMsg('');
  };

  const onSave = async () => {
    setSaving(true);
    setSavedMsg('');
    setSaveError('');
    try {
      await saveFinancierMapping(mappings);
      setSavedMsg('บันทึกการจับคู่เรียบร้อย');
    } catch (err) {
      setSaveError(err.message || 'บันทึกไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="appfade">
      <div className="mb-[22px]">
        <div className="text-xs font-semibold tracking-[0.06em] uppercase text-[var(--ac)] mb-[6px]">ข้อมูลภายนอก</div>
        <h1 className="m-0 text-[27px] font-bold tracking-[-0.01em]">จับคู่เงื่อนไขการขาย</h1>
        <div className="text-[#6b7686] text-[13.5px] mt-[6px]">
          จับคู่ "เงื่อนไขการขาย" จากระบบ eaksahalink (ชื่อธนาคาร/ไฟแนนซ์เต็ม) กับรหัสไฟแนนซ์ที่ใช้ในไฟล์ Excel ที่อัปโหลด
          เพื่อให้เทียบข้อมูลทั้งสองระบบได้ตรงกัน
        </div>
      </div>

      {status === 'loading' && <div className="text-[#6b7686] text-[14px]">กำลังโหลด...</div>}

      {status === 'error' && (
        <div className="px-4 py-[14px] bg-[#fef2f2] border border-[#fecaca] rounded-xl text-[#b91c1c] text-[13.5px]">{error}</div>
      )}

      {status === 'ready' && (
        <div className={card}>
          <div className="flex items-center justify-between flex-wrap gap-3 mb-[18px]">
            <div>
              <div className="font-bold text-[15px]">
                จับคู่แล้ว {fi(mappedCount)} จาก {fi(externalValues.length)} รายการ
              </div>
              <div className="text-[12.5px] text-[#8a94a3] mt-1">
                รายการเรียงตามจำนวนครั้งที่พบในข้อมูลที่บันทึกไว้ — เว้นว่างไว้หากยังไม่ต้องการจับคู่
              </div>
            </div>
            <div className="flex items-center gap-3">
              {savedMsg && <span className="text-[12.5px] text-[#15803d] font-semibold">{savedMsg}</span>}
              {saveError && <span className="text-[12.5px] text-[#b91c1c] font-semibold">{saveError}</span>}
              <button onClick={onSave} disabled={saving} className={btnPrimary + ' disabled:opacity-60 disabled:cursor-not-allowed'}>
                {saving ? 'กำลังบันทึก...' : 'บันทึกการจับคู่'}
              </button>
            </div>
          </div>

          {!externalValues.length ? (
            <div className="text-center p-11 text-[#98a2b3] text-sm">
              ยังไม่มีข้อมูลเงื่อนไขการขายให้จับคู่ — ไปที่หน้า "ข้อมูลภายนอก" แล้วดึงและบันทึกข้อมูลก่อน
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="bg-[#f4f6fa]">
                    <th className={thL}>เงื่อนไขการขาย (จากภายนอก)</th>
                    <th className={thC}>จำนวนรายการ</th>
                    <th className={thL}>รหัสไฟแนนซ์ (Excel)</th>
                  </tr>
                </thead>
                <tbody>
                  {externalValues.map((ev) => (
                    <tr key={ev.value} className="border-b border-[#eef1f5]">
                      <td className={tdL}>{ev.value}</td>
                      <td className={tdC}>{fi(ev.count)}</td>
                      <td className={tdL}>
                        <input
                          list="financier-codes"
                          value={mappings[ev.value] || ''}
                          onChange={(e) => onChangeMapping(ev.value, e.target.value)}
                          placeholder="เลือกหรือพิมพ์รหัสไฟแนนซ์"
                          className={selectStyle + ' min-w-[220px]! font-normal!'}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <datalist id="financier-codes">
                {financierCodes.map((code) => (
                  <option key={code} value={code} />
                ))}
              </datalist>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
