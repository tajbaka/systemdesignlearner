import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email, name, feedback } = await request.json()

    // Validate required fields
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      )
    }

    if (!feedback || feedback.trim().length === 0) {
      return NextResponse.json(
        { error: 'Feedback is required' },
        { status: 400 }
      )
    }

    // Insert feedback submission
    const { error: feedbackError } = await supabase
      .from('feedback_submissions')
      .insert({
        email,
        name: name || null,
        feedback: feedback.trim()
      })

    if (feedbackError) {
      console.error('Supabase feedback error:', feedbackError)
      return NextResponse.json(
        { error: 'Failed to submit feedback. Please try again.' },
        { status: 500 }
      )
    }

    // Also add to email subscriptions if not already subscribed
    const { data: existing } = await supabase
      .from('email_subscriptions')
      .select('id')
      .eq('email', email)
      .eq('type', 'feedback')
      .single()

    if (!existing) {
      await supabase
        .from('email_subscriptions')
        .insert({
          email,
          name: name || null,
          type: 'feedback'
        })
    }

    return NextResponse.json(
      { message: 'Thank you for your feedback!' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Feedback submission error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
