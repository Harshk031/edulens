/**
 * EduLens Hybrid - Central Theme Configuration
 * Modern design system with neon green branding
 */

export const theme = {
  colors: {
    // Primary Brand Colors
    primary: '#00FF9C',
    primaryLight: '#33FFA8',
    primaryDark: '#00CC7D',
    
    // Background Gradients
    bgPrimary: '#0A0E0C',
    bgSecondary: '#050605',
    bgGradient: 'linear-gradient(135deg, #0A0E0C 0%, #050605 100%)',
    
    // Accent Colors
    accent: '#00E5CC',
    accentSecondary: '#00B8A9',
    
    // Semantic Colors
    success: '#00FF9C',
    error: '#FF6B6B',
    warning: '#FFB800',
    info: '#00E5FF',
    
    // Neutral Colors
    white: '#FFFFFF',
    gray100: '#F5F5F5',
    gray200: '#E0E0E0',
    gray300: '#BDBDBD',
    gray400: '#9E9E9E',
    gray500: '#757575',
    gray600: '#616161',
    gray700: '#424242',
    gray800: '#303030',
    gray900: '#212121',
    
    // Glass Morphism
    glassBg: 'rgba(255, 255, 255, 0.05)',
    glassBorder: 'rgba(0, 255, 156, 0.2)',
    glassHover: 'rgba(0, 255, 156, 0.1)',
  },
  
  typography: {
    fontFamily: {
      primary: '"Inter Variable", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      secondary: '"Outfit", "Inter", sans-serif',
      mono: '"Fira Code", "Consolas", monospace',
    },
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem',// 30px
      '4xl': '2.25rem', // 36px
      '5xl': '3rem',    // 48px
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  
  spacing: {
    xs: '0.5rem',   // 8px
    sm: '0.75rem',  // 12px
    md: '1rem',     // 16px
    lg: '1.5rem',   // 24px
    xl: '2rem',     // 32px
    '2xl': '3rem',  // 48px
    '3xl': '4rem',  // 64px
  },
  
  borderRadius: {
    sm: '0.5rem',   // 8px
    md: '0.75rem',  // 12px
    lg: '1rem',     // 16px
    xl: '1.25rem',  // 20px
    '2xl': '1.5rem',// 24px
    full: '9999px',
  },
  
  shadows: {
    sm: '0 2px 8px rgba(0, 0, 0, 0.15)',
    md: '0 4px 16px rgba(0, 0, 0, 0.2)',
    lg: '0 8px 24px rgba(0, 0, 0, 0.25)',
    xl: '0 12px 32px rgba(0, 0, 0, 0.3)',
    neon: '0 0 20px rgba(0, 255, 156, 0.3)',
    neonHover: '0 0 30px rgba(0, 255, 156, 0.5)',
  },
  
  blur: {
    sm: '10px',
    md: '20px',
    lg: '30px',
  },
  
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
  
  breakpoints: {
    mobile: '320px',
    tablet: '768px',
    desktop: '1024px',
    wide: '1440px',
  },
};

export default theme;
