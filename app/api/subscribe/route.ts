import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { sendNewsletterConfirmation } from '@/lib/email'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {

    const { email } = await request.json()

    // Validate email
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const { data: existing } = await supabase
      .from('email_subscriptions')
      .select('id')
      .eq('email', email)
      .eq('type', 'newsletter')
      .single()

    if (existing) {
      return NextResponse.json(
        { message: 'Already subscribed!' },
        { status: 200 }
      )
    }

    // Insert new subscription
    const { error } = await supabase
      .from('email_subscriptions')
      .insert({
        email,
        type: 'newsletter'
      })

    if (error) {
      // Handle specific error cases
      if (error.code === '23505' && error.message.includes('email_subscriptions_email_type_key')) {
        return NextResponse.json(
          { message: 'Already subscribed!' },
          { status: 200 }
        )
      }

      // Log only unhandled errors
      logger.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to subscribe. Please try again.' },
        { status: 500 }
      )
    }

    // Send newsletter confirmation email
    // Note: This runs asynchronously and won't block the response
    // If email fails, the subscription is still saved successfully
    sendNewsletterConfirmation({
      to: email,
    }).catch(error => {
      logger.error('Failed to send newsletter confirmation email:', error);
    });

    return NextResponse.json(
      { message: 'Successfully subscribed!' },
      { status: 200 }
    )
  } catch (error) {
    logger.error('Subscription error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
