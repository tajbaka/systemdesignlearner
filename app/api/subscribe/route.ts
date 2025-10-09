import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to subscribe. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'Successfully subscribed!' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Subscription error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
