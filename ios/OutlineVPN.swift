import Foundation
import React
import OutlineTunnel

@objc(OutlineVPN)
class OutlineVPN: RCTEventEmitter {
  private var tunnel: Tunnel?
  private var hasListeners = false

  override init() {
    super.init()
    tunnel = Tunnel()
  }

  @objc
  override static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc
  override func supportedEvents() -> [String]! {
    return ["vpnStateChanged"]
  }

  // Start emitting events only when JS side is listening
  override func startObserving() {
    hasListeners = true
  }
  override func stopObserving() {
    hasListeners = false
  }

  private func emitState(_ state: TunnelState) {
    guard hasListeners else { return }
    let name: String
    switch state {
      case .connected:      name = "CONNECTED"
      case .disconnected:   name = "DISCONNECTED"
      case .connecting:     name = "CONNECTING"
      case .disconnecting:  name = "DISCONNECTING"
      @unknown default:     name = "ERROR"
    }
    sendEvent(withName: "vpnStateChanged", body: name)
  }

  @objc(connect:resolver:rejecter:)
  func connect(accessKey: String,
               resolve: @escaping RCTPromiseResolveBlock,
               reject:  @escaping RCTPromiseRejectBlock) {
    guard let url = URL(string: accessKey) else {
      return reject("INVALID_KEY", "Access key is not a valid URL", nil)
    }
    do {
      try tunnel?.start(
        with: url,
        stateChangedHandler: { [weak self] state in
          self?.emitState(state)
        },
        errorHandler: { [weak self] error in
          self?.emitState(.disconnected)
          reject("VPN_ERROR", error.localizedDescription, error)
        }
      )
      resolve(nil)
    } catch let err {
      emitState(.disconnected)
      reject("VPN_ERROR", err.localizedDescription, err)
    }
  }

  @objc(disconnect:rejecter:)
  func disconnect(
    resolve: RCTPromiseResolveBlock,
    reject:  RCTPromiseRejectBlock) {
    tunnel?.stop()
    emitState(.disconnected)
    resolve(nil)
  }

  @objc(getStatus:rejecter:)
  func getStatus(
    resolve: RCTPromiseResolveBlock,
    reject:  RCTPromiseRejectBlock) {
    guard let state = tunnel?.state else {
      return resolve("ERROR")
    }
    let name: String
    switch state {
      case .connected:      name = "CONNECTED"
      case .disconnected:   name = "DISCONNECTED"
      case .connecting:     name = "CONNECTING"
      case .disconnecting:  name = "DISCONNECTING"
      @unknown default:     name = "ERROR"
    }
    resolve(name)
  }
}
