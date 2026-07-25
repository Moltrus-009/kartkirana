# Customization Rules: Android Parity Guidelines

The Android applications are the master/reference implementations for this project. The Web versions must match them exactly.

## Reference Constraints
- **Android Codebase**: Do NOT modify, regenerate, refactor, optimize, or rewrite any Android code.
- **Scope**: Modify only the Web applications (Customer, Shopkeeper, Delivery Rider, Admin Panel) to align with Android implementations.

## Design and Features
- **UI and Flow**: Mirror screens, navigation, dialogs (e.g. Swiggy-Style Mock QR payment), calculations, validations, loading/empty states, and error handling exactly.
- **No Web-Only Additions**: Do not introduce new features or redesign screens unless matching an Android counterpart.

## Database & Infrastructure
- **Firebase/Firestore**: Do not modify shared Firebase configuration, Firestore collections, document structures, Storage paths, Rules, or Authentication flows.
- **Compatibility**: Ensure backward compatibility with all existing Firebase data (customers, shops, orders, riders).
