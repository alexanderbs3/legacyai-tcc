package com.legacyai.security;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

class JwtServiceStartupTest {
    private final ApplicationContextRunner context = new ApplicationContextRunner()
        .withBean(JwtService.class);

    @Test
    void failsStartupWhenJwtSecretIsAbsent() {
        context
            .withPropertyValues("security.jwt.secret=", "security.jwt.expiration-ms=3600000")
            .run(result -> assertThat(result).hasFailed());
    }

    @Test
    void failsStartupWhenJwtSecretHasFewerThan32Utf8Bytes() {
        context
            .withPropertyValues(
                "security.jwt.secret=1234567890123456789012345678901",
                "security.jwt.expiration-ms=3600000")
            .run(result -> {
                assertThat(result).hasFailed();
                assertThat(result.getStartupFailure())
                    .hasRootCauseMessage(
                        "JWT_SECRET deve ter pelo menos 32 bytes UTF-8");
            });
    }

    @Test
    void startsWhenJwtSecretHasAtLeast32Utf8Bytes() {
        context
            .withPropertyValues(
                "security.jwt.secret=12345678901234567890123456789012",
                "security.jwt.expiration-ms=3600000")
            .run(result -> assertThat(result).hasNotFailed().hasSingleBean(JwtService.class));
    }
}
