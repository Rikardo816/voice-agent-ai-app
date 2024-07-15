import React, { useState, useEffect, useCallback, useRef } from 'react';

function VoiceButton() {
  const [buttonState, setButtonState] = useState('idle'); // 'idle', 'listening', 'processing', 'ready'
  const [transcript, setTranscript] = useState('');
  const [serverResponse, setServerResponse] = useState('');
  const [recognition, setRecognition] = useState(null);
  const socketRef = useRef(null);
  const sessionId = useRef(Date.now());
  const conversationId = useRef(1);

  const connectWebSocket = useCallback(() => {
    if (socketRef.current) return;

    const ws = new WebSocket(`ws://localhost:8001/ws/${sessionId.current}/${conversationId.current}`);

    ws.onopen = () => {
      console.log('WebSocket Conectado');
      setButtonState('ready');
    };

    ws.onmessage = (event) => {
      const response = event.data;
      console.log('Texto recibido del servidor:', response);
      setServerResponse(response);
      speakServerResponse(response);
      setButtonState('ready');
    };

    ws.onerror = (error) => {
      console.error('Error de WebSocket:', error);
      setButtonState('idle');
    };

    ws.onclose = () => {
      console.log('WebSocket Desconectado');
      setButtonState('idle');
      socketRef.current = null;
    };

    socketRef.current = ws;
  }, []);

  const disconnectWebSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setButtonState('idle');
  }, []);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'es-ES';

      recognitionInstance.onresult = (event) => {
        const current = event.resultIndex;
        const transcriptEvent = event.results[current][0].transcript;
        setTranscript(transcriptEvent);
        console.log('Texto reconocido:', transcriptEvent);

        if (event.results[current].isFinal) {
          console.log('Resultado final detectado. Enviando al servidor...');
          sendMessageToServer(transcriptEvent);
          setButtonState('processing');
        }
      };

      recognitionInstance.onend = () => {
        if (buttonState === 'listening') {
          setButtonState('processing');
        }
      };

      recognitionInstance.onerror = (event) => {
        console.error('Error en el reconocimiento de voz:', event.error);
        setButtonState('ready');
      };

      setRecognition(recognitionInstance);
    } else {
      console.error('El reconocimiento de voz no está soportado en este navegador.');
    }

    return () => {
      disconnectWebSocket();
    };
  }, [disconnectWebSocket]);

  const sendMessageToServer = useCallback((message) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const payload = JSON.stringify({ message: message });
      socketRef.current.send(payload);
      console.log('Mensaje enviado al servidor:', payload);
    } else {
      console.error('WebSocket no está listo.');
    }
  }, []);

  const handleButtonClick = useCallback(() => {
    if (buttonState === 'idle') {
      connectWebSocket();
    } else if (buttonState === 'ready') {
      recognition.start();
      setButtonState('listening');
    } else if (buttonState === 'listening') {
      recognition.stop();
      setButtonState('processing');
    } else if (buttonState === 'processing') {
      // No hacer nada, esperando respuesta del servidor
    } else {
      disconnectWebSocket();
    }
  }, [buttonState, connectWebSocket, disconnectWebSocket, recognition]);

  const speakServerResponse = (text) => {
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = 'es-ES';
    window.speechSynthesis.speak(speech);
  };

  const getButtonColor = () => {
    switch (buttonState) {
      case 'idle': return 'grey';
      case 'ready': return 'green';
      case 'listening': return 'red';
      case 'processing': return 'orange';
      default: return 'grey';
    }
  };

  const getButtonText = () => {
    switch (buttonState) {
      case 'idle': return 'Conectar';
      case 'ready': return 'Hablar';
      case 'listening': return 'Detener';
      case 'processing': return 'Procesando...';
      default: return 'Conectar';
    }
  };

  return (
    <div>
      <button
        onClick={handleButtonClick}
        style={{
          padding: '20px',
          fontSize: '24px',
          borderRadius: '50%',
          border: 'none',
          background: getButtonColor(),
          color: 'white',
          cursor: buttonState === 'processing' ? 'not-allowed' : 'pointer'
        }}
      >
        {getButtonText()}
      </button>
      <div>
        <h3>Texto reconocido:</h3>
        <p>{transcript}</p>
      </div>
      <div>
        <h3>Respuesta del servidor:</h3>
        <p>{serverResponse}</p>
      </div>
    </div>
  );
}

export default VoiceButton;