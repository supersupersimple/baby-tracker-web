// Mock authentication provider for local testing
export const MockProvider = {
  id: "mock",
  name: "Mock Login",
  type: "credentials",
  credentials: {
    email: { label: "Email", type: "email", placeholder: "test@example.com" }
  },
  async authorize(credentials) {
    // Always allow login with any email for local testing
    if (credentials?.email) {
      return {
        id: "1",
        email: credentials.email,
        name: credentials.email.split('@')[0],
        image: "https://avatar.vercel.sh/" + credentials.email
      };
    }
    return null;
  }
};