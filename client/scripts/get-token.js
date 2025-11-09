/**
 * Quick script to print access token instructions
 */

console.log(`
🔑 TO GET YOUR ACCESS TOKEN:

1. Open your iOS app
2. Sign in with Google
3. Open React Native Debugger console (Cmd+D → Debug)
4. Run this command:

   require('expo-secure-store').getItemAsync('google_calendar_access_token').then(console.log)

5. Copy the token that prints out

6. Then in the server folder, run:

   node setup-webhook.js <YOUR_TOKEN> <YOUR_NGROK_URL>

Example:
   node setup-webhook.js ya29.a0A... https://xyz.ngrok-free.dev
`);
