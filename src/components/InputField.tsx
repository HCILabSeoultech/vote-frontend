import React from 'react';
import { TextInput, View, StyleSheet, TextInputProps } from 'react-native';

type InputFieldProps = TextInputProps & {
  value: string;
  onChangeText: (text: string) => void;
};

const InputField: React.FC<InputFieldProps> = ({
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  ...rest
}) => {
  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        {...rest} // autoCapitalize, autoComplete 등 여기로 전달됨
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    width: '100%',
  },
});

export default InputField;
