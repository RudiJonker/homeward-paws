const IS_PRODUCTION = process.env.APP_VARIANT === 'production';

export default {
  expo: {
    name: IS_PRODUCTION ? 'Homeward Paws' : 'Homeward Paws Dev',
    slug: 'homeward-paws',
    version: '0.1.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    icon: './assets/images/icon.png',
    scheme: 'homewardpaws',
    splash: {
      image: './assets/images/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#FBF7F2'
    },
    android: {
      package: IS_PRODUCTION ? 'za.co.homewardpaws.app' : 'za.co.homewardpaws.app.dev',
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        monochromeImage: './assets/images/adaptive-icon-monochrome.png',
        backgroundColor: '#FBF7F2'
      },
      blockedPermissions: [
        'android.permission.READ_MEDIA_IMAGES',
        'android.permission.READ_MEDIA_VIDEO',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.ACCESS_BACKGROUND_LOCATION'
      ]
    },
    web: {
      favicon: './assets/images/favicon.png'
    },
    plugins: [
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#FBF7F2'
        }
      ]
    ],
    extra: {
      appVariant: IS_PRODUCTION ? 'production' : 'development'
    }
  }
};
