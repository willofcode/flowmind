import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';

WebBrowser.maybeCompleteAuthSession();

// Google OAuth Config
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
const REDIRECT_URI = AuthSession.makeRedirectUri({
  scheme: 'flowmind'
});

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
];

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export async function signInWithGoogle() {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('GOOGLE_CLIENT_ID is not defined in environment variables');
  }

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID,
      scopes: GOOGLE_SCOPES,
      redirectUri: REDIRECT_URI,
    },
    discovery
  );

  if (response?.type === 'success') {
    const { authentication } = response;
    if (authentication?.accessToken) {
      await SecureStore.setItemAsync('google_access_token', authentication.accessToken);
      return authentication.accessToken;
    }
  }
  
  return null;
}

export async function getStoredAccessToken(): Promise<string | null> {
  return await SecureStore.getItemAsync('google_access_token');
}

export async function signOutGoogle() {
  await SecureStore.deleteItemAsync('google_access_token');
}