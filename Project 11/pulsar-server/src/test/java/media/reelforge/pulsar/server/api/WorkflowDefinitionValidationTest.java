package media.reelforge.pulsar.server.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import media.reelforge.pulsar.server.api.v1.controller.WorkflowDefinitionController;
import media.reelforge.pulsar.server.security.ApiKeyAuthenticationFilter;
import media.reelforge.pulsar.server.security.ApiKeyValidator;
import media.reelforge.pulsar.server.security.JwtAuthenticationFilter;
import media.reelforge.pulsar.server.security.JwtService;
import media.reelforge.pulsar.server.security.SecurityConfig;
import media.reelforge.pulsar.server.service.WorkflowDefinitionService;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Confirms Bean Validation failures on a request DTO surface as 400 with field-level detail, per
 * GlobalExceptionHandler. SecurityConfig is imported (disables CSRF, matching the real app's
 * stateless-JWT/API-key posture) rather than relying on Spring Boot's session+CSRF test default,
 * which would otherwise 403 this POST before validation even runs.
 */
@WebMvcTest(WorkflowDefinitionController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, ApiKeyAuthenticationFilter.class})
class WorkflowDefinitionValidationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private WorkflowDefinitionService workflowDefinitionService;

    @MockBean
    private ApiKeyValidator apiKeyValidator;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @MockBean
    private PasswordEncoder passwordEncoder;

    @Test
    @WithMockUser(roles = "ADMIN")
    void missingRequiredFieldsReturns400WithFieldErrors() throws Exception {
        mockMvc.perform(post("/api/pulsar/v1/workflow-definitions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("PULSAR-3001"))
                .andExpect(jsonPath("$.fieldErrors").isArray());
    }
}
