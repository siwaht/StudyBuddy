import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  
  if (!supabase) {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
  }
  
  return supabase;
}

const BUCKET_NAME = 'call-recordings';
const SIGNED_URL_EXPIRY = 3600; // 1 hour in seconds

export interface AudioUploadResult {
  success: boolean;
  storageKey?: string;
  publicUrl?: string;
  error?: string;
}

export class AudioStorageService {
  private bucketInitialized = false;

  /**
   * Ensure the storage bucket exists and is properly configured
   */
  async ensureBucket(): Promise<void> {
    if (this.bucketInitialized) {
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      console.warn('Supabase not configured - skipping bucket initialization');
      return;
    }

    try {
      // Check if bucket exists
      const { data: buckets, error: listError } = await client.storage.listBuckets();

      if (listError) {
        console.error('Error listing buckets:', listError);
        return;
      }

      const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);

      if (!bucketExists) {
        // Create the bucket
        const { error: createError } = await client.storage.createBucket(BUCKET_NAME, {
          public: false, // Private bucket - use signed URLs for access
          fileSizeLimit: 104857600, // 100MB limit
          allowedMimeTypes: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg']
        });

        if (createError) {
          console.error('Error creating bucket:', createError);
          return;
        }

        console.log(`Created storage bucket: ${BUCKET_NAME}`);
      }

      this.bucketInitialized = true;
    } catch (error) {
      console.error('Error ensuring bucket exists:', error);
    }
  }

  /**
   * Upload audio buffer to Supabase Storage
   */
  async uploadAudio(
    conversationId: string,
    audioBuffer: Buffer,
    metadata?: Record<string, string>
  ): Promise<AudioUploadResult> {
    const client = getSupabaseClient();
    if (!client) {
      return {
        success: false,
        error: 'Supabase storage not configured'
      };
    }

    try {
      await this.ensureBucket();

      const timestamp = Date.now();
      const fileName = `${conversationId}_${timestamp}.mp3`;
      const storageKey = `recordings/${fileName}`;

      // Upload the file
      const { data, error } = await client.storage
        .from(BUCKET_NAME)
        .upload(storageKey, audioBuffer, {
          contentType: 'audio/mpeg',
          upsert: true,
          metadata: {
            conversation_id: conversationId,
            uploaded_at: new Date().toISOString(),
            ...metadata
          }
        });

      if (error) {
        console.error('Error uploading audio:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log(`Uploaded audio for conversation ${conversationId} to ${storageKey}`);

      return {
        success: true,
        storageKey: data.path,
        publicUrl: this.getPublicUrl(data.path)
      };
    } catch (error: any) {
      console.error('Error in uploadAudio:', error);
      return {
        success: false,
        error: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Upload base64-encoded audio (from webhooks) to storage
   */
  async uploadBase64Audio(
    conversationId: string,
    base64Audio: string,
    metadata?: Record<string, string>
  ): Promise<AudioUploadResult> {
    try {
      // Decode base64 to buffer
      const audioBuffer = Buffer.from(base64Audio, 'base64');
      return await this.uploadAudio(conversationId, audioBuffer, metadata);
    } catch (error: any) {
      console.error('Error decoding base64 audio:', error);
      return {
        success: false,
        error: 'Failed to decode base64 audio'
      };
    }
  }

  /**
   * Get a signed URL for accessing a private audio file
   */
  async getSignedUrl(storageKey: string, expiresIn: number = SIGNED_URL_EXPIRY): Promise<string | null> {
    const client = getSupabaseClient();
    if (!client) {
      return null;
    }

    try {
      const { data, error } = await client.storage
        .from(BUCKET_NAME)
        .createSignedUrl(storageKey, expiresIn);

      if (error) {
        console.error('Error creating signed URL:', error);
        return null;
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Error in getSignedUrl:', error);
      return null;
    }
  }

  /**
   * Get public URL for a storage file (use signed URLs instead for private buckets)
   */
  getPublicUrl(storageKey: string): string {
    const client = getSupabaseClient();
    if (!client) {
      return '';
    }

    const { data } = client.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storageKey);

    return data.publicUrl;
  }

  /**
   * Check if an audio file exists in storage
   */
  async audioExists(storageKey: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) {
      return false;
    }

    try {
      const { data, error } = await client.storage
        .from(BUCKET_NAME)
        .list(storageKey.split('/').slice(0, -1).join('/'), {
          search: storageKey.split('/').pop()
        });

      if (error) {
        return false;
      }

      return (data?.length ?? 0) > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Delete an audio file from storage
   */
  async deleteAudio(storageKey: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) {
      return false;
    }

    try {
      const { error } = await client.storage
        .from(BUCKET_NAME)
        .remove([storageKey]);

      if (error) {
        console.error('Error deleting audio:', error);
        return false;
      }

      console.log(`Deleted audio file: ${storageKey}`);
      return true;
    } catch (error) {
      console.error('Error in deleteAudio:', error);
      return false;
    }
  }

  /**
   * Download audio file from storage
   */
  async downloadAudio(storageKey: string): Promise<Buffer | null> {
    const client = getSupabaseClient();
    if (!client) {
      return null;
    }

    try {
      const { data, error } = await client.storage
        .from(BUCKET_NAME)
        .download(storageKey);

      if (error) {
        console.error('Error downloading audio:', error);
        return null;
      }

      return Buffer.from(await data.arrayBuffer());
    } catch (error) {
      console.error('Error in downloadAudio:', error);
      return null;
    }
  }

  /**
   * Get metadata for a stored audio file
   */
  async getAudioMetadata(storageKey: string): Promise<Record<string, any> | null> {
    const client = getSupabaseClient();
    if (!client) {
      return null;
    }

    try {
      const { data, error } = await client.storage
        .from(BUCKET_NAME)
        .list(storageKey.split('/').slice(0, -1).join('/'), {
          search: storageKey.split('/').pop()
        });

      if (error || !data || data.length === 0) {
        return null;
      }

      return data[0].metadata || null;
    } catch (error) {
      console.error('Error getting audio metadata:', error);
      return null;
    }
  }
}

export const audioStorage = new AudioStorageService();
