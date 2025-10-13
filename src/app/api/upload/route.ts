import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  [key: string]: unknown;
}

interface CloudinaryError {
  message: string;
  [key: string]: unknown;
}

interface CloudinaryModule {
  v2: {
    uploader: {
      upload_stream: (
        options?: Record<string, unknown>,
        callback?: (err?: CloudinaryError | null, result?: CloudinaryUploadResult | null) => void
      ) => { end: (buffer: Buffer) => void };
    };
    config: (config: { cloud_name: string; api_key: string; api_secret: string }) => void;
  };
}

// Optional: Use environment variable for flexibility
let USE_CLOUDINARY = process.env.USE_CLOUDINARY === 'true' || process.env.NODE_ENV === 'production';

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png', 
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf'
];
const MAX_SIZE = 10 * 1024 * 1024; // 5MB

const getCloudinaryResourceType = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'raw';
  return 'auto';
};

export async function POST(request: NextRequest) {

  let cloudinary: CloudinaryModule['v2'] | null = null;
  
  if (USE_CLOUDINARY && (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET)) {
    console.warn('Cloudinary environment variables missing, falling back to local storage');
    USE_CLOUDINARY = false;
  }else{
    try {
      const cloudinaryModule = await import('cloudinary');
      cloudinary = cloudinaryModule.v2;
      if(cloudinary){
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
            api_key: process.env.CLOUDINARY_API_KEY!,
            api_secret: process.env.CLOUDINARY_API_SECRET!,
        });
      }
    } catch (error) {
      console.error('Failed to configure Cloudinary:', error);
      USE_CLOUDINARY = false;
    }
  }

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
      const fileExtension = file.name.split('.').pop() || 'bin';
      const fileName = `${randomUUID()}.${fileExtension}`;
      
      let fileUrl: string;
      
      if (USE_CLOUDINARY && cloudinary) {
        // Upload to Cloudinary for production
        try {
          const result = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
              {
                folder: 'tripmate-uploads',
                use_filename: false,    
                unique_filename: true,
                overwrite: false,
                resource_type: getCloudinaryResourceType(file.type)   
              },
              (err: CloudinaryError | null | undefined, result: CloudinaryUploadResult | null | undefined) => {
                if (err) reject(err);
                else resolve(result);
              }
            ).end(buffer);
          });
          
          fileUrl = (result as CloudinaryUploadResult).secure_url;
          console.log(`Uploaded ${file.name} to Cloudinary: ${fileUrl}`);
          
        } catch (error) {
          console.error(`Cloudinary upload failed for ${file.name}:`, error);
          const base64Data = buffer.toString('base64');
          fileUrl = `data:${file.type};base64,${base64Data}`;
        }
      } else {
        // Local file system for development
        try {
          const uploadsDir = join(process.cwd(), 'public/uploads');
          await mkdir(uploadsDir, { recursive: true });
          
          const filePath = join(uploadsDir, fileName);
          await writeFile(filePath, buffer);
          
          fileUrl = `/uploads/${fileName}`;
          
        } catch (error) {
          console.error(`Local file write failed for ${file.name}:`, error);
          // Fallback to data URL
          const base64Data = buffer.toString('base64');
          fileUrl = `data:${file.type};base64,${base64Data}`;
        }
      }
      
      return {
        url: fileUrl,
        name: file.name,
        type: file.type,
        size: file.size,
        uploaded_via: USE_CLOUDINARY ? 'cloudinary' : 'local' //this is for debugging
      };
    });

    const uploadedFiles = await Promise.all(uploadPromises);
    
    return NextResponse.json({ 
      success: true,
      files: uploadedFiles,
      upload_method: USE_CLOUDINARY ? 'cloudinary' : 'local'
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}