import UIKit
import Expo
import ExpoModulesCore

@UIApplicationMain
class AppDelegate: ExpoAppDelegate {

  // MARK: - UIApplicationDelegate

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // This will wire up Expo, React Native, and any autolinked native modules
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

}
