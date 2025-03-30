import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';

export default function NotificationsSettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const toggleNotifications = () => {
    setNotificationsEnabled(!notificationsEnabled);
    // Implement logic to enable/disable notifications
  };

  return (
    <View style={styles.container}>
      <Text>Notifications</Text>
      <View style={styles.setting}>
        <Text>Enable Notifications</Text>
        <Switch
          value={notificationsEnabled}
          onValueChange={toggleNotifications}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  setting: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
});