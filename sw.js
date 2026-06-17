<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Assistente Local LiteRT / MediaPipe</title>
    <style>
        body { font-family: Arial, sans-serif; background: #1e1e1e; color: #fff; padding: 20px; }
        #status-bar { padding: 12px; margin-bottom: 15px; background: #2a2a2a; border-left: 5px solid #ffa500; font-weight: bold; color: #ffa500; }
        #chat { height: 350px; overflow-y: auto; border: 1px solid #444; padding: 10px; margin-bottom: 10px; background: #121212; }
        #input { width: 75%; padding: 10px; background: #333; color: #fff; border: 1px solid #555; }
        button { padding: 10px 20px; background: #007acc; color: white; border: none; cursor: pointer; }
        button:disabled, input:disabled { background: #555; cursor: not-allowed; }
        .setup { margin-bottom: 20px; padding: 10px; background: #2a2a2a; border-radius: 5px; }
    </style>
</head>
<body>

    <h2>Assistente IA Offline (Gemma-4)</h2>
    
    <div id="status-bar">Status: Verificando compatibilidade do navegador...</div>

    <div class="setup">
        <label>Selecione o arquivo do seu PC:</label><br><br>
        <input type="file" id="modelFile" accept=".task">
    </div>

    <div id="chat">Nenhum modelo carregado no momento.</div>
    <input type="text" id="input" placeholder="Digite sua mensagem..." disabled>
    <button id="send" disabled>Enviar</button>

    <script>
        window.addEventListener('error', function(e) {
            const status = document.getElementById('status-bar');
            status.style.borderLeftColor = "#ff0000";
            status.style.color = "#ff0000";
            if (window.location.protocol === 'file:') {
                status.innerText = "Erro: O arquivo foi aberto via 'file://'. Você precisa rodar um servidor local (localhost).";
            } else {
                status.innerText = "Erro de Script: " + e.message;
            }
        });
    </script>

    <script type="module">
        import { FilesetResolver, LlmInference } from 'https://cdn.jsdelivr.net/npm/@google/mediapipe-tasks-genai@0.10.14';

        const fileInput = document.getElementById('modelFile');
        const statusBar = document.getElementById('status-bar');
        const chatDiv = document.getElementById('chat');
        const inputEl = document.getElementById('input');
        const sendBtn = document.getElementById('send');
        let llmInference;

        // Atualiza o status inicial se o ambiente estiver correto
        if (window.location.protocol !== 'file:') {
            statusBar.innerText = "Status: Pronto para receber o arquivo do modelo (.task).";
        }

        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Feedback visual imediato ao clicar
            fileInput.disabled = true;
            statusBar.style.borderLeftColor = "#ffa500";
            statusBar.style.color = "#ffa500";
            statusBar.innerText = `Status: Extraindo bytes de "${file.name}"...`;
            chatDiv.innerHTML = "<p><i>Processando arquivo local...</i></p>";

            try {
                const arrayBuffer = await file.arrayBuffer();
                const modelBuffer = new Uint8Array(arrayBuffer);
                
                statusBar.innerText = "Status: Carregando dependências WebAssembly da Google (WASM)...";

                const genAiFileset = await FilesetResolver.forGenAiTasks(
                    'https://cdn.jsdelivr.net/npm/@google/mediapipe-tasks-genai@0.10.14/wasm'
                );

                statusBar.innerText = "Status: Inicializando a WebGPU e alocando o modelo na placa de vídeo...";

                llmInference = await LlmInference.createFromOptions(genAiFileset, {
                    baseOptions: { modelAssetBuffer: modelBuffer },
                    maxTokens: 2048,
                    topK: 40,
                    temperature: 0.7
                });

                statusBar.style.borderLeftColor = "#00ff00";
                statusBar.style.color = "#00ff00";
                statusBar.innerText = "Status: Pronto! IA carregada com sucesso. Você pode desconectar a internet.";
                chatDiv.innerHTML = "<p style='color:#00ff00;'><b>Sistema:</b> Modelo pronto para uso local.</p>";
                
                inputEl.disabled = false;
                sendBtn.disabled = false;
                inputEl.focus();

            } catch (error) {
                statusBar.style.borderLeftColor = "#ff0000";
                statusBar.style.color = "#ff0000";
                statusBar.innerText = "Status: Falha ao alocar o modelo.";
                chatDiv.innerHTML = `<p style="color:red"><b>Erro na inicialização:</b> ${error.message}<br><br>
                <i>Nota: Se o erro mencionar 'WebGPU', verifique se o seu navegador está com a aceleração de hardware ativa nas configurações.</i></p>`;
                fileInput.disabled = false;
            }
        });

        async function sendMessage() {
            const text = inputEl.value.trim();
            if (!text || !llmInference) return;

            chatDiv.innerHTML += `<p><b>Você:</b> ${text}</p>`;
            inputEl.value = '';

            const responseDiv = document.createElement('p');
            responseDiv.innerHTML = '<b>IA:</b> ';
            chatDiv.appendChild(responseDiv);
            chatDiv.scrollTop = chatDiv.scrollHeight;

            inputEl.disabled = true;
            sendBtn.disabled = true;

            try {
                await llmInference.generateResponse(text, (partialText, done) => {
                    responseDiv.innerHTML = `<b>IA:</b> ${partialText}`;
                    chatDiv.scrollTop = chatDiv.scrollHeight;

                    if (done) {
                        inputEl.disabled = false;
                        sendBtn.disabled = false;
                        inputEl.focus();
                    }
                });
            } catch (error) {
                responseDiv.innerHTML += `<span style="color:red;"><br>Erro na geração: ${error.message}</span>`;
                inputEl.disabled = false;
                sendBtn.disabled = false;
            }
        }

        sendBtn.addEventListener('click', sendMessage);
        inputEl.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
    </script>
</body>
</html>