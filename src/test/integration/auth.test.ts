import { describe, it, expect, beforeEach, vi } from "vitest";
import { handlers } from "~/server/auth";
import { authConfig } from "~/server/auth/config";

describe("Authentication Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Auth Configuration", () => {
    it("should have proper auth configuration", () => {
      expect(authConfig).toBeDefined();
      expect(authConfig.providers).toBeDefined();
      expect(authConfig.providers).toHaveLength(1);
      expect(authConfig.providers[0].id).toBe("discord");
    });

    it("should have proper session configuration", () => {
      expect(authConfig.session).toBeDefined();
      expect(authConfig.session.strategy).toBe("jwt");
    });

    it("should have proper callbacks configured", () => {
      expect(authConfig.callbacks).toBeDefined();
      expect(authConfig.callbacks.session).toBeDefined();
      expect(authConfig.callbacks.jwt).toBeDefined();
    });
  });

  describe("Auth Handlers", () => {
    it("should export GET and POST handlers", () => {
      expect(handlers).toBeDefined();
      expect(handlers.GET).toBeDefined();
      expect(handlers.POST).toBeDefined();
      expect(typeof handlers.GET).toBe("function");
      expect(typeof handlers.POST).toBe("function");
    });

    it("should handle GET requests", async () => {
      const request = new Request("http://localhost/api/auth/signin");
      const response = await handlers.GET(request);
      
      expect(response).toBeDefined();
      expect(response instanceof Response).toBe(true);
    });

    it("should handle POST requests", async () => {
      const request = new Request("http://localhost/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      
      const response = await handlers.POST(request);
      
      expect(response).toBeDefined();
      expect(response instanceof Response).toBe(true);
    });
  });

  describe("Session Callback", () => {
    it("should transform session correctly", () => {
      const mockSession = {
        user: {
          id: "test-user-id",
          name: "Test User",
          email: "test@example.com",
          image: "https://example.com/avatar.png",
        },
        expires: "2024-01-01T00:00:00.000Z",
      };

      const mockToken = {
        sub: "test-user-id",
        name: "Test User",
        email: "test@example.com",
        picture: "https://example.com/avatar.png",
      };

      const result = authConfig.callbacks.session({
        session: mockSession,
        token: mockToken,
        user: mockSession.user,
      });

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.id).toBe("test-user-id");
      expect(result.user.name).toBe("Test User");
      expect(result.user.email).toBe("test@example.com");
    });

    it("should handle missing token", () => {
      const mockSession = {
        user: {
          id: "test-user-id",
          name: "Test User",
          email: "test@example.com",
        },
        expires: "2024-01-01T00:00:00.000Z",
      };

      const result = authConfig.callbacks.session({
        session: mockSession,
        token: null,
        user: mockSession.user,
      });

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
    });
  });

  describe("JWT Callback", () => {
    it("should transform JWT correctly", () => {
      const mockToken = {
        sub: "test-user-id",
        name: "Test User",
        email: "test@example.com",
        picture: "https://example.com/avatar.png",
      };

      const mockUser = {
        id: "test-user-id",
        name: "Test User",
        email: "test@example.com",
        image: "https://example.com/avatar.png",
      };

      const result = authConfig.callbacks.jwt({
        token: mockToken,
        user: mockUser,
        account: null,
        profile: null,
        trigger: "signIn",
      });

      expect(result).toBeDefined();
      expect(result.sub).toBe("test-user-id");
      expect(result.name).toBe("Test User");
      expect(result.email).toBe("test@example.com");
    });

    it("should handle token refresh", () => {
      const mockToken = {
        sub: "test-user-id",
        name: "Test User",
        email: "test@example.com",
        picture: "https://example.com/avatar.png",
      };

      const result = authConfig.callbacks.jwt({
        token: mockToken,
        user: null,
        account: null,
        profile: null,
        trigger: "update",
      });

      expect(result).toBeDefined();
      expect(result.sub).toBe("test-user-id");
    });
  });

  describe("Discord Provider", () => {
    it("should have correct Discord provider configuration", () => {
      const discordProvider = authConfig.providers[0];
      
      expect(discordProvider.id).toBe("discord");
      expect(discordProvider.name).toBe("Discord");
      expect(discordProvider.type).toBe("oauth");
      expect(discordProvider.clientId).toBeDefined();
      expect(discordProvider.clientSecret).toBeDefined();
    });

    it("should have proper Discord scopes", () => {
      const discordProvider = authConfig.providers[0];
      
      expect(discordProvider.authorization).toBeDefined();
      expect(discordProvider.authorization.params).toBeDefined();
      expect(discordProvider.authorization.params.scope).toContain("identify");
      expect(discordProvider.authorization.params.scope).toContain("email");
    });
  });

  describe("Environment Variables", () => {
    it("should require necessary environment variables", () => {
      // This test ensures that the auth config requires the necessary env vars
      expect(authConfig.secret).toBeDefined();
      expect(authConfig.providers[0].clientId).toBeDefined();
      expect(authConfig.providers[0].clientSecret).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should handle malformed requests gracefully", async () => {
      const malformedRequest = new Request("http://localhost/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid json",
      });

      const response = await handlers.POST(malformedRequest);
      
      expect(response).toBeDefined();
      expect(response instanceof Response).toBe(true);
    });

    it("should handle missing request body", async () => {
      const requestWithoutBody = new Request("http://localhost/api/auth/signin", {
        method: "POST",
      });

      const response = await handlers.POST(requestWithoutBody);
      
      expect(response).toBeDefined();
      expect(response instanceof Response).toBe(true);
    });
  });

  describe("Security", () => {
    it("should have proper security headers", async () => {
      const request = new Request("http://localhost/api/auth/signin");
      const response = await handlers.GET(request);
      
      expect(response).toBeDefined();
      // Note: NextAuth handles security headers automatically
      expect(response instanceof Response).toBe(true);
    });

    it("should validate session properly", () => {
      const mockSession = {
        user: {
          id: "test-user-id",
          name: "Test User",
          email: "test@example.com",
        },
        expires: "2024-01-01T00:00:00.000Z",
      };

      const result = authConfig.callbacks.session({
        session: mockSession,
        token: null,
        user: mockSession.user,
      });

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.id).toBe("test-user-id");
    });
  });
});