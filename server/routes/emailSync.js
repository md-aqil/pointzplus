// server/routes/emailSync.js – Live Gmail/Outlook OAuth Email Sync & Parser Engine
import express from 'express';
import jwt from 'jsonwebtoken';
import { google } from 'googleapis';
import { query } from '../db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'pointzplus-secret-key-2026-secure';

// OAuth2 credentials
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/email-sync/google/callback';

// Middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get OAuth URL for Google
router.get('/google/url', authenticate, (req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({ error: 'Google OAuth credentials not configured in server/.env' });
  }

  const oAuth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );

  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
  ];

  const url = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state: req.userId,
    prompt: 'consent'
  });

  res.json({ url });
});

// Google OAuth callback
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state: userId } = req.query;

    if (!code) {
      return res.status(400).send('Authorization code missing');
    }

    const oAuth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );

    const { tokens } = await oAuth2Client.getToken(code);
    
    // Get user email
    oAuth2Client.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const email = profile.data.emailAddress;

    // Save to database
    await query(`
      INSERT INTO email_sync_accounts (user_id, provider, email_address, oauth_token, oauth_refresh_token, token_expires_at, status)
      VALUES ($1, 'gmail', $2, $3, $4, $5, 'connected')
      ON CONFLICT (user_id, provider) 
      DO UPDATE SET oauth_token = $3, oauth_refresh_token = $4, token_expires_at = $5, status = 'connected', updated_at = NOW()
    `, [
      userId,
      email,
      tokens.access_token,
      tokens.refresh_token || null,
      tokens.expiry_date ? new Date(tokens.expiry_date) : null
    ]);

    // Render a clean success page that deep links back to app or browser
    res.send(`
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
            <a href="http://localhost:8081/email-sync" class="btn">Return to PointzPlus</a>
          </div>
          <script>
            // Try deep link to mobile app
            window.location.href = "pointzplus://email-sync/success?provider=google";
            setTimeout(() => {
              window.location.href = "http://localhost:8081/email-sync";
            }, 1500);
          </script>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('Google callback error:', err);
    res.status(500).send('Authentication failed: ' + err.message);
  }
});

// Scan live emails for loyalty programs
router.post('/scan', authenticate, async (req, res) => {
  try {
    const { provider = 'gmail' } = req.body;

    // Get OAuth tokens
    const accountResult = await query(
      `SELECT * FROM email_sync_accounts WHERE user_id = $1 AND provider = $2 AND status = 'connected'`,
      [req.userId, provider]
    );

    if (accountResult.rows.length === 0) {
      return res.status(400).json({ error: 'No connected email account found. Please connect your Gmail first.' });
    }

    const account = accountResult.rows[0];

    // Fetch and parse real emails from Gmail API
    const detectedAccounts = await scanGmailMessages(account);

    // Save detected loyalty accounts to database
    const addedAccounts = [];
    for (const detected of detectedAccounts) {
      // Find matching program
      const programResult = await query(
        'SELECT id, name FROM loyalty_programs WHERE seller_domain = $1 OR LOWER(name) LIKE LOWER($2) LIMIT 1',
        [detected.domain, `%${detected.programName || ''}%`]
      );

      if (programResult.rows.length > 0) {
        const program = programResult.rows[0];

        // Check if account already exists for user
        const existing = await query(
          `SELECT id, current_balance FROM linked_accounts WHERE user_id = $1 AND program_id = $2`,
          [req.userId, program.id]
        );

        if (existing.rows.length === 0) {
          const insertResult = await query(`
            INSERT INTO linked_accounts (
              user_id, program_id, account_number_masked, 
              current_balance, expiring_points, expiry_date,
              sync_method, sync_source, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, 'email_parser', $7, true)
            RETURNING *
          `, [
            req.userId, program.id, detected.accountNumber,
            detected.balance, detected.expiringPoints || 0, detected.expiryDate,
            provider
          ]);

          addedAccounts.push(insertResult.rows[0]);

          // Log transaction
          await query(`
            INSERT INTO points_transactions (account_id, type, points, description, source, transaction_date)
            VALUES ($1, 'credit', $2, $3, 'email_parser', NOW())
          `, [insertResult.rows[0].id, detected.balance, `Statement from ${detected.from}`]);
        } else {
          // Update existing balance if changed
          await query(`
            UPDATE linked_accounts 
            SET current_balance = $1, expiring_points = $2, expiry_date = $3, last_synced_at = NOW()
            WHERE id = $4
          `, [detected.balance, detected.expiringPoints || 0, detected.expiryDate, existing.rows[0].id]);
        }

        // Log parsed email statement audit
        await query(`
          INSERT INTO email_statements (
            user_id, email_sync_account_id, from_email, subject, received_at,
            matched_program_id, extracted_balance, extracted_account_number,
            extracted_expiry_date, parser_confidence, parsed_successfully, raw_text_preview
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11)
        `, [
          req.userId, account.id, detected.from, detected.subject, detected.receivedAt || new Date(),
          program.id, detected.balance, detected.accountNumber,
          detected.expiryDate, detected.confidence || 0.95, detected.preview || null
        ]);
      }
    }

    // Update last synced counter
    await query(
      `UPDATE email_sync_accounts SET last_synced_at = NOW(), programs_found = $1 WHERE id = $2`,
      [detectedAccounts.length, account.id]
    );

    res.json({
      scanned: detectedAccounts.length,
      added: addedAccounts.length,
      accounts: addedAccounts
    });
  } catch (err) {
    console.error('Scan error:', err);
    res.status(500).json({ error: 'Scan failed: ' + err.message });
  }
});

// Get connected email accounts
router.get('/accounts', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, provider, email_address, status, programs_found, last_synced_at, created_at
       FROM email_sync_accounts WHERE user_id = $1`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// Disconnect email account
router.delete('/accounts/:provider', authenticate, async (req, res) => {
  try {
    await query(
      `DELETE FROM email_sync_accounts WHERE user_id = $1 AND provider = $2`,
      [req.userId, req.params.provider]
    );
    res.json({ message: 'Disconnected successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

// ─── Real Gmail Search & Live Parser ───────────────────────────────────────

async function scanGmailMessages(account) {
  const oAuth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );

  oAuth2Client.setCredentials({
    access_token: account.oauth_token,
    refresh_token: account.oauth_refresh_token,
  });

  const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

  // 1. Fetch loyalty program domains from database
  const progRes = await query('SELECT seller_domain, name FROM loyalty_programs WHERE seller_domain IS NOT NULL');
  const domains = progRes.rows.map(r => r.seller_domain).filter(Boolean);

  // Construct search query
  const domainQuery = domains.map(d => `from:${d}`).join(' OR ');
  const searchQuery = `(${domainQuery}) (points OR miles OR statement OR balance OR rewards)`;

  console.log(`Searching Gmail for real loyalty emails with query: ${searchQuery.substring(0, 100)}...`);

  let messages = [];
  try {
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q: searchQuery,
      maxResults: 30,
    });
    messages = listRes.data.messages || [];
  } catch (searchErr) {
    console.warn('Broad search error, trying fallback loyalty query:', searchErr.message);
    const fallbackRes = await gmail.users.messages.list({
      userId: 'me',
      q: 'points OR miles OR "reward points" OR statement',
      maxResults: 20,
    });
    messages = fallbackRes.data.messages || [];
  }

  console.log(`Found ${messages.length} potential loyalty emails in user's Gmail.`);

  const detectedAccounts = [];

  for (const msg of messages) {
    try {
      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full',
      });

      const headers = detail.data.payload.headers || [];
      const fromHeader = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
      const subjectHeader = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '';
      const dateHeader = headers.find(h => h.name.toLowerCase() === 'date')?.value || new Date();

      const domain = extractDomain(fromHeader);
      const bodyText = extractBodyText(detail.data.payload);

      const parsed = parseStatementText(fromHeader, subjectHeader, bodyText);

      if (parsed && parsed.balance !== null) {
        detectedAccounts.push({
          from: fromHeader,
          domain: domain,
          subject: subjectHeader,
          receivedAt: new Date(dateHeader),
          preview: bodyText.substring(0, 200),
          ...parsed,
        });
      }
    } catch (msgErr) {
      console.error(`Error parsing message ${msg.id}:`, msgErr.message);
    }
  }

  return detectedAccounts;
}

function extractDomain(fromHeader) {
  const match = fromHeader.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  return match ? match[1].toLowerCase() : '';
}

function extractBodyText(payload) {
  let text = '';
  if (payload.body?.data) {
    text += Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        text += Buffer.from(part.body.data, 'base64').toString('utf-8');
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        const html = Buffer.from(part.body.data, 'base64').toString('utf-8');
        text += ' ' + html.replace(/<[^>]+>/g, ' ');
      } else if (part.parts) {
        text += ' ' + extractBodyText(part);
      }
    }
  }
  return text;
}

function parseStatementText(from, subject, content) {
  // 1. Balance extraction
  const balancePatterns = [
    /(?:points balance|total points|available points|miles balance|reward points|closing balance|available balance|current balance|total miles|points earned)[\s:]*([0-9,]+)/i,
    /(?:you have|earned)\s*([0-9,]+)\s*(?:points|miles|cv points|intermiles|supercoins)/i,
    /([0-9,]+)\s*(?:points|miles|reward points|supercoins)\s*(?:available|in your account|balance)/i,
    /Balance\s*:\s*([0-9,]+)/i,
  ];

  let balance = null;
  for (const pattern of balancePatterns) {
    const match = content.match(pattern) || subject.match(pattern);
    if (match && match[1]) {
      const num = parseInt(match[1].replace(/,/g, ''), 10);
      if (!isNaN(num) && num >= 0 && num < 50000000) {
        balance = num;
        break;
      }
    }
  }

  // If no balance was found, skip this email
  if (balance === null) return null;

  // 2. Account number extraction
  const accountPatterns = [
    /(?:member(?:ship)?\s*(?:no|id|number)|ffn|account\s*(?:no|number)|card\s*ending)[\s:]*([A-Z0-9*X-]{4,18})/i,
    /(?:membership|account|card)\s*#\s*([A-Z0-9*X-]{4,18})/i,
  ];

  let accountNumber = 'MEMBER-***';
  for (const pattern of accountPatterns) {
    const match = content.match(pattern) || subject.match(pattern);
    if (match && match[1]) {
      accountNumber = match[1].trim();
      break;
    }
  }

  // 3. Expiry date & expiring points extraction
  const expiryPatterns = [
    /(?:expiring on|valid until|points expiring|expiry date)[\s:]*([0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{2,4}|[A-Za-z]{3,9}\s+[0-9]{1,2},?\s+[0-9]{4})/i,
  ];

  let expiryDate = null;
  for (const pattern of expiryPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      const parsedDate = new Date(match[1]);
      if (!isNaN(parsedDate.getTime())) {
        expiryDate = parsedDate;
        break;
      }
    }
  }

  const expiringPointsMatch = content.match(/(?:expiring|expire)\s*([0-9,]+)\s*(?:points|miles)/i);
  const expiringPoints = expiringPointsMatch ? parseInt(expiringPointsMatch[1].replace(/,/g, ''), 10) : 0;

  return {
    balance,
    accountNumber,
    expiryDate,
    expiringPoints,
    confidence: 0.95
  };
}

export default router;