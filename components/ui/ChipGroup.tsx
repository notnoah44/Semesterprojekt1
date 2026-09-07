import { View, Text, TouchableOpacity } from 'react-native';
import { useAppTheme } from '@/lib/contexts/ThemeContext';

interface ChipGroupProps<T extends string> {
  label?: string;
  options: { value: T; label: string }[];
  selected: T[];
  onChange: (selected: T[]) => void;
  multiple?: boolean;
}

export function ChipGroup<T extends string>({ label, options, selected, onChange, multiple = false }: ChipGroupProps<T>) {
  const theme = useAppTheme();

  const toggle = (value: T) => {
    if (multiple) {
      onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
    } else {
      onChange(selected.includes(value) ? [] : [value]);
    }
  };

  return (
    <View style={{ marginBottom: 16 }}>
      {label && (
        <Text style={{
          fontSize: 12, color: theme.textMuted, marginBottom: 8,
          fontFamily: 'Nunito_600SemiBold', letterSpacing: 0.4, textTransform: 'uppercase',
        }}>
          {label}
        </Text>
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((opt) => {
          const isSelected = selected.includes(opt.value);
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => toggle(opt.value)}
              style={{
                paddingHorizontal: 14, paddingVertical: 9, borderRadius: 99,
                borderWidth: 1.5,
                borderColor: isSelected ? theme.primary : theme.border,
                backgroundColor: isSelected ? theme.primaryContainer : theme.surface,
              }}
            >
              <Text style={{
                fontSize: 13, fontFamily: 'Nunito_600SemiBold',
                color: isSelected ? theme.onPrimaryContainer : theme.textMuted,
              }}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
