/**
 * Auth0 Configuration
 * Neurodivergent-friendly authentication setup
 */

export const auth0Config = {
  domain: process.env.EXPO_PUBLIC_AUTH0_DOMAIN || '',
  clientId: process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID || '',
  // Auth0 recommended format for iOS native apps
  redirectUri: 'com.willofcode.flowmind.auth0://dev-3ye3j4yrks1dqfm7.us.auth0.com/ios/com.willofcode.flowmind/callback',
  logoutUri: 'com.willofcode.flowmind.auth0://dev-3ye3j4yrks1dqfm7.us.auth0.com/ios/com.willofcode.flowmind',
  // Include Google Calendar scopes for calendar access
  scope: 'openid profile email offline_access https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events',
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
