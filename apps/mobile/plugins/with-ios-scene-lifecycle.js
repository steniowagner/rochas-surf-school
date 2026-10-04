// iOS 27 refuses to launch apps that have not adopted the UIScene life cycle. Expo SDK 57 ships
// `ExpoAppSceneDelegate`, but its template still starts React Native from the app delegate, so this
// plugin wires the scene delegate in during prebuild. It skips itself once the template adopts
// scenes on its own (Expo SDK 58+), so it can be deleted after upgrading.
const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

const SCENE_DELEGATE_CLASS = 'SceneDelegate';
const WINDOW_START_BLOCK =
  /#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\([\s\S]*?\)\n#endif\n/;

function withSceneManifest(config) {
  return withInfoPlist(config, (config) => {
    if (!config.modResults.UIApplicationSceneManifest) {
      config.modResults.UIApplicationSceneManifest = {
        UIApplicationSupportsMultipleScenes: false,
        UISceneConfigurations: {
          UIWindowSceneSessionRoleApplication: [
            {
              UISceneConfigurationName: 'Default Configuration',
              UISceneDelegateClassName: SCENE_DELEGATE_CLASS,
            },
          ],
        },
      };
    }
    return config;
  });
}

function withSceneDelegate(config) {
  return withAppDelegate(config, (config) => {
    const { language, contents } = config.modResults;
    if (language !== 'swift' || contents.includes('ExpoAppSceneDelegate')) {
      return config;
    }
    if (!WINDOW_START_BLOCK.test(contents)) {
      throw new Error(
        'with-ios-scene-lifecycle: AppDelegate.swift no longer matches the Expo SDK 57 template. ' +
          'Check whether the template adopts UIScene on its own and remove this plugin if so.'
      );
    }
    config.modResults.contents = contents
      .replace(
        'class AppDelegate: ExpoAppDelegate {',
        'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {'
      )
      .replace(
        WINDOW_START_BLOCK,
        '    // The window is created and React Native is started by `SceneDelegate` (required by iOS 27).\n'
      )
      .replace(
        'class ReactNativeDelegate:',
        `@objc(${SCENE_DELEGATE_CLASS})\nclass ${SCENE_DELEGATE_CLASS}: ExpoAppSceneDelegate {}\n\nclass ReactNativeDelegate:`
      );
    return config;
  });
}

module.exports = function withIosSceneLifecycle(config) {
  return withSceneDelegate(withSceneManifest(config));
};
