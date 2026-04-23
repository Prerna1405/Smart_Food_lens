import { View } from 'react-native';
import FoodScanner from '../../components/FoodScanner';

import { Colors } from '../../constants/theme';

export default function ScanScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.light.background }}>
      <FoodScanner />
    </View>
  );
}
