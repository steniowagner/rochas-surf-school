import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import {
  BottomTabInset,
  MaxContentWidth,
  radii,
  shadowStyle,
  spacing,
  textStyle,
  type ThemeColor,
} from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Temporary preview of the design system until the real screens exist.
const brandColors: { name: string; token: ThemeColor }[] = [
  { name: 'Sol', token: 'sun' },
  { name: 'Uva', token: 'grape' },
  { name: 'Lagoa', token: 'lagoon' },
  { name: 'Areia escura', token: 'tan' },
  { name: 'Céu', token: 'sky' },
];

export default function HomeScreen() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.page }]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View>
            <Text style={[textStyle('sectionLabel'), { color: theme.ink2 }]}>Rocha&apos;s Surf School</Text>
            <Text style={[textStyle('screenTitle'), styles.title, { color: theme.ink }]}>Sistema de design</Text>
            <Text style={[textStyle('body'), styles.lead, { color: theme.ink2 }]}>
              Tokens partilhados entre a web e a app móvel.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[textStyle('sectionLabel'), { color: theme.ink2 }]}>Cor</Text>
            <View style={styles.swatches}>
              {brandColors.map((color) => (
                <View key={color.name} style={styles.swatch}>
                  <View style={[styles.swatchColor, { backgroundColor: theme[color.token] }]} />
                  <Text style={[textStyle('listSubtitle'), styles.swatchLabel, { color: theme.ink2 }]}>
                    {color.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.section, styles.buttons]}>
            <Text style={[textStyle('sectionLabel'), { color: theme.ink2 }]}>Botões</Text>
            <Button>Primário</Button>
            <Button variant="dark">Escuro</Button>
            <Button variant="outline">Contorno</Button>
            <Button variant="subtle">Discreto</Button>
            <Button variant="danger">Perigo</Button>
          </View>

          <View style={styles.section}>
            <Text style={[textStyle('sectionLabel'), { color: theme.ink2 }]}>Chips</Text>
            <View style={styles.chips}>
              <Chip tone="surf">Surf</Chip>
              <Chip tone="skate">Skate</Chip>
              <Chip tone="info">Iniciante</Chip>
              <Chip tone="sun">Já a seguir</Chip>
              <Chip tone="warn">Pendente</Chip>
              <Chip tone="ok">Aprovado</Chip>
              <Chip tone="bad">Cancelada</Chip>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[textStyle('sectionLabel'), { color: theme.ink2 }]}>Próxima aula</Text>
            <View style={[styles.lesson, { backgroundColor: theme.grape }, shadowStyle('card', theme)]}>
              <View style={styles.chips}>
                <Chip tone="surf">Surf</Chip>
                <Chip tone="onHighlight">Iniciante</Chip>
              </View>
              <Text style={[textStyle('lessonTime'), styles.lessonTime, { color: theme.onColor }]}>
                09:00 – 10:30
              </Text>
              <Text style={[textStyle('listSubtitle'), styles.lessonMeta, { color: theme.onColor }]}>
                Praia do Guincho · 5/8 vagas
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  content: {
    paddingHorizontal: spacing.screen,
    paddingTop: 24,
    paddingBottom: BottomTabInset + spacing.groupGap,
    gap: spacing.groupGap,
  },
  title: {
    marginTop: 4,
  },
  lead: {
    marginTop: 8,
  },
  section: {
    gap: spacing.cardGap,
  },
  buttons: {
    gap: 10,
  },
  swatches: {
    flexDirection: 'row',
    gap: 8,
  },
  swatch: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  swatchColor: {
    alignSelf: 'stretch',
    height: 48,
    borderRadius: radii.control,
  },
  swatchLabel: {
    textAlign: 'center',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  lesson: {
    padding: 14,
    borderRadius: radii.card,
  },
  lessonTime: {
    marginTop: 10,
  },
  lessonMeta: {
    marginTop: 8,
    opacity: 0.85,
  },
});
