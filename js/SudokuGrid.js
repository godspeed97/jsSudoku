/******************************************************************************************************
sudokuGrid.js

Controle de la grille physique.

Tout le code est dans une IIFE qui définit quelques constantes ainsi que la classe Grid 

Le code de Grid comporte trois parties:
    - code initial exécuté sur l'appel du constructeur ( new sudoku.Grid(...))
    - méthodes relatives aux événements sur la grille
    - méthodes accessibles publiquement pour initialiser, modifier, consulter etc... la grille

*******************************************************************************************************/

if (typeof (sudoku) === "undefined") {
    var sudoku = {};
}

(function () {

    "use strict";

    var CELLBACKGROUNDCOLOR = "white";
    // les chiffres des subcells sont de couleurs différentes selon qu'elles sont marquées ou non marquées
    // et les clues n'ont pas la même couleur que les non clues
    var colors = {
        MARKED: "red",
        UNMARKED: CELLBACKGROUNDCOLOR,
        CLUE: "black",
        NONCLUE: "gray"
    };
    
    //  symboles pour certaines opérations de l'utilisateur sur la grille
    //  - MARK: "marquer" une subcell initialement invisible en shift-cliquant dessus
    //  - UNMARK: cacher une subcell qui était visible (shift-click)
    //  - SET: changer la valeur d'une cellule (mettre ou enlever une valeur) en cliquant sur la cellule ou
    //         sur une subcell
    sudoku.gridOperation = {
        MARK: 0,
        UNMARK: 1,
        SET: 2
    };
    
    
    
    /******************************************************************************************
       Grid
       Représente la grille physique du sudoku

           - le paramètre HTMLcontainerID doit être l'id d'un élément HTML pré-dimensionné dans 
             lequel la grille sera construite dynamiquement; 
           - le paramètre optionnel callback est une fonction qui sera appelée après 
             tout "click" ou "shift-click" de l'utilisateur sur la grille; si le callback 
             existe et qu'il retourne false, l'action de défaut du "click" ou "shift-click" 
             ne sera pas exécutée; si le callback retourne true l'action de défaut sera exécutée
    *******************************************************************************************/

    sudoku.Grid = function Grid(HTMLcontainerID, callback) {
        

        /***********************
        C O D E  I N I T I A L
        ************************/
        // initialement, l'édition (click ou shift-click) des cellules et des subcells est permis
        var enabled = {
            editing: true,
            marksEditing: true
        };
        
        // objets locaux reliées à l'analyse des divers événements se produisant sur la grille
        var evtDesc = {};
        var evtDescOld = {
            evt: "",  // click, mod-click, mouseover, mouseout
            target: "",  // "cell", "subcell"
            line: 0,
            col: 0,
            digit: 0
        }
        
        // sur l'appel du constructeur, la grille est construite et les event handlers
        // mis en place

        var container = document.getElementById(HTMLcontainerID);
        createSudokuGrid();
        container.addEventListener("click", processClick);
        document.addEventListener("mouseover", processMouseOver);
        
        
        /*******************************************
        G E S T I O N   D E S   É V È N E M E N T S
        ********************************************/

        // processMouseOver
        // *****************
        function processMouseOver(e) {

            if (!enabled.editing) {
                return false;
            }
            
            // si, avant le mouseover, la souris  était sur une subcell, on reset les
            // backgroundColor de toutes les subcells de la cellule
            if (evtDescOld.target === "subcell") {
                for (var d = 1; d <= 9; d++) {
                    document.getElementById(subcellId(evtDescOld.line, evtDescOld.col, d)).style.backgroundColor = colors.UNMARKED;
                }
            }

            // traitement de l'élément sur lequel est entré la souris
            evtDesc = analyzeEvent(e);

            // on ne fait rien, si la souris est à l'extérieur de la grille
            if (evtDesc.line === 0 || evtDesc.col === 0) {
                return;
            }
            
            // si la souris est entrée dans une subcell, on rend visibles les 9 subcells de la cellule
            // en leur donnant le backgroudColor approprié; de plus on souligne la nouvelle subcell courante
            // par un backgroundColor différend des autres
            if (evtDesc.target === "subcell") {
                for (var d = 1; d <= 9; d++) {
                    document.getElementById(subcellId(evtDesc.line, evtDesc.col, d)).style.backgroundColor = "gray";
                }
                e.target.style.backgroundColor = "black";
                e.target.style.cursor = "pointer";
            }

            // sauvegarde du dernier descripteur d'événement
            evtDescOld.type = evtDesc.type;
            evtDescOld.target = evtDesc.target;
            evtDescOld.line = evtDesc.line;
            evtDescOld.col = evtDesc.col;
            evtDescOld.digit = evtDesc.digit;
        }
                  
        // analyseEvent
        // utilitaire d'analyse d'un événement (click, shift-click ou mouseover); retourne un objet descripteur
        // avec les propriétés suivante:
        //    type: "click", "shift-click" ou "mouseover"
        //    target: si l'événement s'est produit sur la grille, target vaut "cell" ou "subcell";
        //            autrement, c'est l'ID de l'élément du DOM sur lequel s'est produit l'événement
        //    line, col, digit: ligne, colonne et subcell de la grille sur lequel
        //                      s'est produit l'événement; sont 0 si l'événement se
        //                      produit à l'extérieur de la grille; digit est 0 quand
        //                      l'événement n'est pas sur une subcell (même s'il se
        //                      produit sur une cellule)
        
        function analyzeEvent(e) {
            var id = e.target.id;
            var o = {
                evt: e.type,
                target: "",
                line: 0,
                col: 0,
                digit: 0
            };
            var l = HTMLcontainerID.length;

            if (e.shiftKey || e.ctrlKey || e.altKey) {
                o.evt = "mod-shift";
            }

            // si l'id réfère à un élément de la grille, trouver
            if (id.substring(0, l) === HTMLcontainerID) {
                if (id.substring(l, l + 4) === "cell") {
                    o.target = "cell";
                    o.line = id.charAt(l + 4);
                    o.col = id.charAt(l + 5);
                } else if (id.substring(l, l + 7) === "subcell") {
                    o.target = "subcell";
                    o.line = id.charAt(l + 7);
                    o.col = id.charAt(l + 8);
                    o.digit = id.charAt(l + 9);
                }
            }
            return o;
        }
        
        // processClick
        // ***********

        
        function processClick(e) {
            if (!enabled.editing) {
                return false;
            }

            evtDesc = analyzeEvent(e);

            if (evtDesc.target === "subcell") {
                
                // clic-shift sur une subcell ===> gestion des marks
                if (evtDesc.evt === "mod-shift") {
                    processShiftClick(e);
                }
                
                // clic de subcell: s'il y a un callback, il est appelé et s'il retourne true,
                // on set la valeur de la cellule au digit associé à la subcell;                  
                else {
                    if (!callback || callback(evtDesc.line, evtDesc.col, evtDesc.digit, sudoku.gridOperation.SET)) {
                        var content = document.getElementById(cellId(evtDesc.line, evtDesc.col));
                        content.innerHTML = e.target.innerHTML;
                        content.style.zIndex = "2";
                    }
                }

            } 
            
            // clic sur une cellule: on "blank" la valeur de la cellule si la cellule n'est pas une clue 
            // ET s'il n'y a pas de callback ou que le callback retourne true

            else if (evtDesc.target === "cell") {
                var cell = document.getElementById(cellId(evtDesc.line, evtDesc.col));
                if (!cell.isClue) {
                    if (!callback || callback(evtDesc.line, evtDesc.col, evtDesc.digit, sudoku.gridOperation.SET)) {
                        e.target.innerHTML = "";
                        cell.style.zIndex = "0";
                    }
                }
            }
        }
        
        // processShiftClick
        // ******************
        //    Contrôle de la visibilité des subcells
        
        function processShiftClick(e) {
            
            // si la gestion des marks est autorisée et s'il n'existe pas de callback
            // ou que le callback retourne true
            //     - on fait disparaitre une mark visible
            //     - on fait apparaitre une mark invisible
            // exemples:
            //    - on peut faire apparaître ou disparaître une note
            //    - on peut faire disparaître un candidat, mais le callback devrait
            //      empêcher qu'on puisse faire apparaître un candidat illégal dans le contexte

            if (enabled.marksEditing) {
                var operation = sudoku.gridOperation.UNMARK;
                if (e.target.style.color === colors.UNMARKED) {
                    operation = sudoku.gridOperation.MARK;
                }

                if (!callback || callback(evtDesc.line, evtDesc.col, evtDesc.digit, operation)) {
                    if (e.target.style.color === colors.UNMARKED) {
                        e.target.style.color = colors.MARKED;
                    }
                    else {
                        e.target.style.color = colors.UNMARKED;
                    }
                }
            }
        }
        
        /*********************************************************************************************
        M É T H O D E S     P U B L I Q U E S
        **********************************************************************************************/

        // initializeGrid 
        // initialisation de la grille préalable à tout nouveau puzzle

        this.initializeGrid = function () {
            var cell, subcell;
            for (var line = 1; line < 10; line++) {
                for (var col = 1; col < 10; col++) {
                    cell = document.getElementById(cellId(line, col));
                    cell.style.zIndex = "0";
                    cell.style.color = colors.NONCLUE;
                    cell.innerHTML = "";
                    cell.isClue = false;
                    for (var d = 1; d <= 9; d++) {
                        subcell = document.getElementById(subcellId(line, col, d));
                        subcell.style.backgroundColor = colors.UNMARKED;
                        subcell.style.color = colors.UNMARKED;
                    }
                }
            }
        }
        
        // setNonEmptyToClues
        // Convertit en clues toutes les cellules dont la valeur est un chiffre (1 à 9)
        // Typiquement, cette méthode sera appelée après la définition d'un nouveau puzzle
        // et après vérification que ce puzzle est légal.
        // Après cet appel, les clues sont protégées contre les modifications.
        
        this.setNonEmptyToClues = function () {
            var cell;
            for (var line = 1; line <= 9; line++) {
                for (var col = 1; col <= 9; col++) {
                    cell = document.getElementById(cellId(line, col));
                    if (cell && cell.innerHTML != "") {
                        cell.isClue = true;
                        cell.style.fontStyle = "normal";
                        //   cell.style.fontWeight = "bold";
                        cell.style.color = colors.CLUE;
                        cell.style.zIndex = "2";
                    }
                }
            }
        }
        
        // enableEvents
        // Autorise l'utilisateur à modifier la grille

        this.enableEvents = function () {
            enabled.editing = true;
            enabled.marksEditing = true;
        }
        
        // enableEditing
        // Autorise ou interdit l'édition de la grille

        this.enableEditing = function (flag) {
            enabled.editing = flag;
        }

        // enableMarksEditing
        // Autorise ou interdit la gestion des marks

        this.enableMarksEditing = function (flag) {
            enabled.marksEditing = flag;
        }
        
        // loadSudoku
        // load d'un puzzle fourni sous forme canonique

        this.loadSudoku = function (puzzle) {
            this.initializeGrid();
            var index = 0;
            for (var line = 1; line <= 9; line++) {
                for (var col = 1; col <= 9; col++) {
                    var c = puzzle.charAt(index);
                    if (c >= '1' && c <= '9') {
                        this.setCellValue(line, col, c);
                    }
                    index++;
                }
            }
        }
        
        // getCanonical
        // retourne la forme canonique du puzzle à partir des cellules ayant une valeur entre 1 et 9
        
        this.getCanonical = function () {
            var result = "";
            for (var line = 1; line <= 9; line++) {
                for (var col = 1; col <= 9; col++) {
                    var elem = document.getElementById(cellId(line, col));
                    if (elem.innerHTML >= '1' && elem.innerHTML <= '9') {
                        result += elem.innerHTML;
                    }
                    else {
                        result += '0';
                    }
                }
            }
            return result;
        }
        
        // setCellValue
        // donne une valeur à une cellule donnée de la grille
        
        this.setCellValue = function (line, col, value, color) {
            var elem = document.getElementById(cellId(line, col));
            elem.innerHTML = value;
            elem.digit = value;
            elem.style.zIndex = 2;
            if (color) {
                elem.style.color = color;
            }
        }

                
        // public hideMarks
        // Cache les marques après en avoir pris une copie qui est retournée à l'appelant
        // La copie est une string de 729 (9x9x9) caractères où chacun peut être 
        // 'm' (marked) ou 'u' (unmarked)
        
        this.hideMarks = function () {
            var r = "";
            for (var line = 1; line <= 9; line++) {
                for (var col = 1; col <= 9; col++) {
                    for (var digit = 1; digit <= 9; digit++) {
                        var elem = document.getElementById(HTMLcontainerID + "subcell" + line + col + digit);
                        if (elem.style.color === colors.MARKED) {
                            r += 'm';
                        }
                        else {
                            r += 'u';
                        }
                        elem.style.color = colors.UNMARKED;
                    }
                }
            }
            return r;
        }
        
        
        // public showMarks
        // Restore les marques à partir d'une copie de sauvegarde 'r' passée en paramètre;
        // si r est absent, toutes les subcells deviennent unmarked 
        
        this.showMarks = function (r) {
            var index = 0;
            for (var line = 1; line <= 9; line++) {
                for (var col = 1; col <= 9; col++) {
                    for (var digit = 1; digit <= 9; digit++) {
                        var elem = document.getElementById(HTMLcontainerID + "subcell" + line + col + digit);
                        if (r && r.charAt(index) === 'm') {
                            elem.style.color = colors.MARKED;
                        }
                        else {
                            elem.style.color = colors.UNMARKED;
                        }
                        index++;
                    }
                }
            }
        }

     
        
        /******************************************************************
        M É T H O D E S     I N T E R N E S    D I V E R S E S
        *******************************************************************/
        
        // cellId        
        // retourne l'id de la cellule en position (line, col)
        
        function cellId(line, col) {
            return HTMLcontainerID + "cell" + line + col;
        }
        
        // retourne l'id de la sous-cellule en position (line, col, digit)
        
        function subcellId(line, col, digit) {
            return HTMLcontainerID + "subcell" + line + col + digit;
        }


 
        ///////////////////////////////////////////////////
        // createSudokuGrid
        // Crée dynamiquement la grille dans son container
        //////////////////////////////////////////////////

        function createSudokuGrid() {
            
            // w3: largeur en pixels des lignes séparant les régions
            // w1: largeur en pixels des lignes séparant les colonnes
            var w3 = 3, w1 = 1;
            
            // cw: cell width en pixels   
            // ch: cell height en pixels
            var cw, ch, div;

            var Width = container.offsetWidth;
            var Height = container.offsetHeight;
            
            // tailles approximatives en pixels des espaces réservés aux chiffres et lettres apparaissant en
            // haut et à gauche de la grille
            var heightNumbers = Math.floor(Height * 4 / 100);
            var widthLetters = Math.floor(Width * 4 / 100);
             
            // hauteur  =  (hauteur des chiffres du haut)  +  (9 x hauteur des cellules)  +  (hauteur des séparateurs)
            // largeur  =  (largeur des lettres)  +  (9 x largeur des cellules)  +  (largeur des séparateurs)
            cw = Math.floor((Width - widthLetters - 4 * w3 - 6 * w1) / 9);
            ch = Math.floor((Height - heightNumbers - 4 * w3 - 6 * w1) / 9);
 
            // réajustement au pixel près
            heightNumbers += Height - (9 * ch + 6 * w1 + 4 * w3 + heightNumbers);
            widthLetters += Width - (9 * cw + 6 * w1 + 4 * w3 + widthLetters);
            
            // largeur des sous-cellules ajustées au pixel près
            var del = Math.floor(cw / 3);
            var subW = [del, del, del];
            var remainder = cw - 3 * del;
            if (remainder > 0) {
                subW[0]++;
            }
            if (remainder > 1) {
                subW[2]++;
            }
            
            // hauteur des sous-cellules ajustées au pixel près
            del = Math.floor(ch / 3);
            var subH = [del, del, del];
            remainder = ch - 3 * del;
            if (remainder > 0) {
                subH[0]++;
            }
            if (remainder > 1) {
                subH[2]++;
            }
            
            // position relatives (left et top) des subcells
            var subLeft = [0, subW[0], subW[0] + subW[1]];
            var subTop = [0, subH[0], subH[0] + subH[1]];

            div = document.createElement("div");
            div.style.position = "absolute";
            div.style.fontSize = Math.floor(cw * .99) + "px";
            div.style.fontFamily = "Arial";
            
            
            
            // créer les cellules et les subcells et les ajouter au DOM
            // Les 81 cellules et 729 subcells sont positionnées de façon absolue dans leur container
            // Principes de visibilité:
            // *************************
            //    - les subcells ont un z-index de 1 
            //    - les cellules ont un z-index de 0 (cachées sous les subcells)  quand 
            //      elles sont vides et un z-index de 2 (au-dessus des subcells) quand 
            //      elles contiennent un chiffre de 1 à 9
            //    - color et background-color des subcells:
            //          - par défaut, le contenu des subcells est invisible parce que color === background-color
            //          - le contenu est rendu visible en positionnant la souris sur une cellule vide ce qui change
            //            la background-color de chaque subcell de la cellule; quand la souris quitte la cellule, les
            //            background-colors sont remises au défaut ce qui les rend à nouveau invisibles
            //          - un shift-click sur une subcell change sa couleur; donc quand la souris quitte la cellule, 
            //            la subcell demeure visible; on nomme "mark" une subcell qui demeure ainsi visible;
            //            à noter: un shift-click sur une mark la fait disparaître de la subcell
            
            var cell;
            var subcell;

            for (var line = 1; line <= 9; line++) {
                for (var col = 1; col <= 9; col++) {
                    cell = document.createElement("div");
                    cell.style.position = "absolute";
                    cell.style.top = dy(line) + "px";
                    cell.style.left = dx(col) + "px";
                    cell.style.width = cw + "px";
                    cell.style.height = ch + "px";
                    cell.style.fontWeight = "700";
                    cell.style.color = "gray";
                    cell.style.backgroundColor = CELLBACKGROUNDCOLOR;
                    cell.id = cellId(line, col);
                    cell.style.zIndex = "0";
                    cell.style.lineHeight = ch + "px";
                    cell.isClue = false;

                    for (var i = 1; i <= 3; i++) {
                        for (var j = 1; j <= 3; j++) {
                            subcell = document.createElement("div");
                            subcell.style.zIndex = "1";
                            subcell.style.position = "absolute";
                            subcell.style.backgroundColor = CELLBACKGROUNDCOLOR;
                            subcell.style.color = colors.UNMARKED;
                            subcell.style.fontSize = 2 + Math.floor(ch / 4) + "px";
                            subcell.style.fontFamily = "sans-serif";
                            subcell.style.top = dy(line) + subTop[i - 1] + "px";
                            subcell.style.left = dx(col) + subLeft[j - 1] + "px";
                            subcell.style.width = subW[j - 1] + "px";
                            subcell.style.height = subH[i - 1] + "px";
                            subcell.innerHTML = (3 * (i - 1) + j) + "";
                            subcell.id = subcellId(line, col, subcell.innerHTML);

                            div.appendChild(subcell);

                        }
                    }
                    div.appendChild(cell);
                }
            }
            
            
            // générer les lettres
            
            var letters = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
            var divLetter;
            for (var line = 1; line <= 9; line++) {
                divLetter = document.createElement("div");
                divLetter.style.position = "absolute";
                divLetter.style.top = dy(line) + "px";
                divLetter.style.color = "yellow";
                divLetter.innerHTML = letters[line - 1];
                divLetter.style.margin = "auto";
                divLetter.style.lineHeight = ch + "px";
                divLetter.style.fontSize = Math.floor(ch / 3) + "px";
                div.appendChild(divLetter);
            }
            
            // générer les chiffres
            
            var divNumber;
            for (var col = 1; col <= 9; col++) {
                divNumber = document.createElement("div");
                divNumber.style.position = "absolute";
                divNumber.style.width = cw + "px";
                divNumber.style.left = dx(col) + "px";
                divNumber.style.color = "yellow";
                divNumber.innerHTML = col + "";
                divNumber.style.margin = "auto";
                divNumber.style.fontSize = Math.floor(ch / 3) + "px";
                div.appendChild(divNumber);
            }


            container.appendChild(div);
            

            // dx
            // dx (pour delta x) calcule le nombre de pixels entre le coin supérieur gauche
            // d'une cellule appartenant à la colonne "col" de la grille et la frontière gauche
            // du container de la grille.

            function dx(col) {
                var delta = widthLetters + (col - 1) * cw + w3 + (col - 1) * w1;
                if (col > 3) {
                    delta = delta - w1 + w3;
                }
                if (col > 6) {
                    delta = delta - w1 + w3;
                }
                return delta;
            }
 
 
            // dy
            // dy (pour delta y) calcule le nombre de pixels entre le coin supérieur gauche
            // d'une cellule appartenant à la ligne "line" de la grille et la frontière supérieure
            // du container de la grille.

           
            function dy(line) {
                var delta = heightNumbers + (line - 1) * ch + w3 + (line - 1) * w1;
                if (line > 3) {
                    delta = delta - w1 + w3;
                }
                if (line > 6) {
                    delta = delta - w1 + w3;
                }
                return delta;
            }

        }

    }
    
})();
