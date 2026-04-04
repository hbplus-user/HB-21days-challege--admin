import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GDRIVE_CLIENT_ID,
        process.env.GDRIVE_CLIENT_SECRET,
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/auth/callback/google`
    );

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline', // Required for getting a Refresh Token
        scope: [
            'https://www.googleapis.com/auth/drive.file' // Scoped only to files the app creates
        ],
        prompt: 'consent' // Forces consent screen to show to ensure Refresh Token is returned
    });

    return NextResponse.redirect(authUrl);
}
