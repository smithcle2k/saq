import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Minus } from 'lucide-react';
import { formatTime } from '../utils/timeUtils';

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (newValue: number) => void;
  min?: number;
  max?: number;
  step?: number;
  isTime?: boolean;
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
  const formatValue = (v: number) => (isTime ? formatTime(v) : v.toString());

  const [localValue, setLocalValue] = useState(formatValue(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    setLocalValue(formatValue(value));
  }, [value, isTime]);

  const parseAndCommit = (inputValue: string) => {
    const cleanVal = inputValue.trim();
    let newValue: number;

    if (isTime && cleanVal.includes(':')) {
      const parts = cleanVal.split(':');
      const m = parseInt(parts[0], 10) || 0;
      const s = parseInt(parts[1], 10) || 0;
      newValue = m * 60 + s;
    } else {
      newValue = parseInt(cleanVal, 10);
    }

    if (isNaN(newValue)) newValue = value;
    newValue = Math.max(min, Math.min(max, newValue));

    onChange(newValue);
    setLocalValue(formatValue(newValue));
  };

  const handleBlur = () => parseAndCommit(localValue);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') inputRef.current?.blur();
  };

  const handleFocus = () => {
    if (!readOnly) setTimeout(() => inputRef.current?.select(), 0);
  };

  const handleIncrement = useCallback(() => {
    if (!readOnly && value + step <= max) {
      onChange(value + step);
    }
  }, [readOnly, value, step, max, onChange]);

  const handleDecrement = useCallback(() => {
    if (!readOnly && value - step >= min) {
      onChange(value - step);
    }
  }, [readOnly, value, step, min, onChange]);

  const startLongPress = useCallback((action: () => void) => {
    longPressTimerRef.current = window.setTimeout(() => {
      longPressIntervalRef.current = window.setInterval(() => {
        action();
      }, 80);
    }, 400);
  }, []);

  const stopLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (longPressIntervalRef.current) {
      clearInterval(longPressIntervalRef.current);
      longPressIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopLongPress();
    };
  }, [stopLongPress]);

  return (
    <div className="bg-surface-container rounded-xl overflow-hidden border border-outline-variant">
      <div className="flex items-stretch">
        {/* Label */}
        <div className="bg-surface-container-high px-4 py-3 flex items-center min-w-[90px] border-r border-outline-variant">
          <span className="text-primary text-sm font-medium">
            {label}
          </span>
        </div>

        {/* Value */}
        <div className="flex-1 flex items-center justify-center px-4 py-3">
          {readOnly ? (
            <span className="text-on-surface font-mono text-lg font-semibold">
              {localValue}
            </span>
          ) : (
            <input
              ref={inputRef}
              type="text"
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              onBlur={handleBlur}
              onFocus={handleFocus}
              onKeyDown={handleKeyDown}
              className="w-full text-center text-on-surface font-mono text-lg font-semibold bg-transparent outline-none"
              aria-label={`Enter ${label}`}
            />
          )}
        </div>

        {/* Buttons */}
        {!readOnly && (
          <div className="flex items-stretch border-l border-outline-variant">
            <button
              onClick={handleDecrement}
              onMouseDown={() => startLongPress(handleDecrement)}
              onMouseUp={stopLongPress}
              onMouseLeave={stopLongPress}
              onTouchStart={() => startLongPress(handleDecrement)}
              onTouchEnd={stopLongPress}
              className="w-12 flex items-center justify-center bg-surface-container-high text-on-surface-variant hover:text-on-surface active:bg-surface-container-highest transition-colors touch-manipulation"
              aria-label={`Decrease ${label}`}
              tabIndex={-1}
            >
              <Minus size={18} />
            </button>
            <div className="w-px bg-outline-variant" />
            <button
              onClick={handleIncrement}
              onMouseDown={() => startLongPress(handleIncrement)}
              onMouseUp={stopLongPress}
              onMouseLeave={stopLongPress}
              onTouchStart={() => startLongPress(handleIncrement)}
              onTouchEnd={stopLongPress}
              className="w-12 flex items-center justify-center bg-surface-container-high text-on-surface-variant hover:text-on-surface active:bg-surface-container-highest transition-colors touch-manipulation"
              aria-label={`Increase ${label}`}
              tabIndex={-1}
            >
              <Plus size={18} />
            </button>
          </div>
        )}

        {readOnly && (
          <div className="w-[97px] bg-surface-container-high border-l border-outline-variant" />
        )}
      </div>
    </div>
  );
};
