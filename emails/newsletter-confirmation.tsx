import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface NewsletterConfirmationEmailProps {
  email: string;
}

export const NewsletterConfirmationEmail = ({
  email,
}: NewsletterConfirmationEmailProps) => {
  const previewText = `Welcome to System Design Sandbox Newsletter!`;

  return (
    <Html>
      <Head>
        <style>{`
          * {
            box-sizing: border-box;
          }
          @media only screen and (max-width: 600px) {
            .container {
              width: 100% !important;
              padding: 10px 0 30px !important;
            }
            .heading {
              font-size: 20px !important;
              padding: 0 15px !important;
            }
            .text, .list-item {
              font-size: 15px !important;
              padding: 0 15px !important;
            }
            .button {
              display: block !important;
              width: auto !important;
              max-width: 90% !important;
              margin: 0 auto !important;
              padding: 12px 20px !important;
              box-sizing: border-box !important;
            }
            .list-container {
              margin: 15px 15px !important;
            }
          }
        `}</style>
      </Head>
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container} className="container">
          <Section style={logoContainer}>
            <Heading style={h1}>System Design Sandbox</Heading>
          </Section>

          <Heading style={h2} className="heading">Welcome to the Newsletter! 🎉</Heading>

          <Text style={text} className="text">
            Thank you for subscribing to System Design Sandbox updates!
          </Text>

          <Text style={text} className="text">
            You&rsquo;ll now receive emails about:
          </Text>

          <Section style={listContainer} className="list-container">
            <Text style={listItem} className="list-item">✅ New system design scenarios and challenges</Text>
            <Text style={listItem} className="list-item">✅ Feature announcements and product updates</Text>
            <Text style={listItem} className="list-item">✅ System design tips and best practices</Text>
            <Text style={listItem} className="list-item">✅ Community highlights and success stories</Text>
          </Section>

          <Text style={text} className="text">
            We respect your inbox and will only send valuable content - no spam, ever.
          </Text>

          <Section style={buttonContainer}>
            <Link style={button} className="button" href="https://www.systemdesignsandbox.com/play">
              Start Designing
            </Link>
          </Section>

          <Text style={footer} className="text">
            Best regards,<br />
            The System Design Sandbox Team
          </Text>

          <Section style={unsubscribeContainer}>
            <Text style={unsubscribeText}>
              You&rsquo;re receiving this email because you subscribed at{" "}
              <Link style={link} href="https://www.systemdesignsandbox.com/">
                systemdesignsandbox.com
              </Link>{" "}
              with the email address: {email}
            </Text>
            <Text style={unsubscribeText}>
              Want to unsubscribe? Reply to this email and let us know.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default NewsletterConfirmationEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const logoContainer = {
  marginTop: '32px',
  textAlign: 'center' as const,
};

const h1 = {
  color: '#10b981',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
  padding: '0',
  textAlign: 'center' as const,
};

const h2 = {
  color: '#1a1a1a',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '30px 0 15px',
  padding: '0 20px',
  textAlign: 'center' as const,
};

const text = {
  color: '#525252',
  fontSize: '16px',
  lineHeight: '24px',
  textAlign: 'left' as const,
  padding: '0 20px',
};

const listContainer = {
  margin: '20px 20px',
};

const listItem = {
  color: '#525252',
  fontSize: '16px',
  lineHeight: '28px',
  margin: '0',
  padding: '4px 0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#10b981',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
};

const footer = {
  color: '#71717a',
  fontSize: '14px',
  lineHeight: '24px',
  textAlign: 'left' as const,
  padding: '0 20px',
  marginTop: '32px',
};

const unsubscribeContainer = {
  borderTop: '1px solid #e4e4e7',
  marginTop: '32px',
  paddingTop: '20px',
};

const unsubscribeText = {
  color: '#a1a1aa',
  fontSize: '12px',
  lineHeight: '18px',
  textAlign: 'center' as const,
  padding: '0 20px',
  margin: '8px 0',
};

const link = {
  color: '#10b981',
  textDecoration: 'underline',
};
