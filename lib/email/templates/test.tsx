import { Heading, Text } from '@react-email/components';
import { EmailButton, EmailLayout } from '../layout';

export interface TestEmailProps {
  /** ISO time the email was sent, shown in the body. */
  sentAt: string;
}

export default function TestEmail({ sentAt }: TestEmailProps) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return (
    <EmailLayout preview="Your CineMatch email setup works.">
      <Heading as="h1" style={{ fontSize: '20px', margin: '0 0 12px' }}>
        Email is working
      </Heading>
      <Text style={{ fontSize: '15px', lineHeight: '24px', margin: '0 0 8px' }}>
        This is a test message from CineMatch. If you can read it, the SMTP sender is set up correctly.
      </Text>
      <Text style={{ fontSize: '13px', color: '#71717a', margin: '0 0 24px' }}>Sent at {sentAt}</Text>
      <EmailButton href={appUrl}>Open CineMatch</EmailButton>
    </EmailLayout>
  );
}

TestEmail.PreviewProps = {
  sentAt: '2026-11-16T12:00:00.000Z',
} satisfies TestEmailProps;
