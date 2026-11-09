package com.sourcing.auth;

import java.time.Clock;
import java.util.HashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/** Local single-instance limiter. Use a shared store when deploying multiple instances. */
@Component
public class AuthRateLimiter {
    private record Window(long start, int count) { }
    private final Map<String, Window> windows = new HashMap<>();
    private final Clock clock = Clock.systemUTC();
    public synchronized void check(String key, int max) {
        long now = clock.millis();
        windows.entrySet().removeIf(entry -> now - entry.getValue().start() >= 60_000);
        Window window = windows.getOrDefault(key, new Window(now, 0));
        if (window.count() >= max) throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "操作过于频繁，请 1 分钟后重试");
        windows.put(key, new Window(window.start(), window.count() + 1));
    }
}
