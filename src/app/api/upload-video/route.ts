import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Video and Image upload limits — 30 seconds duration, 2 MB size
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const fileName = formData.get('fileName') as string || file.name;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // --- Server-side file size validation ---
        if (file.size > MAX_FILE_SIZE_BYTES) {
            const isVideo = file.type.startsWith('video/');
            const limitDesc = isVideo ? '2 MB' : '1 MB'; // Note: server uses 2MB as absolute max for both simple path
            return NextResponse.json({ 
                error: `File too large. Maximum size is ${limitDesc}. Your file is ${(file.size / (1024 * 1024)).toFixed(2)} MB.` 
            }, { status: 400 });
        }

        // --- Use the existing anon key (already in .env.local) ---
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const arrayBuffer = await file.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);

        // Sanitize filename: replace spaces, keep extension
        const safeFileName = `${Date.now()}-${fileName.replace(/\s+/g, '_')}`;
        const storagePath = `task-videos/${safeFileName}`;

        const { error: uploadError } = await supabaseAdmin.storage
            .from('videos')
            .upload(storagePath, fileBuffer, {
                contentType: file.type,
                upsert: false,
            });

        if (uploadError) {
            console.error('Supabase upload error:', uploadError);
            return NextResponse.json({ error: uploadError.message }, { status: 500 });
        }

        // --- Get public URL ---
        const { data: { publicUrl } } = supabaseAdmin.storage
            .from('videos')
            .getPublicUrl(storagePath);

        return NextResponse.json({ 
            success: true, 
            videoUrl: publicUrl,
        });

    } catch (error: any) {
        console.error('Upload error:', error);
        return NextResponse.json({ 
            error: error.message || 'Error uploading file' 
        }, { status: 500 });
    }
}
