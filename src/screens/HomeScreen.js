import React, { useState } from 'react';
import { View, Text, FlatList, Button, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const HomeScreen = () => {
  const navigation = useNavigation();
  const [posts, setPosts] = useState([
    { id: '1', user: 'Alice', content: 'Hello world!' },
    { id: '2', user: 'Bob', content: 'React Native is awesome!' },
  ]);

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.post}>
            <Text style={styles.user}>{item.user}</Text>
            <Text>{item.content}</Text>
          </View>
        )}
      />
      <Button title="Create Post" onPress={() => navigation.navigate('CreatePost')} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  post: { backgroundColor: '#f8f8f8', padding: 10, marginVertical: 5, borderRadius: 5 },
  user: { fontWeight: 'bold' },
});

export default HomeScreen;
