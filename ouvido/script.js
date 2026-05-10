
let musicas = getFromStorage("songs") ?? {};
let listaMusicas = getFromStorage("song-list") ?? [];
let listaMusicasParaJogar = getFromStorage("song-list-to-play") ?? [];
let answer =  getFromStorage("answer") ?? "";
const url = "https://lupedelupe.bandcamp.com/track/"
const proxy = "https://script.google.com/macros/s/AKfycbzxfEGAihqUNcOAHqOyhg25ZSD257FZkWN2ll7T2dirUZiJujfH6hAUbXfo4ZZW4ILe/exec?url="
let audio = new Audio();
let search = []
let guesses = getFromStorage("guesses") ?? [];
let points = getFromStorage("points") ?? 0;
let over = getFromStorage("over") ?? false;
let guessed = getFromStorage("guessed") ?? 0;

let playBtn = document.getElementById("play-btn")
let skipBtn = document.getElementById("skip-btn")
let guessBtn = document.getElementById("guess-btn")
let textInput = document.getElementById("text-input")
let time = document.getElementById("time")
let autoComplete = document.getElementById("auto-complete")
let guessRows = document.getElementsByClassName("guess")
let x = document.getElementById("x")
let playBtnSimbol = document.getElementById("play-btn-simbol")
let guessesDiv = document.getElementById("guesses-div")
let controlsContainer = document.getElementById("controls-container");

const getListaMusicasBusca = () => listaMusicas.length !== 0 ? listaMusicas.filter(item => !guesses.includes(item)) : [];

const checkGameOver = () => gameOver();

updateGuessRows();
checkGameOver();
let listaMusicasBusca = getListaMusicasBusca();

function getFromStorage(key) {
  return JSON.parse(localStorage.getItem(key));
}

function setInStorage(key, data) {
  return localStorage.setItem(key, JSON.stringify(data));
}

function getSearch(text) {
  if(!text) return [];
  return listaMusicasBusca
    .filter(m => removerAcentos(m).toLowerCase().includes(text.toLowerCase()))
    .sort((a, b) => {
      const indexA = removerAcentos(a).toLowerCase().indexOf(removerAcentos(text).toLowerCase());
      const indexB = removerAcentos(b).toLowerCase().indexOf(removerAcentos(text).toLowerCase());
      if(indexA !== indexB) {
        return indexA - indexB;
      }
      return a.localeCompare(b);
    })
}

function openAutoComplete() {
  for(const song of search.slice(0, 5)) {
    autoComplete.innerHTML += `<li class="auto-complete-row">${song}</li>`
  }
}

function closeAutoComplete() {
  autoComplete.innerHTML = "";
}

textInput.addEventListener('input', (event) => {
  guessBtn.disabled = true;
  const text = event.target.value;
  search = getSearch(text);
  autoComplete.hidden = search.length === 0;
  closeAutoComplete();
  openAutoComplete();
});

autoComplete.addEventListener('click', (event) => {
  if(!event.target.tagName === "LI") return;

  const textSelected = event.target.innerText;
  textInput.value = textSelected;
  autoComplete.hidden = true;
  guessBtn.disabled = false;
  closeAutoComplete();
})

x.addEventListener('click', (event) => {
  textInput.value = "";
  autoComplete.hidden = true;
  closeAutoComplete();
})

function removerAcentos(texto) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

if(listaMusicas.length === 0){
  fetch('musicas.json')
    .then(response => response.json())
    .then(data => { 
      musicas = data
      setInStorage("songs", musicas);
      listaMusicas = Object.keys(musicas)
      setInStorage("song-list", listaMusicas);
      setInStorage("song-list-to-play", listaMusicas);
      listaMusicasBusca = Object.keys(musicas);
      listaMusicasParaJogar = listaMusicas;
      max = listaMusicasParaJogar.length;
      answerIndex = Math.floor(Math.random() * max)
      answer = listaMusicasParaJogar[answerIndex];
      setInStorage("answer", answer);
      getSongLink();
    })
    .catch(err => console.log(`Erro ao carregar músicas ${err}`));
}

if(answer !== "") {
  getSong();
}

function getSongLink() {
  const cachedLink = getFromStorage("song-link");
    if (cachedLink) {
      getSong();
      return;
  }
  fetch(proxy + url + musicas[answer].urlName)
    .then(res => res.text())
    .then(html => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const albumData = doc.querySelector('[data-tralbum]').dataset.tralbum;
      if (albumData) {
        const data = JSON.parse(albumData);
        const mp3 = data.trackinfo[0].file['mp3-128'];
        setInStorage("song-link", mp3);
        getSong();
      }
    })
    .catch(err => console.log(err))
}

function getSong() {
  const link = getFromStorage("song-link") ?? getSongLink();
  if(link) {
    controlsContainer.style.display = "block";
    audio.src = link;
    playBtn.disabled = false;
    skipBtn.disabled = false;
  }
}

audio.addEventListener('timeupdate', () => {
  const seconds = Math.floor(audio.currentTime)
  time.innerText = `0:0${seconds}`
});

function play() {
  if(!canPlay()) return;
  try { 
    audio.currentTime = 0;
    audio.play();
    playBtnSimbol.innerHTML = `
      <div class="sound-wave">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `
    setTimeout(() => {
      audio.pause()
      audio.currentTime = 0;
      playBtnSimbol.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="#ffffff"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
    }, getSeconds() * 1000);
  } catch(err) {
    localStorage.removeItem("song-link")
    localStorage.removeItem("answer")
    getSong();
  }
}

function canPlay() {
  return guesses.length < 6;
}

function getSeconds() {
  return guesses.length + 2;
}

function drawEndScreen() {
  setInStorage("points", points);
  guessesDiv.innerHTML = `
    <div class="end-screen">
      <span>${guesses.length < 6 ? "Parabéns, você ganhou!" : "Você perdeu! :("}</span>
      <span>A música era: "${answer}"</span>
      <span>Você fez: ${6 - guesses.length} pontos</span>
      <span>Pontuação Total: ${getFromStorage("points")}</span>
      <button class="btn" style="background-color: #406074" onclick="next()">Próxima</button>
    </div>
  `
}

function doGuess() {
  if(canPlay()){
    let value = textInput.value;
    guesses = [...guesses, value];
    setInStorage("guesses", guesses);
    textInput.value = ""
    if(value === answer) {
      over = true;
      setInStorage("over", over);
      points = getFromStorage("points") + 6 - guesses.length;
      guessed = getFromStorage("guessed")
      setInStorage("guessed", guessed + 1);
      drawEndScreen();
      return;
    }
    updateGuessRows();
    gameOver();
    guessBtn.disabled = true;
    listaMusicasBusca = getListaMusicasBusca();
  }
}

function updateGuessRows() {
  for(let i = 0; i < guesses.length; i++) {
    if(guesses[i] === null) {
      guessRows[i].innerHTML = `
        <div class="guess-text">
          <svg xmlns="http://www.w3.org/2000/svg" class="text-custom-mg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="--darkreader-inline-stroke: currentColor;" data-darkreader-inline-stroke="">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          </svg>
        </div>
        <div class="skip-text-div">
          <div class="skip-text">PULADO</div>
        </div>
      `
      continue;
    }
    guessRows[i].innerHTML = `
      <div class="guess-text">
        <svg class="text-custom-negative" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="--darkreader-inline-stroke: currentColor;" data-darkreader-inline-stroke="">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </div>
      <div class="skip-text-div">
        <div class="skip-text">${guesses[i]}</div>
      </div>
    `
  }
}

function gameOver() {
  if (guesses.length >= 6 || over) {
    drawEndScreen();
    playBtn.disabled = true;
    skipBtn.disabled = true;
    guessBtn.disabled = true;
  }
}

function skip() {
  if(!canPlay()) return;
  guesses = [...guesses, null];
  setInStorage("guesses", guesses);
  updateGuessRows();
  gameOver();
}

function next() {
  if(listaMusicasParaJogar.length === 1) {
    guessesDiv.innerHTML = `
      <div class="end-screen">
        <span>${`Você acertou: ${getFromStorage("guessed")}/${listaMusicas.length}`}</span>
        <span>Pontuação Final: ${getFromStorage("points")}</span>
        <button class="btn" style="background-color: #406074" onclick="next()">Próxima</button>
      </div>
    `
  }
  controlsContainer.style.display = "none";
  guesses = []
  listaMusicasParaJogar = listaMusicasParaJogar.filter(m => m !== answer);
  listaMusicasBusca = getListaMusicasBusca();
  max = listaMusicasParaJogar.length;
  answerIndex = Math.floor(Math.random() * max)
  answer = listaMusicasParaJogar[answerIndex];
  setInStorage("answer", answer);
  localStorage.removeItem("song-link");
  getSong();
  setInStorage("guesses", guesses);
  setInStorage("song-list-to-play", listaMusicasParaJogar);
  over = false;
  setInStorage("over", over);
  guessesDiv.innerHTML = `
    <div class="guesses">
      <div class="guess-div">
        <div class="guess">
          <div class="guess-text"></div>
        </div>
        <div class="guess">
          <div class="guess-text"></div>
        </div>
        <div class="guess">
          <div class="guess-text"></div>
        </div>
        <div class="guess">
          <div class="guess-text"></div>
        </div>
        <div class="guess">
          <div class="guess-text"></div>
        </div>
        <div class="guess">
          <div class="guess-text"></div>
        </div>
      </div>
    </div>
  `
}
