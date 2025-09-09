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
        
        const { data, error } = await supabase
            .from('posts')
            .select(`
                *,
                usersData!posts_post_id_user_fkey (
                    displayName,
                    user_id_reg
                )
            `)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('Error fetching posts:', error);
            return { error };
        }

        console.log(`Fetched ${data.length} posts`);
        return { data };
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
                    user_id_reg
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
                    user_id_reg
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

module.exports = {
    createPost,
    getPosts,
    getPostsByUser,
    getPostById,
    updatePost,
    deletePost,
    getPostsCount
};
