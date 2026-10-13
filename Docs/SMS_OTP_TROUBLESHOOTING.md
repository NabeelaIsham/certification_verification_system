# Registration SMS OTP delivery

## Confirmed live issue (2026-10-13)

The supplied backend log shows registration returned HTTP 201 and the email provider accepted the OTP email. SMS failed before contacting Text.lk because `TEXTLK_API_TOKEN` was absent from the running backend environment. The nearby HTTP 401 was a separate anonymous `GET /api/auth/me` session check.

`docker-compose.dokploy.yml` previously forwarded email variables but no TextLK variables. Adding a value to the local `Backend/.env`, or to the Compose interpolation environment without referencing it in the backend service, does not put it into that container.

## Apply the live configuration fix

1. In the Dokploy application's **Environment**, set `TEXTLK_API_TOKEN` to the current private token. Replace any previously exposed token through Text.lk's Developers page first. Do not paste it into logs, Git or chat.
2. Set `TEXTLK_SENDER_ID` to the exact approved sender ID from the same Text.lk account. The local setting is `certiverxia`; approval and the production setting have not been verified. `TextLKDemo` is unsuitable for production OTPs.
3. Ensure `OUTBOUND_DELIVERY_MODE=live` in this production application. Staging must retain its restricted delivery configuration.
4. Deploy the updated `docker-compose.dokploy.yml`. It now passes the token, sender, HTTPS endpoint, Bearer prefix and timeout to the backend, and refuses to render without the token and sender. If Dokploy stores an inline Compose definition, update that definition's backend environment section too.
5. Save and **redeploy/recreate the backend container**. Restarting an existing container alone does not replace its environment. Deploy the frontend changes as well to display SMS delivery failures correctly.
6. Use **Resend OTP** on the verification page after its cooldown. The account already exists; do not register it again. You can also use the email OTP if it is still valid. Confirm Text.lk's delivery report and receipt on the phone; API acceptance alone does not prove handset delivery.

The backend container can safely confirm that the variables are present without displaying their values:

```sh
node -e 'console.log({smsTokenConfigured: Boolean(process.env.TEXTLK_API_TOKEN?.trim()), smsSenderConfigured: Boolean(process.env.TEXTLK_SENDER_ID?.trim()), deliveryMode: process.env.OUTBOUND_DELIVERY_MODE})'
```

## Code safeguards included

- HTTP 200 responses with `status: false` or `status: "error"` no longer count as accepted SMS messages. Unknown response formats and explicitly failed delivery statuses also fail safely.
- Provider failures are classified into safe diagnostic codes for authentication, sender rejection, insufficient credits, invalid recipients and rate limits. Raw response bodies, tokens, OTPs and phone numbers are not attached to the error.
- Registration retains the created account and reports email/SMS acceptance separately. The verification page shows SMS failure and the email fallback instead of claiming both channels succeeded.
- Resend prevents overlapping requests. Its public response remains neutral to preserve account-enumeration protection.
- CI validates the Dokploy Compose definition with dummy credentials.

No test SMS was sent, and production settings were not changed from this workspace. A read-only request using the local token authenticated successfully, but that does not verify Dokploy's token, sender approval, credits or handset delivery.

Validation: all 152 backend unit tests passed; five registration/OTP frontend tests passed; both lint checks, the production frontend build, YAML parsing and `git diff --check` passed. Docker Compose execution is delegated to the added CI check because Docker is unavailable in this workspace. The existing frontend bundle-size warning remains.

Provider references: [Text.lk send response formats](https://text.lk/docs/send-sms/), [boolean success/error responses](https://text.lk/docs/sms-api-endpoints/), [sender ID requirements](https://text.lk/faq/), [token regeneration](https://text.lk/docs/textlk-api-key/).
