import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useAuth } from '@/src/context/AuthContext';
import { supabase } from '@/src/lib/supabase';
import { registerForPushNotificationsAsync, savePushToken } from '@/src/utils/notifications';
import { useTheme } from '@/src/context/ThemeContext';
import { Stack } from 'expo-router';
import { usePushNotification } from '@/src/context/PushNotificationContext';

export default function NotificationTestScreen() {
  const { session } = useAuth();
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const { pushToken, setPushToken, sendPushNotification } = usePushNotification();
  
  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [message, ...prev]);
  };
  
  const registerPushToken = async () => {
    if (!session?.user?.id) {
      addLog("❌ No user session, can't register token");
      return;
    }
    
    setLoading(true);
    try {
      addLog("🔄 Registering push token for user: " + session.user.id);
      
      // Register a new token
      const token = await registerForPushNotificationsAsync();
      
      if (token) {
        addLog("✅ Got new push token: " + token);
        setPushToken(token); // Store in context
        
        // Save the new token
        const { data, error } = await supabase
          .from('user_push_tokens')
          .insert({
            user_id: session.user.id,
            token: token,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select();
          
        if (error) {
          addLog("❌ Error saving token: " + error.message);
        } else {
          addLog("✅ Token saved successfully: " + JSON.stringify(data));
          
          // Test the new token immediately
          const success = await sendPushNotification(
            token,
            "Token Test",
            "This is a test of your new push token",
            { type: 'test' }
          );
          
          addLog(success ? "✅ Test notification sent successfully" : "❌ Failed to send test notification");
        }
      } else {
        addLog("❌ Failed to get push token");
      }
    } catch (error) {
      addLog("❌ Error: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };
  
  const showCurrentToken = () => {
    addLog("🔄 Current push token in context: " + (pushToken || "None"));
  };
  
  const sendTestPushNotification = async () => {
    if (!session?.user?.id) {
      addLog("❌ No user session, can't send test notification");
      return;
    }
    
    setLoading(true);
    try {
      addLog("🔄 Sending test push notification to current user");
      
      // Get the current user's push token
      const { data: tokenData, error: tokenError } = await supabase
        .from('user_push_tokens')
        .select('token')
        .eq('user_id', session.user.id);
        
      if (tokenError) {
        addLog("❌ Error fetching user push token: " + tokenError.message);
        return;
      }
      
      addLog("📋 Token query result: " + JSON.stringify(tokenData));
      
      if (tokenData && tokenData.length > 0) {
        const token = tokenData[0].token;
        addLog("✅ Found push token for current user: " + token);
        
        // Send a test notification
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: token,
            title: "Test Notification",
            body: "This is a test push notification",
            data: { type: 'test' },
            sound: 'default',
            badge: 1,
          }),
        });
        
        if (!response.ok) {
          addLog("❌ Test push notification API error: " + response.status);
          const errorText = await response.text();
          addLog("❌ Error response: " + errorText);
        } else {
          const result = await response.json();
          addLog("✅ Test push notification sent successfully: " + JSON.stringify(result));
        }
      } else {
        addLog("❌ No push token found for current user");
      }
    } catch (error) {
      addLog("❌ Exception: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };
  
  const checkAllTokens = async () => {
    setLoading(true);
    try {
      addLog("🔄 Checking all tokens in the database");
      
      const { data, error } = await supabase
        .from('user_push_tokens')
        .select('*');
        
      if (error) {
        addLog("❌ Error checking all tokens: " + error.message);
      } else {
        addLog("📋 All tokens: " + JSON.stringify(data));
      }
    } catch (error) {
      addLog("❌ Exception: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };
  
  const checkTablePermissions = async () => {
    setLoading(true);
    try {
      addLog("🔄 Checking table permissions...");
      
      // Try to get the definition of the user_push_tokens table
      const { data: tableInfo, error: tableError } = await supabase
        .rpc('get_table_definition', { table_name: 'user_push_tokens' });
        
      if (tableError) {
        addLog("❌ Error getting table definition: " + tableError.message);
        
        // Try a direct query to see if we can access the table at all
        const { data, error } = await supabase
          .from('user_push_tokens')
          .select('count(*)', { count: 'exact', head: true });
          
        if (error) {
          addLog("❌ Error accessing table: " + error.message);
        } else {
          addLog("✅ Table access successful, count: " + data);
        }
      } else {
        addLog("✅ Table definition: " + JSON.stringify(tableInfo));
      }
      
      // Try to insert a test token
      const testToken = "ExponentPushToken[test" + Date.now() + "]";
      addLog("🔄 Trying to insert test token: " + testToken);
      
      const { data: insertData, error: insertError } = await supabase
        .from('user_push_tokens')
        .insert({
          user_id: session?.user?.id,
          token: testToken,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();
        
      if (insertError) {
        addLog("❌ Error inserting test token: " + insertError.message);
      } else {
        addLog("✅ Test token inserted: " + JSON.stringify(insertData));
      }
      
      // Check if the token was inserted
      const { data: checkData, error: checkError } = await supabase
        .from('user_push_tokens')
        .select('*')
        .eq('token', testToken);
        
      if (checkError) {
        addLog("❌ Error checking test token: " + checkError.message);
      } else {
        addLog("✅ Check result: " + JSON.stringify(checkData));
      }
    } catch (error) {
      addLog("❌ Exception: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };
  
  const sendDirectNotification = async () => {
    setLoading(true);
    try {
      // Use the token from your screenshot
      const hardcodedToken = "ExponentPushTokenIyeooavPMGZOPhNE";
      addLog("🔄 Sending direct notification to hardcoded token: " + hardcodedToken);
      
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: hardcodedToken,
          title: "Direct Test",
          body: "This is a direct test notification",
          data: { type: 'test' },
          sound: 'default',
          badge: 1,
        }),
      });
      
      if (!response.ok) {
        addLog("❌ Direct notification API error: " + response.status);
        const errorText = await response.text();
        addLog("❌ Error response: " + errorText);
      } else {
        const result = await response.json();
        addLog("✅ Direct notification sent successfully: " + JSON.stringify(result));
      }
    } catch (error) {
      addLog("❌ Exception: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };
  
  // Add this function to check the user ID format
  const checkUserIdFormat = async () => {
    if (!session?.user?.id) {
      addLog("❌ No user session");
      return;
    }
    
    setLoading(true);
    try {
      addLog("🔄 Checking user ID format...");
      addLog("User ID: " + session.user.id);
      addLog("User ID type: " + typeof session.user.id);
      addLog("User ID length: " + session.user.id.length);
      addLog("User ID character codes: " + [...session.user.id].map(c => c.charCodeAt(0)).join(', '));
      
      // Check if the ID is in the database
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id);
        
      if (error) {
        addLog("❌ Error checking profile: " + error.message);
      } else {
        addLog("✅ Profile found: " + JSON.stringify(data));
      }
      
      // Check all tokens
      const { data: tokens, error: tokensError } = await supabase
        .from('user_push_tokens')
        .select('*');
        
      if (tokensError) {
        addLog("❌ Error checking tokens: " + tokensError.message);
      } else {
        addLog("✅ All tokens: " + JSON.stringify(tokens));
        
        // Check if any token matches the current user
        const userToken = tokens.find(t => t.user_id === session.user.id);
        addLog("User token found: " + (userToken ? "Yes" : "No"));
        
        if (userToken) {
          addLog("User token: " + JSON.stringify(userToken));
        }
      }
    } catch (error) {
      addLog("❌ Error: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#000' : '#fff' }]}>
      <Stack.Screen 
        options={{
          title: 'Push Notification Test',
          headerStyle: {
            backgroundColor: isDarkMode ? '#000' : '#fff',
          },
          headerTintColor: isDarkMode ? '#fff' : '#000',
        }}
      />
      
      <View style={styles.buttonContainer}>
        <Button 
          title="Register Push Token" 
          onPress={registerPushToken} 
          disabled={loading}
        />
        <Button 
          title="Send Test Notification" 
          onPress={sendTestPushNotification} 
          disabled={loading}
        />
        <Button 
          title="Check All Tokens" 
          onPress={checkAllTokens} 
          disabled={loading}
        />
        <Button 
          title="Check Table Permissions" 
          onPress={checkTablePermissions} 
          disabled={loading}
        />
        <Button 
          title="Send Direct Notification" 
          onPress={sendDirectNotification} 
          disabled={loading}
        />
        <Button 
          title="Check User ID Format" 
          onPress={checkUserIdFormat} 
          disabled={loading}
        />
        <Button 
          title="Show Current Token" 
          onPress={showCurrentToken} 
          disabled={loading}
        />
      </View>
      
      {loading && (
        <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />
      )}
      
      <Text style={[styles.logsTitle, { color: isDarkMode ? '#fff' : '#000' }]}>
        Logs:
      </Text>
      
      <ScrollView style={styles.logsContainer}>
        {logs.map((log, index) => (
          <Text key={index} style={[styles.logText, { color: isDarkMode ? '#fff' : '#000' }]}>
            {log}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  loader: {
    marginVertical: 20,
  },
  logsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  logsContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
  },
  logText: {
    fontSize: 14,
    marginBottom: 10,
  },
});