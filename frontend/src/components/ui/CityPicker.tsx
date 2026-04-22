import { useState, useRef, useEffect } from 'react';
import { MapPin, ChevronDown, X } from 'lucide-react';
import { HOT_CITIES, CITY_GROUPS } from '@/data/cities';

interface CityPickerProps {
  value: string;
  onChange: (city: string) => void;
  placeholder?: string;
  className?: string;
}

export default function CityPicker({ value, onChange, placeholder = '选择城市', className = '' }: CityPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filteredGroups = search.trim()
    ? CITY_GROUPS.map(g => ({
        ...g,
        cities: g.cities.filter(c => c.includes(search.trim())),
      })).filter(g => g.cities.length > 0)
    : CITY_GROUPS;

  const filteredHot = search.trim()
    ? HOT_CITIES.filter(c => c.includes(search.trim()))
    : HOT_CITIES;

  function selectCity(city: string) {
    onChange(city);
    setIsOpen(false);
    setSearch('');
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 border border-gray-200 rounded-lg text-sm hover:border-gray-300 focus:ring-2 focus:ring-primary-500 outline-none bg-white"
      >
        <span className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-gray-400" />
          <span className={value ? 'text-gray-900' : 'text-gray-400'}>{value || placeholder}</span>
        </span>
        <div className="flex items-center gap-1">
          {value && (
            <span
              onClick={(e) => { e.stopPropagation(); onChange(''); }}
              className="p-0.5 hover:bg-gray-100 rounded"
            >
              <X className="w-3.5 h-3.5 text-gray-400" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-xl shadow-lg border border-gray-200 max-h-80 overflow-y-auto">
          <div className="sticky top-0 bg-white p-2 border-b border-gray-100">
            <input
              type="text"
              id="city-picker-search"
              name="city-picker-search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索城市..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              autoFocus
            />
          </div>

          {filteredHot.length > 0 && (
            <div className="p-3">
              <p className="text-xs font-medium text-gray-400 mb-2">热门城市</p>
              <div className="flex flex-wrap gap-2">
                {filteredHot.map(city => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => selectCity(city)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      value === city
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-primary-50 hover:text-primary-600'
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredGroups.map(group => (
            <div key={group.label} className="px-3 py-2 border-t border-gray-50">
              <p className="text-xs font-medium text-gray-400 mb-2">{group.label}</p>
              <div className="flex flex-wrap gap-2">
                {group.cities.map(city => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => selectCity(city)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      value === city
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-50 text-gray-700 hover:bg-primary-50 hover:text-primary-600'
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {filteredHot.length === 0 && filteredGroups.length === 0 && (
            <div className="p-4 text-center text-sm text-gray-400">未找到匹配的城市</div>
          )}
        </div>
      )}
    </div>
  );
}
