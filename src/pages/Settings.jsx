import { useEffect, useState } from 'react';
import { card, btnPrimary } from '../lib/styles';
import { fetchIntegrationSettings, saveIntegrationSettings } from '../lib/api';

export default function Settings() {
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [apiUrl, setApiUrl] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [apiKeyMasked, setApiKeyMasked] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedMsg, setSavedMsg] = useState('');

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

          <button onClick={onSave} disabled={saving} className={btnPrimary + ' disabled:opacity-60 disabled:cursor-not-allowed'}>
            {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
          </button>
        </div>
      )}
    </section>
  );
}
