import type { ReactNode } from 'react';
import { Body, Button, Container, Head, Html, Preview, Section, Text } from '@react-email/components';

// Inlined on purpose: email clients ignore CSS variables. Matches --primary in app/globals.css.
const BRAND = '#6366F1';

export function EmailLayout({ preview, children }: { preview: string; children: ReactNode }) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: '#f4f4f5',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          margin: 0,
          padding: '32px 0',
        }}
      >
        <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '0 16px' }}>
          <Text style={{ fontSize: '22px', fontWeight: 700, color: BRAND, margin: '0 0 16px' }}>
            CineMatch
          </Text>
          <Section
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '32px',
              color: '#18181b',
            }}
          >
            {children}
          </Section>
          <Text style={{ fontSize: '12px', color: '#71717a', textAlign: 'center', margin: '24px 0 0' }}>
            You got this email because you have a CineMatch account.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function EmailButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button
      href={href}
      style={{
        backgroundColor: BRAND,
        color: '#ffffff',
        borderRadius: '8px',
        padding: '12px 20px',
        fontSize: '15px',
        fontWeight: 600,
        textDecoration: 'none',
        display: 'inline-block',
      }}
    >
      {children}
    </Button>
  );
}
