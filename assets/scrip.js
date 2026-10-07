        const WORKER_URL = 'https://workers.dev';

        const micBtn = document.getElementById('micBtn');
        const searchContainer = document.getElementById('searchContainer');
        const statusText = document.getElementById('statusText');
        const resultCard = document.getElementById('resultCard');
        
        let mediaRecorder;
        let audioChunks = [];
        let isRecording = false;

        micBtn.addEventListener('click', () => {
            if (!isRecording) startRecording();
            else stopRecording();
        });

        async function startRecording() {
            audioChunks = [];
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                
                mediaRecorder.ondataavailable = (event) => audioChunks.push(event.data);
                mediaRecorder.onstop = async () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/mp4' });
                    enviarParaOWorker(audioBlob);
                };

                mediaRecorder.start();
                isRecording = true;
                searchContainer.classList.add('recording');
                statusText.innerText = 'Estou ouvindo... 🌸';
                resultCard.style.display = 'none';

                setTimeout(() => {
                    if (isRecording) stopRecording();
                }, 8000);

            } catch (err) {
                statusText.innerText = 'Ative o microfone para usarmos o Ritmo!';
            }
        }

        function stopRecording() {
            if (mediaRecorder && isRecording) {
                mediaRecorder.stop();
                mediaRecorder.stream.getTracks().forEach(track => track.stop());
                isRecording = false;
                searchContainer.classList.remove('recording');
                statusText.innerText = 'Buscando a melodia... ✨';
            }
        }

        async function enviarParaOWorker(audioBlob) {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'sample.mp4');

            try {
                const response = await fetch(WORKER_URL, { method: 'POST', body: formData });
                const data = await response.json();
                exibirResultado(data);
            } catch (error) {
                statusText.innerText = 'Houve um probleminha na conexão.';
            }
        }

        function exibirResultado(data) {
            if (data.status && data.status.code === 0 && data.metadata && data.metadata.music) {
                const musica = data.metadata.music[0];
                document.getElementById('trackTitle').innerText = musica.title;
                document.getElementById('trackArtist').innerText = musica.artists.map(a => a.name).join(', ');
                document.getElementById('trackAlbum').innerText = `${musica.album.name} (${musica.release_date || 'Ano N/I'})`;
                
                statusText.innerText = 'Encontrei! 🎉';
                resultCard.style.display = 'block';
            } else {
                statusText.innerText = 'Não reconheci essa... vamos tentar de novo? ☕';
                resultCard.style.display = 'none';
            }
        }
