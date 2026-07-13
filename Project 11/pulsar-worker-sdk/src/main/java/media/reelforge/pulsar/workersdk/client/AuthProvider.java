package media.reelforge.pulsar.workersdk.client;

/** Supplies the auth header for every request — either a static worker API key or a bearer JWT. */
public interface AuthProvider {

    String headerName();

    String headerValue();

    static AuthProvider apiKey(String apiKey) {
        return new AuthProvider() {
            @Override
            public String headerName() {
                return "X-Pulsar-Api-Key";
            }

            @Override
            public String headerValue() {
                return apiKey;
            }
        };
    }

    static AuthProvider bearerToken(String jwt) {
        return new AuthProvider() {
            @Override
            public String headerName() {
                return "Authorization";
            }

            @Override
            public String headerValue() {
                return "Bearer " + jwt;
            }
        };
    }
}
