import * as React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

interface Props {
  size?: number;
}

const DefaultVoteImage: React.FC<Props> = ({ size = 60 }) => {
  return (
    <View style={{ width: size, height: size, backgroundColor: '#F7FAFC', borderRadius: 12, padding: 12 }}>
      <Svg width="100%" height="100%" viewBox="0 0 24 24" fill="none">
        <Path
          d="M18 20V10"
          stroke="#A0AEC0"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M12 20V4"
          stroke="#A0AEC0"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M6 20V14"
          stroke="#A0AEC0"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
};

export default DefaultVoteImage; 