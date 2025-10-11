import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('file') as File[];
  
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    for (const file of files) {
      if (file.size > MAX_SIZE) {
          return NextResponse.json({ error: 'File too large' }, { status: 400 });
      }
      
      if (!ALLOWED_TYPES.includes(file.type)) {
          return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
      }
    }

    // Process all files in parallel
    const uploadPromises = files.map(async (file) => {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Generate unique filename
      const fileExtension = file.name.split('.').pop();
      const fileName = `${randomUUID()}.${fileExtension}`;
      
      // Create uploads directory (if not exists)
      const uploadsDir = join(process.cwd(), 'public/uploads');
      await mkdir(uploadsDir, { recursive: true });
      
      // Save file
      const filePath = join(uploadsDir, fileName);
      await writeFile(filePath, buffer);
      
      // Return file info
      return {
        url: `/uploads/${fileName}`,
        name: file.name,
        type: file.type,
        size: file.size
      };
    });

    // ✅ Wait for all files to upload
    const uploadedFiles = await Promise.all(uploadPromises);
    
    return NextResponse.json({ 
      success: true,
      files: uploadedFiles
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}