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

interface ProblemReminderEmailProps {
  problemTitle: string;
  problemSlug: string;
  problemDifficulty: "easy" | "medium" | "hard";
  recipientEmail: string;
  unsubscribeUrl: string;
}

const difficultyColors = {
  easy: { bg: "#dcfce7", text: "#16a34a", label: "Easy" },
  medium: { bg: "#fef3c7", text: "#d97706", label: "Medium" },
  hard: { bg: "#fce7f3", text: "#db2777", label: "Hard" },
};

export const ProblemReminderEmail = ({
  problemTitle,
  problemSlug,
  problemDifficulty,
  recipientEmail,
  unsubscribeUrl,
}: ProblemReminderEmailProps) => {
  const previewText = `Reminder: ${problemTitle} is waiting for you`;
  const difficulty = difficultyColors[problemDifficulty];
  const practiceUrl = `https://www.systemdesignlearner.com/practice/${problemSlug}`;

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
            .text {
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
            Quick Check-In
          </Heading>

          <Text style={text} className="text">
            The new challenge we mentioned earlier is still available in your account.
          </Text>

          <Text style={text} className="text">
            If you haven&rsquo;t had a chance to try <strong>{problemTitle}</strong>{" "}
            <span
              style={{
                ...inlineBadge,
                backgroundColor: difficulty.bg,
                color: difficulty.text,
              }}
            >
              {difficulty.label}
            </span>{" "}
            yet, no problem. When you&rsquo;re ready, it&rsquo;s there to help sharpen your system
            design skills.
          </Text>

          <Section style={buttonContainer}>
            <Link style={button} className="button" href={practiceUrl}>
              Give It a Try
            </Link>
          </Section>

          <Text style={text} className="text">
            And if now&rsquo;s not the moment, feel free to ignore this and come back to it later.
            We&rsquo;ll be right here.
          </Text>

          <Text style={footer} className="text">
            Cheers,
            <br />
            The System Design Learner Team
          </Text>

          <Section style={unsubscribeContainer}>
            <Text style={unsubscribeText}>
              You&rsquo;re receiving this email because you have an account at{" "}
              <Link style={link} href="https://www.systemdesignlearner.com/">
                systemdesignlearner.com
              </Link>{" "}
              with the email address: {recipientEmail}
            </Text>
            <Text style={unsubscribeText}>
              <Link style={link} href={unsubscribeUrl}>
                Unsubscribe
              </Link>{" "}
              from new problem notifications.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default ProblemReminderEmail;

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

const inlineBadge = {
  display: "inline-block",
  fontSize: "12px",
  fontWeight: "bold" as const,
  padding: "2px 8px",
  borderRadius: "9999px",
  verticalAlign: "middle",
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

const unsubscribeContainer = {
  borderTop: "1px solid #e4e4e7",
  marginTop: "32px",
  paddingTop: "20px",
};

const unsubscribeText = {
  color: "#a1a1aa",
  fontSize: "12px",
  lineHeight: "18px",
  textAlign: "center" as const,
  padding: "0 20px",
  margin: "8px 0",
};

const link = {
  color: "#10b981",
  textDecoration: "underline",
};
