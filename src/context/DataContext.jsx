import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchMonths, createMonth, deleteMonthApi, addBrandToMonthApi } from '../lib/api';
import { sum } from '../lib/seed';

const DataContext = createContext(null);

const EMPTY_ACTIVE = { brands: [], totals: sum([]), deduct: 0, net: 0, label: '', billing: '', records: [] };

export function DataProvider({ children }) {
  const [months, setMonths] = useState([]);
  const [activeMonthId, setActiveMonthId] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [error, setError] = useState(null);

  const load = async () => {
    setStatus('loading');
    setError(null);
    try {
      const data = await fetchMonths();
      setMonths(data);
      setActiveMonthId((prev) => {
        const ids = data.map((m) => m.id);
        if (prev && ids.includes(prev)) return prev;
        return data.length ? data[data.length - 1].id : null;
      });
      setStatus('ready');
    } catch (err) {
      setError(err.message || 'โหลดข้อมูลไม่สำเร็จ');
      setStatus('error');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const selectMonth = (id) => setActiveMonthId(id);

  const addMonth = async (month) => {
    const created = await createMonth(month);
    setMonths((prev) => [...prev, created]);
    setActiveMonthId(created.id);
    return created;
  };

  const addBrandToMonth = async (monthId, brandEntry) => {
    const updated = await addBrandToMonthApi(monthId, brandEntry);
    setMonths((prev) => prev.map((m) => (m.id === monthId ? updated : m)));
    setActiveMonthId(monthId);
    return updated;
  };

  const deleteMonth = async (id) => {
    await deleteMonthApi(id);
    setMonths((prev) => {
      const next = prev.filter((m) => m.id !== id);
      setActiveMonthId((cur) => (cur === id ? (next.length ? next[next.length - 1].id : null) : cur));
      return next;
    });
  };

  const active = useMemo(() => {
    return months.find((m) => m.id === activeMonthId) || EMPTY_ACTIVE;
  }, [months, activeMonthId]);

  const value = {
    months,
    activeMonthId,
    active,
    hasMonths: months.length > 0,
    status,
    error,
    reload: load,
    selectMonth,
    addMonth,
    addBrandToMonth,
    deleteMonth,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
