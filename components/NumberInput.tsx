import React, { useState, useEffect, useRef } from 'react';
import { Plus, Minus } from 'lucide-react';
import { formatTime } from '../utils/timeUtils';

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (newValue: number) => void;
  min?: number;
  max?: number;
  step?: number;
  isTime?: boolean; // if true, format as MM:SS, else just number
  readOnly?: boolean;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  label,
  value,
  onChange,
  min = 0,
  max = 3600,
  step = 1,
  isTime = true,
  readOnly = false,
}) => {
  const [localValue, setLocalValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync local value when prop value changes and not editing
  useEffect(() => {
    if (!isEditing) {
      setLocalValue(isTime ? formatTime(value) : value.toString());
    }
  }, [value, isTime, isEditing]);

  const parseAndCommit = (inputValue: string) => {
    let newValue = value;
    
    // Remove whitespace
    const cleanVal = inputValue.trim();

    if (isTime && cleanVal.includes(':')) {
       // Parse MM:SS
       const parts = cleanVal.split(':');
       const m = parseInt(parts[0], 10) || 0;
       const s = parseInt(parts[1], 10) || 0;
       newValue = m * 60 + s;
    } else {
       // Treat as total seconds (or raw number for Rounds)
       newValue = parseInt(cleanVal, 10);
    }

    if (isNaN(newValue)) {
        // Revert to previous value if invalid
        newValue = value; 
    }

    // Clamp values
    if (newValue < min) newValue = min;
    if (newValue > max) newValue = max;

    onChange(newValue);
    setLocalValue(isTime ? formatTime(newValue) : newValue.toString());
    setIsEditing(false);
  };

  const handleBlur = () => {
    if (isEditing) {
        parseAndCommit(localValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
  };

  const handleFocus = () => {
    if (!readOnly) {
        setIsEditing(true);
        // Small delay to ensure focus event completes before selection
        setTimeout(() => inputRef.current?.select(), 0);
    }
  };

  const handleIncrement = () => {
    if (!readOnly && value + step <= max) onChange(value + step);
  };

  const handleDecrement = () => {
    if (!readOnly && value - step >= min) onChange(value - step);
  };

  return (
    <div className="flex items-center justify-between mb-3 bg-gray-800 rounded-lg overflow-hidden shadow-lg border border-gray-700">
      <div className="bg-sky-900 w-32 px-4 py-4 flex items-center h-full border-r border-gray-700 shrink-0">
        <span className="text-white font-bold text-sm tracking-wider uppercase">{label}</span>
      </div>
      
      <div className="flex-1 flex justify-center items-center bg-white px-2 py-2 relative">
        <input
            ref={inputRef}
            type="text"
            value={isEditing ? localValue : (isTime ? formatTime(value) : value)}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            readOnly={readOnly}
            className={`w-full text-center text-gray-900 font-mono text-xl font-bold bg-transparent outline-none ${readOnly ? 'cursor-default' : 'cursor-text'}`}
            aria-label={`Enter ${label}`}
        />
      </div>

      <div className="flex items-center bg-gray-800 h-14 w-[112px] justify-center shrink-0">
        {!readOnly ? (
          <>
            <button
              onClick={handleDecrement}
              className="w-14 h-14 flex items-center justify-center bg-white text-sky-900 border-l border-gray-300 active:bg-gray-200 transition-colors hover:bg-gray-50"
              aria-label={`Decrease ${label}`}
              tabIndex={-1} 
            >
              <Minus size={24} strokeWidth={4} />
            </button>
            <button
              onClick={handleIncrement}
              className="w-14 h-14 flex items-center justify-center bg-white text-sky-900 border-l border-gray-300 active:bg-gray-200 transition-colors hover:bg-gray-50"
              aria-label={`Increase ${label}`}
              tabIndex={-1}
            >
              <Plus size={24} strokeWidth={4} />
            </button>
          </>
        ) : (
          <div className="w-full h-full bg-gray-800 border-l border-gray-700" />
        )}
      </div>
    </div>
  );
};