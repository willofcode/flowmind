/**
 * Auth0 Configuration
 * Neurodivergent-friendly authentication setup
 */

export const auth0Config = {
  domain: process.env.EXPO_PUBLIC_AUTH0_DOMAIN || '',
  clientId: process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID || '',
  // Callback URLs must match Auth0 Dashboard configuration
  redirectUri: 'flowmind://com.willofcode.flowmind/ios/com.willofcode.flowmind/callback',
  logoutUri: 'flowmind://com.willofcode.flowmind/ios/com.willofcode.flowmind',
  scope: 'openid profile email offline_access',
};

// Validate configuration
export const validateAuth0Config = () => {
  if (!auth0Config.domain || !auth0Config.clientId) {
    throw new Error(
      'Auth0 configuration missing. Please check your .env file:\n' +
      'EXPO_PUBLIC_AUTH0_DOMAIN=your-domain.us.auth0.com\n' +
      'EXPO_PUBLIC_AUTH0_CLIENT_ID=your-client-id'
    );
  }
};
