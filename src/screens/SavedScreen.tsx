import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const SavedScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>저장고 페이지입니다</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default SavedScreen;
