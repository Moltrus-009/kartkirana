package com.kartkirana.rider;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativePhoneAuthPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
