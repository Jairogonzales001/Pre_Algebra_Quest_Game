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

        function startGame() {
            document.getElementById('titleScreen').style.display = 'none';
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
                // Easy: positive coefficients, simple numbers
                // Scales from level 1-10
                const maxCoeff = Math.min(2 + playerLevel, 10); // Coefficients get bigger
                const maxConst = Math.min(5 + (playerLevel * 2), 30); // Constants get bigger

                a = Math.floor(Math.random() * maxCoeff) + 2; // Always positive
                b = Math.floor(Math.random() * maxConst) + 1;
                c = Math.floor(Math.random() * (maxConst * 2)) + maxConst;
                inequality = inequalitySymbols[Math.floor(Math.random() * 4)];
            } else if (gameState.currentDungeon === 'cave') {
                // Medium: can have negative coefficients
                // At higher levels, negative numbers more common
                const maxCoeff = Math.min(3 + playerLevel, 12);
                const maxConst = Math.min(10 + (playerLevel * 3), 50);
                const negativeChance = Math.min(0.3 + (playerLevel * 0.05), 0.6); // More negatives as you level

                a = (Math.random() > negativeChance ? 1 : -1) * (Math.floor(Math.random() * maxCoeff) + 2);
                b = (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * maxConst) + 1);
                c = (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * maxConst) + 5);
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

            // Format the inequality display
            const aStr = a === 1 ? '' : (a === -1 ? '-' : a);
            const bStr = b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`;
            const inequalityDisplay = inequality.replace('<=', '≤').replace('>=', '≥');

            document.getElementById('problemDisplay').innerHTML = `${aStr}x ${bStr} ${inequalityDisplay} ${c}`;

            const visualHTML = `
                <span class="hint-term">${aStr}x ${bStr}</span>
                <span style="color: #ffd700;">${inequalityDisplay}</span>
                <span class="hint-term">${c}</span>
            `;
            document.getElementById('visualHint').innerHTML = visualHTML;
            document.getElementById('spellInput').value = '';
            document.getElementById('spellInput').focus();
        }

        function formatTerm(num, hasVar = false) {
            if (num === 1 && hasVar) return 'x';
            if (num === -1 && hasVar) return '-x';
            return num + (hasVar ? 'x' : '');
        }

        function castSpell() {
            const answer = document.getElementById('spellInput').value.trim();
            const correct = checkAnswer(answer);

            if (correct) {
                // Calculate damage
                const baseDamage = 20 + (gameState.playerLevel * 5);
                const streakBonus = gameState.streak * 2;
                let totalDamage = baseDamage + streakBonus;

                // Apply power boost if active
                if (gameState.powerBoost) {
                    totalDamage *= 2;
                    addLog('💎 POWER GEM ACTIVATED! Damage DOUBLED!');
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
            } else {
                const solution = calculateAnswer();
                const inequalityDisplay = solution.inequality.replace('<=', '≤').replace('>=', '≥');

                addLog(`❌ Wrong! Correct answer: x ${inequalityDisplay} ${solution.value.toFixed(2)}`);
                gameState.streak = 0;

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
                    showSolution();
                    setTimeout(() => {
                        document.getElementById('hintDisplay').innerHTML = '';
                        generateProblem();
                    }, 4000);
                }
            }
            updatePlayerStats();
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

            const { a, b, c } = currentProblem;
            const reverseWarning = a < 0 ? '<br>⚠️ Remember: Dividing by a negative reverses the inequality!' : '';

            const hintHTML = `
                <div class="hint-tooltip">
                    <strong>💡 Hint:</strong><br>
                    <strong>Step 1:</strong> Subtract ${b >= 0 ? b : `(${b})`} from both sides to isolate the x term<br>
                    <strong>Step 2:</strong> Divide both sides by ${a} to solve for x${reverseWarning}<br>
                    <strong>Format:</strong> Type your answer like: x>5 or x<=-3
                </div>
            `;
            document.getElementById('hintDisplay').innerHTML = hintHTML;
            if (!free) {
                addLog('💡 Hint purchased for 10 gold!');
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
