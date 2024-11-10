import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createAudioStreamFromText } from './elevenlabsTest';
import { testElevenLabs } from './elevenlabs';

function VoiceButton() {
  // const [buttonState, setButtonState] = useState('idle'); // 'idle', 'listening', 'processing', 'ready'
  const [buttonState, setButtonState] = useState('idle'); // 'idle', 'initializing', 'connecting', 'listening', 'processing', 'ready'
  const [transcript, setTranscript] = useState('');
  const [serverResponse, setServerResponse] = useState('');
  const recognitionRef = useRef(null);
  const speechSynthesisRef = useRef(null);
  const socketRef = useRef(null);
  const sessionId = useRef(Date.now());
  const [audioElement, setAudioElement] = useState(null);
  const conversationId = useRef(1);
  const DESPEDIDAS = ['adiós', 'hasta luego', 'chao', 'bye', 'excelente día', 'ten un buen día', 'Que tengas un buen día'];

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

    setButtonState('initializing');
    const ws = new WebSocket(`ws://localhost:8001/ws/${sessionId.current}/${conversationId.current}`);

    const connectionTimeout = setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        console.error('Tiempo de espera de conexión agotado');
        ws.close();
      }
    }, 5000); // 5 segundos de tiempo de espera

    ws.onopen = () => {
      clearTimeout(connectionTimeout);
      console.log('WebSocket Conectado');
      socketRef.current = ws;
      initializeSpeechRecognition();
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
      clearTimeout(connectionTimeout);
      console.error('Error de WebSocket:', error);
      setButtonState('idle');
    };

    ws.onclose = (event) => {
      clearTimeout(connectionTimeout);
      console.log('WebSocket Desconectado', event.code, event.reason);
      setButtonState('error');
      socketRef.current = null;
    };

  }, [initializeSpeechRecognition]);

  const disconnectWebSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (speechSynthesisRef.current) {
      window.speechSynthesis.cancel();
      speechSynthesisRef.current = null;
    }
    setButtonState('idle');
    setTranscript('');
    setServerResponse('');
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
      setButtonState('idle');
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
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

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
    if (buttonState === 'idle' || buttonState === 'error') {
      connectWebSocket();
    } else if (buttonState !== 'initializing' && buttonState !== 'processing') {
      disconnectWebSocket();
    }
  }, [buttonState, connectWebSocket, disconnectWebSocket]);

  const buttonStreaming = useCallback(() => {
    createAudioStreamFromText("hola soy un auido de una ia de elevenlabs").then((audioStream) => {
      const audio = new Audio(URL.createObjectURL(new Blob([audioStream])));
      audio.play();
    });
  }, [createAudioStreamFromText]);

  const buttonFile = useCallback(() => {
    testElevenLabs("hola soy un audio de una ia de elevenlabs y hablo perfecto español");
  }, []);


  const speakServerResponse = (text) => {

    const auido = testElevenLabs(text);

    auido.finally(() => {
      console.log('Reproducción de audio terminada');
      setButtonState('ready');
    });


    // if (audioElement) {
    //   audioElement.pause();
    //   setAudioElement(null);
    // }
  
    // createAudioStreamFromText(text).then((audioStream) => {
    //   const audio = new Audio(URL.createObjectURL(new Blob([audioStream])));
    //   setAudioElement(audio);
  
    //   audio.onended = () => {
    //     console.log('Reproducción de audio terminada');
    //     setAudioElement(null);
    //     if (DESPEDIDAS.some(despedida => text.toLowerCase().includes(despedida))) {
    //       console.log('Palabra de despedida detectada, desconectando...');
    //       disconnectWebSocket();
    //     } else {
    //       console.log('Cambiando estado a ready');
    //       setButtonState('ready');
    //     }
    //   };
  
    //   audio.play();
    // });
  };

  // const speakServerResponse = (text) => {
  //   if (speechSynthesisRef.current) {
  //     window.speechSynthesis.cancel();
  //   }
  //   const speech = new SpeechSynthesisUtterance(text);
  //   speech.lang = 'es-ES';
  //   speech.onend = () => {
  //     console.log('Reproducción de audio terminada');
  //     speechSynthesisRef.current = null;
  //     if (DESPEDIDAS.some(despedida => text.toLowerCase().includes(despedida))) {
  //       console.log('Palabra de despedida detectada, desconectando...');
  //       disconnectWebSocket();
  //     } else {
  //       console.log('Cambiando estado a ready');
  //       setButtonState('ready');
  //     }
  //   };
  //   speechSynthesisRef.current = speech;
  //   window.speechSynthesis.speak(speech);
  // };

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
      case 'initializing': return 'blue';
      case 'connecting': return 'yellow';
      case 'listening': return 'red';
      case 'processing': return 'orange';
      case 'ready': return 'green';
      case 'error': return 'red';
      default: return 'grey';
    }
  };

  const getButtonText = () => {
    switch (buttonState) {
      case 'idle': return 'Conectar';
      case 'initializing': return 'Iniciando...';
      case 'connecting': return 'Conectando...';
      case 'listening': return 'Detener';
      case 'processing': return 'Procesando...';
      case 'ready': return 'Detener';
      case 'error': return 'Reintentar';
      default: return 'Conectar';
    }
  };

  const ErrorMessage = ({ message }) => (
    <div style={{ color: 'red', marginTop: '10px' }}>
      {message}
    </div>
  );

  return (
    <div>
      <button
        onClick={handleButtonClick}
        disabled={buttonState === 'initializing' || buttonState === 'processing'}
        style={{
          padding: '20px',
          fontSize: '24px',
          borderRadius: '50%',
          border: 'none',
          background: getButtonColor(),
          color: 'white',
          cursor: (buttonState === 'initializing' || buttonState === 'processing') ? 'not-allowed' : 'pointer'
        }}
      >
        {getButtonText()}
      </button>
      {buttonState === 'error' && <ErrorMessage message="Error de conexión. Por favor, intenete nuevamente" />}
      <div>
        <h3>Texto reconocido:</h3>
        <p>{transcript}</p>
      </div>
      <div>
        <h3>Respuesta del servidor:</h3>
        <p>{serverResponse}</p>
      </div>
      <button onClick={buttonStreaming}>Audio-Streaming</button>
      <button onClick={buttonFile}>Audio-File</button>
    </div>
  );
}

export default VoiceButton;