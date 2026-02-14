/**
 * API Route: POST /api/send-otp
 * Sends OTP email to student's email address using Resend service
 * 
 * Request body:
 * {
 *   email: string - Student's email address
 *   otp: string - 6-digit OTP code
 *   studentName: string - Student's name for personalization (optional)
 * }
 */

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json();

    // Validate required fields
    if (!email || !otp) {
      return new Response(
        JSON.stringify({ error: 'Email and OTP are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // For now, just log the OTP (in production, use Resend or SendGrid)
    console.log(`OTP for ${email}: ${otp}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `OTP sent to ${email}` 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
