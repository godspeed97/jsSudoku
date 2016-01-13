/*******************************************************************************************
sudokuMain

Contient une IIFE qui 

    1 - définit un event handler "init" sur l'évènement 'DOMContentLoaded'.

       fonctionnalités de "init":

         -  crée les 81 cellules de la grille dans son container HTML ( voir sudokuGrid.js )
         -  crée une instance du modèle d'affaire du sudoku ( voir sudokuModel.js )
         -  définit tous les events et leurs handlers à l'exception de ceux de la grille de 81 cellules
            qui sont pris en charge dans sudokuGrid.js

    2 - définit toutes les fonctions nécessaires à l'exécution des handlers d'évènements;
        ces définitions de fonctions représentent presque 100% du code de l'IIFE

********************************************************************************************/

(function () {

    "use strict";

    /**************************************************************************************
    1 - Variables globales à l'IIFE
    **************************************************************************************/
    // id du container HTML de la grille
    var GRIDCONTAINER = "sudokuGrid";

    // instance de la classe représentant la grille
    var grid;

    // instance du modèle d'affaire
    var gridModel;

    // dernier puzzle pour fins de reset
    var oldPuzzle;

    // énumération indiquant la nature des marks affichés
    var marks = {
        NONE: 0,
        NOTES: 1,
        CANDIDATES: 2
    };

    // indique quelles marks sont couramment affichées
    var marksDisplayed = marks.NONE;

    // sauvegarde des marks qui sont des notes
    var savedNotes;

    // définit le event listener qui sera exécutée une et une seule fois sur 'DOMContentLoaded'
    document.addEventListener('DOMContentLoaded', init);

    /**************************************************************************************************
    2 - initialisation unique
    ***************************************************************************************************/
    function init() {

		
        // création dynamique de la grille de 81 cellules; le callback "onGridModif" (défini plus loin)
        // sera appelé pour permettre ou empêcher l'action de tout clic sur la grille
        grid = new sudoku.Grid(GRIDCONTAINER, onGridModif);

        // création d'une instance du modèle du sudoku 
        gridModel = new sudoku.GridModel();

        // désactive la sélection sur la grille à cause de ses effets indésirables

        document.getElementById(GRIDCONTAINER).onselectstart = function () {
            return false;
        }

        // event listeners
        document.getElementById("menunav").addEventListener("click", processMenuClick);
        document.getElementById("marksMenu").addEventListener("change", MarksDisplayChanged);
        document.getElementById("OkCancel").addEventListener("click", onOkCancel);

        // initialisation de l'affichage
        setDisplayToInitial();

        // tout est prêt; on tombe en attente d'évènements pour le reste ...
    };


    /**************************************************************************************************
    3 - callback appelé de la grille après un clic sur une cellule ou une subcell
    ***************************************************************************************************/
    // - onGridModif est appelé par la grille après tout clic. 
    // - Répercute sur le modèle (gridModel) les opérations faites sur la grille par l'utilisateur
    // - retourne true si le modèle permet que l'opération soit faite
    // - retourne false si le modèle ne permet pas l'opération

    function onGridModif(line, col, digit, op) {

        switch (op) {

            // set d'une nouvelle valeur (vide ou 1 à 9) sur une cellule 
            case sudoku.gridOperation.SET:
                gridModel.setCell(line, col, digit);
                // si les candidats sont couramment affichés, il faut demander au modèle
                // de les recalculer et demander à la grille de les réafficher
                if (marksDisplayed === marks.CANDIDATES) {
                    grid.showMarks(obtainCandidatesString());
                }
                return true;

            // supprimer la mark d'une subcell; s'il s'agit d'un candidat, on demande au modèle de le supprimer
            case sudoku.gridOperation.UNMARK:
                if (marksDisplayed === marks.CANDIDATES) {
                    gridModel.suppressCandidate(line, col, digit);
                }
                return true;

            // mark une subcell; s'il s'agit d'un candidat, il faut informer le modèle
            // de le restaurer comme candidat ce que le modèle pourra refuser s'il ne s'agit 
            // pas d'un candidat précédemment supprimé
            case sudoku.gridOperation.MARK:
                if (marksDisplayed === marks.CANDIDATES) {
                    return gridModel.restoreCandidate(line, col, digit);
                }
        }
        return true;
    }


    /**************************************************************************************************
    4 - event handlers
    ***************************************************************************************************/
   
    // processMenuClick
    // clics sur les menus et boutons
    
    function processMenuClick(e) {

        if (e.target.id === "puzzleFacile") {
            playFromDatabase(AngusJohnson);
        }

        else if (e.target.id === "puzzleMoyen") {
            playFromDatabase(hard1);
        }

        else if (e.target.id === "puzzleDifficile") {
            playFromDatabase(hardestSudokus);
        }

        else if (e.target.id === "puzzleTresDifficile") {
            playFromDatabase(puzzle17clues);
        }

        else if (e.target.id === "puzzleManuel") {
			marksDisplayed = marks.NONE;
            hideMainMenu();
            hideMarksMenu();
            showOkCancelMenu("OK", "Annuler");
            grid.initializeGrid();
            grid.enableEvents();
            grid.enableMarksEditing(false);
            afficherMessage("Entrez les clues dans la grille et terminer par OK ou Annuler");
        }

        else if (e.target.id === "inCanonique") {
            var puzzle = prompt("Entrez un puzzle en forme canonique");
            if (puzzle != null) {
                grid.loadSudoku(puzzle);
                testAndPlay();
            }
        }

        else if (e.target.id === "reset") {
            grid.loadSudoku(oldPuzzle);
            testAndPlay();
        }

        else if (e.target.id === "check") {
            var result = checkSudoku();
            if (!result) {
                result = "So far so good...";
            }
            afficherMessage(result);
        }

        else if (e.target.id === "hints") {
            displayHints();
        }

        else if (e.target.id === "solution") {
            displaySolution();
        }

        else if (e.target.id === "outCanonique") {
            var result = "";
            for (var line = 1; line <= 9; line++) {
                for (var col = 1; col <= 9; col++) {
                    var value = gridModel.getCellValue(line, col);
                    if (value < 1 || value > 9) {
                        value = ".";
                    }
                    result += value + "";
                }
            }
            prompt("Puzzle en forme canonique:", result);
        }

        else if (e.target.id === "autoPlay") {
            if (checkSudoku()) {
                afficherMessage("Erreurs dans le sudoku: autoplay impossible");
                return;
            }
            var r = 0, sumr = 0;
            var t = 0, sumt = 0;
            do {
                //r = autoPlay(0);
                r = autoPlay();
                t = playSingletons();
                sumr += r;
                sumt += t;
            } while (r > 0 || t > 0);
            if (marksDisplayed === marks.CANDIDATES) {
                grid.showMarks(obtainCandidatesString());
            }
            afficherMessage("Nombre de candidats éliminés: " + sumr + "\nNombre de cellules jouées: " + sumt)
        }
    }


    // MarksDisplayChanged
    // event handler appelé lors d'un changement pour le choix de notes, candidats 
    // ou aucun affichage (no marks)

    function MarksDisplayChanged(e) {
        switch (marksDisplayed) {
            case marks.NONE:
                break;
            case marks.NOTES:
                savedNotes = grid.hideMarks();
                break;
            case marks.CANDIDATES:
                grid.hideMarks();
                break;
        }
        var elem = document.getElementById("marksNOTES");
        if (elem.checked) {
            grid.showMarks(savedNotes);
            grid.enableMarksEditing(true);
            marksDisplayed = marks.NOTES;
        }
        else {
            elem = document.getElementById("marksNONE");
            if (elem.checked) {
                grid.showMarks();
                grid.enableMarksEditing(false);
                marksDisplayed = marks.NONE;
            }
            else {
                grid.showMarks(obtainCandidatesString());
                grid.enableMarksEditing(true);
                marksDisplayed = marks.CANDIDATES;
            }
        }
        return false;
    }



    // onOkCancel
    // clic sur OK ou CANCEL

    function onOkCancel(e) {
        var id = e.target.id;
        if (id === "OKbtn") {
            if (testAndPlay()) {
                setDisplayToPlayMode();
            }
        }
        else {
            setDisplayToInitial();
            grid.initializeGrid();
        }
        return false;
    }


    /**************************************************************************************************
    5 - Fonctions utilitaires utilisées par les handlers
    ***************************************************************************************************/

    // obtainCandidatesString
    // - Obtenir du modèle la liste des candidats sous la forme d'une string de 729 (9x9x9) caractères
    //   'm' (pour marked) et 'u' (pour unmarked)
    // - Les caractères sont dans l'ordre ces lignes, colonnes et subcells

    function obtainCandidatesString() {
        var candidates = "";
        for (var line = 1; line <= 9; line++) {
            for (var col = 1; col <= 9; col++) {
                var c = gridModel.getCandidates(line, col);
                for (var i = 1; i <= 9; i++) {
                    if (c[i]) {
                        candidates += 'm';
                    }
                    else {
                        candidates += 'u';
                    }
                }
            }
        }
        return candidates;
    }


    // displaySolution
    // Affiche la solution en utilisant un code de couleurs pour les erreurs

    function displaySolution() {
        for (var line = 1; line <= 9; line++) {
            for (var col = 1; col <= 9; col++) {
                var value = gridModel.getCellValue(line, col);
                var solution = gridModel.getCellSolution(line, col);
                if (value != solution) {
                    if (value >= 1 && value <= 9) {
                        grid.setCellValue(line, col, solution, "red");
                    }
                    else {
                        grid.setCellValue(line, col, solution, "green");
                    }
                }
            }
        }
    }


    // autoPlay
    // Supprime le plus grand nombre possible de candidats en n'utilisant qu'une stratégie de premier niveau

    // function autoPlay(n) {
    //     var result = gridModel.findHints();

    //     if (result[0]) { //if result[0] is true, or not 0, meaning findHints found at least one hint
    //         for (var i = 3; i < result.length; i = i + 3) {
    //             var line = result[i];
    //             var col = result[i + 1];
    //             var candidate = result[i + 2];
    //             gridModel.suppressCandidate(line, col, candidate);
    //             n++;
    //         }
    //         return autoPlay(n);
    //     }
    //     return n;
    // }
    
    function autoPlay() {
        var n = 0, result;
        do {
            result = gridModel.findHints();
            if (result[0]) { //if result[0] is true, or not 0, meaning findHints found at least one hint
                for (var i = 3; i < result.length; i = i + 3) {
                    var line = result[i];
                    var col = result[i + 1];
                    var candidate = result[i + 2];
                    gridModel.suppressCandidate(line, col, candidate);
                    n++;
                }
            }
        } while (result[0] > 0);
        return n;
    }



    // playSingletons
    // détecte toute cellule ne contenant qu'un candidat
    // et affecte la valeur du candidat à la cellule

    function playSingletons() {
        var totalPlayed = 0;
        for (var line = 1; line <= 9; line++) {
            for (var col = 1; col <= 9; col++) {
                var digit = gridModel.getCellValue(line, col);
                if (digit < 1 || digit > 9) {
                    var boolset = gridModel.getCandidates(line, col);
                    var nb = 0;
                    var last = 0;
                    for (var i = 1; i <= 9; i++) {
                        if (boolset[i]) {
                            nb++;
                            last = i;
                        }
                    }
                    if (nb === 1) {
                        gridModel.setCell(line, col, last);
                        grid.setCellValue(line, col, last);
                        totalPlayed++;
                    }
                }
            }
        }
        return totalPlayed;
    }


    // displayHint
    // Détecte les candidats qui peuvent être éliminés en n'utilisant
    // qu'une stratégie de premier niveau; cesse la recherche dès que les premiers
    // candidats sont détectés; affiche les résultats

    function displayHints() {
        var result = gridModel.findHints();

        if (result[0] === 0) {
            afficherMessage("Aucun hint de premier niveau n'a été trouvé!");
        }
        else {
            var message = "Candidats pouvant être éliminés de la " + result[1] + " " + result[2];
            var oldLine = 0;
            var oldCol = 0;
            for (var i = 3; i < result.length; i = i + 3) {
                if (result[i] != oldLine || result[i + 1] != oldCol) {
                    oldLine = result[i];
                    oldCol = result[i + 1];
                    message += "\n" + "xABCDEFGHI".charAt(oldLine) + oldCol + "--> "; //eg: charAt(3) = C (xAB[C])
                }
                message += result[i + 2] + " ";
            }
            afficherMessage(message);
        }
    }


    // playFromDatabase
    // affiche un sudolu choisi aléatoirement dans une database.
    // Si le sudoku est illégal, demande à l'usager de faire les corrections 
    // ou d'abandonner
     
    function playFromDatabase(database) {
        var puzzle = database[Math.floor(Math.random() * database.length)];
        grid.loadSudoku(puzzle);
        testAndPlay();
    }


    // testAndPlay
    // Extraie toutes les clues présentes dans les cellules de la grille 
    // et les donne au modèle (gridModel) pour vérification. Si tout est OK (solution unique) passe le contrôle
    // à l'usager; autrement, lui demande de faire des corrections ou d'avorter

    function testAndPlay() {
        var canonical = grid.getCanonical();
        var result = gridModel.loadPuzzle(canonical);
        if (result != 1) {
            afficherMessage("Puzzle illégal avec " + result + " solution(s)\nCorriger ou avorter...");
            showOkCancelMenu("OK", "Annuler");
            grid.enableEvents();
            grid.enableMarksEditing(false);
            hideMarksMenu();
            return false;
        } else {
            oldPuzzle = canonical;
            grid.setNonEmptyToClues();
            grid.enableEditing(true);
            setDisplayToPlayMode();
        }
        return true;
    }
    

    // checkSudoku
    // vérifie le sudoku à la recherche d'erreurs et retourne un message approprié
    
    function checkSudoku() {
        var Message = "";
        for (var line = 1; line <= 9; line++) {
            for (var col = 1; col <= 9; col++) {
                var digit = gridModel.getCellValue(line, col);
                var solution = gridModel.getCellSolution(line, col);
                if (digit >= '1' && digit <= '9') {
                    if (digit != solution) {
                        Message += "Valeur erronée en " + "xABCDEFGHI".charAt(line) + col + "\n";
                    }
                }
                else {
                    var candidates = gridModel.getCandidates(line, col);
                    if (!candidates[solution]) {
                        Message += "Candidat solution supprimé en " + "xABCDEFGHI".charAt(line) + col + "\n";
                    }
                }
            }
        }
        return Message;
    }


    // setDisplayToPlayMode
    // met l'interface usager en mode de résolution du sudoku affiché

    function setDisplayToPlayMode() {
        showMainMenu();
        showSubMenu("menuAssistance");
        showSubMenu("menuAffichage");
        hideOkCancelMenu();
        showMarksMenu();
        document.getElementById("marksNONE").checked = true;
        marksDisplayed = marks.NONE;
        savedNotes = initNotes();
        grid.hideMarks();
        afficherMessage("");
    }


    // setDisplayToInitial
    // Met l'interface usager à l'état initial

    function setDisplayToInitial() {
        showMainMenu();
        hideSubMenu("menuAssistance");
        hideSubMenu("menuAffichage");
        hideMarksMenu();
        hideOkCancelMenu();
        grid.enableEditing(false);
        grid.enableMarksEditing(false);
        afficherMessage("");
    }


    // hideMainMenu
    // cache le menu déroulant principal

    function hideMainMenu() {
        document.getElementsByTagName("nav")[0].style.visibility = "hidden";
    }

    // showMainMenu
    // affiche le menu déroulant principal

    function showMainMenu() {
        document.getElementsByTagName("nav")[0].style.visibility = "visible";
    }

    // hideSubMenu
    // cache une partie des sous-menus déroulants

    function hideSubMenu(id) {
        document.getElementById(id).style.display = "none";
    }

    // showSubMenu
    // montre une partie des sous-menus

    function showSubMenu(id) {
        document.getElementById(id).style.display = "block";
    }

    // hideMarksMenu
    // cache les boutons radio pour le choix des marques (candidats, notes, aucune)

    function hideMarksMenu() {
        document.getElementById("marksMenu").style.display = "none";
    }

    // showMarksMenu
    // affiche les boutons radio pour le choix des marques (candidats, notes, aucune)

    function showMarksMenu() {
        document.getElementById("marksMenu").style.display = "block";
    }

    // hideOkCancelMenu
    // cache les boutons OK et Cancel

    function hideOkCancelMenu() {
        document.getElementById("OkCancel").style.display = "none";
    }

    // showOkCancelMenu
    // montre les boutons OK et Cancel

    function showOkCancelMenu(okText, cancelText) {
        var text = okText || "OK";
        document.getElementById("OKbtn").innerHTML = text;
        text = cancelText || "CANCEL";
        document.getElementById("CANCELbtn").innerHTML = text;
        document.getElementById("OkCancel").style.display = "block";
    }


    // afficherMessage, nextF et fadeOut
    // affiche un message avec effets de fade in et fade out

    function afficherMessage(message) {
        var dialog = document.getElementById("dialog");
        fadeOut(dialog, nextF, message);
    }

    function nextF(message) {
        var dialog = document.getElementById("dialog");
        dialog.innerHTML = message;
        fadeIn(dialog, "block");
    }

    function fadeOut(element, suite, p1, display) {
        var op = 1;
        // initial opacity
        var timer = setInterval(function () {
            if (op <= 0.1) {
                clearInterval(timer);
                element.style.display = 'none';
                if (suite) {
                    suite(p1, display);
                }
            }
            element.style.opacity = op;
            element.style.filter = 'alpha(opacity=' + op * 100 + ")";
            op -= op * 0.1;
        }
            , 25);
    }

    function fadeIn(element, display) {
        var op = 0.1;
        // initial opacity
        // element.style.display = 'block';
        if (display) {
            element.style.display = display;
        }
        var timer = setInterval(function () {
            if (op >= 1) {
                clearInterval(timer);
            }
            element.style.opacity = op;
            element.style.filter = 'alpha(opacity=' + op * 100 + ")";
            op += op * 0.1;
        }
            , 25);
    }

    // initNotes
    // initialise la variable de sauvegarde des notes
    
    function initNotes() {
        savedNotes = "";
        for (var index = 0; index <= 729; index++) {
            savedNotes += 'u';
        }
    }


    var testPuzzles = [
        "005300000800000020070010500400005300010070006003200080060500009004000030000009700",
        "040000000600500003100000800065091000203000001000065000000058190000030040500000070",
        "000000010000002003000400000000000500401600000007100000050000200000080040030910000",
        "729160000600090200008020609892700100000980002476231958900002001200010590100309826",
        "000007200000100409000490050042500800060000070008001930080013000201008000005900000",
        "000000010000002003000400000000000500401600000007100000050000200000080040030910000",
        "800000000003600000070090200050007000000045700000100030001000068008500010090000400",
        "000000000000001002034000050000000300000006000708002090000030400160000000200900000",
        "103000006000500700400800000000010900500000000040709000608900014007400360000030000",
        "743985621000400350001030840617048000400103008000000104000020480008004000074800005"
    ];

})();
