package com.fooderp;

import com.fooderp.entity.Role;
import com.fooderp.security.UserDetailsImpl;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Collections;

public class TestHelper {

    public static UserDetailsImpl setSecurityUser(Long id, String username, Role role, Long branchId) {
        GrantedAuthority authority = new SimpleGrantedAuthority(role.name());
        UserDetailsImpl details = new UserDetailsImpl(
                id,
                username,
                username + "@klyroerp.com",
                "Test User",
                "encodedPassword",
                branchId,
                "Main Branch",
                role.name(),
                true,
                Collections.singletonList(authority)
        );
        UsernamePasswordAuthenticationToken token =
                new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(token);
        return details;
    }

    public static void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }
}
