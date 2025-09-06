# Supabase Auth Configuration for Thirdweb Integration

## 1. Supabase Dashboard Settings

### Navigate to Authentication → Settings

**Site URL:**
```
https://your-domain.com
```

**Additional Redirect URLs:**
```
https://your-domain.com/auth/callback
https://your-domain.com/dashboard
https://localhost:3000/auth/callback  (for development)
https://localhost:3000/dashboard      (for development)
```

**JWT Settings:**
- JWT expiry: 3600 seconds (1 hour)
- Refresh token rotation: Enabled
- Reuse interval: 10 seconds

### Email Templates (Authentication → Email Templates)

**Confirm signup:**
```html
<h2>Confirm your signup for Beehive Platform</h2>
<p>Follow this link to confirm your account:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your account</a></p>

<p>If you didn't sign up for Beehive Platform, you can safely ignore this email.</p>
```

**Reset password:**
```html
<h2>Reset password for Beehive Platform</h2>
<p>Follow this link to reset the password for your account:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>

<p>If you didn't request a password reset, you can safely ignore this email.</p>
```

## 2. Enable Auth Providers

### Email Provider
- ✅ **Enable email confirmations**: ON
- ✅ **Enable email change confirmations**: ON  
- ✅ **Secure email change**: ON

### OAuth Providers (Optional)
Enable these for social login integration with Thirdweb:

**Google OAuth:**
- Client ID: `your-google-client-id`
- Client Secret: `your-google-client-secret`
- Redirect URL: `https://cvqibjcbfrwsgkvthccp.supabase.co/auth/v1/callback`

**Discord OAuth:**
- Client ID: `your-discord-client-id`
- Client Secret: `your-discord-client-secret`
- Redirect URL: `https://cvqibjcbfrwsgkvthccp.supabase.co/auth/v1/callback`

## 3. Custom Claims Configuration

Add this to your JWT template (Authentication → Settings → JWT Template):

```json
{
  "aud": "authenticated",
  "exp": {{ .Exp }},
  "iat": {{ .Iat }},
  "iss": "{{ .Issuer }}",
  "sub": "{{ .Subject }}",
  "email": "{{ .Email }}",
  "phone": "{{ .Phone }}",
  "app_metadata": {{ .AppMetaData }},
  "user_metadata": {{ .UserMetaData }},
  "role": "{{ .Role }}",
  "aal": "{{ .AuthenticatorAssuranceLevel }}",
  "amr": {{ .AMR }},
  "session_id": "{{ .SessionId }}",
  "wallet_address": "{{ .UserMetaData.wallet_address }}",
  "is_admin": "{{ .UserMetaData.is_admin }}"
}
```

## 4. Database Triggers (Already included in migration 006)

The trigger `on_auth_user_created` automatically:
- Links `auth.users` with `public.users` 
- Creates member and balance records
- Extracts wallet address from user metadata

## 5. RLS Policies Helper Function

The `get_current_wallet_address()` function checks both:
- JWT claims: `wallet_address`
- Request headers: `x-wallet-address`

This allows both Supabase Auth JWT and direct wallet authentication.