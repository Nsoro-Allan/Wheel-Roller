        class WheelRoller {
            constructor() {
                this.canvas = document.getElementById('wheelCanvas');
                this.ctx = this.canvas.getContext('2d');
                this.items = [];
                this.colors = [
                    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
                    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
                    '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D2B4DE'
                ];
                this.currentRotation = 0;
                this.isSpinning = false;
                this.spinDuration = 4000;
                this.wheelSize = 400;
                this.history = [];
                this.soundEnabled = true;
                this.darkMode = false;
                
                this.setupEventListeners();
                this.setupResponsiveCanvas();
                this.drawWheel();
                this.loadFromStorage();
                this.initDarkMode();
            }

            initDarkMode() {
                // Check for saved dark mode preference or system preference
                const savedDarkMode = window.wheelData?.settings?.darkMode;
                const systemDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
                
                this.darkMode = savedDarkMode !== undefined ? savedDarkMode : systemDarkMode;
                this.updateDarkModeUI();
                
                // Listen for system theme changes
                window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                    if (window.wheelData?.settings?.darkMode === undefined) {
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
                const icon = document.getElementById('darkModeIcon');
                const text = document.getElementById('darkModeText');
                
                if (this.darkMode) {
                    body.classList.add('dark-mode');
                    icon.textContent = '☀️';
                    text.textContent = 'Light';
                } else {
                    body.classList.remove('dark-mode');
                    icon.textContent = '🌙';
                    text.textContent = 'Dark';
                }
                
                // Redraw wheel to update colors for dark mode
                this.drawWheel();
            }

            setupResponsiveCanvas() {
                const updateCanvasSize = () => {
                    const maxSize = Math.min(window.innerWidth * 0.9, window.innerHeight * 0.6, this.wheelSize);
                    this.canvas.style.width = maxSize + 'px';
                    this.canvas.style.height = maxSize + 'px';
                };
                
                window.addEventListener('resize', updateCanvasSize);
                window.addEventListener('orientationchange', () => {
                    setTimeout(updateCanvasSize, 100);
                });
                
                updateCanvasSize();
            }

            setupEventListeners() {
                document.getElementById('itemInput').addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.addItem();
                });

                document.addEventListener('keydown', (e) => {
                    if (e.code === 'Space' && !this.isSpinning && this.items.length >= 2) {
                        e.preventDefault();
                        this.spinWheel();
                    }
                });
            }

            addItem() {
                const input = document.getElementById('itemInput');
                const text = input.value.trim();
                
                if (text && !this.items.includes(text)) {
                    this.items.push(text);
                    input.value = '';
                    this.updateItemsList();
                    this.drawWheel();
                    this.saveToStorage();
                }
            }

            removeItem(index) {
                this.items.splice(index, 1);
                this.updateItemsList();
                this.drawWheel();
                this.saveToStorage();
            }

            editItem(index) {
                const newText = prompt('Edit item:', this.items[index]);
                if (newText && newText.trim() && !this.items.includes(newText.trim())) {
                    this.items[index] = newText.trim();
                    this.updateItemsList();
                    this.drawWheel();
                    this.saveToStorage();
                }
            }

            clearAll() {
                if (confirm('Clear all items?')) {
                    this.items = [];
                    this.updateItemsList();
                    this.drawWheel();
                    this.saveToStorage();
                }
            }

            updateItemsList() {
                const list = document.getElementById('itemsList');
                list.innerHTML = '';
                
                this.items.forEach((item, index) => {
                    const div = document.createElement('div');
                    div.className = 'item';
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
                    this.ctx.fillStyle = this.darkMode ? '#374151' : '#f3f4f6';
                    this.ctx.beginPath();
                    this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
                    this.ctx.fill();
                    
                    this.ctx.fillStyle = this.darkMode ? '#9ca3af' : '#6b7280';
                    this.ctx.font = '20px sans-serif';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText('Add items to start', centerX, centerY);
                    return;
                }

                const anglePerItem = (2 * Math.PI) / this.items.length;

                this.items.forEach((item, index) => {
                    const startAngle = (index * anglePerItem) + this.currentRotation;
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
                    this.ctx.strokeStyle = this.darkMode ? '#1e293b' : '#ffffff';
                    this.ctx.lineWidth = 2;
                    this.ctx.stroke();

                    // Draw text
                    const textAngle = startAngle + anglePerItem / 2;
                    const textRadius = radius * 0.7;
                    const textX = centerX + Math.cos(textAngle) * textRadius;
                    const textY = centerY + Math.sin(textAngle) * textRadius;

                    this.ctx.save();
                    this.ctx.translate(textX, textY);
                    this.ctx.rotate(textAngle + Math.PI/2);
                    
                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.font = 'bold 14px sans-serif';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    
                    // Text shadow for better readability
                    this.ctx.strokeStyle = 'rgba(0,0,0,0.7)';
                    this.ctx.lineWidth = 4;
                    this.ctx.strokeText(item, 0, 0);
                    this.ctx.fillText(item, 0, 0);
                    
                    this.ctx.restore();
                });

                // Draw center circle
                this.ctx.fillStyle = this.darkMode ? '#1e293b' : '#374151';
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, 20, 0, 2 * Math.PI);
                this.ctx.fill();

                // Draw center circle border
                this.ctx.strokeStyle = this.darkMode ? '#475569' : '#ffffff';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            }

            spinWheel() {
                if (this.isSpinning || this.items.length < 2) return;

                this.isSpinning = true;
                document.getElementById('spinBtn').disabled = true;
                document.getElementById('result').style.display = 'none';

                const startTime = Date.now();
                const startRotation = this.currentRotation;
                const spinAmount = (Math.random() * 10 + 5) * 2 * Math.PI; // 5-15 full rotations
                const targetRotation = startRotation + spinAmount;

                const animate = () => {
                    const elapsed = Date.now() - startTime;
                    const progress = Math.min(elapsed / this.spinDuration, 1);
                    
                    // Easing function for natural deceleration
                    const easeOut = 1 - Math.pow(1 - progress, 3);
                    
                    this.currentRotation = startRotation + (spinAmount * easeOut);
                    this.drawWheel();

                    if (progress < 1) {
                        requestAnimationFrame(animate);
                    } else {
                        this.currentRotation = targetRotation % (2 * Math.PI);
                        this.drawWheel();
                        this.showResult();
                        this.isSpinning = false;
                        document.getElementById('spinBtn').disabled = false;
                    }
                };

                animate();
            }

            showResult() {
                const anglePerItem = (2 * Math.PI) / this.items.length;
                const normalizedRotation = (2 * Math.PI - this.currentRotation) % (2 * Math.PI);
                const winnerIndex = Math.floor(normalizedRotation / anglePerItem) % this.items.length;
                const winner = this.items[winnerIndex];

                const resultDiv = document.getElementById('result');
                resultDiv.innerHTML = `🎉 Winner: <strong>${winner}</strong>`;
                resultDiv.style.display = 'block';

                this.addToHistory(winner);
                this.playSound();
            }

            addToHistory(winner) {
                this.history.unshift({ item: winner, time: new Date().toLocaleTimeString() });
                if (this.history.length > 10) this.history.pop();
                
                const historyList = document.getElementById('historyList');
                historyList.innerHTML = '';
                
                this.history.forEach(entry => {
                    const div = document.createElement('div');
                    div.className = 'history-item';
                    div.innerHTML = `<strong>${entry.item}</strong> <small>(${entry.time})</small>`;
                    historyList.appendChild(div);
                });

                this.saveToStorage();
            }

            playSound() {
                if (!this.soundEnabled) return;
                
                // Create a simple beep sound using Web Audio API
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.5);
            }

            updateWheelSize(size) {
                this.wheelSize = parseInt(size);
                this.canvas.width = this.wheelSize;
                this.canvas.height = this.wheelSize;
                
                // Maintain responsive canvas sizing
                const maxSize = Math.min(window.innerWidth * 0.9, window.innerHeight * 0.6, this.wheelSize);
                this.canvas.style.width = maxSize + 'px';
                this.canvas.style.height = maxSize + 'px';
                
                document.getElementById('sizeValue').textContent = size;
                this.drawWheel();
            }

            updateSpinDuration(duration) {
                this.spinDuration = parseInt(duration) * 1000;
                document.getElementById('durationValue').textContent = duration;
            }

            toggleSound() {
                this.soundEnabled = document.getElementById('soundEnabled').checked;
                this.saveToStorage();
            }

            loadPreset(type) {
                const presets = {
                    yesno: ['Yes', 'No'],
                    numbers: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
                    colors: ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange'],
                    food: ['Pizza', 'Burger', 'Sushi', 'Pasta', 'Tacos', 'Salad']
                };

                this.items = [...presets[type]];
                this.updateItemsList();
                this.drawWheel();
                this.saveToStorage();
            }

            saveWheel() {
                const data = {
                    items: this.items,
                    settings: {
                        wheelSize: this.wheelSize,
                        spinDuration: this.spinDuration,
                        soundEnabled: this.soundEnabled,
                        darkMode: this.darkMode
                    }
                };
                
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'wheel-config.json';
                a.click();
                URL.revokeObjectURL(url);
            }

            loadWheel() {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            try {
                                const data = JSON.parse(e.target.result);
                                this.items = data.items || [];
                                if (data.settings) {
                                    this.wheelSize = data.settings.wheelSize || 400;
                                    this.spinDuration = data.settings.spinDuration || 4000;
                                    this.soundEnabled = data.settings.soundEnabled !== false;
                                    this.darkMode = data.settings.darkMode || false;
                                }
                                this.updateUI();
                                this.updateDarkModeUI();
                            } catch (error) {
                                alert('Invalid file format');
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
                document.getElementById('wheelSize').value = this.wheelSize;
                document.getElementById('spinDuration').value = this.spinDuration / 1000;
                document.getElementById('soundEnabled').checked = this.soundEnabled;
                document.getElementById('sizeValue').textContent = this.wheelSize;
                document.getElementById('durationValue').textContent = this.spinDuration / 1000;
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
                        darkMode: this.darkMode
                    }
                };
                // Note: Using a simple variable instead of localStorage for artifact compatibility
                window.wheelData = data;
            }

            loadFromStorage() {
                if (window.wheelData) {
                    const data = window.wheelData;
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
                    const historyList = document.getElementById('historyList');
                    historyList.innerHTML = '';
                    this.history.forEach(entry => {
                        const div = document.createElement('div');
                        div.className = 'history-item';
                        div.innerHTML = `<strong>${entry.item}</strong> <small>(${entry.time})</small>`;
                        historyList.appendChild(div);
                    });
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

        // Initialize the wheel when page loads
        window.addEventListener('load', () => {
            wheel = new WheelRoller();
        });
        