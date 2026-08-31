package com.kartkirana.customer;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;
import com.ionicframework.capacitor.Checkout;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(Checkout.class);
        // Keep the WebView inside the usable display area on devices with
        // notches, status bars, gesture navigation, and Android edge-to-edge.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
    }
}
