/* =========================== ПРИВЕТСТВЕННЫЙ СЛОЙ =========================== */
const welcomeOverlay = document.getElementById("welcome-overlay"); // div с затемнением
const welcomeBtn     = document.getElementById("welcome-btn");     // "Позвать музыкантов!"

const hints = document.querySelectorAll("#hints h3, #hints h4, #hints h5"); // подсказки юзеру
let hintTimers = []; // таймеры, ведущие отсчёт до проявления подсказок
const hintPeriods = [30000, 45000, 55000]; // длительности таймеров в мс
let usefulHint = true; // флаг, что юзер сам не догадался и подсказки уже нужны


welcomeBtn.addEventListener("click", () => {
  welcomeOverlay.style.opacity = "0"; // "включаем свет" (прячем затемнение)
  setTimeout(() => { welcomeOverlay.remove(); }, 300); // убираем слой вообще, чтобы не мешал
  document.querySelectorAll(".musician").forEach(m => {
    m.style.visibility = "visible"; // музыканты обретают видимые тела
  });

  // запускаем таймеры подсказок
  hints.forEach((hint, i) => {
    hintTimers[i] = setTimeout(() => {
      hint.classList.add("visible"); // подсказка плавно проявляется
    }, hintPeriods[i]);
  });
});


/* =========================== АУДИО-МЕНЕДЖЕР =========================== */
/* строим класс для управления звуком */
class AudioManager {
  constructor() {
    this.files = {
      violin:  "violin.mp3",
      trumpet: "trumpet.mp3",
      piano:   "piano.mp3"
    };
    this.tracks = {}; // сюда будем складывать созданные объекты Audio
    this.isStarted = false; // флаг, запускались ли уже треки в данном "отделении концерта"
  }

  /* инициализация аудио-объектов */
  init() {
    for (const id in this.files) {
      const audio = new Audio(this.files[id]); // создаём объект Audio (HTMLAudioElement), загружающий указанный файл
      audio.loop = true; // зацикливаем воспроизведение
      audio.volume = 0; // на старте все без звука
      this.tracks[id] = audio;
    }
  }

  /* начать воспроизведение всех треков */

  startAll() {
    if (this.isStarted) return; // два снаряда в одну воронку не падают

    for (const id in this.tracks) {
      const audio = this.tracks[id];

      // хотим выводить в консоль alt музыканта в сообщениях
      const img = document.querySelector(`img.musician[data-id="${id}"]`);
      let name = "Музыкант '" + id + "'";
      if (img && img.alt) {
        name = img.alt;
      }

      // пытаемся запустить трек с начала
      try {
        audio.currentTime = 0;
        audio.volume = 0;
        audio.play();
        console.log(`Ура! ${name} успешно вступил в партию.`);
      } catch (e) {
        console.warn(`Ой! ${name} отказался играть: ${e.message}.`);
      }
    }

    this.isStarted = true; // ставим флажок
  }


  /* плавное изменение громкости (с костылями) */
  fadeTo(id, targetV, duration = 300) { // (<какой трек>, <целевая громкость>, <длительность действия в мс>)
    const audio = this.tracks[id];
    if (!audio) return; // на нет - и суда нет

    const startV = audio.volume; // начальная громкость
    const diffV  = targetV - startV; // получается >0, если нужно громче; <0, если нужно тише

    // если разница очень маленькая, просто ставим целевое значение и выходим
    if (Math.abs(diffV) < 0.01) {
      audio.volume = targetV;
      return;
    }

    const startTime = performance.now(); // таймер в мс

    // внутренняя функция для итерации изменения громкости
    function step(now) {
      // вычисляем прогресс по времени t от 0 до 1 (для параметризации)
      const t = Math.min(1, (now - startTime) / duration);
      const v = startV + diffV * t;
      // сперва костыли, ибо были казусы вида -0.001
      if (v < 0) {
        audio.volume = 0;
      } else if (v > 1) {
        audio.volume = 1;
      } else {
        audio.volume = v;
      }
      // если ещё не достигли конца временного отрезка, идём на новую итерацию
      if (t < 1) {
        requestAnimationFrame(step);
      }
    }
    requestAnimationFrame(step);
  }

  /* постепенное увеличение громкости */
  fadeIn(id) {
    this.fadeTo(id, 1, 250);
  }

  /* постепенное уменьшение громкости */
  fadeOut(id) {
    this.fadeTo(id, 0, 250);
  }

  /* остановить воспроизведение всех треков */
  stopAll() {
    for (const id in this.tracks) {
      const audio = this.tracks[id];

      // хотим выводить в консоль alt музыканта в сообщениях
      const img = document.querySelector(`img.musician[data-id="${id}"]`);
      let name = "Музыкант '" + id + "'";
      if (img && img.alt) {
        name = img.alt;
      }

      try {
        audio.pause();
        audio.volume = 0;
        audio.currentTime = 0;
        console.log(`${name} успешно закончил выступление.`);
      } catch (e) {
        console.warn(`Ой! ${name} отказался прекратить играть: ${e.message}.`);
      }
    }
    this.isStarted = false;
  }
}

// создаём аудио-менеджера, подгружаем треки
const audio = new AudioManager();
audio.init();


/* =========================== ПОЗИЦИОНИРОВАНИЕ СЛОТОВ =========================== */
const stageContainer = document.getElementById("stage-container");
const stageImg       = document.getElementById("stage-img");

// СК "Сцена" в пикселях
const BASE_W = 1536;
const BASE_H = 450;
// базовый размер слота
const SLOT_W = 200;
const SLOT_H = 240;
// отступы внутри зон (каждая должна быть по 650 ширины, включая отступы)
const LEFT_GAP = 14;
const BW_GAP   = 18;
const TOP_GAP  = 200;
// отступы левых границ зон
const BACK_X0  = 24;
const STAGE_X0 = BASE_W - BACK_X0 - 650;
// тайный слот
const SECRET_W = 130;
const SECRET_H = 170;
const SECRET_X = 730;
const SECRET_Y = 200;

const slotCoords = {
  // зона закулисья
  "back-1":  { x: BACK_X0 + LEFT_GAP,                                       y: TOP_GAP },
  "back-2":  { x: BACK_X0 + LEFT_GAP + SLOT_W + BW_GAP,                     y: TOP_GAP },
  "back-3":  { x: BACK_X0 + LEFT_GAP + SLOT_W + BW_GAP + SLOT_W + BW_GAP,   y: TOP_GAP },
  // зона сцены
  "stage-1": { x: STAGE_X0 + LEFT_GAP,                                      y: TOP_GAP },
  "stage-2": { x: STAGE_X0 + LEFT_GAP + SLOT_W + BW_GAP,                    y: TOP_GAP },
  "stage-3": { x: STAGE_X0 + LEFT_GAP + SLOT_W + BW_GAP + SLOT_W + BW_GAP,  y: TOP_GAP },
  // тайное место за шторой
  "secret":  { x: SECRET_X,                                                 y: SECRET_Y }
};

// пересчитываем координаты слотов при изменении окна
function updateSlotPositions() {
  const W = stageContainer.clientWidth;
  const H = stageContainer.clientHeight;
  // берём минимальный масштаб по ширине и высоте, чтобы сцена целиком влезла
  const scale = Math.min(W / BASE_W, H / BASE_H);
  // размеры сцены после масштабирования
  const sceneW = BASE_W * scale;
  const sceneH = BASE_H * scale;
  // отступы вокруг сцены
  const offsetX = (W - sceneW) / 2;
  const offsetY = (H - sceneH) / 2;

  // обычные слоты
  for (const id in slotCoords) {
    if (id === "secret") continue;

    const slot = document.getElementById(id);
    const pos  = slotCoords[id];

    slot.style.width  = SLOT_W * scale + "px";
    slot.style.height = SLOT_H * scale + "px";

    // размеры слота после масштабирования
    slot.style.left = offsetX + pos.x * scale + "px";
    slot.style.top  = offsetY + pos.y * scale + "px";
  }

  for (const id in slotCoords) {
    const slot = document.getElementById(id);
    const pos  = slotCoords[id];

    slot.style.width  = SLOT_W * scale + "px";
    slot.style.height = SLOT_H * scale + "px";

    // размеры слота после масштабирования
    slot.style.left = offsetX + pos.x * scale + "px";
    slot.style.top  = offsetY + pos.y * scale + "px";
  }

  // тайный слот
  const secretSlot = document.getElementById("secret");
  secretSlot.style.width  = SECRET_W * scale + "px";
  secretSlot.style.height = SECRET_H * scale + "px";
  secretSlot.style.left   = offsetX + SECRET_X * scale + "px";
  secretSlot.style.top    = offsetY + SECRET_Y * scale + "px";
}

// вызываем при полной загрузке страницы или изменении размера окна
window.addEventListener("load", updateSlotPositions);
window.addEventListener("resize", updateSlotPositions);


/* =========================== DND (Drag aNd Drop) ЛОГИКА ПЕРЕТАСКИВАНИЯ =========================== */
let dragged    = null; // кого тащим
let originSlot = null; // откуда тащим
const secretSlot = document.getElementById("secret"); // тайный слот
const slots = document.querySelectorAll(".slot"); // все слоты
let violinPhantomMode = false; // будет сюрприз от скрипача

// отмечаем свободные слоты: если пустой или исходный, считаем его свободным
function updateFreeSlots() {
  slots.forEach(slot => {
    // но к тайному слоту особое отношение
    if (slot === secretSlot) {
      if (slot.children.length === 0) {
        slot.classList.add("secretlyFree");
      }
    } else if (slot.children.length === 0 || slot === originSlot) {
      slot.classList.add("free");
    } else {
      slot.classList.remove("free", "active", "secretlyFree");
    }
  });
}

/* ------------------ DRAG START ------------------ */
document.addEventListener("dragstart", (event) => {
  if (!event.target.classList.contains("musician")) return;
  dragged = event.target;
  originSlot = dragged.parentElement;
  dragged.classList.add("dragging");
  updateFreeSlots(); // проверка свободных слотов
});

/* ------------------ DRAG END ------------------ */
document.addEventListener("dragend", () => {
  if (dragged) {
    dragged.classList.remove("dragging");
  }
  // лишаем слоты свободы и света
  slots.forEach(slot => slot.classList.remove("free", "active", "secretlyFree"));
  dragged    = null;
  originSlot = null;
});

/* ------------------ DRAG OVER ------------------ */
document.addEventListener("dragover", (event) => {
  event.preventDefault(); // отменяем действие по умолчанию
});

/* ------------------ DRAG ENTER ------------------ */
document.addEventListener("dragenter", (event) => {
  const slot = event.target.closest(".slot");
  if (slot && slot.classList.contains("free")) {
    slot.classList.add("active");
  }
});

/* ------------------ DRAG LEAVE ------------------ */
document.addEventListener("dragleave", (event) => {
  const slot = event.target.closest(".slot");
  if (slot) slot.classList.remove("active");
});

/* ------------------ DROP ------------------ */
document.addEventListener("drop", (event) => {
  event.preventDefault(); // отменяем действие по умолчанию
  if (!dragged) return; // если почему-то нет перетаскиваемого, выходим
  const slot = event.target.closest(".slot");

  // возвращаем видимость и убираем эффекты
  dragged.style.display = "";
  dragged.classList.remove("dragging");
  dragged.style.opacity = "";
  dragged.style.transform = "";

  if (slot) {
    if (slot === secretSlot && dragged.dataset.id === "violin" && Math.random() < 0.7) {
      if (Math.random() < 0.5) {
        if (!violinPhantomMode) {
          dragged.src = "phantom.png"; // подменяем скрипача
          violinPhantomMode = true;
        } else {
          dragged.src = "violin.png"; // подменяем скрипача обратно
          violinPhantomMode = false;
        }
      }
      secretSlot.appendChild(dragged);
    } else if (slot.classList.contains("free")) {
      slot.appendChild(dragged);
    }

    // проверяем, был ли скрипач извлечён из тайного слота, то есть подсказки юзеру уже не нужны
    if (usefulHint) {
      if (originSlot === secretSlot && slot !== secretSlot) {
        usefulHint = false; // подсказки больше не нужны
        hintTimers.forEach(timer => clearTimeout(timer)); // останавливаем таймеры
        hintTimers = [];
        hints.forEach(hint => hint.classList.remove("visible")); // убираем подсказки
      }
    }

    updateFreeSlots();  // ликвидируем права слотов на свободу в случае неуплаты
    updateAudioState(); // обновляем звук в зависимости от того, кто на сцене (или за шторкой)
  } else {
    originSlot.appendChild(dragged); // если неудачный drop, возвращаем музыканта в исходный слот
  }
  dragged    = null;
  originSlot = null;
});


/* =========================== ПАНЕЛЬ УПРАВЛЕНИЯ =========================== */
/* кнопка "Вон со сцены!" */
document.getElementById("btn-leave_stage").addEventListener("click", () => {
  const backstageSlots = document.querySelectorAll(".backstage-slot");
  const stageSlots     = document.querySelectorAll(".stage-slot");

  // собираем всех музыкантов на сцене
  const musicians = [];
  stageSlots.forEach(slot => {
    if (slot.children.length > 0) {
      musicians.push(slot.children[0]);
    }
  });

  // очищаем сцену
  stageSlots.forEach(slot => slot.innerHTML = "");

  // отправляем музыкантов за кулисы в свободные слоты
  let i = 0;
  backstageSlots.forEach(slot => {
    if (slot.children.length === 0 && i < musicians.length) {
      slot.appendChild(musicians[i]);
      i++;
    }
  });
  updateAudioState(); // регулируем аудио
});

/* кнопка "Бегом на сцену!" */
document.getElementById("btn-come_on_stage").addEventListener("click", () => {
  const backstageSlots = document.querySelectorAll(".backstage-slot");
  const stageSlots     = document.querySelectorAll(".stage-slot");

  // собираем всех музыкантов за кулисами
  const musicians = [];
  backstageSlots.forEach(slot => {
    if (slot.children.length > 0) {
      musicians.push(slot.children[0]);
    }
  });

  // очищаем закулисье
  backstageSlots.forEach(slot => slot.innerHTML = "");

  // отправляем музыкантов на сцену в свободные слоты
  let i = 0;
  stageSlots.forEach(slot => {
    if (slot.children.length === 0 && i < musicians.length) {
      slot.appendChild(musicians[i]);
      i++;
    }
  });
  updateAudioState(); // регулируем аудио
});


/* =========================== ЛОГИКА ЗВУКА (и анимации) =========================== */
/* кто на сцене (или за шторкой), тот и звучит */
function updateAudioState() {
  const stageSlots = document.querySelectorAll(".stage-slot");
  const active = [];
  // фиксируем тех, кто на сцене
  stageSlots.forEach(slot => {
    if (slot.children.length > 0) {
      active.push(slot.children[0].dataset.id);
    }
  });

  // включаем/выключаем анимации в зависимости от того, кто на сцене
  document.querySelectorAll(".musician").forEach(m => {
    const id = m.dataset.id;
    // сначала убираем все анимации
    m.classList.remove("trumpet-anim", "violin-anim", "piano-anim");
    // а если музыкант на сцене, включаем нужную
    if (active.includes(id)) {
      if (id === "trumpet") m.classList.add("trumpet-anim");
      if (id === "violin")  m.classList.add("violin-anim");
      if (id === "piano")   m.classList.add("piano-anim");
    }
  });

  // добавляем к активным скрытого скрипача, если он стоит за штрой
  if (secretSlot.children.length > 0) {
    active.push(secretSlot.children[0].dataset.id);
  }

  // если на сцене (и за шторкой) пусто, выключаем всё
  if (active.length === 0) {
    audio.stopAll();
    return;
  }

  // если звук ещё не запущен, запускаем
  audio.startAll();
  // включаем/выключаем партии
  for (const id in audio.files) {
    if (active.includes(id)) {
      audio.fadeIn(id);
    } else {
      audio.fadeOut(id);
    }
  }
}