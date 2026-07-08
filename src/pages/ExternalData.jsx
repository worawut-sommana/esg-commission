import { useState } from 'react';
import { card, thL, thC, thR, tdL, tdC, tdR, tdMono, btnPrimary, selectStyle } from '../lib/styles';
import { f2, fi, formatIsoDate } from '../lib/format';
import { fetchExternalSalesData } from '../lib/api';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function ExternalData() {
  const [dateFrom, setDateFrom] = useState(todayIso());
  const [dateTo, setDateTo] = useState(todayIso());
  const [brand, setBrand] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const onFetch = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { date_from: dateFrom, date_to: dateTo, branch: '%' };
      if (brand) params.brand = brand;
      const data = await fetchExternalSalesData(params);
      setResult(data);
    } catch (err) {
      setError(err.message || 'ดึงข้อมูลไม่สำเร็จ');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const items = result?.items || [];

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
          <label className="flex flex-col gap-[5px] text-[11.5px] text-[#6b7686] font-semibold">
            แบรนด์
            <select value={brand} onChange={(e) => setBrand(e.target.value)} className={selectStyle + ' min-w-[160px]!'}>
              <option value="">ทั้งหมด</option>
              {(result?.brands || []).map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>
          <button onClick={onFetch} disabled={loading} className={btnPrimary + ' disabled:opacity-60 disabled:cursor-not-allowed'}>
            {loading ? 'กำลังดึงข้อมูล...' : 'ดึงข้อมูล'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-5 px-4 py-[14px] bg-[#fef2f2] border border-[#fecaca] rounded-xl text-[#b91c1c] text-[13.5px]">
          {error}
        </div>
      )}

      {result && (
        <div className={card}>
          <div className="flex items-center justify-between flex-wrap gap-3 mb-[18px]">
            <div>
              <div className="font-bold text-[15px]">พบ {fi(result.total)} รายการ</div>
              <div className="text-[12.5px] text-[#8a94a3] mt-1">
                {result.date_from} ถึง {result.date_to}
                {result.date_defaulted ? ' (ใช้ช่วงวันที่ default)' : ''} · สาขา {result.branch}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px] min-w-[900px]">
              <thead>
                <tr className="bg-[#f4f6fa]">
                  <th className={thC}>#</th>
                  <th className={thL}>ชื่อลูกค้า</th>
                  <th className={thL}>รุ่นรถ</th>
                  <th className={thL}>เลขถัง</th>
                  <th className={thL}>แบรนด์</th>
                  <th className={thL}>สาขา</th>
                  <th className={thL}>วันที่ส่งมอบ</th>
                  <th className={thR}>ราคาขาย</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={it.chassis_no || i} className="border-b border-[#eef1f5]">
                    <td className={tdC}>{i + 1}</td>
                    <td className={tdL}>{it.customer_name}</td>
                    <td className={tdL}>
                      <span className="inline-block px-[9px] py-[3px] bg-[#eef2fb] text-[var(--ac)] rounded-full text-[11.5px] font-semibold">
                        {it.model_code}
                      </span>
                    </td>
                    <td className={tdMono}>{it.chassis_no}</td>
                    <td className={tdL}>{it.database_name}</td>
                    <td className={tdL}>{it.branch}</td>
                    <td className={tdL}>{formatIsoDate(it.delivery_date)}</td>
                    <td className={tdR}>{f2(it.sale_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!items.length && <div className="text-center p-11 text-[#98a2b3] text-sm">ไม่พบข้อมูลในช่วงวันที่นี้</div>}
          </div>
        </div>
      )}
    </section>
  );
}
