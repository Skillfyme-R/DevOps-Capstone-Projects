package media.reelforge.pulsar.server.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import media.reelforge.pulsar.server.api.v1.controller.WorkflowController;
import media.reelforge.pulsar.server.security.ApiKeyAuthenticationFilter;
import media.reelforge.pulsar.server.security.ApiKeyValidator;
import media.reelforge.pulsar.server.security.JwtAuthenticationFilter;
import media.reelforge.pulsar.server.security.JwtService;
import media.reelforge.pulsar.server.security.SecurityConfig;
import media.reelforge.pulsar.server.service.WorkflowExecutionService;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Proves the security filter chain actually gates protected endpoints — an unauthenticated request
 * must be rejected, not silently allowed. @WebMvcTest slices out the security auto-configuration's
 * filter beans, so SecurityConfig + both auth filters are imported explicitly here (their own
 * dependencies, JwtService/ApiKeyValidator, are mocked since we're only exercising the "no
 * credentials supplied" path, not real token/key validation).
 */
@WebMvcTest(WorkflowController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, ApiKeyAuthenticationFilter.class})
class WorkflowControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private WorkflowExecutionService workflowExecutionService;

    @MockBean
    private ApiKeyValidator apiKeyValidator;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @MockBean
    private PasswordEncoder passwordEncoder;

    @Test
    void unauthenticatedRequestToStartWorkflowIsRejected() throws Exception {
        mockMvc.perform(post("/api/pulsar/v1/workflows")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"workflowName\":\"foo\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unauthenticatedGetOnWorkflowStatusIsRejected() throws Exception {
        mockMvc.perform(get("/api/pulsar/v1/workflows/" + java.util.UUID.randomUUID()))
                .andExpect(status().isUnauthorized());
    }
}
