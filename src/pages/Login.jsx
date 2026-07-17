import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { card, btnPrimary } from '../lib/styles';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true);
    setError('');
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err.message || 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#eef1f5] px-4" style={{ '--ac': '#3b5bdb' }}>
      <div className={card + ' w-full max-w-[380px]'}>
        <div className="mb-6">
          <img src="/logo.png" alt="EAKSAHA GROUP" className="w-full max-w-[220px] h-auto" />
          <div className="text-[11px] text-[#98a2b3] mt-2">ระบบค่าคอมรถยนต์ · Dashboard</div>
        </div>

        <h1 className="m-0 text-[20px] font-bold tracking-[-0.01em] mb-1">เข้าสู่ระบบ</h1>
        <div className="text-[#6b7686] text-[13px] mb-5">กรอกชื่อผู้ใช้และรหัสผ่านเพื่อเข้าใช้งาน</div>

        {error && (
          <div className="mb-4 px-4 py-[12px] bg-[#fef2f2] border border-[#fecaca] rounded-xl text-[#b91c1c] text-[13.5px]">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-[6px] text-[12.5px] text-[#6b7686] font-semibold">
            ชื่อผู้ใช้
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
              className="px-3 py-[10px] border border-[#d7dce4] rounded-[10px] text-[13.5px]"
            />
          </label>
          <label className="flex flex-col gap-[6px] text-[12.5px] text-[#6b7686] font-semibold">
            รหัสผ่าน
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              className="px-3 py-[10px] border border-[#d7dce4] rounded-[10px] text-[13.5px]"
            />
          </label>

          <button
            type="submit"
            disabled={loading || !username.trim() || !password}
            className={btnPrimary + ' justify-center disabled:opacity-60 disabled:cursor-not-allowed'}
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>
      </div>
    </div>
  );
}
