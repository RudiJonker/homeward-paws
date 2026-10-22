import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';
import { formatPickerDate, formatPickerTime, pickerInitialValue } from '../../utils/missingLastSeen';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function displayDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const month = MONTHS[Number(match[2]) - 1];
  return month ? `${Number(match[3])} ${month} ${match[1]}` : value;
}

export function DateTimeField({ label, dateValue, timeValue, onChange, errors = [], optional = false, disabled = false }) {
  const [iosStage, setIosStage] = useState(null);
  const [pendingValue, setPendingValue] = useState(new Date());
  const timerRef = useRef(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  function openPicker() {
    if (disabled) return;
    const initialValue = pickerInitialValue(dateValue, timeValue);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: initialValue,
        mode: 'date',
        maximumDate: new Date(),
        onValueChange: (_, pickedDate) => {
          if (!pickedDate) return;
          // Let the date dialog close before opening the time dialog.
          timerRef.current = setTimeout(() => {
            DateTimePickerAndroid.open({
              value: pickerInitialValue(formatPickerDate(pickedDate), timeValue),
              mode: 'time',
              is24Hour: true,
              onValueChange: (_, pickedTime) => {
                if (pickedTime) onChange(formatPickerDate(pickedDate), formatPickerTime(pickedTime));
              }
            });
            timerRef.current = null;
          }, 200);
        }
      });
    } else {
      setPendingValue(initialValue);
      setIosStage('date');
    }
  }

  function updatePending(mode, picked) {
    if (!picked) return;
    setPendingValue((current) => {
      const next = new Date(current);
      if (mode === 'date') next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
      else next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
      return next;
    });
  }

  const selected = Boolean(dateValue && timeValue);
  const value = selected ? `${displayDate(dateValue)} at ${timeValue}` : 'Choose date, then time';

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${selected ? value : 'not selected'}`}
        accessibilityHint="Choose a date, then a time using the 24-hour clock"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={openPicker}
        style={[styles.selector, errors.length > 0 && styles.selectorError, disabled && styles.disabled]}
      >
        <Text style={[styles.value, !selected && styles.placeholder]}>{value}</Text>
        <MaterialCommunityIcons name="calendar-clock-outline" size={24} color={colors.primary} />
      </Pressable>
      <Text style={styles.hint}>Date first, then time (24-hour clock).{optional ? ' Leave blank if unknown.' : ''}</Text>
      {errors.filter(Boolean).map((error) => <Text key={error} style={styles.error}>{error}</Text>)}
      {optional && (dateValue || timeValue) ? (
        <Pressable accessibilityRole="button" disabled={disabled} onPress={() => onChange('', '')} style={styles.clearButton}>
          <Text style={styles.clearText}>Clear date and time</Text>
        </Pressable>
      ) : null}
      {iosStage && Platform.OS !== 'android' ? (
        <View style={styles.iosPicker}>
          <Text style={styles.iosTitle}>{iosStage === 'date' ? 'Choose date' : 'Choose time'}</Text>
          <DateTimePicker
            value={pendingValue}
            mode={iosStage}
            display="spinner"
            is24Hour
            {...(iosStage === 'date' ? { maximumDate: new Date() } : {})}
            onValueChange={(_, picked) => updatePending(iosStage, picked)}
          />
          <View style={styles.iosActions}>
            <Pressable accessibilityRole="button" onPress={() => setIosStage(null)} style={styles.iosAction}>
              <Text style={styles.clearText}>Cancel</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => {
              if (iosStage === 'date') setIosStage('time');
              else {
                onChange(formatPickerDate(pendingValue), formatPickerTime(pendingValue));
                setIosStage(null);
              }
            }} style={styles.iosAction}>
              <Text style={styles.clearText}>{iosStage === 'date' ? 'Next: time' : 'Use date and time'}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  label: { ...typography.bodyStrong, color: colors.textPrimary },
  selector: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, backgroundColor: colors.surface },
  selectorError: { borderColor: colors.error },
  disabled: { opacity: 0.55 },
  value: { ...typography.body, color: colors.textPrimary, flex: 1 },
  placeholder: { color: colors.textSecondary },
  hint: { ...typography.caption, color: colors.textSecondary },
  error: { ...typography.caption, color: colors.error },
  clearButton: { minHeight: 44, justifyContent: 'center', alignItems: 'flex-start' },
  clearText: { ...typography.button, color: colors.primary },
  iosPicker: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, backgroundColor: colors.surface, padding: spacing.sm },
  iosTitle: { ...typography.bodyStrong, color: colors.textPrimary, textAlign: 'center' },
  iosActions: { flexDirection: 'row', justifyContent: 'space-around' },
  iosAction: { minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.sm }
});
