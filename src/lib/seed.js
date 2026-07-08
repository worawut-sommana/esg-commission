export function sum(brands) {
  const t = { units: 0, value: 0, com1: 0, chunk2: 0, regDiff: 0, total: 0 };
  brands.forEach((b) => {
    t.units += b.units || 0;
    t.value += b.value || 0;
    t.com1 += b.com1 || 0;
    t.chunk2 += b.chunk2 || 0;
    t.regDiff += b.regDiff || 0;
    t.total += b.total || 0;
  });
  return t;
}

function seedRecords() {
  const P = {
    'JAECOO 6 4WD': 1299000,
    'JAECOO 6 EV 4WD': 1499000,
    'OMODA C5 EV': 1099000,
    'OMODA C5 EV MAX+': 1199000,
    'JAECOO 5': 899000,
    'JAECOO 5 MAX+': 999000,
    'JAECOO 6 EV 2WD PRO': 1359000,
    'JAECOO 6T EV 4WD': 1550000,
  };
  const raw = [
    ['คุณศิริพร  ฟักทอง', 'JAECOO 6 4WD', 'LVUGTBAD4TD205203', '12/6/2569'],
    ['คุณเยาวพา  โพธิ์ศรี', 'OMODA C5 EV', 'LVUGTBAD0TD215582', '12/6/2569'],
    ['คุณจตุพร  อยู่เปี่ยม', 'JAECOO 5 MAX+', 'LNNBBDBN0TD957038', '13/6/2569'],
    ['คุณชุติมา  คนเฉลียว', 'JAECOO 6 EV 4WD', 'LVUGTBAD2TT004096', '14/6/2569'],
    ['คุณก้องภพ  คุมมงคล', 'OMODA C5 EV MAX+', 'LVUGTBAD2TD215616', '15/6/2569'],
    ['คุณกัญญรักษ์  พุ่มเกิด', 'JAECOO 6 4WD', 'LVUGTBAD6TD215201', '15/6/2569'],
    ['คุณวีระศักดิ์  พันทอง', 'JAECOO 5', 'LVUGTBAD1TD215607', '15/6/2569'],
    ['คุณสุพรรณี  หอมแช่ม', 'OMODA C5 EV', 'LVUGTBAD0TT003187', '15/6/2569'],
    ['คุณอรวรรณ  แผนสมบูรณ์', 'JAECOO 6 EV 2WD PRO', 'LVUGTBAD4TD202317', '13/6/2569'],
    ['คุณณรงค์  บ่อพลอย', 'JAECOO 6 4WD', 'LVUGTBAD9TD215614', '15/6/2569'],
    ['คุณนัฐศักดิ์  แซ่ตั้น', 'JAECOO 5 MAX+', 'LNNBBDBN1TDH21064', '15/6/2569'],
    ['คุณสุกัญญา  สุขภาค', 'OMODA C5 EV MAX+', 'LVUGTBAD5TT002620', '15/6/2569'],
    ['คุณสุธิดา  ยังเจริญ', 'JAECOO 6 EV 4WD', 'LVUGTBAD3TT004107', '15/6/2569'],
    ['คุณกิตติ  ยืนยง', 'JAECOO 5', 'LNNBBDBN9TDH21135', '15/6/2569'],
    ['คุณบุญเลิศ ศิวชาติ', 'JAECOO 6 4WD', 'LVUGTBAD8TD215197', '15/6/2569'],
    ['บจก.นวกิจ พร็อพเพอร์ตี้', 'OMODA C5 EV', 'LNNBDDDN3TT000464', '15/6/2569'],
    ['คุณบุญยาพร  กระชน', 'JAECOO 6 EV 2WD PRO', 'LVUGTBAD6TT004067', '15/6/2569'],
    ['คุณอภิสิทธิ์  อะหมัด', 'JAECOO 5 MAX+', 'LVUGTBAD0TT004324', '16/6/2569'],
    ['คุณสุภารัตน์  สุมินทนะ', 'OMODA C5 EV MAX+', 'LVUGTBAD8TD215569', '16/6/2569'],
    ['คุณจตุพร  โดมทอง', 'JAECOO 6 4WD', 'LVUGTBAD2TT004261', '16/6/2569'],
    ['คุณสุภาวรรณ  เทพบุรี', 'OMODA C5 EV', 'LVUGTBAD4TT003970', '16/6/2569'],
    ['คุณเจษฏายุทธ  เมธวัน', 'JAECOO 5', 'LVUGTBAD7TT004000', '16/6/2569'],
    ['คุณทัดชภณ  วรหิรัญกิจ', 'JAECOO 6 4WD', 'LVUGTBAD2TT004373', '16/6/2569'],
    ['คุณประภัสสรา  เจริญสุข', 'JAECOO 6 EV 4WD', 'LVUGTBAD4TT004407', '16/6/2569'],
  ];
  const financiers = ['TISCO', 'TTB', 'AYCAL', 'KL', 'ซื้อสด'];
  return raw.map((r, i) => {
    const price = P[r[1]] || 1000000;
    return {
      brand: 'OJ',
      name: r[0],
      model: r[1],
      vin: r[2],
      financier: financiers[i % financiers.length],
      deliveryDate: r[3],
      price,
      com: Math.round(price * 0.01),
    };
  });
}

export function seed() {
  const B = (brand, units, value, com1, chunk2, regDiff, total) => ({ brand, units, value, com1, chunk2, regDiff, total });
  const sept = [
    B('OJ', 1215, 798250300, 7982503, 971395, 910573, 9864471),
    B('AION', 227, 154411900, 1459740, 0, 162007, 1621747),
    B('GEELY', 135, 71396870, 708080, 0, 146626, 854706),
    B('CHERY', 185, 150719700, 1505797, 411366, 135547, 2052710),
    B('WULING', 291, 236149000, 2361490, 0, 274704, 2636194),
    B('GWM', 8, 9502000, 80630, 0, 7712, 88342),
    B('MG', 52, 42144800, 421448, 0, 46800, 468248),
  ];
  const septTotals = { units: 2113, value: 1462574570, com1: 14519688, chunk2: 1382761, regDiff: 1683969, total: 17586418 };
  const rec = seedRecords();
  const m2 = {
    id: 'm_sept',
    label: 'กันยายน 2569',
    billing: '29 มิถุนายน 2569',
    brands: sept,
    totals: septTotals,
    deduct: 71100,
    net: 17515318,
    records: rec,
  };
  const f = 0.86;
  const aug = sept.map((b) => {
    const units = Math.round(b.units * f);
    const value = Math.round(b.value * f);
    const com1 = Math.round(value * 0.01);
    const chunk2 = Math.round(b.chunk2 * 0.8);
    const regDiff = Math.round(b.regDiff * f);
    return { brand: b.brand, units, value, com1, chunk2, regDiff, total: com1 + chunk2 + regDiff };
  });
  const augTotals = sum(aug);
  const augDeduct = 61000;
  const m1 = {
    id: 'm_aug',
    label: 'สิงหาคม 2569',
    billing: '30 พฤษภาคม 2569',
    brands: aug,
    totals: augTotals,
    deduct: augDeduct,
    net: augTotals.total - augDeduct,
    records: [],
  };
  return { months: [m1, m2], activeMonthId: 'm_sept' };
}
