# Cloakr Backend - Receipt Validation Server

This is a simple Node.js Express server for validating Apple App Store receipts for the Cloakr VPN subscription system.

## Quick Start

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env and add your APPLE_SHARED_SECRET
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Test the server:**
   ```bash
   curl http://localhost:3000/health
   ```

## Configuration

### Required Environment Variables

- `APPLE_SHARED_SECRET`: Get this from App Store Connect > Your App > App Information > App-Specific Shared Secret

### Optional Environment Variables

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)

## API Endpoints

### Health Check
```
GET /health
```

Returns server status and configuration info.

### Receipt Validation  
```
POST /api/verifyReceipt
Content-Type: application/json

{
  "receiptData": "base64-encoded-receipt-string"
}
```

Returns normalized validation response:
```json
{
  "status": 0,
  "environment": "sandbox",
  "latestProductId": "cloakr.monthly.unlimited6",
  "activeEntitlement": true,
  "expiresDateMs": 1704067200000,
  "cancellationDateMs": null,
  "isInBillingRetryPeriod": false,
  "isInGracePeriod": false,
  "validationEndpoint": "sandbox"
}
```

## Deployment

For production deployment, ensure:

1. Use HTTPS (required for iOS apps)
2. Set `NODE_ENV=production`
3. Configure your `APPLE_SHARED_SECRET`
4. Update the React Native app's `EXPO_PUBLIC_BACKEND_URL` environment variable

## Features

- **Production-first validation**: Tries production endpoint first, falls back to sandbox for 21007 status
- **10-second timeout**: Uses AbortController for request timeouts
- **Security**: Never logs raw receipt data or shared secrets
- **Normalized responses**: Consistent response format regardless of Apple's response
- **Target product**: Specifically validates `cloakr.monthly.unlimited6` subscriptions