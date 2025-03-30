import React from 'react';
import { WebView } from 'react-native-webview';
import { View, StyleSheet } from 'react-native';

export default function PrivacyPolicyScreen() {
  return (
    <View style={styles.container}>
      <WebView source={{ uri: 'https://lopeprat.no/privacy-policy' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 