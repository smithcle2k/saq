import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TextInput,
  TextInputKeyPressEventData,
  View,
  Pressable,
} from 'react-native';
import { colors, fonts } from '../theme';
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
  const formatValue = useCallback((v: number) => (isTime ? formatTime(v) : v.toString()), [isTime]);
  const [localValue, setLocalValue] = useState(formatValue(value));
  const inputRef = useRef<TextInput>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setLocalValue(formatValue(value));
  }, [value, formatValue]);

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

  const handleKeyDown = (event: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (event.nativeEvent.key === 'Enter') inputRef.current?.blur();
  };

  const handleFocus = () => {
    if (!readOnly) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
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
    longPressTimerRef.current = setTimeout(() => {
      longPressIntervalRef.current = setInterval(() => {
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
    <View style={styles.card}>
      <View style={styles.labelWrap}>
        <Text style={styles.label}>{label}</Text>
      </View>

      <View style={styles.valueWrap}>
        <View style={styles.valueGlow} />
        <View style={styles.valueInner}>
          {readOnly ? (
            <Text style={styles.valueText}>{localValue}</Text>
          ) : (
            <TextInput
              ref={inputRef}
              value={localValue}
              onChangeText={setLocalValue}
              onBlur={handleBlur}
              onFocus={handleFocus}
              onKeyPress={handleKeyDown}
              style={styles.input}
              keyboardType={isTime ? 'numbers-and-punctuation' : 'number-pad'}
              returnKeyType="done"
              selectionColor={colors.primary}
              accessible
              accessibilityLabel={`Enter ${label}`}
            />
          )}
        </View>
      </View>

      {readOnly ? (
        <View style={styles.readOnlySpacer} />
      ) : (
        <View style={styles.controls}>
          <Pressable
            onPress={handleDecrement}
            onPressIn={() => startLongPress(handleDecrement)}
            onPressOut={stopLongPress}
            style={({ pressed }) => [styles.controlButton, pressed && styles.controlButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Decrease ${label}`}
          >
            <Ionicons name="remove" size={20} color={colors.onSurfaceVariant} />
          </Pressable>
          <View style={styles.controlDivider} />
          <Pressable
            onPress={handleIncrement}
            onPressIn={() => startLongPress(handleIncrement)}
            onPressOut={stopLongPress}
            style={({ pressed }) => [styles.controlButton, pressed && styles.controlButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Increase ${label}`}
          >
            <Ionicons name="add" size={20} color={colors.onSurfaceVariant} />
          </Pressable>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    minHeight: 72,
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surfaceCard,
  },
  labelWrap: {
    minWidth: 94,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 16,
  },
  label: {
    color: colors.primary,
    fontFamily: fonts.sansSemiBold,
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  valueWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  valueGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,240,255,0.04)',
  },
  valueInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    color: colors.onSurface,
    fontFamily: fonts.monoBold,
    fontSize: 22,
  },
  input: {
    width: '100%',
    color: colors.onSurface,
    textAlign: 'center',
    fontFamily: fonts.monoBold,
    fontSize: 22,
  },
  controls: {
    flexDirection: 'row',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.05)',
  },
  controlButton: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  controlButtonPressed: {
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  controlDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  readOnlySpacer: {
    width: 113,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
});
