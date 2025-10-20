import { createConsoleSpy } from '@dogule/testing';
import { useEffect } from 'react';

export const App = () => {
  useEffect(() => {
    const consoleSpy = createConsoleSpy();
    console.log('Web app mounted');
    consoleSpy.restore();
  }, []);

  return <h1>Welcome to Dogule</h1>;
};

export default App;
