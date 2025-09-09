const { createClient } = require('@supabase/supabase-js');
const { SUPABASE_URL, SUPABASE_KEY } = require('./connect');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Upload image to bucket
async function uploadImage(file, fileName, bucketName = 'post-images') {
    try {
        console.log('Uploading image:', { fileName, bucketName });
        
        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error('Error uploading image:', error);
            return { error };
        }

        console.log('Image uploaded successfully:', data);
        return { data };
    } catch (error) {
        console.error('Error in uploadImage:', error);
        return { error };
    }
}

// Get public URL for image
async function getImageUrl(fileName, bucketName = 'posts_images') {
    try {
        console.log('Getting image URL:', { fileName, bucketName });
        
        // Try to get signed URL first (more reliable)
        const { data: signedData, error: signedError } = await supabase.storage
            .from(bucketName)
            .createSignedUrl(fileName, 3600); // 1 hour expiry

        if (signedError) {
            console.log('Signed URL failed, trying public URL:', signedError);
            // Fallback to public URL
            const { data } = supabase.storage
                .from(bucketName)
                .getPublicUrl(fileName);
            
            console.log('Public URL generated:', data.publicUrl);
            return { url: data.publicUrl };
        }

        console.log('Signed URL generated:', signedData.signedUrl);
        return { url: signedData.signedUrl };
    } catch (error) {
        console.error('Error in getImageUrl:', error);
        return { error };
    }
}

// Delete image from bucket
async function deleteImage(fileName, bucketName = 'post-images') {
    try {
        console.log('Deleting image:', { fileName, bucketName });
        
        const { error } = await supabase.storage
            .from(bucketName)
            .remove([fileName]);

        if (error) {
            console.error('Error deleting image:', error);
            return { error };
        }

        console.log('Image deleted successfully');
        return { success: true };
    } catch (error) {
        console.error('Error in deleteImage:', error);
        return { error };
    }
}

// List images in bucket
async function listImages(bucketName = 'post-images', folder = '', limit = 100, offset = 0) {
    try {
        console.log('Listing images:', { bucketName, folder, limit, offset });
        
        const { data, error } = await supabase.storage
            .from(bucketName)
            .list(folder, {
                limit: limit,
                offset: offset,
                sortBy: { column: 'name', order: 'asc' }
            });

        if (error) {
            console.error('Error listing images:', error);
            return { error };
        }

        console.log(`Listed ${data.length} images`);
        return { data };
    } catch (error) {
        console.error('Error in listImages:', error);
        return { error };
    }
}

// Upload image with unique filename
async function uploadImageWithUniqueName(file, userId, bucketName = 'post-images') {
    try {
        // Generate unique filename
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const fileExtension = file.name.split('.').pop();
        const fileName = `${userId}_${timestamp}_${randomString}.${fileExtension}`;
        
        console.log('Uploading image with unique name:', { fileName, userId });
        
        return await uploadImage(file, fileName, bucketName);
    } catch (error) {
        console.error('Error in uploadImageWithUniqueName:', error);
        return { error };
    }
}

// Get signed URL for private image (if needed)
async function getSignedUrl(fileName, bucketName = 'post-images', expiresIn = 3600) {
    try {
        console.log('Getting signed URL:', { fileName, bucketName, expiresIn });
        
        const { data, error } = await supabase.storage
            .from(bucketName)
            .createSignedUrl(fileName, expiresIn);

        if (error) {
            console.error('Error creating signed URL:', error);
            return { error };
        }

        console.log('Signed URL created:', data.signedUrl);
        return { url: data.signedUrl };
    } catch (error) {
        console.error('Error in getSignedUrl:', error);
        return { error };
    }
}

module.exports = {
    uploadImage,
    getImageUrl,
    deleteImage,
    listImages,
    uploadImageWithUniqueName,
    getSignedUrl
};
