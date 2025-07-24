// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // for expo-router
      'expo-router/babel',
      // your path aliases
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './',
            '@components': './components',
            '@services': './services',
            '@ads': './ads',
            '@hooks': './hooks'
          }
        }
      ],
      // keep this LAST if you use Reanimated
      'react-native-reanimated/plugin'
    ]
  };
};
