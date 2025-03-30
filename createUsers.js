const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://tokxsggxbetgxoypadoo.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRva3hzZ2d4YmV0Z3hveXBhZG9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcwMjU0NjgsImV4cCI6MjA1MjYwMTQ2OH0.bagtfIUeeeaDPofMeUc6jnJrOTXm3nlZuc33dCM_BN4');

async function createUsers() {
  for (let i = 0; i < 25; i++) {
    const email = `user${i}@test.com`;
    const password = 'password123';

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.error('Error creating user:', error);
      } else if (data.user) {
        console.log('User created:', data.user.id);
        await createProfile(data.user.id, i);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Unexpected error:', error);
    }
  }
}

async function createProfile(userId, i) {
  const { data, error } = await supabase
    .from('profiles')
    .insert([{
      id: userId,
      username: `user_${i}`,
      avatar_url: `https://ui-avatars.com/api/?name=user_${i}`,
      bio: 'I am a Runner',
      role: 'user', // or 'coach' if needed
      is_premium: true,
      followers_count: 0,
      following_count: 0
    }]);

  if (error) {
    console.error('Error creating profile:', error);
  } else {
    console.log('Profile created:', data);
  }
}

createUsers();