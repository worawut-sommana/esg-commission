export default function SortTh({ label, col, align = 'left', sortKey, sortDir, onSort, className }) {
  const active = sortKey === col;
  const justify = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';
  return (
    <th className={className}>
      <button
        onClick={() => onSort(col)}
        className={'inline-flex items-center gap-[5px] cursor-pointer bg-transparent border-none p-0 font-inherit text-inherit w-full ' + justify}
      >
        <span>{label}</span>
        <span className={'text-[9px] leading-none ' + (active ? 'text-[var(--ac)]' : 'text-[#c7cdd6]')}>
          {active ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
        </span>
      </button>
    </th>
  );
}
