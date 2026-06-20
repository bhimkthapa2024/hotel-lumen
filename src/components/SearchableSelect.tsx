import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';

export default function SearchableSelect({ 
  options, 
  value, 
  onChange, 
  placeholder = 'Select...',
  disabled = false,
  required = false
}: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt: any) => 
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = options.find((opt: any) => opt.value === value);

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <div 
        className={`form-input ${disabled ? 'disabled' : ''}`}
        style={{ 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: disabled ? 'not-allowed' : 'pointer',
          backgroundColor: disabled ? 'var(--color-bg-base)' : 'var(--color-bg-surface)',
          opacity: disabled ? 0.7 : 1,
          border: isOpen ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
          boxShadow: isOpen ? '0 0 0 3px var(--color-primary-dim)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
        }}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span style={{ color: selectedOption ? 'var(--color-text-primary)' : '#94a3b8' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} color="var(--color-text-secondary)" />
      </div>

      {/* Hidden input for form submission & native required validation if needed */}
      <input type="text" value={value} required={required} style={{ opacity: 0, position: 'absolute', height: 0, width: 0, pointerEvents: 'none' }} onChange={() => {}} />

      {isOpen && (
        <div style={{ 
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, 
          marginTop: '0.5rem', backgroundColor: '#fff', borderRadius: 'var(--radius-md)', 
          boxShadow: 'var(--shadow-float)', border: '1px solid var(--color-border)',
          maxHeight: '250px', display: 'flex', flexDirection: 'column'
        }}>
          <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Search size={14} color="var(--color-text-secondary)" />
            <input 
              autoFocus
              type="text" 
              placeholder="Search..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.875rem', color: 'var(--color-text-primary)' }}
            />
          </div>
          <ul style={{ listStyle: 'none', overflowY: 'auto', flex: 1 }}>
            {filteredOptions.length > 0 ? filteredOptions.map((opt: any) => (
              <li 
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                  setSearch('');
                }}
                style={{ 
                  padding: '0.75rem 1rem', cursor: 'pointer', fontSize: '0.875rem',
                  backgroundColor: opt.value === value ? 'var(--color-primary-dim)' : 'transparent',
                  color: opt.value === value ? 'var(--color-primary)' : 'var(--color-text-primary)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-surface-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = opt.value === value ? 'var(--color-primary-dim)' : 'transparent'}
              >
                {opt.label}
              </li>
            )) : (
              <li style={{ padding: '1rem', color: 'var(--color-text-secondary)', fontSize: '0.875rem', textAlign: 'center' }}>No results found.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
