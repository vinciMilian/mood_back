const { createClient } = require('@supabase/supabase-js');
const { SUPABASE_URL, SUPABASE_KEY } = require('./connect');
const { getUserData } = require('./users_db');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function resolveInternalUserId(possibleUserId) {
    // If already a number, use it
    if (typeof possibleUserId === 'number') {
        return possibleUserId;
    }

    // If numeric string, convert
    if (typeof possibleUserId === 'string' && /^\d+$/.test(possibleUserId)) {
        return Number(possibleUserId);
    }

    // Otherwise, assume UUID from auth and map to usersData.id
    try {
        const result = await getUserData(possibleUserId);
        if (result && result.data && typeof result.data.id !== 'undefined') {
            const raw = result.data.id;
            return typeof raw === 'string' ? Number(raw) : raw;
        }
    } catch (e) {
        console.error('Error resolving internal user id:', e);
    }

    return possibleUserId; // fallback (may cause DB error, but logged)
}

function normalizePostId(postId) {
    return typeof postId === 'string' ? Number(postId) : postId;
}

// Like a post (toggle like)
async function toggleLike(postId, userId) {
    try {
        const normalizedPostId = normalizePostId(postId);
        const internalUserId = await resolveInternalUserId(userId);
        console.log('Toggling like:', { postId: normalizedPostId, userId: internalUserId });
        
        // Check if user already liked this post
        const { data: existingLike, error: checkError } = await supabase
            .from('likes')
            .select('id')
            .eq('post_id', normalizedPostId)
            .eq('user_id', internalUserId)
            .single();

        if (checkError && checkError.code !== 'PGRST116') {
            console.error('Error checking existing like:', checkError);
            return { error: checkError };
        }

        if (existingLike) {
            // User already liked, so unlike
            return await unlikePost(normalizedPostId, internalUserId, existingLike.id);
        } else {
            // User hasn't liked, so like
            return await likePost(normalizedPostId, internalUserId);
        }
    } catch (error) {
        console.error('Error in toggleLike:', error);
        return { error };
    }
}

// Like a post
async function likePost(postId, userId) {
    try {
        const normalizedPostId = normalizePostId(postId);
        const internalUserId = await resolveInternalUserId(userId);
        console.log('Liking post:', { postId: normalizedPostId, userId: internalUserId });
        
        // Insert like
        const { data, error } = await supabase
            .from('likes')
            .insert({
                post_id: normalizedPostId,
                user_id: internalUserId
            })
            .select()
            .single();

        if (error) {
            console.error('Error liking post:', error);
            return { error };
        }

        // Update likes count in posts table
        await updatePostLikesCount(normalizedPostId);

        console.log('Post liked successfully:', data);
        return { data, liked: true };
    } catch (error) {
        console.error('Error in likePost:', error);
        return { error };
    }
}

// Unlike a post
async function unlikePost(postId, userId, likeId = null) {
    try {
        const normalizedPostId = normalizePostId(postId);
        const internalUserId = await resolveInternalUserId(userId);
        console.log('Unliking post:', { postId: normalizedPostId, userId: internalUserId, likeId });
        
        let query = supabase
            .from('likes')
            .delete()
            .eq('post_id', normalizedPostId)
            .eq('user_id', internalUserId);

        if (likeId) {
            query = query.eq('id', likeId);
        }

        const { error } = await query;

        if (error) {
            console.error('Error unliking post:', error);
            return { error };
        }

        // Update likes count in posts table
        await updatePostLikesCount(normalizedPostId);

        console.log('Post unliked successfully');
        return { success: true, liked: false };
    } catch (error) {
        console.error('Error in unlikePost:', error);
        return { error };
    }
}

// Check if user liked a post
async function checkUserLiked(postId, userId) {
    try {
        const normalizedPostId = normalizePostId(postId);
        const internalUserId = await resolveInternalUserId(userId);
        console.log('Checking if user liked post:', { postId: normalizedPostId, userId: internalUserId });
        
        const { data, error } = await supabase
            .from('likes')
            .select('id')
            .eq('post_id', normalizedPostId)
            .eq('user_id', internalUserId)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error checking user like:', error);
            return { error };
        }

        const liked = !!data;
        console.log(`User ${userId} ${liked ? 'liked' : 'did not like'} post ${postId}`);
        return { liked };
    } catch (error) {
        console.error('Error in checkUserLiked:', error);
        return { error };
    }
}

// Get likes count for a post
async function getLikesCount(postId) {
    try {
        const normalizedPostId = normalizePostId(postId);
        console.log('Getting likes count for post:', normalizedPostId);
        
        const { count, error } = await supabase
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', normalizedPostId);

        if (error) {
            console.error('Error getting likes count:', error);
            return { error };
        }

        console.log(`Likes count for post ${normalizedPostId}: ${count}`);
        return { count };
    } catch (error) {
        console.error('Error in getLikesCount:', error);
        return { error };
    }
}

// Get users who liked a post
async function getPostLikes(postId, limit = 20, offset = 0) {
    try {
        const normalizedPostId = normalizePostId(postId);
        console.log('Getting post likes:', { postId: normalizedPostId, limit, offset });
        
        const { data, error } = await supabase
            .from('likes')
            .select(`
                *,
                usersData!likes_user_id_fkey (
                    displayName,
                    user_id_reg
                )
            `)
            .eq('post_id', normalizedPostId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('Error getting post likes:', error);
            return { error };
        }

        console.log(`Fetched ${data.length} likes for post ${postId}`);
        return { data };
    } catch (error) {
        console.error('Error in getPostLikes:', error);
        return { error };
    }
}

// Update likes count in posts table
async function updatePostLikesCount(postId) {
    try {
        const { count } = await getLikesCount(postId);
        
        if (count !== null) {
            const { error } = await supabase
                .from('posts')
                .update({ likes: count })
                .eq('id', postId);

            if (error) {
                console.error('Error updating post likes count:', error);
            } else {
                console.log(`Updated likes count for post ${postId}: ${count}`);
            }
        }
    } catch (error) {
        console.error('Error in updatePostLikesCount:', error);
    }
}

module.exports = {
    toggleLike,
    likePost,
    unlikePost,
    checkUserLiked,
    getLikesCount,
    getPostLikes,
    updatePostLikesCount
};
