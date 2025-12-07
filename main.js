class WheelRoller {
  constructor() {
    this.canvas = document.getElementById("wheelCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.items = [];
    this.colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#96CEB4",
      "#FFEAA7",
      "#DDA0DD",
      "#98D8C8",
      "#F7DC6F",
      "#BB8FCE",
      "#85C1E9",
      "#F8C471",
      "#82E0AA",
      "#F1948A",
      "#85C1E9",
      "#D2B4DE",
    ];
    this.currentRotation = 0;
    this.isSpinning = false;
    this.spinDuration = 4000;
    this.wheelSize = 400;
    this.history = [];
    this.soundEnabled = true;
    this.darkMode = false;
    
    // Fair randomization: shuffle bag ensures each item is picked before repeats
    this.shuffleBag = [];
    this.recentWinners = []; // Track last few winners to avoid immediate repeats

    this.setupEventListeners();
    this.setupResponsiveCanvas();
    this.drawWheel();
    this.loadFromStorage();
    this.initDarkMode();
  }

  initDarkMode() {
    // Check for saved dark mode preference or system preference
    const systemDarkMode = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;

    // darkMode is already loaded from storage in loadFromStorage()
    // Only use system preference if no saved preference exists
    try {
      const stored = localStorage.getItem("wheelRollerData");
      if (!stored || !JSON.parse(stored).settings?.darkMode) {
        this.darkMode = systemDarkMode;
      }
    } catch (e) {
      this.darkMode = systemDarkMode;
    }
    
    this.updateDarkModeUI();

    // Listen for system theme changes
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        try {
          const stored = localStorage.getItem("wheelRollerData");
          const hasSavedPref = stored && JSON.parse(stored).settings?.darkMode !== undefined;
          if (!hasSavedPref) {
            this.darkMode = e.matches;
            this.updateDarkModeUI();
          }
        } catch (err) {
          this.darkMode = e.matches;
          this.updateDarkModeUI();
        }
      });
  }

  toggleDarkMode() {
    this.darkMode = !this.darkMode;
    this.updateDarkModeUI();
    this.saveToStorage();
  }

  updateDarkModeUI() {
    const body = document.body;
    const moonIcon = document.getElementById("moonIcon");
    const sunIcon = document.getElementById("sunIcon");
    const text = document.getElementById("darkModeText");

    if (this.darkMode) {
      body.classList.add("dark-mode");
      moonIcon.style.display = "none";
      sunIcon.style.display = "block";
      text.textContent = "Light";
    } else {
      body.classList.remove("dark-mode");
      moonIcon.style.display = "block";
      sunIcon.style.display = "none";
      text.textContent = "Dark";
    }

    // Redraw wheel to update colors for dark mode
    this.drawWheel();
  }

  setupResponsiveCanvas() {
    const updateCanvasSize = () => {
      const maxSize = Math.min(
        window.innerWidth * 0.9,
        window.innerHeight * 0.6,
        this.wheelSize
      );
      this.canvas.style.width = maxSize + "px";
      this.canvas.style.height = maxSize + "px";
    };

    window.addEventListener("resize", updateCanvasSize);
    window.addEventListener("orientationchange", () => {
      setTimeout(updateCanvasSize, 100);
    });

    updateCanvasSize();
  }

  setupEventListeners() {
    document.getElementById("itemInput").addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.addItem();
    });

    document.addEventListener("keydown", (e) => {
      if (e.code === "Space" && !this.isSpinning && this.items.length >= 2) {
        e.preventDefault();
        this.spinWheel();
      }
    });
  }

  addItem() {
    const input = document.getElementById("itemInput");
    const text = input.value.trim();

    if (text && !this.items.includes(text)) {
      this.items.push(text);
      input.value = "";
      this.updateItemsList();
      this.drawWheel();
      this.saveToStorage();
      this.resetFairness(); // Reset shuffle bag when items change
    }
  }

  removeItem(index) {
    this.items.splice(index, 1);
    this.updateItemsList();
    this.drawWheel();
    this.saveToStorage();
    this.resetFairness(); // Reset shuffle bag when items change
  }
  
  // Reset fairness tracking when items change
  resetFairness() {
    this.shuffleBag = [];
    this.recentWinners = [];
  }

  editItem(index) {
    const newText = prompt("Edit item:", this.items[index]);
    if (newText && newText.trim() && !this.items.includes(newText.trim())) {
      this.items[index] = newText.trim();
      this.updateItemsList();
      this.drawWheel();
      this.saveToStorage();
    }
  }

  clearAll() {
    if (confirm("Clear all items?")) {
      this.items = [];
      this.history = [];
      this.updateItemsList();
      this.drawWheel();
      this.saveToStorage();
      this.resetFairness(); // Reset shuffle bag
      // Clear history UI
      const historyList = document.getElementById("historyList");
      if (historyList) historyList.innerHTML = "";
      // Hide result
      const resultDiv = document.getElementById("result");
      if (resultDiv) resultDiv.style.display = "none";
    }
  }

  updateItemsList() {
    const list = document.getElementById("itemsList");
    list.innerHTML = "";

    this.items.forEach((item, index) => {
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `
                        <span onclick="wheel.editItem(${index})" title="Click to edit">${item}</span>
                        <button onclick="wheel.removeItem(${index})" title="Remove item">×</button>
                    `;
      list.appendChild(div);
    });
  }

  drawWheel() {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.items.length === 0) {
      this.ctx.fillStyle = this.darkMode ? "#374151" : "#f3f4f6";
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      this.ctx.fill();

      this.ctx.fillStyle = this.darkMode ? "#9ca3af" : "#6b7280";
      this.ctx.font = "20px sans-serif";
      this.ctx.textAlign = "center";
      this.ctx.fillText("Add items to start", centerX, centerY);
      return;
    }

    const anglePerItem = (2 * Math.PI) / this.items.length;

    this.items.forEach((item, index) => {
      const startAngle = index * anglePerItem + this.currentRotation;
      const endAngle = startAngle + anglePerItem;
      const color = this.colors[index % this.colors.length];

      // Draw segment
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.moveTo(centerX, centerY);
      this.ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      this.ctx.closePath();
      this.ctx.fill();

      // Draw border
      this.ctx.strokeStyle = this.darkMode ? "#1e293b" : "#ffffff";
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // Draw text
      const textAngle = startAngle + anglePerItem / 2;
      const textRadius = radius * 0.7;
      const textX = centerX + Math.cos(textAngle) * textRadius;
      const textY = centerY + Math.sin(textAngle) * textRadius;

      this.ctx.save();
      this.ctx.translate(textX, textY);
      this.ctx.rotate(textAngle + Math.PI / 2);

      this.ctx.fillStyle = "#ffffff";
      this.ctx.font = "bold 14px sans-serif";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";

      // Text shadow for better readability
      this.ctx.strokeStyle = "rgba(0,0,0,0.7)";
      this.ctx.lineWidth = 4;
      this.ctx.strokeText(item, 0, 0);
      this.ctx.fillText(item, 0, 0);

      this.ctx.restore();
    });

    // Draw center circle
    this.ctx.fillStyle = this.darkMode ? "#1e293b" : "#374151";
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, 20, 0, 2 * Math.PI);
    this.ctx.fill();

    // Draw center circle border
    this.ctx.strokeStyle = this.darkMode ? "#475569" : "#ffffff";
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  // Cryptographically secure random number generator
  secureRandom() {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0] / (0xFFFFFFFF + 1);
  }

  // Fisher-Yates shuffle with secure randomness
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(this.secureRandom() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Get next fair winner using shuffle bag algorithm
  getNextFairWinner() {
    // Refill and shuffle the bag if empty
    if (this.shuffleBag.length === 0) {
      this.shuffleBag = this.shuffleArray([...Array(this.items.length).keys()]);
      
      // If we have recent winners and enough items, avoid immediate repeat
      if (this.recentWinners.length > 0 && this.items.length > 2) {
        const lastWinner = this.recentWinners[0];
        // If the first item in new bag is same as last winner, swap it
        if (this.shuffleBag[0] === lastWinner) {
          const swapIdx = 1 + Math.floor(this.secureRandom() * (this.shuffleBag.length - 1));
          [this.shuffleBag[0], this.shuffleBag[swapIdx]] = [this.shuffleBag[swapIdx], this.shuffleBag[0]];
        }
      }
    }

    // Pop the next winner from the bag
    const winnerIndex = this.shuffleBag.shift();
    
    // Track recent winners (keep last 3)
    this.recentWinners.unshift(winnerIndex);
    if (this.recentWinners.length > 3) {
      this.recentWinners.pop();
    }

    return winnerIndex;
  }

  // Calculate rotation needed to land on specific index
  calculateTargetRotation(targetIndex) {
    const anglePerItem = (2 * Math.PI) / this.items.length;
    const pointerAngle = (3 * Math.PI) / 2; // Pointer at top
    
    // Calculate the angle where target segment's center should be
    const targetCenter = targetIndex * anglePerItem + anglePerItem / 2;
    
    // Add randomness within the segment (not just center) for visual variety
    const segmentVariance = (this.secureRandom() - 0.5) * anglePerItem * 0.7;
    
    // Calculate required rotation
    let targetRotation = pointerAngle - targetCenter + segmentVariance;
    
    // Normalize to positive
    targetRotation = ((targetRotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    
    return targetRotation;
  }

  spinWheel() {
    if (this.isSpinning || this.items.length < 2) return;

    this.isSpinning = true;
    document.getElementById("spinBtn").disabled = true;
    document.getElementById("result").style.display = "none";

    // Get the fair winner first
    const winnerIndex = this.getNextFairWinner();
    
    // Calculate target rotation to land on winner
    const targetFinalRotation = this.calculateTargetRotation(winnerIndex);
    
    // Add full rotations for visual effect (5-10 rotations)
    const fullRotations = (5 + Math.floor(this.secureRandom() * 6)) * 2 * Math.PI;
    
    const startTime = Date.now();
    const startRotation = this.currentRotation;
    
    // Calculate total spin amount
    let spinAmount = fullRotations + targetFinalRotation - (startRotation % (2 * Math.PI));
    if (spinAmount < fullRotations) {
      spinAmount += 2 * Math.PI; // Ensure minimum rotations
    }

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / this.spinDuration, 1);

      // Easing function for natural deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);

      this.currentRotation = startRotation + spinAmount * easeOut;
      this.drawWheel();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.currentRotation = (startRotation + spinAmount) % (2 * Math.PI);
        this.drawWheel();
        this.showResult();
        this.isSpinning = false;
        document.getElementById("spinBtn").disabled = false;
      }
    };

    animate();
  }

  showResult() {
    const anglePerItem = (2 * Math.PI) / this.items.length;
    // Pointer is at -Math.PI/2 (top of the wheel)
    let pointerAngle = (3 * Math.PI) / 2;
    let adjustedRotation =
      ((this.currentRotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    let diff = (pointerAngle - adjustedRotation + 2 * Math.PI) % (2 * Math.PI);
    let winnerIndex = Math.floor(diff / anglePerItem) % this.items.length;
    const winner = this.items[winnerIndex];

    const resultDiv = document.getElementById("result");
    resultDiv.innerHTML = `🎉 Winner: <strong>${winner}</strong>`;
    resultDiv.style.display = "block";

    this.addToHistory(winner);
    this.playSound();
  }

  addToHistory(winner) {
    this.history.unshift({
      item: winner,
      time: new Date().toLocaleTimeString(),
    });
    if (this.history.length > 10) this.history.pop();

    this.updateHistoryList();
    this.saveToStorage();
  }

  updateHistoryList() {
    const historyList = document.getElementById("historyList");
    historyList.innerHTML = "";

    this.history.forEach((entry, index) => {
      const div = document.createElement("div");
      div.className = "history-item";
      div.innerHTML = `
        <div class="history-item-content">
          <strong>${entry.item}</strong>
          <small>(${entry.time})</small>
        </div>
        <button onclick="wheel.removeHistoryItem(${index})" title="Remove">×</button>
      `;
      historyList.appendChild(div);
    });
  }

  removeHistoryItem(index) {
    this.history.splice(index, 1);
    this.updateHistoryList();
    this.saveToStorage();
  }

  clearHistory() {
    this.history = [];
    this.updateHistoryList();
    this.saveToStorage();
  }

  playSound() {
    if (!this.soundEnabled) return;

    // Create a simple beep sound using Web Audio API
    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.5
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  }

  updateWheelSize(size) {
    this.wheelSize = parseInt(size);
    this.canvas.width = this.wheelSize;
    this.canvas.height = this.wheelSize;

    // Maintain responsive canvas sizing
    const maxSize = Math.min(
      window.innerWidth * 0.9,
      window.innerHeight * 0.6,
      this.wheelSize
    );
    this.canvas.style.width = maxSize + "px";
    this.canvas.style.height = maxSize + "px";

    document.getElementById("sizeValue").textContent = size;
    this.drawWheel();
  }

  updateSpinDuration(duration) {
    this.spinDuration = parseInt(duration) * 1000;
    document.getElementById("durationValue").textContent = duration;
  }

  toggleSound() {
    this.soundEnabled = document.getElementById("soundEnabled").checked;
    this.saveToStorage();
  }

  loadPreset(type) {
    const presets = {
      yesno: ["Yes", "No"],
      numbers: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
      colors: ["Red", "Blue", "Green", "Yellow", "Purple", "Orange"],
      food: ["Pizza", "Burger", "Sushi", "Pasta", "Tacos", "Salad"],
    };

    this.items = [...presets[type]];
    this.updateItemsList();
    this.drawWheel();
    this.saveToStorage();
    this.resetFairness(); // Reset shuffle bag when preset loaded
  }

  saveWheel() {
    const data = {
      items: this.items,
      history: this.history,
      settings: {
        wheelSize: this.wheelSize,
        spinDuration: this.spinDuration,
        soundEnabled: this.soundEnabled,
        darkMode: this.darkMode,
      },
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "wheel-config.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  loadWheel() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target.result);
            this.items = data.items || [];
            this.history = data.history || [];
            if (data.settings) {
              this.wheelSize = data.settings.wheelSize || 400;
              this.spinDuration = data.settings.spinDuration || 4000;
              this.soundEnabled = data.settings.soundEnabled !== false;
              this.darkMode = data.settings.darkMode || false;
            }
            this.updateUI();
            // Update history display
            this.updateHistoryList();
          } catch (err) {
            alert("Invalid file format.");
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }

  updateUI() {
    this.updateItemsList();
    this.drawWheel();
    document.getElementById("wheelSize").value = this.wheelSize;
    document.getElementById("spinDuration").value = this.spinDuration / 1000;
    document.getElementById("soundEnabled").checked = this.soundEnabled;
    document.getElementById("sizeValue").textContent = this.wheelSize;
    document.getElementById("durationValue").textContent =
      this.spinDuration / 1000;
    this.updateWheelSize(this.wheelSize);
  }

  saveToStorage() {
    const data = {
      items: this.items,
      history: this.history,
      settings: {
        wheelSize: this.wheelSize,
        spinDuration: this.spinDuration,
        soundEnabled: this.soundEnabled,
        darkMode: this.darkMode,
      },
    };
    try {
      localStorage.setItem("wheelRollerData", JSON.stringify(data));
    } catch (e) {
      console.warn("Could not save to localStorage:", e);
    }
  }

  loadFromStorage() {
    try {
      const stored = localStorage.getItem("wheelRollerData");
      if (stored) {
        const data = JSON.parse(stored);
        this.items = data.items || [];
        this.history = data.history || [];
        if (data.settings) {
          this.wheelSize = data.settings.wheelSize || 400;
          this.spinDuration = data.settings.spinDuration || 4000;
          this.soundEnabled = data.settings.soundEnabled !== false;
          this.darkMode = data.settings.darkMode || false;
        }
        this.updateUI();
        this.updateHistoryList();
      }
    } catch (e) {
      console.warn("Could not load from localStorage:", e);
    }
  }
}

// Global functions for HTML onclick handlers
let wheel;

function addItem() {
  wheel.addItem();
}

function clearAll() {
  wheel.clearAll();
}

function spinWheel() {
  wheel.spinWheel();
}

function updateWheelSize(size) {
  wheel.updateWheelSize(size);
}

function updateSpinDuration(duration) {
  wheel.updateSpinDuration(duration);
}

function toggleSound() {
  wheel.toggleSound();
}

function loadPreset(type) {
  wheel.loadPreset(type);
}

function saveWheel() {
  wheel.saveWheel();
}

function loadWheel() {
  wheel.loadWheel();
}

function toggleDarkMode() {
  wheel.toggleDarkMode();
}

function clearHistory() {
  wheel.clearHistory();
}

// Initialize the wheel when page loads
window.addEventListener("load", () => {
  wheel = new WheelRoller();
});
