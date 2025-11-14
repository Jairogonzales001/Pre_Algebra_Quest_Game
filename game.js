        // Game State
        let gameState = {
            playerHP: 100,
            playerMaxHP: 100,
            playerLevel: 1,
            playerXP: 0,
            playerXPToLevel: 100,
            wins: 0,
            streak: 0,
            gold: 50,
            currentEnemy: null,
            currentDungeon: 'forest',
            battleCount: 0,
            inventory: {
                healthPotion: 2,
                powerGem: 1,
                hintScroll: 1
            }
        };

        const itemInfo = {
            healthPotion: {
                name: 'Health Potion',
                emoji: '⚗️',
                cost: 30,
                description: 'Restores 50 HP',
                effect: function() {
                    if (gameState.playerHP >= gameState.playerMaxHP) {
                        addLog('❌ Already at full health!');
                        return false;
                    }
                    const healAmount = Math.min(50, gameState.playerMaxHP - gameState.playerHP);
                    gameState.playerHP = Math.min(gameState.playerHP + 50, gameState.playerMaxHP);
                    updatePlayerStats();
                    addLog(`💚 Used Health Potion! Restored ${healAmount} HP`);
                    return true;
                }
            },
            powerGem: {
                name: 'Power Gem',
                emoji: '💎',
                cost: 50,
                description: 'Next attack deals double damage',
                effect: function() {
                    if (gameState.powerBoost) {
                        addLog('❌ Power boost already active!');
                        return false;
                    }
                    gameState.powerBoost = true;
                    addLog('✨ Used Power Gem! Next attack is DOUBLED!');
                    return true;
                }
            },
            hintScroll: {
                name: 'Hint Scroll',
                emoji: '📜',
                cost: 20,
                description: 'Free hint for current problem',
                effect: function() {
                    useHint(true); // true means free hint
                    addLog('📖 Used Hint Scroll! (Free hint - saved 10 gold)');
                    return true;
                }
            }
        };

        const enemies = {
            forest: [
                { name: 'Algebra Goblin', emoji: '👹', hp: 50, xpReward: 25, goldReward: 15 },
                { name: 'Variable Troll', emoji: '🧌', hp: 75, xpReward: 35, goldReward: 20 },
                { name: 'Polynomial Witch', emoji: '🧙‍♀️', hp: 60, xpReward: 30, goldReward: 18 }
            ],
            cave: [
                { name: 'Dark Wizard', emoji: '🧙‍♂️', hp: 100, xpReward: 50, goldReward: 30 },
                { name: 'Stone Golem', emoji: '🗿', hp: 120, xpReward: 60, goldReward: 35 },
                { name: 'Shadow Beast', emoji: '👾', hp: 90, xpReward: 45, goldReward: 25 }
            ],
            tower: [
                { name: 'Demon Knight', emoji: '😈', hp: 150, xpReward: 75, goldReward: 50 },
                { name: 'Chaos Mage', emoji: '🔮', hp: 130, xpReward: 70, goldReward: 45 },
                { name: 'ALGEBRA DRAGON', emoji: '🐉', hp: 200, xpReward: 150, goldReward: 100, isBoss: true }
            ]
        };

        let currentProblem = {};
        let currentStep = 1; // Track which step player is on (1 or 2)
        let allowSkipSteps = false; // For Crystal Caves level 3+
        let problemStartTime = null; // For Shadow Tower timer

        function showLesson() {
            document.getElementById('titleScreen').style.display = 'none';
            document.getElementById('lessonScreen').style.display = 'block';
        }

        function backToTitle() {
            document.getElementById('lessonScreen').style.display = 'none';
            document.getElementById('dungeonSelect').style.display = 'none';
            document.getElementById('battleScreen').style.display = 'none';
            document.getElementById('titleScreen').style.display = 'flex';
        }

        function startGame() {
            document.getElementById('titleScreen').style.display = 'none';
            document.getElementById('lessonScreen').style.display = 'none';
            document.getElementById('dungeonSelect').style.display = 'flex';
        }

        // Inventory Functions
        function updateInventoryDisplay() {
            document.getElementById('healthPotionCount').textContent = gameState.inventory.healthPotion;
            document.getElementById('powerGemCount').textContent = gameState.inventory.powerGem;
            document.getElementById('hintScrollCount').textContent = gameState.inventory.hintScroll;

            // Update slot appearance based on count
            const slots = ['healthPotion', 'powerGem', 'hintScroll'];
            slots.forEach(item => {
                const slot = document.getElementById(item + 'Slot');
                if (gameState.inventory[item] === 0) {
                    slot.classList.add('empty');
                } else {
                    slot.classList.remove('empty');
                }
            });
        }

        function useItem(itemName) {
            console.log('Using item:', itemName, 'Current count:', gameState.inventory[itemName]);

            if (gameState.inventory[itemName] > 0) {
                const item = itemInfo[itemName];
                const wasUsed = item.effect();

                console.log('Item effect returned:', wasUsed);

                // Only consume the item if it was successfully used
                if (wasUsed === true) {
                    gameState.inventory[itemName]--;
                    console.log('Item consumed! New count:', gameState.inventory[itemName]);
                    updateInventoryDisplay();
                } else {
                    console.log('Item not consumed (returned false or undefined)');
                }
            } else {
                addLog('❌ You don\'t have any ' + itemInfo[itemName].name + 's!');
            }
        }

        function openShop() {
            document.getElementById('shopModal').style.display = 'flex';
            document.getElementById('shopGold').textContent = gameState.gold;
        }

        function closeShop() {
            document.getElementById('shopModal').style.display = 'none';
        }

        function buyItem(itemName) {
            const item = itemInfo[itemName];
            if (gameState.gold >= item.cost) {
                gameState.gold -= item.cost;
                gameState.inventory[itemName]++;
                updateInventoryDisplay();
                updatePlayerStats();
                document.getElementById('shopGold').textContent = gameState.gold;
                addLog('✅ Bought ' + item.name + ' for ' + item.cost + ' 🪙');
            } else {
                addLog('❌ Not enough gold! Need ' + item.cost + ' 🪙');
            }
        }

        function selectDungeon(dungeon) {
            gameState.currentDungeon = dungeon;
            gameState.battleCount = 0;
            document.getElementById('dungeonSelect').style.display = 'none';
            document.getElementById('battleScreen').style.display = 'block';
            updateDungeonName();
            spawnEnemy();
        }

        function updateDungeonName() {
            const dungeonNames = {
                forest: '🌲 Whispering Forest (Easy)',
                cave: '🏔️ Crystal Caves (Medium)',
                tower: '🏰 Shadow Tower (Hard)'
            };
            document.getElementById('currentDungeonName').textContent = dungeonNames[gameState.currentDungeon];
        }

        function togglePauseMenu() {
            const pauseMenu = document.getElementById('pauseMenu');
            if (pauseMenu.style.display === 'flex') {
                pauseMenu.style.display = 'none';
            } else {
                pauseMenu.style.display = 'flex';
                updateDungeonName();
            }
        }

        function changeDifficulty() {
            // Ask for confirmation
            if (confirm('Are you sure? Your current battle progress will be lost, but you keep your level, XP, and gold!')) {
                document.getElementById('pauseMenu').style.display = 'none';
                document.getElementById('battleScreen').style.display = 'none';
                document.getElementById('dungeonSelect').style.display = 'flex';
                gameState.playerHP = gameState.playerMaxHP;
                updatePlayerStats();
            }
        }

        function exitToTitle() {
            // Ask for confirmation
            if (confirm('Exit to title screen? Your progress will be saved!')) {
                document.getElementById('pauseMenu').style.display = 'none';
                document.getElementById('battleScreen').style.display = 'none';
                document.getElementById('titleScreen').style.display = 'flex';
            }
        }

        function returnToDungeonSelect() {
            document.getElementById('battleScreen').style.display = 'none';
            document.getElementById('victoryScreen').style.display = 'none';
            document.getElementById('defeatScreen').style.display = 'none';
            document.getElementById('dungeonSelect').style.display = 'flex';
            gameState.playerHP = gameState.playerMaxHP;
            updatePlayerStats();
        }

        function spawnEnemy() {
            const dungeonEnemies = enemies[gameState.currentDungeon];

            // Every 5th battle is a boss (if available)
            if (gameState.battleCount > 0 && gameState.battleCount % 5 === 0) {
                const boss = dungeonEnemies.find(e => e.isBoss);
                if (boss) {
                    gameState.currentEnemy = { ...boss, currentHP: boss.hp };
                    document.getElementById('enemySprite').classList.add('boss-sprite');
                } else {
                    gameState.currentEnemy = { ...dungeonEnemies[Math.floor(Math.random() * dungeonEnemies.length)], currentHP: dungeonEnemies[0].hp };
                }
            } else {
                const enemy = dungeonEnemies[Math.floor(Math.random() * dungeonEnemies.length)];
                gameState.currentEnemy = { ...enemy, currentHP: enemy.hp };
                document.getElementById('enemySprite').classList.remove('boss-sprite');
            }

            document.getElementById('enemySprite').textContent = gameState.currentEnemy.emoji;
            document.getElementById('enemyName').textContent = gameState.currentEnemy.name;
            document.getElementById('enemyHealth').style.width = '100%';

            document.getElementById('hintDisplay').innerHTML = '';
            generateProblem();
            addLog(`⚔️ ${gameState.currentEnemy.name} appeared!`);
            updatePlayerStats();
            updateInventoryDisplay();
        }

        function generateProblem() {
            // Generate two-step linear inequality: ax + b [inequality] c
            // Difficulty scales with player level!
            let a, b, c, inequality;
            const inequalitySymbols = ['<', '>', '<=', '>='];
            const playerLevel = gameState.playerLevel;

            if (gameState.currentDungeon === 'forest') {
                // Easy: positive coefficients, INTEGER answers only
                // Scales from level 1-10
                const maxCoeff = Math.min(2 + playerLevel, 10);
                const maxAnswer = Math.min(10 + (playerLevel * 2), 30);

                a = Math.floor(Math.random() * maxCoeff) + 2; // Always positive
                b = Math.floor(Math.random() * 10) + 1;

                // Generate integer answer, then work backwards
                const answer = Math.floor(Math.random() * maxAnswer) + 1;
                c = (a * answer) + b; // Ensures (c - b) / a is always an integer

                inequality = inequalitySymbols[Math.floor(Math.random() * 4)];
            } else if (gameState.currentDungeon === 'cave') {
                // Medium: can have negative coefficients, INTEGER answers only
                // At higher levels, negative numbers more common
                const maxCoeff = Math.min(3 + playerLevel, 12);
                const maxAnswer = Math.min(15 + (playerLevel * 2), 40);
                const negativeChance = Math.min(0.3 + (playerLevel * 0.05), 0.6);

                a = (Math.random() > negativeChance ? 1 : -1) * (Math.floor(Math.random() * maxCoeff) + 2);
                b = (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 20) + 1);

                // Generate integer answer (can be negative), then work backwards
                const answer = (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * maxAnswer);
                c = (a * answer) + b; // Ensures integer answer

                inequality = inequalitySymbols[Math.floor(Math.random() * 4)];
            } else {
                // Hard: negative coefficients more common
                // Gets VERY challenging at high levels
                const maxCoeff = Math.min(4 + playerLevel, 15);
                const maxConst = Math.min(15 + (playerLevel * 4), 75);
                const negativeChance = Math.min(0.5 + (playerLevel * 0.05), 0.8); // Lots of negatives!

                a = (Math.random() > negativeChance ? 1 : -1) * (Math.floor(Math.random() * maxCoeff) + 2);
                b = (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * maxConst) + 1);
                c = (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * maxConst) + 5);
                inequality = inequalitySymbols[Math.floor(Math.random() * 4)];
            }

            currentProblem = { a, b, c, inequality };
            currentStep = 1; // Reset to step 1 for new problem

            // Check if player can skip steps (Cave dungeon level 3+)
            allowSkipSteps = (gameState.currentDungeon === 'cave' && gameState.playerLevel >= 3);

            // Start timer for Shadow Tower
            if (gameState.currentDungeon === 'tower') {
                problemStartTime = Date.now();
            }

            // Format the inequality display
            const aStr = a === 1 ? '' : (a === -1 ? '-' : a);
            const bStr = b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`;
            const inequalityDisplay = inequality.replace('<=', '≤').replace('>=', '≥');

            document.getElementById('problemDisplay').innerHTML = `${aStr}x ${bStr} ${inequalityDisplay} ${c}`;

            updateStepPrompt();
            document.getElementById('spellInput').value = '';
            document.getElementById('spellInput').focus();
        }

        function updateStepPrompt() {
            const { a, b, c, inequality } = currentProblem;
            const aStr = a === 1 ? '' : (a === -1 ? '-' : a);
            const bStr = b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`;
            const inequalityDisplay = inequality.replace('<=', '≤').replace('>=', '≥');
            const playerLevel = gameState.playerLevel;
            const dungeon = gameState.currentDungeon;

            let promptText = '';
            let visualHTML = '';
            let timerHTML = '';
            let skipButtonHTML = '';

            // Shadow Tower: Show timer
            if (dungeon === 'tower' && problemStartTime) {
                timerHTML = `<div id="timer" style="color: #ffd700; font-size: 1.2em; text-align: center; margin-bottom: 10px;">⏱️ Time: <span id="timerDisplay">0.0</span>s</div>`;
                // Start timer update
                if (window.timerInterval) clearInterval(window.timerInterval);
                window.timerInterval = setInterval(() => {
                    const elapsed = ((Date.now() - problemStartTime) / 1000).toFixed(1);
                    const display = document.getElementById('timerDisplay');
                    if (display) display.textContent = elapsed;
                }, 100);
            }

            // Crystal Caves: Show skip button at level 3+
            if (allowSkipSteps) {
                skipButtonHTML = `<div style="text-align: center; margin-bottom: 10px;"><button class="battle-btn" style="background: linear-gradient(45deg, #ffd700, #ff6b6b); padding: 10px 20px; font-size: 0.9em;" onclick="toggleSkipMode()">⚡ Skip Steps & Solve Directly (Bonus Damage!)</button></div>`;
            }

            if (currentStep === 1) {
                // Step 1: Add or subtract to isolate ax
                const operation = b >= 0 ? 'subtract' : 'add';
                const operationValue = Math.abs(b);

                // FOREST: Gradual guidance removal
                if (dungeon === 'forest') {
                    if (playerLevel <= 2) {
                        // Full guidance
                        promptText = `<div style="color: #4ecdc4; font-size: 1.1em; margin-bottom: 10px;">Step 1 of 2: ${operation.charAt(0).toUpperCase() + operation.slice(1)} ${operationValue} from both sides</div>`;
                    } else if (playerLevel <= 5) {
                        // Minimal guidance
                        promptText = `<div style="color: #4ecdc4; font-size: 1.1em; margin-bottom: 10px;">Step 1 of 2</div>`;
                    } else {
                        // No guidance - they're on their own!
                        promptText = `<div style="color: #4ecdc4; font-size: 1.1em; margin-bottom: 10px;">Step 1 of 2 - You got this! 💪</div>`;
                    }
                } else if (dungeon === 'tower') {
                    // Tower: No operation hints after level 3
                    if (playerLevel <= 3) {
                        promptText = `<div style="color: #4ecdc4; font-size: 1.1em; margin-bottom: 10px;">Step 1 of 2: ${operation.charAt(0).toUpperCase() + operation.slice(1)} ${operationValue} from both sides</div>`;
                    } else {
                        promptText = `<div style="color: #4ecdc4; font-size: 1.1em; margin-bottom: 10px;">Step 1 of 2 ⚡</div>`;
                    }
                } else {
                    // Cave: Normal guidance
                    promptText = `<div style="color: #4ecdc4; font-size: 1.1em; margin-bottom: 10px;">Step 1 of 2: ${operation.charAt(0).toUpperCase() + operation.slice(1)} ${operationValue} from both sides</div>`;
                }

                visualHTML = `
                    <span class="hint-term">${aStr}x ${bStr}</span>
                    <span style="color: #ffd700;">${inequalityDisplay}</span>
                    <span class="hint-term">${c}</span>
                `;
                document.getElementById('spellInput').placeholder = `Type answer (e.g., ${aStr}x>${c - b})`;
            } else {
                // Step 2: Divide to isolate x
                const step1Result = c - b;
                const step1Ineq = inequality.replace('<=', '≤').replace('>=', '≥');
                const divideBy = a;

                // FOREST: Gradual guidance removal
                if (dungeon === 'forest') {
                    if (playerLevel <= 2) {
                        promptText = `<div style="color: #4ecdc4; font-size: 1.1em; margin-bottom: 10px;">Step 2 of 2: Divide both sides by ${divideBy}</div>`;
                        if (divideBy < 0) {
                            promptText += `<div style="color: #ff6b6b; font-size: 0.95em;">⚠️ Dividing by a negative! Remember to flip the inequality!</div>`;
                        }
                    } else if (playerLevel <= 5) {
                        promptText = `<div style="color: #4ecdc4; font-size: 1.1em; margin-bottom: 10px;">Step 2 of 2</div>`;
                        if (divideBy < 0) {
                            promptText += `<div style="color: #ff6b6b; font-size: 0.95em;">⚠️ Watch out for negatives!</div>`;
                        }
                    } else {
                        promptText = `<div style="color: #4ecdc4; font-size: 1.1em; margin-bottom: 10px;">Step 2 of 2 - Almost there! 🎯</div>`;
                    }
                } else if (dungeon === 'tower') {
                    // Tower: Minimal hints after level 3
                    if (playerLevel <= 3) {
                        promptText = `<div style="color: #4ecdc4; font-size: 1.1em; margin-bottom: 10px;">Step 2 of 2: Divide both sides by ${divideBy}</div>`;
                        if (divideBy < 0) {
                            promptText += `<div style="color: #ff6b6b; font-size: 0.95em;">⚠️ Dividing by a negative! Remember to flip the inequality!</div>`;
                        }
                    } else {
                        promptText = `<div style="color: #4ecdc4; font-size: 1.1em; margin-bottom: 10px;">Step 2 of 2 ⚡</div>`;
                        if (divideBy < 0) {
                            promptText += `<div style="color: #ff6b6b; font-size: 0.95em;">⚠️ Negative alert!</div>`;
                        }
                    }
                } else {
                    // Cave: Normal guidance
                    promptText = `<div style="color: #4ecdc4; font-size: 1.1em; margin-bottom: 10px;">Step 2 of 2: Divide both sides by ${divideBy}</div>`;
                    if (divideBy < 0) {
                        promptText += `<div style="color: #ff6b6b; font-size: 0.95em;">⚠️ Dividing by a negative! Remember to flip the inequality!</div>`;
                    }
                }

                visualHTML = `
                    <span class="hint-term">${aStr}x</span>
                    <span style="color: #ffd700;">${step1Ineq}</span>
                    <span class="hint-term">${step1Result}</span>
                `;
                document.getElementById('spellInput').placeholder = 'Type final answer (e.g., x>5)';
            }

            document.getElementById('visualHint').innerHTML = timerHTML + skipButtonHTML + promptText + visualHTML;
        }

        function formatTerm(num, hasVar = false) {
            if (num === 1 && hasVar) return 'x';
            if (num === -1 && hasVar) return '-x';
            return num + (hasVar ? 'x' : '');
        }

        function toggleSkipMode() {
            // Cave dungeon level 3+: Allow skipping to final answer
            if (!allowSkipSteps) return;

            // Jump to "skip mode" - accept final answer directly
            currentStep = 'skip';
            const solution = calculateAnswer();
            const ineqDisplay = solution.inequality.replace('<=', '≤').replace('>=', '≥');

            document.getElementById('visualHint').innerHTML = `
                <div style="color: #ffd700; font-size: 1.2em; text-align: center; margin-bottom: 10px;">⚡ DIRECT SOLVE MODE - 2X DAMAGE! ⚡</div>
                <div style="color: #4ecdc4; font-size: 1em; text-align: center; margin-bottom: 15px;">Solve the entire inequality in one go for DOUBLE damage!</div>
                <div style="text-align: center;">
                    <span class="hint-term">${currentProblem.a === 1 ? '' : (currentProblem.a === -1 ? '-' : currentProblem.a)}x ${currentProblem.b >= 0 ? '+' : ''} ${currentProblem.b}</span>
                    <span style="color: #ffd700;"> ${currentProblem.inequality.replace('<=', '≤').replace('>=', '≥')} </span>
                    <span class="hint-term">${currentProblem.c}</span>
                </div>
            `;
            document.getElementById('spellInput').placeholder = 'Type final answer (e.g., x>5)';
            document.getElementById('spellInput').value = '';
            document.getElementById('spellInput').focus();
        }

        function castSpell() {
            const answer = document.getElementById('spellInput').value.trim();
            let correct = false;

            // Check if in skip mode (Cave dungeon level 3+)
            if (currentStep === 'skip') {
                correct = checkFinalAnswer(answer);
            } else {
                correct = checkStepAnswer(answer);
            }

            if (correct) {
                if (currentStep === 1) {
                    // Step 1 correct, move to step 2
                    addLog(`✅ Step 1 complete!`);
                    currentStep = 2;
                    updateStepPrompt();
                    document.getElementById('spellInput').value = '';
                    document.getElementById('spellInput').focus();
                } else {
                    // Step 2 or Skip mode correct - Deal damage!
                    // Stop timer if Tower dungeon
                    if (window.timerInterval) {
                        clearInterval(window.timerInterval);
                        window.timerInterval = null;
                    }

                    const baseDamage = 20 + (gameState.playerLevel * 5);
                    const streakBonus = gameState.streak * 2;
                    let totalDamage = baseDamage + streakBonus;
                    let damageMultiplier = 1;

                    // CAVE SKIP MODE BONUS: 2x damage
                    if (currentStep === 'skip') {
                        damageMultiplier *= 2;
                        addLog('⚡ DIRECT SOLVE BONUS! Damage DOUBLED!');
                    }

                    // TOWER TIMER BONUS: Faster = more damage
                    if (gameState.currentDungeon === 'tower' && problemStartTime) {
                        const timeElapsed = (Date.now() - problemStartTime) / 1000;
                        if (timeElapsed < 5) {
                            damageMultiplier *= 2;
                            addLog(`⚡ SPEED BONUS! Solved in ${timeElapsed.toFixed(1)}s - Damage DOUBLED!`);
                        } else if (timeElapsed < 10) {
                            damageMultiplier *= 1.5;
                            addLog(`⚡ SPEED BONUS! Solved in ${timeElapsed.toFixed(1)}s - Damage x1.5!`);
                        } else if (timeElapsed < 15) {
                            damageMultiplier *= 1.25;
                            addLog(`⚡ SPEED BONUS! Solved in ${timeElapsed.toFixed(1)}s - Damage x1.25!`);
                        }
                    }

                    totalDamage = Math.floor(totalDamage * damageMultiplier);

                    // Apply power boost if active
                    if (gameState.powerBoost) {
                        totalDamage *= 2;
                        addLog('💎 POWER GEM ACTIVATED! Damage DOUBLED AGAIN!');
                        gameState.powerBoost = false;
                    }

                    dealDamage(totalDamage);
                    showSpellEffect();
                    gameState.streak++;
                    addLog(`✨ Perfect spell! Dealt ${totalDamage} damage! (Streak: ${gameState.streak})`);

                    if (gameState.currentEnemy.currentHP <= 0) {
                        victory();
                    } else {
                        setTimeout(() => {
                            document.getElementById('hintDisplay').innerHTML = '';
                            generateProblem();
                        }, 1500);
                    }
                }
            } else {
                // Wrong answer - enemy attacks!
                gameState.streak = 0;

                // Stop timer if Tower dungeon
                if (window.timerInterval) {
                    clearInterval(window.timerInterval);
                    window.timerInterval = null;
                }

                // Show correct answer for this step
                let stepSolution = '';
                if (currentStep === 'skip') {
                    const solution = calculateAnswer();
                    const ineqDisplay = solution.inequality.replace('<=', '≤').replace('>=', '≥');
                    stepSolution = `x ${ineqDisplay} ${solution.value}`;
                    addLog(`❌ Wrong! Correct answer: ${stepSolution}`);
                } else {
                    stepSolution = getStepSolution();
                    addLog(`❌ Wrong! Correct answer for Step ${currentStep}: ${stepSolution}`);
                }

                // Enemy counter-attack - scales with player level!
                const baseDamage = 10 + Math.floor(Math.random() * 10);
                const levelScaling = gameState.playerLevel * 2; // +2 damage per level
                const enemyDamage = baseDamage + levelScaling;
                gameState.playerHP = Math.max(0, gameState.playerHP - enemyDamage);
                updatePlayerHealth();
                addLog(`💥 ${gameState.currentEnemy.name} counter-attacks for ${enemyDamage} damage!`);

                if (gameState.playerHP <= 0) {
                    defeat();
                } else {
                    // Show solution and reset to new problem
                    showSolution();
                    setTimeout(() => {
                        document.getElementById('hintDisplay').innerHTML = '';
                        generateProblem();
                    }, 4000);
                }
            }
            updatePlayerStats();
        }

        function checkFinalAnswer(answer) {
            // For skip mode - check final answer directly
            answer = answer.replace(/\s+/g, '').toLowerCase();
            const pattern = /^x([<>]=?|[<>])([+-]?[\d.]+)$/;
            const match = answer.match(pattern);

            if (!match) return false;

            const userInequality = match[1];
            const userValue = parseFloat(match[2]);

            const correct = calculateAnswer();

            // Check if inequality symbol matches
            if (userInequality !== correct.inequality) return false;

            // Check if value matches (with small tolerance for rounding)
            return Math.abs(userValue - correct.value) < 0.01;
        }

        function checkStepAnswer(answer) {
            // Remove spaces and convert to lowercase
            answer = answer.replace(/\s+/g, '').toLowerCase();

            const { a, b, c, inequality } = currentProblem;

            if (currentStep === 1) {
                // Step 1: Should be ax [inequality] c-b
                // Pattern: 2x>4, -3x<=10, x>=5, etc.
                const pattern = /^([+-]?\d*)x([<>]=?|[<>])([+-]?\d+)$/;
                const match = answer.match(pattern);

                if (!match) return false;

                const userA = match[1] === '' ? 1 : (match[1] === '-' ? -1 : parseInt(match[1]));
                const userInequality = match[2];
                const userRightSide = parseInt(match[3]);

                const correctRightSide = c - b;

                return userA === a && userInequality === inequality && userRightSide === correctRightSide;
            } else {
                // Step 2: Should be x [inequality] (c-b)/a with potential flip
                const pattern = /^x([<>]=?|[<>])([+-]?[\d.]+)$/;
                const match = answer.match(pattern);

                if (!match) return false;

                const userInequality = match[1];
                const userValue = parseFloat(match[2]);

                const correct = calculateAnswer();

                // Check if inequality symbol matches
                if (userInequality !== correct.inequality) return false;

                // Check if value matches (with small tolerance for rounding)
                return Math.abs(userValue - correct.value) < 0.01;
            }
        }

        function getStepSolution() {
            const { a, b, c, inequality } = currentProblem;
            const aStr = a === 1 ? '' : (a === -1 ? '-' : a);

            if (currentStep === 1) {
                const rightSide = c - b;
                const ineqDisplay = inequality.replace('<=', '≤').replace('>=', '≥');
                return `${aStr}x ${ineqDisplay} ${rightSide}`;
            } else {
                const solution = calculateAnswer();
                const ineqDisplay = solution.inequality.replace('<=', '≤').replace('>=', '≥');
                return `x ${ineqDisplay} ${solution.value.toFixed(2)}`;
            }
        }

        function checkAnswer(answer) {
            // Remove spaces and convert to lowercase
            answer = answer.replace(/\s+/g, '').toLowerCase();

            // Pattern to match inequality solutions: x > 5, x <= -3, x>=2, etc.
            const pattern = /^x([<>]=?|[<>])([+-]?[\d.]+)$/;
            const match = answer.match(pattern);

            if (!match) return false;

            const userInequality = match[1];
            const userValue = parseFloat(match[2]);

            const correct = calculateAnswer();

            // Check if inequality symbol matches
            if (userInequality !== correct.inequality) return false;

            // Check if value matches (with small tolerance for rounding)
            return Math.abs(userValue - correct.value) < 0.01;
        }

        function calculateAnswer() {
            // Solve ax + b [inequality] c
            // Step 1: ax + b [inequality] c  →  ax [inequality] c - b
            // Step 2: x [inequality] (c - b) / a

            const { a, b, c, inequality } = currentProblem;

            // Subtract b from both sides
            const rightSide = c - b;

            // Divide by a
            let value = rightSide / a;
            let finalInequality = inequality;

            // IMPORTANT: Reverse inequality if dividing by negative
            if (a < 0) {
                if (inequality === '<') finalInequality = '>';
                else if (inequality === '>') finalInequality = '<';
                else if (inequality === '<=') finalInequality = '>=';
                else if (inequality === '>=') finalInequality = '<=';
            }

            return { inequality: finalInequality, value: value };
        }

        function showSolution() {
            const { a, b, c, inequality } = currentProblem;
            const answer = calculateAnswer();

            // Format inequality display
            const aStr = a === 1 ? '' : (a === -1 ? '-' : a);
            const bStr = b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`;
            const inequalityDisplay = inequality.replace('<=', '≤').replace('>=', '≥');
            const finalInequalityDisplay = answer.inequality.replace('<=', '≤').replace('>=', '≥');

            // Step 1: Subtract b from both sides
            const step1Left = `${aStr}x`;
            const step1Right = c - b;
            const step1InequalityDisplay = inequality.replace('<=', '≤').replace('>=', '≥');

            // Step 2: Divide by a (and reverse if negative)
            const reverseNote = a < 0 ? '<br><span style="color: #ff6b6b;">⚠️ Dividing by negative, so reverse inequality!</span>' : '';

            const solutionHTML = `
                <div class="solution-box">
                    <strong>📖 SOLUTION:</strong><br><br>
                    <strong>Original:</strong> ${aStr}x ${bStr} ${inequalityDisplay} ${c}<br><br>
                    <strong>Step 1:</strong> Subtract ${b >= 0 ? b : `(${b})`} from both sides<br>
                    ${step1Left} ${step1InequalityDisplay} ${step1Right}${reverseNote}<br><br>
                    <strong>Step 2:</strong> Divide both sides by ${a}<br>
                    x ${finalInequalityDisplay} ${answer.value.toFixed(2)}<br><br>
                    <strong style="font-size: 1.3em;">✅ Correct Answer: x ${finalInequalityDisplay} ${answer.value.toFixed(2)}</strong>
                </div>
            `;
            document.getElementById('hintDisplay').innerHTML = solutionHTML;

            // Scroll the solution into view
            setTimeout(() => {
                const hintDisplay = document.getElementById('hintDisplay');
                hintDisplay.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
        }

        function useHint(free = false) {
            if (!free) {
                if (gameState.gold < 10) {
                    addLog('❌ Not enough gold for a hint!');
                    return;
                }
                gameState.gold -= 10;
                updatePlayerStats();
            }

            const { a, b, c, inequality } = currentProblem;
            let hintHTML = '';

            if (currentStep === 1) {
                // Hint for Step 1
                const operation = b >= 0 ? `Subtract ${b}` : `Add ${Math.abs(b)}`;
                const result = c - b;
                const aStr = a === 1 ? '' : (a === -1 ? '-' : a);
                const ineqDisplay = inequality.replace('<=', '≤').replace('>=', '≥');
                hintHTML = `
                    <div class="hint-tooltip">
                        <strong>💡 Hint for Step 1:</strong><br>
                        ${operation} from both sides to isolate the ${aStr}x term<br>
                        <strong>Result will be:</strong> ${aStr}x ${ineqDisplay} ${result}<br>
                        <strong>Format:</strong> Type like: ${aStr}x${inequality}${result}
                    </div>
                `;
            } else {
                // Hint for Step 2
                const step1Result = c - b;
                const reverseWarning = a < 0 ? '<br>⚠️ <strong>IMPORTANT:</strong> You\'re dividing by a NEGATIVE! The inequality MUST flip!' : '';
                const solution = calculateAnswer();
                const ineqDisplay = solution.inequality.replace('<=', '≤').replace('>=', '≥');
                hintHTML = `
                    <div class="hint-tooltip">
                        <strong>💡 Hint for Step 2:</strong><br>
                        Divide both sides by ${a} to solve for x${reverseWarning}<br>
                        <strong>Calculation:</strong> ${step1Result} ÷ ${a} = ${solution.value.toFixed(2)}<br>
                        <strong>Answer:</strong> x ${ineqDisplay} ${solution.value.toFixed(2)}<br>
                        <strong>Format:</strong> Type like: x${solution.inequality}${solution.value.toFixed(2)}
                    </div>
                `;
            }

            document.getElementById('hintDisplay').innerHTML = hintHTML;
            if (!free) {
                addLog(`💡 Hint for Step ${currentStep} purchased for 10 gold!`);
            }
        }

        function dealDamage(damage) {
            gameState.currentEnemy.currentHP = Math.max(0, gameState.currentEnemy.currentHP - damage);
            const hpPercent = (gameState.currentEnemy.currentHP / gameState.currentEnemy.hp) * 100;
            document.getElementById('enemyHealth').style.width = hpPercent + '%';

            // Show damage number
            const damageNum = document.createElement('div');
            damageNum.className = 'damage-number';
            damageNum.textContent = '-' + damage;
            damageNum.style.left = '70%';
            damageNum.style.top = '30%';
            document.querySelector('.battle-field').appendChild(damageNum);
            setTimeout(() => damageNum.remove(), 1000);
        }

        function showSpellEffect() {
            const effect = document.createElement('div');
            effect.className = 'spell-effect';
            effect.style.left = '60%';
            effect.style.top = '40%';
            document.querySelector('.battle-field').appendChild(effect);
            setTimeout(() => effect.remove(), 600);
        }

        function victory() {
            const xp = gameState.currentEnemy.xpReward;
            const gold = gameState.currentEnemy.goldReward;

            gameState.wins++;
            gameState.playerXP += xp;
            gameState.gold += gold;
            gameState.battleCount++;

            document.getElementById('xpReward').textContent = xp;
            document.getElementById('goldReward').textContent = gold;

            let levelUpMsg = '';
            if (gameState.playerXP >= gameState.playerXPToLevel) {
                gameState.playerLevel++;
                gameState.playerXP = 0;
                gameState.playerXPToLevel += 50;
                gameState.playerMaxHP += 20;
                gameState.playerHP = gameState.playerMaxHP;
                levelUpMsg = `🎉 LEVEL UP! Now Level ${gameState.playerLevel}!`;
            }
            document.getElementById('levelUpMsg').textContent = levelUpMsg;

            updatePlayerStats();
            document.getElementById('victoryScreen').style.display = 'flex';
            addLog(`🏆 Victory! Earned ${xp} XP and ${gold} gold!`);
        }

        function defeat() {
            document.getElementById('defeatScreen').style.display = 'flex';
            addLog('💀 You were defeated...');
        }

        function nextBattle() {
            document.getElementById('victoryScreen').style.display = 'none';
            spawnEnemy();
        }

        function retry() {
            gameState.playerHP = gameState.playerMaxHP;
            gameState.streak = 0;
            document.getElementById('defeatScreen').style.display = 'none';
            updatePlayerStats();
            spawnEnemy();
        }

        function updatePlayerStats() {
            document.getElementById('playerLevel').textContent = gameState.playerLevel;
            document.getElementById('playerXP').textContent = `${gameState.playerXP} / ${gameState.playerXPToLevel}`;
            document.getElementById('playerWins').textContent = gameState.wins;
            document.getElementById('playerStreak').textContent = gameState.streak;
            document.getElementById('playerGold').textContent = gameState.gold + ' 🪙';
            updatePlayerHealth();
        }

        function updatePlayerHealth() {
            const hpPercent = (gameState.playerHP / gameState.playerMaxHP) * 100;
            document.getElementById('playerHealth').style.width = hpPercent + '%';
        }

        function addLog(message) {
            const log = document.getElementById('battleLog');
            const entry = document.createElement('div');
            entry.className = 'log-entry';
            entry.textContent = message;
            log.insertBefore(entry, log.firstChild);

            // Auto-remove message after 15 seconds
            setTimeout(() => {
                if (entry.parentNode) {
                    entry.style.transition = 'opacity 0.5s';
                    entry.style.opacity = '0';
                    setTimeout(() => {
                        if (entry.parentNode) {
                            entry.remove();
                        }
                    }, 500); // Wait for fade out animation
                }
            }, 15000); // 15 seconds

            // Keep only last 5 entries
            while (log.children.length > 5) {
                log.removeChild(log.lastChild);
            }
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', function(event) {
            // ESC key to toggle pause menu (only during battle)
            if (event.key === 'Escape') {
                const battleScreen = document.getElementById('battleScreen');
                const victoryScreen = document.getElementById('victoryScreen');
                const defeatScreen = document.getElementById('defeatScreen');

                // Only allow pause if in battle and not on victory/defeat screen
                if (battleScreen.style.display === 'block' &&
                    victoryScreen.style.display !== 'flex' &&
                    defeatScreen.style.display !== 'flex') {
                    togglePauseMenu();
                }
            }
        });
