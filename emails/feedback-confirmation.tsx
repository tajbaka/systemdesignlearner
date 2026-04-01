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
} from "@react-email/components";
import * as React from "react";

interface FeedbackConfirmationEmailProps {
  name?: string;
  feedback: string;
}

export const FeedbackConfirmationEmail = ({
  name = "there",
  feedback,
}: FeedbackConfirmationEmailProps) => {
  const previewText = `Thank you for your feedback!`;

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
            .feedback-box {
              margin: 15px 15px !important;
              padding: 15px !important;
              box-sizing: border-box !important;
              width: calc(100% - 30px) !important;
              max-width: 100% !important;
            }
          }
        `}</style>
      </Head>
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container} className="container">
          <Section style={logoContainer}>
            <Heading style={h1}>System Design Learner</Heading>
          </Section>

          <Heading style={h2} className="heading">
            Thank you for your feedback!
          </Heading>

          <Text style={text} className="text">
            Hi {name},
          </Text>

          <Text style={text} className="text">
            We&rsquo;ve received your feedback and we really appreciate you taking the time to share
            your thoughts with us.
          </Text>

          <Section style={feedbackBox} className="feedback-box">
            <Text style={feedbackLabel}>Your feedback:</Text>
            <Text style={feedbackText}>{feedback}</Text>
          </Section>

          <Text style={text} className="text">
            Our team reviews all feedback carefully and uses it to improve System Design Learner. If
            you&rsquo;ve opted in to be contacted, we may reach out to you for follow-up questions
            or clarification.
          </Text>

          <Section style={buttonContainer}>
            <Link style={button} className="button" href="https://www.systemdesignlearner.com/">
              Return to System Design Learner
            </Link>
          </Section>

          <Text style={footer} className="text">
            Best regards,
            <br />
            The System Design Learner Team
          </Text>

          <Text style={footerNote}>
            This email was sent because you submitted feedback on System Design Learner. If you have
            questions, feel free to reply to this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default FeedbackConfirmationEmail;

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
};

const logoContainer = {
  marginTop: "32px",
  textAlign: "center" as const,
};

const h1 = {
  color: "#10b981",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "0",
  padding: "0",
  textAlign: "center" as const,
};

const h2 = {
  color: "#1a1a1a",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "30px 0 15px",
  padding: "0 20px",
  textAlign: "center" as const,
};

const text = {
  color: "#525252",
  fontSize: "16px",
  lineHeight: "24px",
  textAlign: "left" as const,
  padding: "0 20px",
};

const feedbackBox = {
  backgroundColor: "#f4f4f5",
  borderRadius: "8px",
  margin: "20px 20px",
  padding: "20px",
  border: "1px solid #e4e4e7",
  boxSizing: "border-box" as const,
  width: "calc(100% - 40px)" as const,
  maxWidth: "560px" as const,
};

const feedbackLabel = {
  color: "#71717a",
  fontSize: "12px",
  fontWeight: "bold",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 8px 0",
};

const feedbackText = {
  color: "#27272a",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "0",
  whiteSpace: "pre-wrap" as const,
  wordBreak: "break-word" as const,
  overflowWrap: "break-word" as const,
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#10b981",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 32px",
};

const footer = {
  color: "#71717a",
  fontSize: "14px",
  lineHeight: "24px",
  textAlign: "left" as const,
  padding: "0 20px",
  marginTop: "32px",
};

const footerNote = {
  color: "#a1a1aa",
  fontSize: "12px",
  lineHeight: "18px",
  textAlign: "center" as const,
  padding: "0 20px",
  marginTop: "32px",
};
