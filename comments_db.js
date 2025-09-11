const { createClient } = require('@supabase/supabase-js');
const { SUPABASE_URL, SUPABASE_KEY } = require('./connect');
const { getUserDataById } = require('./users_db');
const { sendCommentNotification } = require('./email_service');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Utilities
function normalizePostId(postId) {
    return typeof postId === 'string' ? Number(postId) : postId;
}

async function resolveInternalUserId(possibleUserId) {
    if (typeof possibleUserId === 'number') return possibleUserId;
    if (typeof possibleUserId === 'string' && /^\d+$/.test(possibleUserId)) return Number(possibleUserId);

    // Lazy import to avoid circular deps
    try {
        const { getUserData } = require('./users_db');
        const result = await getUserData(possibleUserId);
        if (result && result.data && typeof result.data.id !== 'undefined') {
            const raw = result.data.id;
            return typeof raw === 'string' ? Number(raw) : raw;
        }
    } catch (e) {
        console.error('Error resolving internal user id (comments):', e);
    }
    return possibleUserId;
}

function normalizePostId(postId) {
    return typeof postId === 'string' ? Number(postId) : postId;
}

// Create a new comment
async function createComment(postId, userId, commentText) {
    try {
        const normalizedPostId = normalizePostId(postId);
        const internalUserId = await resolveInternalUserId(userId);
        console.log('Creating comment:', { postId: normalizedPostId, userId: internalUserId, commentText });
        
        const { data, error } = await supabase
            .from('comments')
            .insert({
                post_id: normalizedPostId,
                user_id: internalUserId,
                comment_content: commentText
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating comment:', error);
            return { error };
        }

        // Update comments count in posts table
        await updatePostCommentsCount(normalizedPostId);

        // Send email notification to post owner
        await sendCommentNotificationToOwner(normalizedPostId, internalUserId, commentText);

        console.log('Comment created successfully:', data);
        return { data };
    } catch (error) {
        console.error('Error in createComment:', error);
        return { error };
    }
}

// Get comments by post ID
async function getCommentsByPost(postId, limit = 20, offset = 0) {
    try {
        const normalizedPostId = normalizePostId(postId);
        console.log('Fetching comments for post:', { postId: normalizedPostId, limit, offset });
        
        const { data, error } = await supabase
            .from('comments')
            .select(`
                *,
                usersData!comments_user_id_fkey (
                    displayName,
                    user_id_reg
                )
            `)
            .eq('post_id', normalizedPostId)
            .order('created_at', { ascending: true })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('Error fetching comments:', error);
            return { error };
        }

        console.log(`Fetched ${data.length} comments for post ${postId}`);
        return { data };
    } catch (error) {
        console.error('Error in getCommentsByPost:', error);
        return { error };
    }
}

// Get all comments by user
async function getCommentsByUser(userId, limit = 20, offset = 0) {
    try {
        const internalUserId = await resolveInternalUserId(userId);
        console.log('Fetching comments by user:', { userId: internalUserId, limit, offset });
        
        const { data, error } = await supabase
            .from('comments')
            .select('*')
            .eq('user_id', internalUserId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('Error fetching comments by user:', error);
            return { error };
        }

        console.log(`Fetched ${data.length} comments for user ${userId}`);
        return { data };
    } catch (error) {
        console.error('Error in getCommentsByUser:', error);
        return { error };
    }
}

// Update comment
async function updateComment(commentId, commentText) {
    try {
        console.log('Updating comment:', { commentId, commentText });
        
        const { data, error } = await supabase
            .from('comments')
            .update({ comment_content: commentText })
            .eq('id', commentId)
            .select()
            .single();

        if (error) {
            console.error('Error updating comment:', error);
            return { error };
        }

        console.log('Comment updated successfully:', data);
        return { data };
    } catch (error) {
        console.error('Error in updateComment:', error);
        return { error };
    }
}

// Delete comment
async function deleteComment(commentId) {
    try {
        console.log('Deleting comment:', commentId);
        
        // First get the comment to know which post to update
        const { data: comment, error: fetchError } = await supabase
            .from('comments')
            .select('post_id')
            .eq('id', commentId)
            .single();

        if (fetchError) {
            console.error('Error fetching comment for deletion:', fetchError);
            return { error: fetchError };
        }

        // Delete the comment
        const { error } = await supabase
            .from('comments')
            .delete()
            .eq('id', commentId);

        if (error) {
            console.error('Error deleting comment:', error);
            return { error };
        }

        // Update comments count in posts table
        await updatePostCommentsCount(comment.post_id);

        console.log('Comment deleted successfully');
        return { success: true };
    } catch (error) {
        console.error('Error in deleteComment:', error);
        return { error };
    }
}

// Get comments count for a post
async function getCommentsCount(postId) {
    try {
        const normalizedPostId = normalizePostId(postId);
        console.log('Getting comments count for post:', normalizedPostId);
        
        const { count, error } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', normalizedPostId);

        if (error) {
            console.error('Error getting comments count:', error);
            return { error };
        }

        console.log(`Comments count for post ${normalizedPostId}: ${count}`);
        return { count };
    } catch (error) {
        console.error('Error in getCommentsCount:', error);
        return { error };
    }
}

// Update comments count in posts table
async function updatePostCommentsCount(postId) {
    try {
        const { count } = await getCommentsCount(postId);
        
        if (count !== null) {
            const { error } = await supabase
                .from('posts')
                .update({ comments: count })
                .eq('id', postId);

            if (error) {
                console.error('Error updating post comments count:', error);
            } else {
                console.log(`Updated comments count for post ${postId}: ${count}`);
            }
        }
    } catch (error) {
        console.error('Error in updatePostCommentsCount:', error);
    }
}

// Send comment notification to post owner
async function sendCommentNotificationToOwner(postId, commenterUserId, commentText) {
    try {
        // Get post details
        const { data: post, error: postError } = await supabase
            .from('posts')
            .select('*')
            .eq('id', postId)
            .single();

        if (postError || !post) {
            console.error('Error fetching post for notification:', postError);
            return;
        }

        // Get post owner details
        const postOwnerResult = await getUserDataById(post.post_id_user);
        if (postOwnerResult.error || !postOwnerResult.data) {
            console.error('Error fetching post owner for notification:', postOwnerResult.error);
            return;
        }

        // Get commenter details
        const commenterResult = await getUserDataById(commenterUserId);
        if (commenterResult.error || !commenterResult.data) {
            console.error('Error fetching commenter for notification:', commenterResult.error);
            return;
        }

        // Don't send notification if user comments on their own post
        if (post.post_id_user === commenterUserId) {
            console.log('User commented on their own post, skipping notification');
            return;
        }

        // Get post owner's email from auth
        const { data: { user }, error: authError } = await supabase.auth.admin.getUserById(postOwnerResult.data.user_id_reg);
        if (authError || !user || !user.email) {
            console.error('Error fetching post owner email:', authError);
            return;
        }

        // Send email notification
        const emailResult = await sendCommentNotification(
            user.email,
            postOwnerResult.data.displayName,
            commenterResult.data.displayName,
            commentText,
            post.description
        );

        if (emailResult.error) {
            console.error('Error sending comment notification email:', emailResult.error);
        } else {
            console.log('Comment notification email sent successfully');
        }
    } catch (error) {
        console.error('Error in sendCommentNotificationToOwner:', error);
    }
}

module.exports = {
    createComment,
    getCommentsByPost,
    getCommentsByUser,
    updateComment,
    deleteComment,
    getCommentsCount,
    updatePostCommentsCount
};
