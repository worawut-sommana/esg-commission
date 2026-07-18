function cellText(v) {
  return v == null ? '' : String(v).trim();
}

function num(v) {
  if (typeof v === 'number') return v;
  if (v == null) return 0;
  const n = parseFloat(String(v).replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
}

// Header labels occasionally spill onto the row directly below (wrapped
// cells), so combine each column's text across a couple of rows before
// matching against the field patterns.
function compositeHeader(rows, anchorRow, col, spanRows = 2) {
  let text = '';
  for (let r = anchorRow; r < Math.min(anchorRow + spanRows, rows.length); r++) {
    text += cellText((rows[r] || [])[col]) + ' ';
  }
  return text.trim();
}

function detectColumns(rows, anchorRow) {
  const colCount = Math.max(...rows.slice(anchorRow, anchorRow + 2).map((r) => (r || []).length), 0);
  const headers = [];
  for (let c = 0; c < colCount; c++) headers.push(compositeHeader(rows, anchorRow, c));

  const used = new Set();
  const pick = (test) => {
    for (let c = 0; c < headers.length; c++) {
      if (used.has(c)) continue;
      if (test(headers[c])) {
        used.add(c);
        return c;
      }
    }
    return null;
  };

  return {
    brand: pick((h) => /แบรนด์/.test(h)),
    importType: pick((h) => /รถนำเข้า|นำเข้า|^cbu$|^non$/i.test(h)),
    model: pick((h) => /รุ่นรถ|^รุ่น/.test(h)),
    month: pick((h) => /ประจำเดือน/.test(h)),
    year: pick((h) => /ประจำปี|^ปี/.test(h)),
    bookingControl: pick((h) => /คุมวันจอง/.test(h)),
    bookingStart: pick((h) => /วันเริ่มจอง/.test(h)),
    bookingEnd: pick((h) => /สิ้นสุด.*จอง/.test(h)),
    // "MSRP" must be matched before "MSRP - Discount" so it doesn't grab
    // that column too; the exact-match test below only matches the bare label.
    msrp: pick((h) => /^msrp$/i.test(h)),
    rsPrice: pick((h) => /rs\s*price/i.test(h)),
    msrpDiscount: pick((h) => /discount/i.test(h)),
    note: pick((h) => /หมายเหตุ/.test(h)),
  };
}

function isHeaderRow(cols) {
  return cols.brand != null && cols.model != null;
}

function isBlankRow(row) {
  return !row || row.every((c) => cellText(c) === '');
}

// The source workbook can contain several stacked tables (a model master
// list, a separate campaign list, etc). We scan every row for one that looks
// like a header for our column set and pull whatever data rows follow it, so
// any matching table anywhere in the sheet gets picked up.
function extractRowsFromSheet(rows) {
  const out = [];
  let i = 0;
  while (i < rows.length) {
    const cols = detectColumns(rows, i);
    if (!isHeaderRow(cols)) {
      i += 1;
      continue;
    }

    let r = i + 1;
    // Header labels can span two rows; skip a second header line if present.
    if (isBlankRow(rows[r])) r += 1;
    for (; r < rows.length; r++) {
      const row = rows[r] || [];
      if (isBlankRow(row)) break;
      const brand = cellText(row[cols.brand]);
      const model = cellText(row[cols.model]);
      if (!brand || !model) break;
      out.push({
        brand,
        importType: cols.importType != null ? cellText(row[cols.importType]) : '',
        model,
        month: cols.month != null ? cellText(row[cols.month]) : '',
        year: cols.year != null ? cellText(row[cols.year]) : '',
        bookingControl: cols.bookingControl != null ? cellText(row[cols.bookingControl]) : '',
        bookingStart: cols.bookingStart != null ? cellText(row[cols.bookingStart]) : '',
        bookingEnd: cols.bookingEnd != null ? cellText(row[cols.bookingEnd]) : '',
        msrp: cols.msrp != null ? num(row[cols.msrp]) : 0,
        rsPrice: cols.rsPrice != null ? num(row[cols.rsPrice]) : 0,
        msrpDiscount: cols.msrpDiscount != null ? num(row[cols.msrpDiscount]) : 0,
        note: cols.note != null ? cellText(row[cols.note]) : '',
      });
    }
    i = Math.max(r, i + 1);
  }
  return out;
}

export async function parseVehicleCampaignExcel(arrayBuffer) {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });

  const draftRows = [];
  for (const sheetName of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: null, raw: true });
    draftRows.push(...extractRowsFromSheet(rows));
  }

  if (!draftRows.length) {
    throw new Error('ไม่พบตารางที่มีคอลัมน์ "แบรนด์" และ "รุ่นรถ" ในไฟล์นี้');
  }

  return draftRows;
}

function readAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const rd = new FileReader();
    rd.onload = (ev) => resolve(ev.target.result);
    rd.onerror = () => reject(new Error('อ่านไฟล์ไม่สำเร็จ'));
    rd.readAsArrayBuffer(file);
  });
}

export async function readVehicleCampaignExcelFile(file) {
  const arrayBuffer = await readAsArrayBuffer(file);
  return parseVehicleCampaignExcel(arrayBuffer);
}

const TEMPLATE_HEADERS = [
  'แบรนด์',
  'รถนำเข้า(CBU)',
  'รุ่นรถ',
  'ประจำเดือน',
  'ประจำปี',
  'คุมวันจอง',
  'วันเริ่มจอง',
  'สิ้นสุดวันที่จอง',
  'MSRP',
  'RS Price',
  'MSRP - Discount',
  'หมายเหตุ',
];
const TEMPLATE_EXAMPLE_ROWS = [
  ['JAECOO', 'CBU', 'JAECOO 6 EV Long Range 2WD Pro', 5, 2569, 'Y', '23/3/2569', 'จนกว่าจะประกาศเปลี่ยนแปลง', 899000, 799000, 100000, '50,000 (หักเป็นส่วนลด ณ วันที่สั่งซื้อรถยนต์)'],
  ['OMODA', 'NON', 'OMODA C5 EV MAX+', 5, 2569, 'N', '-', '-', 709000, 649000, 629000, ''],
];

export async function downloadVehicleCampaignTemplate() {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...TEMPLATE_EXAMPLE_ROWS]);
  ws['!cols'] = [
    { wch: 12 },
    { wch: 14 },
    { wch: 32 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 14 },
    { wch: 24 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 40 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'ทะเบียนรถ-แคมเปญ');
  XLSX.writeFile(wb, 'เทมเพลตทะเบียนรถ-แคมเปญ.xlsx');
}
