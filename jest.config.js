module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['./jest.setup.js'],
  // lucide phát hành .mjs, các thư viện dưới đây phát hành ESM -> cho babel biên dịch
  transform: { '^.+\\.(js|jsx|ts|tsx|mjs)$': 'babel-jest' },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|lucide-react-native|react-native-svg|react-native-safe-area-context|react-native-screens|firebase|@firebase|@notifee|react-native-image-picker)/)',
  ],
};
