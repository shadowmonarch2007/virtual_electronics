class UserProfile {
    constructor() {
        this.username = 'Lab User';
        this.experience = 0;
        this.level = 1;
        this.actions = {
            componentsPlaced: 0,
            componentsDeleted: 0,
            canvasCleared: 0
        };
        
        // Experience thresholds for each level
        this.levelThresholds = [
            0,      // Level 1
            100,    // Level 2
            250,    // Level 3
            500,    // Level 4
            1000,   // Level 5
            2000,   // Level 6
            4000,   // Level 7
            8000,   // Level 8
            16000,  // Level 9
            32000   // Level 10
        ];
        
        this.initializeFromStorage();
        this.updateUI();
    }
    
    initializeFromStorage() {
        // Load profile data from localStorage if available
        try {
            const savedProfile = localStorage.getItem('circuit_lab_profile');
            if (savedProfile) {
                const profileData = JSON.parse(savedProfile);
                this.username = profileData.username || this.username;
                this.experience = profileData.experience || 0;
                this.level = profileData.level || 1;
                this.actions = profileData.actions || this.actions;
            }
        } catch (e) {
            console.error('Error loading profile data:', e);
        }
    }
    
    saveToStorage() {
        // Save profile data to localStorage
        try {
            const profileData = {
                username: this.username,
                experience: this.experience,
                level: this.level,
                actions: this.actions
            };
            localStorage.setItem('circuit_lab_profile', JSON.stringify(profileData));
        } catch (e) {
            console.error('Error saving profile data:', e);
        }
    }
    
    addExperience(amount) {
        this.experience += amount;
        this.checkLevelUp();
        this.updateUI();
        this.saveToStorage();
    }
    
    checkLevelUp() {
        // Check if player has reached next level threshold
        while (this.level < this.levelThresholds.length && 
               this.experience >= this.levelThresholds[this.level]) {
            this.level++;
            this.showLevelUpNotification();
        }
    }
    
    showLevelUpNotification() {
        const notification = document.createElement('div');
        notification.className = 'level-up-notification';
        notification.innerHTML = `
            <i class="fas fa-arrow-up"></i>
            <span>Level Up! You're now Level ${this.level}</span>
        `;
        document.body.appendChild(notification);
        
        // Add animation class after small delay to trigger animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Remove after animation completes
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 500);
        }, 3000);
    }
    
    trackComponentPlaced() {
        this.actions.componentsPlaced++;
        this.addExperience(10);
    }
    
    trackComponentDeleted() {
        this.actions.componentsDeleted++;
        this.addExperience(5);
    }
    
    trackCanvasCleared() {
        this.actions.canvasCleared++;
        this.addExperience(20);
    }
    
    getProgressToNextLevel() {
        if (this.level >= this.levelThresholds.length) {
            return 100; // Max level
        }
        
        const currentLevelExp = this.levelThresholds[this.level - 1];
        const nextLevelExp = this.levelThresholds[this.level];
        const expNeeded = nextLevelExp - currentLevelExp;
        const expGained = this.experience - currentLevelExp;
        
        return Math.min(100, Math.floor((expGained / expNeeded) * 100));
    }
    
    updateUI() {
        // Update username
        const usernameElement = document.getElementById('profile-username');
        if (usernameElement) {
            usernameElement.textContent = this.username;
        }
        
        // Update level
        const levelElement = document.getElementById('profile-level');
        if (levelElement) {
            levelElement.textContent = `Level ${this.level}`;
        }
        
        // Update exp progress bar
        const progressBar = document.getElementById('exp-progress-bar');
        const progressText = document.getElementById('exp-progress-text');
        
        if (progressBar) {
            const progressPercent = this.getProgressToNextLevel();
            progressBar.style.width = `${progressPercent}%`;
            
            // Add fire intensity classes based on progress
            progressBar.className = 'exp-progress-fill';
            if (progressPercent > 75) {
                progressBar.classList.add('intense-fire');
            } else if (progressPercent > 40) {
                progressBar.classList.add('medium-fire');
            } else {
                progressBar.classList.add('low-fire');
            }
        }
        
        if (progressText) {
            if (this.level >= this.levelThresholds.length) {
                progressText.textContent = `Max Level! (${this.experience} XP)`;
            } else {
                const nextLevel = this.levelThresholds[this.level];
                progressText.textContent = `${this.experience} / ${nextLevel} XP`;
            }
        }
    }
    
    setUsername(name) {
        this.username = name;
        this.updateUI();
        this.saveToStorage();
    }
}

// Create global instance
window.userProfile = new UserProfile();

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for circuit board to be initialized
    const checkInterval = setInterval(() => {
        if (window.circuitBoard) {
            // Hook into circuit board events
            const originalAddComponent = window.circuitBoard.addComponent;
            window.circuitBoard.addComponent = function(type, pos) {
                const component = originalAddComponent.call(this, type, pos);
                if (component && window.userProfile) {
                    window.userProfile.trackComponentPlaced();
                }
                return component;
            };
            
            const originalDeleteComponent = window.circuitBoard.deleteSelectedComponent;
            window.circuitBoard.deleteSelectedComponent = function() {
                if (this.selectedComponent && window.userProfile) {
                    window.userProfile.trackComponentDeleted();
                }
                originalDeleteComponent.call(this);
            };
            
            const originalClearCanvas = window.circuitBoard.clearCanvas;
            window.circuitBoard.clearCanvas = function() {
                if (window.userProfile) {
                    window.userProfile.trackCanvasCleared();
                }
                originalClearCanvas.call(this);
            };
            
            clearInterval(checkInterval);
        }
    }, 100);
}); 