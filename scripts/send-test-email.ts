/**
 * Sends the `test` template to one address through the real sender.
 * Usage: npx tsx scripts/send-test-email.ts you@example.com
 */
import { sendEmail } from '../lib/email/send';

async function main() {
  try {
    process.loadEnvFile('.env.local');
  } catch {
    console.warn('Could not load .env.local, using the current environment.');
  }

  const to = process.argv[2];
  if (!to) {
    console.error('Usage: npx tsx scripts/send-test-email.ts <address>');
    process.exitCode = 1;
    return;
  }

  const result = await sendEmail({ to, template: 'test', props: { sentAt: new Date().toISOString() } });

  if (result.ok) {
    console.log(`Sent. messageId=${result.messageId}`);
  } else {
    console.error(`Failed: ${result.error}`);
    process.exitCode = 1;
  }
}

main();
