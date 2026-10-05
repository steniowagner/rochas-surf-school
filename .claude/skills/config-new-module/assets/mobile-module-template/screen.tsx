import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

import __MODULE_CLASS_NAME__Component from '../components/__MODULE_NAME__.component';

export default function __MODULE_CLASS_NAME__Screen() {
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.page }]}>
      <__MODULE_CLASS_NAME__Component />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
