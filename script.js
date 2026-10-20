let pixInterval = null;
let customMusicCloudUrl = ""; 
let uploadedPhotoUrls = [];   
let selectedLoveDate = "";    

// URL base do backend no Render (centralizada para evitar erros)
const API_BASE_URL = "https://meu-arquivo.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
    const btnSim = document.getElementById("btn-sim");
    const btnNao = document.getElementById("btn-nao");
    const questionStep = document.getElementById("question-step");
    const surpriseStep = document.getElementById("surprise-step");
    const cardBox = document.querySelector(".card-box");

    const bgMusic = document.getElementById("bg-music");
    const btnPlayMusic = document.getElementById("btn-play-music");
    const musicInput = document.getElementById("music-input");
    const audioStatus = document.getElementById("audio-upload-status");
    const photoInput = document.getElementById("photo-input");
    const loveDateInput = document.getElementById("love-date-input");

    // Acorda o backend no Render em segundo plano
    fetch(`${API_BASE_URL}/api/create-pix`, { method: "OPTIONS" }).catch(() => {});

    // Renderiza as fotos padrão do exemplo logo de início
    renderPhotoTrack([]);

    // Monitora a escolha da data do namoro
    if (loveDateInput) {
        const todayStr = new Date().toISOString().split("T")[0];
        loveDateInput.value = todayStr;
        selectedLoveDate = todayStr;
        startLoveCounter(todayStr);

        loveDateInput.addEventListener("change", (e) => {
            selectedLoveDate = e.target.value;
            startLoveCounter(selectedLoveDate);
        });
    }

    const urlParams = new URLSearchParams(window.location.search);
    
    // Se o link tiver um "id", entra direto no modo de visualização buscando na nuvem
    if (urlParams.has("id")) {
        setupReceiverMode(urlParams);
    }

    // Botão NÃO foge
    if (btnNao) {
        const moveButton = () => {
            const cardRect = cardBox.getBoundingClientRect();
            const btnRect = btnNao.getBoundingClientRect();
            const padding = 20;
            const maxX = cardRect.width - btnRect.width - (padding * 2);
            const maxY = cardRect.height - btnRect.height - (padding * 2);

            const randomX = Math.max(padding, Math.floor(Math.random() * maxX));
            const randomY = Math.max(padding, Math.floor(Math.random() * maxY));

            btnNao.style.position = "absolute";
            btnNao.style.left = `${randomX}px`;
            btnNao.style.top = `${randomY}px`;
        };

        btnNao.addEventListener("mouseover", moveButton);
        btnNao.addEventListener("touchstart", (e) => { e.preventDefault(); moveButton(); });
        btnNao.addEventListener("click", (e) => { e.preventDefault(); moveButton(); });
    }

    // Clique SIM
    if (btnSim) {
        btnSim.addEventListener("click", () => {
            questionStep.classList.add("hidden");
            surpriseStep.classList.remove("hidden");

            if (bgMusic && bgMusic.src) {
                bgMusic.play().catch(e => console.log("Autoplay bloqueado:", e));
                if (btnPlayMusic) btnPlayMusic.innerText = "⏸️ Pausar Música";
            }

            if (typeof confetti === "function") {
                confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
            }
        });
    }

    // Controles de Música
    if (btnPlayMusic && bgMusic) {
        btnPlayMusic.addEventListener("click", () => {
            if (bgMusic.paused) {
                bgMusic.play();
                btnPlayMusic.innerText = "⏸️ Pausar Música";
            } else {
                bgMusic.pause();
                btnPlayMusic.innerText = "▶️ Tocar Música";
            }
        });
    }

    if (musicInput) {
        musicInput.addEventListener("change", async (e) => {
            const file = e.target.files[0];
            if (file) {
                const localUrl = URL.createObjectURL(file);
                bgMusic.src = localUrl;
                bgMusic.play();
                if (btnPlayMusic) btnPlayMusic.innerText = "⏸️ Pausar Música";

                if (audioStatus) {
                    audioStatus.style.display = "block";
                    audioStatus.innerText = "⏳ Salvando sua música na nuvem...";
                }

                try {
                    const formData = new FormData();
                    formData.append("file", file);

                    const response = await fetch("https://tmpfiles.org/api/v1/upload", {
                        method: "POST",
                        body: formData
                    });

                    const result = await response.json();

                    if (response.ok && result.status === "success") {
                        const rawUrl = result.data.url;
                        customMusicCloudUrl = rawUrl.replace("tmpfiles.org/", "tmpfiles.org/dl/");
                        bgMusic.src = customMusicCloudUrl;
                        if (audioStatus) audioStatus.innerText = "✅ Música salva com sucesso na nuvem!";
                    } else {
                        throw new Error("Erro no upload");
                    }
                } catch (err) {
                    console.error("Erro ao subir áudio:", err);
                    if (audioStatus) audioStatus.innerText = "⚠️ Erro ao salvar na nuvem, tocando localmente.";
                }
            }
        });
    }

    // Upload de Fotos para Nuvem (ImgBB)
    if (photoInput) {
        photoInput.addEventListener("change", async (e) => {
            const files = e.target.files;
            if (files && files.length > 0) {
                const cardsGrid = document.getElementById("cards-grid");
                cardsGrid.innerHTML = `<div style="text-align:center; color:#fff; width:100%; padding:20px;">⏳ Enviando fotos para a nuvem...</div>`;
                uploadedPhotoUrls = [];

                const apiKey = "3fb46bc4892a76cb34a6bedd1e905c29";

                const cardsArray = Array.from(files);
                for (let index = 0; index < cardsArray.length; index++) {
                    const file = cardsArray[index];
                    try {
                        const formData = new FormData();
                        formData.append("image", file);

                        const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
                            method: "POST",
                            body: formData
                        });
                        const data = await res.json();

                        if (data.success) {
                            uploadedPhotoUrls.push(data.data.url);
                        } else {
                            console.error("Erro na resposta do ImgBB:", data);
                        }
                    } catch (err) {
                        console.error("Erro na requisição ao ImgBB:", err);
                    }
                }

                if (uploadedPhotoUrls.length > 0) {
                    renderPhotoTrack(uploadedPhotoUrls);
                } else {
                    alert("Não foi possível enviar as fotos. Tente selecionar imagens menores.");
                    renderPhotoTrack([]);
                }
            }
        });
    }

    const btnOpenPix = document.getElementById("btnOpenPix");
    if (btnOpenPix) btnOpenPix.addEventListener("click", generatePixPayment);

    const btnClosePix = document.getElementById("btn-close-pix");
    if (btnClosePix) {
        btnClosePix.addEventListener("click", () => {
            document.getElementById("pix-modal").classList.add("hidden");
            if (pixInterval) clearInterval(pixInterval);
        });
    }

    const btnCopyPix = document.getElementById("btn-copy-pix");
    if (btnCopyPix) {
        btnCopyPix.addEventListener("click", () => {
            const input = document.getElementById("pix-code-input");
            input.select();
            document.execCommand("copy");
            alert("Código Pix copiado!");
        });
    }
});

// MONTA A ESTEIRA DE FOTOS
function renderPhotoTrack(photoUrls) {
    const cardsGrid = document.getElementById("cards-grid");
    if (!cardsGrid) return;

    cardsGrid.innerHTML = "";
    const track = document.createElement("div");
    track.className = "carousel-track";

    const defaultPhotos = [
        'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=500&q=80',
        'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=500&q=80',
        'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=500&q=80'
    ];

    const baseList = (photoUrls && photoUrls.length > 0) ? photoUrls : defaultPhotos;
    const displayList = [...baseList, ...baseList];

    displayList.forEach((photoUrl, index) => {
        const newCard = document.createElement("div");
        newCard.className = "flip-card";
        newCard.innerHTML = `
          <div class="flip-card-inner">
            <div class="flip-card-front" style="background-image: url('${photoUrl}');">
              <div class="card-badge">Nossa Foto ${ (index % baseList.length) + 1 } ❤️</div>
            </div>
            <div class="flip-card-back">
              <p>Você é a razão do meu melhor sorriso! ✨💖</p>
            </div>
          </div>
        `;
        track.appendChild(newCard);
    });

    cardsGrid.appendChild(track);
    setupCardsFlip();
}

// GIRO DO CARTÃO COM CONTROLE DE PAUSA NO CELULAR
function setupCardsFlip() {
    const flipCards = document.querySelectorAll(".flip-card");
    const cardsGrid = document.getElementById("cards-grid");

    flipCards.forEach(card => {
        card.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();

            card.classList.toggle("is-flipped");

            const hasFlipped = document.querySelector(".flip-card.is-flipped");
            if (hasFlipped && cardsGrid) {
                cardsGrid.classList.add("is-paused");
            } else if (cardsGrid) {
                cardsGrid.classList.remove("is-paused");
            }
        };
    });
}

// CONTADOR DE TEMPO
let counterInterval = null;
function startLoveCounter(dateString) {
    const counterEl = document.getElementById("love-counter");
    if (!counterEl || !dateString) return;

    if (counterInterval) clearInterval(counterInterval);

    const startDate = new Date(`${dateString}T00:00:00`);

    counterInterval = setInterval(() => {
        const now = new Date();
        const diff = now - startDate;

        if (isNaN(diff) || diff < 0) {
            counterEl.innerText = "Data futura selecionada ❤️";
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        const seconds = Math.floor((diff / 1000) % 60);

        counterEl.innerText = `${days} dias, ${hours}h ${minutes}m ${seconds}s ❤️`;
    }, 1000);
}

// MODO RECEBEDOR (BUSCA OS DADOS DO SERVIDOR USANDO O ID CURTO)
async function setupReceiverMode(urlParams) {
    const surpriseId = urlParams.get("id");
    if (!surpriseId) return;

    const senderControls = document.getElementById("sender-controls");
    const userMessageInput = document.getElementById("user-message");
    const labelMsg = document.getElementById("label-msg");
    const displayMessage = document.getElementById("display-message");
    const labelPhotoUpload = document.getElementById("label-photo-upload");
    const labelMusicUpload = document.getElementById("label-music-upload");
    const dateInputContainer = document.getElementById("date-input-container");
    const btnOpenPix = document.getElementById("btnOpenPix");
    const btnSendWhatsapp = document.getElementById("btnSendWhatsapp");

    if (senderControls) senderControls.style.display = "none";
    if (userMessageInput) userMessageInput.classList.add("hidden");
    if (labelMsg) labelMsg.style.display = "none";
    if (labelPhotoUpload) labelPhotoUpload.style.display = "none";
    if (labelMusicUpload) labelMusicUpload.style.display = "none";
    if (dateInputContainer) dateInputContainer.style.display = "none";
    if (btnOpenPix) btnOpenPix.style.display = "none";
    if (btnSendWhatsapp) btnSendWhatsapp.style.display = "none";

    if (displayMessage) {
        displayMessage.innerText = "Carregando surpresa com carinho... ❤️";
        displayMessage.classList.remove("hidden");
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/get-surprise/${surpriseId}`);
        const result = await response.json();

        if (result.success && result.data) {
            const data = result.data;

            if (data.message && displayMessage) {
                displayMessage.innerText = data.message;
            }

            if (data.date) {
                startLoveCounter(data.date);
            }

            if (data.music) {
                const bgMusic = document.getElementById("bg-music");
                if (bgMusic) bgMusic.src = data.music;
            }

            if (data.photos && data.photos.length > 0) {
                renderPhotoTrack(data.photos);
            }
        } else {
            if (displayMessage) displayMessage.innerText = "Esta surpresa não foi encontrada ou o link expirou. 💔";
        }
    } catch (err) {
        console.error("Erro ao carregar surpresa:", err);
        if (displayMessage) displayMessage.innerText = "Erro ao carregar os dados da surpresa.";
    }
}

async function generatePixPayment() {
    const btnOpenPix = document.getElementById("btnOpenPix");
    const qrImage = document.getElementById("pix-qr-code");
    const pixInput = document.getElementById("pix-code-input");
    const pixModal = document.getElementById("pix-modal");

    if (btnOpenPix) {
        btnOpenPix.disabled = true;
        btnOpenPix.innerText = "⏳ Gerando Pix, aguarde...";
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/create-pix`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        });

        const data = await response.json();

        if (response.ok && data.payment_id) {
            if (qrImage) qrImage.src = `data:image/png;base64,${data.encoded_image}`;
            if (pixInput) pixInput.value = data.payload;

            pixModal.classList.remove("hidden");
            startPixPolling(data.payment_id);
        } else {
            console.error("Erro na API:", data);
            alert("Erro ao gerar o Pix. Tente novamente.");
        }
    } catch (err) {
        console.error("Erro:", err);
        alert("Não foi possível conectar ao servidor.");
    } finally {
        if (btnOpenPix) {
            btnOpenPix.disabled = false;
            btnOpenPix.innerText = "⚡ Pagar R$ 5,00 & Compartilhar no WhatsApp";
        }
    }
}

function startPixPolling(paymentId) {
    if (pixInterval) clearInterval(pixInterval);

    pixInterval = setInterval(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/check-pix/${paymentId}`);
            const data = await res.json();

            if (data.status === "PAID") {
                clearInterval(pixInterval);
                document.getElementById("pix-modal").classList.add("hidden");
                unlockWhatsappButton();
                alert("🎉 Pagamento de R$ 5,00 confirmado! Seu presente foi liberado.");
            }
        } catch (err) {
            console.error(err);
        }
    }, 3000);
}

// SALVA OS DADOS NA NUVEM E GERA O LINK CURTO PARA O WHATSAPP
async function unlockWhatsappButton() {
    const btnSendWhatsapp = document.getElementById("btnSendWhatsapp");
    const btnOpenPix = document.getElementById("btnOpenPix");
    const userMessageInput = document.getElementById("user-message");

    const messageText = userMessageInput ? userMessageInput.value : "";

    const payload = {
        message: messageText,
        date: selectedLoveDate || "",
        music: customMusicCloudUrl || "",
        photos: uploadedPhotoUrls || []
    };

    if (btnSendWhatsapp) {
        btnSendWhatsapp.innerText = "⏳ Gerando link curto...";
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/save-surprise`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok && result.success && result.id) {
            const baseUrl = window.location.href.split("?")[0];
            const shortShareableUrl = `${baseUrl}?id=${result.id}`;

            const formattedText = `✨ *Você recebeu uma Surpresa Especial!* ✨\n\n` +
                                  `Alguém que te ama preparou um presente inesquecível para você com música, fotos e uma declaração exclusiva. ❤️\n\n` +
                                  `👇 *Toque no link abaixo para abrir:* \n` +
                                  `${shortShareableUrl}`;

            const whatsappMessage = encodeURIComponent(formattedText);
            const whatsappLink = `https://wa.me/?text=${whatsappMessage}`;

            if (btnSendWhatsapp) {
                btnSendWhatsapp.href = whatsappLink;
                btnSendWhatsapp.innerText = "📲 Enviar Surpresa no WhatsApp";
                btnSendWhatsapp.classList.remove("hidden");
                btnSendWhatsapp.classList.remove("disabled-btn");
                btnSendWhatsapp.removeAttribute("disabled");
                btnSendWhatsapp.style.display = "inline-block";
            }

            if (btnOpenPix) {
                btnOpenPix.style.display = "none";
            }
        } else {
            console.error("Erro retornado pelo servidor ao salvar:", result);
            throw new Error("Erro ao gerar ID");
        }
    } catch (err) {
        console.error("Erro detalhado:", err);
        alert("Erro técnico: " + err.message); // Mostra o erro real na tela do telemóvel para diagnóstico
        if (btnSendWhatsapp) btnSendWhatsapp.innerText = "📲 Enviar Surpresa no WhatsApp";
    }
}