const { createClient } = require('@supabase/supabase-js');
const { SUPABASE_URL, SUPABASE_KEY } = require('./connect');
const { createUserData } = require('./users_db');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function signUpNewUser(displayName, email, password) {
    try {
        console.log('Starting user registration for:', email);
        
        // Create user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password
        });

        console.log('Auth response:', { authData, authError });

        if (authError) {
            console.error('Auth error:', authError);
            return { data: null, error: authError };
        }

        // Check if user was created successfully
        if (authData && authData.user) {
            console.log('User created in auth:', authData.user.id);
            console.log('Creating user data with displayName:', displayName || email.split('@')[0]);
            
            const userDataResult = await createUserData(authData.user.id, displayName || email.split('@')[0]);
            
            if (userDataResult.error) {
                console.error('Error creating user data:', userDataResult.error);
                // Note: User is already created in auth, but we couldn't create user data
                // This could be handled by a cleanup process or manual intervention
            } else {
                console.log('User data created successfully:', userDataResult.data);
            }
        } else {
            console.log('No user data in auth response - this might be due to email confirmation requirement');
            console.log('Auth data structure:', JSON.stringify(authData, null, 2));
        }

        return { data: authData, error: authError };
    } catch (error) {
        console.error('Error in signUpNewUser:', error);
        return { data: null, error };
    }
}

async function signInWithEmail(email, password) {
    try {
        console.log('Starting user sign in for:', email);
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });
        
        console.log('Sign in response:', { data, error });
        
        // If user signed in successfully, check if user data exists
        if (data && data.user && !error) {
            console.log('User signed in successfully:', data.user.id);
            
            // Check if user data exists in usersData table
            const { userDataExists } = require('./users_db');
            const existsResult = await userDataExists(data.user.id);
            
            if (existsResult.exists === false) {
                console.log('User data does not exist, creating it now...');
                const { createUserData } = require('./users_db');
                const userDataResult = await createUserData(data.user.id, email.split('@')[0]);
                
                if (userDataResult.error) {
                    console.error('Error creating user data during sign in:', userDataResult.error);
                } else {
                    console.log('User data created successfully during sign in:', userDataResult.data);
                }
            } else {
                console.log('User data already exists');
            }
        }
        
        return { data, error };
    } catch (error) {
        console.error('Error in signInWithEmail:', error);
        return { data: null, error };
    }
}

module.exports = {
    signUpNewUser,
    signInWithEmail
};