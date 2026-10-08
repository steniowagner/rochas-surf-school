// Kept free of React Native imports so tailwind.config.ts can load it in Node.
// React Native picks a weight by family name (fontWeight does not select custom font files on Android),
// so each weight is its own family, named as @expo-google-fonts exports it.
export const fontFamilyByWeight = {
  display: {
    400: "BarlowCondensed_400Regular",
    500: "BarlowCondensed_500Medium",
    600: "BarlowCondensed_600SemiBold",
    700: "BarlowCondensed_700Bold",
  },
  body: {
    400: "Nunito_400Regular",
    600: "Nunito_600SemiBold",
    700: "Nunito_700Bold",
    800: "Nunito_800ExtraBold",
  },
} as const;
