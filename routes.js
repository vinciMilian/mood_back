
const express = require('express');
const router = express.Router();

// Shared Supabase client (no user auth) for public queries like trending, search, etc.
const { createClient } = require('@supabase/supabase-js');
const { SUPABASE_URL, SUPABASE_KEY } = require('./connect');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);


// Toggle like on a post
router.post('/posts/:postId/like', async (req, res) => {
    try {
        const { postId: postIdParam } = req.params;
        const postId = Number(postIdParam);
        if (isNaN(postId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid postId. Must be a number.'
            });
        }
        // Get user from token
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Authorization header missing or malformed'
            });
        }
        const accessToken = authHeader.split(' ')[1];
        const { createClient } = require('@supabase/supabase-js');
        const { SUPABASE_URL, SUPABASE_KEY } = require('./connect');
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
            global: { headers: { Authorization: `Bearer ${accessToken}` } }
        });
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }
        // Map auth user.id (UUID) -> usersData.id (bigint)
        const userDataResult = await getUserData(user.id);
        if (userDataResult.error || !userDataResult.data) {
            return res.status(404).json({
                success: false,
                message: 'User profile not found'
            });
        }
        const internalUserIdRaw = userDataResult.data.id;
        const internalUserId = typeof internalUserIdRaw === 'string' ? Number(internalUserIdRaw) : internalUserIdRaw;
        const result = await toggleLike(postId, internalUserId);
        if (result.error) {
            return res.status(500).json({
                success: false,
                message: 'Error toggling like',
                error: result.error
            });
        }
        res.status(200).json({
            success: true,
            data: result,
            message: result.liked ? 'Post liked' : 'Post unliked'
        });
    } catch (error) {
        console.error('Toggle like error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Import auth functions
let signUpNewUser, signInWithEmail;
try {
    const authModule = require('./auth');
    signUpNewUser = authModule.signUpNewUser;
    signInWithEmail = authModule.signInWithEmail;
} catch (error) {
    console.error('Error importing auth module:', error);
}

// Import users_db functions
let getUserData, createUserData, getAllUsersData, updateUserData, updateDisplayName, deleteUserData;
try {
    const usersDbModule = require('./users_db');
    getUserData = usersDbModule.getUserData;
    createUserData = usersDbModule.createUserData;
    getAllUsersData = usersDbModule.getAllUsersData;
    updateUserData = usersDbModule.updateUserData;
    updateDisplayName = usersDbModule.updateDisplayName;
    deleteUserData = usersDbModule.deleteUserData;
} catch (error) {
    console.error('Error importing users_db module:', error);
}

// Import posts_db functions
let createPost, getPosts, getPostsByUser, getPostById, updatePost, deletePost, getPostsCount;
try {
    const postsDbModule = require('./posts_db');
    createPost = postsDbModule.createPost;
    getPosts = postsDbModule.getPosts;
    getPostsByUser = postsDbModule.getPostsByUser;
    getPostById = postsDbModule.getPostById;
    updatePost = postsDbModule.updatePost;
    deletePost = postsDbModule.deletePost;
    getPostsCount = postsDbModule.getPostsCount;
} catch (error) {
    console.error('Error importing posts_db module:', error);
}

// Import comments_db functions
let createComment, getCommentsByPost, getCommentsByUser, updateComment, deleteComment, getCommentsCount;
try {
    const commentsDbModule = require('./comments_db');
    createComment = commentsDbModule.createComment;
    getCommentsByPost = commentsDbModule.getCommentsByPost;
    getCommentsByUser = commentsDbModule.getCommentsByUser;
    updateComment = commentsDbModule.updateComment;
    deleteComment = commentsDbModule.deleteComment;
    getCommentsCount = commentsDbModule.getCommentsCount;
} catch (error) {
    console.error('Error importing comments_db module:', error);
}

// Import likes_db functions
let toggleLike, likePost, unlikePost, checkUserLiked, getLikesCount, getPostLikes;
try {
    const likesDbModule = require('./likes_db');
    toggleLike = likesDbModule.toggleLike;
    likePost = likesDbModule.likePost;
    unlikePost = likesDbModule.unlikePost;
    checkUserLiked = likesDbModule.checkUserLiked;
    getLikesCount = likesDbModule.getLikesCount;
    getPostLikes = likesDbModule.getPostLikes;
} catch (error) {
    console.error('Error importing likes_db module:', error);
}

// Import storage_db functions
let uploadImage, getImageUrl, deleteImage, uploadImageWithUniqueName;
try {
    const storageDbModule = require('./storage_db');
    uploadImage = storageDbModule.uploadImage;
    getImageUrl = storageDbModule.getImageUrl;
    deleteImage = storageDbModule.deleteImage;
    uploadImageWithUniqueName = storageDbModule.uploadImageWithUniqueName;
} catch (error) {
    console.error('Error importing storage_db module:', error);
}

// Basic test endpoint
router.get('/test/basic', (req, res) => {
    res.json({ message: 'Basic test working' });
});

// Sign up route
router.post('/signup', async (req, res) => {
    try {
        const { displayName, email, password } = req.body;
        
        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const result = await signUpNewUser(displayName,email, password);
        
        if (result.error) {
            return res.status(400).json({
                success: false,
                message: result.error.message
            });
        }

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: result.data
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Sign in route
router.post('/signin', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const result = await signInWithEmail(email, password);
        
        if (result.error) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Sign in successful',
            data: result.data
        });
    } catch (error) {
        console.error('Signin error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Route to get the currently authenticated user
router.get('/user', async (req, res) => {
    try {
        // Get the access token from the Authorization header
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Authorization header missing or malformed'
            });
        }
        const accessToken = authHeader.split(' ')[1];

        // Create a new Supabase client with the user's access token
        const { createClient } = require('@supabase/supabase-js');
        const { SUPABASE_URL, SUPABASE_KEY } = require('./connect');
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
            global: { headers: { Authorization: `Bearer ${accessToken}` } }
        });

        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        // Get user data from usersData table
        const userDataResult = await getUserData(user.id);
        
        // If user data doesn't exist, create it
        if (userDataResult.error && userDataResult.error.code === 'PGRST116') {
            console.log('User data not found, creating it now...');
            const { createUserData } = require('./users_db');
            const createResult = await createUserData(user.id, user.email?.split('@')[0] || 'User');
            
            if (createResult.error) {
                console.error('Error creating user data in /user endpoint:', createResult.error);
            } else {
                console.log('User data created successfully in /user endpoint:', createResult.data);
            }
        }
        
        // Get user data again (either existing or newly created)
        const finalUserDataResult = await getUserData(user.id);
        
        // Combine auth user data with usersData
        const userWithData = {
            ...user,
            userData: finalUserDataResult.data || null
        };

        res.status(200).json({
            success: true,
            user: userWithData
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Test endpoint to check all users data
router.get('/test/users', async (req, res) => {
    try {
        const result = await getAllUsersData();
        
        if (result.error) {
            return res.status(500).json({
                success: false,
                message: 'Error fetching users data',
                error: result.error
            });
        }

        res.status(200).json({
            success: true,
            data: result.data
        });
    } catch (error) {
        console.error('Test users error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Test endpoint to check if server is working
router.get('/test/ping', (req, res) => {
    try {
        console.log('Ping endpoint called');
        res.status(200).json({
            success: true,
            message: 'Server is working!',
            timestamp: new Date().toISOString(),
            env: {
                SUPABASE_URL: process.env.SUPABASE_URL ? 'Set' : 'Not set',
                SUPABASE_KEY: process.env.SUPABASE_KEY ? 'Set' : 'Not set'
            }
        });
    } catch (error) {
        console.error('Error in ping endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'Error in ping endpoint',
            error: error.message
        });
    }
});

// Test endpoint to manually create user data
router.post('/test/create-user-data', async (req, res) => {
    try {
        console.log('Received request to create user data:', req.body);
        
        const { userId, displayName } = req.body;
        
        if (!userId || !displayName) {
            console.log('Missing required fields:', { userId, displayName });
            return res.status(400).json({
                success: false,
                message: 'userId and displayName are required'
            });
        }

        console.log('Creating user data with:', { userId, displayName });
        const result = await createUserData(userId, displayName);
        
        if (result.error) {
            console.error('Error creating user data:', result.error);
            return res.status(500).json({
                success: false,
                message: 'Error creating user data',
                error: result.error
            });
        }

        console.log('User data created successfully:', result.data);
        res.status(201).json({
            success: true,
            data: result.data
        });
    } catch (error) {
        console.error('Test create user data error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Update user data
router.put('/user-data/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const updateData = req.body;
        
        const result = await updateUserData(userId, updateData);
        
        if (result.error) {
            return res.status(500).json({
                success: false,
                message: 'Error updating user data',
                error: result.error
            });
        }

        res.status(200).json({
            success: true,
            data: result.data
        });
    } catch (error) {
        console.error('Update user data error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Update display name
router.put('/user-data/:userId/display-name', async (req, res) => {
    try {
        const { userId } = req.params;
        const { displayName } = req.body;
        
        if (!displayName) {
            return res.status(400).json({
                success: false,
                message: 'displayName is required'
            });
        }
        
        const result = await updateDisplayName(userId, displayName);
        
        if (result.error) {
            return res.status(500).json({
                success: false,
                message: 'Error updating display name',
                error: result.error
            });
        }

        res.status(200).json({
            success: true,
            data: result.data
        });
    } catch (error) {
        console.error('Update display name error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Delete user data
router.delete('/user-data/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const result = await deleteUserData(userId);
        
        if (result.error) {
            return res.status(500).json({
                success: false,
                message: 'Error deleting user data',
                error: result.error
            });
        }

        res.status(200).json({
            success: true,
            message: 'User data deleted successfully'
        });
    } catch (error) {
        console.error('Delete user data error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// ==================== POSTS ROUTES ====================

// Get posts with pagination
router.get('/posts', async (req, res) => {
    try {
        const { limit = 10, offset = 0 } = req.query;
        
        const result = await getPosts(parseInt(limit), parseInt(offset));
        
        if (result.error) {
            return res.status(500).json({
                success: false,
                message: 'Error fetching posts',
                error: result.error
            });
        }

        res.status(200).json({
            success: true,
            data: result.data,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: result.data.length === parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Get posts error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Create a new post
router.post('/posts', async (req, res) => {
    try {
        const { description, imageIdBucket } = req.body;
        
        // Get user from token
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Authorization header missing or malformed'
            });
        }
        
        const accessToken = authHeader.split(' ')[1];
        const { createClient } = require('@supabase/supabase-js');
        const { SUPABASE_URL, SUPABASE_KEY } = require('./connect');
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
            global: { headers: { Authorization: `Bearer ${accessToken}` } }
        });

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        if (!description || description.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Description is required'
            });
        }

        // Fetch internal usersData.id using auth user.id (user_id_reg)
        const userDataResult = await getUserData(user.id);
        if (userDataResult.error || !userDataResult.data) {
            return res.status(404).json({
                success: false,
                message: 'User profile not found'
            });
        }

        const internalUserIdRaw = userDataResult.data.id;
        const internalUserId = typeof internalUserIdRaw === 'string' ? Number(internalUserIdRaw) : internalUserIdRaw;

        console.log('Create Post - ids:', {
            authUserId: user.id,
            internalUserIdRaw,
            internalUserId,
            types: {
                authUserId: typeof user.id,
                internalUserIdRaw: typeof internalUserIdRaw,
                internalUserId: typeof internalUserId
            }
        });

        const result = await createPost(internalUserId, description.trim(), imageIdBucket);
        
        if (result.error) {
            return res.status(500).json({
                success: false,
                message: 'Error creating post',
                error: result.error
            });
        }

        res.status(201).json({
            success: true,
            data: result.data,
            message: 'Post created successfully'
        });
    } catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get trending posts (most liked)

// Get trending posts (most liked) - needs to be BEFORE '/posts/:postId'
router.get('/posts/trending', async (req, res) => {
    try {
        let { limit = 5 } = req.query;
        limit = parseInt(limit);
        if (isNaN(limit) || limit <= 0) {
            limit = 5;
        }
        const { data, error } = await supabase
            .from('posts')
            .select(`
                *,
                usersData!posts_post_id_user_fkey (
                    displayName,
                    user_id_reg
                )
            `)
            .order('likes', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching trending posts:', error);
            return res.status(500).json({
                success: false,
                message: 'Error fetching trending posts',
                error: error
            });
        }

        res.status(200).json({
            success: true,
            data: data
        });
    } catch (error) {
        console.error('Get trending posts error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get posts by user
router.get('/posts/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 10, offset = 0 } = req.query;
        
        const result = await getPostsByUser(userId, parseInt(limit), parseInt(offset));
        
        if (result.error) {
            return res.status(500).json({
                success: false,
                message: 'Error fetching user posts',
                error: result.error
            });
        }

        res.status(200).json({
            success: true,
            data: result.data,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: result.data.length === parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Get user posts error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get single post by ID
router.get('/posts/:postId', async (req, res) => {
    try {
        const { postId: postIdParam } = req.params;
        const postId = Number(postIdParam);
        if (isNaN(postId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid postId. Must be a number.'
            });
        }
        const result = await getPostById(postId);
        
        if (result.error) {
            return res.status(404).json({
                success: false,
                message: 'Post not found',
                error: result.error
            });
        }

        res.status(200).json({
            success: true,
            data: result.data
        });
    } catch (error) {
        console.error('Get post error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Delete post
router.delete('/posts/:postId', async (req, res) => {
    try {
        const { postId: postIdParam } = req.params;
        const postId = Number(postIdParam);
        if (isNaN(postId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid postId. Must be a number.'
            });
        }
        // Get user from token
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Authorization header missing or malformed'
            });
        }
        
        const accessToken = authHeader.split(' ')[1];
        const { createClient } = require('@supabase/supabase-js');
        const { SUPABASE_URL, SUPABASE_KEY } = require('./connect');
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
            global: { headers: { Authorization: `Bearer ${accessToken}` } }
        });

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        // Check if user owns the post
        const postResult = await getPostById(postId);
        if (postResult.error) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        // Compare with internal usersData.id
        const userDataResult = await getUserData(user.id);
        if (userDataResult.error || !userDataResult.data) {
            return res.status(404).json({
                success: false,
                message: 'User profile not found'
            });
        }

        if (postResult.data.post_id_user !== userDataResult.data.id) {
            return res.status(403).json({
                success: false,
                message: 'You can only delete your own posts'
            });
        }

        const result = await deletePost(postId);
        
        if (result.error) {
            return res.status(500).json({
                success: false,
                message: 'Error deleting post',
                error: result.error
            });
        }

        res.status(200).json({
            success: true,
            message: 'Post deleted successfully'
        });
    } catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// ==================== COMMENTS ROUTES ====================

// Get comments for a post
router.get('/posts/:postId/comments', async (req, res) => {
    try {
        const { postId } = req.params;
        const { limit = 20, offset = 0 } = req.query;
        const postIdNum = Number(postId);
        if (isNaN(postIdNum)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid postId. Must be a number.'
            });
        }
        const result = await getCommentsByPost(postIdNum, parseInt(limit), parseInt(offset));
        
        if (result.error) {
            return res.status(500).json({
                success: false,
                message: 'Error fetching comments',
                error: result.error
            });
        }

        res.status(200).json({
            success: true,
            data: result.data,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: result.data.length === parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Create a comment
router.post('/posts/:postId/comments', async (req, res) => {
    try {
        const { postId } = req.params;
        const { commentText } = req.body;
        const postIdNum = Number(postId);
        if (isNaN(postIdNum)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid postId. Must be a number.'
            });
        }
        // Get user from token
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Authorization header missing or malformed'
            });
        }
        
        const accessToken = authHeader.split(' ')[1];
        const { createClient } = require('@supabase/supabase-js');
        const { SUPABASE_URL, SUPABASE_KEY } = require('./connect');
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
            global: { headers: { Authorization: `Bearer ${accessToken}` } }
        });

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        if (!commentText || commentText.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Comment text is required'
            });
        }

        // Map auth user.id (UUID) -> usersData.id (bigint) for comment author
        const userDataResult = await getUserData(user.id);
        if (userDataResult.error || !userDataResult.data) {
            return res.status(404).json({
                success: false,
                message: 'User profile not found'
            });
        }

        const internalUserIdRaw = userDataResult.data.id;
        const internalUserId = typeof internalUserIdRaw === 'string' ? Number(internalUserIdRaw) : internalUserIdRaw;

        const result = await createComment(postIdNum, internalUserId, commentText.trim());
        
        if (result.error) {
            return res.status(500).json({
                success: false,
                message: 'Error creating comment',
                error: result.error
            });
        }

        res.status(201).json({
            success: true,
            data: result.data,
            message: 'Comment created successfully'
        });
    } catch (error) {
        console.error('Create comment error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// ==================== STORAGE ROUTES ====================

// Get image URL
router.get('/storage/image/:fileName', async (req, res) => {
    try {
        const { fileName } = req.params;
        
        if (!fileName) {
            return res.status(400).json({
                success: false,
                message: 'File name is required'
            });
        }

        const result = await getImageUrl(fileName, 'posts_images');
        
        if (result.error) {
            return res.status(500).json({
                success: false,
                message: 'Error getting image URL',
                error: result.error
            });
        }

        res.status(200).json({
            success: true,
            data: { url: result.url }
        });
    } catch (error) {
        console.error('Get image URL error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// ==================== SEARCH ROUTES ====================

// Search posts by content
router.get('/search/posts', async (req, res) => {
    try {
        const { q: query, limit = 10, offset = 0 } = req.query;
        
        if (!query || query.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }

        const { data, error } = await supabase
            .from('posts')
            .select(`
                *,
                usersData!posts_post_id_user_fkey (
                    displayName,
                    user_id_reg
                )
            `)
            .ilike('description', `%${query.trim()}%`)
            .order('created_at', { ascending: false })
            .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

        if (error) {
            console.error('Error searching posts:', error);
            return res.status(500).json({
                success: false,
                message: 'Error searching posts',
                error: error
            });
        }

        res.status(200).json({
            success: true,
            data: data,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: data.length === parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Search posts error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Search users by display name
router.get('/search/users', async (req, res) => {
    try {
        const { q: query, limit = 10, offset = 0 } = req.query;
        
        if (!query || query.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }

        const { data, error } = await supabase
            .from('usersData')
            .select('*')
            .ilike('displayName', `%${query.trim()}%`)
            .order('created_at', { ascending: false })
            .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

        if (error) {
            console.error('Error searching users:', error);
            return res.status(500).json({
                success: false,
                message: 'Error searching users',
                error: error
            });
        }

        res.status(200).json({
            success: true,
            data: data,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: data.length === parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// (moved above) trending route removed here to avoid conflict with '/posts/:postId'

// Get random users for suggestions
router.get('/users/random', async (req, res) => {
    try {
        let { limit = 5 } = req.query;
        limit = parseInt(limit);
        if (isNaN(limit) || limit <= 0) {
            limit = 5;
        }
        const { data, error } = await supabase
            .from('usersData')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit * 3); // Get more to randomize

        if (error) {
            console.error('Error fetching random users:', error);
            return res.status(500).json({
                success: false,
                message: 'Error fetching random users',
                error: error
            });
        }

        // Shuffle and take the requested amount
        const shuffled = data.sort(() => 0.5 - Math.random());
        const randomUsers = shuffled.slice(0, limit);

        res.status(200).json({
            success: true,
            data: randomUsers
        });
    } catch (error) {
        console.error('Get random users error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// ==================== LIKES ROUTES ====================

// Check if user liked a post
router.get('/posts/:postId/like', async (req, res) => {
    try {
        const { postId: postIdParam } = req.params;
        const postId = Number(postIdParam);
        if (isNaN(postId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid postId. Must be a number.'
            });
        }
        // Get user from token
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Authorization header missing or malformed'
            });
        }
        
        const accessToken = authHeader.split(' ')[1];
        const { createClient } = require('@supabase/supabase-js');
        const { SUPABASE_URL, SUPABASE_KEY } = require('./connect');
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
            global: { headers: { Authorization: `Bearer ${accessToken}` } }
        });

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        // Map auth user.id (UUID) -> usersData.id (bigint)
        const userDataResult = await getUserData(user.id);
        if (userDataResult.error || !userDataResult.data) {
            return res.status(404).json({
                success: false,
                message: 'User profile not found'
            });
        }

        const internalUserIdRaw = userDataResult.data.id;
        const internalUserId = typeof internalUserIdRaw === 'string' ? Number(internalUserIdRaw) : internalUserIdRaw;

        console.log('Check Like - ids:', { postId, internalUserId });
        const result = await checkUserLiked(postId, internalUserId);
        
        if (result.error) {
            return res.status(500).json({
                success: false,
                message: 'Error checking like status',
                error: result.error
            });
        }

        res.status(200).json({
            success: true,
            data: { liked: result.liked }
        });
    } catch (error) {
        console.error('Check like error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;
