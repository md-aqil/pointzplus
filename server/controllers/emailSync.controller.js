import {
  gmailService,
  oauthConfigured,
  pubsubTopicConfigured,
  verifyOAuthState,
  isAuthorizedPubSubRequest,
} from '../services/gmail.service.js';
import { EmailSyncRepo } from '../repositories/emailSync.repo.js';
import { asyncHandler, ApiError } from '../lib/errors.js';

const APP_DEEP_LINK =
  process.env.APP_DEEP_LINK || 'pointzplus://email-sync/success?provider=google';
// Where the browser returns after OAuth. Set WEB_RETURN_URL (e.g. https://app.example.com/email-sync);
// the localhost fallback is for local development only.
const WEB_RETURN_URL =
  process.env.WEB_RETURN_URL ||
  (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8081/email-sync');
if (!WEB_RETURN_URL) {
  console.warn('[emailSync] WEB_RETURN_URL is not set; the "Return to PointzPlus" link will be empty.');
}

function connectedPage(email) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Email Connected - PointzPlus</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F5FEFF; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: white; padding: 32px; border-radius: 24px; box-shadow: 0 10px 30px rgba(1, 162, 251, 0.1); text-align: center; max-width: 360px; }
          h2 { color: #070617; margin: 16px 0 8px; }
          p { color: #6A6A74; font-size: 14px; margin-bottom: 24px; }
          .btn { background: #01A2FB; color: white; padding: 14px 24px; border-radius: 14px; text-decoration: none; font-weight: bold; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="card">
          <div style="font-size: 48px;">✅</div>
          <h2>Gmail Connected!</h2>
          <p>Your Gmail account (${email}) has been securely linked. Return to PointzPlus to scan your points.</p>
          <a href="${WEB_RETURN_URL}" class="btn">Return to PointzPlus</a>
        </div>
        <script>
          window.location.href = "${APP_DEEP_LINK}";
          setTimeout(() => { window.location.href = "${WEB_RETURN_URL}"; }, 1500);
        </script>
      </body>
    </html>
  `;
}

function errorPage(message) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Google Connection - PointzPlus</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #FFF6F6; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
          .card { background: white; padding: 32px; border-radius: 24px; box-shadow: 0 10px 30px rgba(255, 67, 67, 0.1); text-align: center; max-width: 400px; width: 100%; border: 1px solid #FFE0E0; }
          h2 { color: #070617; margin: 16px 0 8px; font-size: 20px; }
          p { color: #6A6A74; font-size: 14px; line-height: 1.5; margin-bottom: 20px; }
          .tip { background: #F5FEFF; border: 1px solid #BCEBFC; border-radius: 12px; padding: 14px; text-align: left; margin-bottom: 24px; }
          .tip-title { color: #01A2FB; font-weight: bold; font-size: 13px; margin-bottom: 4px; }
          .tip-desc { color: #393845; font-size: 12px; line-height: 1.4; margin: 0; }
          .btn { background: #01A2FB; color: white; padding: 14px 24px; border-radius: 14px; text-decoration: none; font-weight: bold; display: inline-block; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div style="font-size: 48px;">⚠️</div>
          <h2>Permission Needed</h2>
          <p>${message}</p>
          <div class="tip">
            <div class="tip-title">💡 How to fix:</div>
            <p class="tip-desc">During Google Sign-In, make sure to <strong>check the box</strong> for <em>"View your email messages and settings"</em> so PointzPlus can read your loyalty statements.</p>
          </div>
          <a href="${WEB_RETURN_URL}" class="btn">Return to PointzPlus App</a>
        </div>
      </body>
    </html>
  `;
}

export const emailSyncController = {
  getAuthUrl: asyncHandler(async (req, res) => {
    if (!oauthConfigured()) {
      throw ApiError.internal(
        'Google OAuth credentials not configured in server/.env'
      );
    }
    res.json({ url: gmailService.generateAuthUrl(req.userId) });
  }),

  oauthCallback: asyncHandler(async (req, res) => {
    const { code } = req.query;
    const userId = verifyOAuthState(req.query.state);
    if (!code) {
      return res.status(400).send(errorPage('Authorization code missing. Please retry connecting from the app.'));
    }
    if (!userId) {
      return res
        .status(400)
        .send(errorPage('Invalid or expired OAuth session. Please reconnect from the app.'));
    }

    try {
      const email = await gmailService.exchangeCode(code, userId);
      // Auto-queue background scan immediately upon connecting
      gmailService.scan(userId, 'gmail', false).catch((err) => {
        console.warn('[AutoScan] Queue error on connect:', err.message);
      });
      res.send(connectedPage(email));
    } catch (err) {
      console.error('Google callback error:', err);
      res.status(400).send(errorPage(err.message || 'Permission denied during Google Sign-In.'));
    }
  }),

  scan: asyncHandler(async (req, res) => {
    const { provider = 'gmail', wait = true } = req.body;
    const result = await gmailService.scan(req.userId, provider, wait !== false);
    res.status(result.status).json(result.body);
  }),

  getJob: asyncHandler(async (req, res) => {
    const job = await gmailService.getJob(req.params.id, req.userId);
    if (!job) throw ApiError.notFound('Job not found');
    res.json(job);
  }),

  listAccounts: asyncHandler(async (req, res) => {
    res.json(await gmailService.listAccounts(req.userId));
  }),

  disconnect: asyncHandler(async (req, res) => {
    // req.params.provider holds the account id: disconnecting must target one
    // specific mailbox now that a user can connect several.
    const result = await gmailService.disconnect(req.userId, req.params.provider);
    res.status(result.status).json(result.body);
  }),

  enableWatch: asyncHandler(async (req, res) => {
    if (!pubsubTopicConfigured()) {
      throw ApiError.badRequest(
        'GOOGLE_PUBSUB_TOPIC is not configured. Set it to projects/<project>/topics/<topic>.'
      );
    }
    const result = await gmailService.enableWatch(req.userId);
    res.status(result.status).json(result.body);
  }),

  pubsubWebhook: asyncHandler(async (req, res) => {
    const authorized = await isAuthorizedPubSubRequest(req).catch(() => false);
    if (!authorized) {
      return res.status(401).json({
        error:
          'Unauthorized. Set PUBSUB_WEBHOOK_SECRET in server/.env and send it as "Authorization: Bearer <secret>", or configure an OIDC token on the Pub/Sub push subscription.',
      });
    }

    // Acknowledge immediately – processing happens async.
    res.status(200).send('OK');
    gmailService.handleWebhook(req.body).catch((err) => {
      console.error('Gmail webhook error:', err.message);
    });
  }),

  listStatements: asyncHandler(async (req, res) => {
    const limit = Math.max(1, Math.min(500, Number(req.query.limit) || 200));
    const statements = await EmailSyncRepo.listEmailStatements(req.userId, limit);
    res.json(statements);
  }),

  getActiveJob: asyncHandler(async (req, res) => {
    const job = await EmailSyncRepo.findAnyActiveJob(req.userId);
    res.json({ activeJob: job || null, isSyncing: Boolean(job) });
  }),
};
