import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const CreatePostScreen = () => {
  const [text, setText] = useState('');
  const navigation = useNavigation();

  const handlePost = () => {
    console.log('New post:', text);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="What's on your mind?"
        value={text}
        onChangeText={setText}
      />
      <Button title="Post" onPress={handlePost} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5 },
});

export default CreatePostScreen;
