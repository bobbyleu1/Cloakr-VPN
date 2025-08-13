import Foundation
import NetworkExtension
import React

@objc(VPNManager)
class VPNManager: RCTEventEmitter {
  
  let manager = NEVPNManager.shared()
  
  override init() {
    super.init()
  }
  
  override func supportedEvents() -> [String]! {
    return ["vpnStatus"]
  }
  
  override func startObserving() {
    VPNStatusWatcher.shared.start()
    VPNStatusWatcher.shared.snapshotToDefaults()
    pushStatus()
  }
  
  override func stopObserving() {
    // Observer cleanup handled in VPNStatusWatcher
  }
  
  override static func requiresMainQueueSetup() -> Bool {
    return true
  }
  
  @objc func getCachedStatus(_ resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    let status = VPNStatusWatcher.shared.cachedStatus()
    resolve(status)
  }
  
  @objc func refreshStatus(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    VPNStatusWatcher.shared.currentStatusString { status in
      VPNStatusWatcher.shared.snapshotToDefaults()
      self.pushStatus()
      resolve(status)
    }
  }
  
  @objc func pushStatus() {
    let status = VPNStatusWatcher.shared.cachedStatus()
    sendEvent(withName: "vpnStatus", body: ["status": status])
  }

  @objc func connect() {
    configureVPN { success in
      if success {
        do {
          try self.manager.connection.startVPNTunnel()
          print("VPN started")
        } catch {
          print("Failed to start VPN: \(error)")
        }
      } else {
        print("Failed to configure VPN")
      }
    }
  }

  @objc func disconnect() {
    manager.connection.stopVPNTunnel()
    print("VPN disconnected")
  }

  private func configureVPN(completion: @escaping (Bool) -> Void) {
    manager.loadFromPreferences { error in
      if let error = error {
        print("Error loading VPN prefs: \(error)")
        completion(false)
        return
      }

      let protocolConfig = NEVPNProtocolIPSec()
      protocolConfig.serverAddress = "68.183.9.224"
      protocolConfig.username = "vpnuser"
      protocolConfig.passwordReference = self.getKeychainRef("cloakr123")
      protocolConfig.authenticationMethod = .sharedSecret
      protocolConfig.sharedSecretReference = self.getKeychainRef("cloakrkey123")
      protocolConfig.useExtendedAuthentication = true
      protocolConfig.disconnectOnSleep = false

      self.manager.protocolConfiguration = protocolConfig
      self.manager.localizedDescription = "Cloakr VPN"
      self.manager.isEnabled = true

      self.manager.saveToPreferences { error in
        if let error = error {
          print("Error saving VPN prefs: \(error)")
          completion(false)
        } else {
          completion(true)
        }
      }
    }
  }

  private func getKeychainRef(_ secret: String) -> Data? {
    let passwordData = secret.data(using: .utf8)!
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrAccount as String: secret,
      kSecValueData as String: passwordData,
      kSecReturnPersistentRef as String: true
    ]

    SecItemDelete(query as CFDictionary)
    var result: CFTypeRef?
    let status = SecItemAdd(query as CFDictionary, &result)

    if status == errSecSuccess {
      return result as? Data
    }
    return nil
  }
}
