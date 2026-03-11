import { View } from 'react-native';
import FoodScanner from '../../components/FoodScanner';

export default function ScanScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <FoodScanner />
    </View>
  );
}
