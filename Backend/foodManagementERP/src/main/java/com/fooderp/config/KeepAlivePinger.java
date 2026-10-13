package com.fooderp.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Pings this server's public /api/health URL on a schedule so Render's free tier
 * doesn't put it to sleep (it sleeps after 15 min without inbound traffic).
 * Only active when KEEP_ALIVE_URL or RENDER_EXTERNAL_URL (set by Render) is present.
 */
@Component
@EnableScheduling
@ConditionalOnExpression("!'${app.keepalive.url:}'.isBlank()")
public class KeepAlivePinger {

    private static final Logger log = LoggerFactory.getLogger(KeepAlivePinger.class);

    private final HttpClient client = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(20))
            .build();

    @Value("${app.keepalive.url}")
    private String baseUrl;

    @Scheduled(initialDelayString = "${app.keepalive.interval-ms:600000}",
               fixedDelayString   = "${app.keepalive.interval-ms:600000}")
    public void ping() {
        String url = baseUrl.replaceAll("/+$", "") + "/api/health";
        try {
            HttpRequest req = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(30))
                    .GET()
                    .build();
            int status = client.send(req, HttpResponse.BodyHandlers.discarding()).statusCode();
            log.debug("Keep-alive ping {} -> {}", url, status);
        } catch (Exception e) {
            log.warn("Keep-alive ping {} failed: {}", url, e.getMessage());
        }
    }
}
