package com.kartkirana.customer;

import androidx.annotation.NonNull;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.FirebaseException;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.PhoneAuthCredential;
import com.google.firebase.auth.PhoneAuthOptions;
import com.google.firebase.auth.PhoneAuthProvider;

import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Starts Firebase phone verification through the Android SDK. This keeps the
 * normal Play Integrity verification flow outside the WebView, where browser
 * phone auth would otherwise display an image-selection reCAPTCHA.
 */
@CapacitorPlugin(name = "NativePhoneAuth")
public class NativePhoneAuthPlugin extends Plugin {
    private PhoneAuthProvider.ForceResendingToken resendToken;
    private String resendPhoneNumber;

    @PluginMethod
    public void sendVerificationCode(PluginCall call) {
        String phoneNumber = call.getString("phoneNumber");
        Boolean resendValue = call.getBoolean("resend", false);
        boolean resend = Boolean.TRUE.equals(resendValue);

        if (phoneNumber == null || !phoneNumber.matches("^\\+[1-9]\\d{7,14}$")) {
            call.reject("Enter a valid mobile number including the country code.", "auth/invalid-phone-number");
            return;
        }

        AtomicBoolean settled = new AtomicBoolean(false);
        PhoneAuthProvider.OnVerificationStateChangedCallbacks callbacks =
            new PhoneAuthProvider.OnVerificationStateChangedCallbacks() {
                private void resolve(String verificationId) {
                    if (!settled.compareAndSet(false, true)) return;
                    JSObject result = new JSObject();
                    result.put("verificationId", verificationId);
                    call.resolve(result);
                }

                @Override
                public void onCodeSent(
                    @NonNull String verificationId,
                    @NonNull PhoneAuthProvider.ForceResendingToken token
                ) {
                    resendToken = token;
                    resendPhoneNumber = phoneNumber;
                    resolve(verificationId);
                }

                @Override
                public void onCodeAutoRetrievalTimeOut(@NonNull String verificationId) {
                    resolve(verificationId);
                }

                @Override
                public void onVerificationCompleted(@NonNull PhoneAuthCredential credential) {
                    // Auto-retrieval is disabled below so the existing OTP screen
                    // remains the single, predictable confirmation experience.
                }

                @Override
                public void onVerificationFailed(@NonNull FirebaseException exception) {
                    if (!settled.compareAndSet(false, true)) return;
                    String message = exception.getLocalizedMessage();
                    call.reject(
                        message == null ? "Phone verification failed." : message,
                        "auth/native-verification-failed",
                        exception
                    );
                }
            };

        PhoneAuthOptions.Builder options = PhoneAuthOptions.newBuilder(FirebaseAuth.getInstance())
            .setPhoneNumber(phoneNumber)
            .setTimeout(0L, TimeUnit.SECONDS)
            .setActivity(getActivity())
            .setCallbacks(callbacks);

        if (resend && phoneNumber.equals(resendPhoneNumber) && resendToken != null) {
            options.setForceResendingToken(resendToken);
        }

        getActivity().runOnUiThread(() -> {
            try {
                PhoneAuthProvider.verifyPhoneNumber(options.build());
            } catch (Exception exception) {
                if (!settled.compareAndSet(false, true)) return;
                String message = exception.getLocalizedMessage();
                call.reject(
                    message == null ? "Phone verification could not be started." : message,
                    "auth/native-verification-failed",
                    exception
                );
            }
        });
    }
}
