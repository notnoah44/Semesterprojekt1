import { useState } from 'react';
import { View, ScrollView, Image } from 'react-native';

export function PhotoGallery({ photos, height = 260 }: { photos: string[]; height?: number }) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  return <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{ height }}>
    {width > 0 && <ScrollView key={width} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
      onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))}>
      {photos.map((uri, i) => <Image key={`${uri}-${i}`} source={{ uri }} resizeMode="cover" style={{ width, height }} accessibilityLabel={`${i + 1} / ${photos.length}`} />)}
    </ScrollView>}
    {photos.length > 1 && <View pointerEvents="none" style={{ position: 'absolute', bottom: 12, alignSelf: 'center', flexDirection: 'row', gap: 6, backgroundColor: '#0008', padding: 8, borderRadius: 20 }}>
      {photos.map((_, i) => <View key={i} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: i === index ? '#fff' : '#ffffff66' }} />)}
    </View>}
  </View>;
}
