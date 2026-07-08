import { useMemo, useState } from 'react';
import { card, thL, thC, thR, tdL, tdC, tdR, tdMono, btnPrimary, btnGhost, selectStyle } from '../lib/styles';
import { f2, fi, formatIsoDate } from '../lib/format';
import { fetchExternalSalesData, saveExternalSalesData } from '../lib/api';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export default function ExternalData() {
  const [dateFrom, setDateFrom] = useState(daysAgoIso(30));
  const [dateTo, setDateTo] = useState(todayIso());
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const [q, setQ] = useState('');
  const [brand, setBrand] = useState('');
  const [branch, setBranch] = useState('');
  const [saleType, setSaleType] = useState('');
  const [registration, setRegistration] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');

  const onFetch = async () => {
    setLoading(true);
    setProgress(0);
    setError('');
    setSaveMessage('');
    setSaveError('');
    try {
      const pageSize = 1000;
      let offset = 0;
      let items = [];
      let meta = null;

      // The upstream API paginates (max ~1000 rows/page), so loop until every
      // matching row for the date range has been collected, updating % as we go.
      while (true) {
        const data = await fetchExternalSalesData({
          date_from: dateFrom,
          date_to: dateTo,
          branch: '%',
          limit: pageSize,
          offset,
        });
        if (!meta) meta = data;
        items = items.concat(data.items || []);
        setProgress(data.total ? Math.min(100, Math.round((items.length / data.total) * 100)) : 100);
        offset += pageSize;
        if (!data.items || !data.items.length || items.length >= data.total) break;
      }

      setResult({ ...meta, items, fetched: items.length });
      setQ('');
      setBrand('');
      setBranch('');
      setSaleType('');
      setRegistration('');
    } catch (err) {
      setError(err.message || 'ดึงข้อมูลไม่สำเร็จ');
      setResult(null);
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const items = result?.items || [];

  const brandOptions = useMemo(() => uniqueSorted(items.map((it) => it.database_name)), [items]);
  const branchOptions = useMemo(() => uniqueSorted(items.map((it) => it.branch)), [items]);
  const saleTypeOptions = useMemo(() => uniqueSorted(items.map((it) => it.sale_type)), [items]);

  const filteredItems = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items
      .filter((it) => {
        if (brand && it.database_name !== brand) return false;
        if (branch && it.branch !== branch) return false;
        if (saleType && it.sale_type !== saleType) return false;
        if (registration === 'paid' && !it.registration_paid) return false;
        if (registration === 'unpaid' && it.registration_paid) return false;
        if (!needle) return true;
        return [it.customer_name, it.chassis_no, it.contno, it.model_code, it.resvno]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(needle));
      })
      .sort((a, b) => new Date(b.sdate || 0) - new Date(a.sdate || 0));
  }, [items, q, brand, branch, saleType, registration]);

  const onSave = async () => {
    setSaving(true);
    setSaveMessage('');
    setSaveError('');
    try {
      const r = await saveExternalSalesData(filteredItems);
      setSaveMessage(`บันทึกสำเร็จ: เพิ่มใหม่ ${fi(r.inserted)} รายการ · อัปเดต ${fi(r.updated)} รายการ`);
    } catch (err) {
      setSaveError(err.message || 'บันทึกข้อมูลไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="appfade">
      <div className="mb-[22px]">
        <div className="text-xs font-semibold tracking-[0.06em] uppercase text-[var(--ac)] mb-[6px]">ข้อมูลภายนอก</div>
        <h1 className="m-0 text-[27px] font-bold tracking-[-0.01em]">ยอดขายจากระบบ eaksahalink</h1>
        <div className="text-[#6b7686] text-[13.5px] mt-[6px]">
          ดึงข้อมูลยอดขายจริงจากระบบภายนอกมาดูเทียบกับข้อมูลที่อัปโหลดในระบบนี้
        </div>
      </div>

      <div className={card + ' mb-5'}>
        <div className="flex gap-3 flex-wrap items-end">
          <label className="flex flex-col gap-[5px] text-[11.5px] text-[#6b7686] font-semibold">
            วันที่เริ่ม
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-[9px] border border-[#d7dce4] rounded-[10px] text-[13.5px]"
            />
          </label>
          <label className="flex flex-col gap-[5px] text-[11.5px] text-[#6b7686] font-semibold">
            วันที่สิ้นสุด
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-[9px] border border-[#d7dce4] rounded-[10px] text-[13.5px]"
            />
          </label>
          <button onClick={onFetch} disabled={loading} className={btnPrimary + ' disabled:opacity-60 disabled:cursor-not-allowed'}>
            {loading ? `กำลังดึงข้อมูล... ${progress ?? 0}%` : 'ดึงข้อมูล'}
          </button>
        </div>
        {loading && (
          <div className="mt-3 h-[6px] bg-[#eef1f5] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--ac)] rounded-full transition-[width] duration-200"
              style={{ width: `${progress ?? 0}%` }}
            />
          </div>
        )}
      </div>

      {error && (
        <div className="mb-5 px-4 py-[14px] bg-[#fef2f2] border border-[#fecaca] rounded-xl text-[#b91c1c] text-[13.5px]">
          {error}
        </div>
      )}

      {result && (
        <>
          <div className={card + ' mb-5'}>
            <div className="flex gap-3 flex-wrap items-end">
              <label className="flex flex-col gap-[5px] text-[11.5px] text-[#6b7686] font-semibold flex-1 min-w-[220px]">
                ค้นหา
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="ชื่อลูกค้า / เลขถัง / เลขที่สัญญา / รุ่นรถ"
                  className="px-3 py-[9px] border border-[#d7dce4] rounded-[10px] text-[13.5px]"
                />
              </label>
              <label className="flex flex-col gap-[5px] text-[11.5px] text-[#6b7686] font-semibold">
                แบรนด์
                <select value={brand} onChange={(e) => setBrand(e.target.value)} className={selectStyle + ' min-w-[150px]!'}>
                  <option value="">ทั้งหมด</option>
                  {brandOptions.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-[5px] text-[11.5px] text-[#6b7686] font-semibold">
                สาขา
                <select value={branch} onChange={(e) => setBranch(e.target.value)} className={selectStyle + ' min-w-[120px]!'}>
                  <option value="">ทั้งหมด</option>
                  {branchOptions.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-[5px] text-[11.5px] text-[#6b7686] font-semibold">
                ประเภทการขาย
                <select value={saleType} onChange={(e) => setSaleType(e.target.value)} className={selectStyle + ' min-w-[140px]!'}>
                  <option value="">ทั้งหมด</option>
                  {saleTypeOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-[5px] text-[11.5px] text-[#6b7686] font-semibold">
                ทะเบียน
                <select value={registration} onChange={(e) => setRegistration(e.target.value)} className={selectStyle + ' min-w-[140px]!'}>
                  <option value="">ทั้งหมด</option>
                  <option value="paid">ชำระแล้ว</option>
                  <option value="unpaid">ยังไม่ชำระ</option>
                </select>
              </label>
            </div>
          </div>

          <div className={card}>
            <div className="flex items-center justify-between flex-wrap gap-3 mb-[18px]">
              <div>
                <div className="font-bold text-[15px]">
                  พบ {fi(result.total)} รายการ · แสดง {fi(filteredItems.length)} รายการ
                </div>
                <div className="text-[12.5px] text-[#8a94a3] mt-1">
                  {formatIsoDate(result.date_from)} ถึง {formatIsoDate(result.date_to)}
                  {result.date_defaulted ? ' (ใช้ช่วงวันที่ default)' : ''}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {saveMessage && <span className="text-[12.5px] text-[#15803d] font-semibold">{saveMessage}</span>}
                {saveError && <span className="text-[12.5px] text-[#b91c1c] font-semibold">{saveError}</span>}
                <button
                  onClick={onSave}
                  disabled={saving || !filteredItems.length}
                  className={btnGhost + ' disabled:opacity-60 disabled:cursor-not-allowed'}
                >
                  {saving ? 'กำลังบันทึก...' : `บันทึกลงฐานข้อมูล (${fi(filteredItems.length)})`}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px] min-w-[1600px]">
                <thead>
                  <tr className="bg-[#f4f6fa]">
                    <th className={thC}>#</th>
                    <th className={thL}>แบรนด์</th>
                    <th className={thL}>สาขา</th>
                    <th className={thL}>เลขที่สัญญา</th>
                    <th className={thL}>ชื่อลูกค้า</th>
                    <th className={thL}>รุ่นรถ</th>
                    <th className={thL}>เลขถัง</th>
                    <th className={thL}>เงื่อนไขการขาย</th>
                    <th className={thL}>วันที่ขาย</th>
                    <th className={thL}>วันที่ส่งมอบ</th>
                    <th className={thR}>ราคาขาย</th>
                    <th className={thR}>ราคาส่ง</th>
                    <th className={thR}>MSRP</th>
                    <th className={thR}>ค่าทะเบียน</th>
                    <th className={thC}>สถานะทะเบียน</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((it, i) => (
                    <tr key={`${it.contno || it.chassis_no || 'row'}-${i}`} className="border-b border-[#eef1f5]">
                      <td className={tdC}>{i + 1}</td>
                      <td className={tdL}>{it.database_name}</td>
                      <td className={tdL}>{it.branch}</td>
                      <td className={tdMono}>{it.contno}</td>
                      <td className={tdL}>{it.customer_name}</td>
                      <td className={tdL}>
                        <span className="inline-block px-[9px] py-[3px] bg-[#eef2fb] text-[var(--ac)] rounded-full text-[11.5px] font-semibold">
                          {it.model_code}
                        </span>
                      </td>
                      <td className={tdMono}>{it.chassis_no}</td>
                      <td className={tdL}>{it.sale_condition}</td>
                      <td className={tdL}>{formatIsoDate(it.sdate)}</td>
                      <td className={tdL}>{formatIsoDate(it.delivery_date)}</td>
                      <td className={tdR}>{f2(it.sale_price)}</td>
                      <td className={tdR}>{f2(it.wholesales)}</td>
                      <td className={tdR}>{f2(it.msrp)}</td>
                      <td className={tdR}>{it.registration_total_paid != null ? f2(it.registration_total_paid) : '-'}</td>
                      <td className={tdC}>
                        {it.registration_paid ? (
                          <span className="inline-block px-[9px] py-[3px] bg-[#ecfdf3] text-[#15803d] rounded-full text-[11.5px] font-semibold">
                            ชำระแล้ว
                          </span>
                        ) : (
                          <span className="inline-block px-[9px] py-[3px] bg-[#f4f6fa] text-[#8a94a3] rounded-full text-[11.5px] font-semibold">
                            ยังไม่ชำระ
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filteredItems.length && <div className="text-center p-11 text-[#98a2b3] text-sm">ไม่พบข้อมูลตามเงื่อนไขนี้</div>}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
