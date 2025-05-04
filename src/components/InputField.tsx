import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  StyleSheet, 
  TextInputProps,
  Animated,
  Easing
} from 'react-native';

interface InputFieldProps extends TextInputProps {
  containerStyle?: any;
}

const InputField: React.FC<InputFieldProps> = ({ 
  containerStyle, 
  onFocus,
  onBlur,
  ...props 
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [underlineWidth] = useState(new Animated.Value(0));

  const handleFocus = (e: any) => {
    setIsFocused(true);
    Animated.timing(underlineWidth, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    Animated.timing(underlineWidth, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
    onBlur?.(e);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <TextInput
        style={[
          styles.input,
          isFocused && styles.inputFocused
        ]}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholderTextColor="#A0AEC0"
        {...props}
      />
      <Animated.View 
        style={[
          styles.underline,
          {
            width: underlineWidth.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%']
            })
          }
        ]} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  input: {
    height: 40,
    fontSize: 14,
    color: '#1A1A1A',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  inputFocused: {
    backgroundColor: '#FFFFFF',
  },
  underline: {
    position: 'absolute',
    bottom: 0,
    height: 2,
    backgroundColor: '#1499D9',
    left: 0,
    right: 0,
  },
});

export default InputField;
