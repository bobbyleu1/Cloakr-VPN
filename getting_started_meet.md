# 👋 Welcome Meet – Getting Started Guide for Cloakr VPN iOS Module

Thanks again for joining the project! Here's everything you need to get started fast and knock this out clean.

---

## ✅ Overview

This is a custom VPN app built on **Outline VPN** (by Jigsaw/Google).  
The app is React Native (Expo) with AdMob banners & interstitials.

We’ve already done ~90% of the work. You’re just finishing up the native VPN logic for iOS.

---

## 📁 Repo Highlights

- `ios/` – iOS native code, including `Outline.xcodeproj`, `OutlineLib.xcodeproj`
- `app/` – React Native frontend
- `node_modules/` – after install, contains dependencies
- `Podfile` – may need inspection
- `vpn/` – any core logic you want to add, or feel free to make a new folder

---

## ✅ Already Done

- Forked Outline Client repo  
- Initialized submodules  
- Located `VpnExtension` and `Tun2socks` sources  
- Opened `.xcodeproj` directly  
- Identified key class: `PacketTunnelProvider.swift`  
- App builds fine on Android and runs AdMob  
- iOS has blank screen (likely due to new architecture or native crash)  
- AdMob banner shows at bottom on launch, interstitial on connect/disconnect

---

## ❌ Still Needed (Your Tasks)

- [ ] Fix Xcode workspace/scheme issues to allow building  
- [ ] Compile `.xcframework` (or any working VPN-native Apple framework)  
- [ ] Expose `connect()` / `disconnect()` (bonus)  
- [ ] Confirm `Tun2socks` is working (or add workaround)  
- [ ] Provide Swift code or sample so I can call the VPN toggle from JS  
- [ ] Drop compiled code into zip or GitHub folder

No UI or JS work required — just get native logic working + exposed.

---

## 🧪 Environment Info

- **Xcode:** use latest stable version (16.x preferred)
- **Node:** 18.x or whatever works with Expo SDK 53
- **Expo:** SDK 53 (New Architecture currently **enabled**)
- **VPN Backend:** Outline (running + verified)
- **Frontend:** Expo + React Native (working)
- **AdMob:** Working via `react-native-google-mobile-ads`

---

## ⚠️ Known Issues

- iOS build shows **blank screen** (likely due to new architecture or VPN errors)
- No response from `connect()` (nothing implemented yet)
- Missing `build_xcframework.sh` in some Outline forks
- `No such module 'Tun2socks'` in Xcode

---

## 💰 Payment

- ₹5,000–₹7,000 INR fixed rate via Upwork
- Bonus if delivered in 1–2 days with clean execution

---

## 🤝 Communication

- DM me anytime on **WhatsApp**
- I’ll reply within 30 minutes during the day (US time)

---

## ⏱️ Timeline

- Ideal: 2–3 days from today  
- Bonus: 1–2 days = extra tip 🎁

---

## 🔁 Next Steps

1. Pull the repo and try running the iOS build  
2. DM me if you hit blockers (logs, error screenshots help)  
3. Send compiled `.xcframework` or similar when ready  
4. I’ll wire it up on JS side and confirm it works

---

Let me know if you need anything. Appreciate your help 🙏

– Bobby (Vroom Studios)
