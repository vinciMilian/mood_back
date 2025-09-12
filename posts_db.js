const { createClient } = require('@supabase/supabase-js');
const { SUPABASE_URL, SUPABASE_KEY } = require('./connect');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Create a new post
async function createPost(userId, description, imageIdBucket = null) {
    try {
        console.log('Creating post:', { userId, description, imageIdBucket });
        
        const { data, error } = await supabase
            .from('posts')
            .insert({
                post_id_user: userId,
                description: description,
                image_id_bucket: imageIdBucket,
                likes: 0,
                comments: 0
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating post:', error);
            return { error };
        }

        console.log('Post created successfully:', data);
        return { data };
    } catch (error) {
        console.error('Error in createPost:', error);
        return { error };
    }
}

// Get posts with pagination
async function getPosts(limit = 10, offset = 0) {
    try {
        console.log('Fetching posts:', { limit, offset });
        
        // First get pinned posts
        const { data: pinnedPosts, error: pinnedError } = await supabase
            .from('posts')
            .select(`
                *,
                usersData!posts_post_id_user_fkey (
                    displayName,
                    user_id_reg,
                    user_image_bucket,
                    user_email
                )
            `)
            .eq('is_pinned', true)
            .order('created_at', { ascending: false });

        if (pinnedError) {
            console.error('Error fetching pinned posts:', pinnedError);
        }

        // Then get regular posts
        const { data: regularPosts, error: regularError } = await supabase
            .from('posts')
            .select(`
                *,
                usersData!posts_post_id_user_fkey (
                    displayName,
                    user_id_reg,
                    user_image_bucket,
                    user_email
                )
            `)
            .eq('is_pinned', false)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (regularError) {
            console.error('Error fetching regular posts:', regularError);
            return { error: regularError };
        }

        // Combine pinned posts first, then regular posts
        const allPosts = [...(pinnedPosts || []), ...(regularPosts || [])];
        
        console.log(`Fetched ${allPosts.length} posts (${pinnedPosts?.length || 0} pinned, ${regularPosts?.length || 0} regular)`);
        return { data: allPosts };
    } catch (error) {
        console.error('Error in getPosts:', error);
        return { error };
    }
}

// Get posts by user
async function getPostsByUser(userId, limit = 10, offset = 0) {
    try {
        console.log('Fetching posts by user:', { userId, limit, offset });
        
        const { data, error } = await supabase
            .from('posts')
            .select(`
                *,
                usersData!posts_post_id_user_fkey (
                    displayName,
                    user_id_reg,
                    user_image_bucket
                )
            `)
            .eq('post_id_user', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('Error fetching posts by user:', error);
            return { error };
        }

        console.log(`Fetched ${data.length} posts for user ${userId}`);
        return { data };
    } catch (error) {
        console.error('Error in getPostsByUser:', error);
        return { error };
    }
}

// Get single post by ID
async function getPostById(postId) {
    try {
        console.log('Fetching post by ID:', postId);
        
        const { data, error } = await supabase
            .from('posts')
            .select(`
                *,
                usersData!posts_post_id_user_fkey (
                    displayName,
                    user_id_reg,
                    user_image_bucket
                )
            `)
            .eq('id', postId)
            .single();

        if (error) {
            console.error('Error fetching post by ID:', error);
            return { error };
        }

        console.log('Post fetched successfully:', data);
        return { data };
    } catch (error) {
        console.error('Error in getPostById:', error);
        return { error };
    }
}

// Update post
async function updatePost(postId, updateData) {
    try {
        console.log('Updating post:', { postId, updateData });

        // Sanitize numeric values for likes and comments
        if (updateData.hasOwnProperty('likes')) {
            updateData.likes = Number(updateData.likes);
            if (isNaN(updateData.likes)) {
                updateData.likes = 0;
            }
        }
        if (updateData.hasOwnProperty('comments')) {
            updateData.comments = Number(updateData.comments);
            if (isNaN(updateData.comments)) {
                updateData.comments = 0;
            }
        }

        const { data, error } = await supabase
            .from('posts')
            .update(updateData)
            .eq('id', postId)
            .select()
            .single();

        if (error) {
            console.error('Error updating post:', error);
            return { error };
        }

        console.log('Post updated successfully:', data);
        return { data };
    } catch (error) {
        console.error('Error in updatePost:', error);
        return { error };
    }
}

// Delete post
async function deletePost(postId) {
    try {
        console.log('Deleting post:', postId);
        
        const { error } = await supabase
            .from('posts')
            .delete()
            .eq('id', postId);

        if (error) {
            console.error('Error deleting post:', error);
            return { error };
        }

        console.log('Post deleted successfully');
        return { success: true };
    } catch (error) {
        console.error('Error in deletePost:', error);
        return { error };
    }
}

// Get total posts count
async function getPostsCount() {
    try {
        console.log('Getting posts count');
        
        const { count, error } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.error('Error getting posts count:', error);
            return { error };
        }

        console.log(`Total posts: ${count}`);
        return { count };
    } catch (error) {
        console.error('Error in getPostsCount:', error);
        return { error };
    }
}

// Pin a post (admin only)
async function pinPost(postId) {
    try {
        const { data, error } = await supabase
            .from('posts')
            .update({ is_pinned: true })
            .eq('id', postId)
            .select()
            .single();

        if (error) {
            console.error('Error pinning post:', error);
            return { error };
        }

        return { data };
    } catch (error) {
        console.error('Error in pinPost:', error);
        return { error };
    }
}

// Unpin a post (admin only)
async function unpinPost(postId) {
    try {
        const { data, error } = await supabase
            .from('posts')
            .update({ is_pinned: false })
            .eq('id', postId)
            .select()
            .single();

        if (error) {
            console.error('Error unpinning post:', error);
            return { error };
        }

        return { data };
    } catch (error) {
        console.error('Error in unpinPost:', error);
        return { error };
    }
}

module.exports = {
    createPost,
    getPosts,
    getPostsByUser,
    getPostById,
    updatePost,
    deletePost,
    getPostsCount,
    pinPost,
    unpinPost
};
