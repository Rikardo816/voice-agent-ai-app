import React, { useState, useEffect, useCallback, useRef } from 'react';

function VoiceButton() {
  const [buttonState, setButtonState] = useState('idle'); // 'idle', 'listening', 'processing', 'ready'
  const [transcript, setTranscript] = useState('');
  const [serverResponse, setServerResponse] = useState('');
  const recognitionRef = useRef(null);
  const socketRef = useRef(null);
  const sessionId = useRef(Date.now());
  const conversationId = useRef(1);

  const initializeSpeechRecognition = useCallback(() => {
    console.log('Inicializando reconocimiento de voz...');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition && !recognitionRef.current) {
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
          console.log('Reconocimiento de voz terminado');
          setButtonState('processing');
        }
      };

      recognitionInstance.onerror = (event) => {
        console.error('Error en el reconocimiento de voz:', event.error);
        setButtonState('ready');
      };

      recognitionRef.current = recognitionInstance;
      console.log('Speech Recognition inicializado');
    } else if (!SpeechRecognition) {
      console.error('El reconocimiento de voz no está soportado en este navegador.');
    }
  }, []);


  const connectWebSocket = useCallback(() => {
    if (socketRef.current) return;
    
    setButtonState('connecting');
    const ws = new WebSocket(`ws://localhost:8001/ws/${sessionId.current}/${conversationId.current}`);

    ws.onopen = () => {
      console.log('WebSocket Conectado');
      socketRef.current = ws;
      sendInitialMessage();
    };

    ws.onmessage = (event) => {
      const response = event.data;
      console.log('Texto recibido del servidor:', response);
      setServerResponse(response);
      setButtonState('processing');
      speakServerResponse(response);
    };

    ws.onerror = (error) => {
      console.error('Error de WebSocket:', error);
      setButtonState('idle');
    };

    ws.onclose = (event) => {
      console.log('WebSocket Desconectado', event.code, event.reason);
      setButtonState('idle');
      socketRef.current = null;
    };

  }, []);

  const sendInitialMessage = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const payload = JSON.stringify({ message: "Hola que tal?" });
      socketRef.current.send(payload);
      console.log('Mensaje inicial enviado al servidor:', payload);
      setButtonState('processing');
      console.log('Estado cambiado a processing después de enviar mensaje inicial');
    } else {
      console.error('WebSocket no está listo para enviar el mensaje inicial.');
    }
  }, []);


  const startListening = useCallback(() => {
    console.log('Intentando iniciar reconocimiento de voz');
    console.log('recognitionRef.current', recognitionRef.current);
    console.log('buttonState', buttonState);
    if (recognitionRef.current && buttonState === 'ready') {
      setButtonState('listening');
      recognitionRef.current.start();
      console.log('Reconocimiento de voz iniciado');
    } else {
      console.error('Recognition no está inicializado o el estado no es correcto');
    }
  }, [buttonState]);

  useEffect(() => {
    console.log('Llamando a initializeSpeechRecognition');
    initializeSpeechRecognition();
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [initializeSpeechRecognition]);

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
    }
  }, [buttonState, connectWebSocket]);

  const speakServerResponse = (text) => {
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = 'es-ES';
    speech.onend = () => {
      console.log('Reproducción de audio terminada');
      console.log('Cambiando estado a ready');
      setButtonState('ready');
    };
    window.speechSynthesis.speak(speech);
  };

  useEffect(() => {
    if (buttonState === 'ready') {
      console.log('Estado cambiado a ready, iniciando reconocimiento de voz');
      startListening();
    }
  }, [buttonState, startListening]);

  useEffect(() => {
    console.log('buttonState cambiado a:', buttonState);
  }, [buttonState]);

  const getButtonColor = () => {
    switch (buttonState) {
      case 'idle': return 'grey';
      case 'connecting': return 'yellow';
      case 'listening': return 'red';
      case 'processing': return 'orange';
      case 'ready': return 'green';
      default: return 'grey';
    }
  };

  const getButtonText = () => {
    switch (buttonState) {
      case 'idle': return 'Conectar';
      case 'connecting': return 'Conectando...';
      case 'listening': return 'Escuchando...';
      case 'processing': return 'Procesando...';
      case 'ready': return 'Listo';
      default: return 'Conectar';
    }
  };

  return (
    <div>
      <button
        onClick={handleButtonClick}
        disabled={buttonState !== 'idle'}
        style={{
          padding: '20px',
          fontSize: '24px',
          borderRadius: '50%',
          border: 'none',
          background: getButtonColor(),
          color: 'white',
          cursor: buttonState === 'idle' ? 'pointer' : 'not-allowed'
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