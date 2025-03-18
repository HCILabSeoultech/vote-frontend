import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Button from '../components/Button';

const MainScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vote App</Text>
      <Button title="회원가입" onPress={() => navigation.navigate('Signup')} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});

export default MainScreen;
