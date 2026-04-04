import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
        return NextResponse.json({ error: 'No code provided' }, { status: 400 });
    }

    const oauth2Client = new google.auth.OAuth2(
        process.env.GDRIVE_CLIENT_ID,
        process.env.GDRIVE_CLIENT_SECRET,
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/auth/callback/google`
    );

    try {
        const { tokens } = await oauth2Client.getToken(code);
        
        // We display the Refresh Token to the user once so they can save it
        return new NextResponse(`
            <html>
                <body style="font-family: sans-serif; padding: 40px; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #fcfaf5;">
                    <div style="background: white; padding: 40px; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); text-align: center; max-width: 600px;">
                        <h1 style="color: #9f4022;">Connection Successful!</h1>
                        <p style="color: #53372b; margin-bottom: 24px;">Please COPY this Refresh Token and paste it into your <b>.env.local</b> file as <b>GDRIVE_REFRESH_TOKEN</b>:</p>
                        <div style="background: #f0f0f0; padding: 20px; border-radius: 12px; font-family: monospace; word-break: break-all; margin-bottom: 24px; border: 1px solid #ddd;">
                            ${tokens.refresh_token || 'Token received (Check if already saved)'}
                        </div>
                        <p style="font-size: 11px; color: #999;">Close this window once you've saved the token.</p>
                        <button onclick="window.close()" style="margin-top: 20px; padding: 12px 24px; background: #9f4022; color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: bold;">CLOSE WINDOW</button>
                    </div>
                </body>
            </html>
        `, {
            headers: { 'Content-Type': 'text/html' },
        });
    } catch (error: any) {
        console.error('Error getting tokens:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
