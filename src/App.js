import React from 'react';
import VoiceButton from './VoiceButton';

function App() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#f0f0f0',
      padding: '20px'
    }}>
      <VoiceButton />
    </div>
  );
}

export default App;