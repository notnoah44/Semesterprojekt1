import { View, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface StarRatingProps {
  rating: number;
  size?: number;
  /** When provided, stars become tappable to set a rating */
  onChange?: (value: number) => void;
  color?: string;
  emptyColor?: string;
}

const STAR_COLOR = '#F59E0B';

export function StarRating({ rating, size = 18, onChange, color = STAR_COLOR, emptyColor = '#D6D3CE' }: StarRatingProps) {
  return (
    <View style={{ flexDirection: 'row', gap: onChange ? 8 : 2 }}>
      {[1, 2, 3, 4, 5].map((s) => {
        const filled = s <= Math.round(rating);
        const icon = (
          <MaterialCommunityIcons
            name={filled ? 'star' : 'star-outline'}
            size={size}
            color={filled ? color : emptyColor}
          />
        );
        if (!onChange) return <View key={s}>{icon}</View>;
        return (
          <TouchableOpacity key={s} onPress={() => onChange(s)} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
            {icon}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
