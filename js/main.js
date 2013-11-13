/*
 * Copyright (c) 2012, Intel Corporation.
 *
 * This program is licensed under the terms and conditions of the 
 * Apache License, version 2.0.  The full text of the Apache License is at
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 */

Game = {};

var stariconsList = [
    "images/purple_star.png",
    "images/green_star.png",
    "images/red_star.png"
];

var audioItems = [
    "flipcard_sound",
    "startGame_sound",
    "finaleIntro_sound",
    "winLevel_sound",
    "victory_sound"
];

var audioSrc = [
    "audio/FlipCard.wav",
    "audio/StartPage.wav",
    "audio/TheFinale.wav",
    "audio/WinLevel.wav",
    "audio/YouWin.wav"
];

var SOUND_FLIPCARD = 0;
var SOUND_STARTGAME = 1;
var SOUND_FINALEINTRO = 2;
var SOUND_LEVEL_WON = 3;
var SOUND_VICTORY = 4;


var LOCKED_LEVELCARD_STYLE = "setLevel_lockedLevel";
var GAMES_PER_LEVEL = 3;
var LOCAL_STORAGE_KEY = "memorygame_locked_levels";


(function () {
    var cardsArray = new Array();
    var levelSelectionUserChoice = -1;
    var ignoreInputs = false;
    var matchcard = undefined;
    var levelNumber = -1;
    var passedGames = 0;
    var levelLockingStatus = [ false, true, true, true ];
    
    // Set memberfunctions.
    Game.flipCallback = flipCallback;
    Game.flipDelayCallback = flipDelayCallback;
    Game.gotoNextGame = gotoNextGame;
    Game.levelSelectionAnimCallback = levelSelectionAnimCallback;
    Game.introViewSkipCallback = introViewSkipCallback;
    
    /**
     * Create sound element base on their ID
     */
    function createSoundElement(soundId) {
        var audioElement = document.createElement('audio');
        audioElement.setAttribute("id", audioItems[soundId]);
        audioElement.setAttribute("src", audioSrc[soundId]);
        audioElement.setAttribute("preload", "auto");
        document.body.appendChild(audioElement);
    }

    /**
     * Plays sounds base on their ID
     */
    function playSound(soundId) {
        var audioElement = document.getElementById(audioItems[soundId]);
        if (audioElement.currentTime > 0) {
            audioElement.pause();
            audioElement.currentTime = 0;
        }
        audioElement.play();
    }

    var gamedata = [
        {
            cardcount : 12
        },
        {
            cardcount : 18
        },
        {
            cardcount : 24
        },
        {
            cardcount : 24
        }
    ];

    /**
     * This function prepares the graphical elements of Victory-screen.
     */
    function prepareVictoryScreen() {
        // Draw the curved YOU WIN text.
        var drawer = new CurvedTextDrawer(document.getElementById("curvedText"));
        var centerPos = drawer.getCanvasCenterPos();
        centerPos.mY = -625;
        drawer.useFont = '70px Romantiques';
        drawer.drawSectorArc("YOU WIN", centerPos.mX, centerPos.mY, 780, 180, 270, 'ccw', true, 'center');
        
        $("#homebutton_backtomain").hide();
    }
    
    /**
     * Reads the level lock status from local storage and sets the card element styles
     * accordingly.
     */
    function prepareSelectLevelScreen() {
        console.log("--> prepareSelectLevelScreen()");
        var lockedLevels = localStorage.getItem(LOCAL_STORAGE_KEY);
        for (var i=1; i < levelLockingStatus.length; ++i) {
            if (lockedLevels != undefined && lockedLevels != null && lockedLevels.length > i) {
                console.log("    read data: " + lockedLevels);
                if (lockedLevels[i] == '0') {
                    levelLockingStatus[i] = false;
                } else {
                    levelLockingStatus[i] = true;
                }
            } else {
                levelLockingStatus[i] = true;
            }
            var cardElement = $("#selLevel_levelCard"+(i+1));
            cardElement.removeClass(LOCKED_LEVELCARD_STYLE);
            if (levelLockingStatus[i]) {
                cardElement.addClass(LOCKED_LEVELCARD_STYLE);
            }
        }
        console.log("<-- prepareSelectLevelScreen()");
    }
    
    /**
     * Saves the level lock status to local storage.
     */
    function saveStatus() {
        console.log("--> saveStatus()");
        var lockedLevelsStr = '0';
        for (var i = 1; i < levelLockingStatus.length; ++i) {
            if (levelLockingStatus[i]) {
                console.log("    level: " + i + ", lock: locked");
                lockedLevelsStr += '1';
            } else {
                console.log("    level: " + i + ", lock: unlocked");
                lockedLevelsStr += '0';
            }
        }
        console.log("    data: " + lockedLevelsStr);
        localStorage.setItem(LOCAL_STORAGE_KEY, lockedLevelsStr);
        console.log("<-- saveStatus()");
    }
    
    /**
     * Checks the states of the cards and tells if all the pairs have been found.
     * @return  true if all the pairs have been found.
     */
    function allPairsFound() {
        var flipcount = 0;
        var cardcount = gamedata[levelNumber-1].cardcount;
        $(".flip").each(function() { flipcount++; });
        return (flipcount >= cardcount);
    }
    
    
    /**
     * A callback function that gets called when card rotation animation ends. This
     * function checks if two rotated cards are pairs.
     */
    function flipCallback(elem) {
        console.log("--> Game.flipCallback()");
        var newcard = $(elem).attr("id");
        if (matchcard == undefined) {
            // This is the first card being turned.
            matchcard = newcard;
            ignoreInputs = false;
        } else {
            var newclass = $("#"+newcard+" .front").attr("class");
            var matchclass = $("#"+matchcard+" .front").attr("class");

            if(newclass == matchclass)
            {
                if (allPairsFound()) {
                    gotoNextGame();
                }
                ignoreInputs = false;
            } else {
                console.log("    no match");
                $("#"+newcard).removeClass('flip');
                $("#"+matchcard).removeClass('flip');

                /* keep ignoring input til the cards are flipped back */
                window.setTimeout("Game.flipDelayCallback()", 300);
            }

            /* reset the match card */
            matchcard = undefined;
        }
        console.log("<-- Game.flipCallback()");
    }
    
    /**
     * Callbackfunction that rotates the two latest cards upside down again.
     */
    function flipDelayCallback() {
        ignoreInputs = false;
    }

    /**
     * This should be called when game has been played through. It does the actions that are
     * needed to handle game and level progress and also showing victory screen.
     */
    function gotoNextGame() {
        console.log("--> gotoNextGame()");
        if (levelNumber == 4) {
            levelLockingStatus[0] = false;
            levelLockingStatus[1] = false;
            levelLockingStatus[2] = false;
            levelLockingStatus[3] = false;
            saveStatus();
            // Currently finished level was 4. It means that player has finished the game.
            prepareVictoryScreen();
            playSound(SOUND_VICTORY);
            $("#level4").hide();
            $("#victory").show();
            return;
        }
        passedGames++;
        var levelOfNextGame = levelNumber;
        if (passedGames >= GAMES_PER_LEVEL) {
            // Move to next level.
            passedGames = 0;
            levelOfNextGame++;
            
            // Next level unlocked.
            levelLockingStatus[levelNumber] = false;
            if (levelOfNextGame != 4) {
                playSound(SOUND_LEVEL_WON);
            }
        } 
        if (levelOfNextGame == 4) {
            // Show intro view before entring the final level.
            levelLockingStatus[3] = false;
            playSound(SOUND_FINALEINTRO);
            $("#homebutton_backtomain").hide();
            $("#handitem").hide();
            $("#level3").hide();
            $("#finaleIntro").show();
        } else {
            startGame(levelOfNextGame, false);
        }
        saveStatus();
        console.log("<-- gotoNextGame()");
    }
    
    /**
     * A callback function that gets called when level selection animation has ended.
     */
    function levelSelectionAnimCallback() {
        console.log("--> levelSelectionAnimCallback()");
        $("#selLevel_page").hide();
        $("#selLevel_levelCard1").removeClass("selLevel_selectedCard selLevel_anim1 selLevel_anim2 selLevel_anim3 selLevel_anim4");
        $("#selLevel_levelCard2").removeClass("selLevel_selectedCard selLevel_anim1 selLevel_anim2 selLevel_anim3 selLevel_anim4");
        $("#selLevel_levelCard3").removeClass("selLevel_selectedCard selLevel_anim1 selLevel_anim2 selLevel_anim3 selLevel_anim4");
        $("#selLevel_levelCard4").removeClass("selLevel_selectedCard selLevel_anim1 selLevel_anim2 selLevel_anim3 selLevel_anim4");
        startGame(levelSelectionUserChoice, true);
        playSound(SOUND_LEVEL_WON);
        console.log("<-- levelSelectionAnimCallback()");
    }
    
    /**
     * Initializes the structures to start new game.
     * @param   levelNum        The level that will be started.
     * @param   resteState      Pass true to reset the game counts to 0.
     */
    function startGame(levelNum, resetState) {
        console.log("--> startGame()");
        if (resetState) {
            passGames = 0;
        }       
        levelNumber = levelNum;

	/* reset all the cards */
	$(".card").removeClass('flip');

        // Figure out the amount of cards needed in this level.
        var types = new Array();
        var cardcount = gamedata[levelNum-1].cardcount;
        var cardtypes = gamedata[levelNum-1].cardcount/2;
        /* create a list of cards by index */
        for(i = 0; i < cardcount; i++)
            types.push((i%cardtypes)+1);

        /* randomly fill out the deck */
        for(i = 0; i < cardcount; i++)
        {
            var card_id = "#level"+levelNum+"_card_"+(i+1)+" .front";
            var target = (Math.random() * types.length)|0;
            var idx = types.splice(target, 1);
            var card_class = "front card_type"+idx;
            $(card_id).attr('class', card_class);
        }

        // Update the hand that holds the game count note.
        var starIconName = stariconsList[levelNum-1];
        for (var gameIndex = 0; gameIndex < 3; ++gameIndex) {
            var starImgElement = $("#handleitem_star"+(gameIndex+1));
            starImgElement.removeClass("unplayedGameStar");
            if (gameIndex <= passedGames) {
                starImgElement.attr("src", starIconName);
                
            } else {
                starImgElement.addClass("unplayedGameStar");
                starImgElement.attr("src", "images/star.png");
            }
        }
        if (levelNum != 4) {
            $("#handitem").css("display", "block");
        } else {
            // The hand image is not shown in final level.
            $("#handitem").hide();
        }
        
        // Control the level elements visibility.
        for (var i=1; i < 5; ++i) {
            if (i == levelNum) {
                $("#level"+i).show();
            } else {
                $("#level"+i).hide();
            }
        }
        if (passedGames == 0) {
            $("#handitem_gamenum_title").text("GAME 1");
        } else if (passedGames == 1) {
            $("#handitem_gamenum_title").text("GAME 2");
        } else if (passedGames == 2) {
            $("#handitem_gamenum_title").text("GAME 3");
        }

        $("#homebutton_backtomain").show();
        console.log("<-- startGame()");
    }

    function help_init()
    {
        $('#main_help').bind('touchstart', function() {
            $('#help_dialog').removeClass('helpdialog').addClass('helpdialog shown');
        });

        $('#help_close').bind('touchstart', function() {
            $('#help_dialog').removeClass('helpdialog shown').addClass('helpdialog');
        });
    }

    function introViewSkipCallback() {
        prepareSelectLevelScreen();
        if ($("#main_page").is(":visible")) {
            $("#main_page").hide();
            $("#selLevel_page").show();
        }
        license_init("license");
        help_init("main_help", "help_");
        createSoundElement(SOUND_FLIPCARD);
        createSoundElement(SOUND_FINALEINTRO);
        createSoundElement(SOUND_LEVEL_WON);
        createSoundElement(SOUND_VICTORY);
    }
    
    // Initialize game once everything has been loaded.
    $(document).ready(function () {
        console.log("--> document.ready()");

        createSoundElement(SOUND_STARTGAME);
        playSound(SOUND_STARTGAME);
        
        $(window).on('tizenhwkey', function (e) {
            if (e.originalEvent.keyName === "back") {
                tizen.application.getCurrentApplication().exit();
            }
        });

        // Add the event handler functions.
        $("#main_page").bind('touchstart', function () {
            // Hide mainview and show level selection.
            introViewSkipCallback();
        });
        
        $("#selLevel_levelCard1").bind('touchstart', function () {
            // Start game.
            levelSelectionUserChoice = 1;
            playSound(SOUND_FLIPCARD);
            $("#selLevel_levelCard1").addClass("selLevel_selectedCard");
            $("#selLevel_levelCard2").addClass("selLevel_anim1");
            $("#selLevel_levelCard3").addClass("selLevel_anim1");
            $("#selLevel_levelCard4").addClass("selLevel_anim1");
            window.setTimeout("Game.levelSelectionAnimCallback()", 1000);
        });
        $("#selLevel_levelCard2").bind('touchstart', function() {
            if ($(this).hasClass(LOCKED_LEVELCARD_STYLE) == false) {
                playSound(SOUND_FLIPCARD);
                levelSelectionUserChoice = 2;
                $("#selLevel_levelCard2").addClass("selLevel_selectedCard");
                $("#selLevel_levelCard1").addClass("selLevel_anim2");
                $("#selLevel_levelCard3").addClass("selLevel_anim2");
                $("#selLevel_levelCard4").addClass("selLevel_anim2");
                window.setTimeout("Game.levelSelectionAnimCallback()", 1000);
            }
        });
        $("#selLevel_levelCard3").bind('touchstart', function() {
            if ($(this).hasClass(LOCKED_LEVELCARD_STYLE) == false) {
                playSound(SOUND_FLIPCARD);
                levelSelectionUserChoice = 3;
                $("#selLevel_levelCard3").addClass("selLevel_selectedCard");
                $("#selLevel_levelCard1").addClass("selLevel_anim3");
                $("#selLevel_levelCard2").addClass("selLevel_anim3");
                $("#selLevel_levelCard4").addClass("selLevel_anim3");
                window.setTimeout("Game.levelSelectionAnimCallback()", 1000);
            }
        });
        $("#selLevel_levelCard4").bind('touchstart', function() {
            if ($(this).hasClass(LOCKED_LEVELCARD_STYLE) == false) {
                playSound(SOUND_FLIPCARD);
                levelSelectionUserChoice = 4;
                $("#selLevel_levelCard4").addClass("selLevel_selectedCard");
                $("#selLevel_levelCard1").addClass("selLevel_anim4");
                $("#selLevel_levelCard2").addClass("selLevel_anim4");
                $("#selLevel_levelCard3").addClass("selLevel_anim4");
                window.setTimeout("Game.levelSelectionAnimCallback()", 1000);
            }
        });
        
        $(".card").bind('touchstart', function() {
            console.log("--> card.touchstart()");
            if (!ignoreInputs && !($(this).hasClass('flip'))) {
                playSound(SOUND_FLIPCARD);
                ignoreInputs = true;
                console.log("    card id: " + $(this).attr("id"));
                $(this).addClass('flip');
                window.setTimeout("Game.flipCallback("+($(this).attr("id"))+")", 350);
            }
            console.log("<-- card.touchstart()");
        });
        
        $("#finaleIntro").bind('touchstart', function() {
            // Start playing final level.
            $("#finaleIntro").hide();
            startGame(4, false);
        });
        
        $("#victory_playagain_box").bind('touchstart', function() {
            console.log("--> victory_playagain_box.touchstart()");
            prepareSelectLevelScreen();
            $("#victory").hide();
            $("#selLevel_page").show();
            console.log("<-- victory_playagain_box.touchstart()");
        });
        
        $("#homebutton_backtomain").bind('touchstart', function() {
            console.log("--> homebutton.touchstart()");
            // Hide current levels and show mainpage.
            $("#level1").hide();
            $("#level2").hide();
            $("#level3").hide();
            $("#level4").hide();
            $("#handitem").hide();
            $("#main_page").show();
            $(this).hide();
            console.log("<-- homebutton.touchstart()");
        });
        
        $("#selLevel_resetLocked").bind('touchstart', function() {
            localStorage.setItem(LOCAL_STORAGE_KEY, '0000');
            prepareSelectLevelScreen();
        });
    });

    // Skip the welcome screen after a while.
    window.setTimeout("Game.introViewSkipCallback()", 3500);
})();
