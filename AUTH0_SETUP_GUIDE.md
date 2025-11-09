# Auth0 Setup Guide for FlowMind

## Step 1: Auth0 Dashboard Configuration

### Create Application
1. Go to https://auth0.com/
2. Sign up or log in
3. Navigate to **Applications** → **Create Application**
4. Name: `FlowMind`
5. Type: **Native**
6. Click **Create**

### Configure Application Settings

In your application settings, configure the following:

#### Allowed Callback URLs
```
flowmind://com.willofcode.flowmind/ios/com.willofcode.flowmind/callback,
exp://localhost:8081
```

#### Allowed Logout URLs
```
flowmind://com.willofcode.flowmind/ios/com.willofcode.flowmind,
exp://localhost:8081
```

#### Allowed Web Origins
```
flowmind://com.willofcode.flowmind
```

### Get Your Credentials

From the **Settings** tab, copy these values (you'll need them):
- **Domain** (e.g., `dev-xyz123.us.auth0.com`)
- **Client ID** (e.g., `abc123xyz456...`)

### Enable Google Social Connection (Optional)

1. Go to **Authentication** → **Social**
2. Click **+ Create Connection**
3. Select **Google**
4. Enter your Google OAuth credentials
5. Enable the connection for your FlowMind application

## Step 2: Environment Variables

Create `.env` file in the `client` folder with:

```bash
EXPO_PUBLIC_AUTH0_DOMAIN=your-domain.us.auth0.com
EXPO_PUBLIC_AUTH0_CLIENT_ID=your-client-id
```

## Step 3: Update app.json

The bundle identifier should match:
```json
{
  "expo": {
    "scheme": "flowmind",
    "ios": {
      "bundleIdentifier": "com.willofcode.flowmind"
    }
  }
}
```

## Next Steps

Once you've completed the Auth0 Dashboard setup:
1. Copy your Domain and Client ID
2. Create the `.env` file with your credentials
3. I'll install the Auth0 React Native SDK
4. Implement the authentication flow
