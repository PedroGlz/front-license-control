import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

// Preset visual compartido con ETIC Online.
export default definePreset(Aura, {
  semantic: {
    primary: {
      50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd',
      400: '#60a5fa', 500: '#1753e7', 600: '#1448cc', 700: '#123dae',
      800: '#11358e', 900: '#102f73', 950: '#071426',
    },
  },
});
