# Certificate sharing

The LinkedIn, WhatsApp, Facebook and X buttons open the selected platform's share composer directly with `https://certiverxia.com/certificate/<code>`. The user completes the post in that platform. The general **Share certificate** button uses the device's native link-sharing menu, with a copy-link fallback.

The certificate page displays the certificate image and public recipient, course and institute details without requiring sign-in or JavaScript. It includes Open Graph and X image metadata in the initial HTML so social crawlers can find the preview. Preview appearance, cropping and refresh timing are controlled by each platform; an image attachment is not posted automatically.

## Deployment

Deploy **both backend and frontend**. The frontend Nginx configuration forwards `/certificate/` to the backend; deploying only the React build will not enable these pages. Both standalone and Dokploy Nginx configurations include this route. Vite also proxies it during local development.

Set backend `FRONTEND_URL=https://certiverxia.com` (already configured in `docker-compose.dokploy.yml`). This configured origin supplies all canonical page and image links. Uploaded generated certificates must be present in the backend's persistent uploads volume.

After deployment, verify an issued certificate, click a social button and confirm the composer receives the `/certificate/<code>` URL. Open that URL in a signed-out browser: the certificate should appear immediately. View its page source to confirm `og:image` points to the same domain's `/api/certificates/verify/<code>/image`, then open that image URL without signing in. A platform may cache a preview after fetching it.

## Access and lifecycle

The page uses the same public certificate-code lookup and image access policy as verification. It checks status, expiry, digital signature trust and tenant ownership of the generated image. Revoked, suspended, draft, expired or untrusted signed certificates do not receive an image preview. Legacy unsigned certificates are labelled as legacy records. Missing images produce a record with an explanation, without an image metadata tag.

The page and image responses use `private, no-store`; status is checked on every request. The existing restricted `/share/<token>` links retain their disclosure, expiry and view-limit behavior. Public links contain certificate codes, never storage paths, authentication tokens or private share grants.

Frontend tests cover direct social URLs, native sharing, copying and cancellation. Database integration tests cover anonymous HTML/image access, crawler metadata, canonical origins, HTML escaping, lifecycle restrictions and issuer trust. CI builds both frontend Nginx configurations.
