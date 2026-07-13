package media.reelforge.pulsar.server.security;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import media.reelforge.pulsar.common.exception.ErrorCodes;
import media.reelforge.pulsar.common.exception.PulsarException;
import media.reelforge.pulsar.server.config.JwtProperties;

@Component
public class JwtService {

    private static final String CLAIM_ROLE = "role";
    private static final String CLAIM_TYPE = "type";

    private final JwtProperties properties;
    private final SecretKey key;

    public JwtService(JwtProperties properties) {
        this.properties = properties;
        this.key = Keys.hmacShaKeyFor(properties.secret().getBytes(StandardCharsets.UTF_8));
    }

    public String generateAccessToken(String username, Role role) {
        return generateToken(username, role, "access", properties.accessTtlMinutes(), ChronoUnit.MINUTES);
    }

    public String generateRefreshToken(String username, Role role) {
        return generateToken(username, role, "refresh", properties.refreshTtlDays(), ChronoUnit.DAYS);
    }

    private String generateToken(String username, Role role, String type, long amount, ChronoUnit unit) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(username)
                .claim(CLAIM_ROLE, role.name())
                .claim(CLAIM_TYPE, type)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(amount, unit)))
                .signWith(key)
                .compact();
    }

    public Claims parseClaims(String token) {
        try {
            return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
        } catch (io.jsonwebtoken.ExpiredJwtException e) {
            throw new PulsarException(ErrorCodes.TOKEN_EXPIRED, "JWT token expired", e);
        } catch (JwtException e) {
            throw new PulsarException(ErrorCodes.AUTHENTICATION_FAILED, "Invalid JWT token", e);
        }
    }

    public boolean isRefreshToken(Claims claims) {
        return "refresh".equals(claims.get(CLAIM_TYPE, String.class));
    }

    public Role extractRole(Claims claims) {
        return Role.valueOf(claims.get(CLAIM_ROLE, String.class));
    }
}
