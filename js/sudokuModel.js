/******************************************************************************************
sudokuModel.js

Représente le modèle du jeu de sudoku


Ce fichier est divisé en quatre sections pour en faciliter la consultation (faire une recherche
sur "section" pour positionnement rapide)

  SECTION 1
    Classe principale GridModel

  SECTION 2
     Recherche de hints de premier niveau
     méthode publique : findHints()

  SECTION 3
     Résolution de sudokus à l'aide des sous-grilles
        
  SECTION 4  
    Classes internes représentant les cellules, lignes, colonnes et régions du sudoku

*******************************************************************************************/

console.warn('test');

if (typeof (sudoku) === "undefined") {
    var sudoku = {};
}

(function () {

    "use strict";

    sudoku.GridModel = GridModel;
    
    
    /*****************************************************************************************

    SECTION 1
     classe principale GridModel
    ******************************************************************************************/

    function GridModel() {
        
        // devient true lorsque les clues déterminent une seule solution
        var puzzleIsValid = false;
        
        // nombre de solutions déterminées par les clues
        var numberOfSolutions = -1;
        
        // true lorsque les candidats de chaque cellule viennent d'être calculées;
        // devient false dès qu'un nouveau chiffre est placé dans une cellule ou
        // dès qu'un candidat est éliminé ou restauré
        var areCandidatesUpToDate = false;
       
        // collections d'informations pour les régions, lignes, colonnes et cellules de la grille 9x9
        var regionsInfoCollection = new RegionInfoCollection();
        var linesInfoCollection = new LineInfoCollection();
        var columnsInfoCollection = new ColumnInfoCollection();
        var cellsInfoCollection = new CellInfoCollection(regionsInfoCollection, linesInfoCollection, columnsInfoCollection);
        
        // pré-initialisation nécessaire avant tout nouveau puzzle        
        function reset() {
            puzzleIsValid = false;
            numberOfSolutions = -1;
            areCandidatesUpToDate = false;
            cellsInfoCollection.init();
        }
        
        
        // commence un nouveau puzzle à partir de sa forme canonique (chaine de 81 caractères)
        //    - la fonction calcule le nombre de solutions et initialise la variable
        //      "solution" de chaque cellule en conséquence
        //    - retourne le nombre de solutions
        
        this.loadPuzzle = function (puzzle) {
            reset();
            var index = 0;
            var clue;
            this.beginClues();
            for (var line = 1; line <= 9; line++) {
                for (var col = 1; col <= 9; col++) {
                    clue = Number(puzzle.charAt(index));
                    if (clue >= 1 && clue <= 9) {
                        this.addClue(line, col, clue);
                        cellsInfoCollection.setClue(line, col, clue);
                    }
                    index++;
                }
            }
            numberOfSolutions = this.endClues();
            numberOfSolutions === 1 ? puzzleIsValid = true : puzzleIsValid = false;
            return numberOfSolutions;
        }


        // obtient les candidats d'une cellule donnée de la grille 9x9      
        this.getCandidates = function (line, col) {
            if (!puzzleIsValid) {
                return;
            }
            
            // recalculer les candidats de toutes les cellules         
            if (!areCandidatesUpToDate) {
                areCandidatesUpToDate = true;
                calculateCandidates();
            }
            return cellsInfoCollection.getCandidates(line, col);
        }
        
        
        // dans un sudoku légal, définit ou redéfinit la valeur d'une cellule qui n'a pas initialement 
        // été déclarée comme une clue 
        // retourne false si le sudoku n'est pas valide ou si la cellule visée contient une clue     
        this.setCell = function (line, col, value) {
            if (puzzleIsValid && !cellsInfoCollection.getCellInfo(line, col).isClue) {
                cellsInfoCollection.getCellInfo(line, col).setValue(value, false);
                areCandidatesUpToDate = false;
                return true;
            }
            return false;
        }
 
     
        // supprime un candidat d'une cellule donnée
        this.suppressCandidate = function (line, col, digit) {
            areCandidatesUpToDate = false;
            cellsInfoCollection.getCellInfo(line, col).suppressCandidate(digit);
        }
        

        // restaure un candidat qui a été préalablement supprimé
        this.restoreCandidate = function (line, col, digit) {
            if (cellsInfoCollection.getCellInfo(line, col).restoreCandidate(digit)) {
                areCandidatesUpToDate = false;
                return true;
            }
            return false;
        }
        

        // retourne la valeur d'une cellule donnée
        this.getCellValue = function (line, col) {
            if (!puzzleIsValid) {
                return;
            }
            return cellsInfoCollection.getCellInfo(line, col).value;
        }
        

        // retourne la valeur de solution d'une cellule donnée
        this.getCellSolution = function (line, col) {
            if (!puzzleIsValid) {
                return;
            }
            return cellsInfoCollection.getCellInfo(line, col).solution;
        }
        
        
        // méthode privée qui calcule les candidats pour chacune des cellules de la grille 9x9       
        function calculateCandidates() {
            regionsInfoCollection.init();
            linesInfoCollection.init();
            columnsInfoCollection.init();

            var cellValue, line, col;

            for (line = 1; line <= 9; line++) {
                for (col = 1; col <= 9; col++) {
                    cellValue = cellsInfoCollection.getValue(line, col);
                    
                    // lorsqu'une cellule contient un chiffre de 1 à 9, ce chiffre doit être ajouté aux
                    // ensembles de chiffres associés à la région, ligne et colonne reliés
                    // à la cellule
                    
                    regionsInfoCollection.addDigit(line, col, cellValue);
                    linesInfoCollection.addDigit(line, col, cellValue);
                    columnsInfoCollection.addDigit(line, col, cellValue);
                }
            }            

            for (line = 1; line <= 9; line++) {
                for (col = 1; col <= 9; col++) {
                    cellsInfoCollection.calculateCandidates(line, col);
                }
            }

        }

       
        /****************************************************************************************

        SECTION 2

        F I N D H I N T S

        Recherche de hints de premier niveau
           - méthode principale publique:
               findHints()
           - méthodes utilitaires privées:
                  selectSetFromLine
                  selectSetFromColumn
                  selectSetFromRegion
                  findHintsInSet
                  findHintsInSubset
                  findRecursive
        ******************************************************************************************/

        function findHintsInSubset(cellSet) { //cellSet = subset

            var selected = [false, false, false, false, false, false, false, false, false, false];

            var remainingCandidates = [];
            for (var i = 0; i < cellSet.length; i++) {
                remainingCandidates[i] = [];
                for (var j = 0; j <= 9; j++) {
                    remainingCandidates[i][j] = false;
                }
            }

            var chain = [];
            findRecursive(0);
            
            // définir un objet de retour
            var result = [0, "", 0]; // [0] = loop number, [1] = col/line/region type, [2] = col/line/region number
            
            for (var i = 0; i < cellSet.length; i++) {
                var line = cellSet[i][0];
                var col = cellSet[i][1];
                var boolSet = cellsInfoCollection.getCandidates(line, col);
                for (var digit = 1; digit <= 9; digit++) {
                    if (boolSet[digit] && !remainingCandidates[i][digit]) {
                        result.push(line); // result[3]
                        result.push(col);  // result[4]
                        result.push(digit); // result[5]
                        result[0]++;
                    }
                }
            }
            return result;

            function findRecursive(index) {

                var line = cellSet[index][0];
                var col = cellSet[index][1];
                var boolSet = cellsInfoCollection.getCandidates(line, col);

                for (var digit = 1; digit <= 9; digit++) {
                    if (boolSet[digit]) {
                        if (!selected[digit]) {
                            selected[digit] = true;
                            chain.push(digit);

                            if (index < cellSet.length - 1) {
                                findRecursive(index + 1);
                            }
                            else {
                                for (var j = 0; j < cellSet.length; j++) {
                                    remainingCandidates[j][chain[j]] = true;
                                }
                            }
                            chain.pop();
                            selected[digit] = false;
                        }
                    }
                }

            }
        }

        function selectSetFromLine(line) {
            var set = [];
            for (var col = 1; col <= 9; col++) {
                set.push([line, col]);
            }
            return set;
        }

        function selectSetFromColumn(col) {
            var set = [];
            for (var line = 1; line <= 9; line++) {
                set.push([line, col]);
            }
            return set;
        }

        function selectSetFromRegion(r) {
            var set = [];
            var lineDeb = 1 + 3 * Math.floor((r - 1) / 3);
            var colDeb = 1 + 3 * (r - 1) - 9 * Math.floor((r - 1) / 3);

            for (var line = lineDeb; line <= lineDeb + 2; line++) {
                for (var col = colDeb; col <= colDeb + 2; col++) {
                    set.push([line, col]);
                }
            }

            return set;
        }

        //set: une ligne, une colonne, ou une région
        function findHintsInSet(set, type, number) {
            var subset = [];
            for (var i = 0; i < 9; i++) {
                var line = set[i][0];
                var col = set[i][1];
                var digit = this.getCellValue(line, col);
                if (digit < 1 || digit > 9) {
                    subset.push([line, col]); //eg for line 3, subset could be: [[3,2],[3,3],[3,6],[3,8]]
                }
            }

            //subset: une ligne, une colonne, ou un région, moins les cellules dans lesquelles une clue est déjà présente
            if (subset.length > 1) {
                var result = findHintsInSubset(subset);
                // pour la ligne line
                if (result[0] > 0) {
                    result[1] = type;
                    result[2] = number;
                    return result;
                }
            }
            return [0];
        }

        this.findHints = function () {

            var result;

            if (!areCandidatesUpToDate) {
                calculateCandidates();
                areCandidatesUpToDate = true;
            }

            for (var region = 1; region <= 9; region++) {
                result = findHintsInSet.call(this, selectSetFromRegion(region), "region", region);
                if (result[0] > 0) {
                    return result;
                }
            }

            for (var line = 1; line <= 9; line++) {
                result = findHintsInSet.call(this, selectSetFromLine(line), "line", line);
                if (result[0] > 0) {
                    return result;
                }
            }

            for (var col = 1; col <= 9; col++) {
                result = findHintsInSet.call(this, selectSetFromColumn(col), "column", col);
                if (result[0] > 0) {
                    return result;
                }
            }

            return [0];
        }
        
        /*****************************************************************************************   
        SECTION 3
         
          R E S O L U T I O N    P A R  L A   M É T H O D E   D E S    S O U S  _  G R I L L E S 
        *******************************************************************************************/ 
        /*
        Utilisation de la technique des sous-grillles pour la solution de sudokus 9 x 9 à partir de leurs clues. 
    
        La classe "GridModel" définit quatre méthodes publiques pour solutionner des sudokus à partir de leurs clues.
    
        Méthodes publiques de base:
        ---------------------------
    
        - "GridModel.beginClues()":
              - fonction sans paramètres qui initialise le processus de résolution d'un nouveau sudoku; cette fonction 
                doit être la toute première appelée lors d'une première utilisation; elle peut être réappelée plusieurs 
                fois par la suite et chaque fois, initialise le processus de solution d'un nouveau sudoku.
    
        - "GridModel.addClue( line, col, digit )":
              - fonction à trois paramètres qui doit être appelée en boucle pour définir 
                la position et la valeur de chaque clue dans le sudoku
                    - line: ligne sur laquelle se trouve la clue ( 1 à 9 )
                    - col:  colonne sur laquelle se trouve la clue ( 1 à 9 )
                    - digit: valeur de la clue ( 1 à 9 )
    
        - "GridModel.endClues()":
              - fonction sans paramètres qui termine l'entrée des clues et déclenche le
                mécanisme de la solution du sudoku:
                        les résultats sont placés dans les cellules faisant partie du modèle interne de 
                        "GridModel" et sont accessibles en appelant en boucle "GridModel.getCellSolution(line, col)"
              - valeur de retour: nombre de solutions au sudoku ( 0: aucune solution, 1: exactement une solution, 
                                n > 1: plus d'une solution )
    
    
        Méthode publique alternative:
        -----------------------------
    
        - "GridModel.loadCanonicalSudoku(canonicalPuzzle)":
              - cette fonction est un raccourci aux trois méthodes de base qu'on peut utiliser lorsqu'on a en sa
                possession un sudoku sous forme canonique
    
    
        Exemple 1: 
    
           
           var g = new sudoku.GridModel();
           var puzzle = "800000000003600000070090200050007000000045700000100030001000068008500010090000400";
           g.beginClues();
           var index = 0;
           for (var line = 1; line <= 9; line++) {
              for (var col = 1; col <= 9; col++) {
                  g.addClue(line,   col,   puzzle.charAt(index)  );
                  index++;
               }
            }
            if (g.endClues() === 1) {
                for (var line = 1; line <= 9; line++) {
                    for (var col = 1; col <= 9; col++) {
                        console.log("ligne: ", line, "col: ", col, "solution: ", g.getCellSolution(line, col));
                    }
                }
            }
                 
        Exemple 2:
         
           var g = new sudoku.GridModel();
           if (g.loadCanonicalSudoku("800000000003600000070090200050007000000045700000100030001000068008500010090000400") === 1) {
               for (var line = 1; line <= 9; line++) {
                   for (var col = 1; col <= 9; col++) {
                       console.log("ligne: ", line, "col: ", col, "solution: ", g.getCellSolution(line, col));
                   }
               }
           }
    
    
    *****************************************************************************************************************/
        
        // liste de 46656 sous-grilles
        var subgrids;

        var NUMBER_OF_SUBGRIDS = 46656;
        var subgridsSetList = [];
        var numberOfClues = 0;   // on va exiger un minimum de 17 clues
        
        
        
        // SubGridsSet représente un ensemble de 46656 sous-grilles potentielles associées à un chiffre
        // *******************************************************************************************
        
        function SubgridsSet(digit) {
            this.digit = digit;    // chiffre auquel l'ensemble est associé
            this.numbers = [0];    // array dont les éléments sont des index dans "subgrids" (référence à toutes les possibilités)
            this.watermark = NUMBER_OF_SUBGRIDS;  // les éléments d'indices 1 à watermark sont compatibles avec les clues;
            //  ils sont tous compatibles au départ
            if (digit > 0) {
                for (var i = 1; i <= NUMBER_OF_SUBGRIDS; i++) {
                    this.numbers[i] = i;
                }
            }
            else {
                this.numbers[0] = [0];
                this.watermark = -1;
            }
        }

        this.loadCanonicalSudoku = function (puzzle) {
            this.beginClues();
            var index = 0;
            for (var line = 1; line <= 9; line++) {
                for (var col = 1; col <= 9; col++) {
                    var c = puzzle.charAt(index);
                    index++;
                    if (c >= '1' && c <= '9') {
                        this.addClue(line, col, c);
                    }
                }
            }
            return this.endClues();
        }
        

        // beginClues : débuter un nouveau puzzle
        // **************************************

        this.beginClues = function () {
            numberOfClues = 0;

            // au premier appel de "beginClues", il faut construire les 46656 sous-grilles
            // et créer un ensemble de grilles potentielles pour chaque entier de 1 à 9 

            if (!subgrids) {
                subgrids = buildSubgrids();
                for (var digit = 0; digit <= 9; digit++) {
                    subgridsSetList[digit] = new SubgridsSet(digit);
                }
            }
            
            
            //réinitialisation des watermarks à chaque appel de beginClues (nouveau puzzle)
            for (var digit = 1; digit <= 9; digit++) {
                subgridsSetList[digit].watermark = NUMBER_OF_SUBGRIDS;
            }
        }
        

        //  addClue: ajouter une clue
        //  *************************

        this.addClue = function (line, col, clue) {
            var numbers = [];
            var index;
            var watermark;
            var i;

            if (clue < 0 || clue > 9) {
                return;
            }

            numberOfClues++;

            for (var digit = 1; digit <= 9; digit++) {
                numbers = subgridsSetList[digit].numbers;
                watermark = subgridsSetList[digit].watermark;

                // déplacer sous la watermark les sous-grilles incompatibles avec la clue

                if (digit === clue) {
                    i = 1;
                    while (i <= watermark) {
                        index = numbers[i];
                        if (subgrids[index][col] != line) {
                            watermark = moveUnderWatermark(numbers, i, watermark);
                        }
                        else {
                            i++;
                        }
                    }
                }
                else {
                    i = 1;
                    while (i <= watermark) {
                        index = numbers[i];
                        if (subgrids[index][col] === line) {
                            watermark = moveUnderWatermark(numbers, i, watermark);
                        }
                        else {
                            i++;
                        }
                    }
                }

                subgridsSetList[digit].watermark = watermark;    // mettre à jour la watermark
            
            }

        }
        
        // fonction interne qui déplace une sous-grille sous la watermark 

        function moveUnderWatermark(numbers, i, watermark) {
            if (i >= 0) {
                var tempo = numbers[watermark];
                numbers[watermark] = numbers[i];
                numbers[i] = tempo;
                watermark--;
            }
            return watermark;
        }
       
        //
        // endClues: fin de l'ajout des clues et déclenchement du calcul de la solution
        //

        this.endClues = function () {

            if (numberOfClues < 17) {
                return 0;
            }

            // trier les ensembles de sous-grilles potentielles par taille 
            var order = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
            order.sort(function (a, b) {
                return subgridsSetList[a].watermark - subgridsSetList[b].watermark;
            })

            var nbSolutions = 0;
            var compatibilityArray = [0];
            loopRecursive(1, subgridsSetList[order[1]].watermark, subgridsSetList[order[1]].numbers);
            return nbSolutions;
            
            //**************************************************************************
            // Recherche récursive de sous-grilles disjointes à raison de une par ensemble

            function loopRecursive(index, watermark, list) {
                for (var i = 1; i <= watermark; i++) {
                    if (index === 1 || isDisjoint(compatibilityArray, list[i])) {
                        compatibilityArray.push(list[i]);
                        if (index < 9) {
                            loopRecursive(index + 1, subgridsSetList[order[index + 1]].watermark, subgridsSetList[order[index + 1]].numbers);
                        }               
                        else {
                            if (++nbSolutions === 1) {
                                generateSolution(compatibilityArray, order);
                            }
                        }
                        compatibilityArray.pop();
                    }
                }
            }
            
            // Vérification que deux sous-grilles sont disjointes ou pas

            function isDisjoint(arr, index) {
                var vv = subgrids[index];
                var vvv = [];
                for (var i = 1; i < arr.length; i++) {
                    vvv = subgrids[arr[i]];
                    for (var j = 1; j <= 9; j++) {
                        if (vv[j] === vvv[j]) {
                            return false;
                        }
                    }
                }
                return true;
            }

        }

        // générer la solution du sudoku à partir des 9 sous-grilles disjointes qui
        // ont été trouvées

        function generateSolution(comp, order) {
            var v;
            for (var i = 1; i < 10; i++) {
                v = subgrids[comp[i]];
                for (var col = 1; col < 10; col++) {
                    cellsInfoCollection.setSolution(v[col], col, order[i]);
                }
            }
        }
        
        /*****************************************************************************************/
        
        /*                       
        b u i l d S u b g r i d s
        --------------------------
        Cette function retourne les 46656 sous-grilles différentes qui peuvent être générées à
        partir d'une grille de sudoku 9x9. 
        Chaque sous-grille est représentée par un array à 10 éléments dont l'élément 0 n'est pas
        utilisé; l'élément d'indice i de l'array correspond à la ligne de la cellule 
        dans la colonne i de la grille. Par exemple: [0, 7, 1, 4, 2, 9, 5, 3, 8, 6 ] désigne la sous-grille
        composée des cellules de coordonnées (ligne, colonne) suivantes:
        (7,1), (1,2), (4,3), (2,4), (9,5), (5,6), (3,7), (8,8) et (6,9).
    
        La fonction retourne un array de 46656 positions où chaque élément est une sous-grille.
    
        */


        function buildSubgrids() {
            var subGrids = []; // array of all subgrids
            var index = 0;
            var sub = []; // each subgrid
            var lineAvailable = [false, true, true, true, true, true, true, true, true, true]; // lignes disponibles
            var regionAvailable = [false, true, true, true, true, true, true, true, true, true]; // régions disponibles
            
            function findRegion(l, c) {
                return 1 + Math.floor((c - 1) / 3) + 3 * Math.floor((l - 1) / 3);
            }

            function findCellInColumn(column) {
                for (var line = 1; line <= 9; line++) {
                    if (lineAvailable[line] && regionAvailable[findRegion(line, column)]) {
                        sub[column] = line; // --> [0, 7, 1, 4, 2, 9, 5, 3, 8, 6 ]
                        lineAvailable[line] = false;
                        regionAvailable[findRegion(line, column)] = false;

                        if (column < 9) {
                            findCellInColumn(column + 1);
                        }
                        else {
                            subGrids[++index] = [0, sub[1], sub[2], sub[3], sub[4], sub[5], sub[6], sub[7], sub[8], sub[9]]; // --> [0, 7, 1, 4, 2, 9, 5, 3, 8, 6 ]
                        }
                        lineAvailable[line] = true;
                        regionAvailable[findRegion(line, column)] = true;
                    }
                }
            }
            
            findCellInColumn(1);
            
            return subGrids;
        }


    }
    // fin de la classe GridModel


    /***********************************************************************************************************
    SECTION 4
    
    Classes internes représentant les cellules, lignes, colonnes et régions du sudoku

          - classe DigitSet:    représente un ensemble dont les seuls éléments permis sont les chiffres 1 à 9
          - classe CellInfo:    représente une cellule de la grille de sudoku;
          - CellInfoCollection: représente les 81 cellules du sudoku
          - classe RegionInfo:  représente le sous-ensemble des chiffres apparaissant dans une région 
    ************************************************************************************************************/

    //   *************************************************************************
    //   classe DigitSet:
    //       - représente un ensemble dont les seuls éléments permis sont les chiffres 1 à 9
    //   *************************************************************************
    
    function DigitSet() {
        this.set = [];
        // - l'ensemble est représenté par un array "set" à 10 positions
        //   dont la position 0 n'est pas utilisée
        // - si set[d] est true, le chiffre "d" fait partie de l'ensemble; si 
        //   set[d] est false, "d" ne fait pas partie de l'ensemble
        this.setToEmpty();
    }
    
    // vide l'ensemble 
    DigitSet.prototype.setToEmpty = function () {
        for (var i = 0; i <= 9; i++) {
            this.set[i] = false;
        }
    }
    
    // enlève "digit" de l'ensemble
    DigitSet.prototype.removeDigit = function (digit) {
        this.set[digit] = false;
    }
    
    // ajoute "digit" à l'ensemble
    DigitSet.prototype.addDigit = function (digit) {
        this.set[digit] = true;
    }
    
    // retourne l'ensemble
    DigitSet.prototype.getSet = function () {
        return this.set;
    }

    DigitSet.prototype.containElement = function (digit) {
        return this.set[digit];
    }
    
    
    /***********************************************************************************************
    classe CellInfo

    Représente une cellule de la grille de sudoku;
        - regionInfo, lineInfo et columnInfo représentent respectivement:
            - l'ensemble des chiffres apparaissant dans la région associée à la cellule
            - l'ensemble des chiffres apparaissant dans la ligne associée à la cellule
            - l'ensemble des chiffres apparaissant dans la colonne associée à la cellule
     ***********************************************************************************************/

    function CellInfo(regionInfo, lineInfo, columnInfo) {

        this.value = '0';    // valeur du chiffre apparaissant dans la cellule
        this.solution = '0'; // solution calculée pour la cellule
        this.isClue = false; // true si le chiffre apparaissant dan la cellule est une clue
        
        this.regionInfo = regionInfo;
        this.lineInfo = lineInfo;
        this.columnInfo = columnInfo;
        
        // basicCandidates: candidats automatiquement calculés à partir des chiffres apparaissant dans
        // la ligne, colonne et région associés à la cellule
        this.basicCandidates = new DigitSet();

        // suppressedCandidates: candidats éliminés par l'utilisateur ou les stratégies de résolution
        this.suppressedCandidates = new DigitSet();
        
        // candidats effectifs: différence des deux ensembles ci-dessus
        this.candidates = new DigitSet();

        this.init();
    }
    
    // initialisation requise pour chaque nouveau puzzle
    CellInfo.prototype.init = function () {
        this.value = '0';
        this.solution = '0';
        this.isClue = false;
        this.suppressedCandidates.setToEmpty();
        // note: basicCandidates et candidates ne sont pas considérés dans cette initialisation
    }
    
    // Calcule les candidats de la cellule
    //    - un chiffre donné est un candidat si:
    //         - il n'apparait ni dans la ligne, ni dans la colonne, ni dans la région 
    //           associées à la cellule
    //         - il ne fait pas partie des candidats supprimés pour la cellule
    CellInfo.prototype.calculateCandidates = function () {
        this.basicCandidates.setToEmpty();
        this.candidates.setToEmpty();
        for (var i = 1; i <= 9; i++) {
            if (!this.regionInfo.digits.containElement(i) && !this.lineInfo.digits.containElement(i) && !this.columnInfo.digits.containElement(i)) {
                this.basicCandidates.addDigit(i);
            }
            if (this.basicCandidates.containElement(i) && !this.suppressedCandidates.containElement(i)) {
                this.candidates.addDigit(i);
            }
        }
    }
    
    // ajoute un candidat de base à l'ensemble des candidats supprimés; le candidat
    // n'est pas éliminé des candidats de base (basicCandidates)
    CellInfo.prototype.suppressCandidate = function (digit) {
        this.suppressedCandidates.addDigit(digit);
    }
  
  
    // enlève un candidat de l'ensemble des candidats supprimés
    CellInfo.prototype.restoreCandidate = function (digit) {
        if (this.suppressedCandidates.containElement(digit)) {
            this.suppressedCandidates.removeDigit(digit);
            return true;
        }
        return false;
    }
    
    // définit la valeur de la cellule et la désigne éventuellement comme clue
    CellInfo.prototype.setValue = function (value, isClue) { //setClue?
        this.value = value;
        this.isClue = isClue;
    }

    // retourne la valeur de la cellule
    CellInfo.prototype.getValue = function () {
        return this.value;
    }

    // retourne la valeur solution de la cellule
    CellInfo.prototype.getSolution = function () {
        return this.solution;
    }

    // définit la valeur solution de la cellule
    CellInfo.prototype.setSolution = function (value) {
        this.solution = value;
    }

    // retourne les candidats de la cellule   
    CellInfo.prototype.getCandidates = function () {
        return this.candidates.getSet();
    }
    
    /***************************************************************************************
       classe CellInfoCollection

       Représente la collection des 81 cellules (classe CellInfo) du sudoku
    ****************************************************************************************/

    function CellInfoCollection(regionsInfoCollection, linesInfoCollection, columnsInfoCollection) {
        this.cellsInfo = [[], [], [], [], [], [], [], [], [], []];
        for (var line = 1; line <= 9; line++) {
            for (var col = 1; col <= 9; col++) {
                this.cellsInfo[line][col] = new CellInfo(regionsInfoCollection.getRegionInfo(line, col),
                                                         linesInfoCollection.getLineInfo(line),
                                                         columnsInfoCollection.getColumnInfo(col));
            }
        }       
        
        // initialise toutes les cellules lors d'un nouveau puzzle
        this.init = function () {
            for (var line = 1; line <= 9; line++) {
                for (var col = 1; col <= 9; col++) {
                    this.cellsInfo[line][col].init(); //CellInfo.prototype.init()
                }
            }
        }
        
        // retourne l'instance de la classe CellInfo associée à une cellule donnée
        this.getCellInfo = function (line, col) {
            return this.cellsInfo[line][col];
        }
        
        // définit la valeur d'une cellule donnée et la désigne comme étant une clue 
        this.setClue = function (line, col, value) {
            this.getCellInfo(line, col).setValue(value, true);
        }
        
        // définit la valeur d'une cellule donnée et la désigne comme étant la valeur solution
        this.setSolution = function (line, col, value) {
            this.getCellInfo(line, col).setSolution(value);
        }
        
        // retourne la valeur d'une cellule donnée
        this.getValue = function (line, col) {
            return this.getCellInfo(line, col).getValue();
        }

        // calcule les candidats d'une cellule donnée
        this.calculateCandidates = function (line, col) {
            this.getCellInfo(line, col).calculateCandidates();
        }

        // retourne les candidats d'une cellule donnée
        this.getCandidates = function (line, col) {
            return this.getCellInfo(line, col).getCandidates();
        }
    }
    
    
    
    //   *********************************************************************
    //   classe RegionInfo
    //
    //       représente le sous-ensemble des chiffres apparaissant dans une région 
    //   *********************************************************************
    
    function RegionInfo() {
        this.digits = new DigitSet();
        this.init();
    }

    RegionInfo.prototype.init = function () {
        this.digits.setToEmpty();
    }

    RegionInfo.prototype.addDigit = function (digit) {
        this.digits.addDigit(digit);
    }
    
    //   *********************************************************************
    //   classe RegionInfoCollection
    //
    //      représente les neuf régions du sudoku 
    //   *********************************************************************
    
    function RegionInfoCollection() {
        this.list = [0, [], [], []];
        // 9 régions en tout
        for (var l = 1; l <= 3; l++) {
            for (var c = 1; c <= 3; c++) {
                this.list[l][c] = new RegionInfo();
            }
        }
               
        // initialisation des données de toutes les régions (sets all DigitSets to empty (false))
        this.init = function () {
            for (var l = 1; l <= 3; l++) {
                for (var c = 1; c <= 3; c++) {
                    this.list[l][c].init(); //RegionInfo.prototype.init()
                }
            }
        }
        
        // retourne l'instance de la région (RegionInfo) associée à une cellule du sudoku
        this.getRegionInfo = function (line, col) {
            return this.list[1 + Math.floor((line - 1) / 3)][1 + Math.floor((col - 1) / 3)];
        }
               
        // ajoute un chiffre à la région
        this.addDigit = function (line, col, digit) {
            this.getRegionInfo(line, col).addDigit(digit);
        }

    }
    
    
    //   *********************************************************************
    //   classe LineInfo
    //
    //   représente le sous-ensemble des chiffres apparaissant dans une ligne
    //   *********************************************************************
    
    function LineInfo() {
        this.digits = new DigitSet();
        this.init();
    }

    LineInfo.prototype.init = function () {
        this.digits.setToEmpty();
    }

    LineInfo.prototype.addDigit = function (digit) {
        this.digits.addDigit(digit);
    }
    
    //   *********************************************************************
    //   classe LineInfoCollection
    //
    //      représente les neuf lignes du sudoku 
    //   *********************************************************************
    
    function LineInfoCollection() {
        this.list = [];
        // 9 lignes en tout
        for (var line = 0; line <= 9; line++) {
            this.list[line] = new LineInfo();
        }

        this.init = function () {
            for (var line = 0; line <= 9; line++) {
                this.getLineInfo(line).init();
            }
        }

        this.getLineInfo = function (line) {
            return this.list[line];
        }

        this.addDigit = function (line, col, digit) {
            this.getLineInfo(line).addDigit(digit);
        }
    }
    
    //   *********************************************************************
    //   classe ColumnInfo
    //
    //   représente le sous-ensemble des chiffres apparaissant dans une colonne
    //   *********************************************************************
    
    function ColumnInfo() {
        this.digits = new DigitSet();
        this.init();
    }

    ColumnInfo.prototype.init = function () {
        this.digits.setToEmpty();
    }

    ColumnInfo.prototype.addDigit = function (digit) {
        this.digits.addDigit(digit);
    }
    
    //   *********************************************************************
    //   classe ColumnInfoCollection
    //
    //      représente les neuf colonnes du sudoku 
    //   *********************************************************************
    
    function ColumnInfoCollection() {
        this.list = [];
        // 9 colonnes en tout
        for (var l = 0; l <= 9; l++) {
            this.list[l] = new ColumnInfo();
        }

        this.init = function () {
            for (var col = 0; col <= 9; col++) {
                this.getColumnInfo(col).init();
            }
        }

        this.getColumnInfo = function (col) {
            return this.list[col];
        }
        
        this.addDigit = function (line, col, digit) {
            this.getColumnInfo(col).addDigit(digit);
        }
    }

})();
