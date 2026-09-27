// server/tests/emailSyncRepo.test.js
//
// DB-backed regression coverage for the catalogue-resolution layer — the code
// that decides WHICH loyalty program an extracted balance is written to.
//
// Bugs guarded here were live in production and silently overwrote one
// program's balance with another's:
//   * A bare `LOWER(name) LIKE '%name%'` fallback matched generic LLM names
//     ("Rewards", "Points", "Miles") against whichever catalogue row sorted
//     first, so an email from an unknown sender could rewrite a real account.
//   * Gating that fallback purely on `seller_domain` broke sibling-brand senders
//     (Flipkart SuperCoins arrives from myntra.com), so domain resolution now
//     goes through the parser's own alias list.
//
// These tests run against a throwaway `pointzplus_test` database built from the
// real migrations — never the developer's `pointzplus` data.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { canReachPostgres, useTestDatabase, resetTestDatabase } from './helpers/testDb.js';

// The pool inside db.js is built from process.env at import time, so the test
// database must be selected before any repository module is loaded.
useTestDatabase();

const postgresAvailable = canReachPostgres();
const describeDb = postgresAvailable ? describe : describe.skip;

if (!postgresAvailable) {
  console.error(
    '[db-tests] PostgreSQL unreachable — skipping DB-backed tests. ' +
      'Start Postgres or set DB_HOST/DB_PORT/DB_USER/DB_PASSWORD to run them.'
  );
}

let EmailSyncRepo;
let query;
let pool;
let userId;
let baseCatalogueSize;

describeDb('emailSyncRepo — findOrCreateProgramForStatement (DB)', () => {
  before(async () => {
    try {
      resetTestDatabase();
      // Imported dynamically *after* useTestDatabase() has set DB_NAME.
      ({ EmailSyncRepo } = await import('../repositories/emailSync.repo.js'));
      ({ query, pool } = await import('../db.js'));

      const { rows } = await query(
        `INSERT INTO users (email, password_hash, full_name)
         VALUES ('repo-test@example.test', 'x', 'Repo Test')
         RETURNING id`
      );
      userId = rows[0].id;

      const { rows: c } = await query('SELECT COUNT(*)::int AS n FROM loyalty_programs');
      baseCatalogueSize = c[0].n;
    } catch (err) {
      // Surface the real cause: without this the runner reports every test as
      // "cancelled" and the actual setup failure is invisible.
      throw new Error(`DB test setup failed: ${err.message}\n${err.stack}`);
    }
  });

  after(async () => {
    if (pool) await pool.end();
  });

  const catalogueCount = async () => {
    const { rows } = await query('SELECT COUNT(*)::int AS n FROM loyalty_programs');
    return rows[0].n;
  };

  describe('unambiguous matches', () => {
    test('resolves on an exact sender domain', async () => {
      const program = await EmailSyncRepo.findOrCreateProgramForStatement('axisbank.com', {
        brandName: 'Axis Bank',
        programName: 'Axis EDGE REWARDS',
        programId: 'axis_edge',
        category: 'banking',
        pointValueINR: 0.2,
      });
      assert.equal(program.slug, 'axis_edge');
    });

    test('resolves on an exact slug', async () => {
      const program = await EmailSyncRepo.findOrCreateProgramForStatement('unknown-host.test', {
        brandName: 'Marriott',
        programName: 'Anything',
        programId: 'marriott_bonvoy',
        category: 'hotels',
        pointValueINR: 0.7,
      });
      assert.equal(program.slug, 'marriott_bonvoy');
    });
  });

  describe('sibling-brand sender aliases (regression)', () => {
    test('myntra.com resolves to Flipkart SuperCoins', async () => {
      // myntra.com is not Flipkart's catalogue seller_domain. It is only known to
      // STATEMENT_RULES. Before alias resolution this created a DUPLICATE
      // "SuperCoins" program and split the user's balance across two rows.
      const program = await EmailSyncRepo.findOrCreateProgramForStatement('myntra.com', {
        brandName: 'Myntra',
        programName: 'SuperCoins',
        programId: 'myntra',
        category: 'shopping',
        pointValueINR: 1,
      });
      assert.equal(program.slug, 'flipkart_supercoins');
    });

    test('resolving a sibling sender does not grow the catalogue', async () => {
      const before = await catalogueCount();
      await EmailSyncRepo.findOrCreateProgramForStatement('myntra.com', {
        brandName: 'Myntra',
        programName: 'SuperCoins',
        programId: 'myntra_alias',
        category: 'shopping',
        pointValueINR: 1,
      });
      assert.equal(await catalogueCount(), before, 'no duplicate program should be inserted');
    });
  });


  describe('generic names must not hijack a real program (regression)', () => {
    // The AI extractor returns short generic names. A bare LIKE on these matched
    // arbitrary catalogue rows and overwrote real account balances.
    const hijackProbes = [
      { domain: 'somebank.co.in', programName: 'Rewards' },
      { domain: 'newsletter.example', programName: 'Points' },
      { domain: 'randomshop.com', programName: 'Cash' },
      { domain: 'unknown-air.example', programName: 'Miles' },
    ];

    for (const probe of hijackProbes) {
      test(`${probe.programName} from ${probe.domain} cannot borrow an existing program`, async () => {
        const slug = `probe_${probe.programName.toLowerCase()}_${probe.domain.replace(/\W/g, '_')}`;
        const program = await EmailSyncRepo.findOrCreateProgramForStatement(probe.domain, {
          brandName: 'Unbranded Sender',
          programName: probe.programName,
          programId: slug,
          category: 'other',
          pointValueINR: 0.25,
        });
        assert.ok(program, 'expected the unknown sender to be registered');
        // It must be its own row, never one of the pre-existing programs.
        for (const existing of ['indigo_6e', 'hdfc_mycards', 'zomato_gold', 'intermills']) {
          assert.notEqual(program.slug, existing, `must not resolve to ${existing}`);
        }
        assert.equal(program.slug, slug);
      });
    }

    test('a sender with no domain registers its own program', async () => {
      const program = await EmailSyncRepo.findOrCreateProgramForStatement('', {
        brandName: 'Gold Standard',
        programName: 'Gold',
        programId: 'probe_no_domain_gold',
        category: 'other',
        pointValueINR: 0.25,
      });
      assert.equal(program.slug, 'probe_no_domain_gold');
    });
  });

  describe('trusted domains may still use the fuzzy name match', () => {
    test('flipkart.com + "Coins" resolves to Flipkart SuperCoins', async () => {
      const program = await EmailSyncRepo.findOrCreateProgramForStatement('flipkart.com', {
        brandName: 'Flipkart',
        programName: 'Coins',
        programId: 'flipkart',
        category: 'shopping',
        pointValueINR: 1,
      });
      assert.equal(program.slug, 'flipkart_supercoins');
    });

    test('axisbank.com + "Rewards" resolves to Axis EDGE REWARDS', async () => {
      const program = await EmailSyncRepo.findOrCreateProgramForStatement('axisbank.com', {
        brandName: 'Axis',
        programName: 'Rewards',
        programId: 'axis_generic',
        category: 'banking',
        pointValueINR: 0.2,
      });
      assert.equal(program.slug, 'axis_edge');
    });
  });

  describe('dynamic registration', () => {
    test('an unknown brand is registered and then reused', async () => {
      const detected = {
        brandName: 'Zephyr Rewards',
        programName: 'Zephyr Points',
        programId: 'zephyr_rewards',
        category: 'other',
        pointValueINR: 0.5,
      };
      const first = await EmailSyncRepo.findOrCreateProgramForStatement('zephyr.example', detected);
      const second = await EmailSyncRepo.findOrCreateProgramForStatement('zephyr.example', detected);
      assert.equal(first.slug, 'zephyr_rewards');
      assert.equal(second.id, first.id, 'the same program must be reused, not duplicated');
    });

    test('a newly registered program uses the default point value', async () => {
      // Guards the earlier fix where an LLM-estimated point_value_inr was
      // persisted and then drove the portfolio value shown in the app.
      const program = await EmailSyncRepo.findOrCreateProgramForStatement('default-value.example', {
        brandName: 'Default Value Co',
        programName: 'Default Value Points',
        programId: 'default_value_co',
        category: 'other',
        pointValueINR: 99.5,
      });
      assert.equal(Number(program.point_value_inr), 0.25);
    });
  });

  describe('linked account persistence', () => {
    test('a statement creates a linked account and a credit transaction', async () => {
      const program = await EmailSyncRepo.findOrCreateProgramForStatement('persist.example', {
        brandName: 'Persist Rewards',
        programName: 'Persist Points',
        programId: 'persist_rewards',
        category: 'other',
        pointValueINR: 0.25,
      });

      const account = await EmailSyncRepo.insertStatementAccount({
        userId,
        programId: program.id,
        detected: { accountNumber: 'TEST-123', balance: 4321, expiringPoints: 100 },
        provider: 'gmail',
      });
      assert.equal(account.current_balance, 4321);
      assert.equal(account.sync_method, 'email_parser');
      assert.equal(account.sync_source, 'gmail');

      await EmailSyncRepo.insertStatementTransaction({
        accountId: account.id,
        points: 4321,
        description: 'Statement from test',
      });

      const { rows: txs } = await query(
        'SELECT points, type FROM points_transactions WHERE account_id = $1',
        [account.id]
      );
      assert.equal(txs.length, 1);
      assert.equal(txs[0].points, 4321);
    });

    test('a later statement updates the balance instead of duplicating the account', async () => {
      const program = await EmailSyncRepo.findOrCreateProgramForStatement('update.example', {
        brandName: 'Update Rewards',
        programName: 'Update Points',
        programId: 'update_rewards',
        category: 'other',
        pointValueINR: 0.25,
      });

      await EmailSyncRepo.insertStatementAccount({
        userId,
        programId: program.id,
        detected: { accountNumber: 'UPD-1', balance: 100, expiringPoints: 0 },
        provider: 'gmail',
      });
      await EmailSyncRepo.updateStatementBalance({
        programId: program.id,
        userId,
        detected: { balance: 250, expiringPoints: 10 },
      });

      const { rows } = await query(
        `SELECT current_balance, expiring_points FROM linked_accounts
         WHERE user_id = $1 AND program_id = $2`,
        [userId, program.id]
      );
      assert.equal(rows.length, 1, 'the account must be updated, not re-created');
      assert.equal(rows[0].current_balance, 250);
      assert.equal(rows[0].expiring_points, 10);
    });

    test('email_statements carries an extraction_source column', async () => {
      const { rows } = await query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name = 'email_statements' AND column_name = 'extraction_source'`
      );
      assert.equal(rows.length, 1, 'extraction_source should exist for auditability');
    });
  });

  describe('multi-mailbox support (regression)', () => {
    const enc = { ciphertext: 'c', iv: 'i', tag: 't' };
    const tokens = { expiry_date: Date.now() + 3_600_000 };

    test('a user can connect more than one mailbox', async () => {
      const a = await EmailSyncRepo.upsertGmailOAuth({
        userId, email: 'first@example.test', tokens, accessEnc: enc, refreshEnc: enc,
      });
      const b = await EmailSyncRepo.upsertGmailOAuth({
        userId, email: 'second@example.test', tokens, accessEnc: enc, refreshEnc: enc,
      });
      assert.notEqual(a.id, b.id);
      assert.equal((await EmailSyncRepo.findAllConnected(userId, 'gmail')).length, 2);
    });

    test('re-authorising the same address updates instead of duplicating', async () => {
      const before = (await EmailSyncRepo.findAllConnected(userId, 'gmail')).length;
      await EmailSyncRepo.upsertGmailOAuth({
        userId, email: 'first@example.test', tokens, accessEnc: enc, refreshEnc: enc,
      });
      assert.equal(
        (await EmailSyncRepo.findAllConnected(userId, 'gmail')).length,
        before,
        'reconnecting must not create a second row'
      );
    });

    test('disconnect removes only the targeted mailbox', async () => {
      const accounts = await EmailSyncRepo.findAllConnected(userId, 'gmail');
      const target = accounts.find((a) => a.email_address === 'second@example.test');
      await EmailSyncRepo.disconnect(userId, target.id);

      const remaining = await EmailSyncRepo.findAllConnected(userId, 'gmail');
      assert.equal(remaining.length, 1);
      assert.equal(remaining[0].email_address, 'first@example.test');
    });

    test('disconnect without an accountId refuses rather than deleting everything', async () => {
      // The pre-multi-mailbox signature deleted by provider, which would now
      // wipe every connected mailbox.
      await assert.rejects(() => EmailSyncRepo.disconnect(userId, null), /accountId is required/);
      assert.equal((await EmailSyncRepo.findAllConnected(userId, 'gmail')).length, 1);
    });

    test("another user cannot disconnect someone else's mailbox", async () => {
      const mine = (await EmailSyncRepo.findAllConnected(userId, 'gmail'))[0];
      const { rows: other } = await query(
        `INSERT INTO users (email, password_hash, full_name)
         VALUES ('intruder@example.test', 'x', 'Intruder') RETURNING id`
      );
      const removed = await EmailSyncRepo.disconnect(other[0].id, mine.id);
      assert.equal(removed.rowCount, 0, 'ownership must be enforced');
      assert.equal((await EmailSyncRepo.findAllConnected(userId, 'gmail')).length, 1);
    });

    test('each scan job is bound to one mailbox', async () => {
      const accounts = await EmailSyncRepo.findAllConnected(userId, 'gmail');
      const job = await EmailSyncRepo.createJob(userId, 'gmail', accounts[0].id);
      assert.equal(job.email_sync_account_id, accounts[0].id);
    });
  });

  describe('catalogue hygiene', () => {
    test('the seed catalogue loaded from migrations', () => {
      assert.ok(
        baseCatalogueSize >= 20,
        `expected the seeded catalogue, got ${baseCatalogueSize}`
      );
    });
  });
});
