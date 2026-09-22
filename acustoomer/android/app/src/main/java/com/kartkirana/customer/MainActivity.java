package com.kartkirana.customer;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;
import com.ionicframework.capacitor.Checkout;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Register local plugins before BridgeActivity creates the bridge.
        registerPlugin(Checkout.class);
        registerPlugin(NativePhoneAuthPlugin.class);
        super.onCreate(savedInstanceState);
        // Keep the WebView inside the usable display area on devices with
        // notches, status bars, gesture navigation, and Android edge-to-edge.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
    }
}
