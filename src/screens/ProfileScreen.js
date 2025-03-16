import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ProfileScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.name}>John Doe</Text>
      <Text>Email: johndoe@example.com</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 20, fontWeight: 'bold' },
});

export default ProfileScreen;
