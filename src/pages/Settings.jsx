import { useEffect, useState } from 'react';
import { card, btnPrimary, btnGhost, thL, tdL, tdMono } from '../lib/styles';
import { fi, formatIsoDate } from '../lib/format';
import {
  fetchIntegrationSettings,
  saveIntegrationSettings,
  testIntegrationSettings,
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
} from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [apiUrl, setApiUrl] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [apiKeyMasked, setApiKeyMasked] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedMsg, setSavedMsg] = useState('');

  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState('');
  const [testError, setTestError] = useState('');
  const [testItems, setTestItems] = useState(null);
  const [rawItem, setRawItem] = useState(null);

  const load = async () => {
    setStatus('loading');
    setError('');
    try {
      const s = await fetchIntegrationSettings();
      setApiUrl(s.apiUrl || '');
      setHasApiKey(s.hasApiKey);
      setApiKeyMasked(s.apiKeyMasked || '');
      setStatus('ready');
    } catch (err) {
      setError(err.message || 'โหลดการตั้งค่าไม่สำเร็จ');
      setStatus('error');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSave = async () => {
    setSaving(true);
    setError('');
    setSavedMsg('');
    try {
      const s = await saveIntegrationSettings({ apiUrl: apiUrl.trim(), apiKey: apiKeyInput.trim() });
      setHasApiKey(s.hasApiKey);
      setApiKeyMasked(s.apiKeyMasked || '');
      setApiKeyInput('');
      setSavedMsg('บันทึกการตั้งค่าเรียบร้อย');
    } catch (err) {
      setError(err.message || 'บันทึกไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setSaving(false);
    }
  };

  const onTest = async () => {
    setTesting(true);
    setTestMsg('');
    setTestError('');
    setTestItems(null);
    setRawItem(null);
    try {
      const r = await testIntegrationSettings({ apiUrl: apiUrl.trim(), apiKey: apiKeyInput.trim() });
      setTestMsg(
        r.total > 0
          ? `เชื่อมต่อสำเร็จ — พบข้อมูลวันนี้ ${fi(r.total)} รายการ`
          : 'เชื่อมต่อสำเร็จ (ยังไม่มีข้อมูลของวันนี้)'
      );
      setTestItems(r.items || []);
    } catch (err) {
      setTestError(err.message || 'ทดสอบการเชื่อมต่อไม่สำเร็จ');
    } finally {
      setTesting(false);
    }
  };

  return (
    <section className="appfade">
      <div className="mb-[22px]">
        <div className="text-xs font-semibold tracking-[0.06em] uppercase text-[var(--ac)] mb-[6px]">ตั้งค่า</div>
        <h1 className="m-0 text-[27px] font-bold tracking-[-0.01em]">เชื่อมต่อ API ภายนอก</h1>
        <div className="text-[#6b7686] text-[13.5px] mt-[6px]">
          ตั้งค่า URL และ API Key สำหรับดึงข้อมูลยอดขายจากระบบ eaksahalink เพื่อตรวจสอบกับข้อมูลที่อัปโหลด
        </div>
      </div>

      {status === 'loading' && <div className="text-[#6b7686] text-[14px]">กำลังโหลด...</div>}

      {status !== 'loading' && (
        <div className={card + ' max-w-[560px]'}>
          {error && (
            <div className="mb-4 px-4 py-[12px] bg-[#fef2f2] border border-[#fecaca] rounded-xl text-[#b91c1c] text-[13.5px]">
              {error}
            </div>
          )}
          {savedMsg && (
            <div className="mb-4 px-4 py-[12px] bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl text-[#15803d] text-[13.5px]">
              {savedMsg}
            </div>
          )}

          <label className="flex flex-col gap-[6px] text-[12.5px] text-[#6b7686] font-semibold mb-4">
            API URL
            <input
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://www.eaksahalink.com/api/external/integration"
              className="px-3 py-[10px] border border-[#d7dce4] rounded-[10px] text-[13.5px] font-mono"
            />
          </label>

          <label className="flex flex-col gap-[6px] text-[12.5px] text-[#6b7686] font-semibold mb-2">
            API Key
            <input
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder={hasApiKey ? apiKeyMasked : 'eak_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'}
              className="px-3 py-[10px] border border-[#d7dce4] rounded-[10px] text-[13.5px] font-mono"
              type="password"
              autoComplete="off"
            />
          </label>
          <div className="text-[11.5px] text-[#8a94a3] mb-5">
            {hasApiKey
              ? `ตั้งค่าไว้แล้ว (${apiKeyMasked}) — เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน`
              : 'ยังไม่ได้ตั้งค่า API Key'}
          </div>

          {testMsg && (
            <div className="mb-4 px-4 py-[12px] bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl text-[#15803d] text-[13.5px]">
              {testMsg}
            </div>
          )}
          {testError && (
            <div className="mb-4 px-4 py-[12px] bg-[#fef2f2] border border-[#fecaca] rounded-xl text-[#b91c1c] text-[13.5px]">
              {testError}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={onSave} disabled={saving} className={btnPrimary + ' disabled:opacity-60 disabled:cursor-not-allowed'}>
              {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
            </button>
            <button onClick={onTest} disabled={testing} className={btnGhost + ' disabled:opacity-60 disabled:cursor-not-allowed'}>
              {testing ? 'กำลังทดสอบ...' : 'ทดสอบการเชื่อมต่อ'}
            </button>
          </div>
        </div>
      )}

      {testItems && (
        <div className={card + ' max-w-[900px] mt-6'}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="m-0 text-[16px] font-bold tracking-[-0.01em]">ตัวอย่างข้อมูลจาก API</h2>
              <div className="text-[#6b7686] text-[12.5px] mt-[4px]">
                แสดง {testItems.length} รายการล่าสุดที่ดึงมาได้จากการทดสอบเชื่อมต่อ (ข้อมูลของวันนี้)
              </div>
            </div>
            <button
              onClick={() => setRawItem(rawItem ? null : 'all')}
              className="px-[12px] py-[7px] bg-white border border-[#d7dce4] rounded-[8px] text-[12px] font-semibold text-[#5a6473] shrink-0"
            >
              {rawItem ? 'ซ่อน JSON' : 'ดู JSON ทั้งหมด'}
            </button>
          </div>

          {testItems.length === 0 ? (
            <div className="text-[#8a94a3] text-[13.5px]">ไม่มีข้อมูลของวันนี้</div>
          ) : rawItem === 'all' ? (
            <pre className="bg-[#0b1120] text-[#c9d4e3] text-[12px] leading-[1.6] rounded-xl p-4 overflow-auto max-h-[500px]">
              {JSON.stringify(testItems, null, 2)}
            </pre>
          ) : (
            <div className="overflow-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[#e9edf3]">
                    <th className={thL}>เลขที่สัญญา</th>
                    <th className={thL}>ลูกค้า</th>
                    <th className={thL}>แบรนด์</th>
                    <th className={thL}>เลขที่ใบจอง</th>
                    <th className={thL}>วันที่จอง</th>
                    <th className={thL}>วันที่ขาย</th>
                    <th className={thL}>วันที่ส่งมอบ</th>
                    <th className={thL}></th>
                  </tr>
                </thead>
                <tbody>
                  {testItems.map((it, i) => (
                    <tr key={it.contno || i} className="border-b border-[#f1f3f6]">
                      <td className={tdMono}>{it.contno}</td>
                      <td className={tdL}>{it.customer_name}</td>
                      <td className={tdL}>{it.brand || it.database_name}</td>
                      <td className={tdMono}>{it.resvno}</td>
                      <td className={tdL}>{formatIsoDate(it.resv_date)}</td>
                      <td className={tdL}>{formatIsoDate(it.sdate)}</td>
                      <td className={tdL}>{formatIsoDate(it.delivery_date)}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => setRawItem(rawItem === it ? null : it)}
                          className="text-[11.5px] font-semibold text-[var(--ac)]"
                        >
                          JSON
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rawItem && rawItem !== 'all' && (
                <pre className="mt-3 bg-[#0b1120] text-[#c9d4e3] text-[12px] leading-[1.6] rounded-xl p-4 overflow-auto max-h-[400px]">
                  {JSON.stringify(rawItem, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}

      <UserManagement />
    </section>
  );
}

function UserManagement() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [creating, setCreating] = useState(false);

  const [resetId, setResetId] = useState(null);
  const [resetPassword, setResetPassword] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setStatus('loading');
    setError('');
    try {
      setUsers(await fetchUsers());
      setStatus('ready');
    } catch (err) {
      setError(err.message || 'โหลดรายชื่อผู้ใช้ไม่สำเร็จ');
      setStatus('error');
    }
  };

  useEffect(() => {
    if (me?.isAdmin) load();
  }, [me?.isAdmin]);

  if (!me?.isAdmin) return null;

  const onCreate = async (e) => {
    e.preventDefault();
    if (!newUsername.trim() || newPassword.length < 8) return;
    setCreating(true);
    setError('');
    try {
      const created = await createUser({ username: newUsername.trim(), password: newPassword, isAdmin: newIsAdmin });
      setUsers((prev) => [...prev, created]);
      setNewUsername('');
      setNewPassword('');
      setNewIsAdmin(false);
    } catch (err) {
      setError(err.message || 'สร้างผู้ใช้ไม่สำเร็จ');
    } finally {
      setCreating(false);
    }
  };

  const onToggleAdmin = async (u) => {
    setBusyId(u.id);
    setError('');
    try {
      const updated = await updateUser(u.id, { isAdmin: !u.isAdmin });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)));
    } catch (err) {
      setError(err.message || 'อัปเดตไม่สำเร็จ');
    } finally {
      setBusyId(null);
    }
  };

  const onResetPassword = async (id) => {
    if (resetPassword.length < 8) return;
    setBusyId(id);
    setError('');
    try {
      await updateUser(id, { password: resetPassword });
      setResetId(null);
      setResetPassword('');
    } catch (err) {
      setError(err.message || 'ตั้งรหัสผ่านใหม่ไม่สำเร็จ');
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async (id) => {
    setBusyId(id);
    setError('');
    try {
      await deleteUser(id);
      setUsers((prev) => prev.filter((x) => x.id !== id));
    } catch (err) {
      setError(err.message || 'ลบผู้ใช้ไม่สำเร็จ');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mt-8">
      <div className="mb-[14px]">
        <h2 className="m-0 text-[18px] font-bold tracking-[-0.01em]">จัดการผู้ใช้งาน</h2>
        <div className="text-[#6b7686] text-[13px] mt-[4px]">เพิ่ม ลบ หรือเปลี่ยนสิทธิ์ผู้ใช้งานในระบบ</div>
      </div>

      <div className={card + ' max-w-[640px]'}>
        {error && (
          <div className="mb-4 px-4 py-[12px] bg-[#fef2f2] border border-[#fecaca] rounded-xl text-[#b91c1c] text-[13.5px]">
            {error}
          </div>
        )}

        {status === 'loading' && <div className="text-[#6b7686] text-[14px]">กำลังโหลด...</div>}

        {status !== 'loading' && (
          <>
            <table className="w-full border-collapse mb-5">
              <thead>
                <tr className="border-b border-[#e9edf3]">
                  <th className="text-left text-[11.5px] font-bold text-[#6b7686] uppercase tracking-[0.03em] py-2">ชื่อผู้ใช้</th>
                  <th className="text-left text-[11.5px] font-bold text-[#6b7686] uppercase tracking-[0.03em] py-2">สิทธิ์</th>
                  <th className="text-right text-[11.5px] font-bold text-[#6b7686] uppercase tracking-[0.03em] py-2">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-[#f1f3f6]">
                    <td className="py-[10px] text-[13.5px] font-semibold">
                      {u.username}
                      {u.id === me.id && <span className="ml-2 text-[11px] text-[#98a2b3] font-normal">(คุณ)</span>}
                    </td>
                    <td className="py-[10px] text-[13px]">
                      <label className="inline-flex items-center gap-[6px] cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={u.isAdmin}
                          disabled={busyId === u.id}
                          onChange={() => onToggleAdmin(u)}
                        />
                        ผู้ดูแลระบบ
                      </label>
                    </td>
                    <td className="py-[10px] text-right">
                      <div className="inline-flex items-center gap-2">
                        {resetId === u.id ? (
                          <>
                            <input
                              value={resetPassword}
                              onChange={(e) => setResetPassword(e.target.value)}
                              type="password"
                              placeholder="รหัสผ่านใหม่"
                              className="px-2 py-[6px] border border-[#d7dce4] rounded-[8px] text-[12.5px] w-[140px]"
                            />
                            <button
                              onClick={() => onResetPassword(u.id)}
                              disabled={busyId === u.id || resetPassword.length < 8}
                              className="px-[10px] py-[6px] bg-[var(--ac)] text-white rounded-[8px] text-[12px] font-semibold disabled:opacity-60"
                            >
                              บันทึก
                            </button>
                            <button
                              onClick={() => {
                                setResetId(null);
                                setResetPassword('');
                              }}
                              className="px-[10px] py-[6px] bg-white border border-[#d7dce4] rounded-[8px] text-[12px] font-semibold"
                            >
                              ยกเลิก
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setResetId(u.id);
                                setResetPassword('');
                              }}
                              className="px-[10px] py-[6px] bg-white border border-[#d7dce4] rounded-[8px] text-[12px] font-semibold text-[#5a6473]"
                            >
                              ตั้งรหัสผ่านใหม่
                            </button>
                            <button
                              onClick={() => onDelete(u.id)}
                              disabled={busyId === u.id || u.id === me.id}
                              className="px-[10px] py-[6px] bg-white border border-[#fecaca] text-[#b91c1c] rounded-[8px] text-[12px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              ลบ
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <form onSubmit={onCreate} className="flex items-end gap-3 flex-wrap">
              <label className="flex flex-col gap-[6px] text-[12.5px] text-[#6b7686] font-semibold">
                ชื่อผู้ใช้ใหม่
                <input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="px-3 py-[9px] border border-[#d7dce4] rounded-[10px] text-[13.5px] w-[160px]"
                />
              </label>
              <label className="flex flex-col gap-[6px] text-[12.5px] text-[#6b7686] font-semibold">
                รหัสผ่าน
                <input
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  type="password"
                  placeholder="อย่างน้อย 8 ตัวอักษร"
                  className="px-3 py-[9px] border border-[#d7dce4] rounded-[10px] text-[13.5px] w-[160px]"
                />
              </label>
              <label className="inline-flex items-center gap-[6px] cursor-pointer select-none text-[12.5px] text-[#5a6473] font-semibold pb-[10px]">
                <input type="checkbox" checked={newIsAdmin} onChange={(e) => setNewIsAdmin(e.target.checked)} />
                ผู้ดูแลระบบ
              </label>
              <button
                type="submit"
                disabled={creating || !newUsername.trim() || newPassword.length < 8}
                className={btnPrimary + ' disabled:opacity-60 disabled:cursor-not-allowed'}
              >
                {creating ? 'กำลังเพิ่ม...' : 'เพิ่มผู้ใช้'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
