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

interface NewProblemEmailProps {
  problemTitle: string;
  problemDescription: string;
  problemDifficulty: "easy" | "medium" | "hard";
  problemSlug: string;
  timeToComplete: string;
  recipientEmail: string;
  unsubscribeUrl: string;
}

const difficultyColors = {
  easy: { bg: "#dcfce7", text: "#16a34a", label: "Easy" },
  medium: { bg: "#fef3c7", text: "#d97706", label: "Medium" },
  hard: { bg: "#fce7f3", text: "#db2777", label: "Hard" },
};

export const NewProblemEmail = ({
  problemTitle,
  problemDescription,
  problemDifficulty,
  problemSlug,
  timeToComplete,
  recipientEmail,
  unsubscribeUrl,
}: NewProblemEmailProps) => {
  const previewText = `New Challenge: ${problemTitle}`;
  const difficulty = difficultyColors[problemDifficulty];
  const practiceUrl = `https://www.systemdesignsandbox.com/practice/${problemSlug}`;

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
            .problem-box {
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
            <Heading style={h1}>System Design Sandbox</Heading>
          </Section>

          <Heading style={h2} className="heading">
            New Challenge Available
          </Heading>

          <Text style={text} className="text">
            A new system design challenge has just been added to System Design Sandbox. Put your
            skills to the test!
          </Text>

          <Section style={problemBox} className="problem-box">
            <Text style={problemTitle_style}>{problemTitle}</Text>
            <Section style={badgeRow}>
              <span
                style={{
                  ...badge,
                  backgroundColor: difficulty.bg,
                  color: difficulty.text,
                }}
              >
                {difficulty.label}
              </span>
              <span style={timeBadge}>{timeToComplete}</span>
            </Section>
            <Text style={problemDescription_style}>{problemDescription}</Text>
          </Section>

          <Section style={buttonContainer}>
            <Link style={button} className="button" href={practiceUrl}>
              Start Practicing
            </Link>
          </Section>

          <Text style={footer} className="text">
            Best regards,
            <br />
            The System Design Sandbox Team
          </Text>

          <Section style={unsubscribeContainer}>
            <Text style={unsubscribeText}>
              You&rsquo;re receiving this email because you have an account at{" "}
              <Link style={link} href="https://www.systemdesignsandbox.com/">
                systemdesignsandbox.com
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

export default NewProblemEmail;

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

const problemBox = {
  backgroundColor: "#f4f4f5",
  borderRadius: "8px",
  margin: "20px 20px",
  padding: "20px",
  border: "1px solid #e4e4e7",
  boxSizing: "border-box" as const,
  width: "calc(100% - 40px)" as const,
  maxWidth: "560px" as const,
};

const problemTitle_style = {
  color: "#1a1a1a",
  fontSize: "18px",
  fontWeight: "bold",
  margin: "0 0 12px 0",
};

const badgeRow = {
  marginBottom: "12px",
};

const badge = {
  display: "inline-block",
  fontSize: "12px",
  fontWeight: "bold",
  padding: "4px 10px",
  borderRadius: "9999px",
  marginRight: "8px",
};

const timeBadge = {
  display: "inline-block",
  fontSize: "12px",
  fontWeight: "bold",
  padding: "4px 10px",
  borderRadius: "9999px",
  backgroundColor: "#f0f0f0",
  color: "#525252",
};

const problemDescription_style = {
  color: "#525252",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "0",
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
