function cellText(v) {
  return v == null ? '' : String(v).trim();
}

function num(v) {
  if (typeof v === 'number') return v;
  if (v == null) return 0;
  const n = parseFloat(String(v).replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
}

function isVinLike(v) {
  const s = cellText(v).replace(/\s/g, '');
  return /^[A-Z0-9]{6,20}$/i.test(s);
}

// Header labels span multiple merged rows (main header + one or two sub-header
// rows). We build a composite per-column string across those rows so a single
// regex can match regardless of which row the label actually sits in.
function compositeHeaders(rows, anchorRow, colCount, spanRows) {
  const out = [];
  for (let c = 0; c < colCount; c++) {
    let text = '';
    for (let r = anchorRow; r < Math.min(anchorRow + spanRows, rows.length); r++) {
      text += cellText((rows[r] || [])[c]) + ' ';
    }
    out.push(text.trim());
  }
  return out;
}

function findHeaderAnchor(rows) {
  const limit = Math.min(rows.length, 15);
  for (let i = 0; i < limit; i++) {
    const line = (rows[i] || []).map(cellText);
    const hasRank = line.some((c) => c === 'ลำดับ');
    const hasName = line.some((c) => /ชื่อ/.test(c));
    if (hasRank && hasName) return i;
  }
  for (let i = 0; i < limit; i++) {
    const line = (rows[i] || []).map(cellText);
    if (line.some((c) => /ชื่อลูกค้า/.test(c)) && line.some((c) => /เลขถัง|vin/i.test(c))) return i;
  }
  return -1;
}

function detectColumns(rows, anchorRow) {
  const colCount = Math.max(...rows.slice(anchorRow, anchorRow + 6).map((r) => (r || []).length), 0);
  const headers = compositeHeaders(rows, anchorRow, colCount, 4);

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

  const cols = {};
  cols.vin = pick((h) => /เลขถัง|^vin/i.test(h));
  cols.price = pick((h) => /ราคาขาย/.test(h));
  cols.com1 = pick((h) => /1%/.test(h) && /esg|คอม/i.test(h));
  cols.regDiff = pick((h) => /หัก/.test(h) && /ทะเบียน/.test(h) && !/ใบเสร็จ/.test(h));
  cols.rank = pick((h) => h === 'ลำดับ');
  cols.name = pick((h) => /ชื่อ/.test(h));
  cols.financier = pick((h) => /เงื่อนไข/.test(h));
  cols.deliveryDate = pick((h) => /วันที่ส่งมอบ|วันที่/.test(h));
  cols.model = pick((h) => /รุ่น|model|moder/i.test(h));
  cols.branch = pick((h) => /สาขา/.test(h));

  return cols;
}

function looksLikeDataRow(row, cols) {
  if (cols.vin != null && isVinLike(row[cols.vin])) return true;
  if (cols.name != null && cellText(row[cols.name]) && cols.rank != null) {
    const rankVal = Number(cellText(row[cols.rank]));
    if (Number.isFinite(rankVal) && rankVal > 0) return true;
  }
  return false;
}

const TARGET_SHEET_NAME = 'เงินรางวัลเรียกเก็บ ESG';

const BRAND_ALIASES = [
  [/omoda|jaecoo/i, 'OJ'],
  [/aion/i, 'AION'],
  [/geely/i, 'GEELY'],
  [/chery/i, 'CHERY'],
  [/wuling/i, 'WULING'],
  [/gwm|great\s*wall/i, 'GWM'],
  [/\bmg\b/i, 'MG'],
];

function normalizeBrand(raw) {
  if (!raw) return null;
  for (const [re, code] of BRAND_ALIASES) {
    if (re.test(raw)) return code;
  }
  return raw.trim().toUpperCase();
}

// The title row (above the header) reads like "...บริษัท ... (AION) วันที่ ...".
// The brand code sits in the last parenthesized group, so we search the rows
// above the header anchor for that pattern rather than the whole sheet, since
// customer names further down can also contain "(...)" (e.g. "(Trade-in)").
function detectBrand(rows, anchorRow) {
  for (let i = 0; i < anchorRow; i++) {
    const line = (rows[i] || []).map(cellText).join(' ');
    if (!/หลักการจ่ายผลประโยชน์/.test(line)) continue;
    const matches = [...line.matchAll(/\(([^)]+)\)/g)];
    if (matches.length) return normalizeBrand(matches[matches.length - 1][1]);
  }
  return null;
}

export async function parseVehicleFile(arrayBuffer, fileName) {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });

  const sheet = wb.Sheets[TARGET_SHEET_NAME];
  if (!sheet) {
    throw new Error(`ไม่พบชีตชื่อ "${TARGET_SHEET_NAME}" ในไฟล์นี้ กรุณาตรวจสอบว่าเลือกไฟล์ถูกต้อง`);
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
  const anchorRow = findHeaderAnchor(rows);
  if (anchorRow < 0) {
    throw new Error(`ไม่พบหัวตารางในชีต "${TARGET_SHEET_NAME}" กรุณาตรวจสอบว่ามีคอลัมน์ ลำดับ / ชื่อลูกค้า`);
  }
  const cols = detectColumns(rows, anchorRow);
  if (cols.vin == null && cols.name == null) {
    throw new Error(`ไม่พบคอลัมน์ ชื่อลูกค้า / เลขถัง ในชีต "${TARGET_SHEET_NAME}"`);
  }

  let dataStart = -1;
  for (let i = anchorRow + 1; i < Math.min(anchorRow + 8, rows.length); i++) {
    if (looksLikeDataRow(rows[i] || [], cols)) {
      dataStart = i;
      break;
    }
  }
  if (dataStart < 0) {
    throw new Error(`ไม่พบแถวข้อมูลรายคันในชีต "${TARGET_SHEET_NAME}"`);
  }

  const records = [];
  for (let i = dataStart; i < rows.length; i++) {
    const row = rows[i] || [];
    if (!looksLikeDataRow(row, cols)) break;
    const price = cols.price != null ? num(row[cols.price]) : 0;
    const com1 = cols.com1 != null ? num(row[cols.com1]) : Math.round(price * 0.01);
    records.push({
      name: cols.name != null ? cellText(row[cols.name]) : '',
      model: cols.model != null ? cellText(row[cols.model]) : '',
      vin: cols.vin != null ? cellText(row[cols.vin]) : '',
      financier: cols.financier != null ? cellText(row[cols.financier]) : '',
      deliveryDate: cols.deliveryDate != null ? cellText(row[cols.deliveryDate]) : '',
      branch: cols.branch != null ? cellText(row[cols.branch]) : '',
      price,
      com: com1,
      regDiff: cols.regDiff != null ? num(row[cols.regDiff]) : 0,
    });
  }

  if (!records.length) {
    throw new Error('ไม่พบตารางรายคันในไฟล์นี้ กรุณาตรวจสอบว่ามีคอลัมน์ ลำดับ / ชื่อลูกค้า / เลขถัง / ราคาขาย');
  }

  const summary = records.reduce(
    (acc, r) => {
      acc.units += 1;
      acc.value += r.price;
      acc.com1 += r.com;
      acc.regDiff += r.regDiff;
      return acc;
    },
    { units: 0, value: 0, com1: 0, regDiff: 0 }
  );

  return {
    file: fileName,
    sheet: TARGET_SHEET_NAME,
    records,
    summary,
    detectedBrand: detectBrand(rows, anchorRow),
  };
}

function readAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const rd = new FileReader();
    rd.onload = (ev) => resolve(ev.target.result);
    rd.onerror = () => reject(new Error('อ่านไฟล์ไม่สำเร็จ'));
    rd.readAsArrayBuffer(file);
  });
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export async function readVehicleExcelFile(file) {
  const arrayBuffer = await readAsArrayBuffer(file);
  const result = await parseVehicleFile(arrayBuffer, file.name);
  return { ...result, sourceFileBase64: arrayBufferToBase64(arrayBuffer) };
}
