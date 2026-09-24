// server/controllers/emailSync.controller.js – HTTP layer for Gmail sync.
import {
  gmailService,
  oauthConfigured,
  pubsubTopicConfigured,
  verifyOAuthState,
  isAuthorizedPubSubRequest,
} from '../services/gmail.service.js';
import { asyncHandler, ApiError } from '../lib/errors.js';

const APP_DEEP_LINK =
  process.env.APP_DEEP_LINK || 'pointzplus://email-sync/success?provider=google';
const WEB_RETURN_URL = process.env.WEB_RETURN_URL || 'http://localhost:8081/email-sync';

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
          <p>Your Gmail account (${email}) has been securely linked. Return to PointzPlus to scan your points & coupons.</p>
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
      return res.status(400).send('Authorization code missing');
    }
    if (!userId) {
      return res
        .status(400)
        .send('Invalid or expired OAuth state. Please reconnect from the app.');
    }

    try {
      const email = await gmailService.exchangeCode(code, userId);
      res.send(connectedPage(email));
    } catch (err) {
      console.error('Google callback error:', err);
      res.status(500).send('Authentication failed: ' + err.message);
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
    await gmailService.disconnect(req.userId, req.params.provider);
    res.json({ message: 'Disconnected successfully' });
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
};
