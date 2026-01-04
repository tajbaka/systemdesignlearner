import { NextRequest, NextResponse } from "next/server";

// Hash function for Facebook Conversions API (SHA256)
async function hashSHA256(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, phone, name, event_name } = body;

    if (!event_name) {
      return NextResponse.json({ error: "Event name is required" }, { status: 400 });
    }

    // Use provided event_name or default to "Contact" for backwards compatibility
    const eventName = event_name;

    // Pixel ID is public and used on client-side, so NEXT_PUBLIC_ is fine
    const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
    const accessToken = process.env.FB_CONVERSIONS_API;

    if (!pixelId || !accessToken) {
      console.warn(
        "Facebook Pixel ID or Access Token not configured. Skipping Conversions API event."
      );
      // Return success to prevent form submission failures when Facebook isn't configured
      return NextResponse.json({
        success: true,
        skipped: true,
        message: "Facebook Conversions API not configured",
      });
    }

    // Build user_data object
    const userData: {
      em?: string[];
      ph?: string[];
      fn?: string[];
    } = {};

    // Hash email if provided
    if (email && email.trim()) {
      const hashedEmail = await hashSHA256(email);
      userData.em = [hashedEmail];
    }

    // Hash phone if provided
    if (phone && phone.trim()) {
      // Remove all non-digit characters for phone hashing
      const phoneDigits = phone.replace(/\D/g, "");
      if (phoneDigits.length > 0) {
        const hashedPhone = await hashSHA256(phoneDigits);
        userData.ph = [hashedPhone];
      }
    }

    // Hash name if provided
    if (name && name.trim()) {
      // Hash first name (Facebook requires hashed first name)
      const hashedFirstName = await hashSHA256(name.split(" ")[0]);
      userData.fn = [hashedFirstName];
    }

    // Build the event payload
    const eventPayload = {
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000), // Current timestamp in seconds
      action_source: "website",
      user_data: userData,
      attribution_data: {
        attribution_share: "0.3",
      },
    };

    // Create FormData for the POST request
    const formData = new FormData();
    formData.append("data", JSON.stringify([eventPayload]));
    formData.append("access_token", accessToken);

    // Send the request
    const response = await fetch(`https://graph.facebook.com/v24.0/${pixelId}/events`, {
      method: "POST",
      body: formData,
    });

    // Always parse the response body to check for Facebook errors/warnings
    const responseData = await response.json().catch(async () => {
      // If JSON parsing fails, try text
      const text = await response.text();
      return { error: text };
    });

    if (!response.ok) {
      console.error("Facebook Conversions API error:", responseData);
      return NextResponse.json(
        {
          error: "Failed to send event to Facebook",
          details: responseData,
        },
        { status: response.status }
      );
    }

    // Check for Facebook-specific errors in the response (even with 200 status)
    if (responseData.events_received === 0) {
      console.warn("Facebook Conversions API: Event was not received:", responseData);
      return NextResponse.json({
        success: false,
        warning: "Event was not received by Facebook",
        details: responseData,
      });
    }

    // Check for warning/error messages in the response
    if (responseData.messages && responseData.messages.length > 0) {
      interface FacebookMessage {
        severity?: string;
        message?: string;
        code?: number;
      }

      const hasErrors = responseData.messages.some(
        (msg: FacebookMessage) => msg.severity === "error"
      );

      if (hasErrors) {
        console.error("Facebook Conversions API: Event validation errors:", responseData.messages);
        return NextResponse.json({
          success: false,
          error: "Event validation failed",
          details: responseData.messages,
        });
      }

      // Log warnings but don't fail
      const warnings = responseData.messages.filter(
        (msg: FacebookMessage) => msg.severity === "warning"
      );
      if (warnings.length > 0) {
        console.warn("Facebook Conversions API: Warnings:", warnings);
      }
    }

    return NextResponse.json({
      success: true,
      facebookResponse: responseData,
    });
  } catch (error) {
    console.error("Failed to send Facebook Conversions API event:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
