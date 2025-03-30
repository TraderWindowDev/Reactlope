import React from 'react';
import { WebView } from 'react-native-webview';
import { View, StyleSheet } from 'react-native';

export default function TermsOfServiceScreen() {
  return (
    <View style={styles.container}>
      <WebView source={{ uri: 'https://lopeprat.no/terms-and-conditions' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 