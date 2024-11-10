const options = {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: '{"text":"<string>","model_id":"<string>","language_code":"<string>","voice_settings":{"stability":123,"similarity_boost":123,"style":123,"use_speaker_boost":true},"pronunciation_dictionary_locators":[{"pronunciation_dictionary_id":"<string>","version_id":"<string>"}],"seed":123,"previous_text":"<string>","next_text":"<string>","previous_request_ids":["<string>"],"next_request_ids":["<string>"]}'
  };
  
  fetch('https://api.elevenlabs.io/v1/text-to-speech/{voice_id}', options)
    .then(response => response.json())
    .then(response => console.log(response))
    .catch(err => console.error(err));