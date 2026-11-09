package com.sourcing.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.mockito.Mockito.*;

import java.util.concurrent.atomic.AtomicInteger;
import java.util.List;
import java.util.Optional;
import com.sourcing.suppliers.MexicoExportRepository;
import com.sourcing.suppliers.ExportFixtures;
import com.sourcing.suppliers.MexicoSearch;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.dao.DataAccessResourceFailureException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

@SpringBootTest(properties={"spring.profiles.active=local,test"})
@AutoConfigureMockMvc
class AuthIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired PasswordEncoder encoder;
    @MockitoBean MexicoExportRepository exportRepository;
    private static final AtomicInteger IP = new AtomicInteger();
    private String ip;
    @BeforeEach void reset() {
        // Never clear a business database, even when the test environment is misconfigured.
        assertThat(jdbc.queryForObject("SELECT DATABASE()", String.class)).isEqualTo("sourcing_platform_test");
        jdbc.update("DELETE FROM sourcing_user");
        ip = "127.0.0." + IP.incrementAndGet();
    }
    MockHttpServletRequestBuilder postJson(String url, String json) {
        return post(url).with(request -> { request.setRemoteAddr(ip); return request; })
                .with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json);
    }
    String registration(String username, String phone, String code) {
        return """
                {"username":"%s","company":"","password":"testPass888","phone":"%s","code":"%s"}
                """.formatted(username, phone, code);
    }
    void register() throws Exception {
        mvc.perform(postJson("/api/auth/register", registration("Buyer_Test", "13800000000", "123456")))
                .andExpect(status().isCreated());
    }
    MockHttpSession login() throws Exception {
        return (MockHttpSession) mvc.perform(postJson("/api/auth/login/password", """
                {"username":" buyer_test ","password":"testPass888"}
                """)).andExpect(status().isOk()).andReturn().getRequest().getSession(false);
    }
    @Test void registrationPersistsHashAndDoesNotLoginAutomatically() throws Exception {
        mvc.perform(postJson("/api/auth/register", registration("Buyer_Test", "13800000000", "123456")))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.username").value("Buyer_Test"))
                .andExpect(jsonPath("$.company").value(""))
                .andExpect(jsonPath("$.password").doesNotExist()).andExpect(jsonPath("$.passwordHash").doesNotExist());
        String hash = jdbc.queryForObject("SELECT password_hash FROM sourcing_user", String.class);
        assertThat(hash).startsWith("$2a$").isNotEqualTo("testPass888");
        assertThat(encoder.matches("testPass888", hash)).isTrue();
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
    }
    @Test void bothLoginMethodsResolveSameUserAndSessionSurvivesRequests() throws Exception {
        register();
        var session = login();
        String id = jdbc.queryForObject("SELECT id FROM sourcing_user", String.class);
        mvc.perform(get("/api/auth/me").session(session)).andExpect(status().isOk()).andExpect(jsonPath("$.id").value(id));
        mvc.perform(postJson("/api/auth/login/phone", """
                {"phone":"13800000000","code":"123456"}
                """)).andExpect(status().isOk()).andExpect(jsonPath("$.id").value(id));
    }
    @Test void duplicateUsernamesAreNormalizedAndPhonesAreUnique() throws Exception {
        register();
        mvc.perform(postJson("/api/auth/register", registration(" buyer_test ", "13900000000", "123456")))
                .andExpect(status().isConflict());
        mvc.perform(postJson("/api/auth/register", registration("another", "13800000000", "123456")))
                .andExpect(status().isConflict());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM sourcing_user", Integer.class)).isEqualTo(1);
    }
    @Test void badPasswordUsesGenericErrorForUnknownAndExistingUsers() throws Exception {
        register();
        for (String username : new String[]{"Buyer_Test", "unknown"}) {
            mvc.perform(postJson("/api/auth/login/password", "{\"username\":\"" + username + "\",\"password\":\"wrong888\"}"))
                    .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").value("用户名或密码错误"));
        }
    }
    @Test void incorrectCodeCannotRegisterOrLoginAndPhoneLoginNeverCreatesUser() throws Exception {
        mvc.perform(postJson("/api/auth/register", registration("test", "13800000000", "000000"))).andExpect(status().isBadRequest());
        register();
        mvc.perform(postJson("/api/auth/login/phone", "{\"phone\":\"13800000000\",\"code\":\"000000\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(postJson("/api/auth/login/phone", "{\"phone\":\"13900000000\",\"code\":\"123456\"}"))
                .andExpect(status().isUnauthorized());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM sourcing_user", Integer.class)).isEqualTo(1);
    }
    @Test void invalidNamesPhonePasswordsAndMissingFieldsAreRejected() throws Exception {
        mvc.perform(postJson("/api/auth/register", registration("a!", "13800000000", "123456"))).andExpect(status().isBadRequest());
        mvc.perform(postJson("/api/auth/register", registration("valid", "12345", "123456"))).andExpect(status().isBadRequest());
        mvc.perform(postJson("/api/auth/register", registration("valid", "13800000000", "123456").replace("testPass888", "short")))
                .andExpect(status().isBadRequest());
        mvc.perform(postJson("/api/auth/register", "{}" )).andExpect(status().isBadRequest());
        mvc.perform(postJson("/api/auth/register", registration("valid", "13800000000", "123456").replace("testPass888", "密".repeat(25))))
                .andExpect(status().isBadRequest());
        mvc.perform(postJson("/api/auth/login/password", "{\"username\":\"valid\",\"password\":\"" + "密".repeat(25) + "\"}"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").value("用户名或密码错误"));
    }
    @Test void unicodeEquivalentUsernamesCollide() throws Exception {
        mvc.perform(postJson("/api/auth/register", registration("Café", "13800000000", "123456"))).andExpect(status().isCreated());
        mvc.perform(postJson("/api/auth/register", registration("Cafe\u0301", "13900000000", "123456"))).andExpect(status().isConflict());
    }
    @Test void disabledAccountsCannotUseEitherLoginOrKeepExistingSession() throws Exception {
        register();
        var session = login();
        jdbc.update("UPDATE sourcing_user SET enabled = FALSE");
        mvc.perform(postJson("/api/auth/login/password", "{\"username\":\"buyer_test\",\"password\":\"testPass888\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(postJson("/api/auth/login/phone", "{\"phone\":\"13800000000\",\"code\":\"123456\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/auth/me").session(session)).andExpect(status().isForbidden());
        assertThat(session.isInvalid()).isTrue();
    }
    @Test void logoutInvalidatesSessionAndCsrfIsRequired() throws Exception {
        register();
        var session = login();
        mvc.perform(post("/api/auth/logout").session(session)).andExpect(status().isForbidden());
        mvc.perform(post("/api/auth/logout").session(session).with(csrf())).andExpect(status().isNoContent());
        assertThat(session.isInvalid()).isTrue();
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content(registration("another", "13900000000", "123456"))).andExpect(status().isForbidden());
    }
    @Test void customersCannotUseAdminPathsAndSmsIsExplicitlyMockedAndLimited() throws Exception {
        register();
        var session = login();
        mvc.perform(get("/api/admin/users").session(session)).andExpect(status().isForbidden());
        String body = "{\"phone\":\"13800000000\",\"purpose\":\"login\"}";
        for (int attempt = 0; attempt < 3; attempt++) {
            mvc.perform(postJson("/api/auth/sms-code", body)).andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("当前为本地测试模式，验证码固定为 123456，不发送真实短信。"));
        }
        mvc.perform(postJson("/api/auth/sms-code", body)).andExpect(status().isTooManyRequests());
    }

    @Test void businessDataSourceStatusRequiresLoginAndTestsNeverConnectToVendor() throws Exception {
        mvc.perform(get("/api/data-source/status")).andExpect(status().isUnauthorized());
        register();
        var session = login();
        mvc.perform(get("/api/data-source/status").session(session))
                .andExpect(status().isOk()).andExpect(jsonPath("$.configured").value(false));
    }

    @Test void mexicoQueriesRequireLoginAndDoNotExposeWriteMethods() throws Exception {
        mvc.perform(get("/api/mexico/exports")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/mexico/exports/100")).andExpect(status().isUnauthorized());
        register();
        var session = login();
        mvc.perform(post("/api/mexico/exports").session(session).with(csrf())).andExpect(status().isForbidden());
        verifyNoInteractions(exportRepository);
    }
    @Test void mexicoPagesReturnCursorAndDetailsPreserveIdsAndMissingValues() throws Exception {
        register();
        var session = login();
        when(exportRepository.page(null, 3)).thenReturn(List.of(ExportFixtures.lead("100"), ExportFixtures.lead("99"), ExportFixtures.lead("98")));
        mvc.perform(get("/api/mexico/exports").param("limit", "2").session(session))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.items[0].recordId").value("100"))
                .andExpect(jsonPath("$.nextCursor").value("99")).andExpect(jsonPath("$.hasNext").value(true));
        String bigId = "9007199254740993";
        when(exportRepository.find(9007199254740993L)).thenReturn(Optional.of(ExportFixtures.lead(bigId)));
        mvc.perform(get("/api/mexico/exports/" + bigId).session(session)).andExpect(status().isOk())
                .andExpect(jsonPath("$.recordId").value(bigId)).andExpect(jsonPath("$.supplierId").value(bigId))
                .andExpect(jsonPath("$.quantity").value(0)).andExpect(jsonPath("$.grossWeightKg").isEmpty());
    }
    @Test void mexicoBadParametersNeverQueryVendor() throws Exception {
        register();
        var session = login();
        mvc.perform(get("/api/mexico/exports").param("limit", "51").session(session)).andExpect(status().isBadRequest());
        mvc.perform(get("/api/mexico/exports").param("limit", "abc").session(session)).andExpect(status().isBadRequest());
        mvc.perform(get("/api/mexico/exports").param("before", "1 OR 1=1").session(session)).andExpect(status().isBadRequest());
        mvc.perform(get("/api/mexico/exports/not-a-number").session(session)).andExpect(status().isBadRequest());
        verifyNoInteractions(exportRepository);
    }
    @Test void mexicoUnavailableMissingAndDisabledStatesAreNotSuccessfulDemoResults() throws Exception {
        register();
        var session = login();
        when(exportRepository.find(100L)).thenReturn(Optional.empty());
        mvc.perform(get("/api/mexico/exports/100").session(session)).andExpect(status().isNotFound());
        when(exportRepository.page(null, 21)).thenThrow(new DataAccessResourceFailureException("internal details"));
        mvc.perform(get("/api/mexico/exports").session(session)).andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").value("暂时无法读取墨西哥贸易数据，请检查内网连接后重试"));
        clearInvocations(exportRepository);
        jdbc.update("UPDATE sourcing_user SET enabled = FALSE");
        mvc.perform(get("/api/mexico/exports").session(session)).andExpect(status().isForbidden());
        verifyNoInteractions(exportRepository);
    }
    @Test void fullSearchRequiresLoginValidConditionsAndOnlyAllowsReadRequests() throws Exception {
        mvc.perform(get("/api/mexico/exports/search").param("country", "MX").param("hs", "8544")).andExpect(status().isUnauthorized());
        register();
        var session = login();
        for (String[] input : new String[][]{{"", "MX"}, {"8544%", "MX"}, {"8544", ""}, {"8544", "ID"}})
            mvc.perform(get("/api/mexico/exports/search").param("hs", input[0]).param("country", input[1]).session(session)).andExpect(status().isBadRequest());
        mvc.perform(post("/api/mexico/exports/search").session(session).with(csrf())).andExpect(status().isForbidden());
        verifyNoInteractions(exportRepository);
    }
    @Test void fullSearchReturnsRealQueryResultsAndTimeoutIs504() throws Exception {
        register();
        var session = login();
        var search = MexicoSearch.validate("cable", "8544", "MX", "", "");
        when(exportRepository.search(search, null, 3)).thenReturn(List.of(ExportFixtures.lead("100"), ExportFixtures.lead("99"), ExportFixtures.lead("98")));
        mvc.perform(get("/api/mexico/exports/search").param("keyword", "cable").param("hs", "8544").param("country", "MX").param("limit", "2").session(session))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(2)).andExpect(jsonPath("$.hasNext").value(true)).andExpect(jsonPath("$.nextCursor").value("99"));
        when(exportRepository.search(search, 99L, 3)).thenThrow(new org.springframework.dao.QueryTimeoutException("private"));
        mvc.perform(get("/api/mexico/exports/search").param("keyword", "cable").param("hs", "8544").param("country", "MX").param("before", "99").param("limit", "2").session(session))
                .andExpect(status().isGatewayTimeout()).andExpect(jsonPath("$.items").doesNotExist());
        clearInvocations(exportRepository);
        jdbc.update("UPDATE sourcing_user SET enabled = FALSE");
        mvc.perform(get("/api/mexico/exports/search").param("country", "MX").param("hs", "8544").session(session)).andExpect(status().isForbidden());
        verifyNoInteractions(exportRepository);
    }
}
