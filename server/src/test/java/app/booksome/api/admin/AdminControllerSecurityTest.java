package app.booksome.api.admin;

import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;

import app.booksome.api.admin.AdminModels.DashboardMetrics;
import app.booksome.api.admin.AdminModels.DashboardResponse;
import app.booksome.api.auth.AuthProperties;
import app.booksome.api.common.security.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AdminController.class)
@Import(SecurityConfig.class)
@EnableConfigurationProperties(AuthProperties.class)
class AdminControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AdminService adminService;

    @Test
    void rejectsRegularUsers() throws Exception {
        mockMvc.perform(get("/api/admin/dashboard").with(jwt()
                .authorities(new SimpleGrantedAuthority("ROLE_USER"))))
            .andExpect(status().isForbidden());
    }

    @Test
    void allowsAdministrators() throws Exception {
        when(adminService.dashboard()).thenReturn(new DashboardResponse(
            new DashboardMetrics(1, 8, 1, 0, 0),
            List.of(),
            List.of(),
            List.of(),
            List.of(),
            Instant.parse("2026-08-25T00:00:00Z")
        ));

        mockMvc.perform(get("/api/admin/dashboard").with(jwt()
                .jwt(token -> token.subject("admin-id"))
                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.metrics.registeredBooks").value(8));
    }
}
