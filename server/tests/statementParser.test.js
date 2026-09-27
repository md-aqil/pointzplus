// server/tests/statementParser.test.js
//
// Regression coverage for the statement parser.
//
// The rule-selection bugs guarded here were live in production code and wrote
// one loyalty program's balance onto another program's account:
//   1. `STATEMENT_RULES.find(...)` was first-match-wins, and three rules list
//      the bare word "statement" as a subject keyword — so any email containing
//      it was captured by whichever rule came first in the file.
//   2. A first attempt at scoring by keyword length still ranked the generic
//      "statement" (9 chars) above the distinctive "regalia" (7 chars).
//   3. A fall-through then let a *lower* ranked rule claim a message that a
//      stronger candidate had matched on identity but failed to parse.
//
// Run with: npm test  (Node's built-in runner — no extra dependencies)
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { StatementParser } from '../services/statementParser.js';

/** Parse a message the same way the scan pipeline does. */
function parse({ from, subject, body = '' }) {
  return StatementParser.parseEmail({
    messageId: 'test-message',
    fromHeader: from,
    subjectHeader: subject,
    bodyText: body,
    bodyHtml: '',
    receivedDate: '2026-09-25T12:00:00.000Z',
  });
}

/** Convenience: the program a message resolves to, or null. */
function programOf(input) {
  const r = parse(input);
  return r.isLoyaltyStatement ? r.loyaltyData.programName : null;
}

describe('statementParser — non-loyalty mail is rejected', () => {
  test('a marketing newsletter yields nothing', () => {
    const r = parse({
      from: 'news@shop.example',
      subject: 'Weekend Sale - 50% off everything',
      body: 'Shop the weekend sale and save big on every category.',
    });
    assert.equal(r.isLoyaltyStatement, false);
    assert.equal(r.loyaltyData, null);
  });

  test('an OTP email is not read as a balance', () => {
    const r = parse({
      from: 'no-reply@bank.example',
      subject: 'Your verification code',
      body: 'Your OTP is 482913. Do not share it with anyone.',
    });
    assert.equal(r.isLoyaltyStatement, false);
  });

  test('a bank debit alert is not read as points', () => {
    const r = parse({
      from: 'alerts@bank.example',
      subject: 'INR 5000.00 was debited from your account',
      body: 'INR 5000.00 was debited from your A/c no. XXXXXX1234 on 25 Sep.',
    });
    assert.equal(r.isLoyaltyStatement, false);
  });

  test('a known sender with no balance line yields nothing', () => {
    // The domain matches flipkart, but there is no balance to read. Returning a
    // number here would be a fabrication.
    const r = parse({
      from: 'no-reply@flipkart.com',
      subject: 'Weekly newsletter',
      body: 'Thanks for shopping with us. Happy deals ahead!',
    });
    assert.equal(r.isLoyaltyStatement, false);
  });

  test('an empty body yields nothing', () => {
    assert.equal(programOf({ from: 'x@y.example', subject: 'Hello', body: '' }), null);
  });
});

describe('statementParser — generic subjects do not hijack a brand', () => {
  // Regression: these all previously resolved to InterMiles Airline because
  // "statement" is a subject keyword of intermiles / air_india / club_vistara
  // and rule selection used to be first-match-wins.
  test('HDFC Regalia statement is not attributed to InterMiles', () => {
    const r = parse({
      from: 'alerts@self-test.example',
      subject: 'HDFC Regalia Points Statement',
      body: 'Available Points: 18450',
    });
    assert.equal(r.loyaltyData.programName, 'HDFC Regalia / Infinia Points');
    assert.equal(r.loyaltyData.balance, 18450);
  });

  test('SBI Card statement is not attributed to HDFC', () => {
    const r = parse({
      from: 'alerts@self-test.example',
      subject: 'SBI Card Reward Points statement',
      body: 'Reward points: 9200',
    });
    assert.equal(r.loyaltyData.programName, 'SBI Card Reward Points');
    assert.equal(r.loyaltyData.balance, 9200);
  });

  test('Club Vistara statement is not attributed to InterMiles', () => {
    const r = parse({
      from: 'hello@self-test.example',
      subject: 'Club Vistara statement',
      body: 'Total miles: 33000',
    });
    assert.equal(r.loyaltyData.programName, 'Club Vistara');
    assert.equal(r.loyaltyData.balance, 33000);
  });

  test('Marriott Bonvoy summary is not attributed to InterMiles', () => {
    const r = parse({
      from: 'bonvoy@self-test.example',
      subject: 'Marriott Bonvoy points summary',
      body: 'Points balance: 24300',
    });
    assert.equal(r.loyaltyData.programName, 'Marriott Bonvoy');
  });

  test('InterMiles activity update resolves to InterMiles', () => {
    const r = parse({
      from: 'x@self-test.example',
      subject: 'InterMiles activity update',
      body: 'Available miles: 12000',
    });
    assert.equal(r.loyaltyData.programName, 'InterMiles Airline');
  });

  test('a bare "statement" subject identifies no brand', () => {
    // Only generic keywords matched, so nothing may be claimed. Guessing here
    // would write this balance onto a random programme.
    assert.equal(
      programOf({ from: 'x@y.example', subject: 'Monthly statement', body: 'You have miles' }),
      null
    );
  });

  test('a specific match that cannot parse does not fall through to a generic one', () => {
    // "mycards" identifies HDFC, so HDFC is the only candidate that may claim
    // this message — but its balance patterns do not cover "Available balance",
    // and a generic "statement" rule (air_india) WOULD happily read that number.
    // Falling through there would write an HDFC statement's balance onto the
    // Air India account. Extracting nothing is the correct outcome.
    const r = parse({
      from: 'alerts@self-test.example',
      subject: 'MyCards statement',
      body: 'Available balance: 500',
    });
    assert.equal(r.isLoyaltyStatement, false);
  });
});

describe('statementParser — balance extraction', () => {
  test('reads a labelled balance with thousands separators', () => {
    const r = parse({
      from: 'x@self-test.example',
      subject: 'HDFC Regalia Points Statement',
      body: 'Available Points: 1,84,500',
    });
    assert.equal(r.loyaltyData.balance, 184500);
  });

  test('reads the "N SuperCoins" subject-line form', () => {
    // Myntra sends "18 SuperCoins on the way!" — the number precedes the word.
    const r = parse({
      from: 'info@myntra.com',
      subject: '18 SuperCoins on the way!',
      body: 'Order delivered.',
    });
    assert.equal(r.loyaltyData.programName, 'Flipkart SuperCoins');
    assert.equal(r.loyaltyData.balance, 18);
  });

  test('reads the "SuperCoins: N" body form', () => {
    const r = parse({
      from: 'x@self-test.example',
      subject: 'Your SuperCoins statement',
      body: 'SuperCoins: 4820',
    });
    assert.equal(r.loyaltyData.balance, 4820);
  });

  test('rejects an implausibly large balance', () => {
    // Guard against order numbers / tracking ids being read as balances.
    const r = parse({
      from: 'x@self-test.example',
      subject: 'Your SuperCoins statement',
      body: 'SuperCoins: 90000000',
    });
    assert.equal(r.isLoyaltyStatement, false);
  });
});

describe('statementParser — sender domain is the strongest signal', () => {
  test('a sibling-brand sender resolves through the parser aliases', () => {
    // myntra.com is not Flipkart's catalogue seller_domain, but STATEMENT_RULES
    // lists it, so SuperCoins mail from Myntra must still resolve correctly.
    const r = parse({
      from: 'updates@myntra.com',
      subject: 'Big Brand Bash',
      body: 'You have 250 SuperCoins to spend.',
    });
    assert.equal(r.loyaltyData.programName, 'Flipkart SuperCoins');
  });

  test('a brand domain with a generic subject still resolves', () => {
    const r = parse({
      from: 'no-reply@zomato.com',
      subject: 'Your Zomato Gold points',
      body: 'Points balance: 640',
    });
    assert.equal(r.loyaltyData.programName, 'Zomato Gold');
  });
});

describe('statementParser — expiry extraction', () => {
  test('captures expiring points and the expiry date', () => {
    const r = parse({
      from: 'x@self-test.example',
      subject: 'HDFC Regalia Points Statement',
      body: 'Available Points: 18450\n2000 points expiring on 15 November 2026',
    });
    assert.equal(r.loyaltyData.expiringPoints, 2000);
    assert.ok(r.loyaltyData.expiryDate, 'expected an expiry date to be parsed');
    assert.match(r.loyaltyData.expiryDate, /^2026-11-1\d/);
  });

  test('leaves expiry null when the email does not mention one', () => {
    const r = parse({
      from: 'x@self-test.example',
      subject: 'Marriott Bonvoy points summary',
      body: 'Points balance: 24300',
    });
    assert.equal(r.loyaltyData.expiringPoints, 0);
    assert.equal(r.loyaltyData.expiryDate, null);
  });
});

describe('statementParser — ranking contract', () => {
  test('domain matches rank above every subject match', () => {
    const ranked = StatementParser.rankRules('no-reply@flipkart.com', 'club vistara statement');
    assert.equal(ranked[0].rule.programId, 'flipkart_supercoins');
  });

  test('a distinctive keyword outranks a generic one', () => {
    const ranked = StatementParser.rankRules('x@self-test.example', 'hdfc regalia points statement');
    // "regalia" is specific; "statement" is generic and must rank last.
    assert.equal(ranked[0].rule.programId, 'hdfc_mycards');
    assert.equal(ranked[ranked.length - 1].generic, true);
  });

  test('generic keywords are flagged so they cannot be used as a fallback', () => {
    const ranked = StatementParser.rankRules('x@self-test.example', 'monthly statement');
    assert.ok(ranked.length > 0);
    assert.ok(
      ranked.every((c) => c.generic),
      'every candidate should be generic for a bare "statement" subject'
    );
  });
});

