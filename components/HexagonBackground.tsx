import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';
import Svg, { Path } from 'react-native-svg';

export const HexagonBackground = ({ children }: { children: React.ReactNode }) => {
  const { width, height } = useWindowDimensions();
  const { isDarkMode } = useTheme();
  
  const hexSize = 30; // Made smaller
  const hexagonPath = `
    M ${hexSize} 0
    l ${hexSize * 0.866} ${hexSize * 0.5}
    l 0 ${hexSize}
    l -${hexSize * 0.866} ${hexSize * 0.5}
    l -${hexSize * 0.866} -${hexSize * 0.5}
    l 0 -${hexSize}
    z
  `;

  return (
    <View style={styles.container}>
      <View style={[
        styles.background,
        { backgroundColor: isDarkMode ? '#121212' : '#ffffff' }
      ]}>
        <Svg style={[styles.pattern, { width, height }]}>
          {Array.from({ length: 200 }).map((_, index) => {
            const row = Math.floor(index / 10);
            const col = index % 10;
            const x = col * hexSize * 1.732 + (row % 2) * (hexSize * 0.866);
            const y = row * hexSize * 1.5;

            return (
              <Path
                key={index}
                d={hexagonPath}
                transform={`translate(${x}, ${y})`}
                fill="none"
                stroke={isDarkMode ? '#222222' : '#f0f0f0'}
                strokeWidth="1.5"
              />
            );
          })}
        </Svg>
      </View>
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  pattern: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  content: {
    flex: 1,
  }
});
