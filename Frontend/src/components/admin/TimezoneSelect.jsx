import { useMemo, useState } from 'react';
import fallbackZones from '../../utils/timezoneNames.json';

const zoneNames = [...new Set(['UTC', 'Asia/Colombo', ...(
  typeof Intl.supportedValuesOf === 'function'
    ? Intl.supportedValuesOf('timeZone')
    : fallbackZones
)])].sort();

function labelFor(zone, now) {
  try {
    const offset = new Intl.DateTimeFormat('en', {
      timeZone: zone, timeZoneName: 'longOffset',
    }).formatToParts(now).find(part => part.type === 'timeZoneName').value.replace('GMT', 'UTC');
    return `${zone.replaceAll('_', ' ')} (${offset})`;
  } catch {
    return `${zone} (saved setting)`;
  }
}

export default function TimezoneSelect({ value, onChange }) {
  const [search, setSearch] = useState('');
  const options = useMemo(() => {
    const now = new Date();
    return [...new Set([...zoneNames, value])].map(zone => ({
      value: zone, label: labelFor(zone, now),
    }));
  }, [value]);
  const query = search.trim().toLowerCase().replaceAll('_', ' ');
  const matches = options.filter(option => option.label.toLowerCase().includes(query));
  const visible = options.filter(option => option.value === value || matches.includes(option));
  const inputClass = 'w-full min-w-0 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent';

  return (
    <div className="min-w-0 space-y-2">
      <label htmlFor="timezone-search" className="block text-sm font-medium text-gray-700">Search worldwide timezones</label>
      <input id="timezone-search" type="search" value={search}
        onChange={event => setSearch(event.target.value)}
        placeholder="City, region or UTC offset" className={inputClass} />
      <label htmlFor="system-timezone" className="block text-sm font-medium text-gray-700">Timezone</label>
      <select id="system-timezone" value={value} onChange={event => onChange(event.target.value)}
        aria-describedby="timezone-help" className={inputClass}>
        {visible.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      {query && <p role="status" className="text-xs text-gray-500">{matches.length} matching timezones. Current selection remains available.</p>}
      <p id="timezone-help" className="text-xs text-gray-500">Offsets shown are current and may change with daylight saving. Select Asia/Colombo for Sri Lanka. Click Save to apply.</p>
    </div>
  );
}
