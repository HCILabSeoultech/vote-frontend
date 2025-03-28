import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const MainScreen: React.FC = () => (
  <View style={styles.container}>
    <Text style={styles.text}>메인 페이지</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
  },
  text: {
    fontSize: 24,
  },
});

export default MainScreen;
