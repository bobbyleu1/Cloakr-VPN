// ios/Cloakr/VPNStatusWatcher.swift
import Foundation
import NetworkExtension

final class VPNStatusWatcher {
    static let shared = VPNStatusWatcher()

    private var observers: [NSObjectProtocol] = []
    private let defaultsKey = "vpn_last_status"
    private let queue = DispatchQueue(label: "com.cloakr.vpnstatus", qos: .utility)

    private init() {
        // seed a value so consumers never crash on nil
        if UserDefaults.standard.string(forKey: defaultsKey) == nil {
            UserDefaults.standard.set("disconnected", forKey: defaultsKey)
        }
    }

    // Call this once at launch if you want live updates.
    func start() {
        setupNotifications()
        snapshotToDefaults()
    }

    // Persist a one-time snapshot of the current status.
    func snapshotToDefaults() {
        currentStatusString { [weak self] status in
            guard let self = self else { return }
            UserDefaults.standard.set(status, forKey: self.defaultsKey)
            // Optional: also broadcast so JS/native can listen
            NotificationCenter.default.post(name: .init("VPNStatusWatcherSnapshot"),
                                            object: nil,
                                            userInfo: ["status": status])
        }
    }

    // Read the last saved value without hitting NE* managers.
    func cachedStatus() -> String {
        UserDefaults.standard.string(forKey: defaultsKey) ?? "disconnected"
    }

    // MARK: - Internals

    private func setupNotifications() {
        // remove any previous observers
        observers.forEach { NotificationCenter.default.removeObserver($0) }
        observers.removeAll()

        // Observe status changes from any NE connection.
        let obs = NotificationCenter.default.addObserver(
            forName: .NEVPNStatusDidChange,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.snapshotToDefaults()
        }
        observers.append(obs)
    }

    func currentStatusString(_ completion: @escaping (String) -> Void) {
        // Try tunnel managers first (WireGuard / PacketTunnel), then fall back to NEVPNManager
        queue.async {
            NETunnelProviderManager.loadAllFromPreferences { managers, _ in
                // If we find an enabled tunnel, report its status immediately.
                if let m = (managers ?? []).first(where: { $0.isEnabled }) {
                    let status = Self.map(m.connection.status)
                    DispatchQueue.main.async { completion(status) }
                    return
                }

                // Fallback: built-in NEVPNManager (IKEv2, etc.)
                NEVPNManager.shared().loadFromPreferences { _ in
                    let status = Self.map(NEVPNManager.shared().connection.status)
                    DispatchQueue.main.async { completion(status) }
                }
            }
        }
    }

    private static func map(_ status: NEVPNStatus) -> String {
        switch status {
        case .invalid, .disconnected: return "disconnected"
        case .connecting, .reasserting: return "connecting"
        case .connected: return "connected"
        case .disconnecting: return "disconnecting"
        @unknown default: return "disconnected"
        }
    }

    deinit {
        observers.forEach { NotificationCenter.default.removeObserver($0) }
    }
}