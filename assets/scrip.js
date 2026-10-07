const WORKER_URL = 'https://workers.dev';

const micBtn = document.getElementById('micBtn');
const searchContainer = document.getElementById('searchContainer');
const statusText = document.getElementById('statusText');
const resultCard = document.getElementById('resultCard');

let mediaRecorder;
let audioChunks = [];
let isRecording = false;

// Descobre o formato de áudio suportado pelo navegador atual
function getSupportedMimeType() {
    const types = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/aac'
    ];
    for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) {
            return type;
        }
    }
    return ''; // Padrão do navegador se nenhum da lista for específico
}

micBtn.addEventListener('click', async () => {
    if (!isRecording) {
        await startRecording();
    } else {
        stopRecording();
    }
});

async function startRecording() {
    audioChunks = [];

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        statusText.innerText = 'Acesso ao microfone indisponível ou necessita de HTTPS.';
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        const mimeType = getSupportedMimeType();
        const options = mimeType ? { mimeType } : {};
        
        mediaRecorder = new MediaRecorder(stream, options);

        mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = async () => {
            // Usa o mesmo mimeType detectado ou o padrão gerado pelo recorder
            const finalMimeType = mediaRecorder.mimeType || 'audio/webm';
            const audioBlob = new Blob(audioChunks, { type: finalMimeType });
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
        isRecording = false;
        searchContainer.classList.remove('recording');

        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            alert('Acesso ao microfone negado. Clique no ícone de permissões/cadeado na barra do navegador para liberar.');
            statusText.innerText = 'Permissão do microfone negada.';
        } else {
            statusText.innerText = 'Ative o microfone para usarmos o Ritmo!';
        }
    }
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        isRecording = false;
        searchContainer.classList.remove('recording');
        statusText.innerText = 'Buscando a melodia... ✨';

        if (mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        
        if (mediaRecorder.stream) {
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
    }
}

async function enviarParaOWorker(audioBlob) {
    const formData = new FormData();
    // Envia a extensão dinâmica conforme o Blob gerado
    const extension = audioBlob.type.includes('mp4') ? 'mp4' : 'webm';
    formData.append('audio', audioBlob, `sample.${extension}`);

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