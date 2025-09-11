const { createClient } = require('@supabase/supabase-js');
const { SUPABASE_URL, SUPABASE_KEY } = require('./connect');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Create user data in usersData table
async function createUserData(userId, displayName) {
    try {
        console.log('Attempting to insert user data:', { userId, displayName });

        // Checa se já existe
        const { data: existing, error: checkError } = await supabase
            .from('usersData')
            .select('id')
            .eq('user_id_reg', userId)
            .single();

        if (existing) {
            console.log('User data already exists, skipping insert.');
            return { data: existing, alreadyExists: true };
        }
        if (checkError && checkError.code !== 'PGRST116') {
            console.error('Error checking user data existence:', checkError);
            return { error: checkError };
        }

        // Se não existe, insere
        const { data, error } = await supabase
            .from('usersData')
            .insert({
                user_id_reg: userId,
                displayName: displayName
            });

        if (error) {
            console.error('Error creating user data:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));
            return { error };
        }

        console.log('User data inserted successfully:', data);
        return { data };
    } catch (error) {
        console.error('Error in createUserData:', error);
        return { error };
    }
}

// Get user data by user ID
async function getUserData(userId) {
    try {
        const { data, error } = await supabase
            .from('usersData')
            .select('*')
            .eq('user_id_reg', userId)
            .single();

        if (error) {
            console.error('Error fetching user data:', error);
            return { error };
        }

        return { data };
    } catch (error) {
        console.error('Error in getUserData:', error);
        return { error };
    }
}

// Get all users data
async function getAllUsersData() {
    try {
        const { data, error } = await supabase
            .from('usersData')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching all users data:', error);
            return { error };
        }

        return { data };
    } catch (error) {
        console.error('Error in getAllUsersData:', error);
        return { error };
    }
}

// Update user data
async function updateUserData(userId, updateData) {
    try {
        const { data, error } = await supabase
            .from('usersData')
            .update(updateData)
            .eq('user_id_reg', userId)
            .select()
            .single();

        if (error) {
            console.error('Error updating user data:', error);
            return { error };
        }

        return { data };
    } catch (error) {
        console.error('Error in updateUserData:', error);
        return { error };
    }
}

// Update user profile image
async function updateUserProfileImage(userId, imageBucketPath) {
    try {
        const { data, error } = await supabase
            .from('usersData')
            .update({ user_image_bucket: imageBucketPath })
            .eq('user_id_reg', userId)
            .select()
            .single();

        if (error) {
            console.error('Error updating user profile image:', error);
            return { error };
        }

        return { data };
    } catch (error) {
        console.error('Error in updateUserProfileImage:', error);
        return { error };
    }
}

// Get user data by internal ID (for notifications)
async function getUserDataById(internalId) {
    try {
        const { data, error } = await supabase
            .from('usersData')
            .select('*')
            .eq('id', internalId)
            .single();

        if (error) {
            console.error('Error fetching user data by ID:', error);
            return { error };
        }

        return { data };
    } catch (error) {
        console.error('Error in getUserDataById:', error);
        return { error };
    }
}

// Update display name
async function updateDisplayName(userId, displayName) {
    try {
        const { data, error } = await supabase
            .from('usersData')
            .update({ displayName: displayName })
            .eq('user_id_reg', userId)
            .select()
            .single();

        if (error) {
            console.error('Error updating display name:', error);
            return { error };
        }

        return { data };
    } catch (error) {
        console.error('Error in updateDisplayName:', error);
        return { error };
    }
}

// Delete user data
async function deleteUserData(userId) {
    try {
        const { error } = await supabase
            .from('usersData')
            .delete()
            .eq('user_id_reg', userId);

        if (error) {
            console.error('Error deleting user data:', error);
            return { error };
        }

        return { success: true };
    } catch (error) {
        console.error('Error in deleteUserData:', error);
        return { error };
    }
}

// Check if user data exists
async function userDataExists(userId) {
    try {
        const { data, error } = await supabase
            .from('usersData')
            .select('id')
            .eq('user_id_reg', userId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
            console.error('Error checking user data existence:', error);
            return { error };
        }

        return { exists: !!data };
    } catch (error) {
        console.error('Error in userDataExists:', error);
        return { error };
    }
}

module.exports = {
    createUserData,
    getUserData,
    getAllUsersData,
    updateUserData,
    updateUserProfileImage,
    getUserDataById,
    updateDisplayName,
    deleteUserData,
    userDataExists
};
