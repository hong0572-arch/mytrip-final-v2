package pro.mytrip2.twa;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth; // 👈 1. 임포트

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // GoogleAuth 플러그인을 수동으로 등록하여 브릿지 유실을 방지합니다.
        registerPlugin(com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth.class);
    }
}