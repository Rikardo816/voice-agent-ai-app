async function testElevenLabs(text) {
    // const voiceId = 'lLvK2ms6OhuRjFMnSQ9a'; // ID de la voz "Rachel"
    // const apiKey = "APIKEY"; 

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'xi-api-key': apiKey
        },
        body: JSON.stringify({
            text: text,
            model_id: "eleven_turbo_v2",
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.5
            }
        })
    };

    try {
        console.log('Enviando solicitud a ElevenLabs...');
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, options);

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
        }

        console.log('Respuesta recibida, creando audio...');
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        audio.onended = () => {
            console.log('Audio terminado');
            URL.revokeObjectURL(audioUrl);
        };

        console.log('Reproduciendo audio...');
        await audio.play();
    } catch (error) {
        console.error("Error al generar o reproducir audio:", error);
    }
}

export { testElevenLabs };

